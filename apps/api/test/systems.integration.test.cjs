const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');

describe('Sistemas versionados com PostgreSQL real', { concurrency: false }, () => {
  let app, prisma, base, owner, other, system;
  const users = [];
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const attribute = randomUUID();
  const input = { name: `Aether ${suffix}`, description: 'Exploração de mundos flutuantes.', visibility: 'PRIVATE', definition: { schemaVersion: 1,
    attributes: [{ id: attribute, name: 'Vontade', defaultValue: 3 }],
    skills: [{ id: randomUUID(), name: 'Investigação', defaultValue: 2, attributeId: attribute }],
    resources: [{ id: randomUUID(), name: 'Energia', defaultValue: 5, maxValue: 10 }], dice: [6, 20] } };
  async function request(path, { token, method = 'GET', body } = {}) {
    return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  async function start() {
    app = await createApplication(false);
    const db = new URL(app.get(ConfigService).get('DATABASE_URL'));
    assert.ok(['localhost', '127.0.0.1'].includes(db.hostname)); assert.equal(db.pathname, '/paralax');
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService);
  }
  async function register(name) {
    const response = await request('/auth/register', { method: 'POST', body: { username: `${name}_${suffix}`, email: `${name}_${suffix}@example.test`, displayName: `Criador ${name}`, password: 'Uma-senha-de-teste-123!' } });
    assert.equal(response.status, 201); const session = await response.json(); users.push(session.user.id); return session;
  }
  before(async () => { await start(); owner = await register('sistema_a'); other = await register('sistema_b'); });
  after(async () => { if (prisma) await prisma.user.deleteMany({ where: { id: { in: users } } }); await app?.close(); });

  it('cria um sistema privado e sua primeira versão; não aceita identidade fornecida pelo cliente', async () => {
    assert.equal((await request('/systems', { method: 'POST', body: input })).status, 401);
    assert.equal((await request('/systems', { method: 'POST', token: owner.accessToken, body: { ...input, ownerId: other.user.id } })).status, 400);
    const response = await request('/systems', { method: 'POST', token: owner.accessToken, body: input }); assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    system = await response.json(); assert.equal(system.revision, 1); assert.equal(system.owner.id, owner.user.id); assert.deepEqual(system.definition, input.definition);
    assert.ok(system.versionId); assert.equal(await prisma.systemVersion.count({ where: { systemId: system.id } }), 1);
  });
  it('isola listas e edição; privado não é revelado nem por link nem por token de outro usuário', async () => {
    assert.equal((await request(`/systems/${system.id}`)).status, 404);
    assert.equal((await request(`/systems/${system.id}`, { token: other.accessToken })).status, 404);
    assert.equal((await request(`/systems/mine/${system.id}`, { token: other.accessToken })).status, 404);
    assert.equal((await request(`/systems/${system.id}`, { method: 'PUT', token: other.accessToken, body: { ...input, expectedRevision: 1 } })).status, 404);
    assert.equal((await request('/systems/mine')).status, 401);
    assert.equal((await (await request(`/systems/mine?search=${suffix}`, { token: other.accessToken })).json()).total, 0);
    assert.equal((await (await request(`/systems/mine?search=${suffix}`, { token: owner.accessToken })).json()).total, 1);
    assert.equal((await request('/systems/not-a-uuid')).status, 400);
  });
  it('valida nomes, identificadores, referências, limites e dados antes de persistir', async () => {
    const invalid = [
      { ...input, name: '' },
      { ...input, definition: { ...input.definition, attributes: [...input.definition.attributes, { id: randomUUID(), name: ' vontade ', defaultValue: 0 }] } },
      { ...input, definition: { ...input.definition, skills: [{ ...input.definition.skills[0], id: attribute }] } },
      { ...input, definition: { ...input.definition, skills: [{ ...input.definition.skills[0], attributeId: randomUUID() }] } },
      { ...input, definition: { ...input.definition, resources: [{ ...input.definition.resources[0], defaultValue: 11 }] } },
      { ...input, definition: { ...input.definition, resources: [{ ...input.definition.resources[0], defaultValue: -1 }] } },
      { ...input, definition: { ...input.definition, dice: [6, 6] } },
      { ...input, definition: { ...input.definition, dice: [1, 2000] } },
      { ...input, definition: { ...input.definition, schemaVersion: 2 } },
      { ...input, definition: { ...input.definition, attributes: Array.from({ length: 41 }, (_, n) => ({ id: randomUUID(), name: `Campo ${n}`, defaultValue: 0 })) } },
    ];
    for (const body of invalid) { const response = await request('/systems', { method: 'POST', token: owner.accessToken, body }); assert.equal(response.status, 400); assert.equal((await response.json()).error.code, 'VALIDATION_ERROR'); }
    assert.equal(await prisma.rpgSystem.count({ where: { ownerId: owner.user.id } }), 1);
  });
  it('salva uma edição sem alterar a versão anterior; leitura sobrevive ao reinício da API', async () => {
    const response = await request(`/systems/${system.id}`, { method: 'PUT', token: owner.accessToken, body: { ...input, name: 'Aether revisado', expectedRevision: 1, definition: { ...input.definition, attributes: [{ ...input.definition.attributes[0], defaultValue: 4 }] } } });
    assert.equal(response.status, 200); system = await response.json(); assert.equal(system.revision, 2);
    const old = await prisma.systemVersion.findUnique({ where: { systemId_number: { systemId: system.id, number: 1 } } });
    assert.equal(old.name, input.name); assert.equal(old.definition.attributes[0].defaultValue, 3);
    await app.close(); await start();
    const saved = await (await request(`/systems/mine/${system.id}`, { token: owner.accessToken })).json(); assert.equal(saved.revision, 2); assert.equal(saved.definition.attributes[0].defaultValue, 4);
  });
  it('resolve duas edições concorrentes com um vencedor e um conflito, sem versões parciais', async () => {
    const results = await Promise.all(['Edição um', 'Edição dois'].map(name => request(`/systems/${system.id}`, { method: 'PUT', token: owner.accessToken, body: { ...input, name, expectedRevision: 2 } })));
    assert.deepEqual(results.map(response => response.status).sort(), [200, 409]);
    const conflict = await results.find(response => response.status === 409).json(); assert.equal(conflict.error.code, 'SYSTEM_REVISION_CONFLICT');
    assert.equal(await prisma.systemVersion.count({ where: { systemId: system.id } }), 3);
    assert.equal((await prisma.rpgSystem.findUnique({ where: { id: system.id } })).revision, 3);
  });
  it('publica no catálogo sem e-mail, oculta não listado e revoga acesso público ao tornar privado', async () => {
    async function visibility(value, expectedRevision) {
      const response = await request(`/systems/${system.id}`, { method: 'PUT', token: owner.accessToken, body: { ...input, visibility: value, expectedRevision } }); assert.equal(response.status, 200); return response.json();
    }
    await visibility('PUBLIC', 3);
    let catalog = await (await request(`/systems/public?search=${suffix}`)).json(); assert.equal(catalog.total, 1);
    const publicResponse = await request(`/systems/${system.id}`); assert.equal(publicResponse.status, 200); assert.equal(publicResponse.headers.get('cache-control'), 'no-store');
    const published = await publicResponse.json(); assert.deepEqual(published.definition, input.definition);
    assert.deepEqual(Object.keys(published.owner).sort(), ['displayName', 'id', 'username']); assert.ok(!JSON.stringify(published).includes(owner.user.email));
    await visibility('UNLISTED', 4); catalog = await (await request(`/systems/public?search=${suffix}`)).json(); assert.equal(catalog.total, 0); assert.equal((await request(`/systems/${system.id}`)).status, 200);
    await visibility('PRIVATE', 5); assert.equal((await request(`/systems/${system.id}`)).status, 404);
  });
  it('pagina o catálogo público e permite definições sem dados e sem máximo universal', async () => {
    const simple = { schemaVersion: 1, attributes: [], skills: [], resources: [{ id: randomUUID(), name: 'Influência', defaultValue: 20, maxValue: null }], dice: [] };
    for (let n = 0; n < 21; n++) {
      const response = await request('/systems', { method: 'POST', token: other.accessToken, body: { name: `Catálogo ${suffix} ${n}`, description: '', visibility: 'PUBLIC', definition: simple } }); assert.equal(response.status, 201);
    }
    const first = await (await request(`/systems/public?search=${suffix}&page=1`)).json(); const second = await (await request(`/systems/public?search=${suffix}&page=2`)).json();
    assert.equal(first.total, 21); assert.equal(first.items.length, 20); assert.equal(second.items.length, 1);
    assert.ok(!first.items.some(item => item.id === second.items[0].id));
    assert.equal((await request('/systems/public?page=0')).status, 400);
  });
});
