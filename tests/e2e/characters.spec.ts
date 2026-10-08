import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import type { AuthResponse, CampaignDetail, CharacterDetail, SystemDetail } from '@paralax/contracts';

let pool: Pool;
const users: string[] = [];
test.use({ actionTimeout: 15000 });
test.beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/paralax') throw new Error('Use somente o banco local paralax para E2E.');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
});
test.afterEach(async () => { if (users.length) await pool.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [users.splice(0)]); });
test.afterAll(async () => { await pool?.end(); });
async function register(page: Page, username: string) {
  await page.goto('/cadastro');
  await page.getByLabel('Como podemos chamar você?').fill(username);
  await page.getByLabel('Nome de usuário', { exact: true }).fill(username);
  await page.getByLabel('E-mail', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill('Uma-senha-de-teste-123!');
  const pending = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.status() === 201);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  const session = await (await pending).json() as AuthResponse; users.push(session.user.id);
  await expect(page).toHaveURL('/dashboard'); return session;
}
function options(session: AuthResponse) { return { headers: { Authorization: `Bearer ${session.accessToken}`, Origin: 'http://localhost:3000' } }; }
async function loginFixture(page: Page, username: string) {
  const id = randomUUID(), password = 'Uma-senha-de-teste-123!';
  await pool.query('INSERT INTO "User" (id,email,username,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,NOW())', [id, `${username}@example.test`, username, await argon2.hash(password)]); users.push(id);
  await pool.query('INSERT INTO "Profile" ("userId","displayName","updatedAt") VALUES ($1,$2,NOW())', [id, username]);
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(`${username}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  const pending = page.waitForResponse(response => response.url().endsWith('/auth/login') && response.status() === 200);
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  const session = await (await pending).json() as AuthResponse;
  await expect(page).toHaveURL('/dashboard'); return session;
}
async function fixture(page: Page, session: AuthResponse, name: string) {
  const attributeId = randomUUID();
  const response = await page.request.post('/api/v1/systems', { ...options(session), data: { name: `Regras ${name}`, description: '', visibility: 'PRIVATE', definition: {
    schemaVersion: 1, attributes: [{ id: attributeId, name: 'Vontade', defaultValue: -2 }], skills: [{ id: randomUUID(), name: 'Investigar', defaultValue: 3, attributeId }], resources: [{ id: randomUUID(), name: 'Fôlego', defaultValue: 4, maxValue: 8 }, { id: randomUUID(), name: 'Pontos', defaultValue: 10, maxValue: null }], dice: [20],
  } } }); expect(response.status()).toBe(201);
  const system = await response.json() as SystemDetail;
  const created = await page.request.post('/api/v1/campaigns', { ...options(session), data: { name, description: 'Uma mesa privada.', systemVersionId: system.versionId, maxPlayers: 2, visibility: 'PRIVATE', status: 'PLANNED' } });
  expect(created.status()).toBe(201); return { campaign: await created.json() as CampaignDetail, system };
}
async function focus(page: Page) { await page.bringToFront(); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); }

test('ficha: versão fixa, validação, jogador/mestre, conflito preservado e revogação', async ({ page, browser }, info) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ baseURL: 'http://localhost:3000', ...info.project.use });
  const player = await context.newPage(), problems: string[] = [];
  for (const surface of [page, player]) surface.on('pageerror', error => problems.push(error.message));
  try {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 9);
    const gm = await register(page, `gm_${suffix}`), account = await register(player, `pc_${suffix}`);
    const { campaign, system } = await fixture(page, gm, `Mesa ${suffix}`);
    const invited = await page.request.post(`/api/v1/campaigns/${campaign.id}/invitations`, { ...options(gm), data: { username: account.user.username } }); expect(invited.status()).toBe(201);
    const invitation = await invited.json();
    expect((await player.request.post(`/api/v1/invitations/${invitation.id}/accept`, options(account))).status()).toBe(200);
    const changed = await page.request.put(`/api/v1/systems/${system.id}`, { ...options(gm), data: { name: `${system.name} futuro`, description: '', visibility: 'PRIVATE', expectedRevision: 1, definition: { ...system.definition, resources: system.definition.resources.map(entry => entry.name === 'Fôlego' ? { ...entry, defaultValue: 1, maxValue: 1 } : entry) } } }); expect(changed.status()).toBe(200);
    await player.goto(`/campanhas/${campaign.id}`);
    await player.getByRole('link', { name: 'Criar meu personagem', exact: true }).click();
    await expect(player.getByLabel('Vontade', { exact: true })).toHaveValue('-2');
    await expect(player.getByLabel('Fôlego', { exact: true })).toHaveValue('4');
    await expect(player.getByText('Máximo: 8.', { exact: true })).toBeVisible();
    await player.getByLabel('Nome do personagem', { exact: true }).fill(`Lia ${suffix}`);
    await player.getByLabel('Descrição do personagem').fill('Uma viajante entre mundos.');
    await player.getByLabel('História do personagem').fill('Atravessou o portal.');
    await player.getByLabel('Vontade', { exact: true }).fill('5');
    await player.getByLabel('Fôlego', { exact: true }).fill('9');
    await player.getByRole('button', { name: 'Criar personagem', exact: true }).click();
    await expect(player.getByText('Use um valor entre 0 e 8.', { exact: true })).toBeVisible();
    await player.getByLabel('Fôlego', { exact: true }).fill('7');
    const creating = player.waitForResponse(response => response.url().endsWith(`/campaigns/${campaign.id}/characters`) && response.status() === 201);
    await player.getByRole('button', { name: 'Criar personagem', exact: true }).click();
    const character = await (await creating).json() as CharacterDetail;
    await expect(player).toHaveURL(`/personagens/${character.id}`);
    await expect(player.getByRole('heading', { name: character.name, exact: true })).toBeVisible();
    await player.reload();
    await expect(player.getByText('Atravessou o portal.', { exact: true })).toBeVisible();
    await player.screenshot({ path: `.artifacts/${info.project.name}-ficha-personagem.png`, fullPage: true });
    await player.getByRole('link', { name: 'Editar ficha', exact: true }).click();
    await player.getByLabel('Nome do personagem', { exact: true }).fill('Meu rascunho preservado');
    await page.goto(`/campanhas/${campaign.id}/personagens`);
    await expect(page.getByRole('article')).toHaveCount(1);
    await page.getByRole('link', { name: `Abrir ${character.name}`, exact: true }).click();
    await page.getByRole('link', { name: 'Editar ficha', exact: true }).click();
    await page.getByLabel('Fôlego', { exact: true }).fill('6');
    await page.getByLabel('História do personagem').fill('História revista pelo mestre.');
    await page.getByRole('button', { name: 'Salvar ficha', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Ficha salva' })).toBeVisible();
    await focus(player);
    await expect(player.getByRole('main').getByRole('alert')).toContainText('rascunho foi preservado');
    await expect(player.getByLabel('Nome do personagem', { exact: true })).toHaveValue('Meu rascunho preservado');
    await expect(player.getByRole('button', { name: 'Salvar ficha', exact: true })).toBeDisabled();
    player.once('dialog', dialog => dialog.accept());
    await player.getByRole('button', { name: 'Carregar versão atual', exact: true }).click();
    await expect(player.getByLabel('Fôlego', { exact: true })).toHaveValue('6');
    await expect(player.getByLabel('Nome do personagem', { exact: true })).toHaveValue(character.name);
    await player.getByLabel('Nome do personagem', { exact: true }).fill('Lia, guardiã do portal');
    await player.getByRole('button', { name: 'Salvar ficha', exact: true }).click();
    await expect(player.getByRole('status').filter({ hasText: 'Ficha salva' })).toBeVisible();
    if (info.project.name === 'mobile') {
      await player.setViewportSize({ width: 320, height: 800 });
      expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(player.getByRole('button', { name: 'Sair da conta', exact: true })).toBeInViewport({ ratio: 1 });
      await player.locator('.sidebar').screenshot({ path: '.artifacts/personagens-navegacao-320px.png' });
      await player.screenshot({ path: '.artifacts/personagem-editor-320px.png', fullPage: true });
    }
    await page.goto(`/campanhas/${campaign.id}`);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: `Remover jogador ${account.user.username}`, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Jogador removido.' })).toBeVisible();
    await focus(player);
    await expect(player.getByRole('main').getByRole('alert')).toHaveText('Você não tem mais acesso a esta ficha ou campanha.');
    await expect(player.getByLabel('Fôlego', { exact: true })).toHaveCount(0);
    await page.goto(`/personagens/${character.id}`);
    await expect(page.getByRole('heading', { name: 'Lia, guardiã do portal', exact: true })).toBeVisible();
    await expect(page.getByText('História revista pelo mestre.', { exact: true })).toBeVisible();
    const stored = (await pool.query('SELECT "systemVersionId", values, revision, level FROM "Character" WHERE id=$1', [character.id])).rows[0];
    expect(stored.systemVersionId).toBe(campaign.systemVersionId); expect(stored.revision).toBe(3); expect(stored.level).toBeNull();
    expect(stored.values.resources[0].value).toBe(6);
    const changes = (await pool.query('SELECT "actorId" FROM "CharacterChange" WHERE "characterId"=$1 ORDER BY revision', [character.id])).rows;
    expect(changes.map(row => row.actorId)).toEqual([account.user.id, gm.user.id, account.user.id]);
    expect(problems).toEqual([]);
  } finally { await context.close(); }
});

test('personagens: entrada pelo início, lista privada, paginação, busca e recuperação de erro', async ({ page }) => {
  test.setTimeout(120000);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 9), account = await loginFixture(page, `list_${suffix}`);
  await page.getByRole('main').locator('a[href="/personagens"]').click();
  await expect(page.getByText('Nenhum personagem disponível. Crie sua ficha dentro de uma campanha.')).toBeVisible();
  // A navegação pelo cliente mantém o access token; fixtures precedem qualquer reload.
  const { campaign } = await fixture(page, account, `Primeira ${suffix}`), { campaign: second } = await fixture(page, account, `Segunda ${suffix}`);
  for (let n = 0; n < 21; n++) {
    const response = await page.request.post(`/api/v1/campaigns/${n < 20 ? campaign.id : second.id}/characters`, { ...options(account), data: { name: `Arquivo ${suffix} ${String(n).padStart(2, '0')}`, description: '', story: 'História privada', level: null } }); expect(response.status()).toBe(201);
  }
  await page.route('**/api/v1/characters/mine?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_UNAVAILABLE', message: 'Serviço temporariamente indisponível.', requestId: 'test' } }) }));
  await focus(page);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Serviço temporariamente indisponível.');
  await page.unroute('**/api/v1/characters/mine?*');
  const pending = page.waitForResponse(response => response.url().includes('/characters/mine?') && response.status() === 200);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  const summaries = await (await pending).json(); expect(summaries.items[0]).not.toHaveProperty('story'); expect(summaries.items[0]).not.toHaveProperty('values');
  await expect(page.getByRole('article')).toHaveCount(20);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByText('Página 2 · 21 personagens', { exact: true })).toBeVisible();
  await page.getByLabel('Buscar personagens').fill(`Arquivo ${suffix} 07`);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('link', { name: `Abrir Arquivo ${suffix} 07`, exact: true })).toBeVisible();
  await page.getByLabel('Buscar personagens').fill('Nenhum personagem com esse nome');
  await expect(page.getByText('Nenhum personagem corresponde à busca.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
