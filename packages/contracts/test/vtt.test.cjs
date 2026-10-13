const test = require('node:test');
const assert = require('node:assert/strict');
const vtt = require('../dist');

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = { campaign: uuid(1), gm: uuid(2), player: uuid(3), session: uuid(4), scene: uuid(5), source: uuid(6), asset: uuid(7), token: uuid(8), secret: uuid(9), other: uuid(10), character: uuid(11), request: uuid(12) };
const settings = () => ({ name: 'Ruínas', description: 'Pátio compartilhado', width: 1200, height: 800, backgroundAssetId: ids.asset, grid: { type: 'SQUARE', cellSize: 50, offsetX: 0, offsetY: 0 }, scale: { pixelsPerUnit: 50, unit: 'metros' } });
const spec = () => ({ name: 'Explorador', nameVisible: true, kind: 'CHARACTER', characterId: ids.character, shape: 'CIRCLE', color: '#8a71ff', size: 50, x: 100, y: 150, visibility: 'PLAYERS', controllerIds: [ids.player] });
const context = (who = 'player') => ({
  userId: ids[who], campaign: { id: ids.campaign, ownerId: ids.gm, status: 'ACTIVE' },
  membership: who === 'player' ? { campaignId: ids.campaign, userId: ids.player, status: 'ACTIVE' } : null,
  session: { id: ids.session, campaignId: ids.campaign, status: 'LIVE' }, activeSceneInstanceId: ids.scene,
});
const table = () => ({
  campaignId: ids.campaign, sessionId: ids.session, revisions: { gm: 43, player: 7 },
  scene: { id: ids.scene, campaignId: ids.campaign, sessionId: ids.session, sourceSceneId: ids.source, sourceSceneRevision: 18, revisions: { gm: 20, player: 5 }, settings: settings(), gmNotes: 'Armadilha secreta no poço' },
  tokens: [
    { id: ids.token, campaignId: ids.campaign, sessionId: ids.session, sceneInstanceId: ids.scene, revisions: { gm: 12, player: 3 }, token: spec() },
    { id: ids.secret, campaignId: ids.campaign, sessionId: ids.session, sceneInstanceId: ids.scene, revisions: { gm: 19, player: 0 }, token: { ...spec(), name: 'Emboscada secreta', visibility: 'GM' } },
  ],
});

test('movimento rejeita concessões, identidade, audiência e ficha forjadas', () => {
  const move = { requestId: ids.request, expectedRevision: 3, x: 150, y: 200 };
  for (const [key, value] of Object.entries({ actorId: ids.gm, campaignId: ids.other, controllerIds: [ids.player], visibility: 'PLAYERS', characterId: ids.character, revision: 12 })) {
    assert.equal(vtt.vttTokenMoveSchema.safeParse({ ...move, [key]: value }).success, false, key);
  }
  for (const value of [NaN, Infinity, -Infinity, -1, 8193, '150']) {
    assert.equal(vtt.vttTokenMoveSchema.safeParse({ ...move, x: value }).success, false);
  }
});
test('UUIDs normalizados impedem controlador duplicado com caixa diferente', () => {
  const actor = 'abcdefab-abcd-4abc-8abc-abcdefabcdef';
  assert.equal(vtt.vttTokenSpecSchema.safeParse({ ...spec(), controllerIds: [actor, actor.toUpperCase()] }).success, false);
  const move = vtt.vttTokenMoveSchema.parse({ requestId: actor.toUpperCase(), expectedRevision: 0, x: 100, y: 100 });
  assert.equal(move.requestId, actor);
});
test('mapa recusa pixels excessivos, deslocamento inválido e campos secretos', () => {
  for (const patch of [
    { width: 8192, height: 8192 }, { width: 63 }, { scale: { pixelsPerUnit: 0, unit: 'm' } },
    { grid: { type: 'SQUARE', cellSize: 50, offsetX: 50, offsetY: 0 } },
    { grid: { type: 'NONE', cellSize: 50 } }, { backgroundUrl: 'https://example.com/private.png' },
  ]) assert.equal(vtt.vttSceneSettingsSchema.safeParse({ ...settings(), ...patch }).success, false);
});
test('upload aceita apenas requestId; URL, dono e dimensões não vêm do cliente', () => {
  for (const key of ['url', 'storageKey', 'ownerId', 'width', 'contentType']) {
    assert.equal(vtt.vttAssetUploadSchema.safeParse({ requestId: ids.request, [key]: 'forged' }).success, false);
  }
});
test('recibo de comando não aceita snapshot; projeção PLAYER não aceita campos GM', () => {
  const receipt = { requestId: ids.request, resourceId: ids.token, revision: 3 };
  assert.equal(vtt.vttCommandReceiptSchema.safeParse({ ...receipt, scene: table().scene }).success, false);
  const view = vtt.projectVttTable(context(), table());
  assert.equal(vtt.vttPlayerTableSchema.safeParse({ ...view, gmNotes: 'Segredo' }).success, false);
  assert.equal(vtt.vttPlayerTableSchema.safeParse({ ...view, scene: { ...view.scene, sourceSceneId: ids.source } }).success, false);
});
test('edição exige mudança e revisão; marcador não incorpora ficha', () => {
  assert.equal(vtt.vttSceneUpdateSchema.safeParse({ requestId: ids.request, expectedRevision: 1 }).success, false);
  assert.equal(vtt.vttTokenUpdateSchema.safeParse({ requestId: ids.request, token: spec() }).success, false);
  assert.equal(vtt.vttTokenSpecSchema.safeParse({ ...spec(), kind: 'MARKER' }).success, false);
});
test('limites usam o token inteiro; borda válida e coordenadas fracionárias', () => {
  assert.equal(vtt.vttTokenFitsScene(settings(), { x: 25, y: 25, size: 50 }), true);
  assert.equal(vtt.vttTokenFitsScene(settings(), { x: 1175, y: 775, size: 50 }), true);
  for (const patch of [{ x: 24 }, { y: 776 }, { size: 1300 }, { x: NaN }, { size: -1 }]) {
    assert.equal(vtt.vttTokenFitsScene(settings(), { x: 100, y: 100, size: 50, ...patch }), false);
  }
  assert.equal(vtt.vttTokenFitsScene(settings(), { x: 100.25, y: 150.75, size: 50 }), true);
});

