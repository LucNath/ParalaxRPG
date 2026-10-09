import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { hash, argon2id } from 'argon2';
import { Pool } from 'pg';

test('notifications: notificações em qualquer página, aceite e atalho para conversa sem confundir vista com lida', async ({ page, browser }, testInfo) => {
  test.setTimeout(120000);
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/paralax') throw Error('Somente banco local.');
  const pool = new Pool({ connectionString: url.href }), ids: string[] = [], errors: string[] = [];
  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: testInfo.project.use.viewport });
  const friend = await context.newPage();
  for (const surface of [page, friend]) surface.on('pageerror', error => errors.push(error.message));
  const password = 'Uma-senha-de-teste-123!';
  async function fixture(label: string, passwordHash: string) {
    const id = randomUUID(), username = `notice_${label}_${id.replaceAll('-', '').slice(0, 8)}`; ids.push(id);
    await pool.query('INSERT INTO "User" (id,email,username,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)', [id, `${username}@example.test`, username, passwordHash]);
    await pool.query('INSERT INTO "Profile" ("userId","displayName","updatedAt") VALUES ($1,$2,CURRENT_TIMESTAMP)', [id, `Aventureiro ${label}`]); return username;
  }
  async function login(surface: Page, username: string) {
    await surface.goto('/entrar'); await surface.getByLabel('E-mail').fill(`${username}@example.test`); await surface.getByLabel('Senha', { exact: true }).fill(password);
    await surface.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click(); await expect(surface).toHaveURL(/\/dashboard$/);
  }
  try {
    const passwordHash = await hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    const a = await fixture('a', passwordHash), b = await fixture('b', passwordHash);
    await login(page, a); await login(friend, b);
    await page.getByRole('link', { name: 'Amigos', exact: true }).click(); await page.getByLabel('Nome de usuário', { exact: true }).fill(b);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click(); await page.getByRole('button', { name: 'Adicionar', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Solicitação enviada');
    await friend.reload(); await expect(friend.getByTestId('friends-count')).toHaveText('1'); await expect(friend.getByTestId('notification-count')).toHaveText('1');
    await friend.getByRole('link', { name: 'Notificações', exact: true }).click();
    await friend.getByRole('button', { name: 'Ver solicitação', exact: true }).click(); await expect(friend).toHaveURL(/\/amigos\?conexao=/);
    await expect(friend.getByTestId('notification-count')).toHaveCount(0); await expect(friend.getByTestId('friends-count')).toHaveText('1');
    await friend.getByRole('button', { name: 'Aceitar amizade', exact: true }).click(); await expect(friend.getByTestId('friends-count')).toHaveCount(0);
    // Leave the conversation before sending: a visible open chat legitimately reads incoming messages.
    await friend.goto('/dashboard');
    await page.goto('/dashboard'); await expect(page.getByTestId('notification-count')).toHaveText('1');
    await page.getByRole('link', { name: 'Notificações', exact: true }).click(); await expect(page.getByText('aceitou sua amizade.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir conversa', exact: true }).click(); await expect(page.getByLabel('Sua mensagem')).toBeVisible();
    await page.getByLabel('Sua mensagem').fill('Uma aventura espera por você.'); await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await expect(page.getByLabel('Sua mensagem')).toHaveValue('');
    await friend.goto('/dashboard'); await expect(friend.getByTestId('friends-count')).toHaveText('1');
    await friend.getByRole('link', { name: 'Notificações', exact: true }).click();
    await friend.getByRole('button', { name: 'Marcar como vista', exact: true }).click(); await expect(friend.getByTestId('notification-count')).toHaveCount(0);
    await expect(friend.getByTestId('friends-count')).toHaveText('1');
    if (testInfo.project.name === 'mobile') await friend.setViewportSize({ width: 320, height: 900 });
    expect(await friend.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await friend.screenshot({ path: `.artifacts/${testInfo.project.name}-notificacoes.png`, fullPage: true });
    await friend.getByRole('button', { name: 'Abrir conversa', exact: true }).click();
    await expect(friend.getByRole('list', { name: 'Mensagens da conversa' }).getByText('Uma aventura espera por você.', { exact: true })).toBeVisible();
    await expect(friend.getByTestId('friends-count')).toHaveCount(0);
    await friend.getByRole('button', { name: 'Sair da conta', exact: true }).filter({ visible: true }).click(); await expect(friend).toHaveURL(/\/entrar$/);
    expect(errors).toEqual([]);
  } finally { await context.close(); if (ids.length) await pool.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [ids]); await pool.end(); }
});
