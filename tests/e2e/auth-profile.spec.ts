import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { Pool } from 'pg';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const createdUsers: string[] = [];
const createdAvatars: string[] = [];
let pool: Pool;
test.beforeAll(() => {
  const database = new URL(process.env.DATABASE_URL!);
  if (!['127.0.0.1', 'localhost'].includes(database.hostname) || database.pathname !== '/paralax') throw new Error('E2E exige o banco local de desenvolvimento paralax.');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
});
test.afterEach(async () => {
  if (createdUsers.length) await pool.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [createdUsers.splice(0)]);
  for (const key of createdAvatars.splice(0)) {
    if (!/^[0-9a-f-]+\.webp$/.test(key)) throw new Error('Chave de avatar inesperada.');
    await unlink(resolve('var/uploads/avatars', key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
});
test.afterAll(async () => { await pool?.end(); });

test('cadastro → perfil → avatar → recarga → perfil público → logout → login', async ({ page, context }, testInfo) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  const username = `browser_${suffix}`;
  const email = `${username}@example.test`;
  const password = 'Minha-aventura-123!';
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydration|didn't match|does not match/i.test(message.text())) errors.push(message.text()); });
  await page.goto('/cadastro');
  await expect(page.getByRole('button', { name: 'Criar minha conta' })).toBeEnabled();
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-cadastro.png`, fullPage: true });
  await page.getByLabel('Como podemos chamar você?').fill('Lyra Aether');
  await page.getByLabel('Nome de usuário', { exact: true }).fill(username);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  const registration = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  const registered = await registration;
  expect(registered.status()).toBe(201);
  createdUsers.push((await registered.json()).user.id);
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Olá, Lyra.' })).toBeVisible();
  const cookies = await context.cookies();
  const refresh = cookies.find(cookie => cookie.name === 'paralax_refresh');
  expect(refresh?.httpOnly).toBe(true);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });

  await page.getByRole('link', { name: 'Meu perfil', exact: true }).click();
  await page.getByLabel('Nome de exibição').fill('Lyra das Estrelas');
  await page.getByLabel('Biografia', { exact: true }).fill('Exploradora de reinos flutuantes. Sempre pronta para uma boa história.');
  await page.getByLabel('Localização (opcional)').fill('Fortaleza');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toContainText('Perfil atualizado.');
  const png = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#7C5CFC' } }).png().toBuffer();
  const upload = page.waitForResponse(response => response.url().endsWith('/users/me/avatar') && response.request().method() === 'POST');
  await page.getByLabel('Imagem do avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png });
  const uploaded = await upload;
  expect(uploaded.status()).toBe(201);
  createdAvatars.push((await uploaded.json()).avatarUrl.split('/').pop());
  await expect(page.getByRole('status')).toHaveText('Avatar atualizado.');
  await expect(page.getByRole('img', { name: 'Avatar de Lyra das Estrelas' }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Lyra das Estrelas');
  await expect(page.getByLabel('Biografia', { exact: true })).toContainText('Exploradora de reinos flutuantes.');
  await expect(page.getByLabel('Localização (opcional)')).toHaveValue('Fortaleza');
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-perfil.png`, fullPage: true });
  await page.getByRole('main').getByRole('link', { name: 'Ver perfil público', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lyra das Estrelas', exact: true })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fortaleza', { exact: true })).toBeVisible();
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-perfil-publico.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL('/entrar');
  await page.goto('/perfil');
  await expect(page).toHaveURL('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Olá, Lyra.' })).toBeVisible();
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-dashboard.png`, fullPage: true });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('validação de cadastro e erro de login são compreensíveis', async ({ page }, testInfo) => {
  await page.goto('/cadastro');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible();
  await expect(page.getByText('Use pelo menos 10 caracteres.')).toBeVisible();
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`ausente_${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill('senha-incorreta');
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Crie mundos. Conte histórias. Jogue do seu jeito.' })).toBeVisible();
  await page.getByRole('link', { name: 'Conhecer a Paralax' }).click();
  await expect(page).toHaveURL('/#universo');
  await expect(page.getByRole('heading', { name: 'Toda aventura começa com você.' })).toBeVisible();
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-inicio.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
