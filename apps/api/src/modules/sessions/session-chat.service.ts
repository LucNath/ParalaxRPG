import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionMessageInput, SessionMessage, SessionMessagesPage } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { campaignAccess, lockCampaign } from '../campaigns/campaign-access';

const senderSelect = { id: true, username: true, profile: { select: { displayName: true, avatarKey: true } } } as const;
const include = { sender: { select: senderSelect } } as const;
function message(row: Prisma.SessionMessageGetPayload<{ include: typeof include }>): SessionMessage {
  return { id: row.id, sequence: row.sequence, content: row.content, createdAt: row.createdAt.toISOString(),
    sender: { id: row.senderId, username: row.sender.username, displayName: row.sender.profile?.displayName || row.sender.username,
      avatarUrl: row.sender.profile?.avatarKey ? `/api/v1/avatars/${row.sender.profile.avatarKey}` : null } };
}
const sendAllowed = (session: { status: string; campaign: { status: string } }) =>
  ['SCHEDULED', 'LIVE'].includes(session.status) && !['ENDED', 'CANCELLED'].includes(session.campaign.status);

@Injectable()
export class SessionChatService {
  constructor(private readonly prisma: PrismaService) {}
  private async session(db: Prisma.TransactionClient, userId: string, id: string) {
    const target = await db.gameSession.findUnique({ where: { id }, select: { campaignId: true } });
    if (!target) throw new NotFoundException();
    // The same lock protects member removal and session/campaign lifecycle changes.
    await lockCampaign(db, target.campaignId);
    const session = await db.gameSession.findFirst({ where: { id, campaign: campaignAccess(userId) },
      include: { campaign: { select: { ownerId: true, status: true } }, chat: true } });
    if (!session) throw new NotFoundException();
    return session;
  }
  async list(userId: string, id: string, before?: number): Promise<SessionMessagesPage> {
    return this.prisma.$transaction(async db => {
      const session = await this.session(db, userId, id);
      const [rows, read] = await Promise.all([
        db.sessionMessage.findMany({ where: { sessionId: id, ...(before ? { sequence: { lt: before } } : {}) }, orderBy: { sequence: 'desc' }, take: 51, include }),
        db.sessionChatRead.findUnique({ where: { sessionId_userId: { sessionId: id, userId } } }),
      ]);
      const items = rows.slice(0, 50);
      return { items: items.reverse().map(message), nextCursor: rows.length > 50 ? items[0].sequence : null,
        latestSequence: session.chat?.lastSequence ?? 0, readSequence: read?.sequence ?? 0, canSend: sendAllowed(session) };
    });
  }
  async send(userId: string, id: string, input: SessionMessageInput): Promise<SessionMessage> {
    return this.prisma.$transaction(async db => {
      const session = await this.session(db, userId, id);
      const old = await db.sessionMessage.findUnique({ where: { sessionId_senderId_requestId: { sessionId: id, senderId: userId, requestId: input.requestId } }, include });
      if (old) {
        if (old.content !== input.content) throw new ConflictException({ code: 'MESSAGE_REPLAY_CONFLICT', message: 'Este envio já foi usado para outra mensagem.' });
        return message(old);
      }
      if (!sendAllowed(session)) throw new ConflictException({ code: 'SESSION_CHAT_CLOSED', message: 'O envio de mensagens desta sessão está encerrado.' });
      const chat = await db.sessionChat.upsert({ where: { sessionId: id }, create: { sessionId: id, lastSequence: 1 }, update: { lastSequence: { increment: 1 } } });
      // PostgreSQL now() is the transaction start, which may precede a concurrent membership join.
      // Capture the message time after acquiring the campaign lock and checking current access.
      const saved = await db.sessionMessage.create({ data: { sessionId: id, senderId: userId, requestId: input.requestId, sequence: chat.lastSequence, content: input.content, createdAt: new Date() }, include });
      // One event per session and recipient; replaying a send never creates another event.
      await db.$executeRaw`INSERT INTO "SessionChatNotification" AS n (id, "sessionId", "recipientId", "senderId", sequence, "updatedAt")
        SELECT gen_random_uuid()::text, ${id}, audience."userId", ${userId}, ${saved.sequence}, ${saved.createdAt}
        FROM (SELECT "ownerId" AS "userId" FROM "Campaign" WHERE id = ${session.campaignId}
          UNION SELECT "userId" FROM "CampaignMember" WHERE "campaignId" = ${session.campaignId} AND status = 'ACTIVE') audience
        WHERE audience."userId" <> ${userId}
        ON CONFLICT ("sessionId", "recipientId") DO UPDATE SET "senderId" = EXCLUDED."senderId", sequence = EXCLUDED.sequence,
          version = n.version + 1, "readAt" = NULL, "updatedAt" = EXCLUDED."updatedAt"`;
      return message(saved);
    }, { maxWait: 10000, timeout: 10000 });
  }
  async read(userId: string, id: string, sequence: number) {
    await this.prisma.$transaction(async db => {
      const session = await this.session(db, userId, id);
      if (sequence > (session.chat?.lastSequence ?? 0)) throw new BadRequestException({ code: 'INVALID_READ_SEQUENCE', message: 'Esta mensagem ainda não existe.' });
      const old = await db.sessionChatRead.findUnique({ where: { sessionId_userId: { sessionId: id, userId } } });
      await db.sessionChatRead.upsert({ where: { sessionId_userId: { sessionId: id, userId } }, create: { sessionId: id, userId, sequence }, update: { sequence: Math.max(sequence, old?.sequence ?? 0) } });
      await db.$executeRaw`UPDATE "SessionChatNotification" SET "readAt" = COALESCE("readAt", CURRENT_TIMESTAMP)
        WHERE "sessionId" = ${id} AND "recipientId" = ${userId} AND "sequence" <= ${sequence}`;
    });
  }
}
