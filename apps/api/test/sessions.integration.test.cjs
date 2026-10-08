const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { sessionInstant, sessionLocalTime } = require('@paralax/contracts');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');

describe('Sessões: agenda, ciclo de vida, acesso e concorrência com PostgreSQL real', { concurrency: false }, () => {
  let app, prisma, base, gm, player, outsider, system, campaign, session;
  const ids = [], suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  const settings = { title: `Encontro ${suffix}`, description: 'A pauta privada desta sessão.', scheduledAt: '2027-01-10T18:00:00-03:00', timeZone: 'America/Fortaleza', visibility: 'PRIVATE' };
  async function request(path, account, method = 'GET', body) {
    return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(account ? { Authorization: `Bearer ${account.accessToken}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  }
  async function startApp() { app = await createApplication(false); const url = new URL(app.get(ConfigService).get('DATABASE_URL')); assert.ok(['localhost', '127.0.0.1'].includes(url.hostname)); assert.equal(url.pathname, '/paralax'); await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService); }
  async function register(label) { const r = await request('/auth/register', null, 'POST', { username: `${label}_${suffix}`, email: `${label}_${suffix}@example.test`, displayName: label, password: 'Uma-senha-de-teste-123!' }); assert.equal(r.status, 201); const s = await r.json(); ids.push(s.user.id); return s; }
  async function newCampaign() { const r = await request('/campaigns', gm, 'POST', { name: `Mesa ${suffix}`, description: '', status: 'PLANNED', visibility: 'PRIVATE', maxPlayers: 2, systemVersionId: system.versionId }); assert.equal(r.status, 201); return r.json(); }
  async function configure(patch, target = campaign) { const r = await request(`/campaigns/${target.id}`, gm, 'PUT', { name: target.name, description: target.description, status: target.status, visibility: target.visibility, maxPlayers: target.maxPlayers, expectedRevision: target.revision, ...patch }); assert.equal(r.status, 200); const c = await r.json(); if (target.id === campaign.id) campaign = c; return c; }
  async function join() { const sent = await request(`/campaigns/${campaign.id}/invitations`, gm, 'POST', { username: player.user.username }); assert.equal(sent.status, 201); const i = await sent.json(); assert.equal((await request(`/invitations/${i.id}/accept`, player, 'POST')).status, 200); }
  async function create(input = settings, target = campaign) { const r = await request(`/campaigns/${target.id}/sessions`, gm, 'POST', input); assert.equal(r.status, 201); return r.json(); }
  const edit = (s, patch = {}) => ({ title: s.title, description: s.description, scheduledAt: s.scheduledAt, timeZone: s.timeZone, visibility: s.visibility, expectedRevision: s.revision, ...patch });
  const action = (s, verb, account = gm, body = { expectedRevision: s.revision }) => request(`/sessions/${s.id}/${verb}`, account, 'POST', body);
  before(async () => { await startApp(); gm = await register('sess_gm'); player = await register('sess_p'); outsider = await register('sess_x');
    const r = await request('/systems', gm, 'POST', { name: 'Regras privadas', description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [20] } }); assert.equal(r.status, 201); system = await r.json(); campaign = await newCampaign(); await join(); });
  after(async () => { if (prisma) await prisma.user.deleteMany({ where: { id: { in: ids } } }); await app?.close(); });

  it('converte agenda sem fuso implícito e rejeita horários inexistentes ou ambíguos de DST', () => {
    assert.equal(sessionInstant('2027-01-10T18:00', 'America/Fortaleza'), '2027-01-10T21:00:00.000Z');
    assert.equal(sessionLocalTime('2027-01-10T21:00:00Z', 'America/Fortaleza'), '2027-01-10T18:00');
    assert.equal(sessionInstant('2027-01-10T18:00', 'Asia/Kolkata'), '2027-01-10T12:30:00.000Z');
    assert.throws(() => sessionInstant('2026-03-08T02:30', 'America/New_York'), /não existe/);
    assert.throws(() => sessionInstant('2026-11-01T01:30', 'America/New_York'), /duas vezes/);
    assert.throws(() => sessionInstant('2026-02-30T18:00', 'UTC'), /válidos/);
    assert.throws(() => sessionInstant('2026-02-10T18:00', 'Invalid/Zone'), /válido/);
  });
  it('agenda com mestre derivado da campanha, UTC/fuso, estado inicial e histórico transacional', async () => {
    session = await create(); assert.equal(session.status, 'SCHEDULED'); assert.equal(session.canManage, true); assert.equal(session.owner.id, gm.user.id);
    assert.equal(session.scheduledAt, '2027-01-10T21:00:00.000Z'); assert.equal(session.timeZone, 'America/Fortaleza'); assert.equal(session.startedAt, null); assert.equal(session.durationSeconds, null);
    const changes = await prisma.gameSessionChange.findMany({ where: { sessionId: session.id } }); assert.equal(changes.length, 1); assert.equal(changes[0].actorId, gm.user.id); assert.equal(changes[0].snapshot.status, 'SCHEDULED');
    await app.close(); await startApp(); assert.equal((await (await request(`/sessions/${session.id}`, player)).json()).scheduledAt, session.scheduledAt);
  });
  it('jogador ativo consulta sem administrar; pendente, removido e terceiro não recebem agenda privada', async () => {
    const read = await request(`/sessions/${session.id}`, player); assert.equal(read.status, 200); assert.equal(read.headers.get('cache-control'), 'no-store'); assert.equal((await read.json()).canManage, false);
    for (const account of [null, outsider]) assert.equal((await request(`/sessions/${session.id}`, account)).status, account ? 404 : 401);
    for (const account of [player, outsider]) {
      assert.equal((await request(`/campaigns/${campaign.id}/sessions`, account, 'POST', settings)).status, 404);
      assert.equal((await request(`/sessions/${session.id}`, account, 'PUT', edit(session))).status, 404);
      for (const verb of ['start', 'end', 'cancel']) assert.equal((await action(session, verb, account)).status, 404);
    }
    const sent = await request(`/campaigns/${campaign.id}/invitations`, gm, 'POST', { username: outsider.user.username }); assert.equal(sent.status, 201); assert.equal((await request(`/campaigns/${campaign.id}/sessions`, outsider)).status, 404);
    await configure({ visibility: 'PUBLIC' }); assert.equal((await request(`/sessions/${session.id}`, outsider)).status, 404); assert.equal((await request(`/sessions/public/${session.id}`, null)).status, 404);
    const list = await (await request('/sessions/mine', player)).json(); assert.equal(list.total, 1); assert.ok(!JSON.stringify(list).includes(gm.user.email)); assert.equal(list.items[0].system.definition, undefined);
  });
  it('rejeita estados/timestamps/autoria extras, datas sem offset, fusos inválidos e payloads parciais sem gravação', async () => {
    const count = await prisma.gameSession.count({ where: { campaignId: campaign.id } });
    for (const patch of [{ ownerId: player.user.id }, { campaignId: randomUUID() }, { status: 'LIVE' }, { startedAt: settings.scheduledAt }, { durationSeconds: 999 }, { title: 'x' }, { timeZone: 'Invalid/Zone' }, { scheduledAt: '2027-01-10T18:00' }, { scheduledAt: '2027-02-30T18:00:00Z' }, { scheduledAt: '2102-01-10T18:00:00Z' }]) assert.equal((await request(`/campaigns/${campaign.id}/sessions`, gm, 'POST', { ...settings, ...patch })).status, 400);
    assert.equal(await prisma.gameSession.count({ where: { campaignId: campaign.id } }), count);
    assert.equal((await action(session, 'start', gm, {})).status, 400); assert.equal((await action(session, 'start', gm, { expectedRevision: 1, startedAt: '2020-01-01T00:00:00Z' })).status, 400);
    assert.equal((await request('/sessions/mine?filter=LIVE', gm)).status, 400); assert.equal((await request('/sessions/public?page=10001', null)).status, 400);
  });
  it('preserva edição vencedora, inicia/encerra com horário do servidor e repete comandos sem duplicar histórico', async () => {
    const edits = await Promise.all([request(`/sessions/${session.id}`, gm, 'PUT', edit(session, { title: 'Uma edição' })), request(`/sessions/${session.id}`, gm, 'PUT', edit(session, { title: 'Outra edição' }))]); assert.deepEqual(edits.map(r => r.status).sort(), [200, 409]); assert.equal((await edits.find(r => r.status === 409).json()).error.code, 'SESSION_REVISION_CONFLICT'); session = await edits.find(r => r.status === 200).json();
    assert.equal((await action(session, 'end')).status, 409);
    const stale = await action(session, 'start', gm, { expectedRevision: 1 }); assert.equal(stale.status, 409);
    const starts = await Promise.all([action(session, 'start'), action(session, 'start')]); assert.deepEqual(starts.map(r => r.status), [200, 200]); const first = await starts[0].json(), retry = await starts[1].json(); assert.deepEqual(first, retry); session = first;
    assert.equal(session.status, 'LIVE'); assert.notEqual(session.startedAt, session.scheduledAt);
    assert.equal((await request(`/sessions/${session.id}`, gm, 'PUT', edit(session))).status, 409);
    // Local timestamp fixture makes elapsed duration observable without a 65-second wait.
    await prisma.gameSession.update({ where: { id: session.id }, data: { startedAt: new Date(Date.now() - 65000) } });
    const ended = await action(session, 'end'); assert.equal(ended.status, 200); const saved = await ended.json(); assert.equal(saved.status, 'ENDED'); assert.ok(saved.durationSeconds >= 65 && saved.durationSeconds < 70);
    assert.deepEqual(await (await action(session, 'end')).json(), saved); session = saved;
    assert.equal((await action(session, 'start')).status, 409); assert.equal((await action(session, 'cancel')).status, 409);
    assert.equal(await prisma.gameSessionChange.count({ where: { sessionId: session.id } }), session.revision);
    const cancelled = await create({ ...settings, title: 'Uma agenda cancelada' }); const r = await action(cancelled, 'cancel'); assert.equal(r.status, 200); const c = await r.json(); assert.equal(c.status, 'CANCELLED'); assert.ok(c.cancelledAt); assert.equal((await action(c, 'start')).status, 409); assert.deepEqual(await (await action(cancelled, 'cancel')).json(), c);
  });
  it('duas agendas disputam o único lugar ao vivo; índice e trava protegem início contra fechamento da campanha', async () => {
    const a = await create({ ...settings, title: 'Agenda A' }), b = await create({ ...settings, title: 'Agenda B' });
    const results = await Promise.all([action(a, 'start'), action(b, 'start')]); assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); assert.equal((await results.find(r => r.status === 409).json()).error.code, 'SESSION_ALREADY_LIVE'); const live = await results.find(r => r.status === 200).json();
    await assert.rejects(prisma.gameSession.create({ data: { ...settings, scheduledAt: new Date(settings.scheduledAt), campaignId: campaign.id, status: 'LIVE', startedAt: new Date() } }));
    const close = await request(`/campaigns/${campaign.id}`, gm, 'PUT', { name: campaign.name, description: '', visibility: campaign.visibility, status: 'ENDED', maxPlayers: 2, expectedRevision: campaign.revision }); assert.equal(close.status, 409); assert.equal((await close.json()).error.code, 'CAMPAIGN_LIVE_SESSION');
    assert.equal((await action(live, 'end')).status, 200);
    const race = await create({ ...settings, title: 'Agenda versus fechamento' });
    const concurrent = await Promise.all([action(race, 'start'), request(`/campaigns/${campaign.id}`, gm, 'PUT', { name: campaign.name, description: '', visibility: campaign.visibility, status: 'ENDED', maxPlayers: 2, expectedRevision: campaign.revision })]); assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
    if (concurrent[0].status === 200) assert.equal((await action(await concurrent[0].json(), 'end')).status, 200); else { campaign = await concurrent[1].json(); assert.equal((await request(`/campaigns/${campaign.id}/sessions`, gm, 'POST', settings)).status, 409); }
    campaign = await (await request(`/campaigns/mine/${campaign.id}`, gm)).json(); await configure({ status: 'PLANNED' });
  });
  it('publica só metadados de sessão ao vivo elegível; privatizar campanha e encerrar revogam descoberta', async () => {
    await configure({ visibility: 'PRIVATE' }); assert.equal((await request(`/campaigns/${campaign.id}/sessions`, gm, 'POST', { ...settings, visibility: 'PUBLIC' })).status, 409);
    await configure({ visibility: 'PUBLIC' }); let published = await create({ ...settings, title: `Público ${suffix}`, visibility: 'PUBLIC' }); assert.equal((await request(`/sessions/public/${published.id}`, null)).status, 404);
    await configure({ visibility: 'PRIVATE' }); assert.equal((await action(published, 'start')).status, 409); await configure({ visibility: 'PUBLIC' }); published = await (await action(published, 'start')).json();
    const r = await request(`/sessions/public/${published.id}`, null); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store'); const dto = await r.json();
    assert.deepEqual(Object.keys(dto).sort(), ['id', 'title', 'description', 'scheduledAt', 'timeZone', 'campaign', 'owner', 'system', 'status', 'startedAt'].sort()); assert.ok(!JSON.stringify(dto).includes(gm.user.email)); assert.equal(dto.system.definition, undefined);
    assert.equal((await (await request(`/sessions/public?search=${suffix}`, null)).json()).total, 1);
    await configure({ visibility: 'PRIVATE' }); assert.equal((await request(`/sessions/public/${published.id}`, null)).status, 404); assert.equal((await (await request(`/sessions/public?search=${suffix}`, null)).json()).total, 0);
    await configure({ visibility: 'PUBLIC' }); assert.equal((await action(published, 'end')).status, 200); assert.equal((await request(`/sessions/public/${published.id}`, null)).status, 404);
  });
  it('remoção revoga agenda/histórico privados e reingresso recupera leitura sem poderes administrativos', async () => {
    assert.equal((await request(`/campaigns/${campaign.id}/members/${player.user.id}`, gm, 'DELETE')).status, 204);
    assert.equal((await request(`/sessions/${session.id}`, player)).status, 404); assert.equal((await request(`/campaigns/${campaign.id}/sessions`, player)).status, 404); assert.equal((await (await request('/sessions/mine', player)).json()).total, 0);
    assert.equal((await request(`/sessions/${session.id}`, gm)).status, 200); await join(); const r = await request(`/sessions/${session.id}`, player); assert.equal(r.status, 200); assert.equal((await r.json()).canManage, false);
  });
  it('limita 100 agendadas sob concorrência e pagina/filtra agenda sem expor campanhas alheias', async () => {
    const c = await newCampaign();
    await prisma.gameSession.createMany({ data: Array.from({ length: 99 }, (_, n) => ({ ...settings, scheduledAt: new Date(settings.scheduledAt), campaignId: c.id, title: `Quota ${n}` })) });
    const results = await Promise.all([request(`/campaigns/${c.id}/sessions`, gm, 'POST', settings), request(`/campaigns/${c.id}/sessions`, gm, 'POST', settings)]); assert.deepEqual(results.map(r => r.status).sort(), [201, 409]); assert.equal((await results.find(r => r.status === 409).json()).error.code, 'SESSION_LIMIT');
    const first = await prisma.gameSession.findFirst({ where: { campaignId: c.id } }); assert.equal((await action(first, 'cancel')).status, 200); await create(settings, c);
    const c2 = await newCampaign(); for (let n = 0; n < 21; n++) await create({ ...settings, title: `Arquivo ${suffix} ${n}` }, c2);
    const a = await (await request(`/sessions/mine?search=Arquivo%20${suffix}`, gm)).json(), b = await (await request(`/sessions/mine?search=Arquivo%20${suffix}&page=2`, gm)).json(); assert.equal(a.total, 21); assert.equal(a.items.length, 20); assert.equal(b.items.length, 1);
    assert.equal((await (await request(`/sessions/mine?search=Arquivo%20${suffix}`, player)).json()).total, 0);
    const scheduled = a.items[0]; await action(scheduled, 'cancel'); assert.equal((await (await request(`/sessions/mine?search=Arquivo%20${suffix}&filter=UPCOMING`, gm)).json()).total, 20);
  });
});
