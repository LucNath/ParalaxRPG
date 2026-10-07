import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { AuthResponse, CampaignDetail, SystemDetail } from '@paralax/contracts';

let pool: Pool;
const users: string[] = [];
test.beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/paralax') throw new Error('Use somente o banco local paralax para E2E.');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
});
test.afterEach(async () => { if (users.length) await pool.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [users.splice(0)]); });
test.afterAll(async () => { await pool?.end(); });

test('campanha: criar → versão fixa → editar → publicar → privatizar → conflito → login', async ({ page, browser }, testInfo) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10), name = `Ilhas ${suffix}`, email = `mesa_${suffix}@example.test`;
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(error.message));
  await page.goto('/cadastro');
  await page.getByLabel('Como podemos chamar você?').fill('Mestre de Aether');
  await page.getByLabel('Nome de usuário', { exact: true }).fill(`mesa_${suffix}`);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('Uma-senha-de-teste-123!');
  const registering = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.status() === 201);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  const session = await (await registering).json() as AuthResponse; users.push(session.user.id);
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('link', { name: 'Criar minha primeira campanha' })).toBeVisible();
  const systemInput = { name: `Regras ${suffix}`, description: 'Sistema privado do mestre.', visibility: 'PRIVATE', definition: { schemaVersion: 1,
    attributes: [{ id: randomUUID(), name: 'Vontade secreta', defaultValue: 3 }], skills: [], resources: [], dice: [20] } };
  const apiOptions = { headers: { Authorization: `Bearer ${session.accessToken}`, Origin: 'http://localhost:3000' } };
  const systemResponse = await page.request.post('/api/v1/systems', { ...apiOptions, data: systemInput }); expect(systemResponse.status()).toBe(201);
  const system = await systemResponse.json() as SystemDetail;
  await page.getByRole('link', { name: 'Criar minha primeira campanha' }).click();
  await expect(page.getByLabel('Sistema de RPG')).toBeVisible();
  await page.getByRole('button', { name: 'Criar campanha', exact: true }).click();
  await expect(page.getByText('Use pelo menos 2 caracteres.')).toBeVisible();
  await expect(page.getByText('Escolha um sistema.')).toBeVisible();
  await page.getByLabel('Nome da campanha', { exact: true }).fill(name);
  await page.getByLabel('Descrição', { exact: true }).fill('Uma viagem entre ilhas flutuantes.');
  await page.getByLabel('Máximo de jogadores').fill('0');
  await page.getByRole('button', { name: 'Criar campanha', exact: true }).click();
  await expect(page.getByText('Escolha pelo menos 1 jogador.')).toBeVisible();
  await page.getByLabel('Máximo de jogadores').fill('4');
  await page.getByLabel('Sistema de RPG').selectOption(system.id);
  await expect(page.getByText('Versão 1', { exact: true })).toBeVisible();
  await page.getByText('Consultar regras da versão', { exact: true }).click();
  await expect(page.getByText('Vontade secreta', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-campanha-nova.png`, fullPage: true });
  const creating = page.waitForResponse(response => response.url().endsWith('/campaigns') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar campanha', exact: true }).click();
  const created = await creating; expect(created.status()).toBe(201); const campaign = await created.json() as CampaignDetail;
  await expect(page).toHaveURL(`/campanhas/${campaign.id}`);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();

  const updatedSystem = await page.request.put(`/api/v1/systems/${system.id}`, { ...apiOptions, data: { ...systemInput, name: 'Regras modificadas', expectedRevision: 1,
    definition: { ...systemInput.definition, attributes: [{ ...systemInput.definition.attributes[0], defaultValue: 99 }] } } }); expect(updatedSystem.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Regras da campanha · versão 1' })).toBeVisible();
  await expect(page.getByText('3', { exact: true })).toBeVisible();
  await expect(page.getByText('Regras modificadas', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `.artifacts/${testInfo.project.name}-campanha-detalhe.png`, fullPage: true });

  const anonymous = await browser.newContext();
  try {
    expect((await anonymous.request.get(`http://localhost:3000/api/v1/campaigns/${campaign.id}`)).status()).toBe(404);
    expect((await anonymous.request.get('http://localhost:3000/api/v1/campaigns/mine')).status()).toBe(401);
    await page.getByRole('link', { name: 'Editar campanha', exact: true }).click();
    await page.getByLabel('Visibilidade', { exact: true }).selectOption('PUBLIC');
    await page.getByLabel('Estado da campanha').selectOption('RECRUITING');
    await page.getByLabel('Máximo de jogadores').fill('6');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByRole('status')).toHaveText('Campanha salva');
    await page.reload();
    await expect(page.getByLabel('Estado da campanha')).toHaveValue('RECRUITING');
    await expect(page.getByLabel('Máximo de jogadores')).toHaveValue('6');
    const publicPage = await anonymous.newPage();
    await publicPage.goto(`http://localhost:3000/c/${campaign.id}`);
    await expect(publicPage.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(publicPage.getByText('Recrutando', { exact: true })).toBeVisible();
    await expect(publicPage.getByText('Vontade secreta', { exact: true })).toHaveCount(0);
    expect((await anonymous.request.get(`http://localhost:3000/api/v1/systems/${system.id}`)).status()).toBe(404);
    const publicJson = await (await anonymous.request.get(`http://localhost:3000/api/v1/campaigns/${campaign.id}`)).json(); expect(publicJson.definition).toBeUndefined();
    expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await publicPage.screenshot({ path: `.artifacts/${testInfo.project.name}-campanha-publica.png`, fullPage: true });
    await page.getByRole('link', { name: 'Campanhas', exact: true }).last().click();
    await page.getByRole('button', { name: 'Campanhas públicas', exact: true }).click();
    await page.getByLabel('Buscar campanhas').fill(suffix);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await page.goto(`/campanhas/${campaign.id}/editar`);
    await page.getByLabel('Visibilidade', { exact: true }).selectOption('PRIVATE');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByRole('status')).toHaveText('Campanha salva');
    expect((await anonymous.request.get(`http://localhost:3000/api/v1/campaigns/${campaign.id}`)).status()).toBe(404);
    expect((await (await anonymous.request.get(`http://localhost:3000/api/v1/campaigns/public?search=${suffix}`)).json()).total).toBe(0);
  } finally { await anonymous.close(); }

  const second = await page.context().newPage();
  await second.goto(`/campanhas/${campaign.id}/editar`);
  await expect(second.getByLabel('Nome da campanha')).toHaveValue(name);
  await page.getByLabel('Nome da campanha').fill(`${name} revisada`);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toHaveText('Campanha salva');
  await second.getByLabel('Nome da campanha').fill('Rascunho da outra aba');
  await second.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(second.getByRole('main').getByRole('alert')).toContainText('alterada em outra aba');
  await second.getByLabel('Nome da campanha').fill('Rascunho preservado após conflito');
  await expect(second.getByLabel('Nome da campanha')).toHaveValue('Rascunho preservado após conflito');
  await expect(second.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  second.once('dialog', dialog => dialog.accept());
  await second.getByRole('button', { name: 'Carregar versão atual' }).click();
  await expect(second.getByLabel('Nome da campanha')).toHaveValue(`${name} revisada`);
  await second.close();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('Uma-senha-de-teste-123!');
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: `${name} revisada`, exact: true })).toBeVisible();
  const stored = await pool.query('SELECT "systemVersionId", "maxPlayers" FROM "Campaign" WHERE id=$1 AND "ownerId"=$2', [campaign.id, session.user.id]);
  expect(stored.rows).toEqual([{ systemVersionId: system.versionId, maxPlayers: 6 }]);
  expect(problems).toEqual([]);
});

