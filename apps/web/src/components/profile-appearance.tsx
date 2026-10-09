'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { PublicProfile } from '@paralax/contracts';
import { Avatar } from './avatar';

export function ProfileMotion({ animated, children }: { animated: boolean; children: ReactNode }) {
  const [choice, setChoice] = useState<'system' | 'play' | 'pause'>('system');
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    const restore = () => {
      try {
        const saved = localStorage.getItem('paralax.profile-motion');
        setChoice(saved === 'play' || saved === 'pause' ? saved : 'system');
      } catch { /* A blocked storage does not prevent the local control from working. */ }
    };
    sync();
    restore();
    preference.addEventListener('change', sync);
    window.addEventListener('storage', restore);
    return () => { preference.removeEventListener('change', sync); window.removeEventListener('storage', restore); };
  }, []);
  const paused = choice === 'pause' || (choice === 'system' && reduced);
  function choose(value: typeof choice) {
    setChoice(value);
    try {
      if (value === 'system') localStorage.removeItem('paralax.profile-motion');
      else localStorage.setItem('paralax.profile-motion', value);
    } catch { /* Keep this view interactive even when persistence is unavailable. */ }
  }
  return <div className="profile-motion" data-paused={paused} data-motion={choice}>
    {children}
    {animated ? <div className="motion-controls"><button type="button" className="motion-toggle" aria-pressed={!paused}
      title={reduced && choice === 'system' ? 'Seu sistema prefere movimento reduzido. Você pode ativar as animações neste navegador.' : undefined}
      onClick={() => choose(paused ? 'play' : 'pause')}>{reduced && choice === 'system' ? 'Ativar animações' : paused ? 'Retomar animações' : 'Pausar animações'}</button>
      {choice !== 'system' ? <button type="button" className="motion-toggle" onClick={() => choose('system')}>Seguir sistema</button> : null}
    </div> : null}
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
