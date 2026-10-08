import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

export const publicUserSelect = { id: true, username: true, profile: { select: { displayName: true } } } as const;
export function publicUser(row: { id: string; username: string; profile: { displayName: string } | null }) {
  return { id: row.id, username: row.username, displayName: row.profile?.displayName || row.username };
}
export function campaignAccess(userId: string): Prisma.CampaignWhereInput {
  return { OR: [{ ownerId: userId }, { members: { some: { userId, status: 'ACTIVE' } } }] };
}
// Every mutation affecting membership or capacity takes this same row lock first.
export async function lockCampaign(db: Prisma.TransactionClient, id: string, ownerId?: string) {
  const rows = await db.$queryRaw<{ id: string; ownerId: string; systemVersionId: string; maxPlayers: number; status: string }[]>(Prisma.sql`
    SELECT "id", "ownerId", "systemVersionId", "maxPlayers", "status" FROM "Campaign"
    WHERE "id" = ${id} ${ownerId ? Prisma.sql`AND "ownerId" = ${ownerId}` : Prisma.empty} FOR UPDATE`);
  if (!rows[0]) throw new NotFoundException();
  return rows[0];
}
