import { z } from 'zod';

export const socialListSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
const socialUsername = z.string().trim().transform(value => value.replace(/^@/, '').toLowerCase()).pipe(z.string().min(3).max(30));
export const socialSearchSchema = z.object({ search: socialUsername }).strict();
export const friendRequestSchema = z.object({ username: socialUsername }).strict();
export const friendActionSchema = z.object({ action: z.enum(['accept', 'decline', 'cancel', 'remove', 'block', 'unblock']) }).strict();
export const directMessageSchema = z.object({ requestId: z.uuid(), content: z.string().trim().min(1, 'Escreva uma mensagem.').max(2000, 'Use até 2.000 caracteres.') }).strict();
export const messageListSchema = z.object({ before: z.coerce.number().int().positive().max(2147483647).optional() }).strict();
export const messageReadSchema = z.object({ sequence: z.number().int().min(0).max(2147483647) }).strict();
export type SocialListQuery = z.infer<typeof socialListSchema>;
export type SocialSearchQuery = z.infer<typeof socialSearchSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type FriendActionInput = z.infer<typeof friendActionSchema>;
export type DirectMessageInput = z.infer<typeof directMessageSchema>;
export type MessageListQuery = z.infer<typeof messageListSchema>;
export type MessageReadInput = z.infer<typeof messageReadSchema>;
export type SocialPerson = Pick<PublicProfile, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
export interface SocialConnection { id: string; person: SocialPerson; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'; incoming: boolean; blockedByMe: boolean; unread: number; lastMessage: DirectMessageItem | null }
export interface SocialConnectionsPage { items: SocialConnection[]; total: number; page: number; pageSize: number }
export interface DirectMessageItem { id: string; senderId: string; sequence: number; content: string; createdAt: string }
export interface DirectMessagesPage { items: DirectMessageItem[]; hasMore: boolean }
export interface NotificationSummary { incomingRequests: number; unreadMessages: number; unreadNotifications: number; sessionUnreadMessages: number }
interface NotificationBase { id: string; person: SocialPerson; version: number; updatedAt: string; readAt: string | null }
export type SocialNotificationItem = NotificationBase & ({ friendshipId: string; kind: 'REQUEST' | 'ACCEPTED' | 'MESSAGE' } | { kind: 'SESSION_MESSAGE'; session: { id: string; title: string } });
export interface SocialNotificationsPage { items: SocialNotificationItem[]; total: number; page: number; pageSize: number }
export const sessionMessageSchema = directMessageSchema;
export type SessionMessageInput = z.infer<typeof sessionMessageSchema>;
export interface SessionMessage { id: string; sequence: number; content: string; sender: SocialPerson; createdAt: string }
export interface SessionMessagesPage { items: SessionMessage[]; nextCursor: number | null; latestSequence: number; readSequence: number; canSend: boolean }
export const notificationReadSchema = z.object({ version: z.number().int().positive().max(2147483647) }).strict();
export type NotificationReadInput = z.infer<typeof notificationReadSchema>;

const email = z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(254);
const username = z.string().trim().toLowerCase()
  .min(3, 'Use pelo menos 3 caracteres.').max(24, 'Use até 24 caracteres.')
  .regex(/^[a-z0-9_]+$/, 'Use letras, números e sublinhado.')
  .refine(value => !['me', 'admin', 'api', 'auth', 'dashboard', 'perfil'].includes(value), 'Este nome de usuário não está disponível.');
const displayName = z.string().trim().min(2, 'Informe seu nome.').max(60, 'Use até 60 caracteres.');

export const registerSchema = z.object({
  email,
  username,
  displayName,
  password: z.string().min(10, 'Use pelo menos 10 caracteres.').max(128, 'Use até 128 caracteres.'),
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.').max(128),
}).strict();

export const updateProfileSchema = z.object({
  displayName: displayName.optional(),
  bio: z.string().trim().max(500, 'Use até 500 caracteres.').optional(),
  location: z.string().trim().max(80, 'Use até 80 caracteres.').optional(),
  backgroundId: z.string().min(1).max(60).nullable().optional(),
  avatarFrameId: z.string().min(1).max(60).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Informe uma alteração.');

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string | null;
  joinedAt: string;
  background: ProfileCosmetic | null;
  avatarFrame: ProfileCosmetic | null;
}

export interface ProfileCosmetic { id: string; name: string; category: 'BACKGROUND' | 'AVATAR_FRAME'; imageUrl: string; position: string; animation?: 'jade' | 'ember' }
export const profileCosmetics: readonly ProfileCosmetic[] = [
  { id: 'forest-refuge', name: 'Refúgio luminoso', category: 'BACKGROUND', imageUrl: '/art/luminous-forest.webp', position: 'center 55%' },
  { id: 'floating-citadel', name: 'Cidadela flutuante', category: 'BACKGROUND', imageUrl: '/art/floating-city.webp', position: 'center 48%' },
  { id: 'violet-portal', name: 'Portal violeta', category: 'AVATAR_FRAME', imageUrl: '/cosmetics/violet-portal.svg', position: 'center' },
  { id: 'dice-path', name: 'Caminho dos dados', category: 'AVATAR_FRAME', imageUrl: '/cosmetics/dice-path.svg', position: 'center' },
  { id: 'jade-sanctuary', name: 'Santuário de jade', category: 'BACKGROUND', imageUrl: '/art/jade-sanctuary.webp', position: 'center 50%', animation: 'jade' },
  { id: 'ember-citadel', name: 'Cidadela das brasas', category: 'BACKGROUND', imageUrl: '/art/ember-citadel.webp', position: 'center 50%', animation: 'ember' },
  { id: 'jade-orbit', name: 'Órbita de jade', category: 'AVATAR_FRAME', imageUrl: '/cosmetics/jade-orbit.svg', position: 'center', animation: 'jade' },
  { id: 'ember-crown', name: 'Coroa das brasas', category: 'AVATAR_FRAME', imageUrl: '/cosmetics/ember-crown.svg', position: 'center', animation: 'ember' },
];
export const achievementDefinitions = [
  { id: 'identity', name: 'Uma identidade na Paralax', description: 'Salve uma biografia e uma imagem de avatar.', cosmeticIds: ['violet-portal', 'jade-orbit'] },
  { id: 'first-character', name: 'Primeiro personagem', description: 'Crie sua primeira ficha de personagem.', cosmeticIds: ['forest-refuge', 'jade-sanctuary'] },
  { id: 'first-campaign', name: 'Primeira mesa', description: 'Crie sua primeira campanha.', cosmeticIds: ['floating-citadel', 'ember-citadel'] },
  { id: 'first-roll', name: 'Primeiros dados', description: 'Faça sua primeira rolagem em uma sessão ao vivo.', cosmeticIds: ['dice-path', 'ember-crown'] },
] as const;
export type AchievementId = typeof achievementDefinitions[number]['id'];
export interface AchievementItem { id: AchievementId; name: string; description: string; earnedAt: string | null; progress: 0 | 1; target: 1; rewards: ProfileCosmetic[] }
export interface AchievementsPage { items: AchievementItem[] }
export interface CosmeticsPage { items: (ProfileCosmetic & { unlocked: boolean; achievementId: AchievementId })[]; backgroundId: string | null; avatarFrameId: string | null }
export interface CurrentUser extends PublicProfile { email: string }
export interface AuthResponse { accessToken: string; expiresIn: number; user: CurrentUser }
export interface ApiErrorBody {
  error: { code: string; message: string; requestId: string; details?: { field: string; message: string }[] };
}
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const systemVisibilitySchema = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']);
const fieldName = z.string().trim().min(1, 'Informe o nome do campo.').max(50, 'Use até 50 caracteres.');
const fieldId = z.uuid();
const numberValue = z.number().int('Use um número inteiro.').min(-1000000).max(1000000);
export const systemDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  attributes: z.array(z.object({ id: fieldId, name: fieldName, defaultValue: numberValue }).strict()).max(40),
  skills: z.array(z.object({ id: fieldId, name: fieldName, defaultValue: numberValue, attributeId: fieldId.nullable() }).strict()).max(40),
  resources: z.array(z.object({ id: fieldId, name: fieldName, defaultValue: z.number().int().min(0).max(1000000), maxValue: z.number().int().min(0).max(1000000).nullable() }).strict()).max(40),
  dice: z.array(z.number().int().min(2).max(1000)).max(20),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>();
  for (const category of ['attributes', 'skills', 'resources'] as const) {
    const names = new Set<string>();
    value[category].forEach((field, index) => {
      if (ids.has(field.id)) ctx.addIssue({ code: 'custom', path: [category, index, 'id'], message: 'Cada campo precisa de um identificador único.' });
      ids.add(field.id);
      const normalized = field.name.normalize('NFKC').toLocaleLowerCase('pt-BR');
      if (names.has(normalized)) ctx.addIssue({ code: 'custom', path: [category, index, 'name'], message: 'Este nome já existe nesta categoria.' });
      names.add(normalized);
    });
  }
  const attributes = new Set(value.attributes.map(field => field.id));
  value.skills.forEach((skill, index) => {
    if (skill.attributeId && !attributes.has(skill.attributeId)) ctx.addIssue({ code: 'custom', path: ['skills', index, 'attributeId'], message: 'Escolha um atributo deste sistema.' });
  });
  value.resources.forEach((resource, index) => {
    if (resource.maxValue !== null && resource.defaultValue > resource.maxValue) ctx.addIssue({ code: 'custom', path: ['resources', index, 'defaultValue'], message: 'O valor inicial não pode exceder o máximo.' });
  });
  if (new Set(value.dice).size !== value.dice.length) ctx.addIssue({ code: 'custom', path: ['dice'], message: 'Cada tipo de dado deve aparecer uma vez.' });
});
export const createSystemSchema = z.object({
  name: z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(80, 'Use até 80 caracteres.'),
  description: z.string().trim().max(2000, 'Use até 2000 caracteres.'),
  visibility: systemVisibilitySchema,
  definition: systemDefinitionSchema,
}).strict();
export const updateSystemSchema = createSystemSchema.extend({ expectedRevision: z.number().int().min(1).max(2147483646) }).strict();
export const listSystemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  search: z.string().trim().max(80).default(''),
}).strict();
export type SystemDefinition = z.infer<typeof systemDefinitionSchema>;
export type CreateSystemInput = z.infer<typeof createSystemSchema>;
export type UpdateSystemInput = z.infer<typeof updateSystemSchema>;
export type ListSystemsQuery = z.infer<typeof listSystemsQuerySchema>;
export type SystemVisibility = z.infer<typeof systemVisibilitySchema>;
export interface SystemSummary {
  id: string; name: string; description: string; visibility: SystemVisibility; revision: number;
  createdAt: string; updatedAt: string;
  owner: { id: string; username: string; displayName: string };
}
export interface SystemDetail extends SystemSummary { versionId: string; definition: SystemDefinition }
export interface SystemsPage { items: SystemSummary[]; page: number; pageSize: number; total: number }