test('seletor de regras: vazio → falha e recuperação → paginação → busca sem perder a versão escolhida', async ({ page }) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
  await page.goto('/cadastro');
  await page.getByLabel('Como podemos chamar você?').fill('Mestre de versões');
  await page.getByLabel('Nome de usuário', { exact: true }).fill(`versoes_${suffix}`);
  await page.getByLabel('E-mail', { exact: true }).fill(`versoes_${suffix}@example.test`);
  await page.getByLabel('Senha', { exact: true }).fill('Uma-senha-de-teste-123!');
  const registering = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.status() === 201);
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  const session = await (await registering).json() as AuthResponse; users.push(session.user.id);
  await expect(page).toHaveURL('/dashboard');
  await page.getByRole('link', { name: 'Criar minha primeira campanha' }).click();
  await expect(page.getByText('Você ainda não criou um sistema.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar sistema', exact: true })).toBeVisible();
  const systems: SystemDetail[] = [];
  for (let n = 0; n < 21; n++) {
    const response = await page.request.post('/api/v1/systems', { headers: { Authorization: `Bearer ${session.accessToken}`, Origin: 'http://localhost:3000' }, data: {
      name: `Regras ${suffix} ${n}`, description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [] },
    } }); expect(response.status()).toBe(201); systems.push(await response.json());
  }
  await page.route('**/api/v1/systems/mine?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_UNAVAILABLE', message: 'Serviço temporariamente indisponível.', requestId: 'test' } }) }), { times: 1 });
  await page.reload();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Serviço temporariamente indisponível.');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByLabel('Sistema de RPG').locator('option')).toHaveCount(21);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByLabel('Sistema de RPG').locator('option')).toHaveCount(2);
  await page.getByLabel('Sistema de RPG').selectOption(systems[0].id);
  await expect(page.getByText('Versão 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.getByLabel('Sistema de RPG')).toHaveValue(systems[0].id);
  await page.getByLabel('Buscar seus sistemas').fill(`Sem correspondência ${suffix}`);
  await expect(page.getByText('Nenhum sistema corresponde à busca.')).toBeVisible();
  await expect(page.getByLabel('Sistema de RPG')).toHaveValue(systems[0].id);
  await page.getByLabel('Nome da campanha').fill(`Versão mantida ${suffix}`);
  const creating = page.waitForResponse(response => response.url().endsWith('/campaigns') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar campanha', exact: true }).click();
  const response = await creating; expect(response.status()).toBe(201); const campaign = await response.json() as CampaignDetail;
  expect(campaign.systemVersionId).toBe(systems[0].versionId);
  await expect(page).toHaveURL(`/campanhas/${campaign.id}`);
  await expect(page.getByRole('heading', { name: `Versão mantida ${suffix}`, exact: true })).toBeVisible();
});
