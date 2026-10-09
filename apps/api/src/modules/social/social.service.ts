import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DirectMessageItem, DirectMessagesPage, SocialConnection, SocialConnectionsPage, SocialPerson } from '@paralax/contracts';
import { PrismaService } from '../../database/prisma.service';
import type { Friendship, Prisma, DirectMessage } from '../../generated/prisma/client';

const personSelect = { id: true, username: true, profile: { select: { displayName: true, avatarKey: true } } } satisfies Prisma.UserSelect;
function person(user: Prisma.UserGetPayload<{ select: typeof personSelect }>): SocialPerson {
  return { id: user.id, username: user.username, displayName: user.profile?.displayName || user.username,
    avatarUrl: user.profile?.avatarKey ? `/api/v1/avatars/${user.profile.avatarKey}` : null };
}
function message(row: DirectMessage): DirectMessageItem { return { id: row.id, senderId: row.senderId, sequence: row.sequence, content: row.content, createdAt: row.createdAt.toISOString() }; }
const participant = (userId: string): Prisma.FriendshipWhereInput => ({ OR: [{ lowId: userId }, { highId: userId }] });
const visible = (userId: string): Prisma.FriendshipWhereInput => ({ AND: [participant(userId), { OR: [{ status: { in: ['PENDING', 'ACCEPTED'] } }, { status: 'BLOCKED', blockedById: userId }] }] });

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}
  private notificationScope(userId: string): Prisma.SocialNotificationWhereInput {
    return { recipientId: userId, AND: [
      { friendship: participant(userId) },
      { OR: [
        { kind: 'REQUEST', friendship: { status: 'PENDING', initiatorId: { not: userId } } },
        { kind: { in: ['ACCEPTED', 'MESSAGE'] }, friendship: { status: 'ACCEPTED' } },
      ] },
    ] };
  }
  async summary(userId: string) {
    const [incomingRequests, unreadNotifications, counts] = await Promise.all([
      this.prisma.friendship.count({ where: { AND: [participant(userId), { status: 'PENDING', initiatorId: { not: userId } }] } }),
      this.prisma.socialNotification.count({ where: { AND: [this.notificationScope(userId), { readAt: null }] } }),
      this.prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "DirectMessage" m JOIN "Friendship" f ON f."id" = m."friendshipId"
        WHERE f."status" = 'ACCEPTED' AND (f."lowId" = ${userId} OR f."highId" = ${userId}) AND m."senderId" <> ${userId}
        AND m."sequence" > CASE WHEN f."lowId" = ${userId} THEN f."lowReadSequence" ELSE f."highReadSequence" END`,
    ]);
    return { incomingRequests, unreadMessages: Number(counts[0].count), unreadNotifications };
  }
  async notifications(userId: string, page: number) {
    const where = this.notificationScope(userId);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.socialNotification.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 30, take: 30,
        include: { friendship: { include: { low: { select: personSelect }, high: { select: personSelect } } } } }),
      this.prisma.socialNotification.count({ where }),
    ]);
    return { items: rows.map(row => ({ id: row.id, friendshipId: row.friendshipId, kind: row.kind, version: row.version,
      person: person(row.friendship.lowId === userId ? row.friendship.high : row.friendship.low), updatedAt: row.updatedAt.toISOString(), readAt: row.readAt?.toISOString() ?? null })), total, page, pageSize: 30 };
  }
  async notificationRead(userId: string, id: string, version: number) {
    // SQL preserves event time and compares the observed revision atomically.
    if (!await this.prisma.socialNotification.findFirst({ where: { AND: [this.notificationScope(userId), { id }] }, select: { id: true } })) throw new NotFoundException();
    await this.prisma.$executeRaw`UPDATE "SocialNotification" n SET "readAt" = COALESCE(n."readAt", CURRENT_TIMESTAMP)
      FROM "Friendship" f WHERE n."friendshipId" = f."id" AND n."id" = ${id} AND n."recipientId" = ${userId} AND n."version" = ${version}
      AND (f."lowId" = ${userId} OR f."highId" = ${userId})
      AND ((n."kind" = 'REQUEST' AND f."status" = 'PENDING' AND f."initiatorId" <> ${userId}) OR (n."kind" IN ('ACCEPTED', 'MESSAGE') AND f."status" = 'ACCEPTED'))`;
  }
  async connection(userId: string, id: string): Promise<SocialConnection> {
    return this.prisma.$transaction(async db => {
      await this.locked(db, userId, id);
      const row = await db.friendship.findFirst({ where: { AND: [visible(userId), { id }] }, include: { low: { select: personSelect }, high: { select: personSelect }, messages: { orderBy: { sequence: 'desc' }, take: 1 } } });
      if (!row) throw new NotFoundException();
      const unread = row.status === 'ACCEPTED' ? await db.directMessage.count({ where: { friendshipId: id, senderId: { not: userId }, sequence: { gt: row.lowId === userId ? row.lowReadSequence : row.highReadSequence } } }) : 0;
      return { id, person: person(row.lowId === userId ? row.high : row.low), status: row.status, incoming: row.initiatorId !== userId, blockedByMe: row.blockedById === userId, unread, lastMessage: row.status === 'ACCEPTED' && row.messages[0] ? message(row.messages[0]) : null };
    });
  }
  async search(userId: string, search: string) {
    const users = await this.prisma.user.findMany({ where: { id: { not: userId }, username: { startsWith: search },
      NOT: { OR: [{ friendshipsLow: { some: { highId: userId, status: 'BLOCKED' } } }, { friendshipsHigh: { some: { lowId: userId, status: 'BLOCKED' } } }] } },
      select: personSelect, take: 20, orderBy: { username: 'asc' } });
    return { items: users.map(person) };
  }
  async list(userId: string, page: number): Promise<SocialConnectionsPage> {
    return this.prisma.$transaction(async db => {
      const where = visible(userId);
      const [rows, total] = await Promise.all([db.friendship.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 30, take: 30,
        include: { low: { select: personSelect }, high: { select: personSelect }, messages: { orderBy: { sequence: 'desc' }, take: 1 } } }), db.friendship.count({ where })]);
      const accepted = rows.filter(row => row.status === 'ACCEPTED');
      const unreadCounts = accepted.length ? await db.directMessage.groupBy({ by: ['friendshipId'], where: { senderId: { not: userId }, OR: accepted.map(row => ({ friendshipId: row.id, sequence: { gt: row.lowId === userId ? row.lowReadSequence : row.highReadSequence } })) }, _count: { _all: true } }) : [];
      const unread = new Map(unreadCounts.map(row => [row.friendshipId, row._count._all]));
      const items = rows.map(row => ({ id: row.id, person: person(row.lowId === userId ? row.high : row.low), status: row.status,
        incoming: row.initiatorId !== userId, blockedByMe: row.blockedById === userId,
        unread: unread.get(row.id) ?? 0,
        lastMessage: row.status === 'ACCEPTED' && row.messages[0] ? message(row.messages[0]) : null } satisfies SocialConnection));
      return { items, total, page, pageSize: 30 };
    });
  }
  private async locked(db: Prisma.TransactionClient, userId: string, id: string, accepted = false): Promise<Friendship> {
    const rows = await db.$queryRaw<Friendship[]>`SELECT * FROM "Friendship" WHERE "id" = ${id} AND ("lowId" = ${userId} OR "highId" = ${userId}) FOR UPDATE`;
    const row = rows[0];
    if (!row || (row.status === 'BLOCKED' && row.blockedById !== userId) || (accepted && row.status !== 'ACCEPTED')) throw new NotFoundException();
    return row;
  }
  async request(userId: string, username: string) {
    const recipient = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!recipient) throw new NotFoundException();
    if (recipient.id === userId) throw new BadRequestException({ code: 'SELF_FRIENDSHIP', message: 'Escolha outra pessoa para adicionar.' });
    const [lowId, highId] = [userId, recipient.id].sort();
    return this.prisma.$transaction(async db => {
      // Pair uniqueness plus row locking serializes crossed requests and resends.
      const inserted = await db.$executeRaw`INSERT INTO "Friendship" ("id", "lowId", "highId", "initiatorId", "status", "updatedAt") VALUES (${randomUUID()}, ${lowId}, ${highId}, ${userId}, 'DECLINED', CURRENT_TIMESTAMP) ON CONFLICT ("lowId", "highId") DO NOTHING`;
      const rows = await db.$queryRaw<Friendship[]>`SELECT * FROM "Friendship" WHERE "lowId" = ${lowId} AND "highId" = ${highId} FOR UPDATE`;
      const row = rows[0];
      if (row.status === 'BLOCKED') throw new NotFoundException();
      if (row.status !== 'DECLINED') throw new ConflictException({ code: 'FRIENDSHIP_EXISTS', message: row.status === 'ACCEPTED' ? 'Vocês já são amigos.' : 'Já existe uma solicitação entre vocês. Confira suas solicitações.' });
      // Cooldown only after a real rejection/removal, not the placeholder inserted above.
      if (!inserted && Date.now() - row.updatedAt.getTime() < 86400000)
        throw new ConflictException({ code: 'FRIENDSHIP_COOLDOWN', message: 'Aguarde 24 horas antes de enviar outra solicitação para esta pessoa.' });
      return db.friendship.update({ where: { id: row.id }, data: { status: 'PENDING', initiatorId: userId } }).then(value => ({ id: value.id }));
    });
  }
  async action(userId: string, id: string, action: 'accept' | 'decline' | 'cancel' | 'remove' | 'block' | 'unblock') {
    return this.prisma.$transaction(async db => {
      const row = await this.locked(db, userId, id);
      if (action === 'block') {
        await db.friendship.update({ where: { id }, data: { status: 'BLOCKED', blockedById: userId } }); return;
      }
      if (action === 'unblock') {
        if (row.status !== 'BLOCKED' || row.blockedById !== userId) throw new NotFoundException();
        await db.friendship.update({ where: { id }, data: { status: 'DECLINED', blockedById: null } }); return;
      }
      if (action === 'accept' && row.status === 'ACCEPTED' && row.initiatorId !== userId) return;
      const valid = action === 'remove' ? row.status === 'ACCEPTED' : row.status === 'PENDING' && (action === 'cancel' ? row.initiatorId === userId : row.initiatorId !== userId);
      if (!valid) throw new ConflictException({ code: 'FRIENDSHIP_STATE', message: 'Esta solicitação mudou. Atualize a lista.' });
      await db.friendship.update({ where: { id }, data: { status: action === 'accept' ? 'ACCEPTED' : 'DECLINED' } });
    });
  }
  async messages(userId: string, id: string, before?: number): Promise<DirectMessagesPage> {
    return this.prisma.$transaction(async db => {
      await this.locked(db, userId, id, true);
      const rows = await db.directMessage.findMany({ where: { friendshipId: id, ...(before ? { sequence: { lt: before } } : {}) }, orderBy: { sequence: 'desc' }, take: 51 });
      return { items: rows.slice(0, 50).reverse().map(message), hasMore: rows.length > 50 };
    });
  }
  async send(userId: string, id: string, input: { requestId: string; content: string }): Promise<DirectMessageItem> {
    return this.prisma.$transaction(async db => {
      const row = await this.locked(db, userId, id, true);
      const existing = await db.directMessage.findUnique({ where: { friendshipId_senderId_requestId: { friendshipId: id, senderId: userId, requestId: input.requestId } } });
      if (existing) {
        if (existing.content !== input.content) throw new ConflictException({ code: 'MESSAGE_REPLAY', message: 'Esta tentativa já foi usada em outra mensagem.' });
        return message(existing);
      }
      await db.friendship.update({ where: { id }, data: { lastSequence: { increment: 1 } } });
      return message(await db.directMessage.create({ data: { friendshipId: id, senderId: userId, sequence: row.lastSequence + 1, ...input } }));
    });
  }
  async read(userId: string, id: string, sequence: number) {
    return this.prisma.$transaction(async db => {
      const row = await this.locked(db, userId, id, true);
      if (sequence > row.lastSequence) throw new BadRequestException();
      const field = row.lowId === userId ? 'lowReadSequence' : 'highReadSequence';
      if (sequence > row[field]) await db.friendship.update({ where: { id }, data: { [field]: sequence, updatedAt: row.updatedAt } });
    });
  }
}
