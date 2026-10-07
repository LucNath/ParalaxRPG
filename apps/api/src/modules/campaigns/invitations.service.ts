import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CampaignInvitation, CampaignMembers, CreateInvitationInput, ListInvitationsQuery } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { campaignAccess, lockCampaign, publicUser, publicUserSelect } from './campaign-access';

const invitationInclude = { campaign: { select: { id: true, name: true, members: { where: { status: 'ACTIVE' as const }, select: { userId: true } } } }, inviter: { select: publicUserSelect }, recipient: { select: publicUserSelect } } as const;
type InvitationRow = Prisma.CampaignInvitationGetPayload<{ include: typeof invitationInclude }>;
function dto(row: InvitationRow): CampaignInvitation {
  return { id: row.id, status: row.status === 'PENDING' && row.expiresAt <= new Date() ? 'EXPIRED' : row.status,
    createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(), respondedAt: row.respondedAt?.toISOString() || null,
    recipientIsMember: row.campaign.members.some(member => member.userId === row.recipientId),
    campaign: { id: row.campaign.id, name: row.campaign.name }, inviter: publicUser(row.inviter), recipient: publicUser(row.recipient) };
}
function pending(row: InvitationRow) {
  if (row.status !== 'PENDING') throw new ConflictException({ code: 'INVITATION_ALREADY_RESOLVED', message: 'Este convite já foi respondido ou revogado.' });
  if (row.expiresAt <= new Date()) throw new ConflictException({ code: 'INVITATION_EXPIRED', message: 'Este convite expirou. Peça um novo convite ao mestre.' });
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListInvitationsQuery, campaignId?: string) {
    const where: Prisma.CampaignInvitationWhereInput = campaignId ? { campaignId } : { recipientId: userId };
    if (campaignId && !await this.prisma.campaign.findFirst({ where: { id: campaignId, ownerId: userId }, select: { id: true } })) throw new NotFoundException();
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.campaignInvitation.findMany({ where, include: invitationInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (query.page - 1) * 20, take: 20 }),
      this.prisma.campaignInvitation.count({ where }),
    ]);
    return { items: rows.map(dto), page: query.page, pageSize: 20, total };
  }

  async create(ownerId: string, campaignId: string, input: CreateInvitationInput) {
    return this.prisma.$transaction(async db => {
      const campaign = await lockCampaign(db, campaignId, ownerId);
      if (['ENDED', 'CANCELLED'].includes(campaign.status)) throw new ConflictException({ code: 'CAMPAIGN_CLOSED', message: 'Reabra a campanha antes de convidar jogadores.' });
      const recipient = await db.user.findUnique({ where: { username: input.username }, select: { id: true } });
      if (!recipient) throw new NotFoundException({ code: 'INVITATION_USER_UNAVAILABLE', message: 'Não encontramos essa conta. Confira o nome de usuário.' });
      if (recipient.id === ownerId) throw new BadRequestException({ code: 'INVITATION_SELF', message: 'Você já é o mestre desta campanha.' });
      if (await db.campaignMember.findFirst({ where: { campaignId, userId: recipient.id, status: 'ACTIVE' }, select: { id: true } })) throw new ConflictException({ code: 'ALREADY_CAMPAIGN_MEMBER', message: 'Essa pessoa já participa da campanha.' });
      const now = new Date();
      await db.campaignInvitation.updateMany({ where: { campaignId, status: 'PENDING', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } });
      if (await db.campaignInvitation.findFirst({ where: { campaignId, recipientId: recipient.id, status: 'PENDING' }, select: { id: true } })) throw new ConflictException({ code: 'INVITATION_PENDING', message: 'Essa pessoa já tem um convite pendente para a campanha.' });
      if (await db.campaignInvitation.count({ where: { campaignId, status: 'PENDING' } }) >= 50) throw new ConflictException({ code: 'INVITATION_LIMIT', message: 'Revogue convites pendentes antes de enviar novos.' });
      return dto(await db.campaignInvitation.create({ data: { campaignId, inviterId: ownerId, recipientId: recipient.id, expiresAt: new Date(now.getTime() + 7 * 86400000) }, include: invitationInclude }));
    });
  }

  async respond(userId: string, id: string, action: 'ACCEPTED' | 'DECLINED') {
    return this.prisma.$transaction(async db => {
      const target = await db.campaignInvitation.findFirst({ where: { id, recipientId: userId }, select: { campaignId: true } });
      if (!target) throw new NotFoundException();
      const campaign = await lockCampaign(db, target.campaignId);
      const invitation = await db.campaignInvitation.findFirst({ where: { id, recipientId: userId }, include: invitationInclude });
      if (!invitation) throw new NotFoundException();
      if (invitation.status === action) {
        if (action === 'DECLINED' || await db.campaignMember.findFirst({ where: { campaignId: campaign.id, userId, status: 'ACTIVE' }, select: { id: true } })) return dto(invitation);
      }
      pending(invitation);
      if (action === 'ACCEPTED') {
        if (['ENDED', 'CANCELLED'].includes(campaign.status)) throw new ConflictException({ code: 'CAMPAIGN_CLOSED', message: 'Esta campanha está encerrada. Peça ao mestre para reabri-la.' });
        const member = await db.campaignMember.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId } } });
        if (member?.status !== 'ACTIVE') {
          const count = await db.campaignMember.count({ where: { campaignId: campaign.id, status: 'ACTIVE' } });
          if (count >= campaign.maxPlayers) throw new ConflictException({ code: 'CAMPAIGN_FULL', message: 'A campanha está lotada. Seu convite continua pendente.' });
          await db.campaignMember.upsert({ where: { campaignId_userId: { campaignId: campaign.id, userId } },
            create: { campaignId: campaign.id, userId }, update: { status: 'ACTIVE', removedAt: null, joinedAt: new Date() } });
        }
      }
      return dto(await db.campaignInvitation.update({ where: { id }, data: { status: action, respondedAt: new Date() }, include: invitationInclude }));
    });
  }

  async revoke(ownerId: string, campaignId: string, id: string) {
    await this.prisma.$transaction(async db => {
      await lockCampaign(db, campaignId, ownerId);
      const invitation = await db.campaignInvitation.findFirst({ where: { id, campaignId }, include: invitationInclude });
      if (!invitation) throw new NotFoundException();
      if (invitation.status === 'REVOKED') return;
      pending(invitation);
      await db.campaignInvitation.update({ where: { id }, data: { status: 'REVOKED', respondedAt: new Date() } });
    });
  }

  async members(userId: string, campaignId: string): Promise<CampaignMembers> {
    const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, ...campaignAccess(userId) }, include: {
      owner: { select: publicUserSelect }, members: { where: { status: 'ACTIVE' }, include: { user: { select: publicUserSelect } }, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
    } });
    if (!campaign) throw new NotFoundException();
    return { items: [{ user: publicUser(campaign.owner), role: 'OWNER', joinedAt: campaign.createdAt.toISOString() },
      ...campaign.members.map(member => ({ user: publicUser(member.user), role: 'PLAYER' as const, joinedAt: member.joinedAt.toISOString() }))], playerCount: campaign.members.length, maxPlayers: campaign.maxPlayers };
  }

  async remove(ownerId: string, campaignId: string, userId: string) {
    await this.prisma.$transaction(async db => {
      const campaign = await lockCampaign(db, campaignId, ownerId);
      if (userId === campaign.ownerId) throw new BadRequestException({ code: 'CAMPAIGN_OWNER_PROTECTED', message: 'O mestre não pode ser removido da própria campanha.' });
      const member = await db.campaignMember.findUnique({ where: { campaignId_userId: { campaignId, userId } } });
      if (!member) throw new NotFoundException();
      if (member.status === 'ACTIVE') await db.campaignMember.update({ where: { id: member.id }, data: { status: 'REMOVED', removedAt: new Date() } });
      await db.campaignInvitation.updateMany({ where: { campaignId, recipientId: userId, status: 'PENDING' }, data: { status: 'REVOKED', respondedAt: new Date() } });
    });
  }
}
