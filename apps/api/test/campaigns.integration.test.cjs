const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');

describe('Campanhas, versões fixas e permissões com PostgreSQL real', { concurrency: false }, () => {
  let app, prisma, base, owner, other, system, foreign, campaign;
  const users = [], suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const systemInput = { name: `Regras ${suffix}`, description: 'Definição privada.', visibility: 'PRIVATE', definition: { schemaVersion: 1,
    attributes: [{ id: randomUUID(), name: 'Segredo do sistema', defaultValue: 3 }], skills: [], resources: [], dice: [20] } };
  const input = { name: `Campanha ${suffix}`, description: 'Expedição entre ilhas flutuantes.', visibility: 'PRIVATE', status: 'PLANNED', maxPlayers: 4 };
  async function request(path, { token, method = 'GET', body } = {}) {
    return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  async function start() {
    app = await createApplication(false);
    const url = new URL(app.get(ConfigService).get('DATABASE_URL'));
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname)); assert.equal(url.pathname, '/paralax');
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService);
  }
  async function register(label) {
    const response = await request('/auth/register', { method: 'POST', body: { username: `${label}_${suffix}`, email: `${label}_${suffix}@example.test`, displayName: `Mestre ${label}`, password: 'Uma-senha-de-teste-123!' } });
    assert.equal(response.status, 201); const session = await response.json(); users.push(session.user.id); return session;
  }
  async function createSystem(session, body) {
    const response = await request('/systems', { token: session.accessToken, method: 'POST', body }); assert.equal(response.status, 201); return response.json();
  }
  async function update(patch) {
    const response = await request(`/campaigns/${campaign.id}`, { token: owner.accessToken, method: 'PUT', body: { ...input, expectedRevision: campaign.revision, ...patch } });
    assert.equal(response.status, 200); campaign = await response.json(); return campaign;
  }
  before(async () => { await start(); owner = await register('mesa_a'); other = await register('mesa_b'); system = await createSystem(owner, systemInput); foreign = await createSystem(other, { ...systemInput, visibility: 'PUBLIC' }); });
  after(async () => { if (prisma) await prisma.user.deleteMany({ where: { id: { in: users } } }); await app?.close(); });

  it('cria uma campanha privada com mestre da sessão e registro transacional; rejeita sistemas de terceiros', async () => {
    const body = { ...input, systemVersionId: system.versionId };
    assert.equal((await request('/campaigns', { method: 'POST', body })).status, 401);
    assert.equal((await request('/campaigns', { method: 'POST', token: owner.accessToken, body: { ...body, ownerId: other.user.id } })).status, 400);
    for (const systemVersionId of [randomUUID(), foreign.versionId]) {
      const response = await request('/campaigns', { method: 'POST', token: owner.accessToken, body: { ...body, systemVersionId } }); assert.equal(response.status, 404);
    }
    const response = await request('/campaigns', { method: 'POST', token: owner.accessToken, body }); assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store');
    campaign = await response.json(); assert.equal(campaign.owner.id, owner.user.id); assert.equal(campaign.revision, 1); assert.equal(campaign.systemVersionId, system.versionId);
    const audit = await prisma.campaignChange.findMany({ where: { campaignId: campaign.id } }); assert.equal(audit.length, 1); assert.equal(audit[0].actorId, owner.user.id); assert.equal(audit[0].snapshot.systemVersionId, system.versionId);
  });
  it('nega leitura e edição da campanha privada a visitantes e a outro mestre', async () => {
    for (const token of [undefined, other.accessToken]) assert.equal((await request(`/campaigns/${campaign.id}`, { token })).status, 404);
    assert.equal((await request('/campaigns/mine')).status, 401);
    assert.equal((await request(`/campaigns/mine/${campaign.id}`, { token: other.accessToken })).status, 404);
    assert.equal((await request(`/campaigns/${campaign.id}`, { method: 'PUT', token: other.accessToken, body: { ...input, expectedRevision: 1 } })).status, 404);
    assert.equal((await (await request(`/campaigns/mine?search=${suffix}`, { token: other.accessToken })).json()).total, 0);
    assert.equal((await (await request(`/campaigns/mine?search=${suffix}`, { token: owner.accessToken })).json()).total, 1);
    assert.equal((await (await request(`/campaigns/public?search=${suffix}`)).json()).total, 0);
  });
  it('rejeita campos extras, estados inválidos, limites e alteração do sistema; não cria dados parciais', async () => {
    const invalid = [{ name: '' }, { description: 'x'.repeat(4001) }, { maxPlayers: 0 }, { maxPlayers: 21 }, { maxPlayers: 2.5 }, { visibility: 'UNLISTED' }, { status: 'LIVE' }, { systemVersionId: 'bad' }];
    for (const patch of invalid) {
      const response = await request('/campaigns', { method: 'POST', token: owner.accessToken, body: { ...input, systemVersionId: system.versionId, ...patch } }); assert.equal(response.status, 400);
    }
    assert.equal((await request(`/campaigns/${campaign.id}`, { method: 'PUT', token: owner.accessToken, body: { ...input, expectedRevision: 1, systemVersionId: foreign.versionId } })).status, 400);
    assert.equal((await request('/campaigns/not-a-uuid')).status, 400);
    assert.equal((await request('/campaigns/public?page=0')).status, 400);
    assert.equal((await request('/campaigns/public?ownerId=forged')).status, 400);
    assert.equal(await prisma.campaign.count({ where: { ownerId: owner.user.id } }), 1); assert.equal(await prisma.campaignChange.count({ where: { campaignId: campaign.id } }), 1);
  });
  it('mantém regras e nome da versão original após edição do sistema e reinício da API', async () => {
    const response = await request(`/systems/${system.id}`, { method: 'PUT', token: owner.accessToken, body: { ...systemInput, name: 'Regras novas', expectedRevision: 1, definition: { ...systemInput.definition, attributes: [{ ...systemInput.definition.attributes[0], defaultValue: 99 }] } } }); assert.equal(response.status, 200);
    await app.close(); await start();
    const saved = await (await request(`/campaigns/mine/${campaign.id}`, { token: owner.accessToken })).json();
    assert.equal(saved.systemVersionId, system.versionId); assert.deepEqual(saved.system, { name: systemInput.name, version: 1 }); assert.equal(saved.definition.attributes[0].defaultValue, 3);
    await assert.rejects(prisma.systemVersion.delete({ where: { id: system.versionId } }), error => error.code === 'P2003');
    assert.equal(await prisma.campaign.count({ where: { id: campaign.id } }), 1);
  });
  it('publica só apresentação, sem definição privada, e-mail, credenciais ou auditoria; revoga leitura ao privatizar', async () => {
    await update({ visibility: 'PUBLIC', status: 'RECRUITING' });
    const response = await request(`/campaigns/${campaign.id}`); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const published = await response.json(); assert.equal(published.status, 'RECRUITING'); assert.equal(published.system.version, 1);
    assert.equal(published.definition, undefined); assert.equal(published.systemVersionId, undefined); assert.equal(published.changes, undefined);
    assert.deepEqual(Object.keys(published.owner).sort(), ['displayName', 'id', 'username']); assert.ok(!JSON.stringify(published).includes(owner.user.email)); assert.ok(!JSON.stringify(published).includes('Segredo do sistema'));
    const catalog = await (await request(`/campaigns/public?search=${suffix}`)).json(); assert.equal(catalog.total, 1); assert.equal(catalog.items[0].definition, undefined);
    assert.equal((await request(`/systems/${system.id}`)).status, 404);
    assert.equal((await request(`/campaigns/mine/${campaign.id}`, { token: other.accessToken })).status, 404);
    await update({ visibility: 'PRIVATE' }); assert.equal((await request(`/campaigns/${campaign.id}`)).status, 404);
  });
  it('aceita uma das escritas concorrentes e preserva auditoria e rascunho da outra por conflito', async () => {
    const previous = campaign.revision;
    const results = await Promise.all(['Aventura um', 'Aventura dois'].map(name => request(`/campaigns/${campaign.id}`, { method: 'PUT', token: owner.accessToken, body: { ...input, name, expectedRevision: previous } })));
    assert.deepEqual(results.map(response => response.status).sort(), [200, 409]); assert.equal((await results.find(response => response.status === 409).json()).error.code, 'CAMPAIGN_REVISION_CONFLICT');
    campaign = await results.find(response => response.status === 200).json();
    assert.equal(campaign.revision, previous + 1); assert.equal(await prisma.campaignChange.count({ where: { campaignId: campaign.id } }), campaign.revision);
    const audit = await prisma.campaignChange.findUnique({ where: { campaignId_revision: { campaignId: campaign.id, revision: campaign.revision } } }); assert.equal(audit.snapshot.name, campaign.name); assert.equal(audit.actorId, owner.user.id);
  });
  it('altera estados e capacidade com histórico; listar não implica inscrição de jogadores', async () => {
    for (const status of ['ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED', 'PLANNED']) { await update({ status, maxPlayers: 6 }); assert.equal(campaign.status, status); assert.equal(campaign.maxPlayers, 6); }
    assert.equal(await prisma.campaignChange.count({ where: { campaignId: campaign.id } }), campaign.revision);
    assert.equal(campaign.systemVersionId, system.versionId);
  });
  it('pagina e filtra campanhas públicas sem misturar campanhas privadas', async () => {
    for (let n = 0; n < 21; n++) {
      const response = await request('/campaigns', { method: 'POST', token: other.accessToken, body: { ...input, name: `Viagem ${suffix} ${n}`, visibility: 'PUBLIC', systemVersionId: foreign.versionId } }); assert.equal(response.status, 201);
    }
    const first = await (await request(`/campaigns/public?search=${suffix}`)).json(); const second = await (await request(`/campaigns/public?search=${suffix}&page=2`)).json();
    assert.equal(first.total, 21); assert.equal(first.items.length, 20); assert.equal(second.items.length, 1); assert.ok(!first.items.some(item => item.id === second.items[0].id));
    assert.equal((await (await request(`/campaigns/mine?search=${suffix}`, { token: other.accessToken })).json()).total, 21);
  });
});
