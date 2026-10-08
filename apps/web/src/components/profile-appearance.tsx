'use client';

import { useState } from 'react';
import type { PublicProfile } from '@paralax/contracts';
import { Avatar } from './avatar';

export function ProfileBanner({ background }: { background: PublicProfile['background'] }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <div className="public-banner" data-background={background?.id ?? 'default'}>
    {background && failed !== background.imageUrl ? <img src={background.imageUrl} alt="" width={1200} height={300}
      style={{ objectPosition: background.position }} onError={() => setFailed(background.imageUrl)}
      ref={element => { if (element?.complete && element.naturalWidth === 0) setFailed(background.imageUrl); }} /> : null}
  </div>;
}

export function ProfilePortrait({ user }: { user: Pick<PublicProfile, 'avatarUrl' | 'displayName' | 'avatarFrame'> }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="profile-portrait" data-frame={user.avatarFrame?.id ?? 'none'}><Avatar user={user} large />
    {user.avatarFrame && failed !== user.avatarFrame.imageUrl ? <img className="avatar-frame" src={user.avatarFrame.imageUrl} alt="" width={128} height={128} onError={() => setFailed(user.avatarFrame!.imageUrl)}
      ref={element => { if (element?.complete && element.naturalWidth === 0) setFailed(user.avatarFrame!.imageUrl); }} /> : null}
  </span>;
}
