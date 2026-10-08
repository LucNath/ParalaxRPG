import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import type { AuthResponse, DiceRoll, GameSession } from '@paralax/contracts';

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
const options = (page: Page, account: AuthResponse) => ({ headers: { Authorization: `Bearer ${account.accessToken}`, Origin: new URL(page.url()).origin } });
async function fixture(page: Page, gm: AuthResponse, dice = [6, 20]) {
  const attributeId = randomUUID(), skillId = randomUUID();
  const response = await page.request.post('/api/v1/systems', { ...options(page, gm), data: { name: 'Regras da rolagem', description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [{ id: attributeId, name: 'Vontade', defaultValue: -2 }], skills: [{ id: skillId, name: 'Investigar', defaultValue: 7, attributeId }], resources: [], dice } } }); expect(response.status()).toBe(201); const system = await response.json();
  const created = await page.request.post('/api/v1/campaigns', { ...options(page, gm), data: { name: 'Mesa dos dados', description: '', visibility: 'PUBLIC', status: 'PLANNED', maxPlayers: 2, systemVersionId: system.versionId } }); expect(created.status()).toBe(201); const campaign = await created.json();
  const agenda = await page.request.post(`/api/v1/campaigns/${campaign.id}/sessions`, { ...options(page, gm), data: { title: 'O portal dos dados', description: '', scheduledAt: '2027-01-10T21:00:00Z', timeZone: 'America/Fortaleza', visibility: 'PUBLIC' } }); expect(agenda.status()).toBe(201);
  return { campaign, session: await agenda.json() as GameSession, skillId };
}
async function focus(page: Page) { await page.bringToFront(); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); }

