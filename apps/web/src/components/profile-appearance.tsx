'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { PublicProfile } from '@paralax/contracts';
import { Avatar } from './avatar';

export function ProfileMotion({ animated, children }: { animated: boolean; children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  return <div className="profile-motion" data-paused={paused || reduced}>
    {children}
    {animated ? <button type="button" className="motion-toggle" disabled={reduced} aria-pressed={paused || reduced}
      onClick={() => setPaused(value => !value)}>{reduced ? 'Movimento reduzido' : paused ? 'Retomar animações' : 'Pausar animações'}</button> : null}
  </div>;
}

export function ProfileBanner({ background }: { background: PublicProfile['background'] }) {
  const [failed, setFailed] = useState<string | null>(null);
  const animated = background?.animation && failed !== background.imageUrl;
  return <div className="public-banner" data-background={background?.id ?? 'default'} data-animation={animated ? background.animation : undefined}>
    {background && failed !== background.imageUrl ? <img src={background.imageUrl} alt="" width={1200} height={300}
      style={{ objectPosition: background.position }} onError={() => setFailed(background.imageUrl)}
      ref={element => { if (element?.complete && element.naturalWidth === 0) setFailed(background.imageUrl); }} /> : null}
    {animated ? <><span className="banner-haze" aria-hidden="true" /><span className="banner-motes" aria-hidden="true" /></> : null}
  </div>;
}

export function ProfilePortrait({ user }: { user: Pick<PublicProfile, 'avatarUrl' | 'displayName' | 'avatarFrame'> }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="profile-portrait" data-frame={user.avatarFrame?.id ?? 'none'}><Avatar user={user} large />
    {user.avatarFrame && failed !== user.avatarFrame.imageUrl ? <img className="avatar-frame" data-animation={user.avatarFrame.animation} src={user.avatarFrame.imageUrl} alt="" width={128} height={128} onError={() => setFailed(user.avatarFrame!.imageUrl)}
      ref={element => { if (element?.complete && element.naturalWidth === 0) setFailed(user.avatarFrame!.imageUrl); }} /> : null}
  </span>;
}
