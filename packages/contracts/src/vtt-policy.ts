import type { CampaignStatus, SessionStatus } from './index';
import {
  vttTableSchema, vttTokenFitsScene,
  type VttSceneSettings, type VttTokenSpec, type VttTable,
} from './vtt';

/** Authoritative server state only. Never build this context from a request body. */
export interface VttAccessContext {
  userId: string | null;
  campaign: { id: string; ownerId: string; status: CampaignStatus };
  membership: { campaignId: string; userId: string; status: 'ACTIVE' | 'REMOVED' } | null;
  session: { id: string; campaignId: string; status: SessionStatus } | null;
  activeSceneInstanceId: string | null;
}
export interface VttAudienceRevisions { gm: number; player: number }
export interface VttSceneInstanceState {
  id: string;
  campaignId: string;
  sessionId: string;
  sourceSceneId: string;
  sourceSceneRevision: number;
  revisions: VttAudienceRevisions;
  settings: VttSceneSettings;
  gmNotes: string;
}
export interface VttTokenState {
  id: string;
  campaignId: string;
  sessionId: string;
  sceneInstanceId: string;
  revisions: VttAudienceRevisions;
  token: VttTokenSpec;
}
/** Internal aggregate, distinct from either audience's wire DTO. */
export interface VttTableState {
  campaignId: string;
  sessionId: string;
  revisions: VttAudienceRevisions;
  scene: VttSceneInstanceState | null;
  tokens: readonly VttTokenState[];
}

export function vttRole(context: VttAccessContext): 'GM' | 'PLAYER' | null {
  const { userId, campaign, membership, session } = context;
  if (!userId || (session && session.campaignId !== campaign.id)) return null;
  if (campaign.ownerId === userId) return 'GM';
  return membership?.campaignId === campaign.id && membership.userId === userId
    && membership.status === 'ACTIVE' ? 'PLAYER' : null;
}
function campaignOpen(context: VttAccessContext): boolean {
  return context.campaign.status !== 'ENDED' && context.campaign.status !== 'CANCELLED';
}
export function canEditVttSceneTemplate(context: VttAccessContext): boolean {
  return vttRole(context) === 'GM' && campaignOpen(context);
}
export function canReadVttTable(context: VttAccessContext): boolean {
  if (!context.session) return false;
  const role = vttRole(context);
  return role === 'GM' || (role === 'PLAYER'
    && (context.session.status === 'LIVE' || context.session.status === 'ENDED'));
}
export function canManageVttTable(context: VttAccessContext): boolean {
  return canEditVttSceneTemplate(context) && context.session !== null
    && (context.session.status === 'SCHEDULED'
      || (context.session.status === 'LIVE' && context.campaign.status !== 'PAUSED'));
}
function sceneInScope(context: VttAccessContext, scene: VttSceneInstanceState): boolean {
  return context.campaign.id === scene.campaignId && context.session?.id === scene.sessionId;
}
function tokenInScope(scene: VttSceneInstanceState, token: VttTokenState): boolean {
  return token.campaignId === scene.campaignId && token.sessionId === scene.sessionId
    && token.sceneInstanceId === scene.id;
}
export function canManageVttScene(context: VttAccessContext, scene: VttSceneInstanceState): boolean {
  return sceneInScope(context, scene) && canManageVttTable(context);
}
export function canMoveVttToken(context: VttAccessContext, scene: VttSceneInstanceState, token: VttTokenState): boolean {
  if (!sceneInScope(context, scene) || !tokenInScope(scene, token)) return false;
  if (canManageVttScene(context, scene)) return true;
  return vttRole(context) === 'PLAYER' && campaignOpen(context)
    && context.campaign.status !== 'PAUSED' && context.session?.status === 'LIVE'
    && context.activeSceneInstanceId === scene.id && token.token.visibility === 'PLAYERS'
    && context.userId !== null && token.token.controllerIds.includes(context.userId);
}
function tableInScope(context: VttAccessContext, table: VttTableState): boolean {
  return context.campaign.id === table.campaignId && context.session?.id === table.sessionId
    && context.activeSceneInstanceId === (table.scene?.id ?? null)
    && (!table.scene || sceneInScope(context, table.scene));
}
export function canReadVttAsset(
  context: VttAccessContext,
  asset: { id: string; campaignId: string },
  table: VttTableState | null = null,
): boolean {
  if (asset.campaignId !== context.campaign.id) return false;
  if (vttRole(context) === 'GM') return true;
  return table !== null && tableInScope(context, table) && canReadVttTable(context)
    && table.scene?.settings.backgroundAssetId === asset.id;
}

/** Explicit whitelist and current access check, including failures in aggregate scope. */
export function projectVttTable(context: VttAccessContext, table: VttTableState): VttTable | null {
  if (!canReadVttTable(context) || !tableInScope(context, table)) return null;
  const scene = table.scene;
  if (!scene && table.tokens.length > 0) return null;
  if (scene && table.tokens.some(token => !tokenInScope(scene, token)
    || !vttTokenFitsScene(scene.settings, token.token))) return null;
  const gm = vttRole(context) === 'GM';
  if (gm) {
    return vttTableSchema.parse({
      audience: 'GM', sessionId: table.sessionId, revision: table.revisions.gm,
      canManage: canManageVttTable(context),
      scene: scene ? {
        id: scene.id, revision: scene.revisions.gm, settings: scene.settings,
        sourceSceneId: scene.sourceSceneId, sourceSceneRevision: scene.sourceSceneRevision, gmNotes: scene.gmNotes,
        tokens: table.tokens.map(token => ({
          id: token.id, revision: token.revisions.gm, token: token.token,
          canMove: canMoveVttToken(context, scene, token),
        })),
      } : null,
    });
  }
  return vttTableSchema.parse({
    audience: 'PLAYER', sessionId: table.sessionId, revision: table.revisions.player, canManage: false,
    scene: scene ? {
      id: scene.id, revision: scene.revisions.player, settings: scene.settings,
      tokens: table.tokens.filter(token => token.token.visibility === 'PLAYERS').map(token => ({
        id: token.id, revision: token.revisions.player,
        name: token.token.nameVisible ? token.token.name : null,
        shape: token.token.shape, color: token.token.color,
        size: token.token.size, x: token.token.x, y: token.token.y,
        canMove: canMoveVttToken(context, scene, token),
      })),
    } : null,
  });
}
