import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, ArrowRight } from 'lucide-react';
import type { PublicProfile } from '@paralax/contracts';
import { ProfileBanner, ProfilePortrait, ProfileMotion } from '@/components/profile-appearance';
import { Brand } from '@/components/brand';

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const response = await fetch(`${process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/v1/users/${encodeURIComponent(username)}`, { cache: 'no-store' });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Perfil temporariamente indisponível.');
  const user = await response.json() as PublicProfile;
  return <div className="public-profile-page"><header className="landing-header"><Brand /><Link href="/dashboard" className="button button-secondary button-small">Meu espaço <ArrowRight size={15} /></Link></header><main id="conteudo" className="public-profile"><ProfileMotion animated={Boolean(user.background?.animation || user.avatarFrame?.animation)}><ProfileBanner background={user.background} /><div className="public-profile-content"><ProfilePortrait user={user} /><span className="eyebrow">AVENTUREIRO NA PARALAX</span><h1>{user.displayName}</h1><span className="muted">@{user.username}</span>{user.location ? <p className="location"><MapPin size={16} />{user.location}</p> : null}<div className="public-bio"><h2>Sua história</h2><p>{user.bio || 'Este aventureiro ainda está preparando sua apresentação.'}</p></div><small className="muted">Na Paralax desde {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' }).format(new Date(user.joinedAt))}</small></div></ProfileMotion></main></div>;
}
