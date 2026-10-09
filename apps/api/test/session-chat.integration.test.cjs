const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');
const { SessionChatService } = require('../dist/modules/sessions/session-chat.service');

describe('Chat de sessão: acesso, histórico, leitura, notificações e concorrência com PostgreSQL real', { concurrency: false }, () => {
  let app, prisma, base, gm, player, outsider, campaign, session, chat;
  const ids = [], suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const input = content => ({ requestId: randomUUID(), content });
  async function request(path, account = player, method = 'GET', body) {
    return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(account ? { Authorization: `Bearer ${account.accessToken}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  const path = () => `/sessions/${session.id}/messages`;
  const send = (body, account = gm) => request(path(), account, 'POST', body);
  const summary = async () => (await request('/social/notifications/summary')).json();
  const feed = async (page = 1) => (await request(`/social/notifications?page=${page}`)).json();
  async function startApp() {
    app = await createApplication(false); const url = new URL(app.get(ConfigService).get('DATABASE_URL'));
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname)); assert.equal(url.pathname, '/paralax');
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService); chat = app.get(SessionChatService);
  }
  async function register(label) {
    const response = await request('/auth/register', null, 'POST', { username: `${label}_${suffix}`, email: `${label}_${suffix}@example.test`, displayName: label, password: 'Uma-senha-de-teste-123!' });
    assert.equal(response.status, 201); const account = await response.json(); ids.push(account.user.id); return account;
  }
  before(async () => {
    await startApp(); gm = await register('chat_gm'); player = await register('chat_p'); outsider = await register('chat_x');
    const systemResponse = await request('/systems', gm, 'POST', { name: 'Sistema de chat', description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [20] } });
    assert.equal(systemResponse.status, 201); const system = await systemResponse.json();
    const response = await request('/campaigns', gm, 'POST', { name: 'Mesa de chat', description: '', status: 'PLANNED', visibility: 'PUBLIC', maxPlayers: 2, systemVersionId: system.versionId });
    assert.equal(response.status, 201); campaign = await response.json();
    await prisma.campaignMember.create({ data: { campaignId: campaign.id, userId: player.user.id } });
  });
  beforeEach(async () => {
    await app.close(); await startApp();
    await prisma.gameSession.deleteMany({ where: { campaignId: campaign.id } });
    await prisma.friendship.deleteMany({ where: { OR: [{ lowId: { in: ids } }, { highId: { in: ids } }] } });
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PLANNED' } });
    await prisma.campaignMember.updateMany({ where: { campaignId: campaign.id }, data: { status: 'ACTIVE', removedAt: null, joinedAt: new Date() } });
    await prisma.campaignMember.deleteMany({ where: { campaignId: campaign.id, userId: outsider.user.id } });
    const response = await request(`/campaigns/${campaign.id}/sessions`, gm, 'POST', { title: 'Sessão do chat', description: '', scheduledAt: '2027-01-10T18:00:00-03:00', timeZone: 'America/Fortaleza', visibility: 'PUBLIC' });
    assert.equal(response.status, 201); session = await response.json();
  });
  after(async () => { if (prisma) await prisma.user.deleteMany({ where: { id: { in: ids } } }); await app?.close(); });

  it('exige login e participação ativa mesmo em sessão pública, e não expõe dados privados', async () => {
    assert.equal((await send(input('Planos da mesa'))).status, 201);
    const invitation = await request(`/campaigns/${campaign.id}/invitations`, gm, 'POST', { username: outsider.user.username }); assert.equal(invitation.status, 201);
    for (const account of [null, outsider]) {
      const expected = account ? 404 : 401;
      assert.equal((await request(path(), account)).status, expected);
      assert.equal((await send(input('Intrusão'), account)).status, expected);
      assert.equal((await request(`${path()}/read`, account, 'POST', { sequence: 1 })).status, expected);
    }
    const history = await request(path()); assert.equal(history.headers.get('cache-control'), 'no-store');
    const body = await history.json(); assert.equal(body.items[0].sender.id, gm.user.id); assert.equal(body.canSend, true);
    assert.ok(!JSON.stringify(body).includes(gm.user.email)); assert.equal(body.items[0].sender.passwordHash, undefined);
    const started = await request(`/sessions/${session.id}/start`, gm, 'POST', { expectedRevision: session.revision }); assert.equal(started.status, 200);
    const publicResponse = await request(`/sessions/public/${session.id}`, null); assert.equal(publicResponse.status, 200);
    const publicBody = await publicResponse.json(); assert.equal(publicBody.messages, undefined); assert.ok(!JSON.stringify(publicBody).includes('Planos da mesa'));
  });
  it('valida texto/autoria e recupera envio concorrente ou resposta perdida sem duplicar', async () => {
    const value = input('  <script>texto literal</script>  ');
    const responses = await Promise.all([send(value), send(value)]); assert.deepEqual(responses.map(response => response.status), [201, 201]);
    const a = await responses[0].json(), b = await responses[1].json(); assert.equal(a.id, b.id); assert.equal(a.content, value.content.trim());
    assert.equal(await prisma.sessionMessage.count({ where: { sessionId: session.id } }), 1);
    assert.equal((await feed()).items[0].version, 1);
    assert.equal((await send({ ...value, content: 'Outro texto' })).status, 409);
    for (const invalid of [{ ...input('x'), senderId: outsider.user.id }, { ...input('x'), sequence: 10 }, input(' '), input('a'.repeat(2001)), { requestId: 'inválido', content: 'x' }]) assert.equal((await send(invalid)).status, 400);
    assert.equal((await request(`${path()}?before=0`)).status, 400);
    await app.close(); await startApp(); const history = await (await request(path())).json(); assert.equal(history.items.length, 1); assert.equal(history.items[0].id, a.id);
  });
  it('ordena envios simultâneos e pagina mais de 50 mensagens sem saltos ou duplicações', async () => {
    for (let group = 0; group < 6; group++) await Promise.all(Array.from({ length: 10 }, (_, i) => chat.send(i % 2 ? player.user.id : gm.user.id, session.id, input(`Mensagem ${group * 10 + i}`))));
    const latest = await (await request(path())).json(); assert.equal(latest.items.length, 50); assert.equal(latest.latestSequence, 60); assert.equal(latest.nextCursor, 11);
    const older = await (await request(`${path()}?before=${latest.nextCursor}`)).json(); assert.equal(older.items.length, 10); assert.equal(older.nextCursor, null);
    assert.deepEqual([...older.items, ...latest.items].map(item => item.sequence), Array.from({ length: 60 }, (_, i) => i + 1));
    assert.equal((await summary()).sessionUnreadMessages, 30); assert.equal((await summary()).unreadMessages, 0);
    assert.equal((await feed()).total, 1); assert.equal((await feed()).items[0].version, 30);
  });
  it('distingue notificação vista de mensagem lida e preserva avisos de versões mais novas', async () => {
    await send(input('Primeira')); const old = (await feed()).items[0]; await send(input('Segunda'));
    assert.equal((await request(`/social/notifications/${old.id}/read`, player, 'POST', { version: old.version })).status, 204);
    assert.equal((await summary()).unreadNotifications, 1); assert.equal((await summary()).sessionUnreadMessages, 2);
    assert.equal((await request(`/social/notifications/${old.id}/read`, outsider, 'POST', { version: 2 })).status, 404);
    await request(`${path()}/read`, player, 'POST', { sequence: 1 }); assert.equal((await summary()).unreadNotifications, 1); assert.equal((await summary()).sessionUnreadMessages, 1);
    const current = (await feed()).items[0]; await request(`/social/notifications/${current.id}/read`, player, 'POST', { version: current.version });
    assert.equal((await summary()).unreadNotifications, 0); assert.equal((await summary()).sessionUnreadMessages, 1);
    assert.equal((await request(`${path()}/read`, player, 'POST', { sequence: 999 })).status, 400);
    await send(input('Terceira')); await request(`${path()}/read`, player, 'POST', { sequence: 3 }); await request(`${path()}/read`, player, 'POST', { sequence: 1 });
    assert.equal((await summary()).unreadNotifications, 0); assert.equal((await summary()).sessionUnreadMessages, 0);
    assert.equal((await (await request(path())).json()).readSequence, 3);
  });
  it('revoga envio/leitura/avisos durante remoção concorrente e não avisa histórico no reingresso', async () => {
    await send(input('Antes da saída'));
    const responses = await Promise.all([send(input('Saindo'), player), request(`/campaigns/${campaign.id}/members/${player.user.id}`, gm, 'DELETE')]);
    assert.ok([201, 404].includes(responses[0].status)); assert.equal(responses[1].status, 204);
    for (const method of ['GET', 'POST']) assert.equal((await request(path(), player, method, method === 'POST' ? input('Depois') : undefined)).status, 404);
    assert.equal((await request(`${path()}/read`, player, 'POST', { sequence: 1 })).status, 404);
    assert.equal((await summary()).sessionUnreadMessages, 0); assert.equal((await feed()).total, 0);
    await send(input('Durante a saída'));
    const invitation = await (await request(`/campaigns/${campaign.id}/invitations`, gm, 'POST', { username: player.user.username })).json();
    assert.equal((await request(`/invitations/${invitation.id}/accept`, player, 'POST')).status, 200);
    assert.equal((await feed()).total, 0); assert.equal((await summary()).sessionUnreadMessages, 0);
    assert.ok((await (await request(path())).json()).items.length >= 2);
    await send(input('Depois do retorno')); assert.equal((await summary()).sessionUnreadMessages, 1); assert.equal((await feed()).total, 1);
  });
  it('fecha envio ao encerrar/cancelar sessão ou campanha, mantendo histórico e replay autorizado', async () => {
    const value = input('Preparativos'); const sent = await (await send(value)).json();
    const started = await (await request(`/sessions/${session.id}/start`, gm, 'POST', { expectedRevision: session.revision })).json();
    await request(`/sessions/${session.id}/end`, gm, 'POST', { expectedRevision: started.revision });
    assert.equal((await send(input('Tarde'))).status, 409); assert.equal((await (await request(path())).json()).canSend, false);
    assert.equal((await (await send(value)).json()).id, sent.id);
    assert.equal((await (await request(path())).json()).items.length, 1);
    session = await prisma.gameSession.create({ data: { campaignId: campaign.id, title: 'Cancelada', scheduledAt: new Date(), timeZone: 'UTC' } });
    assert.equal((await request(`/sessions/${session.id}/cancel`, gm, 'POST', { expectedRevision: 1 })).status, 200); assert.equal((await send(input('Cancelada'))).status, 409);
    session = await prisma.gameSession.create({ data: { campaignId: campaign.id, title: 'Campanha encerrada', scheduledAt: new Date(), timeZone: 'UTC' } });
    await send(input('Antes do fim da campanha')); await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'ENDED' } });
    assert.equal((await send(input('Campanha fechada'))).status, 409); assert.equal((await (await request(path())).json()).items.length, 1);
    await request(`/campaigns/${campaign.id}/members/${player.user.id}`, gm, 'DELETE'); assert.equal((await request(path())).status, 404);
  });
  it('pagina feed misto de amizades e sessões e só notifica membros atuais', async () => {
    const [lowId, highId] = [gm.user.id, player.user.id].sort();
    await prisma.friendship.create({ data: { lowId, highId, initiatorId: gm.user.id } });
    for (let i = 0; i < 31; i++) {
      const target = await prisma.gameSession.create({ data: { campaignId: campaign.id, title: `Chat ${i}`, scheduledAt: new Date(), timeZone: 'UTC' } });
      await chat.send(gm.user.id, target.id, input('Aviso'));
    }
    const first = await feed(), second = await feed(2); assert.equal(first.total, 32); assert.equal(first.items.length, 30); assert.equal(second.items.length, 2);
    assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 32);
    assert.equal([...first.items, ...second.items].filter(item => item.kind === 'SESSION_MESSAGE').length, 31);
    assert.ok(!JSON.stringify(first).includes(gm.user.email)); assert.equal((await (await request('/social/notifications', outsider)).json()).total, 0);
  });
  it('limita envios HTTP a 30 por minuto sem gravar a tentativa bloqueada', async () => {
    for (let i = 0; i < 30; i++) assert.equal((await send(input(`Mensagem ${i}`))).status, 201);
    assert.equal((await send(input('Bloqueada'))).status, 429); assert.equal(await prisma.sessionMessage.count({ where: { sessionId: session.id } }), 30);
  });
});
