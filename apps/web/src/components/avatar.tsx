import type { PublicProfile } from '@paralax/contracts';

export function Avatar({ user, large = false }: { user: Pick<PublicProfile, 'avatarUrl' | 'displayName'>; large?: boolean }) {
  return <span className={`avatar ${large ? 'avatar-large' : ''}`}>
    {user.avatarUrl
      // Avatars are validated and normalized by the API; use the same-origin URL without an image proxy.
      ? <img src={user.avatarUrl} alt={`Avatar de ${user.displayName}`} width={large ? 96 : 38} height={large ? 96 : 38} />
      : <span aria-label={`Avatar de ${user.displayName}`}>{user.displayName.slice(0, 2).toUpperCase()}</span>}
  </span>;
}
