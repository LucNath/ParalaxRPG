import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import { Pool } from 'pg';
import type { AuthResponse, SessionMessage } from '@paralax/contracts';
import { testOrigin } from './test-origin';

test('chat da mesa: notificações, histórico, texto literal, atualização, replay após encerramento e remoção', async ({ page, browser, baseURL }, info) => {
  test.setTimeout(150000);
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/paralax') throw new Error('Use somente o banco local paralax.');
  const pool = new Pool({ connectionString: url.href }), ids: string[] = [], errors: string[] = [];
  const contexts = [await browser.newContext({ ...info.project.use, baseURL }), await browser.newContext({ ...info.project.use, baseURL })];
  const player = await contexts[0].newPage(), visitor = await contexts[1].newPage();
  for (const surface of [page, player, visitor]) surface.on('pageerror', error => errors.push(error.message));
  const password = 'Uma-senha-de-teste-123!';
  const options = (account: AuthResponse) => ({ headers: { Authorization: `Bearer ${account.accessToken}`, Origin: testOrigin() } });
  async function login(surface: Page, label: string, passwordHash: string) {
    const id = randomUUID(), username = `sc_${label}_${id.replaceAll('-', '').slice(0, 8)}`; ids.push(id);
    await pool.query('INSERT INTO "User" (id,email,username,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,NOW())', [id, `${username}@example.test`, username, passwordHash]);
    await pool.query('INSERT INTO "Profile" ("userId","displayName","updatedAt") VALUES ($1,$2,NOW())', [id, `Aventureiro ${label}`]);
    await surface.goto('/entrar'); await surface.getByLabel('E-mail', { exact: true }).fill(`${username}@example.test`); await surface.getByLabel('Senha', { exact: true }).fill(password);
    const response = surface.waitForResponse(response => response.url().endsWith('/auth/login') && response.status() === 200);
    await surface.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click(); const account = await (await response).json() as AuthResponse; await expect(surface).toHaveURL('/dashboard'); return account;
  }
  try {
    const passwordHash = await hash(password), gm = await login(page, 'mestre', passwordHash), account = await login(player, 'jogador', passwordHash);
    // A full navigation rotates the browser's refresh session and revokes the earlier access token.
    for (const [surface, identity] of [[page, gm], [player, account]] as const) surface.on('response', async response => {
      if (response.url().endsWith('/auth/refresh') && response.status() === 200) identity.accessToken = (await response.json() as AuthResponse).accessToken;
    });
    const system = await (await page.request.post('/api/v1/systems', { ...options(gm), data: { name: 'Regras da mesa', description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [20] } } })).json();
    const campaign = await (await page.request.post('/api/v1/campaigns', { ...options(gm), data: { name: 'Mesa do chat', description: '', visibility: 'PUBLIC', status: 'PLANNED', maxPlayers: 2, systemVersionId: system.versionId } })).json();
    const invitation = await (await page.request.post(`/api/v1/campaigns/${campaign.id}/invitations`, { ...options(gm), data: { username: account.user.username } })).json();
    expect((await player.request.post(`/api/v1/invitations/${invitation.id}/accept`, options(account))).status()).toBe(200);
    const agenda = await page.request.post(`/api/v1/campaigns/${campaign.id}/sessions`, { ...options(gm), data: { title: 'O portal da conversa', description: '', scheduledAt: '2027-01-10T21:00:00Z', timeZone: 'America/Fortaleza', visibility: 'PUBLIC' } }); expect(agenda.status()).toBe(201); const session = await agenda.json();
    await page.goto(`/sessoes/${session.id}#chat`); await expect(page.getByLabel('Mensagem para a mesa')).toBeVisible();
    const literal = '<script>window.chatInjected=true</script> Vamos explorar o portal?';
    await page.getByLabel('Mensagem para a mesa').fill(literal); await page.getByRole('button', { name: 'Enviar para a mesa', exact: true }).click();
    await expect(page.getByLabel('Mensagem para a mesa')).toHaveValue(''); await expect(page.getByRole('list', { name: 'Mensagens da sessão' })).toContainText(literal);
    expect(await page.evaluate(() => 'chatInjected' in window)).toBe(false);
    await player.reload(); await expect(player.getByTestId('notification-count')).toHaveText('1'); await expect(player.getByTestId('friends-count')).toHaveCount(0);
    await player.getByRole('link', { name: 'Notificações', exact: true }).click(); await expect(player.getByText('O portal da conversa', { exact: true })).toBeVisible();
    await player.getByRole('button', { name: 'Marcar como vista', exact: true }).click(); await expect(player.getByTestId('notification-count')).toHaveCount(0);
    expect((await (await player.request.get('/api/v1/social/notifications/summary', options(account))).json()).sessionUnreadMessages).toBe(1);
    await player.getByRole('button', { name: 'Abrir chat da sessão', exact: true }).click(); await expect(player).toHaveURL(`/sessoes/${session.id}#chat`);
    await expect(player.getByRole('heading', { name: 'Chat da sessão', exact: true })).toBeInViewport();
    await expect(player.getByRole('list', { name: 'Mensagens da sessão' })).toContainText(literal);
    await expect.poll(async () => (await (await player.request.get('/api/v1/social/notifications/summary', options(account))).json()).sessionUnreadMessages).toBe(0);
    await player.getByLabel('Mensagem para a mesa').fill('Eu preparo os dados.'); await player.getByRole('button', { name: 'Enviar para a mesa', exact: true }).click(); await expect(player.getByLabel('Mensagem para a mesa')).toHaveValue('');
    // No reload/manual update: the other participant receives the next visible poll.
    await page.bringToFront(); await expect(page.getByRole('list', { name: 'Mensagens da sessão' })).toContainText('Eu preparo os dados.', { timeout: 15000 });
    await page.getByRole('button', { name: 'Iniciar sessão', exact: true }).click(); await expect(page.getByRole('main').getByText('Ao vivo', { exact: true })).toBeVisible();
    await visitor.goto(`/ao-vivo/${session.id}`); await expect(visitor.getByRole('heading', { name: session.title, exact: true })).toBeVisible(); await expect(visitor.getByRole('heading', { name: 'Chat da sessão', exact: true })).toHaveCount(0);
    expect((await visitor.request.get(`/api/v1/sessions/${session.id}/messages`)).status()).toBe(401);
    let ambiguous: SessionMessage | undefined;
    await player.route(`**/api/v1/sessions/${session.id}/messages`, async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const response = await route.fetch(); expect(response.status()).toBe(201); ambiguous = await response.json() as SessionMessage; await route.abort('failed');
    });
    await player.getByLabel('Mensagem para a mesa').fill('Minha ação foi registrada uma única vez.'); await player.getByRole('button', { name: 'Enviar para a mesa', exact: true }).click();
    await expect(player.getByRole('button', { name: 'Reenviar mesma mensagem', exact: true })).toBeEnabled(); expect(ambiguous).toBeDefined(); await expect(player.getByLabel('Mensagem para a mesa')).toBeDisabled();
    await player.unroute(`**/api/v1/sessions/${session.id}/messages`);
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Encerrar sessão', exact: true }).click(); await expect(page.getByRole('main').getByText('Finalizada', { exact: true })).toBeVisible();
    await player.getByRole('button', { name: 'Atualizar chat', exact: true }).click(); await player.getByRole('button', { name: 'Reenviar mesma mensagem', exact: true }).click();
    await expect(player.getByLabel('Mensagem para a mesa')).toHaveCount(0); expect((await pool.query('SELECT id FROM "SessionMessage" WHERE "sessionId"=$1', [session.id])).rowCount).toBe(3);
    await player.reload(); await expect(player.getByRole('list', { name: 'Mensagens da sessão' }).getByRole('listitem')).toHaveCount(3);
    // Populate older local history to exercise the real cursor and browser layout.
    await pool.query(`INSERT INTO "SessionMessage" (id,"sessionId","senderId","requestId",sequence,content) SELECT gen_random_uuid()::text,$1,$2,gen_random_uuid()::text,n,'Histórico local '||n FROM generate_series(4,55) n`, [session.id, gm.user.id]);
    await pool.query('UPDATE "SessionChat" SET "lastSequence"=55 WHERE "sessionId"=$1', [session.id]);
    await player.reload(); await expect(player.getByRole('list', { name: 'Mensagens da sessão' }).getByRole('listitem')).toHaveCount(50);
    await player.getByRole('button', { name: 'Carregar mensagens anteriores', exact: true }).click(); await expect(player.getByRole('list', { name: 'Mensagens da sessão' }).getByRole('listitem')).toHaveCount(55);
    if (info.project.name === 'mobile') await player.setViewportSize({ width: 320, height: 900 });
    expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await player.screenshot({ path: `.artifacts/${info.project.name}-chat-da-sessao.png`, fullPage: true });
    expect((await page.request.delete(`/api/v1/campaigns/${campaign.id}/members/${account.user.id}`, options(gm))).status()).toBe(204);
    await player.getByRole('button', { name: 'Atualizar chat', exact: true }).click();
    await expect(player.getByRole('main').getByRole('alert')).toHaveText('Você não tem mais acesso a esta sessão ou campanha.'); await expect(player.getByRole('list', { name: 'Mensagens da sessão' })).toHaveCount(0);
    expect((await player.request.get(`/api/v1/sessions/${session.id}/messages`, options(account))).status()).toBe(404);
    expect(errors).toEqual([]);
  } finally { await page.close(); await Promise.all(contexts.map(context => context.close())); if (ids.length) await pool.query('DELETE FROM "User" WHERE id = ANY($1::text[])', [ids]); await pool.end(); }
});
