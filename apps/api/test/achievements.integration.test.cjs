const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { unlink } = require('node:fs/promises');
const { resolve } = require('node:path');
const { readFile } = require('node:fs/promises');
const { Pool } = require('pg');
const sharp = require('sharp');
const { ConfigService } = require('@nestjs/config');
process.env.NODE_ENV = 'test';
const { createApplication } = require('../dist/bootstrap');
const { PrismaService } = require('../dist/database/prisma.service');
const { grantAchievement } = require('../dist/modules/users/achievements');

describe('Conquistas e cosméticos com PostgreSQL real', { concurrency: false }, () => {
  let app, prisma, base;
  const users = [], avatars = [];
  const definition = { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [6] };
  async function request(path, actor, method = 'GET', data) {
    return fetch(`${base}${path}`, { method, headers: { Origin: 'http://localhost:3000', ...(actor ? { Authorization: `Bearer ${actor.accessToken}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  }
  async function json(path, actor, method, data, status = 201) { const response = await request(path, actor, method, data); assert.equal(response.status, status, await response.clone().text()); return response.json(); }
  async function register() { const username = `cos_${randomUUID().replaceAll('-', '').slice(0, 10)}`; const account = await json('/auth/register', null, 'POST', { username, email: `${username}@example.test`, displayName: 'Aventureira', password: 'Uma-senha-de-teste-123!' }); users.push(account.user.id); return account; }
  async function campaign(actor) { const system = await json('/systems', actor, 'POST', { name: 'Regras das conquistas', description: '', visibility: 'PRIVATE', definition }); return json('/campaigns', actor, 'POST', { name: 'Mesa privada', description: '', visibility: 'PRIVATE', status: 'PLANNED', maxPlayers: 1, systemVersionId: system.versionId }); }
  const patch = (actor, data) => json('/users/me', actor, 'PATCH', data, 200);
  async function avatar(actor) { const form = new FormData(); form.append('file', new Blob([await sharp({ create: { width: 32, height: 32, channels: 4, background: '#7653eb' } }).png().toBuffer()], { type: 'image/png' }), 'avatar.png'); const response = await fetch(`${base}/users/me/avatar`, { method: 'POST', headers: { Origin: 'http://localhost:3000', Authorization: `Bearer ${actor.accessToken}` }, body: form }); assert.equal(response.status, 201); const result = await response.json(); avatars.push(result.avatarUrl.split('/').pop()); }
  before(async () => { app = await createApplication(false); const target = new URL(app.get(ConfigService).get('DATABASE_URL')); assert.ok(['localhost', '127.0.0.1'].includes(target.hostname)); assert.equal(target.pathname, '/paralax'); await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`; prisma = app.get(PrismaService); });
  after(async () => { await prisma?.user.deleteMany({ where: { id: { in: users } } }); await app?.close(); for (const key of avatars) await unlink(resolve('../../var/uploads/avatars', key)).catch(error => { if (error.code !== 'ENOENT') throw error; }); });

  it('conta nova mantém aparência padrão e catálogo privado; não aceita concessão pelo cliente', async () => {
    const actor = await register(); assert.equal(actor.user.background, null); assert.equal(actor.user.avatarFrame, null);
    const response = await request('/users/me/achievements', actor); assert.equal(response.headers.get('cache-control'), 'no-store'); const achievements = await response.json(); assert.equal(achievements.items.length, 4); assert.ok(achievements.items.every(item => item.progress === 0 && item.target === 1 && item.earnedAt === null));
    const collection = await json('/users/me/cosmetics', actor, 'GET', undefined, 200); assert.equal(collection.items.length, 4); assert.ok(collection.items.every(item => !item.unlocked));
    for (const route of ['/users/me/achievements', '/users/me/cosmetics']) assert.equal((await request(route)).status, 401);
    for (const data of [{ earnedAt: new Date().toISOString() }, { achievementId: 'first-roll' }, { userId: actor.user.id, backgroundId: null }, { backgroundId: 'https://example.test/fake.webp' }]) assert.equal((await request('/users/me', actor, 'PATCH', data)).status, 400);
    assert.equal((await request('/users/me/achievements', actor, 'POST', { achievementId: 'identity' })).status, 404);
  });
  it('ações reais concedem todos os marcos com recompensa na mesma transação; replay é único', async () => {
    const actor = await register(); const mesa = await campaign(actor);
    await json(`/campaigns/${mesa.id}/characters`, actor, 'POST', { name: 'Lia', description: '', story: '', level: null });
    const scheduled = await json(`/campaigns/${mesa.id}/sessions`, actor, 'POST', { title: 'Primeiros dados', description: '', scheduledAt: '2027-01-10T21:00:00Z', timeZone: 'America/Fortaleza', visibility: 'PRIVATE' });
    const input = { requestId: randomUUID(), count: 1, sides: 6, modifier: 0 };
    assert.equal((await request(`/sessions/${scheduled.id}/rolls`, actor, 'POST', input)).status, 409);
    assert.equal(await prisma.userAchievement.count({ where: { userId: actor.user.id, achievementId: 'first-roll' } }), 0);
    await json(`/sessions/${scheduled.id}/start`, actor, 'POST', { expectedRevision: scheduled.revision }, 200);
    const rolls = await Promise.all(Array.from({ length: 3 }, () => json(`/sessions/${scheduled.id}/rolls`, actor, 'POST', input)));
    assert.ok(rolls.every(roll => roll.id === rolls[0].id)); await patch(actor, { bio: 'Uma história para contar.' }); await avatar(actor);
    const result = await json('/users/me/achievements', actor, 'GET', undefined, 200); assert.ok(result.items.every(item => item.progress === 1 && item.earnedAt));
    assert.equal(await prisma.userAchievement.count({ where: { userId: actor.user.id } }), 4); assert.equal(await prisma.userCosmetic.count({ where: { userId: actor.user.id } }), 4);
  });
  it('avatar antes da biografia também libera identidade; remover a biografia não retira o item', async () => {
    const actor = await register(); await avatar(actor); assert.equal(await prisma.userAchievement.count({ where: { userId: actor.user.id } }), 0);
    await patch(actor, { bio: 'Olá, mundo.' }); const original = await prisma.userAchievement.findUnique({ where: { userId_achievementId: { userId: actor.user.id, achievementId: 'identity' } } });
    await patch(actor, { avatarFrameId: 'violet-portal' }); await patch(actor, { bio: '' });
    const repeated = await prisma.userAchievement.findUnique({ where: { userId_achievementId: { userId: actor.user.id, achievementId: 'identity' } } }); assert.deepEqual(repeated, original);
    assert.equal((await json('/users/me', actor, 'GET', undefined, 200)).avatarFrame.id, 'violet-portal');
  });
  it('itens bloqueados, de outra conta e da categoria errada são rejeitados sem alterar perfil', async () => {
    const owner = await register(), other = await register(); await campaign(owner);
    for (const data of [{ backgroundId: 'floating-citadel' }, { avatarFrameId: 'dice-path' }, { avatarFrameId: 'floating-citadel' }, { backgroundId: 'missing' }]) assert.equal((await request('/users/me', other, 'PATCH', data)).status, 400);
    assert.equal((await request('/users/me', owner, 'PATCH', { avatarFrameId: 'floating-citadel' })).status, 400);
    assert.equal((await json('/users/me', other, 'GET', undefined, 200)).background, null);
    await assert.rejects(prisma.profile.update({ where: { userId: other.user.id }, data: { backgroundId: 'floating-citadel' } }));
    await assert.rejects(prisma.profile.update({ where: { userId: owner.user.id }, data: { avatarFrameId: 'floating-citadel' } }));
  });
  it('seleções independentes persistem; público recebe só aparência, sem progresso ou provas privadas', async () => {
    const actor = await register(); await campaign(actor); await patch(actor, { bio: 'Perfil do viajante' }); await avatar(actor);
    await patch(actor, { backgroundId: 'floating-citadel', avatarFrameId: 'violet-portal' });
    const edited = await patch(actor, { bio: 'Nova biografia' }); assert.equal(edited.background.id, 'floating-citadel'); assert.equal(edited.avatarFrame.id, 'violet-portal');
    const publicUser = await json(`/users/${actor.user.username}`, null, 'GET', undefined, 200); assert.equal(publicUser.background.id, 'floating-citadel'); assert.equal(publicUser.avatarFrame.id, 'violet-portal');
    for (const forbidden of ['email','achievements','earnedAt','cosmetics','campaignId','progress','events']) assert.ok(!Object.hasOwn(publicUser, forbidden));
    const cleared = await patch(actor, { backgroundId: null }); assert.equal(cleared.background, null); assert.equal(cleared.avatarFrame.id, 'violet-portal');
    assert.equal((await patch(actor, { avatarFrameId: null })).avatarFrame, null);
    assert.equal(await prisma.userCosmetic.count({ where: { userId: actor.user.id } }), 2);
  });
  it('concessão concorrente é única; rollback não deixa prêmio; exclusão cascata com itens equipados funciona', async () => {
    const actor = await register(); const mesa = await campaign(actor);
    await Promise.all(Array.from({ length: 3 }, () => json(`/campaigns/${mesa.id}/characters`, actor, 'POST', { name: 'Outro herói', description: '', story: '', level: null })));
    assert.equal(await prisma.userAchievement.count({ where: { userId: actor.user.id, achievementId: 'first-character' } }), 1);
    assert.equal(await prisma.userCosmetic.count({ where: { userId: actor.user.id, cosmeticId: 'forest-refuge' } }), 1);
    await assert.rejects(prisma.$transaction(async db => { await grantAchievement(db, actor.user.id, 'first-roll'); throw new Error('Cancelado'); }));
    assert.equal(await prisma.userAchievement.count({ where: { userId: actor.user.id, achievementId: 'first-roll' } }), 0);
    assert.equal(await prisma.userCosmetic.count({ where: { userId: actor.user.id, cosmeticId: 'dice-path' } }), 0);
    await patch(actor, { backgroundId: 'forest-refuge' }); await prisma.campaign.delete({ where: { id: mesa.id } });
    assert.equal((await json('/users/me', actor, 'GET', undefined, 200)).background.id, 'forest-refuge');
    await prisma.user.delete({ where: { id: actor.user.id } }); assert.equal(await prisma.userCosmetic.count({ where: { userId: actor.user.id } }), 0);
  });
  it('migration real preserva padrão e concede retroatividade apenas a fatos existentes', async () => {
    const pool = new Pool({ connectionString: app.get(ConfigService).get('DATABASE_URL'), max: 1 }); const client = await pool.connect();
    const schema = `verify_cosmetics_${randomUUID().replaceAll('-', '')}`;
    try {
      await client.query('BEGIN'); await client.query(`CREATE SCHEMA "${schema}"; SET LOCAL search_path TO "${schema}"`);
      await client.query(`CREATE TABLE "User" (id TEXT PRIMARY KEY);
        CREATE TABLE "Profile" ("userId" TEXT PRIMARY KEY, bio TEXT, "avatarKey" TEXT);
        CREATE TABLE "Character" ("ownerId" TEXT, "createdAt" TIMESTAMP(3));
        CREATE TABLE "Campaign" ("ownerId" TEXT, "createdAt" TIMESTAMP(3));
        CREATE TABLE "DiceRoll" ("actorId" TEXT, "createdAt" TIMESTAMP(3));
        INSERT INTO "User" VALUES ('veteran'), ('newcomer');
        INSERT INTO "Profile" VALUES ('veteran','Minha história','old-avatar.webp'), ('newcomer','','other.webp');
        INSERT INTO "Character" VALUES ('veteran','2026-01-02'), ('veteran','2026-02-02');
        INSERT INTO "Campaign" VALUES ('veteran','2026-01-03');
        INSERT INTO "DiceRoll" VALUES ('veteran','2026-01-04'), ('deleted-account','2026-01-05')`);
      await client.query(await readFile(resolve('prisma/migrations/20261008030000_achievement_cosmetics/migration.sql'), 'utf8'));
      assert.equal((await client.query('SELECT * FROM "UserAchievement"')).rowCount, 4);
      assert.equal((await client.query('SELECT * FROM "UserCosmetic"')).rowCount, 4);
      assert.equal((await client.query('SELECT * FROM "UserAchievement" WHERE "userId"=$1', ['newcomer'])).rowCount, 0);
      assert.equal((await client.query(`SELECT to_char("earnedAt", 'YYYY-MM-DD HH24:MI:SS') AS earned FROM "UserAchievement" WHERE "achievementId"=$1`, ['first-character'])).rows[0].earned, '2026-01-02 00:00:00');
      const profiles = (await client.query('SELECT "backgroundId", "avatarFrameId" FROM "Profile"')).rows; assert.ok(profiles.every(row => row.backgroundId === null && row.avatarFrameId === null));
    } finally { await client.query('ROLLBACK'); client.release(); await pool.end(); }
  });
  it('liberação permanente fica na conta, não altera conquistas e não pode ser ativada por HTTP', async () => {
    const actor = await register(), other = await register();
    assert.equal((await request('/users/me', actor, 'PATCH', { allCosmeticsUnlocked: true })).status, 400);
    await prisma.profile.update({ where: { userId: actor.user.id }, data: { allCosmeticsUnlocked: true } });
    // PATCH also grants a newly catalogued item without requiring a collection visit first.
    assert.equal((await patch(actor, { backgroundId: 'floating-citadel', avatarFrameId: 'dice-path' })).background.id, 'floating-citadel');
    let collection = await json('/users/me/cosmetics', actor, 'GET', undefined, 200); assert.ok(collection.items.every(item => item.unlocked));
    const original = await prisma.userCosmetic.findMany({ where: { userId: actor.user.id }, orderBy: { cosmeticId: 'asc' } });
    await json('/users/me/cosmetics', actor, 'GET', undefined, 200); assert.deepEqual(await prisma.userCosmetic.findMany({ where: { userId: actor.user.id }, orderBy: { cosmeticId: 'asc' } }), original);
    await patch(actor, { backgroundId: null, avatarFrameId: null });
    await prisma.userCosmetic.delete({ where: { userId_cosmeticId: { userId: actor.user.id, cosmeticId: 'forest-refuge' } } });
    collection = await json('/users/me/cosmetics', actor, 'GET', undefined, 200); assert.ok(collection.items.every(item => item.unlocked));
    assert.ok((await json('/users/me/achievements', actor, 'GET', undefined, 200)).items.every(item => item.earnedAt === null));
    assert.ok((await json('/users/me/cosmetics', other, 'GET', undefined, 200)).items.every(item => !item.unlocked));
    const publicUser = await json(`/users/${actor.user.username}`, null, 'GET', undefined, 200); assert.equal(publicUser.allCosmeticsUnlocked, undefined);
    assert.equal((await request('/users/me', other, 'PATCH', { avatarFrameId: 'dice-path' })).status, 400);
    await prisma.user.update({ where: { id: actor.user.id }, data: { username: `${actor.user.username}_x` } });
    assert.ok((await json('/users/me/cosmetics', actor, 'GET', undefined, 200)).items.every(item => item.unlocked));
  });
});
