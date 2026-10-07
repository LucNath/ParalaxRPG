'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Plus, Search } from 'lucide-react';
import { campaignStatusLabels, campaignVisibilityLabels, type CampaignsPage } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { Badge } from './ui/badge';
import { EmptyState } from './ui/empty-state';
import { errorMessage } from '@/lib/api';

export function CampaignList({ compact = false, refreshRevision = 0 }: { compact?: boolean; refreshRevision?: number }) {
  const { api } = useAuth();
  const [scope, setScope] = useState<'mine' | 'public'>('mine');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CampaignsPage | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setResult(null); setError('');
    const timeout = setTimeout(() => {
      api.request<CampaignsPage>(`/campaigns/${scope}?page=${page}&search=${encodeURIComponent(search)}`, { signal: abort.signal }, scope === 'mine')
        .then(value => { if (!abort.signal.aborted) setResult(value); })
        .catch(cause => { if (!abort.signal.aborted) setError(errorMessage(cause)); });
    }, compact ? 0 : 250);
    return () => { clearTimeout(timeout); abort.abort(); };
  }, [api, scope, search, page, attempt, compact, refreshRevision]);
  return <>
    {compact ? <div className="panel-heading"><h2><BookOpen size={18} /> Minhas campanhas</h2><Link className="subtle-link" href="/campanhas">Ver todas <ArrowRight size={15} /></Link></div> : <div className="systems-toolbar"><div className="scope-switch" aria-label="Listagem de campanhas"><button type="button" aria-pressed={scope === 'mine'} className={scope === 'mine' ? 'selected' : ''} onClick={() => { setScope('mine'); setPage(1); }}>Minhas campanhas</button><button type="button" aria-pressed={scope === 'public'} className={scope === 'public' ? 'selected' : ''} onClick={() => { setScope('public'); setPage(1); }}>Campanhas públicas</button></div><div className="system-search"><Search size={17} aria-hidden="true" /><input aria-label="Buscar campanhas" placeholder="Buscar por nome ou descrição" maxLength={80} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div></div>}
    {error ? <div className="page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : !result ? <p role="status" className={compact ? 'campaign-loading' : ''}>Carregando campanhas…</p> : result.items.length ? <>
      <div className={compact ? 'campaign-compact-list' : 'systems-grid'}>{(compact ? result.items.slice(0, 3) : result.items).map(campaign => <article className={compact ? 'campaign-compact-item' : 'panel system-card'} key={campaign.id}>
        {!compact ? <div className="system-card-art"><Image src="/art/paralax-world.webp" alt="" fill sizes="(max-width:650px) 90vw, (max-width:1100px) 40vw, 30vw" /><Badge>{campaignVisibilityLabels[campaign.visibility]}</Badge></div> : null}
        <div className={compact ? '' : 'system-card-content'}><span className="eyebrow">{campaignStatusLabels[campaign.status]}</span><h2><Link href={scope === 'mine' ? `/campanhas/${campaign.id}` : `/c/${campaign.id}`}>{campaign.name}</Link></h2>{!compact ? <p>{campaign.description || 'Uma nova história começa por aqui.'}</p> : null}<span className="system-author">{campaign.system.name} · versão {campaign.system.version}</span>{!compact ? <><span className="system-author">Mestre: {campaign.owner.displayName} · até {campaign.maxPlayers} jogadores</span><Link className="card-action" href={scope === 'mine' ? `/campanhas/${campaign.id}` : `/c/${campaign.id}`}>Conhecer campanha <ArrowRight size={17} /></Link></> : null}</div>
        {compact ? <Link className="icon-button" href={`/campanhas/${campaign.id}`} aria-label={`Abrir ${campaign.name}`}><ArrowRight size={18} /></Link> : null}
      </article>)}</div>
      {!compact ? <div className="list-pagination"><span className="muted">{result.total} {result.total === 1 ? 'campanha' : 'campanhas'} · Página {page}</span><div><button className="button button-secondary button-small" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="button button-secondary button-small" disabled={page * result.pageSize >= result.total} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div> : null}
    </> : <div className={compact ? '' : 'panel'}><EmptyState icon={<BookOpen size={25} />} title={search ? 'Nenhuma campanha encontrada' : scope === 'mine' ? 'Dê início à sua próxima história' : 'Novas histórias estão a caminho'}>{search ? 'Tente outro nome ou descrição.' : scope === 'mine' ? 'Crie uma campanha com suas regras ou aceite o convite de um mestre para jogar.' : 'Campanhas públicas aparecerão aqui quando forem criadas.'}</EmptyState>{!search && scope === 'mine' ? <div className="empty-state-action"><Link className="button" href="/campanhas/nova"><Plus size={17} />Criar minha primeira campanha</Link></div> : null}</div>}
  </>;
}
