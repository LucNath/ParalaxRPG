import { testOrigin } from './test-origin';
import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import type { AuthResponse, CampaignDetail, GameSession } from '@paralax/contracts';

let pool: Pool;
const users: string[] = [];
test.use({ actionTimeout: 15000 });
test.beforeAll(() => { const url = new URL(process.env.DATABASE_URL!); if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/paralax') throw new Error('Use somente o banco local paralax para E2E.'); pool = new Pool({ connectionString: process.env.DATABASE_URL }); });
test.afterEach(async ({ page }) => { await page.close(); if (users.length) await pool.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [users.splice(0)]); });
test.afterAll(async () => { await pool?.end(); });
async function login(page: Page, username: string) {
  const id = randomUUID(), password = 'Uma-senha-de-teste-123!';
  await pool.query('INSERT INTO "User" (id,email,username,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,NOW())', [id, `${username}@example.test`, username, await argon2.hash(password)]); users.push(id);
  await pool.query('INSERT INTO "Profile" ("userId","displayName","updatedAt") VALUES ($1,$2,NOW())', [id, username]);
  await page.goto('/entrar'); await page.getByLabel('E-mail', { exact: true }).fill(`${username}@example.test`); await page.getByLabel('Senha', { exact: true }).fill(password);
  const pending = page.waitForResponse(response => response.url().endsWith('/auth/login') && response.status() === 200);
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click(); const account = await (await pending).json() as AuthResponse; await expect(page).toHaveURL('/dashboard'); return account;
}
const options = (account: AuthResponse) => ({ headers: { Authorization: `Bearer ${account.accessToken}`, Origin: testOrigin() } });
async function fixture(page: Page, gm: AuthResponse, name: string) {
  const r = await page.request.post('/api/v1/systems', { ...options(gm), data: { name: `Regras ${name}`, description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [20] } } }); expect(r.status()).toBe(201); const system = await r.json();
  const c = await page.request.post('/api/v1/campaigns', { ...options(gm), data: { name, description: '', visibility: 'PUBLIC', status: 'PLANNED', maxPlayers: 2, systemVersionId: system.versionId } }); expect(c.status()).toBe(201); return await c.json() as CampaignDetail;
}
async function focus(page: Page) { await page.bringToFront(); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); }
async function fillAgenda(page: Page, title: string) { await page.getByLabel('Título da sessão').fill(title); await page.getByLabel('Data e horário', { exact: true }).fill('2027-01-10T18:00'); await page.getByLabel('Fuso horário').fill('America/Fortaleza'); }