test('dados: ficha, resultado compartilhado, tentativa ambígua após encerramento, recarga e perda de acesso', async ({ page, browser, baseURL }, info) => {
  test.setTimeout(120000);
  const contexts = [await browser.newContext({ ...info.project.use, baseURL }), await browser.newContext({ ...info.project.use, baseURL })];
  const player = await contexts[0].newPage(), visitor = await contexts[1].newPage(), errors: string[] = [];
  for (const surface of [page, player, visitor]) surface.on('pageerror', error => errors.push(error.message));
  try {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 9), gm = await login(page, `rg_${suffix}`), account = await login(player, `rp_${suffix}`);
    const { campaign, session, skillId } = await fixture(page, gm);
    const invitation = await page.request.post(`/api/v1/campaigns/${campaign.id}/invitations`, { ...options(page, gm), data: { username: account.user.username } }); expect(invitation.status()).toBe(201); const sent = await invitation.json(); expect((await player.request.post(`/api/v1/invitations/${sent.id}/accept`, options(player, account))).status()).toBe(200);
    const created = await player.request.post(`/api/v1/campaigns/${campaign.id}/characters`, { ...options(player, account), data: { name: 'Lia do Portal', description: '', story: '', level: null } }); expect(created.status()).toBe(201); const character = await created.json();
    await player.goto(`/sessoes/${session.id}`); await expect(player.getByText('O mestre precisa iniciar a sessão para liberar as rolagens.', { exact: true })).toBeVisible(); await expect(player.getByRole('button', { name: 'Rolar dados', exact: true })).toHaveCount(0);
    await page.goto(`/sessoes/${session.id}`); await page.getByRole('button', { name: 'Iniciar sessão', exact: true }).click(); await expect(page.getByRole('main').getByText('Ao vivo', { exact: true })).toBeVisible(); await focus(player); await expect(player.getByRole('button', { name: 'Rolar dados', exact: true })).toBeEnabled();
    await player.getByLabel('Quantidade de dados').fill('51'); await player.getByRole('button', { name: 'Rolar dados', exact: true }).click(); await expect(player.getByRole('main').getByRole('alert')).toContainText('Use até 50 dados.'); expect((await pool.query('SELECT id FROM "DiceRoll" WHERE "sessionId"=$1', [session.id])).rowCount).toBe(0);
    await player.getByLabel('Quantidade de dados').fill('2'); await player.getByLabel('Tipo de dado').selectOption('6'); await player.getByLabel('Modificador adicional').fill('-3'); await player.getByLabel('Ficha da rolagem').selectOption(character.id); await player.getByLabel('Campo da ficha').selectOption(skillId);
    const pending = player.waitForResponse(response => response.url().endsWith(`/sessions/${session.id}/rolls`) && response.request().method() === 'POST');
    await player.getByRole('button', { name: 'Rolar dados', exact: true }).click(); const response = await pending; expect(response.status()).toBe(201); const roll = await response.json() as DiceRoll;
    expect(roll.modifier).toBe(4); expect(roll.character?.field?.value).toBe(7); expect(roll.total).toBe(roll.results.reduce((sum, value) => sum + value, 4)); await expect(player.locator('.roll-result-confirmation')).toContainText(String(roll.total)); await expect(player.locator('.roll-history li')).toHaveCount(1);
    await focus(page); await expect(page.locator('.roll-history li')).toHaveCount(1); await expect(page.locator('.roll-history')).toContainText(account.user.username);
    await page.getByLabel('Tipo de dado').selectOption('20'); await page.getByLabel('Modificador adicional').fill('-2'); await page.getByRole('button', { name: 'Rolar dados', exact: true }).click(); await expect(page.locator('.roll-history li')).toHaveCount(2);
    await focus(player); await expect(player.locator('.roll-history li')).toHaveCount(2); await expect(player.locator('.roll-history')).toContainText(gm.user.username);
    await player.screenshot({ path: `.artifacts/${info.project.name}-rolagens-compartilhadas.png`, fullPage: true });
    await visitor.goto(`/ao-vivo/${session.id}`); await expect(visitor.getByRole('heading', { name: session.title, exact: true })).toBeVisible(); await expect(visitor.getByRole('heading', { name: 'Histórico de rolagens', exact: true })).toHaveCount(0); expect((await visitor.request.get(`/api/v1/sessions/${session.id}/rolls`)).status()).toBe(401);
    let ambiguous: DiceRoll | undefined;
    await player.route(`**/api/v1/sessions/${session.id}/rolls`, async route => { if (route.request().method() !== 'POST') return route.continue(); const result = await route.fetch(); expect(result.status()).toBe(201); ambiguous = await result.json() as DiceRoll; await route.abort('failed'); });
    await player.getByRole('button', { name: 'Rolar dados', exact: true }).click(); await expect(player.getByRole('button', { name: 'Reenviar mesma rolagem', exact: true })).toBeEnabled(); expect(ambiguous).toBeDefined(); expect((await pool.query('SELECT id FROM "DiceRoll" WHERE "sessionId"=$1', [session.id])).rowCount).toBe(3);
    await player.unroute(`**/api/v1/sessions/${session.id}/rolls`); await focus(page); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click(); await expect(page.getByText('Finalizada', { exact: true })).toBeVisible();
    await focus(player); await expect(player.getByText('Finalizada', { exact: true })).toBeVisible(); await player.getByRole('button', { name: 'Reenviar mesma rolagem', exact: true }).click(); await expect(player.locator('.roll-result-confirmation')).toContainText(String(ambiguous!.total)); await expect(player.getByRole('button', { name: 'Rolar dados', exact: true })).toHaveCount(0);
    await player.reload(); await expect(player.locator('.roll-history li')).toHaveCount(3); await expect(player.locator('.roll-history')).toContainText('Lia do Portal');
    if (info.project.name === 'mobile') await player.setViewportSize({ width: 320, height: 800 }); expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await expect(player.getByRole('button', { name: 'Sair da conta', exact: true })).toBeInViewport({ ratio: 1 });
    await player.screenshot({ path: `.artifacts/${info.project.name}-rolagens-historico.png`, fullPage: true });
    await page.goto(`/campanhas/${campaign.id}`); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: `Remover jogador ${account.user.username}`, exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Jogador removido.' })).toBeVisible();
    await focus(player); await expect(player.getByRole('main').getByRole('alert')).toHaveText('Você não tem mais acesso a esta sessão ou campanha.'); await expect(player.locator('.roll-history')).toHaveCount(0);
    const stored = (await pool.query('SELECT total,results,"fieldModifier",character,"actorId" FROM "DiceRoll" WHERE id=$1', [roll.id])).rows[0]; expect(stored.total).toBe(roll.total); expect(stored.results).toEqual(roll.results); expect(stored.fieldModifier).toBe(7); expect(stored.actorId).toBe(account.user.id); expect(stored.character.name).toBe('Lia do Portal'); expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('dados: histórico paginado, erro recuperável e sistema sem dados', async ({ page }, info) => {
  test.setTimeout(120000); const account = await login(page, `rh_${randomUUID().replaceAll('-', '').slice(0, 9)}`); const { session } = await fixture(page, account);
  await page.goto(`/sessoes/${session.id}`); await page.getByRole('button', { name: 'Iniciar sessão', exact: true }).click(); await expect(page.getByRole('button', { name: 'Rolar dados', exact: true })).toBeEnabled(); await page.getByRole('button', { name: 'Rolar dados', exact: true }).click(); await expect(page.locator('.roll-history li')).toHaveCount(1);
  const source = (await pool.query('SELECT * FROM "DiceRoll" WHERE "sessionId"=$1', [session.id])).rows[0];
  for (let sequence = 2; sequence <= 25; sequence++) await pool.query('INSERT INTO "DiceRoll" (id,"sessionId",sequence,"actorId","requestId",request,actor,character,count,sides,"manualModifier","fieldModifier",modifier,results,total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)', [randomUUID(), session.id, sequence, source.actorId, randomUUID(), source.request, source.actor, source.character, source.count, source.sides, source.manualModifier, source.fieldModifier, source.modifier, source.results, source.total]);
  await page.getByRole('button', { name: 'Atualizar histórico', exact: true }).click(); await expect(page.locator('.roll-history li')).toHaveCount(20); await page.getByRole('button', { name: 'Rolagens mais antigas', exact: true }).click(); await expect(page.locator('.roll-history li')).toHaveCount(5); await expect(page.locator('.roll-history')).toContainText('#1');
  await page.getByRole('button', { name: 'Voltar às mais recentes', exact: true }).click(); await expect(page.locator('.roll-history li')).toHaveCount(20);
  await page.route(`**/api/v1/sessions/${session.id}/rolls`, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_UNAVAILABLE', message: 'Histórico temporariamente indisponível.', requestId: 'test' } }) })); await page.getByRole('button', { name: 'Atualizar histórico', exact: true }).click(); await expect(page.getByRole('main').getByRole('alert')).toContainText('Histórico temporariamente indisponível.');
  await page.unroute(`**/api/v1/sessions/${session.id}/rolls`); await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(page.locator('.roll-history li')).toHaveCount(20); await page.screenshot({ path: `.artifacts/${info.project.name}-rolagens-paginadas.png`, fullPage: true });
  // A second campaign can use a system that intentionally has no dice.
  const systemId = randomUUID(), versionId = randomUUID(), campaignId = randomUUID(), sessionId = randomUUID();
  await pool.query('INSERT INTO "RpgSystem" (id,"ownerId",name,"updatedAt") VALUES ($1,$2,$3,NOW())', [systemId, account.user.id, 'Sem dados']);
  await pool.query('INSERT INTO "SystemVersion" (id,"systemId",number,name,description,definition) VALUES ($1,$2,1,$3,\'\',$4)', [versionId, systemId, 'Sem dados', { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [] }]);
  await pool.query('INSERT INTO "Campaign" (id,"ownerId","systemVersionId",name,"maxPlayers","updatedAt") VALUES ($1,$2,$3,$4,2,NOW())', [campaignId, account.user.id, versionId, 'Mesa sem dados']);
  await pool.query('INSERT INTO "GameSession" (id,"campaignId",title,"scheduledAt","timeZone",status,"startedAt","updatedAt") VALUES ($1,$2,$3,NOW(),$4,\'LIVE\',NOW(),NOW())', [sessionId, campaignId, 'Sessão sem dados', 'America/Fortaleza']);
  await page.goto(`/sessoes/${sessionId}`); await expect(page.getByText('A versão de regras desta campanha não tem tipos de dado disponíveis.', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Rolar dados', exact: true })).toHaveCount(0);
});