export const campaignVisibilitySchema = z.enum(['PRIVATE', 'PUBLIC']);
export const campaignStatusSchema = z.enum(['PLANNED', 'RECRUITING', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED']);
export const campaignStatusLabels = { PLANNED: 'Planejada', RECRUITING: 'Recrutando', ACTIVE: 'Em andamento', PAUSED: 'Pausada', ENDED: 'Finalizada', CANCELLED: 'Cancelada' } as const;
export const campaignVisibilityLabels = { PRIVATE: 'Privada', PUBLIC: 'Pública' } as const;
export const campaignSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(80, 'Use até 80 caracteres.'),
  description: z.string().trim().max(4000, 'Use até 4000 caracteres.'),
  visibility: campaignVisibilitySchema,
  status: campaignStatusSchema,
  maxPlayers: z.number().int('Use um número inteiro.').min(1, 'Escolha pelo menos 1 jogador.').max(20, 'Use até 20 jogadores.'),
}).strict();
export const createCampaignSchema = campaignSettingsSchema.extend({ systemVersionId: z.uuid('Escolha um sistema.') }).strict();
export const updateCampaignSchema = campaignSettingsSchema.extend({ expectedRevision: z.number().int().min(1).max(2147483646) }).strict();
export const listCampaignsQuerySchema = listSystemsQuerySchema;
export type CampaignSettings = z.infer<typeof campaignSettingsSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type CampaignVisibility = z.infer<typeof campaignVisibilitySchema>;
export interface CampaignSummary extends CampaignSettings {
  id: string; revision: number; createdAt: string; updatedAt: string;
  owner: { id: string; username: string; displayName: string };
  system: { name: string; version: number };
}
export interface CampaignDetail extends CampaignSummary { systemVersionId: string; definition: SystemDefinition; role: 'OWNER' | 'PLAYER' }
export interface CampaignsPage { items: CampaignSummary[]; page: number; pageSize: number; total: number }

