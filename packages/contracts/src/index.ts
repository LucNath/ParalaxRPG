import { z } from 'zod';

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
}).strict().refine(value => Object.keys(value).length > 0, 'Informe uma alteração.');

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string | null;
  joinedAt: string;
}
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
export interface CampaignDetail extends CampaignSummary { systemVersionId: string; definition: SystemDefinition }
export interface CampaignsPage { items: CampaignSummary[]; page: number; pageSize: number; total: number }
