import { z } from 'zod';

/** Limits adopted for the first slice. Binary validation still belongs to the API. */
export const vttLimits = Object.freeze({
  maxUploadBytes: 3 * 1024 * 1024,
  maxImagePixels: 20_000_000,
  maxMapSide: 8192,
  maxTokenSize: 1024,
  maxControllers: 20,
  maxTokensPerScene: 200,
  maxRevision: 2147483646,
});

const id = z.uuidv4().transform(value => value.toLowerCase());
const revision = z.number().int().min(0).max(vttLimits.maxRevision);
const command = { requestId: id };
const edit = { ...command, expectedRevision: revision };
const coordinate = z.number().finite().min(0).max(vttLimits.maxMapSide);
const notes = z.string().max(10_000);

export const vttGridSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('NONE') }).strict(),
  z.object({
    type: z.literal('SQUARE'),
    cellSize: z.number().finite().min(8).max(1024),
    offsetX: z.number().finite().min(0),
    offsetY: z.number().finite().min(0),
  }).strict().refine(value => value.offsetX < value.cellSize && value.offsetY < value.cellSize,
    'Os deslocamentos devem ser menores que uma célula.'),
]);

export const vttSceneSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000),
  width: z.number().int().min(64).max(vttLimits.maxMapSide),
  height: z.number().int().min(64).max(vttLimits.maxMapSide),
  backgroundAssetId: id.nullable(),
  grid: vttGridSchema,
  scale: z.object({
    pixelsPerUnit: z.number().finite().min(0.01).max(10_000),
    unit: z.string().trim().min(1).max(24),
  }).strict(),
}).strict().refine(value => value.width * value.height <= vttLimits.maxImagePixels,
  'O mapa excede o limite de pixels.');

export const vttSceneCreateSchema = z.object({
  ...command, settings: vttSceneSettingsSchema, gmNotes: notes,
}).strict();
export const vttSceneUpdateSchema = z.object({
  ...edit, settings: vttSceneSettingsSchema.optional(), gmNotes: notes.optional(),
}).strict().refine(value => value.settings !== undefined || value.gmNotes !== undefined,
  'Informe uma alteração.');
export const vttSceneListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
}).strict();
export const vttSceneInstantiateSchema = z.object({
  ...command, sceneId: id, sceneRevision: revision,
}).strict();
export const vttSceneActivateSchema = z.object({
  ...edit, sceneInstanceId: id,
}).strict();
/** Multipart metadata only; never accept client-supplied dimensions or storage URLs. */
export const vttAssetUploadSchema = z.object(command).strict();

const controllerIds = z.array(id).max(vttLimits.maxControllers)
  .refine(value => new Set(value).size === value.length, 'Controladores duplicados.');
export const vttTokenSpecSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameVisible: z.boolean(),
  kind: z.enum(['CHARACTER', 'MARKER']),
  characterId: id.nullable(),
  shape: z.enum(['CIRCLE', 'SQUARE']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).transform(value => value.toLowerCase()),
  size: z.number().finite().min(8).max(vttLimits.maxTokenSize),
  x: coordinate,
  y: coordinate,
  visibility: z.enum(['GM', 'PLAYERS']),
  controllerIds,
}).strict().refine(value => value.kind !== 'MARKER' || value.characterId === null,
  'Um marcador não pode apontar para uma ficha.');
export const vttTokenCreateSchema = z.object({ ...command, token: vttTokenSpecSchema }).strict();
export const vttTokenUpdateSchema = z.object({ ...edit, token: vttTokenSpecSchema }).strict();
export const vttTokenMoveSchema = z.object({ ...edit, x: coordinate, y: coordinate }).strict();
export const vttTokenDeleteSchema = z.object(edit).strict();

export const vttAssetSchema = z.object({
  id, campaignId: id, contentType: z.literal('image/webp'),
  width: z.number().int().min(64).max(vttLimits.maxMapSide),
  height: z.number().int().min(64).max(vttLimits.maxMapSide),
  byteLength: z.number().int().positive().max(vttLimits.maxUploadBytes),
}).strict().refine(value => value.width * value.height <= vttLimits.maxImagePixels,
  'A imagem excede o limite de pixels.');
export const vttSceneTemplateSchema = z.object({
  id, campaignId: id, revision, settings: vttSceneSettingsSchema, gmNotes: notes,
}).strict();

