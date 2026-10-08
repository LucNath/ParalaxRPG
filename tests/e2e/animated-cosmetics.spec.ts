import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

test('visuais animados: equipar, persistir, pausar, retomar, reduzir movimento e falha de imagem', async ({ page, browser }, testInfo) => {
  test.setTimeout(90000);
  const database = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/paralax') throw new Error('Banco local obrigatório.');
  const pool = new Pool({ connectionString: database.href });
  const username = `motion_${randomUUID().replaceAll('-', '').slice(0, 9)}`;
  let id: string | undefined;
  const origin = new URL(testInfo.project.use.baseURL!).origin;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const response = await page.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { username, email: `${username}@example.test`, displayName: 'Viajante das auroras', password: 'Uma-senha-de-teste-123!' } });
    expect(response.status()).toBe(201);
    const account = await response.json(); id = account.user.id;
    await pool.query('UPDATE "Profile" SET "allCosmeticsUnlocked"=true WHERE "userId"=$1', [id]);
    await page.goto('/perfil');
    await expect(page.getByRole('radio', { name: 'Santuário de jade', exact: true })).toBeEnabled();
    await page.getByRole('radio', { name: 'Santuário de jade', exact: true }).check();
    await page.getByRole('radio', { name: 'Órbita de jade', exact: true }).check();
    const preview = page.locator('.appearance-preview');
    await expect(preview.locator('.public-banner')).toHaveAttribute('data-animation', 'jade');
    await expect(preview.locator('.avatar-frame')).toHaveAttribute('data-animation', 'jade');
    await page.getByRole('button', { name: 'Salvar personalização', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Personalização salva.' })).toBeVisible();
    await page.reload(); await expect(page.getByRole('radio', { name: 'Santuário de jade', exact: true })).toBeChecked();
    expect((await pool.query('SELECT "backgroundId","avatarFrameId" FROM "Profile" WHERE "userId"=$1', [id])).rows[0]).toEqual({ backgroundId: 'jade-sanctuary', avatarFrameId: 'jade-orbit' });
    const visitor = await browser.newContext({ baseURL: origin, viewport: { width: testInfo.project.name === 'mobile' ? 320 : 1440, height: 900 }, reducedMotion: 'no-preference' });
    try {
      const publicPage = await visitor.newPage(); await publicPage.goto(`/u/${username}`);
      const frame = publicPage.locator('.avatar-frame'), image = publicPage.locator('.public-banner>img');
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
      await expect.poll(() => frame.evaluate(el => el.getAnimations()[0]?.playState)).toBe('running');
      const initial = await frame.evaluate(el => Number(el.getAnimations()[0].currentTime));
      await expect.poll(() => frame.evaluate(el => Number(el.getAnimations()[0].currentTime))).toBeGreaterThan(initial + 50);
      await publicPage.getByRole('button', { name: 'Pausar animações', exact: true }).click();
      await expect.poll(() => frame.evaluate(el => el.getAnimations()[0]?.playState)).toBe('paused');
      await expect.poll(() => image.evaluate(el => el.getAnimations()[0]?.playState)).toBe('paused');
      await publicPage.getByRole('button', { name: 'Retomar animações', exact: true }).click();
      await expect.poll(() => frame.evaluate(el => el.getAnimations()[0]?.playState)).toBe('running');
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await publicPage.screenshot({ path: `.artifacts/${testInfo.project.name}-jade-animado.png`, fullPage: true });
      await publicPage.emulateMedia({ reducedMotion: 'reduce' });
      await expect(publicPage.getByRole('button', { name: 'Movimento reduzido', exact: true })).toBeDisabled();
      expect(await frame.evaluate(el => el.getAnimations().length)).toBe(0);
      await publicPage.emulateMedia({ reducedMotion: 'no-preference' });
      await expect.poll(() => frame.evaluate(el => el.getAnimations()[0]?.playState)).toBe('running');
      await publicPage.route('**/art/jade-sanctuary.webp', route => route.abort());
      await publicPage.route('**/cosmetics/jade-orbit.svg', route => route.abort());
      await publicPage.reload(); await expect(image).toHaveCount(0); await expect(frame).toHaveCount(0);
      await expect(publicPage.locator('.banner-motes')).toHaveCount(0);
    } finally { await visitor.close(); }
    await page.getByRole('radio', { name: 'Cidadela das brasas', exact: true }).check();
    await page.getByRole('radio', { name: 'Coroa das brasas', exact: true }).check();
    await expect(preview.locator('.public-banner')).toHaveAttribute('data-animation', 'ember');
    await expect.poll(() => preview.locator('.public-banner>img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect.poll(() => preview.locator('.avatar-frame').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await preview.screenshot({ path: `.artifacts/${testInfo.project.name}-brasas-animado.png` });
    expect(errors).toEqual([]);
  } finally { if (id) await pool.query('DELETE FROM "User" WHERE id=$1', [id]); await pool.end(); }
});
