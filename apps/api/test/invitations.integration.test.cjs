const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');

describe('Convites e membros: autorização e lotação transacional', { concurrency: false }, () => {
  let app, prisma, base, owner, player, other, outsider, system;
  const ids = [], suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  const input = { name: `Mesa ${suffix}`, description: 'Campanha privada.', visibility: 'PRIVATE', status: 'PLANNED', maxPlayers: 1 };
  async function request(path, session, method = 'GET', body) {
    return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  async function start() {
    app = await createApplication(false); const url = new URL(app.get(ConfigService).get('DATABASE_URL'));
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname)); assert.equal(url.pathname, '/paralax');
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService);
  }
  async function register(label) {
    const response = await request('/auth/register', null, 'POST', { username: `${label}_${suffix}`, email: `${label}_${suffix}@example.test`, displayName: label, password: 'Uma-senha-de-teste-123!' });
    assert.equal(response.status, 201); const result = await response.json(); ids.push(result.user.id); return result;
  }
  async function campaign(maxPlayers = 1) {
    const response = await request('/campaigns', owner, 'POST', { ...input, maxPlayers, systemVersionId: system.versionId }); assert.equal(response.status, 201); return response.json();
  }
  async function invite(c, recipient, session = owner) {
    const response = await request(`/campaigns/${c.id}/invitations`, session, 'POST', { username: recipient.user.username }); assert.equal(response.status, 201); return response.json();
  }
  async function accept(i, recipient) { return request(`/invitations/${i.id}/accept`, recipient, 'POST'); }
  async function update(c, patch) {
    return request(`/campaigns/${c.id}`, owner, 'PUT', { ...input, maxPlayers: c.maxPlayers, expectedRevision: c.revision, ...patch });
  }
  before(async () => {
    await start(); owner = await register('invite_gm'); player = await register('invite_p1'); other = await register('invite_p2'); outsider = await register('invite_x');
    const response = await request('/systems', owner, 'POST', { name: 'Regras privadas', description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1,
      attributes: [{ id: randomUUID(), name: 'Vontade', defaultValue: 3 }], skills: [], resources: [], dice: [20] } }); assert.equal(response.status, 201); system = await response.json();
  });
  after(async () => { if (prisma) await prisma.user.deleteMany({ where: { id: { in: ids } } }); await app?.close(); });

  it('envia para username normalizado, sem permitir identidade alheia ou acesso antes do aceite', async () => {
    const c = await campaign();
    assert.equal((await request(`/campaigns/${c.id}/invitations`, null, 'POST', { username: player.user.username })).status, 401);
    assert.equal((await request(`/campaigns/${c.id}/invitations`, player, 'POST', { username: other.user.username })).status, 404);
    assert.equal((await request(`/campaigns/${c.id}/invitations`, owner, 'POST', { username: player.user.username, recipientId: outsider.user.id })).status, 400);
    assert.equal((await request(`/campaigns/${c.id}/invitations`, owner, 'POST', { username: owner.user.username })).status, 400);
    assert.equal((await request(`/campaigns/${c.id}/invitations`, owner, 'POST', { username: `missing_${suffix}` })).status, 404);
    const response = await request(`/campaigns/${c.id}/invitations`, owner, 'POST', { username: ` @${player.user.username.toUpperCase()} ` }); assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store');
    const i = await response.json(); assert.equal(i.status, 'PENDING'); assert.equal(i.recipient.id, player.user.id); assert.equal(i.inviter.id, owner.user.id);
    assert.equal(i.recipientIsMember, false); assert.ok(new Date(i.expiresAt) > new Date(Date.now() + 6 * 86400000));
    assert.equal((await request(`/campaigns/mine/${c.id}`, player)).status, 404);
    assert.equal((await request(`/campaigns/${c.id}/members`, player)).status, 404);
    assert.equal((await request(`/invitations/${i.id}/accept`, outsider, 'POST')).status, 404);
    assert.equal((await request(`/invitations/${i.id}/decline`, outsider, 'POST')).status, 404);
    const inbox = await (await request('/users/me/invitations', player)).json(); assert.equal(inbox.total, 1);
    assert.equal((await (await request('/users/me/invitations', outsider)).json()).total, 0);
    assert.ok(!JSON.stringify(inbox).includes(player.user.email)); assert.equal(i.campaign.members, undefined);
    assert.equal((await request(`/campaigns/${c.id}/invitations`, player)).status, 404);
  });

  it('serializa convites duplicados e cria um único vínculo no aceite repetido', async () => {
    const c = await campaign();
    const results = await Promise.all([1, 2].map(() => request(`/campaigns/${c.id}/invitations`, owner, 'POST', { username: player.user.username })));
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]); const i = await results.find(r => r.status === 201).json();
    const accepted = await Promise.all([accept(i, player), accept(i, player)]); assert.deepEqual(accepted.map(r => r.status), [200, 200]);
    assert.equal(await prisma.campaignMember.count({ where: { campaignId: c.id, userId: player.user.id, status: 'ACTIVE' } }), 1);
    const privateResponse = await request(`/campaigns/mine/${c.id}`, player); assert.equal(privateResponse.status, 200); const detail = await privateResponse.json(); assert.equal(detail.role, 'PLAYER'); assert.equal(detail.definition.attributes[0].defaultValue, 3);
    assert.equal((await request(`/systems/mine/${system.id}`, player)).status, 404); assert.equal((await request(`/systems/${system.id}`, player)).status, 404);
    assert.equal((await request(`/campaigns/${c.id}`, player, 'PUT', { ...input, expectedRevision: 1 })).status, 404);
    assert.equal((await request(`/campaigns/${c.id}/invitations`, owner, 'POST', { username: player.user.username })).status, 409);
    const team = await (await request(`/campaigns/${c.id}/members`, player)).json(); assert.equal(team.playerCount, 1); assert.deepEqual(team.items.map(m => m.role), ['OWNER', 'PLAYER']); assert.ok(!JSON.stringify(team).includes(owner.user.email));
    const mine = await (await request(`/campaigns/mine?search=${suffix}`, player)).json(); assert.ok(mine.items.some(item => item.id === c.id));
    await app.close(); await start(); assert.equal((await request(`/campaigns/mine/${c.id}`, player)).status, 200);
  });

  it('duas pessoas disputam a última vaga; a perdedora fica pendente e não obtém acesso', async () => {
    const c = await campaign(); const a = await invite(c, player), b = await invite(c, other);
    const results = await Promise.all([accept(a, player), accept(b, other)]); assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const winner = results[0].status === 200 ? player : other, loser = winner === player ? other : player;
    assert.equal((await results.find(r => r.status === 409).json()).error.code, 'CAMPAIGN_FULL');
    assert.equal(await prisma.campaignMember.count({ where: { campaignId: c.id, status: 'ACTIVE' } }), 1);
    assert.equal((await request(`/campaigns/mine/${c.id}`, loser)).status, 404);
    const pending = await prisma.campaignInvitation.findUnique({ where: { id: winner === player ? b.id : a.id } }); assert.equal(pending.status, 'PENDING');
    assert.equal((await request(`/campaigns/${c.id}/members/${winner.user.id}`, owner, 'DELETE')).status, 204);
    assert.equal((await accept(winner === player ? b : a, loser)).status, 200);
  });

  it('recusa e revoga sem criar membros; apenas o mestre revoga e respostas finais não reabrem convite', async () => {
    const c = await campaign(); const i = await invite(c, player);
    assert.equal((await request(`/invitations/${i.id}/decline`, player, 'POST')).status, 200);
    assert.equal((await request(`/invitations/${i.id}/decline`, player, 'POST')).status, 200);
    assert.equal((await accept(i, player)).status, 409); assert.equal(await prisma.campaignMember.count({ where: { campaignId: c.id } }), 0);
    const fresh = await invite(c, player);
    assert.equal((await request(`/campaigns/${c.id}/invitations/${fresh.id}`, other, 'DELETE')).status, 404);
    assert.equal((await request(`/campaigns/${c.id}/invitations/${fresh.id}`, owner, 'DELETE')).status, 204);
    assert.equal((await request(`/campaigns/${c.id}/invitations/${fresh.id}`, owner, 'DELETE')).status, 204);
    assert.equal((await accept(fresh, player)).status, 409);
    assert.equal((await (await request(`/campaigns/${c.id}/invitations`, owner)).json()).total, 2);
  });

  it('rejeita convite expirado e permite envio de um novo sem usar o convite antigo', async () => {
    const c = await campaign(); const i = await invite(c, player);
    await prisma.campaignInvitation.update({ where: { id: i.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await (await request('/users/me/invitations', player)).json()).items.find(row => row.id === i.id).status, 'EXPIRED');
    const response = await accept(i, player); assert.equal(response.status, 409); assert.equal((await response.json()).error.code, 'INVITATION_EXPIRED');
    const fresh = await invite(c, player); assert.notEqual(fresh.id, i.id); assert.equal((await accept(fresh, player)).status, 200); assert.equal((await accept(i, player)).status, 409);
  });

  it('remoção revoga acesso/lista/regras; não remove o mestre e convite já aceito não permite reingresso', async () => {
    const c = await campaign(); const i = await invite(c, player); assert.equal((await accept(i, player)).status, 200);
    assert.equal((await request(`/campaigns/${c.id}/members/${owner.user.id}`, owner, 'DELETE')).status, 400);
    assert.equal((await request(`/campaigns/${c.id}/members/${player.user.id}`, player, 'DELETE')).status, 404);
    assert.equal((await request(`/campaigns/${c.id}/members/${player.user.id}`, owner, 'DELETE')).status, 204);
    assert.equal((await request(`/campaigns/${c.id}/members/${player.user.id}`, owner, 'DELETE')).status, 204);
    assert.equal((await request(`/campaigns/mine/${c.id}`, player)).status, 404); assert.equal((await request(`/campaigns/${c.id}/members`, player)).status, 404);
    assert.ok(!(await (await request(`/campaigns/mine?search=${suffix}`, player)).json()).items.some(item => item.id === c.id));
    assert.equal((await accept(i, player)).status, 409);
    const fresh = await invite(c, player); assert.equal((await accept(fresh, player)).status, 200); assert.equal(await prisma.campaignMember.count({ where: { campaignId: c.id } }), 1);
  });

  it('não reduz capacidade abaixo da ocupação e protege aceite concorrente com redução', async () => {
    const c = await campaign(2), a = await invite(c, player), b = await invite(c, other); assert.equal((await accept(a, player)).status, 200); assert.equal((await accept(b, other)).status, 200);
    const reduced = await update(c, { maxPlayers: 1 }); assert.equal(reduced.status, 409); assert.equal((await reduced.json()).error.code, 'CAMPAIGN_CAPACITY_CONFLICT');
    const race = await campaign(2), x = await invite(race, player), y = await invite(race, other); assert.equal((await accept(x, player)).status, 200);
    const concurrent = await Promise.all([update(race, { maxPlayers: 1 }), accept(y, other)]); assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
    const saved = await prisma.campaign.findUnique({ where: { id: race.id } }); const count = await prisma.campaignMember.count({ where: { campaignId: race.id, status: 'ACTIVE' } }); assert.ok(count <= saved.maxPlayers);
  });

  it('aceite e revogação têm resultado consistente sob concorrência; campanha encerrada bloqueia ingresso', async () => {
    const c = await campaign(), i = await invite(c, player);
    const results = await Promise.all([accept(i, player), request(`/campaigns/${c.id}/invitations/${i.id}`, owner, 'DELETE')]);
    assert.ok(results[0].status === 200 && results[1].status === 409 || results[0].status === 409 && results[1].status === 204);
    const row = await prisma.campaignInvitation.findUnique({ where: { id: i.id } }); const count = await prisma.campaignMember.count({ where: { campaignId: c.id, status: 'ACTIVE' } }); assert.equal(count, row.status === 'ACCEPTED' ? 1 : 0);
    const closed = await campaign(), pending = await invite(closed, player); const ended = await update(closed, { status: 'ENDED' }); assert.equal(ended.status, 200);
    assert.equal((await accept(pending, player)).status, 409); assert.equal((await request(`/campaigns/${closed.id}/invitations`, owner, 'POST', { username: other.user.username })).status, 409);
    assert.equal((await request(`/invitations/${pending.id}/decline`, player, 'POST')).status, 200);
  });
});
