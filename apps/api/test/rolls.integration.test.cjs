const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');

describe('Dados: sorteio, fichas, histórico, idempotência e acesso com PostgreSQL real', { concurrency: false }, () => {
  let app, prisma, base, gm, player, other, outsider, system, campaign, session, character, gmCharacter, otherCharacter;
  const users = [], suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  const attributeId = randomUUID(), skillId = randomUUID(), resourceId = randomUUID();
  const definition = { schemaVersion: 1, attributes: [{ id: attributeId, name: 'Vontade', defaultValue: -2 }], skills: [{ id: skillId, name: 'Investigar', defaultValue: 3, attributeId }], resources: [{ id: resourceId, name: 'Fôlego', defaultValue: 4, maxValue: 8 }], dice: [2, 6, 20, 1000] };
  async function boot() { app = await createApplication(false); const database = new URL(app.get(ConfigService).get('DATABASE_URL')); assert.ok(['localhost', '127.0.0.1'].includes(database.hostname)); assert.equal(database.pathname, '/paralax'); await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService); }
  async function request(path, actor, method = 'GET', body) { return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(actor ? { Authorization: `Bearer ${actor.accessToken}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  async function json(path, actor, method, body, status = 201) { const response = await request(path, actor, method, body); assert.equal(response.status, status, await response.clone().text()); return response.json(); }
  async function register(label) { const account = await json('/auth/register', null, 'POST', { username: `${label}_${suffix}`, email: `${label}_${suffix}@example.test`, displayName: label, password: 'Uma-senha-de-teste-123!' }); users.push(account.user.id); return account; }
  async function join(account) { const i = await json(`/campaigns/${campaign.id}/invitations`, gm, 'POST', { username: account.user.username }); await json(`/invitations/${i.id}/accept`, account, 'POST', undefined, 200); }
  const rollInput = (patch = {}) => ({ requestId: randomUUID(), count: 3, sides: 6, modifier: -4, characterId: null, fieldId: null, ...patch });
  const roll = (input, account = player, target = session) => request(`/sessions/${target.id}/rolls`, account, 'POST', input);
  const action = (target, verb) => json(`/sessions/${target.id}/${verb}`, gm, 'POST', { expectedRevision: target.revision }, 200);
  async function agenda() { return json(`/campaigns/${campaign.id}/sessions`, gm, 'POST', { title: 'Mesa dos dados', description: '', scheduledAt: '2027-01-10T21:00:00Z', timeZone: 'America/Fortaleza', visibility: 'PUBLIC' }); }
  before(async () => { await boot(); gm = await register('roll_gm'); player = await register('roll_p'); other = await register('roll_o'); outsider = await register('roll_x'); system = await json('/systems', gm, 'POST', { name: 'Regras dos dados', description: '', visibility: 'PRIVATE', definition }); });
  // Restarting the application resets in-memory throttle counters and also verifies durable history.
  beforeEach(async () => { await app.close(); await boot(); campaign = await json('/campaigns', gm, 'POST', { name: 'Campanha dos dados', description: '', visibility: 'PUBLIC', status: 'PLANNED', maxPlayers: 2, systemVersionId: system.versionId }); await join(player); await join(other);
    character = await json(`/campaigns/${campaign.id}/characters`, player, 'POST', { name: 'Lia', description: '', story: '', level: null }); gmCharacter = await json(`/campaigns/${campaign.id}/characters`, gm, 'POST', { name: 'Guia', description: '', story: '', level: null }); otherCharacter = await json(`/campaigns/${campaign.id}/characters`, other, 'POST', { name: 'Nara', description: '', story: '', level: null }); session = await agenda(); });
  after(async () => { await prisma?.user.deleteMany({ where: { id: { in: users } } }); await app?.close(); });

  it('rola só ao vivo, usa randomInt com limites inclusivos, total exato e persiste após reinício', async () => {
    assert.equal((await roll(rollInput())).status, 409); session = await action(session, 'start');
    for (const [count, sides, modifier] of [[50, 2, -1000000], [50, 1000, 1000000]]) {
      const r = await roll(rollInput({ count, sides, modifier })); assert.equal(r.status, 201); assert.equal(r.headers.get('cache-control'), 'no-store'); const value = await r.json();
      assert.equal(value.results.length, count); assert.ok(value.results.every(result => Number.isInteger(result) && result >= 1 && result <= sides)); assert.equal(value.total, value.results.reduce((sum, result) => sum + result, modifier)); assert.equal(value.actor.id, player.user.id); assert.equal(value.actor.displayName, 'roll_p'); assert.equal(value.character, null); assert.equal(value.manualModifier, modifier); assert.ok(Date.parse(value.createdAt) <= Date.now());
      const stored = await prisma.diceRoll.findUnique({ where: { id: value.id } }); assert.deepEqual(stored.results, value.results); assert.equal(stored.total, value.total);
    }
    await app.close(); await boot(); const history = await json(`/sessions/${session.id}/rolls`, gm, 'GET', undefined, 200); assert.equal(history.items.length, 2); assert.deepEqual(history.items.map(item => item.sequence), [2, 1]); assert.equal(history.nextCursor, null); assert.ok(!JSON.stringify(history).includes(player.user.email)); assert.ok(!JSON.stringify(history).includes('accessToken'));
  });
  it('opções e valores respeitam a versão fixa, o dono da ficha e o atributo/perícia escolhido', async () => {
    session = await action(session, 'start');
    const playerOptions = await json(`/sessions/${session.id}/rolls/options`, player, 'GET', undefined, 200), gmOptions = await json(`/sessions/${session.id}/rolls/options`, gm, 'GET', undefined, 200);
    assert.deepEqual(playerOptions.dice, definition.dice); assert.deepEqual(playerOptions.characters, [{ id: character.id, name: character.name }]); assert.equal(gmOptions.characters.length, 3);
    await json(`/systems/${system.id}`, gm, 'PUT', { name: system.name, description: '', visibility: 'PRIVATE', expectedRevision: system.revision, definition: { ...definition, dice: [8] } }, 200);
    assert.deepEqual((await json(`/sessions/${session.id}/rolls/options`, player, 'GET', undefined, 200)).dice, definition.dice);
    for (const [fieldId, expected] of [[attributeId, -2], [skillId, 3]]) {
      const response = await roll(rollInput({ characterId: character.id, fieldId, modifier: 4 })); assert.equal(response.status, 201); const value = await response.json(); assert.equal(value.character.field.value, expected); assert.equal(value.character.revision, 1); assert.equal(value.modifier, 4 + expected); assert.equal(value.total, value.results.reduce((sum, v) => sum + v, 4 + expected));
    }
    assert.equal((await roll(rollInput({ characterId: otherCharacter.id, fieldId: skillId }))).status, 404);
    assert.equal((await roll(rollInput({ characterId: character.id, fieldId: skillId }), gm)).status, 201);
    assert.equal((await roll(rollInput({ characterId: character.id, fieldId: resourceId }))).status, 400);
    assert.equal((await roll(rollInput({ sides: 8 }))).status, 400);
    const row = await prisma.character.findUnique({ where: { id: character.id } }); const values = { ...row.values, skills: [{ fieldId: skillId, value: 7 }] };
    await json(`/characters/${character.id}`, player, 'PUT', { name: 'Lia Renomeada', description: '', story: '', level: null, expectedRevision: 1, values }, 200);
    const saved = await (await roll(rollInput({ characterId: character.id, fieldId: skillId }))).json(); assert.equal(saved.character.revision, 2); assert.equal(saved.character.field.value, 7);
    const history = await json(`/sessions/${session.id}/rolls`, gm, 'GET', undefined, 200); assert.equal(history.items.at(-1).character.name, 'Lia'); assert.equal(history.items.at(-1).character.field.value, -2);
  });
  it('rejeita resultados/autoria/horário enviados, quantidades, dados e modificadores inválidos sem gravar', async () => {
    session = await action(session, 'start');
    for (const patch of [{ results: [6, 6, 6] }, { total: 100 }, { actorId: gm.user.id }, { createdAt: '2020-01-01T00:00:00Z' }, { expression: 'eval(1)' }, { count: 0 }, { count: 51 }, { count: 1.5 }, { sides: 1 }, { sides: 1001 }, { modifier: 1000001 }, { modifier: -1000001 }, { modifier: 2.5 }, { requestId: 'bad' }, { characterId: 'bad' }, { fieldId: skillId }]) assert.equal((await roll(rollInput(patch))).status, 400);
    assert.equal(await prisma.diceRoll.count({ where: { sessionId: session.id } }), 0); assert.equal((await request(`/sessions/${session.id}/rolls?before=0`, player)).status, 400); assert.equal((await request(`/sessions/${session.id}/rolls?extra=x`, player)).status, 400);
  });
  it('tentativas concorrentes têm um resultado; repetir após edição e encerramento devolve o snapshot original', async () => {
    session = await action(session, 'start'); const input = rollInput({ characterId: character.id, fieldId: skillId });
    const responses = await Promise.all([roll(input), roll(input), roll({ ...input, requestId: input.requestId.toUpperCase() })]); assert.deepEqual(responses.map(r => r.status), [201, 201, 201]); const values = await Promise.all(responses.map(r => r.json())); assert.deepEqual(values[0], values[1]); assert.deepEqual(values[0], values[2]); assert.equal(await prisma.diceRoll.count({ where: { sessionId: session.id } }), 1);
    const conflict = await roll({ ...input, modifier: 1 }); assert.equal(conflict.status, 409); assert.equal((await conflict.json()).error.code, 'ROLL_REQUEST_CONFLICT');
    const row = await prisma.character.findUnique({ where: { id: character.id } }); await json(`/characters/${character.id}`, player, 'PUT', { name: 'Nome novo', description: '', story: '', level: null, expectedRevision: 1, values: { ...row.values, skills: [{ fieldId: skillId, value: 99 }] } }, 200);
    session = await action(session, 'end'); assert.deepEqual(await (await roll(input)).json(), values[0]); assert.equal((await roll(rollInput())).status, 409);
  });
  it('pendente, terceiro, visitante e removido não recebem histórico, opções ou replay, mesmo em sessão pública', async () => {
    session = await action(session, 'start'); const input = rollInput(); assert.equal((await roll(input)).status, 201);
    const pending = await json(`/campaigns/${campaign.id}/invitations`, gm, 'POST', { username: outsider.user.username }); assert.ok(pending.id);
    for (const actor of [null, outsider]) { for (const path of [`/sessions/${session.id}/rolls`, `/sessions/${session.id}/rolls/options`]) assert.equal((await request(path, actor)).status, actor ? 404 : 401); assert.equal((await roll(rollInput(), actor)).status, actor ? 404 : 401); }
    const publicSession = await json(`/sessions/public/${session.id}`, null, 'GET', undefined, 200); assert.equal(publicSession.rolls, undefined); assert.equal(publicSession.characters, undefined);
    assert.equal((await request(`/campaigns/${campaign.id}/members/${player.user.id}`, gm, 'DELETE')).status, 204); assert.equal((await roll(input)).status, 404); assert.equal((await request(`/sessions/${session.id}/rolls`, player)).status, 404); assert.equal((await request(`/sessions/${session.id}/rolls/options`, player)).status, 404);
    assert.ok(!(await json(`/sessions/${session.id}/rolls/options`, gm, 'GET', undefined, 200)).characters.some(item => item.id === character.id)); assert.equal((await roll(rollInput({ characterId: character.id }), gm)).status, 404);
    assert.equal((await json(`/sessions/${session.id}/rolls`, gm, 'GET', undefined, 200)).items.length, 1); await join(player); assert.deepEqual(await (await roll(input)).json(), (await json(`/sessions/${session.id}/rolls`, gm, 'GET', undefined, 200)).items[0]);
  });
  it('cursores não duplicam rolagens quando chegam novos resultados; cada sessão tem sequência própria', async () => {
    session = await action(session, 'start'); const first = await (await roll(rollInput())).json(); const stored = await prisma.diceRoll.findUnique({ where: { id: first.id } });
    const { id, ...data } = stored; await prisma.diceRoll.createMany({ data: Array.from({ length: 24 }, (_, n) => ({ ...data, id: randomUUID(), requestId: randomUUID(), sequence: n + 2 })) });
    const page = await json(`/sessions/${session.id}/rolls`, player, 'GET', undefined, 200); assert.equal(page.items.length, 20); assert.equal(page.nextCursor, 6);
    await roll(rollInput()); const older = await json(`/sessions/${session.id}/rolls?before=${page.nextCursor}`, player, 'GET', undefined, 200); assert.deepEqual(older.items.map(item => item.sequence), [5, 4, 3, 2, 1]); assert.equal(older.nextCursor, null); assert.equal(new Set([...page.items, ...older.items].map(item => item.id)).size, 25);
    session = await action(session, 'end'); const another = await action(await agenda(), 'start'); const value = await (await roll(rollInput(), gm, another)).json(); assert.equal(value.sequence, 1);
  });
  it('trava ordena rolagem com encerramento e remoção; CHECKs rejeitam total e resultados incoerentes', async () => {
    session = await action(session, 'start'); const responses = await Promise.all([roll(rollInput()), request(`/sessions/${session.id}/end`, gm, 'POST', { expectedRevision: session.revision })]); assert.equal(responses[1].status, 200); assert.ok([201, 409].includes(responses[0].status)); assert.equal(await prisma.diceRoll.count({ where: { sessionId: session.id } }), responses[0].status === 201 ? 1 : 0);
    const live = await action(await agenda(), 'start'); const concurrent = await Promise.all([roll(rollInput(), player, live), request(`/campaigns/${campaign.id}/members/${player.user.id}`, gm, 'DELETE')]); assert.equal(concurrent[1].status, 204); assert.ok([201, 404].includes(concurrent[0].status)); assert.equal((await roll(rollInput(), player, live)).status, 404);
    const valid = await (await roll(rollInput(), gm, live)).json(); const data = await prisma.diceRoll.findUnique({ where: { id: valid.id } });
    for (const patch of [{ total: data.total + 1 }, { results: [0, 1, 1] }, { results: [7, 7, 7] }, { results: [2] }, { modifier: 123 }, { sequence: 0 }]) await assert.rejects(prisma.diceRoll.create({ data: { ...data, id: randomUUID(), sequence: 99, requestId: randomUUID(), ...patch } }));
  });
  it('limita a frequência de POST sem gerar resultados adicionais', async () => {
    session = await action(session, 'start'); const input = rollInput(); for (let n = 0; n < 30; n++) assert.equal((await roll(input)).status, 201); assert.equal((await roll(input)).status, 429); assert.equal(await prisma.diceRoll.count({ where: { sessionId: session.id } }), 1);
  });
});