const gmTokenSchema = z.object({ id, revision, token: vttTokenSpecSchema, canMove: z.boolean() }).strict();
const playerTokenSchema = z.object({
  id, revision, name: z.string().min(1).max(80).nullable(),
  shape: z.enum(['CIRCLE', 'SQUARE']), color: z.string().regex(/^#[0-9a-f]{6}$/),
  size: z.number().finite().min(8).max(vttLimits.maxTokenSize), x: coordinate, y: coordinate,
  canMove: z.boolean(),
}).strict();
const sceneView = { id, revision, settings: vttSceneSettingsSchema };
export const vttGmSceneSchema = z.object({
  ...sceneView, sourceSceneId: id, sourceSceneRevision: revision, gmNotes: notes,
  tokens: z.array(gmTokenSchema).max(vttLimits.maxTokensPerScene),
}).strict();
export const vttPlayerSceneSchema = z.object({
  ...sceneView, tokens: z.array(playerTokenSchema).max(vttLimits.maxTokensPerScene),
}).strict();
export const vttGmSceneSummarySchema = vttGmSceneSchema.omit({ tokens: true, gmNotes: true });
const page = { total: z.number().int().min(0), page: z.number().int().min(1), pageSize: z.literal(20) };
export const vttSceneTemplatePageSchema = z.object({
  ...page, items: z.array(vttSceneTemplateSchema).max(20),
}).strict();
export const vttGmScenePageSchema = z.object({
  ...page, items: z.array(vttGmSceneSummarySchema).max(20),
}).strict();

export const vttGmTableSchema = z.object({
  audience: z.literal('GM'), sessionId: id, revision,
  canManage: z.boolean(), scene: vttGmSceneSchema.nullable(),
}).strict();
export const vttPlayerTableSchema = z.object({
  audience: z.literal('PLAYER'), sessionId: id, revision,
  canManage: z.literal(false), scene: vttPlayerSceneSchema.nullable(),
}).strict();
export const vttTableSchema = z.discriminatedUnion('audience', [vttGmTableSchema, vttPlayerTableSchema]);
/** Replay returns this original receipt, never a cached privileged snapshot. */
export const vttCommandReceiptSchema = z.object({
  requestId: id, resourceId: id, revision: revision.nullable(),
}).strict();
export const vttRevisionConflictSchema = z.object({
  statusCode: z.literal(409), code: z.literal('VTT_REVISION_CONFLICT'),
  message: z.string(), currentRevision: revision,
}).strict();

export type VttSceneSettings = z.infer<typeof vttSceneSettingsSchema>;
export type VttSceneCreateInput = z.infer<typeof vttSceneCreateSchema>;
export type VttSceneUpdateInput = z.infer<typeof vttSceneUpdateSchema>;
export type VttSceneListQuery = z.infer<typeof vttSceneListSchema>;
export type VttSceneInstantiateInput = z.infer<typeof vttSceneInstantiateSchema>;
export type VttSceneActivateInput = z.infer<typeof vttSceneActivateSchema>;
export type VttAssetUploadInput = z.infer<typeof vttAssetUploadSchema>;
export type VttAsset = z.infer<typeof vttAssetSchema>;
export type VttSceneTemplate = z.infer<typeof vttSceneTemplateSchema>;
export type VttTokenSpec = z.infer<typeof vttTokenSpecSchema>;
export type VttTokenCreateInput = z.infer<typeof vttTokenCreateSchema>;
export type VttTokenUpdateInput = z.infer<typeof vttTokenUpdateSchema>;
export type VttTokenMoveInput = z.infer<typeof vttTokenMoveSchema>;
export type VttTokenDeleteInput = z.infer<typeof vttTokenDeleteSchema>;
export type VttTable = z.infer<typeof vttTableSchema>;
export type VttGmScene = z.infer<typeof vttGmSceneSchema>;
export type VttGmSceneSummary = z.infer<typeof vttGmSceneSummarySchema>;
export type VttSceneTemplatePage = z.infer<typeof vttSceneTemplatePageSchema>;
export type VttGmScenePage = z.infer<typeof vttGmScenePageSchema>;
export type VttPlayerScene = z.infer<typeof vttPlayerSceneSchema>;
export type VttCommandReceipt = z.infer<typeof vttCommandReceiptSchema>;

/** Positions are centers in map pixels; the complete token must fit inside the map. */
export function vttTokenFitsScene(settings: VttSceneSettings, token: Pick<VttTokenSpec, 'x' | 'y' | 'size'>): boolean {
  const { x, y, size } = token;
  return [x, y, size].every(Number.isFinite) && size >= 8 && size <= vttLimits.maxTokenSize
    && x - size / 2 >= 0 && y - size / 2 >= 0
    && x + size / 2 <= settings.width && y + size / 2 <= settings.height;
}
