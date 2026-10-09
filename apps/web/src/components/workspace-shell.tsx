'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, CalendarDays, ChevronRight, Compass, House, LogOut, Mail, MessageCircle, Sparkles, UserRound, Users } from 'lucide-react';
import { useAuth } from './auth-provider';
import { Brand } from './brand';
import { Avatar } from './avatar';
import { errorMessage } from '@/lib/api';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, loading, initializationError, logout, retry } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => { navigation.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); }, [path, user?.id, loading]);
  const campaignPath = path.startsWith('/campanhas');
  const locationLabel = path.startsWith('/sessoes') ? path === '/sessoes' ? 'Sessões' : path.endsWith('/editar') ? 'Editar agenda' : 'Sessão' : path.includes('/sessoes') ? path.endsWith('/nova') ? 'Agendar sessão' : 'Sessões' : path.startsWith('/personagens') ? path === '/personagens' ? 'Personagens' : path.endsWith('/editar') ? 'Editar ficha' : 'Ficha' : campaignPath ? path.includes('/personagens') ? path.endsWith('/novo') ? 'Novo personagem' : 'Personagens' : path === '/campanhas' ? 'Campanhas' : path === '/campanhas/nova' ? 'Nova campanha' : path.endsWith('/editar') ? 'Editar' : 'Campanha' : path === '/convites' ? 'Convites' : path === '/perfil' ? 'Meu perfil' : path === '/sistemas' ? 'Sistemas' : path === '/sistemas/novo' ? 'Novo sistema' : path.startsWith('/sistemas/') ? 'Editar' : 'Início';
  useEffect(() => { if (!loading && !user && !initializationError) router.replace('/entrar'); }, [loading, user, initializationError, router]);
  if (loading) return <main id="conteudo" className="center-state" role="status"><Brand /><p>Abrindo seu espaço...</p></main>;
  if (initializationError) return <main id="conteudo" className="center-state"><Brand /><p role="alert">{initializationError}</p><button className="button" onClick={retry}>Tentar novamente</button></main>;
  if (!user) return <main id="conteudo" className="center-state" role="status">Redirecionando...</main>;
  async function leave() {
    setLeaving(true); setError('');
    try { await logout(); router.replace('/entrar'); }
    catch (cause) { setError(errorMessage(cause)); setLeaving(false); }
  }
  return <div className="workspace">
    <aside className="sidebar">
      <Brand compact />
      <nav ref={navigation} aria-label="Navegação principal" className="side-nav">
        <Link href="/dashboard" className={path === '/dashboard' ? 'selected' : ''} aria-current={path === '/dashboard' ? 'page' : undefined}><House size={21} /><span>Início</span></Link>
        <Link href="/sistemas" className={path.startsWith('/sistemas') ? 'selected' : ''} aria-current={path.startsWith('/sistemas') ? 'page' : undefined}><Sparkles size={21} /><span>Sistemas</span></Link>
        <Link href="/campanhas" className={path.startsWith('/campanhas') ? 'selected' : ''} aria-current={path.startsWith('/campanhas') ? 'page' : undefined}><BookOpen size={21} /><span>Campanhas</span></Link>
        <Link href="/convites" className={path === '/convites' ? 'selected' : ''} aria-current={path === '/convites' ? 'page' : undefined}><Mail size={21} /><span>Convites</span></Link>
        <Link href="/amigos" className={path === '/amigos' ? 'selected' : ''} aria-current={path === '/amigos' ? 'page' : undefined}><MessageCircle size={21} /><span>Amigos</span></Link>
        <Link href="/personagens" className={`character-nav-link ${path.startsWith('/personagens') ? 'selected' : ''}`} aria-current={path.startsWith('/personagens') ? 'page' : undefined}><Users size={21} /><span>Personagens</span></Link>
        <Link href="/sessoes" className={`desktop-nav-link ${path.startsWith('/sessoes') ? 'selected' : ''}`} aria-current={path.startsWith('/sessoes') ? 'page' : undefined}><CalendarDays size={21} /><span>Sessões</span></Link>
        <Link href="/ao-vivo" className="desktop-nav-link"><Compass size={21} /><span>Ao vivo</span></Link>
      </nav>
      <div className="sidebar-bottom"><Link href="/perfil" className={path === '/perfil' ? 'selected' : ''} aria-current={path === '/perfil' ? 'page' : undefined} aria-label="Meu perfil"><UserRound size={21} /><span>Perfil</span></Link><button className="icon-button" onClick={leave} disabled={leaving} aria-label="Sair da conta" title="Sair da conta"><LogOut size={20} /></button></div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-header"><nav className="breadcrumbs" aria-label="Localização na plataforma"><Link href="/dashboard">Meu espaço</Link><ChevronRight size={14} aria-hidden="true" />{path.startsWith('/sistemas/') ? <><Link href="/sistemas">Sistemas</Link><ChevronRight size={14} aria-hidden="true" /></> : path.startsWith('/campanhas/') ? <><Link href="/campanhas">Campanhas</Link><ChevronRight size={14} aria-hidden="true" /></> : null}<span aria-current="page">{path === '/amigos' ? 'Amigos e mensagens' : locationLabel}</span></nav><div className="header-actions"><Link href={`/u/${user.username}`} className="header-user"><span>@{user.username}</span><Avatar user={user} /></Link><button className="icon-button mobile-logout" onClick={leave} disabled={leaving} aria-label="Sair da conta" title="Sair da conta"><LogOut size={20} /></button></div></header>
      {error ? <p className="feedback error workspace-error" role="alert">{error}</p> : null}
      <main id="conteudo" className="workspace-content">{children}</main>
      <footer className="workspace-footer">PARALAX RPG <span>A imaginação é o ponto de partida.</span></footer>
    </div>
  </div>;
}
