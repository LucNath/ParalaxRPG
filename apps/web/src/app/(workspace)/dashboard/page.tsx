'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Compass, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CampaignList } from '@/components/campaign-list';
import { InvitationInbox } from '@/components/invitation-inbox';

export default function Dashboard() {
  const { user } = useAuth();
  const [campaignRevision, setCampaignRevision] = useState(0);
  if (!user) return null;
  const complete = !!user.bio && !!user.avatarUrl;
  const steps = [
    { title: 'Criar sua conta', note: 'Seu lugar na Paralax está reservado.', done: true },
    { title: 'Escolher um avatar', note: 'Dê um rosto à sua identidade.', done: !!user.avatarUrl },
    { title: 'Contar sua história', note: 'Adicione uma pequena biografia.', done: !!user.bio },
  ];
  return <>
    <div className="page-heading heading-with-action"><div><span className="eyebrow">BEM-VINDO AO SEU UNIVERSO</span><h1>Olá, {user.displayName.split(' ')[0]}.</h1><p>Seu ponto de partida para a próxima aventura.</p></div><Badge tone="accent">Seu espaço</Badge></div>
    <section className="welcome-panel"><div className="welcome-panel-copy"><span className="eyebrow">{complete ? 'DÊ FORMA AO SEU UNIVERSO' : 'ANTES DA PRIMEIRA AVENTURA'}</span><h2>{complete ? 'Seu próximo mundo começa pelas regras.' : 'Toda grande história\ncomeça com uma identidade.'}</h2><p>{complete ? 'Crie atributos, perícias, recursos e dados. Seu sistema fica salvo e pronto para as próximas histórias.' : 'Escolha um avatar, compartilhe suas inspirações e prepare seu lugar na comunidade.'}</p><Link className="button" href={complete ? '/sistemas/novo' : '/perfil'}>{complete ? 'Criar meu sistema' : 'Completar meu perfil'} <ArrowRight size={18} /></Link></div><div className="welcome-mark" aria-hidden="true"><Compass size={100} strokeWidth={.8} /></div></section>
    <div className="dashboard-columns">
      <div className="dashboard-main">
        <section className="panel"><CampaignList compact refreshRevision={campaignRevision} /></section>
        <section className="panel"><InvitationInbox compact onAccepted={() => setCampaignRevision(value => value + 1)} /></section>
        <section className="panel"><div className="panel-heading"><h2><CalendarDays size={18} /> Próximas sessões</h2><Badge>Em desenvolvimento</Badge></div><EmptyState icon={<CalendarDays size={25} />} title="O próximo encontro começa aqui">Quando o módulo de sessões estiver disponível, você poderá acompanhar as próximas aventuras da sua mesa.</EmptyState></section>
      </div>
      <aside className="dashboard-aside">
        <section className="panel profile-summary"><div className="panel-heading"><h2>Seu perfil</h2><Link href="/perfil" className="subtle-link">Editar <ArrowUpRight size={14} /></Link></div><div className="summary-person"><Avatar user={user} large /><div><h3>{user.displayName}</h3><span className="muted">@{user.username}</span></div></div><p className="summary-bio">{user.bio || 'Quais histórias inspiram você? Adicione uma biografia ao seu perfil.'}</p><Link href={`/u/${user.username}`} className="panel-link">Ver meu perfil público <ArrowUpRight size={17} /></Link></section>
        <section className="panel checklist-panel"><div className="panel-heading"><h2>Primeiros passos</h2><span className="muted">{steps.filter(step => step.done).length}/3</span></div><ul className="onboarding-list">{steps.map(item => <li key={item.title}><span className={`check-circle ${item.done ? 'done' : ''}`} aria-hidden="true">{item.done ? <Check size={13} /> : <span />}</span><div><strong>{item.title}</strong><small>{item.note}</small></div>{item.done ? <span className="visually-hidden">Concluído</span> : <Link href="/perfil" aria-label={item.title}><ArrowRight size={17} /></Link>}</li>)}</ul></section>
      </aside>
    </div>
    <section className="next-chapters"><div className="section-title"><h2>Seu universo está crescendo</h2><span className="muted">Novas possibilidades, a cada etapa.</span></div><div className="chapter-grid"><Link className="chapter-card available-chapter" href="/sistemas"><Sparkles size={21} /><div><h3>Criador de sistemas</h3><p>Crie e edite suas próprias regras.</p></div><ArrowRight size={16} /></Link><Link className="chapter-card available-chapter" href="/campanhas"><BookOpen size={21} /><div><h3>Suas campanhas</h3><p>Prepare e descubra novas histórias.</p></div><ArrowRight size={16} /></Link><Link className="chapter-card available-chapter" href="/personagens"><Users size={21} /><div><h3>Seus personagens</h3><p>Consulte e edite suas fichas.</p></div><ArrowRight size={16} /></Link></div></section>
  </>;
}
