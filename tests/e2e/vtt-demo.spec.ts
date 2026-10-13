import { test, expect, type Page, type Locator } from '@playwright/test';

const firstToken = '[data-token-id="00000000-0000-4000-8000-000000000100"]';
async function tokenCenter(token: Locator) {
  return token.evaluate(element => {
    const point = new DOMPoint(0, 0).matrixTransform((element as SVGGraphicsElement).getScreenCTM()!);
    return { x: point.x, y: point.y };
  });
}
test.beforeEach(async ({ page }, info) => {
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 850 });
});
async function open(page: Page, query = '') {
  await page.goto(`/mesa-demo${query}`);
  await expect(page.getByRole('heading', { name: 'Sua próxima cena.' })).toBeVisible();
}

test('mesa demo: mestre configura cena, navega pelo mapa e move com mouse e teclado', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const map = page.getByTestId('vtt-map');
  await expect(page.getByRole('heading', { name: 'Notas do mestre' })).toBeVisible();
  await expect(map.locator('[data-token-id]')).toHaveCount(25);
  await expect(page.getByLabel('Posição do marcador')).toHaveText('X 425 · Y 475');
  await page.getByRole('button', { name: 'Mover para direita', exact: true }).click();
  await expect(map.locator(firstToken)).toHaveAttribute('data-x', '475');
  await map.locator(firstToken).focus(); await page.keyboard.press('ArrowDown');
  await expect(map.locator(firstToken)).toHaveAttribute('data-y', '525');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(map.locator(firstToken)).toHaveAttribute('data-x', '474');
  const beforeSpace = await page.evaluate(() => scrollY);
  await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => scrollY)).toBe(beforeSpace);
  await expect(page.getByRole('combobox', { name: 'Marcador selecionado', exact: true })).toHaveValue('00000000-0000-4000-8000-000000000100');
  await map.scrollIntoViewIfNeeded();
  if (info.project.name === 'desktop') {
    const center = await tokenCenter(map.locator(firstToken));
    await page.mouse.move(center.x, center.y); await page.mouse.down(); await page.mouse.move(center.x + 80, center.y, { steps: 15 }); await page.mouse.up();
    await expect(map.locator(firstToken)).not.toHaveAttribute('data-x', '474');
    const box = (await map.boundingBox())!;
    const before = await map.getAttribute('data-pan-x');
    await page.mouse.move(box.x + 15, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 65, box.y + 55, { steps: 10 }); await page.mouse.up();
    await expect(map).not.toHaveAttribute('data-pan-x', before!);
  }
  const scale = Number(await map.getAttribute('data-scale'));
  await page.getByRole('button', { name: 'Aproximar mapa', exact: true }).click();
  expect(Number(await map.getAttribute('data-scale'))).toBeGreaterThan(scale);
  await map.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Home');
  await expect(page.getByRole('button', { name: 'Enquadrar mapa' })).toBeEnabled();
  await page.getByRole('button', { name: 'Centralizar marcador selecionado' }).click();
  expect(Number(await map.getAttribute('data-scale'))).toBeGreaterThanOrEqual(.85);
  await page.getByLabel('Célula em pixels').fill('0'); await page.getByRole('button', { name: 'Aplicar grade e escala' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Use uma célula');
  await page.getByLabel('Célula em pixels').fill('100'); await page.getByLabel('Pixels por unidade').fill('25'); await page.getByLabel('Unidade', { exact: true }).fill('passos');
  await page.getByLabel('Tipo de grade').selectOption('NONE'); await page.getByRole('button', { name: 'Aplicar grade e escala' }).click();
  await expect(page.getByTestId('map-grid')).toHaveCount(0); await expect(page.getByText('25 px / passos')).toBeVisible();
  await page.getByRole('link', { name: /Travessia de jade/ }).click();
  await expect(page.getByRole('heading', { name: 'Travessia de jade' })).toBeVisible();
  await expect(page.getByTestId('map-grid')).toBeVisible();
  await page.screenshot({ path: `.artifacts/${info.project.name}-mesa-demo.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('mesa demo: servidor projeta jogador e terceiro sem transmitir preparação privada', async ({ page }) => {
  const playerResponse = await page.request.get('/mesa-demo?visao=PLAYER');
  expect(playerResponse.status()).toBe(200);
  const html = await playerResponse.text();
  for (const secret of ['Emboscada: três sentinelas', 'Sentinela oculto', '00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000001000']) expect(html).not.toContain(secret);
  await open(page, '?visao=PLAYER');
  const map = page.getByTestId('vtt-map');
  await expect(map.locator('[data-token-id]')).toHaveCount(24);
  await expect(page.getByRole('heading', { name: 'Notas do mestre' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Cenas da sessão' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Marcador selecionado', exact: true }).selectOption('00000000-0000-4000-8000-000000000102');
  await expect(page.getByLabel('Posição do marcador')).toHaveText('X 775 · Y 625');
  await expect(page.getByRole('button', { name: 'Mover para direita' })).toBeDisabled();
  await map.locator('[data-token-id="00000000-0000-4000-8000-000000000102"]').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Posição do marcador')).toHaveText('X 775 · Y 625');
  await page.getByRole('combobox', { name: 'Marcador selecionado', exact: true }).selectOption('00000000-0000-4000-8000-000000000100');
  await page.getByRole('button', { name: 'Mover para direita' }).click();
  await expect(page.getByLabel('Posição do marcador')).toHaveText('X 475 · Y 475');
  await page.reload(); await expect(page.getByLabel('Posição do marcador')).toHaveText('X 425 · Y 475');
  const outsider = await page.request.get('/mesa-demo?visao=OUTSIDER');
  const outsiderHtml = await outsider.text();
  expect(outsiderHtml).not.toContain('Emboscada: três sentinelas');
  expect(outsiderHtml).not.toContain('00000000-0000-4000-8000-000000000100');
  await open(page, '?visao=OUTSIDER');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('não concede acesso');
  await expect(page.getByTestId('vtt-map')).toHaveCount(0);
});

test('mesa demo: carregamento, erro, vazio, encerramento, revogação e conflito recuperável', async ({ page }) => {
  test.setTimeout(90000);
  await open(page, '?estado=loading');
  await expect(page.getByRole('status').filter({ hasText: 'Carregando a cena' })).toBeVisible();
  await expect(page.getByTestId('vtt-map')).toHaveCount(0);
  await page.getByRole('link', { name: 'Concluir carregamento de exemplo' }).click(); await expect(page.getByTestId('vtt-map')).toBeVisible();
  await open(page, '?estado=error');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('A conexão falhou');
  await page.getByRole('link', { name: 'Tentar novamente' }).click(); await expect(page.getByTestId('vtt-map')).toBeVisible();
  await open(page, '?visao=PLAYER&estado=empty');
  await expect(page.getByText('Aguarde o mestre escolher uma cena')).toBeVisible(); await expect(page.getByTestId('vtt-map')).toHaveCount(0);
  await open(page, '?estado=empty'); await page.getByRole('link', { name: /Ruínas do luar/ }).click(); await expect(page.getByTestId('vtt-map')).toBeVisible();
  await open(page, '?estado=read-only');
  await expect(page.getByRole('button', { name: 'Mover para direita' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Aplicar grade e escala' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /Travessia de jade/ })).toHaveCount(0);
  await open(page, '?visao=PLAYER&estado=revoked');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('O mapa e os marcadores foram removidos'); await expect(page.getByTestId('vtt-map')).toHaveCount(0);
  await open(page, '?visao=PLAYER&estado=conflict');
  await page.getByRole('button', { name: 'Mover para direita' }).click(); await expect(page.getByRole('main').getByRole('alert')).toContainText('Sua tentativa não foi aplicada');
  await expect(page.getByLabel('Posição do marcador')).toHaveText('X 425 · Y 475');
  await page.getByRole('button', { name: 'Carregar posição atual' }).click(); await expect(page.getByLabel('Posição do marcador')).toHaveText('X 475 · Y 475');
  await page.getByRole('button', { name: 'Mover para direita' }).click(); await expect(page.getByLabel('Posição do marcador')).toHaveText('X 525 · Y 475');
});

test('mesa demo: 200 marcadores e fallback de imagem mantêm controles disponíveis', async ({ page }, info) => {
  await page.route('**/demo/moonlit-ruins.svg', route => route.abort());
  await open(page, '?tokens=200');
  await expect(page.getByTestId('vtt-map').locator('[data-token-id]')).toHaveCount(200);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('A imagem não carregou');
  await expect(page.getByTestId('map-grid')).toBeVisible();
  await page.unroute('**/demo/moonlit-ruins.svg');
  await page.getByRole('button', { name: 'Recarregar imagem' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mover para direita' }).click();
  await expect(page.getByLabel('Posição do marcador')).toHaveText('X 475 · Y 475');
  if (info.project.name === 'mobile') expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mesa demo: gestos de toque movem, pinçam e cancelam sem confirmar movimento', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Gestos verificados no projeto com suporte a toque.');
  await open(page, '?visao=PLAYER');
  const map = page.getByTestId('vtt-map'); await map.scrollIntoViewIfNeeded();
  const cdp = await page.context().newCDPSession(page);
  const token = map.locator(firstToken), start = await tokenCenter(token);
  const point = (x: number, y: number, id = 1) => ({ x, y, id, radiusX: 3, radiusY: 3 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(start.x, start.y)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(start.x + 25, start.y)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(token).not.toHaveAttribute('data-x', '425');
  const movedX = await token.getAttribute('data-x'), scale = Number(await map.getAttribute('data-scale'));
  const box = (await map.boundingBox())!, x = box.x + box.width / 2, y = box.y + 80;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(x - 25, y), point(x + 25, y, 2)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(x - 50, y), point(x + 50, y, 2)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(Number(await map.getAttribute('data-scale'))).toBeGreaterThan(scale);
  const next = await tokenCenter(token);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(next.x, next.y)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(next.x + 15, next.y)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(token).toHaveAttribute('data-x', movedX!);
  const restored = await tokenCenter(token);
  expect(Math.abs(restored.x - next.x)).toBeLessThan(1);
  await cdp.detach();
});
