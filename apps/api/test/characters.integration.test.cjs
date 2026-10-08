const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');

describe('Personagens: ficha dinâmica, versão fixa e acesso privado', { concurrency: false }, () => {
  let app, prisma, base, gm, player, other, outsider, system, campaign, character;
  const ids = [], suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  const attr = randomUUID(), skill = randomUUID(), resource = randomUUID(), unbounded = randomUUID();
  const definition = { schemaVersion: 1, attributes: [{ id: attr, name: 'Vontade', defaultValue: -2 }], skills: [{ id: skill, name: 'Investigar', attributeId: attr, defaultValue: 3 }],
    resources: [{ id: resource, name: 'Fôlego', defaultValue: 4, maxValue: 8 }, { id: unbounded, name: 'Pontos', defaultValue: 10, maxValue: null }], dice: [20] };
  const settings = { name: `Herói ${suffix}`, description: 'Descrição privada.', story: 'História privada.', level: null };
  async function request(path, session, method = 'GET', body) {
    return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  async function start() {
    app = await createApplication(false); const url = new URL(app.get(ConfigService).get('DATABASE_URL'));
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname)); assert.equal(url.pathname, '/paralax');
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService);
  }
  async function register(label) { const r = await request('/auth/register', null, 'POST', { username: `${label}_${suffix}`, email: `${label}_${suffix}@example.test`, displayName: label, password: 'Uma-senha-de-teste-123!' }); assert.equal(r.status, 201); const s = await r.json(); ids.push(s.user.id); return s; }
  async function newCampaign() { const r = await request('/campaigns', gm, 'POST', { name: `Mesa ${suffix}`, description: '', status: 'PLANNED', visibility: 'PRIVATE', maxPlayers: 4, systemVersionId: system.versionId }); assert.equal(r.status, 201); return r.json(); }
  async function join(user, target = campaign) { const sent = await request(`/campaigns/${target.id}/invitations`, gm, 'POST', { username: user.user.username }); assert.equal(sent.status, 201); const i = await sent.json(); assert.equal((await request(`/invitations/${i.id}/accept`, user, 'POST')).status, 200); }
  async function create(user = player, input = settings, target = campaign) { return request(`/campaigns/${target.id}/characters`, user, 'POST', input); }
  const updateBody = (c, patch = {}) => ({ name: c.name, description: c.description, story: c.story, level: c.level, values: structuredClone(c.values), expectedRevision: c.revision, ...patch });
  before(async () => { await start(); gm = await register('char_gm'); player = await register('char_p1'); other = await register('char_p2'); outsider = await register('char_x');
    const r = await request('/systems', gm, 'POST', { name: 'Regras originais', description: '', visibility: 'PRIVATE', definition }); assert.equal(r.status, 201); system = await r.json(); campaign = await newCampaign(); await join(player); await join(other); });
  after(async () => { if (prisma) await prisma.user.deleteMany({ where: { id: { in: ids } } }); await app?.close(); });

  it('cria ficha com padrões da versão e autoria da sessão; persistência e auditoria são transacionais', async () => {
    const r = await create(); assert.equal(r.status, 201); assert.equal(r.headers.get('cache-control'), 'no-store'); character = await r.json();
    assert.equal(character.owner.id, player.user.id); assert.equal(character.systemVersionId, system.versionId); assert.equal(character.level, null); assert.equal(character.canEdit, true);
    assert.deepEqual(character.values, { attributes: [{ fieldId: attr, value: -2 }], skills: [{ fieldId: skill, value: 3 }], resources: [{ fieldId: resource, value: 4 }, { fieldId: unbounded, value: 10 }] });
    const changes = await prisma.characterChange.findMany({ where: { characterId: character.id } }); assert.equal(changes.length, 1); assert.equal(changes[0].actorId, player.user.id); assert.deepEqual(changes[0].snapshot.values, character.values);
  });
  it('somente dono ativo e mestre leem/editam; público, outro jogador e convite pendente não recebem fichas', async () => {
    for (const user of [null, other, outsider]) { assert.equal((await request(`/characters/${character.id}`, user)).status, user ? 404 : 401); assert.equal((await request(`/characters/${character.id}`, user, 'PUT', updateBody(character))).status, user ? 404 : 401); }
    assert.equal((await create(outsider)).status, 404);
    const pending = await request(`/campaigns/${campaign.id}/invitations`, gm, 'POST', { username: outsider.user.username }); assert.equal(pending.status, 201); assert.equal((await create(outsider)).status, 404);
    const master = await (await request(`/characters/${character.id}`, gm)).json(); assert.equal(master.canEdit, true); assert.ok(!JSON.stringify(master).includes(player.user.email));
    const mine = await (await request('/characters/mine', player)).json(); assert.equal(mine.total, 1); assert.equal(mine.items[0].values, undefined); assert.equal(mine.items[0].story, undefined);
    assert.equal((await (await request(`/campaigns/${campaign.id}/characters`, other)).json()).total, 0); assert.equal((await (await request(`/campaigns/${campaign.id}/characters`, gm)).json()).total, 1);
    const publicSettings = { name: campaign.name, description: campaign.description, visibility: 'PUBLIC', status: campaign.status, maxPlayers: campaign.maxPlayers, expectedRevision: campaign.revision };
    assert.equal((await request(`/campaigns/${campaign.id}`, gm, 'PUT', publicSettings)).status, 200);
    assert.equal((await request(`/characters/${character.id}`, outsider)).status, 404); assert.equal((await request(`/campaigns/${campaign.id}/characters`, null)).status, 401);
  });
  it('rejeita autoria/versão extras, campos estranhos/duplicados/ausentes e números incompatíveis sem gravação parcial', async () => {
    const count = await prisma.character.count({ where: { campaignId: campaign.id } });
    for (const extra of [{ ownerId: gm.user.id }, { systemVersionId: randomUUID() }, { campaignId: randomUUID() }, { level: 0 }, { level: 1.5 }]) assert.equal((await create(player, { ...settings, ...extra })).status, 400);
    const variants = [];
    const missing = structuredClone(character.values); missing.skills = []; variants.push(missing);
    const duplicate = structuredClone(character.values); duplicate.attributes.push(duplicate.attributes[0]); variants.push(duplicate);
    const unknown = structuredClone(character.values); unknown.attributes[0].fieldId = randomUUID(); variants.push(unknown);
    const wrongCategory = structuredClone(character.values); wrongCategory.attributes[0].fieldId = skill; variants.push(wrongCategory);
    for (const n of [-1, 9, 1.5]) { const values = structuredClone(character.values); values.resources[0].value = n; variants.push(values); }
    for (const values of variants) assert.equal((await create(player, { ...settings, values })).status, 400);
    assert.equal(await prisma.character.count({ where: { campaignId: campaign.id } }), count);
    assert.equal((await request(`/characters/${character.id}`, player, 'PUT', updateBody(character, { values: variants[0] }))).status, 400); assert.equal((await request('/characters/mine?page=10001', player)).status, 400);
  });
  it('salva pelo jogador e mestre, preserva versão após editar sistema e reiniciar; FK rejeita versão divergente', async () => {
    const body = updateBody(character, { level: 2 }); body.values.attributes[0].value = 5; body.values.resources[1].value = 900;
    const r = await request(`/characters/${character.id}`, player, 'PUT', body); assert.equal(r.status, 200); character = await r.json();
    const master = await request(`/characters/${character.id}`, gm, 'PUT', updateBody(character, { story: 'História ajustada pelo mestre.' })); assert.equal(master.status, 200); character = await master.json();
    const changed = structuredClone(definition); changed.attributes[0].defaultValue = 99; changed.resources[0].maxValue = 1; changed.resources[0].defaultValue = 1;
    const edited = await request(`/systems/${system.id}`, gm, 'PUT', { name: 'Regras futuras', description: '', visibility: 'PRIVATE', expectedRevision: 1, definition: changed }); assert.equal(edited.status, 200); const v2 = await edited.json();
    await assert.rejects(prisma.character.create({ data: { ...settings, values: character.values, ownerId: player.user.id, campaignId: campaign.id, systemVersionId: v2.versionId } }));
    await app.close(); await start(); const persisted = await (await request(`/characters/${character.id}`, player)).json(); assert.equal(persisted.system.version, 1); assert.equal(persisted.definition.resources[0].maxValue, 8); assert.equal(persisted.values.attributes[0].value, 5);
    const changes = await prisma.characterChange.findMany({ where: { characterId: character.id }, orderBy: { revision: 'asc' } }); assert.deepEqual(changes.map(row => row.actorId), [player.user.id, player.user.id, gm.user.id]);
  });
  it('escritas simultâneas não sobrescrevem a revisão vencedora nem geram auditoria parcial', async () => {
    const results = await Promise.all([request(`/characters/${character.id}`, player, 'PUT', updateBody(character, { name: 'Edição do jogador' })), request(`/characters/${character.id}`, gm, 'PUT', updateBody(character, { name: 'Edição do mestre' }))]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); const loser = await results.find(r => r.status === 409).json(); assert.equal(loser.error.code, 'CHARACTER_REVISION_CONFLICT');
    character = await results.find(r => r.status === 200).json(); assert.equal(await prisma.characterChange.count({ where: { characterId: character.id } }), character.revision);
  });
  it('remoção revoga leitura/escrita/lista mas preserva ficha para o mestre; reingresso restaura acesso', async () => {
    assert.equal((await request(`/campaigns/${campaign.id}/members/${player.user.id}`, gm, 'DELETE')).status, 204);
    assert.equal((await request(`/characters/${character.id}`, player)).status, 404); assert.equal((await request(`/characters/${character.id}`, player, 'PUT', updateBody(character))).status, 404);
    assert.equal((await (await request('/characters/mine', player)).json()).total, 0); assert.equal((await request(`/campaigns/${campaign.id}/characters`, player)).status, 404);
    const r = await request(`/characters/${character.id}`, gm, 'PUT', updateBody(character, { description: 'Preservado durante a ausência.' })); assert.equal(r.status, 200); character = await r.json();
    await join(player); assert.equal((await request(`/characters/${character.id}`, player)).status, 200); assert.equal((await (await request(`/characters/${character.id}`, player)).json()).description, character.description);
  });
  it('limita criações concorrentes a 20 por usuário/campanha e pagina 21 personagens em campanhas distintas', async () => {
    const c = await newCampaign();
    for (let n = 0; n < 19; n++) assert.equal((await create(gm, { ...settings, name: `Quota ${suffix} ${n}` }, c)).status, 201);
    const results = await Promise.all([create(gm, { ...settings, name: `Quota ${suffix} final A` }, c), create(gm, { ...settings, name: `Quota ${suffix} final B` }, c)]); assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    const c2 = await newCampaign(); assert.equal((await create(gm, { ...settings, name: `Quota ${suffix} outra mesa` }, c2)).status, 201);
    const first = await (await request(`/characters/mine?search=Quota%20${suffix}`, gm)).json(); const second = await (await request(`/characters/mine?search=Quota%20${suffix}&page=2`, gm)).json(); assert.equal(first.total, 21); assert.equal(first.items.length, 20); assert.equal(second.items.length, 1);
    const closed = { name: c2.name, description: '', visibility: 'PRIVATE', status: 'ENDED', maxPlayers: c2.maxPlayers, expectedRevision: 1 }; assert.equal((await request(`/campaigns/${c2.id}`, gm, 'PUT', closed)).status, 200); assert.equal((await create(gm, settings, c2)).status, 409);
  });
  it('serializa edição com remoção: o jogador não consegue salvar após a revogação', async () => {
    const initial = character.revision;
    const [edit, remove] = await Promise.all([request(`/characters/${character.id}`, player, 'PUT', updateBody(character, { story: 'Edição concorrente.' })), request(`/campaigns/${campaign.id}/members/${player.user.id}`, gm, 'DELETE')]);
    assert.ok([200, 404].includes(edit.status)); assert.equal(remove.status, 204);
    const stored = await prisma.character.findUnique({ where: { id: character.id } }); assert.equal(stored.revision, initial + (edit.status === 200 ? 1 : 0));
    assert.equal((await request(`/characters/${character.id}`, player, 'PUT', updateBody(character))).status, 404);
  });
});
