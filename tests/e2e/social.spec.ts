import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { hash, argon2id } from 'argon2';
import { Pool } from 'pg';

test('amizade e conversa entre duas contas: aceite, mensagens, não lidas, histórico e bloqueio', async ({ page, browser }, testInfo) => {
  test.setTimeout(120000);
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/paralax') throw new Error('Somente banco local para testes.');
  const pool = new Pool({ connectionString: url.href });
  const ids: string[] = [], errors: string[] = [];
  const origin = new URL(testInfo.project.use.baseURL!).origin;
  const context = await browser.newContext({ baseURL: origin, viewport: testInfo.project.use.viewport });
  const friend = await context.newPage();
  for (const surface of [page, friend]) surface.on('pageerror', error => errors.push(error.message));
  const password = 'Uma-senha-de-teste-123!';
  async function fixture(label: string, passwordHash: string) {
    const id = randomUUID(), username = `friend_${label}_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
    ids.push(id);
    await pool.query('INSERT INTO "User" (id,email,username,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)', [id, `${username}@example.test`, username, passwordHash]);
    await pool.query('INSERT INTO "Profile" ("userId","displayName","updatedAt") VALUES ($1,$2,CURRENT_TIMESTAMP)', [id, `Aventureiro ${label}`]);
    return username;
  }
  async function login(surface: Page, username: string) {
    await surface.goto('/entrar'); await surface.getByLabel('E-mail').fill(`${username}@example.test`); await surface.getByLabel('Senha', { exact: true }).fill(password);
    await surface.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click(); await expect(surface).toHaveURL(/\/dashboard$/);
    await surface.getByRole('link', { name: 'Amigos', exact: true }).click(); await expect(surface.getByRole('heading', { name: 'Amigos e mensagens.' })).toBeVisible();
  }
  try {
    const passwordHash = await hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    const a = await fixture('a', passwordHash), b = await fixture('b', passwordHash);
    await login(page, a); await login(friend, b);
    await page.getByLabel('Nome de usuário', { exact: true }).fill(`@${b}`); await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Solicitação enviada');
    await expect(page.getByRole('button', { name: 'Conversar', exact: true })).toHaveCount(0);
    await friend.reload(); await friend.getByRole('button', { name: 'Aceitar amizade', exact: true }).click(); await expect(friend.getByRole('status')).toContainText('Amizade aceita');
    await page.reload(); await page.getByRole('button', { name: 'Conversar', exact: true }).click();
    await page.getByLabel('Sua mensagem').fill('Olá! Vamos jogar amanhã? <script>literal</script>'); await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Mensagens da conversa' }).getByText('Olá! Vamos jogar amanhã? <script>literal</script>', { exact: true })).toBeVisible();
    await friend.reload(); await expect(friend.getByLabel('1 mensagens não lidas', { exact: true })).toBeVisible();
    await friend.getByRole('button', { name: 'Conversar', exact: true }).click();
    await expect(friend.getByRole('list', { name: 'Mensagens da conversa' }).getByText('Olá! Vamos jogar amanhã? <script>literal</script>', { exact: true })).toBeVisible();
    await expect(friend.getByLabel('1 mensagens não lidas', { exact: true })).toHaveCount(0);
    await friend.getByLabel('Sua mensagem').fill('Combinado! Às 20h.'); await friend.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Mensagens da conversa' }).getByText('Combinado! Às 20h.', { exact: true })).toBeVisible({ timeout: 20000 });
    const connection = (await pool.query('SELECT id FROM "Friendship" WHERE "lowId" = ANY($1::text[]) AND "highId" = ANY($1::text[])', [ids])).rows[0];
    expect(Number((await pool.query('SELECT count(*) FROM "DirectMessage" WHERE "friendshipId"=$1', [connection.id])).rows[0].count)).toBe(2);
    // The server commits, but the first response is lost. Retrying must reuse the same message.
    let loseResponse = true;
    await page.route(`**/social/connections/${connection.id}/messages`, async route => {
      if (route.request().method() === 'POST' && loseResponse) { loseResponse = false; await route.fetch(); await route.abort('failed'); }
      else await route.continue();
    });
    await page.getByLabel('Sua mensagem').fill('Mensagem com resposta perdida.');
    await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await expect(page.locator('.social-chat').getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Sua mensagem')).toHaveValue('Mensagem com resposta perdida.');
    await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await expect(page.getByLabel('Sua mensagem')).toHaveValue('');
    expect(Number((await pool.query('SELECT count(*) FROM "DirectMessage" WHERE "friendshipId"=$1', [connection.id])).rows[0].count)).toBe(3);
    await page.unroute(`**/social/connections/${connection.id}/messages`);
    await page.reload(); await page.getByRole('button', { name: 'Conversar', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Mensagens da conversa' }).getByText('Combinado! Às 20h.', { exact: true })).toBeVisible();
    if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.artifacts/${testInfo.project.name}-amizades-mensagens.png`, fullPage: true });
    await page.getByRole('button', { name: 'Bloquear', exact: true }).click(); await page.getByRole('button', { name: 'Confirmar bloqueio', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Pessoa bloqueada'); await expect(page.getByLabel('Sua mensagem')).toHaveCount(0);
    await friend.reload(); await expect(friend.getByRole('button', { name: 'Conversar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Desbloquear', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Pessoa desbloqueada');
    expect(errors).toEqual([]);
  } finally { await context.close(); if (ids.length) await pool.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [ids]); await pool.end(); }
});