export const createInvitationSchema = z.object({ username: z.string().trim().toLowerCase().transform(value => value.replace(/^@/, '')).pipe(username) }).strict();
export const invitationStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED']);
export const invitationStatusLabels = { PENDING: 'Pendente', ACCEPTED: 'Aceito', DECLINED: 'Recusado', REVOKED: 'Revogado', EXPIRED: 'Expirado' } as const;
export const listInvitationsQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type ListInvitationsQuery = z.infer<typeof listInvitationsQuerySchema>;
export interface CampaignInvitation {
  id: string; status: InvitationStatus; createdAt: string; expiresAt: string; respondedAt: string | null; recipientIsMember: boolean;
  campaign: { id: string; name: string };
  inviter: { id: string; username: string; displayName: string };
  recipient: { id: string; username: string; displayName: string };
}
export interface InvitationsPage { items: CampaignInvitation[]; page: number; pageSize: number; total: number }
export interface CampaignMember {
  user: { id: string; username: string; displayName: string };
  role: 'OWNER' | 'PLAYER'; joinedAt: string;
}
export interface CampaignMembers { items: CampaignMember[]; playerCount: number; maxPlayers: number }

const characterFieldValue = z.object({ fieldId: fieldId, value: numberValue }).strict();
export const characterValuesSchema = z.object({
  attributes: z.array(characterFieldValue).max(40), skills: z.array(characterFieldValue).max(40), resources: z.array(characterFieldValue).max(40),
}).strict().superRefine((values, ctx) => {
  const ids = new Set<string>();
  for (const category of ['attributes', 'skills', 'resources'] as const) values[category].forEach((entry, index) => {
    if (ids.has(entry.fieldId)) ctx.addIssue({ code: 'custom', path: [category, index, 'fieldId'], message: 'Cada campo deve aparecer uma única vez.' });
    ids.add(entry.fieldId);
  });
});
export const characterSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(80, 'Use até 80 caracteres.'),
  description: z.string().trim().max(2000, 'Use até 2000 caracteres.'),
  story: z.string().trim().max(4000, 'Use até 4000 caracteres.'),
  level: z.number().int('Use um nível inteiro.').min(1, 'Use um nível positivo.').max(1000000).nullable(),
}).strict();
export const createCharacterSchema = characterSettingsSchema.extend({ values: characterValuesSchema.optional() }).strict();
export const updateCharacterSchema = characterSettingsSchema.extend({ values: characterValuesSchema, expectedRevision: z.number().int().min(1).max(2147483646) }).strict();
export const listCharactersQuerySchema = listSystemsQuerySchema;
export type CharacterValues = z.infer<typeof characterValuesSchema>;
export type CharacterSettings = z.infer<typeof characterSettingsSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export function initialCharacterValues(definition: SystemDefinition): CharacterValues {
  return Object.fromEntries((['attributes', 'skills', 'resources'] as const).map(category => [category, definition[category].map(field => ({ fieldId: field.id, value: field.defaultValue }))])) as CharacterValues;
}
export function characterValuesForDefinitionSchema(definition: SystemDefinition) {
  return characterValuesSchema.superRefine((values, ctx) => {
    for (const category of ['attributes', 'skills', 'resources'] as const) {
      const allowed = new Map(definition[category].map(field => [field.id, field]));
      const received = new Set(values[category].map(entry => entry.fieldId));
      if (definition[category].some(field => !received.has(field.id))) ctx.addIssue({ code: 'custom', path: [category], message: 'Preencha todos os campos da versão da campanha.' });
      values[category].forEach((entry, index) => {
        const field = allowed.get(entry.fieldId);
        if (!field) ctx.addIssue({ code: 'custom', path: [category, index, 'fieldId'], message: 'Este campo não pertence a esta categoria e versão.' });
        if (category === 'resources' && field) {
          const maximum = definition.resources.find(resource => resource.id === entry.fieldId)!.maxValue;
          if (entry.value < 0 || (maximum !== null && entry.value > maximum)) ctx.addIssue({ code: 'custom', path: [category, index, 'value'], message: maximum === null ? 'Use um recurso não negativo.' : `Use um valor entre 0 e ${maximum}.` });
        }
      });
    }
  });
}
export interface CharacterSummary extends Omit<CharacterSettings, 'story'> {
  id: string; revision: number; createdAt: string; updatedAt: string;
  owner: { id: string; username: string; displayName: string };
  campaign: { id: string; name: string };
  system: { name: string; version: number };
}
export interface CharacterDetail extends CharacterSummary { story: string; systemVersionId: string; definition: SystemDefinition; values: CharacterValues; canEdit: boolean }
export interface CharactersPage { items: CharacterSummary[]; page: number; pageSize: number; total: number }

