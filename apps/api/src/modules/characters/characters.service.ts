import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { characterValuesForDefinitionSchema, initialCharacterValues, systemDefinitionSchema, type CharacterDetail, type CharacterSummary, type CharacterValues, type CreateCharacterInput, type UpdateCharacterInput, type ListSystemsQuery } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { campaignAccess, lockCampaign, publicUser, publicUserSelect } from '../campaigns/campaign-access';

const include = { owner: { select: publicUserSelect }, campaign: { select: { id: true, name: true, ownerId: true } }, systemVersion: true } as const;
type Row = Prisma.CharacterGetPayload<{ include: typeof include }>;
function access(userId: string): Prisma.CharacterWhereInput {
  return { OR: [{ campaign: { ownerId: userId } }, { ownerId: userId, campaign: { members: { some: { userId, status: 'ACTIVE' } } } }] };
}
function summary(row: Row): CharacterSummary {
  return { id: row.id, name: row.name, description: row.description, level: row.level, revision: row.revision,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), owner: publicUser(row.owner),
    campaign: { id: row.campaign.id, name: row.campaign.name }, system: { name: row.systemVersion.name, version: row.systemVersion.number } };
}
function detail(row: Row, userId: string): CharacterDetail {
  const definition = systemDefinitionSchema.parse(row.systemVersion.definition);
  return { ...summary(row), story: row.story, systemVersionId: row.systemVersionId, definition,
    values: characterValuesForDefinitionSchema(definition).parse(row.values), canEdit: row.campaign.ownerId === userId || row.ownerId === userId };
}
function validateValues(definition: Parameters<typeof characterValuesForDefinitionSchema>[0], values: CharacterValues) {
  const parsed = characterValuesForDefinitionSchema(definition).safeParse(values);
  if (!parsed.success) throw new BadRequestException({ code: 'CHARACTER_VALUES_INVALID', message: 'Confira os valores e os campos da versão da campanha.',
    details: parsed.error.issues.map(issue => ({ field: `values.${issue.path.join('.')}`, message: issue.message })) });
  return parsed.data;
}

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, query: ListSystemsQuery, campaignId?: string) {
    if (campaignId && !await this.prisma.campaign.findFirst({ where: { id: campaignId, ...campaignAccess(userId) }, select: { id: true } })) throw new NotFoundException();
    const where: Prisma.CharacterWhereInput = { AND: [access(userId), campaignId ? { campaignId } : { ownerId: userId },
      query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {}] };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.character.findMany({ where, include, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: 20, skip: (query.page - 1) * 20 }),
      this.prisma.character.count({ where }),
    ]);
    return { items: rows.map(summary), page: query.page, pageSize: 20, total };
  }
  async detail(userId: string, id: string) {
    const row = await this.prisma.character.findFirst({ where: { id, ...access(userId) }, include });
    if (!row) throw new NotFoundException(); return detail(row, userId);
  }
  async create(userId: string, campaignId: string, input: CreateCharacterInput) {
    return this.prisma.$transaction(async db => {
      const locked = await lockCampaign(db, campaignId);
      const campaign = await db.campaign.findFirst({ where: { id: campaignId, ...campaignAccess(userId) }, include: { systemVersion: true } });
      if (!campaign) throw new NotFoundException();
      if (['ENDED', 'CANCELLED'].includes(locked.status)) throw new ConflictException({ code: 'CHARACTER_CAMPAIGN_CLOSED', message: 'Reabra a campanha para criar personagens.' });
      if (await db.character.count({ where: { ownerId: userId, campaignId } }) >= 20) throw new ConflictException({ code: 'CHARACTER_LIMIT', message: 'Você já tem 20 personagens nesta campanha.' });
      const definition = systemDefinitionSchema.parse(campaign.systemVersion.definition);
      const { values: supplied, ...settings } = input;
      const values = validateValues(definition, supplied || initialCharacterValues(definition));
      const row = await db.character.create({ data: { ...settings, values, ownerId: userId, campaignId, systemVersionId: campaign.systemVersionId,
        changes: { create: { actorId: userId, revision: 1, snapshot: { ...settings, values } } } }, include });
      return detail(row, userId);
    });
  }
  async update(userId: string, id: string, input: UpdateCharacterInput) {
    return this.prisma.$transaction(async db => {
      const target = await db.character.findUnique({ where: { id }, select: { campaignId: true } });
      if (!target) throw new NotFoundException();
      await lockCampaign(db, target.campaignId);
      const row = await db.character.findFirst({ where: { id, ...access(userId) }, include });
      if (!row) throw new NotFoundException();
      const { expectedRevision, values: supplied, ...settings } = input;
      const values = validateValues(systemDefinitionSchema.parse(row.systemVersion.definition), supplied);
      const updated = await db.character.updateMany({ where: { id, revision: expectedRevision }, data: { ...settings, values, revision: { increment: 1 } } });
      if (!updated.count) throw new ConflictException({ code: 'CHARACTER_REVISION_CONFLICT', message: 'Esta ficha foi alterada em outra aba ou pelo mestre. Carregue a versão atual antes de salvar.' });
      await db.characterChange.create({ data: { characterId: id, actorId: userId, revision: expectedRevision + 1, snapshot: { ...settings, values } } });
      const saved = await db.character.findUniqueOrThrow({ where: { id }, include }); return detail(saved, userId);
    });
  }
}
