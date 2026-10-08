import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import sharp from 'sharp';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

let pool: Pool;
const users: string[] = [], avatars: string[] = [];
test.beforeAll(() => {
  const database = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/paralax') throw new Error('Teste exige banco local.');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
});
test.afterEach(async () => {
  if (users.length) await pool.query('DELETE FROM "User" WHERE id=ANY($1::text[])', [users.splice(0)]);
  for (const key of avatars.splice(0)) { if (!/^[0-9a-f-]+\.webp$/.test(key)) throw new Error('Chave inválida'); await unlink(resolve('var/uploads/avatars', key)).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
});
test.afterAll(async () => { await pool?.end(); });

test('marcos reais → coleção → prévia → equipar → público → recarga → padrão', async ({ page, browser }, testInfo) => {
  const username = `cosui_${randomUUID().replaceAll('-', '').slice(0, 9)}`, errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/cadastro'); await page.getByLabel('Como podemos chamar você?').fill('Lyra do Portal'); await page.getByLabel('Nome de usuário', { exact: true }).fill(username); await page.getByLabel('E-mail', { exact: true }).fill(`${username}@example.test`); await page.getByLabel('Senha', { exact: true }).fill('Uma-senha-de-teste-123!');
  const registered = page.waitForResponse(response => response.url().endsWith('/auth/register')); await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click(); const account = await (await registered).json(); users.push(account.user.id); await expect(page).toHaveURL('/dashboard');
  const origin = new URL(page.url()).origin, options = { headers: { Authorization: `Bearer ${account.accessToken}`, Origin: origin } };
  page.on('request', request => { const token = request.headers().authorization; if (token && request.url().startsWith(origin)) options.headers.Authorization = token; });
  await page.goto('/perfil'); await expect(page.getByText('0/4 obtidas', { exact: true })).toBeVisible(); await expect(page.getByRole('radio', { name: 'Portal violeta', exact: true })).toBeDisabled(); await expect(page.getByRole('radio', { name: 'Cidadela flutuante', exact: true })).toBeDisabled();
  expect((await page.request.patch('/api/v1/users/me', { ...options, data: { backgroundId: 'floating-citadel' } })).status()).toBe(400);
  await page.getByLabel('Biografia', { exact: true }).fill('Exploradora de cidades entre as estrelas.'); await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Perfil atualizado.');
  const png = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#7653eb' } }).png().toBuffer(); const uploaded = page.waitForResponse(response => response.url().endsWith('/users/me/avatar'));
  await page.getByLabel('Imagem do avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png }); avatars.push((await (await uploaded).json()).avatarUrl.split('/').pop());
  await expect(page.getByText('1/4 obtidas', { exact: true })).toBeVisible(); await expect(page.getByRole('radio', { name: 'Portal violeta', exact: true })).toBeEnabled();
  const systemResponse = await page.request.post('/api/v1/systems', { ...options, data: { name: 'Regras da coleção', description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [6] } } }); expect(systemResponse.status()).toBe(201); const system = await systemResponse.json();
  const campaignResponse = await page.request.post('/api/v1/campaigns', { ...options, data: { name: 'Mesa dos portais', description: '', visibility: 'PRIVATE', status: 'PLANNED', maxPlayers: 1, systemVersionId: system.versionId } }); expect(campaignResponse.status()).toBe(201); const campaign = await campaignResponse.json();
  expect((await page.request.post(`/api/v1/campaigns/${campaign.id}/characters`, { ...options, data: { name: 'Lyra', description: '', story: '', level: null } })).status()).toBe(201);
  const scheduledResponse = await page.request.post(`/api/v1/campaigns/${campaign.id}/sessions`, { ...options, data: { title: 'Os primeiros dados', description: '', scheduledAt: '2027-01-10T21:00:00Z', timeZone: 'America/Fortaleza', visibility: 'PRIVATE' } }); expect(scheduledResponse.status()).toBe(201); const session = await scheduledResponse.json();
  expect((await page.request.post(`/api/v1/sessions/${session.id}/start`, { ...options, data: { expectedRevision: session.revision } })).status()).toBe(200);
  expect((await page.request.post(`/api/v1/sessions/${session.id}/rolls`, { ...options, data: { requestId: randomUUID(), count: 1, sides: 6, modifier: 0 } })).status()).toBe(201);
  await page.getByRole('button', { name: 'Atualizar coleção', exact: true }).click(); await expect(page.getByText('4/4 obtidas', { exact: true })).toBeVisible();
  const collection = page.getByRole('region', { name: 'Conquistas e personalização' });
  await page.getByRole('radio', { name: 'Cidadela flutuante', exact: true }).check(); await page.getByRole('radio', { name: 'Portal violeta', exact: true }).check();
  await expect(collection.locator('.public-banner')).toHaveAttribute('data-background', 'floating-citadel'); await expect(collection.locator('.profile-portrait')).toHaveAttribute('data-frame', 'violet-portal');
  const before = await pool.query('SELECT "backgroundId", "avatarFrameId" FROM "Profile" WHERE "userId"=$1', [account.user.id]); expect(before.rows[0]).toEqual({ backgroundId: null, avatarFrameId: null });
  await page.getByRole('button', { name: 'Salvar personalização', exact: true }).click(); await expect(collection.getByRole('status')).toContainText('Personalização salva.');
  await page.getByLabel('Biografia', { exact: true }).fill('Uma nova história.'); await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click(); await expect(page.getByRole('main').getByRole('status').filter({ hasText: 'Perfil atualizado.' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('radio', { name: 'Cidadela flutuante', exact: true })).toBeChecked(); await expect(page.getByRole('radio', { name: 'Portal violeta', exact: true })).toBeChecked();
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeInViewport({ ratio: 1 }); await page.screenshot({ path: `.artifacts/${testInfo.project.name}-colecao.png`, fullPage: true });
  const visitor = await browser.newContext({ baseURL: origin, viewport: { width: testInfo.project.name === 'mobile' ? 320 : 1440, height: 900 } });
  try {
    const publicPage = await visitor.newPage(); await publicPage.goto(`/u/${username}`); await expect(publicPage.locator('.public-banner')).toHaveAttribute('data-background', 'floating-citadel'); await expect(publicPage.locator('.profile-portrait')).toHaveAttribute('data-frame', 'violet-portal');
    await expect(publicPage.locator('.avatar-frame')).toBeVisible(); await expect(publicPage.getByRole('heading', { name: 'Conquistas', exact: true })).toHaveCount(0);
    const publicData = await (await publicPage.request.get(`/api/v1/users/${username}`)).json(); expect(publicData.background.id).toBe('floating-citadel'); expect(publicData.email).toBeUndefined(); expect(publicData.achievements).toBeUndefined(); expect((await publicPage.request.get('/api/v1/users/me/achievements')).status()).toBe(401);
    expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await publicPage.screenshot({ path: `.artifacts/${testInfo.project.name}-perfil-cosmeticos.png`, fullPage: true });
    await publicPage.route('**/art/floating-city.webp', route => route.abort()); await publicPage.reload(); await expect(publicPage.locator('.public-banner img')).toHaveCount(0); await expect(publicPage.locator('.public-banner')).toBeVisible();
  } finally { await visitor.close(); }
  await page.getByRole('radio', { name: 'Paisagem padrão', exact: true }).check(); await page.getByRole('radio', { name: 'Sem borda', exact: true }).check(); await page.getByRole('button', { name: 'Salvar personalização', exact: true }).click(); await expect(collection.getByRole('status')).toContainText('Personalização salva.');
  const after = await pool.query('SELECT "backgroundId", "avatarFrameId" FROM "Profile" WHERE "userId"=$1', [account.user.id]); expect(after.rows[0]).toEqual({ backgroundId: null, avatarFrameId: null }); expect((await pool.query('SELECT * FROM "UserCosmetic" WHERE "userId"=$1', [account.user.id])).rowCount).toBe(8); expect(errors).toEqual([]);
});