test('mestre lê preparação; jogador ativo recebe somente a cena publicada', () => {
  const state = table();
  const gm = vtt.projectVttTable(context('gm'), state);
  const player = vtt.projectVttTable(context(), state);
  assert.equal(gm.audience, 'GM');
  assert.equal(gm.scene.tokens.length, 2);
  assert.equal(gm.scene.gmNotes, state.scene.gmNotes);
  assert.equal(player.audience, 'PLAYER');
  assert.equal(player.scene.tokens.length, 1);
  assert.equal(player.scene.tokens[0].canMove, true);
});
test('projeção do jogador não contém segredos, concessões, ficha ou revisões do mestre', () => {
  const result = vtt.projectVttTable(context(), table());
  assert.equal(result.revision, 7);
  assert.equal(result.scene.revision, 5);
  assert.equal(result.scene.tokens[0].revision, 3);
  const serialized = JSON.stringify(result);
  for (const forbidden of [ids.secret, ids.character, ids.source, ids.player, 'Armadilha', 'Emboscada', 'gmNotes', 'controllerIds', 'characterId', 'sourceSceneRevision']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});
test('alteração secreta mantém a resposta do jogador idêntica', () => {
  const state = table();
  const before = vtt.projectVttTable(context(), state);
  state.revisions.gm++;
  state.scene.revisions.gm++;
  state.scene.gmNotes = 'Outra revelação';
  state.tokens[0].revisions.gm++;
  state.tokens[0].token.characterId = ids.other;
  state.tokens[1].token.x += 100;
  state.tokens[1].revisions.gm++;
  assert.deepEqual(vtt.projectVttTable(context(), state), before);
});
test('ocultar o nome não remove o token nem revela o texto privado', () => {
  const state = table();
  state.tokens[0].token.nameVisible = false;
  state.tokens[0].token.name = 'Identidade secreta';
  const result = vtt.projectVttTable(context(), state);
  assert.equal(result.scene.tokens[0].name, null);
  assert.equal(JSON.stringify(result).includes('Identidade secreta'), false);
});
test('DTO é uma cópia: mudanças no retorno não modificam estado confirmado', () => {
  const state = table();
  const before = structuredClone(state);
  const result = vtt.projectVttTable(context('gm'), state);
  result.scene.settings.name = 'Modificado';
  result.scene.tokens[0].token.controllerIds.push(ids.other);
  assert.deepEqual(state, before);
});

for (const scenario of ['anonymous', 'outsider', 'removed', 'pending', 'wrong-member', 'wrong-campaign']) {
  test(`acesso negado para ${scenario}, mesmo conhecendo IDs e controladores`, () => {
    const ctx = context();
    if (scenario === 'anonymous') ctx.userId = null;
    if (scenario === 'outsider') ctx.membership = null;
    if (scenario === 'removed') ctx.membership.status = 'REMOVED';
    if (scenario === 'pending') ctx.membership.status = 'PENDING';
    if (scenario === 'wrong-member') ctx.membership.userId = ids.other;
    if (scenario === 'wrong-campaign') ctx.membership.campaignId = ids.other;
    const state = table();
    assert.equal(vtt.projectVttTable(ctx, state), null);
    assert.equal(vtt.canMoveVttToken(ctx, state.scene, state.tokens[0]), false);
    assert.equal(vtt.canReadVttAsset(ctx, { id: ids.asset, campaignId: ids.campaign }, state), false);
  });
}
test('privilégios de cosméticos e amizade não concedem mesa', () => {
  const ctx = { ...context('other'), isPioneer: true, fullAccess: true, friendOfOwner: true };
  assert.equal(vtt.vttRole(ctx), null);
  assert.equal(vtt.projectVttTable(ctx, table()), null);
});
test('controlador move somente token visível da cena ativa, sem herdar posse da ficha', () => {
  const state = table();
  assert.equal(vtt.canMoveVttToken(context(), state.scene, state.tokens[1]), false);
  state.tokens[0].token.controllerIds = [];
  assert.equal(vtt.canMoveVttToken(context(), state.scene, state.tokens[0]), false);
  state.tokens[0].token.controllerIds = [ids.player];
  const ctx = { ...context(), activeSceneInstanceId: ids.other };
  assert.equal(vtt.canMoveVttToken(ctx, state.scene, state.tokens[0]), false);
  assert.equal(vtt.canMoveVttToken(context('gm'), state.scene, state.tokens[1]), true);
});
test('remoção/revogação elimina acesso na consulta seguinte', () => {
  const ctx = context();
  const state = table();
  assert.equal(vtt.projectVttTable(ctx, state).scene.tokens[0].canMove, true);
  ctx.membership.status = 'REMOVED';
  assert.equal(vtt.projectVttTable(ctx, state), null);
  assert.equal(vtt.canMoveVttToken(ctx, state.scene, state.tokens[0]), false);
});
test('escopo divergente falha fechado para mestre e jogador', () => {
  for (const who of ['gm', 'player']) {
    for (const target of ['table', 'scene', 'token', 'session', 'active-scene']) {
      const ctx = context(who), state = table();
      if (target === 'table') state.campaignId = ids.other;
      if (target === 'scene') state.scene.sessionId = ids.other;
      if (target === 'token') state.tokens[0].sceneInstanceId = ids.other;
      if (target === 'session') ctx.session.campaignId = ids.other;
      if (target === 'active-scene') ctx.activeSceneInstanceId = ids.other;
      assert.equal(vtt.projectVttTable(ctx, state), null, `${who}/${target}`);
    }
  }
});
for (const status of ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED']) {
  test(`sessão ${status}: consulta e escrita respeitam o ciclo de vida`, () => {
    const state = table(), player = context(), gm = context('gm');
    player.session.status = status;
    gm.session.status = status;
    const canRead = ['LIVE', 'ENDED'].includes(status);
    assert.equal(vtt.canReadVttTable(player), canRead);
    assert.equal(vtt.canMoveVttToken(player, state.scene, state.tokens[0]), status === 'LIVE');
    assert.equal(vtt.canReadVttTable(gm), true);
    assert.equal(vtt.canManageVttScene(gm, state.scene), ['SCHEDULED', 'LIVE'].includes(status));
  });
}
test('pausa congela mesa LIVE; preparação SCHEDULED do mestre continua editável', () => {
  const state = table(), player = context(), gm = context('gm');
  player.campaign.status = 'PAUSED';
  gm.campaign.status = 'PAUSED';
  assert.equal(vtt.canReadVttTable(player), true);
  assert.equal(vtt.canMoveVttToken(player, state.scene, state.tokens[0]), false);
  assert.equal(vtt.canManageVttTable(gm), false);
  assert.equal(vtt.canEditVttSceneTemplate(gm), true);
  gm.session.status = 'SCHEDULED';
  assert.equal(vtt.canManageVttTable(gm), true);
});
test('campanha encerrada/cancelada preserva leitura autorizada e impede escrita', () => {
  for (const status of ['ENDED', 'CANCELLED']) {
    const ctx = context('gm');
    ctx.campaign.status = status;
    assert.equal(vtt.canReadVttTable(ctx), true);
    assert.equal(vtt.canEditVttSceneTemplate(ctx), false);
    assert.equal(vtt.canManageVttTable(ctx), false);
  }
});
test('biblioteca permite edição ao mestre sem sessão, sem conceder consulta de mesa', () => {
  const ctx = context('gm');
  ctx.session = null;
  assert.equal(vtt.canEditVttSceneTemplate(ctx), true);
  assert.equal(vtt.canReadVttTable(ctx), false);
  assert.equal(vtt.canManageVttTable(ctx), false);
});
test('imagem privada: jogador recebe só o fundo ativo; mestre recebe arquivos da campanha', () => {
  const state = table();
  const selected = { id: ids.asset, campaignId: ids.campaign };
  const prepared = { id: ids.other, campaignId: ids.campaign };
  assert.equal(vtt.canReadVttAsset(context(), selected, state), true);
  assert.equal(vtt.canReadVttAsset(context(), prepared, state), false);
  assert.equal(vtt.canReadVttAsset(context(), selected), false);
  assert.equal(vtt.canReadVttAsset(context('gm'), prepared), true);
  assert.equal(vtt.canReadVttAsset(context('gm'), { ...selected, campaignId: ids.other }, state), false);
});
test('mesa vazia não revela preparação e não aceita agregado inconsistente', () => {
  const state = { ...table(), scene: null, tokens: [] };
  const ctx = { ...context(), activeSceneInstanceId: null };
  assert.equal(vtt.projectVttTable(ctx, state).scene, null);
  state.tokens = table().tokens;
  assert.equal(vtt.projectVttTable(ctx, state), null);
});
