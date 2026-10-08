import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { GameSession, PublicGameSession, SessionSettings, UpdateSessionInput, SessionActionInput, ListSessionsQuery, ListSystemsQuery } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { campaignAccess, lockCampaign, publicUser, publicUserSelect } from '../campaigns/campaign-access';

const include = { campaign: { select: { id: true, name: true, ownerId: true, visibility: true, status: true, owner: { select: publicUserSelect }, systemVersion: { select: { name: true, number: true } } } } } as const;
type Row = Prisma.GameSessionGetPayload<{ include: typeof include }>;
const publicAccess: Prisma.GameSessionWhereInput = { status: 'LIVE', visibility: 'PUBLIC', campaign: { visibility: 'PUBLIC' } };
function presentation(row: Row) {
  return { id: row.id, title: row.title, description: row.description, scheduledAt: row.scheduledAt.toISOString(), timeZone: row.timeZone,
    campaign: { id: row.campaign.id, name: row.campaign.name }, owner: publicUser(row.campaign.owner), system: { name: row.campaign.systemVersion.name, version: row.campaign.systemVersion.number } };
}
function detail(row: Row, userId: string): GameSession {
  return { ...presentation(row), visibility: row.visibility, status: row.status, revision: row.revision,
    startedAt: row.startedAt?.toISOString() ?? null, endedAt: row.endedAt?.toISOString() ?? null, cancelledAt: row.cancelledAt?.toISOString() ?? null, durationSeconds: row.durationSeconds,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), campaign: { ...presentation(row).campaign, visibility: row.campaign.visibility, status: row.campaign.status }, canManage: row.campaign.ownerId === userId };
}
function publicDetail(row: Row): PublicGameSession { return { ...presentation(row), status: 'LIVE', startedAt: row.startedAt!.toISOString() }; }
function snapshot(row: Row): Prisma.InputJsonObject {
  return { title: row.title, description: row.description, scheduledAt: row.scheduledAt.toISOString(), timeZone: row.timeZone, visibility: row.visibility, status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null, endedAt: row.endedAt?.toISOString() ?? null, cancelledAt: row.cancelledAt?.toISOString() ?? null, durationSeconds: row.durationSeconds };
}
const search = (value: string): Prisma.GameSessionWhereInput => value ? { OR: [{ title: { contains: value, mode: 'insensitive' } }, { description: { contains: value, mode: 'insensitive' } }] } : {};
function open(status: string) { if (['ENDED', 'CANCELLED'].includes(status)) throw new ConflictException({ code: 'SESSION_CAMPAIGN_CLOSED', message: 'Reabra a campanha para agendar ou iniciar sessões.' }); }
function visibility(input: SessionSettings, campaignVisibility: string) {
  if (input.visibility === 'PUBLIC' && campaignVisibility !== 'PUBLIC') throw new ConflictException({ code: 'SESSION_PUBLIC_CAMPAIGN_REQUIRED', message: 'Uma sessão pública exige uma campanha pública. Torne a campanha pública ou escolha sessão privada.' });
}
function revision(row: Row, expected: number) { if (row.revision !== expected) throw new ConflictException({ code: 'SESSION_REVISION_CONFLICT', message: 'Esta sessão foi alterada em outra janela. Carregue a versão atual antes de tentar novamente.' }); }

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, query: ListSessionsQuery, campaignId?: string) {
    if (campaignId && !await this.prisma.campaign.findFirst({ where: { id: campaignId, ...campaignAccess(userId) }, select: { id: true } })) throw new NotFoundException();
    const where: Prisma.GameSessionWhereInput = { AND: [{ campaign: campaignAccess(userId) }, campaignId ? { campaignId } : {}, search(query.search), query.filter === 'UPCOMING' ? { status: { in: ['SCHEDULED', 'LIVE'] } } : {}] };
    const orderBy: Prisma.GameSessionOrderByWithRelationInput[] = query.filter === 'UPCOMING' ? [{ status: 'desc' }, { scheduledAt: 'asc' }, { id: 'asc' }] : [{ scheduledAt: 'desc' }, { id: 'asc' }];
    const [rows, total] = await this.prisma.$transaction([this.prisma.gameSession.findMany({ where, include, orderBy, take: 20, skip: (query.page - 1) * 20 }), this.prisma.gameSession.count({ where })]);
    return { items: rows.map(row => detail(row, userId)), page: query.page, pageSize: 20, total };
  }
  async read(userId: string, id: string) {
    const row = await this.prisma.gameSession.findFirst({ where: { id, campaign: campaignAccess(userId) }, include });
    if (!row) throw new NotFoundException(); return detail(row, userId);
  }
  async publicList(query: ListSystemsQuery) {
    const where: Prisma.GameSessionWhereInput = { AND: [publicAccess, search(query.search)] };
    const [rows, total] = await this.prisma.$transaction([this.prisma.gameSession.findMany({ where, include, orderBy: [{ startedAt: 'desc' }, { id: 'asc' }], take: 20, skip: (query.page - 1) * 20 }), this.prisma.gameSession.count({ where })]);
    return { items: rows.map(publicDetail), page: query.page, pageSize: 20, total };
  }
  async publicRead(id: string) { const row = await this.prisma.gameSession.findFirst({ where: { id, ...publicAccess }, include }); if (!row) throw new NotFoundException(); return publicDetail(row); }
  async create(userId: string, campaignId: string, input: SessionSettings) {
    return this.prisma.$transaction(async db => {
      const campaign = await lockCampaign(db, campaignId, userId); open(campaign.status);
      const config = await db.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { visibility: true } }); visibility(input, config.visibility);
      if (await db.gameSession.count({ where: { campaignId, status: 'SCHEDULED' } }) >= 100) throw new ConflictException({ code: 'SESSION_LIMIT', message: 'Esta campanha já tem 100 sessões agendadas. Cancele as agendas que não serão usadas.' });
      const row = await db.gameSession.create({ data: { ...input, scheduledAt: new Date(input.scheduledAt), campaignId }, include });
      await db.gameSessionChange.create({ data: { sessionId: row.id, actorId: userId, revision: 1, snapshot: snapshot(row) } }); return detail(row, userId);
    });
  }
  private async managed(db: Prisma.TransactionClient, userId: string, id: string) {
    const target = await db.gameSession.findUnique({ where: { id }, select: { campaignId: true } }); if (!target) throw new NotFoundException();
    const campaign = await lockCampaign(db, target.campaignId, userId);
    const row = await db.gameSession.findUniqueOrThrow({ where: { id }, include }); return { row, campaign };
  }
  async update(userId: string, id: string, input: UpdateSessionInput) {
    return this.prisma.$transaction(async db => {
      const { row, campaign } = await this.managed(db, userId, id); revision(row, input.expectedRevision);
      if (row.status !== 'SCHEDULED') throw new ConflictException({ code: 'SESSION_STATE_CONFLICT', message: 'Somente sessões agendadas podem ser editadas.' });
      open(campaign.status); visibility(input, row.campaign.visibility);
      const { expectedRevision, ...settings } = input;
      const saved = await db.gameSession.update({ where: { id }, data: { ...settings, scheduledAt: new Date(settings.scheduledAt), revision: { increment: 1 } }, include });
      await db.gameSessionChange.create({ data: { sessionId: id, actorId: userId, revision: expectedRevision + 1, snapshot: snapshot(saved) } }); return detail(saved, userId);
    });
  }
  async action(userId: string, id: string, input: SessionActionInput, action: 'start' | 'end' | 'cancel') {
    return this.prisma.$transaction(async db => {
      const { row, campaign } = await this.managed(db, userId, id);
      const target = { start: 'LIVE', end: 'ENDED', cancel: 'CANCELLED' } as const;
      if (row.status === target[action]) return detail(row, userId); // Retry of an already completed command, without new history.
      revision(row, input.expectedRevision);
      if (row.status !== (action === 'end' ? 'LIVE' : 'SCHEDULED')) throw new ConflictException({ code: 'SESSION_STATE_CONFLICT', message: 'Esta ação não é permitida no estado atual da sessão.' });
      if (action === 'start') {
        open(campaign.status);
        if (row.visibility === 'PUBLIC' && row.campaign.visibility !== 'PUBLIC') throw new ConflictException({ code: 'SESSION_PUBLIC_CAMPAIGN_REQUIRED', message: 'Edite a agenda para sessão privada ou torne a campanha pública antes de iniciar.' });
        if (await db.gameSession.count({ where: { campaignId: row.campaignId, status: 'LIVE' } })) throw new ConflictException({ code: 'SESSION_ALREADY_LIVE', message: 'Encerre a sessão ao vivo desta campanha antes de iniciar outra.' });
      }
      const now = new Date(Math.max(Date.now(), row.startedAt?.getTime() ?? 0));
      const lifecycle = action === 'start' ? { startedAt: now } : action === 'end' ? { endedAt: now, durationSeconds: Math.floor((now.getTime() - row.startedAt!.getTime()) / 1000) } : { cancelledAt: now };
      const saved = await db.gameSession.update({ where: { id }, data: { status: target[action], ...lifecycle, revision: { increment: 1 } }, include });
      await db.gameSessionChange.create({ data: { sessionId: id, actorId: userId, revision: saved.revision, snapshot: snapshot(saved) } }); return detail(saved, userId);
    });
  }
}
