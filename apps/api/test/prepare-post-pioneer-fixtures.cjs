// The ordinary integration/E2E stories use accounts created after the pioneer cohort.
// Model already-deleted fixture accounts in the local database; never run against the hosted site.
const { config } = require('dotenv');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const url = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/paralax') throw new Error('Fixtures require local paralax database.');
const pool = new Pool({ connectionString: url.href, max: 1 });
(async () => {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const available = (await db.query('SELECT "slot" FROM "PioneerAccessSlot" WHERE "grantedAt" IS NULL')).rowCount;
    const ids = [];
    for (let index = 0; index < available; index++) {
      const id = randomUUID(); ids.push(id);
      await db.query('INSERT INTO "User" (id,email,username,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)', [id, `pioneer_${id}@example.test`, `pioneer_${id}`, 'fixture-not-a-login-hash']);
    }
    if (ids.length) await db.query('DELETE FROM "User" WHERE id=ANY($1::text[])', [ids]);
    await db.query('COMMIT');
    console.log('Local post-pioneer fixtures ready; any consumed slots belong to deleted synthetic accounts.');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
