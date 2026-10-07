'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, Compass, House, LogOut, Mail, Sparkles, UserRound, Users } from 'lucide-react';
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
  const campaignPath = path.startsWith('/campanhas');
  const locationLabel = campaignPath ? path === '/campanhas' ? 'Campanhas' : path === '/campanhas/nova' ? 'Nova campanha' : path.endsWith('/editar') ? 'Editar' : 'Campanha' : path === '/convites' ? 'Convites' : path === '/perfil' ? 'Meu perfil' : path === '/sistemas' ? 'Sistemas' : path === '/sistemas/novo' ? 'Novo sistema' : path.startsWith('/sistemas/') ? 'Editar' : 'Início';
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
      <nav aria-label="Navegação principal" className="side-nav">
        <Link href="/dashboard" className={path === '/dashboard' ? 'selected' : ''} aria-current={path === '/dashboard' ? 'page' : undefined}><House size={21} /><span>Início</span></Link>
        <Link href="/sistemas" className={path.startsWith('/sistemas') ? 'selected' : ''} aria-current={path.startsWith('/sistemas') ? 'page' : undefined}><Sparkles size={21} /><span>Sistemas</span></Link>
        <Link href="/campanhas" className={path.startsWith('/campanhas') ? 'selected' : ''} aria-current={path.startsWith('/campanhas') ? 'page' : undefined}><BookOpen size={21} /><span>Campanhas</span></Link>
        <Link href="/convites" className={path === '/convites' ? 'selected' : ''} aria-current={path === '/convites' ? 'page' : undefined}><Mail size={21} /><span>Convites</span></Link>
        {[{ icon: Compass, label: 'Explorar' }, { icon: Users, label: 'Personagens' }].map(({ icon: Icon, label }) => <div key={label} className="nav-upcoming" aria-label={`${label}: em desenvolvimento`}><Icon size={21} /><span>{label}</span><span className="nav-tooltip">Em desenvolvimento</span></div>)}
      </nav>
      <div className="sidebar-bottom"><Link href="/perfil" className={path === '/perfil' ? 'selected' : ''} aria-current={path === '/perfil' ? 'page' : undefined} aria-label="Meu perfil"><UserRound size={21} /><span>Perfil</span></Link><button className="icon-button" onClick={leave} disabled={leaving} aria-label="Sair da conta" title="Sair da conta"><LogOut size={20} /></button></div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-header"><nav className="breadcrumbs" aria-label="Localização na plataforma"><Link href="/dashboard">Meu espaço</Link><ChevronRight size={14} aria-hidden="true" />{path.startsWith('/sistemas/') ? <><Link href="/sistemas">Sistemas</Link><ChevronRight size={14} aria-hidden="true" /></> : path.startsWith('/campanhas/') ? <><Link href="/campanhas">Campanhas</Link><ChevronRight size={14} aria-hidden="true" /></> : null}<span aria-current="page">{locationLabel}</span></nav><Link href={`/u/${user.username}`} className="header-user"><span>@{user.username}</span><Avatar user={user} /></Link></header>
      {error ? <p className="feedback error workspace-error" role="alert">{error}</p> : null}
      <main id="conteudo" className="workspace-content">{children}</main>
      <footer className="workspace-footer">PARALAX RPG <span>A imaginação é o ponto de partida.</span></footer>
    </div>
  </div>;
}
