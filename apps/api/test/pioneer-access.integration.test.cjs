const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { config } = require('dotenv');
const { Pool } = require('pg');
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/paralax') throw new Error('Test requires local paralax database.');

test('dez pioneiros: retroatividade, concorrência, rollback, exclusão sem reposição e propriedade permanente', async () => {
  const schema = `verify_pioneer_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: url.href, max: 1 });
  const pool = new Pool({ connectionString: url.href, max: 16, options: `-c search_path=${schema}` });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(`CREATE TABLE "User" (id TEXT PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE "Profile" ("userId" TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE, "allCosmeticsUnlocked" BOOLEAN NOT NULL DEFAULT false, "backgroundId" TEXT, "avatarFrameId" TEXT);
      CREATE TABLE "UserCosmetic" ("userId" TEXT REFERENCES "User"(id) ON DELETE CASCADE,"cosmeticId" TEXT,"earnedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY ("userId","cosmeticId"));
      INSERT INTO "User" VALUES ('existing-c','2026-03-03'),('existing-a','2026-01-01'),('existing-b','2026-02-02');
      INSERT INTO "Profile" VALUES ('existing-a',false,'forest-refuge','violet-portal'),('existing-b',false,null,null),('existing-c',false,null,null);
      INSERT INTO "UserCosmetic" VALUES ('existing-a','forest-refuge','2026-01-02');`);
    await pool.query(await readFile(resolve(__dirname, '../prisma/migrations/20261008060000_pioneer_access/migration.sql'), 'utf8'));
    assert.deepEqual((await pool.query('SELECT "userId" FROM "PioneerAccessSlot" WHERE "userId" IS NOT NULL ORDER BY "slot"')).rows.map(row => row.userId), ['existing-a','existing-b','existing-c']);
    assert.equal((await pool.query('SELECT * FROM "Profile" WHERE "allCosmeticsUnlocked"=true')).rowCount, 3);
    assert.equal((await pool.query('SELECT * FROM "UserCosmetic" WHERE "userId"=$1', ['existing-a'])).rowCount, 8);
    assert.equal((await pool.query(`SELECT to_char("earnedAt",'YYYY-MM-DD') AS day FROM "UserCosmetic" WHERE "userId"='existing-a' AND "cosmeticId"='forest-refuge'`)).rows[0].day, '2026-01-02');
    assert.deepEqual((await pool.query('SELECT "backgroundId","avatarFrameId" FROM "Profile" WHERE "userId"=$1', ['existing-a'])).rows[0], { backgroundId: 'forest-refuge', avatarFrameId: 'violet-portal' });
    const rolledBack = await pool.connect();
    try {
      await rolledBack.query('BEGIN'); await rolledBack.query('INSERT INTO "User" (id) VALUES ($1)', ['rolled-back']);
      assert.equal((await rolledBack.query('SELECT * FROM "PioneerAccessSlot" WHERE "grantedAt" IS NOT NULL')).rowCount, 4);
      await rolledBack.query('ROLLBACK');
    } finally { rolledBack.release(); }
    assert.equal((await pool.query('SELECT * FROM "PioneerAccessSlot" WHERE "grantedAt" IS NOT NULL')).rowCount, 3);
    const results = await Promise.all(Array.from({ length: 16 }, async (_, index) => {
      const db = await pool.connect(), id = `concurrent-${index}`;
      try {
        await db.query('BEGIN'); await db.query('INSERT INTO "User" (id) VALUES ($1)', [id]);
        const profile = (await db.query('INSERT INTO "Profile" ("userId") VALUES ($1) RETURNING "allCosmeticsUnlocked"', [id])).rows[0];
        await db.query('COMMIT'); return profile.allCosmeticsUnlocked;
      } catch (error) { await db.query('ROLLBACK'); throw error; }
      finally { db.release(); }
    }));
    assert.equal(results.filter(Boolean).length, 7);
    assert.equal((await pool.query('SELECT * FROM "PioneerAccessSlot" WHERE "grantedAt" IS NOT NULL')).rowCount, 10);
    assert.equal((await pool.query('SELECT * FROM "Profile" WHERE "allCosmeticsUnlocked"=true')).rowCount, 10);
    const winners = (await pool.query('SELECT "slot","userId","grantedAt" FROM "PioneerAccessSlot" ORDER BY "slot"')).rows;
    await pool.query('DELETE FROM "User" WHERE id=$1', ['existing-a']);
    await pool.query('INSERT INTO "User" (id) VALUES ($1)', ['replacement']);
    assert.equal((await pool.query('INSERT INTO "Profile" ("userId") VALUES ($1) RETURNING "allCosmeticsUnlocked"', ['replacement'])).rows[0].allCosmeticsUnlocked, false);
    const after = (await pool.query('SELECT "slot","userId","grantedAt" FROM "PioneerAccessSlot" ORDER BY "slot"')).rows;
    assert.equal(after[0].userId, null); assert.deepEqual(after[0].grantedAt, winners[0].grantedAt); assert.deepEqual(after.slice(1), winners.slice(1));
    await pool.query('DELETE FROM "Profile" WHERE "userId"=$1', ['existing-b']);
    assert.equal((await pool.query('INSERT INTO "Profile" ("userId") VALUES ($1) RETURNING "allCosmeticsUnlocked"', ['existing-b'])).rows[0].allCosmeticsUnlocked, true);
    await assert.rejects(pool.query('INSERT INTO "PioneerAccessSlot" ("slot") VALUES (11)'));
  } finally {
    await pool.end();
    if (!/^verify_pioneer_[0-9a-f]{32}$/.test(schema)) throw new Error('Unexpected cleanup schema.');
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await admin.end();
  }
});