test('sessão: agenda com fuso, edição concorrente, iniciar/encerrar, público, cancelamento e remoção', async ({ page, browser }, info) => {
  test.setTimeout(120000);
  const contexts = [await browser.newContext({ baseURL: testOrigin(), ...info.project.use }), await browser.newContext({ baseURL: testOrigin(), ...info.project.use })];
  const player = await contexts[0].newPage(), visitor = await contexts[1].newPage(), errors: string[] = [];
  for (const surface of [page, player, visitor]) surface.on('pageerror', error => errors.push(error.message));
  try {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 9), gm = await login(page, `sg_${suffix}`), account = await login(player, `sp_${suffix}`);
    const campaign = await fixture(page, gm, `Mesa ${suffix}`);
    const sent = await page.request.post(`/api/v1/campaigns/${campaign.id}/invitations`, { ...options(gm), data: { username: account.user.username } }); expect(sent.status()).toBe(201); const invitation = await sent.json(); expect((await player.request.post(`/api/v1/invitations/${invitation.id}/accept`, options(account))).status()).toBe(200);
    await page.goto(`/campanhas/${campaign.id}`); await page.getByRole('link', { name: 'Agendar sessão', exact: true }).click();
    await fillAgenda(page, `Portal ${suffix}`); await page.getByLabel('Descrição da sessão').fill('Apresentação do encontro.'); await page.getByLabel('Visibilidade da sessão').selectOption('PUBLIC');
    const pending = page.waitForResponse(response => response.url().endsWith(`/campaigns/${campaign.id}/sessions`) && response.status() === 201);
    await page.getByRole('button', { name: 'Criar sessão', exact: true }).click(); const session = await (await pending).json() as GameSession;
    await expect(page).toHaveURL(`/sessoes/${session.id}`); expect(session.scheduledAt).toBe('2027-01-10T21:00:00.000Z');
    await player.goto(`/sessoes/${session.id}`); await expect(player.getByRole('heading', { name: session.title, exact: true })).toBeVisible(); await expect(player.getByRole('button', { name: 'Iniciar sessão', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'Editar agenda', exact: true }).click();
    await expect(page.getByLabel('Data e horário', { exact: true })).toHaveValue('2027-01-10T18:00');
    const second = await page.context().newPage(); await second.goto(`/sessoes/${session.id}/editar`); await expect(second.getByLabel('Título da sessão')).toHaveValue(session.title);
    await page.getByLabel('Descrição da sessão').fill('Rascunho preservado'); await second.getByLabel('Título da sessão').fill(`Encontro revisto ${suffix}`);
    await second.getByRole('button', { name: 'Salvar agenda', exact: true }).click(); await expect(second.getByRole('status').filter({ hasText: 'Agenda salva' })).toBeVisible();
    await focus(page); await expect(page.getByRole('main').getByRole('alert')).toContainText('rascunho foi preservado'); await expect(page.getByLabel('Descrição da sessão')).toHaveValue('Rascunho preservado');
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Carregar versão atual', exact: true }).click(); await expect(page.getByLabel('Título da sessão')).toHaveValue(`Encontro revisto ${suffix}`); await second.close();
    await page.getByRole('link', { name: 'Voltar à sessão', exact: true }).click(); await page.getByRole('button', { name: 'Iniciar sessão', exact: true }).click(); await expect(page.getByRole('main').getByText('Ao vivo', { exact: true })).toBeVisible();
    await focus(player); await expect(player.getByRole('main').getByText('Ao vivo', { exact: true })).toBeVisible();
    await visitor.goto(`/ao-vivo/${session.id}`); await expect(visitor.getByRole('heading', { name: `Encontro revisto ${suffix}`, exact: true })).toBeVisible(); await expect(visitor.getByRole('button', { name: 'Encerrar sessão', exact: true })).toHaveCount(0);
    await visitor.screenshot({ path: `.artifacts/${info.project.name}-sessao-publica.png`, fullPage: true });
    await page.goto(`/campanhas/${campaign.id}`); await page.getByRole('link', { name: 'Agendar sessão', exact: true }).click(); await fillAgenda(page, 'Segunda agenda');
    const creating = page.waitForResponse(response => response.url().endsWith(`/campaigns/${campaign.id}/sessions`) && response.status() === 201); await page.getByRole('button', { name: 'Criar sessão', exact: true }).click(); const other = await (await creating).json() as GameSession;
    await expect(page).toHaveURL(`/sessoes/${other.id}`); await page.getByRole('button', { name: 'Iniciar sessão', exact: true }).click(); await expect(page.getByRole('main').getByRole('alert')).toContainText('Encerre a sessão ao vivo');
    await page.goto(`/sessoes/${session.id}`); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click(); await expect(page.getByRole('main').getByText('Finalizada', { exact: true })).toBeVisible();
    await focus(visitor); await expect(visitor.getByRole('main').getByRole('alert')).toHaveText('Esta sessão não está mais pública ou ao vivo.'); await expect(visitor.getByRole('heading', { name: `Encontro revisto ${suffix}`, exact: true })).toHaveCount(0);
    await page.reload(); await expect(page.getByRole('main').getByText('Finalizada', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Iniciar sessão', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `.artifacts/${info.project.name}-sessao-finalizada.png`, fullPage: true });
    await page.goto(`/sessoes/${other.id}`); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Cancelar sessão', exact: true }).click(); await expect(page.getByRole('main').getByText('Cancelada', { exact: true })).toBeVisible();
    await page.goto(`/campanhas/${campaign.id}`); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: `Remover jogador ${account.user.username}`, exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Jogador removido.' })).toBeVisible();
    await focus(player); await expect(player.getByRole('main').getByRole('alert')).toHaveText('Você não tem mais acesso a esta sessão ou campanha.');
    await page.goto(`/campanhas/${campaign.id}/sessoes`); await expect(page.getByRole('article')).toHaveCount(2); await page.getByLabel('Exibir sessões').selectOption('UPCOMING'); await expect(page.getByText('Nenhuma sessão agendada ou ao vivo.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (info.project.name === 'mobile') { await page.setViewportSize({ width: 320, height: 800 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeInViewport({ ratio: 1 }); await page.locator('.sidebar').screenshot({ path: '.artifacts/sessoes-navegacao-320px.png' }); }
    const stored = (await pool.query('SELECT status,"scheduledAt" AT TIME ZONE \'UTC\' AS "scheduledAt","timeZone","startedAt","endedAt","durationSeconds",revision FROM "GameSession" WHERE id=$1', [session.id])).rows[0]; expect(stored.status).toBe('ENDED'); expect(stored.scheduledAt.toISOString()).toBe('2027-01-10T21:00:00.000Z'); expect(stored.timeZone).toBe('America/Fortaleza'); expect(stored.revision).toBe(4); expect(stored.durationSeconds).toBeGreaterThanOrEqual(0);
    expect((await pool.query('SELECT "actorId",snapshot FROM "GameSessionChange" WHERE "sessionId"=$1 ORDER BY revision', [session.id])).rows.map(row => [row.actorId, row.snapshot.status])).toEqual(['SCHEDULED', 'SCHEDULED', 'LIVE', 'ENDED'].map(status => [gm.user.id, status])); expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('sessões: entrada pelo início, paginação real, busca, filtro e recuperação de erro', async ({ page }) => {
  test.setTimeout(120000);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 9), account = await login(page, `sl_${suffix}`), campaign = await fixture(page, account, `Arquivo ${suffix}`);
  await page.locator('.session-list').getByRole('link', { name: 'Ver todas', exact: true }).click(); await expect(page.getByText('Nenhuma sessão disponível. O mestre pode agendar pela campanha.', { exact: true })).toBeVisible();
  for (let n = 0; n < 21; n++) { const r = await page.request.post(`/api/v1/campaigns/${campaign.id}/sessions`, { ...options(account), data: { title: `Arquivo ${suffix} ${String(n).padStart(2, '0')}`, description: '', scheduledAt: '2027-01-10T21:00:00Z', timeZone: 'America/Fortaleza', visibility: 'PRIVATE' } }); expect(r.status()).toBe(201); if (n === 0) { const s = await r.json(); expect((await page.request.post(`/api/v1/sessions/${s.id}/cancel`, { ...options(account), data: { expectedRevision: 1 } })).status()).toBe(200); } }
  await page.route('**/api/v1/sessions/mine?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_UNAVAILABLE', message: 'Serviço temporariamente indisponível.', requestId: 'test' } }) })); await focus(page); await expect(page.getByRole('main').getByRole('alert')).toHaveText('Serviço temporariamente indisponível.');
  await page.unroute('**/api/v1/sessions/mine?*'); await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(20); await page.getByRole('button', { name: 'Próxima', exact: true }).click(); await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByLabel('Buscar sessões').fill(`Arquivo ${suffix} 07`); await expect(page.getByRole('link', { name: `Abrir sessão Arquivo ${suffix} 07`, exact: true })).toBeVisible();
  await page.getByLabel('Buscar sessões').fill(''); await page.getByLabel('Exibir sessões').selectOption('UPCOMING'); await expect(page.getByRole('article')).toHaveCount(20); await expect(page.getByRole('button', { name: 'Próxima', exact: true })).toHaveCount(0);
  await page.getByLabel('Buscar sessões').fill('Nenhum encontro com esse nome'); await expect(page.getByText('Nenhuma sessão corresponde à busca.', { exact: true })).toBeVisible();
});