export const sessionStatusSchema = z.enum(['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED']);
export const sessionStatusLabels = { SCHEDULED: 'Agendada', LIVE: 'Ao vivo', ENDED: 'Finalizada', CANCELLED: 'Cancelada' } as const;
export const timeZoneSchema = z.string().trim().min(1).max(80).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}, 'Escolha um fuso horário válido.');
export const sessionSettingsSchema = z.object({
  title: z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(120, 'Use até 120 caracteres.'),
  description: z.string().trim().max(4000, 'Use até 4000 caracteres.'),
  scheduledAt: z.iso.datetime({ offset: true }).refine(value => Date.parse(value) >= Date.UTC(2000, 0, 1) && Date.parse(value) < Date.UTC(2101, 0, 1), 'Escolha uma data entre 2000 e 2100.'),
  timeZone: timeZoneSchema,
  visibility: campaignVisibilitySchema,
}).strict();
export const createSessionSchema = sessionSettingsSchema;
export const sessionActionSchema = z.object({ expectedRevision: z.number().int().min(1).max(2147483646) }).strict();
export const updateSessionSchema = sessionSettingsSchema.extend({ expectedRevision: sessionActionSchema.shape.expectedRevision }).strict();
export const listSessionsQuerySchema = listSystemsQuerySchema.extend({ filter: z.enum(['ALL', 'UPCOMING']).default('ALL') }).strict();
export type SessionSettings = z.infer<typeof sessionSettingsSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type SessionActionInput = z.infer<typeof sessionActionSchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export interface GameSession extends SessionSettings {
  id: string; revision: number; status: SessionStatus;
  startedAt: string | null; endedAt: string | null; cancelledAt: string | null; durationSeconds: number | null;
  createdAt: string; updatedAt: string; canManage: boolean;
  campaign: { id: string; name: string; visibility: CampaignVisibility; status: CampaignStatus };
  owner: { id: string; username: string; displayName: string };
  system: { name: string; version: number };
}
export interface SessionsPage { items: GameSession[]; page: number; pageSize: number; total: number }
export type PublicGameSession = Pick<GameSession, 'id' | 'title' | 'description' | 'scheduledAt' | 'timeZone' | 'owner' | 'system'> & { status: 'LIVE'; startedAt: string; campaign: { id: string; name: string } };
export interface PublicSessionsPage { items: PublicGameSession[]; page: number; pageSize: number; total: number }

