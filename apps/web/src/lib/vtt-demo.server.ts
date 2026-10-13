import 'server-only';
import { projectVttTable, type VttAccessContext, type VttTableState } from '@paralax/contracts';
import type { DemoSceneKey, DemoScenario, DemoView, VttDemoData } from './vtt-demo-types';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const campaignId = id(1), ownerId = id(2), playerId = id(3), sessionId = id(4);
const scenes = [
  { key: 'ruins' as const, name: 'Ruínas do luar', image: '/demo/moonlit-ruins.svg' },
  { key: 'crossing' as const, name: 'Travessia de jade', image: '/demo/jade-crossing.svg' },
];
function choice<T extends string>(value: string | string[] | undefined, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

/** Public, synthetic demonstration only. No campaign, user or asset is read from the database. */
export function buildVttDemo(query: Record<string, string | string[] | undefined>): VttDemoData {
  const view = choice<DemoView>(query.visao, ['GM', 'PLAYER', 'OUTSIDER'], 'GM');
  const scenario = choice<DemoScenario>(query.estado, ['ready', 'loading', 'error', 'empty', 'read-only', 'revoked', 'conflict'], 'ready');
  const sceneKey = choice<DemoSceneKey>(query.cena, ['ruins', 'crossing'], 'ruins');
  const count = query.tokens === '200' ? 200 : 25;
  const selected = scenes.find(scene => scene.key === sceneKey)!;
  const sceneId = id(sceneKey === 'ruins' ? 5 : 6);
  const settings = {
    name: selected.name, description: sceneKey === 'ruins' ? 'Uma antiga passagem entre as árvores. O luar ilumina o santuário.' : 'O rio separa dois caminhos. Uma ponte espera os aventureiros.',
    width: 1200, height: 800, backgroundAssetId: id(sceneKey === 'ruins' ? 7 : 8),
    grid: { type: 'SQUARE' as const, cellSize: 50, offsetX: 0, offsetY: 0 },
    scale: { pixelsPerUnit: 50, unit: 'metros' },
  };
  const context: VttAccessContext = {
    userId: scenario === 'revoked' ? id(10) : view === 'GM' ? ownerId : view === 'PLAYER' ? playerId : id(10),
    campaign: { id: campaignId, ownerId, status: 'ACTIVE' },
    membership: view === 'PLAYER' ? { userId: playerId, campaignId, status: scenario === 'revoked' ? 'REMOVED' : 'ACTIVE' } : null,
    session: { id: sessionId, campaignId, status: scenario === 'read-only' ? 'ENDED' : 'LIVE' },
    activeSceneInstanceId: scenario === 'empty' ? null : sceneId,
  };
  const table: VttTableState = {
    campaignId, sessionId, revisions: { gm: 43, player: 7 },
    scene: scenario === 'empty' ? null : {
      id: sceneId, campaignId, sessionId, sourceSceneId: id(30), sourceSceneRevision: 18,
      revisions: { gm: 20, player: 5 }, settings,
      gmNotes: 'Emboscada: três sentinelas atrás da passagem oeste. A chave está sob o altar.',
    },
    tokens: scenario === 'empty' ? [] : Array.from({ length: count }, (_, i) => ({
      id: id(100 + i), campaignId, sessionId, sceneInstanceId: sceneId,
      revisions: { gm: 12, player: 3 },
      token: {
        name: i === count - 1 ? 'Sentinela oculto' : ['Rook', 'Nara', 'Guardião'][i] ?? `Explorador ${i + 1}`,
        nameVisible: i !== 2, kind: 'CHARACTER' as const, characterId: id(1000 + i),
        shape: i === 2 ? 'SQUARE' as const : 'CIRCLE' as const,
        color: i < 2 ? '#bba9ff' : i === 2 ? '#e0a15b' : '#3dd6c6', size: 40,
        x: i < 3 ? [425, 575, 775][i] : 100 + (i % 20) * 50,
        y: i < 3 ? [475, 475, 625][i] : 100 + Math.floor(i / 20) * 50,
        visibility: i === count - 1 ? 'GM' as const : 'PLAYERS' as const,
        controllerIds: i < 2 ? [playerId] : [],
      },
    })),
  };
  const projection = projectVttTable(context, table);
  const canLoad = projection !== null && scenario !== 'loading' && scenario !== 'error';
  return {
    view, scenario, sceneKey, count, table: canLoad ? projection : null,
    backgroundSrc: canLoad && projection.scene ? selected.image : null,
    scenes: projection?.audience === 'GM' && canLoad ? scenes.map(scene => ({ ...scene })) : [],
  };
}
