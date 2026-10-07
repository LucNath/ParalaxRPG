import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { AuthResponse, CampaignDetail, SystemDetail } from '@paralax/contracts';

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
  const registering = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.status() === 201);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  const session = await (await registering).json() as AuthResponse; users.push(session.user.id);
  await expect(page).toHaveURL('/dashboard');
  return session;
}
async function campaignFixture(page: Page, session: AuthResponse, name: string) {
  const options = { headers: { Authorization: `Bearer ${session.accessToken}`, Origin: 'http://localhost:3000' } };
  const response = await page.request.post('/api/v1/systems', { ...options, data: { name: `Regras ${name}`, description: '', visibility: 'PRIVATE', definition: {
    schemaVersion: 1, attributes: [{ id: randomUUID(), name: 'Vontade da mesa', defaultValue: 3 }], skills: [], resources: [], dice: [20],
  } } }); expect(response.status()).toBe(201);
  const system = await response.json() as SystemDetail;
  const created = await page.request.post('/api/v1/campaigns', { ...options, data: { name, description: 'Uma mesa privada para jogadores convidados.', systemVersionId: system.versionId, maxPlayers: 1, visibility: 'PRIVATE', status: 'PLANNED' } });
  expect(created.status()).toBe(201); return await created.json() as CampaignDetail;
}
async function refresh(page: Page) { await page.bringToFront(); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); }
async function invite(page: Page, username: string) {
  await page.getByLabel('Nome de usuário do jogador').fill(`@${username}`);
  await page.getByRole('button', { name: 'Enviar convite', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Convite enviado.' })).toBeVisible();
  await expect(page.getByRole('button', { name: `Revogar convite de ${username}`, exact: true })).toBeVisible();
}

test('convites: recusar, aceitar, lotação, remover, reingressar e revogar com três contas', async ({ page, browser }, testInfo) => {
  test.setTimeout(120000);
  const contexts = [await browser.newContext({ baseURL: 'http://localhost:3000', ...testInfo.project.use }), await browser.newContext({ baseURL: 'http://localhost:3000', ...testInfo.project.use })];
  const player = await contexts[0].newPage(), other = await contexts[1].newPage();
  const suffix = randomUUID().replaceAll('-', '').slice(0, 9), name = `Mesa ${suffix}`, problems: string[] = [];
  for (const surface of [page, player, other]) surface.on('pageerror', error => problems.push(error.message));
  try {
    const ownerSession = await register(page, `m_${suffix}`);
    const campaign = await campaignFixture(page, ownerSession, name);
    const playerSession = await register(player, `p_${suffix}`), otherSession = await register(other, `o_${suffix}`);
    await page.goto(`/campanhas/${campaign.id}`);
    await expect(page.getByRole('heading', { name: 'Membros da campanha' })).toBeVisible();
    await invite(page, playerSession.user.username);
    await player.getByRole('link', { name: 'Convites', exact: true }).click();
    await player.getByRole('button', { name: 'Recusar', exact: true }).click();
    await expect(player.getByText('Recusado', { exact: true })).toBeVisible();
    await refresh(page);
    await expect(page.getByRole('button', { name: `Revogar convite de ${playerSession.user.username}` })).toHaveCount(0);
    await invite(page, playerSession.user.username);
    await player.getByRole('link', { name: 'Início', exact: true }).click();
    await player.getByRole('button', { name: 'Aceitar convite', exact: true }).click();
    await expect(player.getByText('Aceito', { exact: true })).toBeVisible();
    await expect(player.getByRole('link', { name: `Abrir ${name}`, exact: true })).toBeVisible();
    await player.getByRole('link', { name: 'Abrir campanha', exact: true }).click();
    await expect(player.getByText('Você é jogador', { exact: true })).toBeVisible();
    await expect(player.getByText('Vontade da mesa', { exact: true })).toBeVisible();
    await expect(player.getByRole('link', { name: 'Editar campanha', exact: true })).toHaveCount(0);
    await expect(player.getByRole('button', { name: 'Enviar convite', exact: true })).toHaveCount(0);
    await expect(player.getByText('1/1 jogadores', { exact: true })).toBeVisible();
    await player.screenshot({ path: `.artifacts/${testInfo.project.name}-campanha-jogador.png`, fullPage: true });
    await refresh(page);
    await invite(page, otherSession.user.username);
    await other.getByRole('link', { name: 'Convites', exact: true }).click();
    await other.getByRole('button', { name: 'Aceitar convite', exact: true }).click();
    await expect(other.getByRole('main').getByRole('alert')).toContainText('lotada');
    await expect(other.getByText('Pendente', { exact: true })).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: `Remover jogador ${playerSession.user.username}`, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Jogador removido.' })).toBeVisible();
    await refresh(player);
    await expect(player.getByRole('main').getByRole('alert')).toHaveText('Você não tem mais acesso a esta campanha.');
    await expect(player.getByText('Vontade da mesa', { exact: true })).toHaveCount(0);
    await other.getByRole('button', { name: 'Aceitar convite', exact: true }).click();
    await other.getByRole('link', { name: 'Abrir campanha', exact: true }).click();
    await expect(other.getByText('Você é jogador', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Editar campanha', exact: true }).click();
    await page.getByLabel('Máximo de jogadores').fill('2');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Campanha salva');
    await page.goto(`/campanhas/${campaign.id}`);
    await invite(page, playerSession.user.username);
    await player.getByRole('link', { name: 'Convites', exact: true }).click();
    await expect(player.getByText('Sua participação nesta campanha foi encerrada.')).toBeVisible();
    await player.getByRole('button', { name: 'Aceitar convite', exact: true }).click();
    await expect(player.getByRole('status').filter({ hasText: 'Convite aceito.' })).toBeVisible();
    await refresh(page);
    await expect(page.getByText('2/2 jogadores', { exact: true })).toBeVisible();
    await page.screenshot({ path: `.artifacts/${testInfo.project.name}-membros-e-convites.png`, fullPage: true });
    await page.getByRole('link', { name: 'Editar campanha', exact: true }).click();
    await page.getByLabel('Máximo de jogadores').fill('1');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('jogadores');
    await expect(page.getByRole('button', { name: 'Salvar alterações', exact: true })).toBeEnabled();
    await page.getByLabel('Máximo de jogadores').fill('2');
    await expect(page.getByRole('button', { name: 'Salvar alterações', exact: true })).toBeDisabled();
    await page.getByLabel('Máximo de jogadores').fill('3');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Campanha salva');
    await page.goto(`/campanhas/${campaign.id}`);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: `Remover jogador ${otherSession.user.username}`, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Jogador removido.' })).toBeVisible();
    await refresh(other);
    await expect(other.getByRole('main').getByRole('alert')).toHaveText('Você não tem mais acesso a esta campanha.');
    await invite(page, otherSession.user.username);
    await page.getByRole('button', { name: `Revogar convite de ${otherSession.user.username}`, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Convite revogado.' })).toBeVisible();
    await other.getByRole('link', { name: 'Convites', exact: true }).click();
    await expect(other.getByText('Revogado', { exact: true })).toBeVisible();
    await expect(other.getByRole('button', { name: 'Aceitar convite', exact: true })).toHaveCount(0);
    await other.screenshot({ path: `.artifacts/${testInfo.project.name}-caixa-convites.png`, fullPage: true });
    for (const surface of [page, other]) expect(await surface.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (testInfo.project.name === 'mobile') {
      await page.setViewportSize({ width: 320, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const label of ['Início', 'Sistemas', 'Campanhas', 'Convites']) await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: label, exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('link', { name: 'Meu perfil', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: '.artifacts/convites-320px.png', fullPage: true });
      await page.locator('.sidebar').screenshot({ path: '.artifacts/navegacao-320px.png' });
    }
    const members = await pool.query('SELECT "userId", status FROM "CampaignMember" WHERE "campaignId"=$1 ORDER BY "userId"', [campaign.id]);
    expect(members.rows).toEqual([{ userId: playerSession.user.id, status: 'ACTIVE' }, { userId: otherSession.user.id, status: 'REMOVED' }].sort((a, b) => a.userId.localeCompare(b.userId)));
    const statuses = await pool.query('SELECT status FROM "CampaignInvitation" WHERE "campaignId"=$1', [campaign.id]);
    expect(statuses.rows.map(row => row.status).sort()).toEqual(['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'DECLINED', 'REVOKED']);
    expect(problems).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('caixa de convites: paginação real, expiração e recuperação de erro', async ({ page }) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 9);
  const session = await register(page, `i_${suffix}`), campaign = await campaignFixture(page, session, `Arquivo ${suffix}`);
  const inviterId = randomUUID(), inviterUsername = `a_${suffix}`;
  await pool.query('INSERT INTO "User" (id,email,username,"passwordHash","updatedAt") SELECT $1,$2,$3,"passwordHash",NOW() FROM "User" WHERE id=$4', [inviterId, `${inviterUsername}@example.test`, inviterUsername, session.user.id]); users.push(inviterId);
  await pool.query('INSERT INTO "Profile" ("userId","displayName","updatedAt") VALUES ($1,$2,NOW())', [inviterId, inviterUsername]);
  for (let n = 0; n < 21; n++) await pool.query('INSERT INTO "CampaignInvitation" (id,"campaignId","inviterId","recipientId",status,"createdAt","expiresAt") VALUES ($1,$2,$3,$4,$5,NOW() - ($6 * INTERVAL \'1 second\'),NOW() - INTERVAL \'1 day\')', [randomUUID(), campaign.id, inviterId, session.user.id, n === 0 ? 'PENDING' : 'DECLINED', n]);
  await page.route('**/api/v1/users/me/invitations?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_UNAVAILABLE', message: 'Serviço temporariamente indisponível.', requestId: 'test' } }) }));
  await page.getByRole('link', { name: 'Convites', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Serviço temporariamente indisponível.');
  await page.unroute('**/api/v1/users/me/invitations?*');
  await page.getByRole('button', { name: 'Atualizar convites', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
  await expect(page.getByText('Expirado', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aceitar convite', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByText('21 convites · Página 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(20);
});