export const createDiceRollSchema = z.object({
  requestId: z.uuid().transform(value => value.toLowerCase()),
  count: z.number().int('Use uma quantidade inteira.').min(1, 'Role pelo menos 1 dado.').max(50, 'Use até 50 dados.'),
  sides: z.number().int().min(2).max(1000),
  modifier: numberValue.default(0),
  characterId: z.uuid().transform(value => value.toLowerCase()).nullable().default(null),
  fieldId: z.uuid().transform(value => value.toLowerCase()).nullable().default(null),
}).strict().refine(value => !value.fieldId || !!value.characterId, { path: ['fieldId'], message: 'Escolha uma ficha para usar este campo.' });
export const listDiceRollsQuerySchema = z.object({ before: z.coerce.number().int().min(1).max(2147483647).optional() }).strict();
export type CreateDiceRollInput = z.infer<typeof createDiceRollSchema>;
export type ListDiceRollsQuery = z.infer<typeof listDiceRollsQuerySchema>;
export interface DiceRollCharacter {
  id: string; name: string; revision: number;
  field: { id: string; name: string; category: 'attributes' | 'skills'; value: number } | null;
}
export interface DiceRoll {
  id: string; sessionId: string; sequence: number; requestId: string; createdAt: string;
  actor: { id: string; username: string; displayName: string };
  character: DiceRollCharacter | null;
  count: number; sides: number; manualModifier: number; modifier: number; results: number[]; total: number;
}
export interface DiceRollsPage { items: DiceRoll[]; nextCursor: number | null }
export interface DiceRollOptions { dice: number[]; characters: { id: string; name: string }[] }

// Convert agenda wall time explicitly; never use the server/browser's implicit timezone.
export function sessionLocalTime(instant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const get = (kind: string) => parts.find(part => part.type === kind)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function sessionInstant(local: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !timeZoneSchema.safeParse(timeZone).success) throw new Error('Informe a data, o horário e um fuso válido.');
  const guess = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(guess) || new Date(guess).toISOString().slice(0, 16) !== local) throw new Error('Informe uma data e um horário válidos.');
  const candidates = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const probe = guess + delta;
    const offset = Date.parse(`${sessionLocalTime(new Date(probe).toISOString(), timeZone)}:00Z`) - probe;
    const candidate = guess - offset;
    if (sessionLocalTime(new Date(candidate).toISOString(), timeZone) === local) candidates.add(candidate);
  }
  if (!candidates.size) throw new Error('Este horário não existe nesse fuso devido à mudança de horário. Escolha outro horário.');
  if (candidates.size > 1) throw new Error('Este horário ocorre duas vezes nesse fuso. Escolha outro horário ou informe o instante no fuso UTC.');
  return new Date([...candidates][0]).toISOString();
}
