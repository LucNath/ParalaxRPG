import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { systemDefinitionSchema, type CampaignDetail, type CampaignSummary, type CreateCampaignInput, type UpdateCampaignInput, type ListSystemsQuery } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { campaignAccess, lockCampaign } from './campaign-access';
import { grantAchievement } from '../users/achievements';

const include = { owner: { select: { id: true, username: true, profile: { select: { displayName: true } } } }, systemVersion: true } as const;
type Row = Prisma.CampaignGetPayload<{ include: typeof include }>;
function summary(row: Row): CampaignSummary {
  return { id: row.id, name: row.name, description: row.description, visibility: row.visibility, status: row.status, maxPlayers: row.maxPlayers,
    revision: row.revision, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    owner: { id: row.owner.id, username: row.owner.username, displayName: row.owner.profile?.displayName || row.owner.username },
    system: { name: row.systemVersion.name, version: row.systemVersion.number } };
}

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSystemsQuery, ownerId?: string) {
    const where: Prisma.CampaignWhereInput = { AND: [ownerId ? campaignAccess(ownerId) : { visibility: 'PUBLIC' },
      query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }] } : {}] };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({ where, include, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * 20, take: 20 }),
      this.prisma.campaign.count({ where }),
    ]);
    return { items: rows.map(summary), page: query.page, pageSize: 20, total };
  }

  private async read(db: Prisma.TransactionClient, id: string, ownerId: string): Promise<CampaignDetail> {
    const row = await db.campaign.findFirst({ where: { id, ...campaignAccess(ownerId) }, include });
    if (!row) throw new NotFoundException();
    return { ...summary(row), systemVersionId: row.systemVersionId, definition: systemDefinitionSchema.parse(row.systemVersion.definition), role: row.ownerId === ownerId ? 'OWNER' : 'PLAYER' };
  }

  detail(id: string, ownerId: string) { return this.read(this.prisma, id, ownerId); }

  async publicDetail(id: string): Promise<CampaignSummary> {
    const row = await this.prisma.campaign.findFirst({ where: { id, visibility: 'PUBLIC' }, include });
    if (!row) throw new NotFoundException();
    // The campaign's presentation never grants public access to its system definition.
    return summary(row);
  }

  async create(ownerId: string, input: CreateCampaignInput) {
    const { systemVersionId, ...settings } = input;
    return this.prisma.$transaction(async db => {
      const version = await db.systemVersion.findFirst({ where: { id: systemVersionId, system: { ownerId } }, select: { id: true } });
      if (!version) throw new NotFoundException({ code: 'CAMPAIGN_SYSTEM_UNAVAILABLE', message: 'Escolha uma versão de um sistema criado por você.' });
      const row = await db.campaign.create({ data: { ownerId, systemVersionId, ...settings,
        changes: { create: { revision: 1, actorId: ownerId, snapshot: { ...settings, systemVersionId } } } } });
      await grantAchievement(db, ownerId, 'first-campaign');
      return this.read(db, row.id, ownerId);
    });
  }

  async update(ownerId: string, id: string, input: UpdateCampaignInput) {
    const { expectedRevision, ...settings } = input;
    return this.prisma.$transaction(async db => {
      await lockCampaign(db, id, ownerId);
      if (['ENDED', 'CANCELLED'].includes(settings.status) && await db.gameSession.count({ where: { campaignId: id, status: 'LIVE' } })) throw new ConflictException({ code: 'CAMPAIGN_LIVE_SESSION', message: 'Encerre a sessão ao vivo antes de finalizar ou cancelar a campanha.' });
      const activePlayers = await db.campaignMember.count({ where: { campaignId: id, status: 'ACTIVE' } });
      if (settings.maxPlayers < activePlayers) throw new ConflictException({ code: 'CAMPAIGN_CAPACITY_CONFLICT', message: 'A capacidade não pode ser menor que a quantidade atual de jogadores.' });
      const updated = await db.campaign.updateMany({ where: { id, ownerId, revision: expectedRevision }, data: { ...settings, revision: { increment: 1 } } });
      if (!updated.count) throw new ConflictException({ code: 'CAMPAIGN_REVISION_CONFLICT', message: 'Esta campanha foi alterada em outra aba. Carregue a versão atual antes de salvar.' });
      await db.campaignChange.create({ data: { campaignId: id, revision: expectedRevision + 1, actorId: ownerId, snapshot: settings } });
      return this.read(db, id, ownerId);
    });
  }
}
