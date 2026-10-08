import { achievementDefinitions, profileCosmetics, type AchievementId, type AchievementsPage, type CosmeticsPage } from '@paralax/contracts';
import type { Prisma } from '../../generated/prisma/client';

// Call only inside the transaction confirming the real action. Unique keys make retries harmless.
export async function grantAchievement(db: Prisma.TransactionClient, userId: string, achievementId: AchievementId) {
  const definition = achievementDefinitions.find(item => item.id === achievementId)!;
  await db.userAchievement.createMany({ data: [{ userId, achievementId }], skipDuplicates: true });
  await db.userCosmetic.createMany({ data: [{ userId, cosmeticId: definition.cosmeticId }], skipDuplicates: true });
}
export async function grantIdentity(db: Prisma.TransactionClient, userId: string) {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId }, select: { bio: true, avatarKey: true } });
  if (profile.bio.trim() && profile.avatarKey) await grantAchievement(db, userId, 'identity');
}
// Administrative entitlement belongs to the immutable account, never to a username or client input.
export async function ensureCosmeticAccess(db: Prisma.TransactionClient, userId: string) {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId }, select: { allCosmeticsUnlocked: true } });
  if (profile.allCosmeticsUnlocked) {
    // Keep the same Profile → Cosmetic lock order as bio/avatar saves.
    await db.$queryRaw`SELECT "userId" FROM "Profile" WHERE "userId" = ${userId} FOR UPDATE`;
    await db.userCosmetic.createMany({ data: profileCosmetics.map(item => ({ userId, cosmeticId: item.id })), skipDuplicates: true });
  }
}
export async function achievements(db: Prisma.TransactionClient, userId: string): Promise<AchievementsPage> {
  const obtained = await db.userAchievement.findMany({ where: { userId } });
  return { items: achievementDefinitions.map(item => {
    const earnedAt = obtained.find(row => row.achievementId === item.id)?.earnedAt.toISOString() ?? null;
    return { id: item.id, name: item.name, description: item.description, earnedAt, progress: earnedAt ? 1 : 0, target: 1,
      rewards: profileCosmetics.filter(cosmetic => cosmetic.id === item.cosmeticId) };
  }) };
}
export async function cosmetics(db: Prisma.TransactionClient, userId: string): Promise<CosmeticsPage> {
  await ensureCosmeticAccess(db, userId);
  const [owned, profile] = await Promise.all([
    db.userCosmetic.findMany({ where: { userId }, select: { cosmeticId: true } }),
    db.profile.findUniqueOrThrow({ where: { userId }, select: { backgroundId: true, avatarFrameId: true } }),
  ]);
  return { ...profile, items: profileCosmetics.map(item => ({ ...item, unlocked: owned.some(row => row.cosmeticId === item.id),
    achievementId: achievementDefinitions.find(definition => definition.cosmeticId === item.id)!.id })) };
}
