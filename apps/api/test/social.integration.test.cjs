const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { hash, argon2id } = require('argon2');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');

describe('Amizades e mensagens privadas: consentimento, isolamento e concorrência', { concurrency: false }, () => {
  let app, db, base, a, b, outsider;
  const ids = [];
  async function request(path, actor, method = 'GET', body) {
    return fetch(`${base}/social${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(actor ? { Authorization: `Bearer ${actor.accessToken}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  async function json(path, actor, method, body, status = 200) { const res = await request(path, actor, method, body); assert.equal(res.status, status, await res.clone().text()); return res.json(); }
  async function fixture(label, passwordHash) {
    const username = `soc_${label}_${randomUUID().replaceAll('-', '').slice(0, 9)}`;
    const user = await db.user.create({ data: { username, email: `${username}@example.test`, passwordHash, profile: { create: { displayName: label } } } }); ids.push(user.id);
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'Uma-senha-de-teste-123!' }) });
    assert.equal(response.status, 200); return response.json();
  }
  async function friendship() { const value = await json('/requests', a, 'POST', { username: b.user.username }, 201); assert.equal((await request(`/connections/${value.id}/action`, b, 'POST', { action: 'accept' })).status, 204); return value.id; }
  before(async () => {
    app = await createApplication(false); const url = new URL(app.get(ConfigService).get('DATABASE_URL'));
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname)); assert.equal(url.pathname, '/paralax');
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; db = app.get(PrismaService);
    const passwordHash = await hash('Uma-senha-de-teste-123!', { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    a = await fixture('a', passwordHash); b = await fixture('b', passwordHash); outsider = await fixture('x', passwordHash);
  });
  beforeEach(async () => {
    // Each story gets independent in-memory rate limits, with production limits intact.
    await app.close(); app = await createApplication(false); await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api/v1`; db = app.get(PrismaService);
    await db.friendship.deleteMany({ where: { lowId: { in: ids }, highId: { in: ids } } });
  });
  after(async () => { if (db) await db.user.deleteMany({ where: { id: { in: ids } } }); await app?.close(); });

  it('busca só dados públicos; exige autenticação, consentimento e identidade do destinatário', async () => {
    assert.equal((await request('/connections')).status, 401);
    assert.equal((await request('/search?search=a', a)).status, 400);
    const found = await json(`/search?search=@${b.user.username.toUpperCase()}`, a);
    assert.equal(found.items[0].id, b.user.id); assert.ok(!JSON.stringify(found).includes(b.user.email)); assert.equal(found.items[0].passwordHash, undefined);
    assert.equal((await request('/requests', a, 'POST', { username: a.user.username })).status, 400);
    assert.equal((await request('/requests', a, 'POST', { username: b.user.username, initiatorId: outsider.user.id })).status, 400);
    const pending = await json('/requests', a, 'POST', { username: ` @${b.user.username.toUpperCase()} ` }, 201);
    const inbox = await json('/connections', b); assert.equal(inbox.items[0].incoming, true); assert.equal(inbox.items[0].status, 'PENDING');
    assert.equal((await request(`/connections/${pending.id}/messages`, a)).status, 404);
    assert.equal((await request(`/connections/${pending.id}/messages`, b, 'POST', { content: 'Olá', requestId: randomUUID() })).status, 404);
    assert.equal((await request(`/connections/${pending.id}/action`, a, 'POST', { action: 'accept' })).status, 409);
    assert.equal((await request(`/connections/${pending.id}/action`, outsider, 'POST', { action: 'accept' })).status, 404);
    const accepted = await Promise.all([1, 2].map(() => request(`/connections/${pending.id}/action`, b, 'POST', { action: 'accept' })));
    assert.deepEqual(accepted.map(res => res.status), [204, 204]);
    assert.equal((await request(`/connections/${pending.id}/messages`, outsider)).status, 404);
    const response = await request(`/connections/${pending.id}/messages`, a); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await json('/connections', outsider)).total, 0);
  });
  it('pedidos cruzados simultâneos criam um único vínculo, ainda pendente de aceite', async () => {
    const responses = await Promise.all([request('/requests', a, 'POST', { username: b.user.username }), request('/requests', b, 'POST', { username: a.user.username })]);
    assert.deepEqual(responses.map(res => res.status).sort(), [201, 409]);
    const rows = await db.friendship.findMany({ where: { lowId: { in: ids }, highId: { in: ids } } }); assert.equal(rows.length, 1); assert.equal(rows[0].status, 'PENDING');
  });
  it('mensagens têm sequência atômica, replay seguro, leitura monotônica e paginação sem perdas', async () => {
    const id = await friendship(), input = { requestId: randomUUID(), content: 'Olá <script>literal</script>\nPróxima aventura?' };
    assert.equal((await request(`/connections/${id}/messages?before=9007199254740991`, a)).status, 400);
    const sent = await Promise.all([1, 2, 3].map(() => json(`/connections/${id}/messages`, a, 'POST', input, 201)));
    assert.ok(sent.every(row => row.id === sent[0].id)); assert.equal(sent[0].sequence, 1);
    assert.equal((await request(`/connections/${id}/messages`, a, 'POST', { ...input, content: 'Outra mensagem' })).status, 409);
    for (const invalid of [{ content: ' ', requestId: randomUUID() }, { content: 'x'.repeat(2001), requestId: randomUUID() }, { ...input, senderId: b.user.id }]) assert.equal((await request(`/connections/${id}/messages`, a, 'POST', invalid)).status, 400);
    const messages = await Promise.all(Array.from({ length: 6 }, (_, i) => json(`/connections/${id}/messages`, i % 2 ? b : a, 'POST', { requestId: randomUUID(), content: `Mensagem ${i}` }, 201)));
    assert.deepEqual(messages.map(item => item.sequence).sort((x, y) => x - y), [2, 3, 4, 5, 6, 7]);
    assert.equal((await json('/connections', b)).items[0].unread, 4);
    assert.equal((await request(`/connections/${id}/read`, b, 'POST', { sequence: 99 })).status, 400);
    assert.equal((await request(`/connections/${id}/read`, outsider, 'POST', { sequence: 7 })).status, 404);
    assert.equal((await request(`/connections/${id}/read`, b, 'POST', { sequence: 7 })).status, 204);
    assert.equal((await request(`/connections/${id}/read`, b, 'POST', { sequence: 1 })).status, 204);
    assert.equal((await json('/connections', b)).items[0].unread, 0);
    await db.$transaction(async tx => { await tx.directMessage.createMany({ data: Array.from({ length: 55 }, (_, i) => ({ friendshipId: id, senderId: a.user.id, requestId: randomUUID(), sequence: i + 8, content: `Histórico ${i}` })) }); await tx.friendship.update({ where: { id }, data: { lastSequence: 62 } }); });
    const latest = await json(`/connections/${id}/messages`, b); assert.equal(latest.items.length, 50); assert.equal(latest.hasMore, true); assert.equal(latest.items[0].sequence, 13);
    const old = await json(`/connections/${id}/messages?before=13`, b); assert.equal(old.hasMore, false); assert.deepEqual(old.items.map(row => row.sequence), Array.from({ length: 12 }, (_, i) => i + 1));
    assert.equal((await json('/connections', b)).items[0].unread, 55);
  });
  it('recusa, remoção e bloqueio impedem novos envios; só quem bloqueou pode desbloquear', async () => {
    const id = await friendship();
    assert.equal((await request(`/connections/${id}/action`, a, 'POST', { action: 'remove' })).status, 204);
    assert.equal((await request(`/connections/${id}/messages`, b)).status, 404);
    assert.equal((await request('/requests', b, 'POST', { username: a.user.username })).status, 409);
    await db.friendship.update({ where: { id }, data: { updatedAt: new Date(Date.now() - 86400001) } });
    await json('/requests', b, 'POST', { username: a.user.username }, 201);
    assert.equal((await request(`/connections/${id}/action`, a, 'POST', { action: 'decline' })).status, 204);
    assert.equal((await request('/requests', b, 'POST', { username: a.user.username })).status, 409);
    assert.equal((await request(`/connections/${id}/action`, a, 'POST', { action: 'block' })).status, 204);
    assert.equal((await json('/connections', b)).total, 0); assert.equal((await json('/connections', a)).items[0].blockedByMe, true);
    assert.equal((await json(`/search?search=${a.user.username}`, b)).items.length, 0);
    assert.equal((await request('/requests', b, 'POST', { username: a.user.username })).status, 404);
    assert.equal((await request(`/connections/${id}/messages`, a, 'POST', { content: 'Bloqueada', requestId: randomUUID() })).status, 404);
    assert.equal((await request(`/connections/${id}/action`, b, 'POST', { action: 'unblock' })).status, 404);
    assert.equal((await request(`/connections/${id}/action`, a, 'POST', { action: 'unblock' })).status, 204);
    assert.equal((await request(`/connections/${id}/messages`, a)).status, 404);
  });
  it('envio e remoção concorrentes respeitam a mesma trava; não há envio após remoção', async () => {
    const id = await friendship();
    const responses = await Promise.all([request(`/connections/${id}/messages`, a, 'POST', { requestId: randomUUID(), content: 'Até a próxima!' }), request(`/connections/${id}/action`, b, 'POST', { action: 'remove' })]);
    assert.ok([201, 404].includes(responses[0].status)); assert.equal(responses[1].status, 204);
    assert.equal((await request(`/connections/${id}/messages`, a, 'POST', { requestId: randomUUID(), content: 'Depois da remoção' })).status, 404);
  });
  it('limita solicitações repetidas sem criar vínculos indevidos', async () => {
    for (let i = 0; i < 10; i++) assert.equal((await request('/requests', a, 'POST', { username: a.user.username })).status, 400);
    assert.equal((await request('/requests', a, 'POST', { username: b.user.username })).status, 429);
    assert.equal((await json('/connections', a)).total, 0);
  });
});
