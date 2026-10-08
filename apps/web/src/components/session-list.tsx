'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, ArrowUpRight } from 'lucide-react';
import { sessionStatusLabels, type SessionsPage, type PublicSessionsPage } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { Badge } from './ui/badge';
import { ApiError, errorMessage } from '@/lib/api';
import { sessionDate } from '@/lib/session-date';

export function SessionList({ campaignId, compact = false, canSchedule = false, publicOnly = false, onAccessLost }: { campaignId?: string; compact?: boolean; canSchedule?: boolean; publicOnly?: boolean; onAccessLost?: () => void }) {
  const { api } = useAuth();
  const [result, setResult] = useState<SessionsPage | PublicSessionsPage | null>(null);
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [filter, setFilter] = useState('ALL');
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false, active: AbortController | undefined; setResult(null); setError('');
    const load = async () => {
      if (disposed || document.hidden) return; active?.abort(); active = new AbortController(); const request = active;
      try {
        const path = publicOnly ? '/sessions/public' : campaignId ? `/campaigns/${campaignId}/sessions` : '/sessions/mine';
        const next = await api.request<SessionsPage | PublicSessionsPage>(`${path}?page=${page}&search=${encodeURIComponent(search)}${publicOnly ? '' : `&filter=${compact ? 'UPCOMING' : filter}`}`, { signal: request.signal }, !publicOnly);
        if (!disposed && !request.signal.aborted) { setResult(next); setError(''); }
      } catch (cause) { if (disposed || request.signal.aborted) return; setResult(null); setError(errorMessage(cause)); if (cause instanceof ApiError && cause.status === 404) onAccessLost?.(); }
    };
    const timeout = setTimeout(() => void load(), compact ? 0 : 250), refresh = () => void load();
    const interval = setInterval(refresh, 30000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { disposed = true; active?.abort(); clearTimeout(timeout); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, campaignId, compact, publicOnly, page, search, filter, attempt, onAccessLost]);
  return <div className="session-list">
    {compact ? <div className="panel-heading session-list-heading"><h2><CalendarDays size={18} />{campaignId ? 'Sessões da campanha' : 'Próximas sessões'}</h2><div className="editor-actions">{canSchedule ? <Link className="button button-secondary button-small" href={`/campanhas/${campaignId}/sessoes/nova`}>Agendar sessão</Link> : null}<Link className="subtle-link" href={campaignId ? `/campanhas/${campaignId}/sessoes` : '/sessoes'}>Ver todas <ArrowUpRight size={15} /></Link></div></div> : <div className="systems-toolbar"><div className="form-field system-search"><label htmlFor="session-search">Buscar sessões</label><input id="session-search" value={search} maxLength={80} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div>{!publicOnly ? <div className="form-field"><label htmlFor="session-filter">Exibir sessões</label><select id="session-filter" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="ALL">Todas, incluindo histórico</option><option value="UPCOMING">Agendadas e ao vivo</option></select></div> : null}</div>}
    <div className="character-list-body">{error ? <div className="feedback error"><p role="alert">{error}</p><button className="button button-secondary button-small" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : !result ? <p role="status">Carregando sessões…</p> : !result.items.length ? <p className="muted">{publicOnly ? 'Nenhuma sessão pública ao vivo neste momento.' : search ? 'Nenhuma sessão corresponde à busca.' : compact || filter === 'UPCOMING' ? 'Nenhuma sessão agendada ou ao vivo.' : 'Nenhuma sessão disponível. O mestre pode agendar pela campanha.'}</p> : <><div className="character-cards">{(compact ? result.items.slice(0, 3) : result.items).map(session => <article key={session.id} className="character-card session-card"><div><Badge tone={session.status === 'LIVE' ? 'accent' : undefined}>{sessionStatusLabels[session.status]}</Badge><h3><Link href={publicOnly ? `/ao-vivo/${session.id}` : `/sessoes/${session.id}`} aria-label={`Abrir sessão ${session.title}`}>{session.title}</Link></h3><p className="muted">{session.campaign.name}</p><time dateTime={session.scheduledAt}>{sessionDate(session.scheduledAt, session.timeZone)}</time><small> · {session.timeZone}</small>{session.description ? <p className="character-card-description">{session.description}</p> : null}</div><ArrowUpRight size={18} aria-hidden="true" /></article>)}</div>{!compact && result.total > result.pageSize ? <div className="list-pagination"><span className="muted">Página {page} · {result.total} sessões</span><div><button className="button button-secondary button-small" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="button button-secondary button-small" disabled={page * result.pageSize >= result.total} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div> : null}</>}</div>
  </div>;
}
