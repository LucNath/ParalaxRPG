import { profileCosmetics, type CurrentUser, type PublicProfile } from '@paralax/contracts';
import type { Prisma } from '../../generated/prisma/client';

export const publicUserSelect = {
  id: true, username: true, createdAt: true,
  profile: { select: { displayName: true, bio: true, location: true, avatarKey: true, backgroundId: true, avatarFrameId: true } },
} satisfies Prisma.UserSelect;
export const currentUserSelect = { ...publicUserSelect, email: true } satisfies Prisma.UserSelect;
type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
type CurrentUserRecord = Prisma.UserGetPayload<{ select: typeof currentUserSelect }>;

export function publicProfile(user: PublicUserRecord): PublicProfile {
  return { id: user.id, username: user.username, displayName: user.profile?.displayName || user.username,
    bio: user.profile?.bio || '', location: user.profile?.location || '',
    avatarUrl: user.profile?.avatarKey ? `/api/v1/avatars/${user.profile.avatarKey}` : null,
    joinedAt: user.createdAt.toISOString(),
    background: profileCosmetics.find(item => item.id === user.profile?.backgroundId && item.category === 'BACKGROUND') ?? null,
    avatarFrame: profileCosmetics.find(item => item.id === user.profile?.avatarFrameId && item.category === 'AVATAR_FRAME') ?? null };
}
export function currentProfile(user: CurrentUserRecord): CurrentUser {
  return { ...publicProfile(user), email: user.email };
}
