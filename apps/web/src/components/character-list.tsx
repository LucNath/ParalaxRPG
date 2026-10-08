'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Users } from 'lucide-react';
import type { CharactersPage } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { ApiError, errorMessage } from '@/lib/api';

export function CharacterList({ campaignId, compact = false, onAccessLost }: { campaignId?: string; compact?: boolean; onAccessLost?: () => void }) {
  const { api } = useAuth();
  const [result, setResult] = useState<CharactersPage | null>(null);
  const [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); let active: AbortController | undefined;
    setResult(null); setError('');
    const load = async () => {
      if (document.hidden || abort.signal.aborted) return;
      active?.abort(); active = new AbortController(); const request = active;
      try {
        const next = await api.request<CharactersPage>(`${campaignId ? `/campaigns/${campaignId}/characters` : '/characters/mine'}?page=${page}&search=${encodeURIComponent(search)}`, { signal: request.signal });
        if (!request.signal.aborted && !abort.signal.aborted) { setResult(next); setError(''); }
      } catch (cause) {
        if (request.signal.aborted || abort.signal.aborted) return;
        setResult(null); setError(errorMessage(cause));
        if (cause instanceof ApiError && cause.status === 404) onAccessLost?.();
      }
    };
    const timeout = setTimeout(() => void load(), compact ? 0 : 250);
    const refresh = () => void load();
    const interval = setInterval(refresh, 30000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { abort.abort(); active?.abort(); clearTimeout(timeout); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, campaignId, page, search, attempt, compact, onAccessLost]);
  return <div className="character-list">
    {compact ? <div className="panel-heading"><h2><Users size={18} />Personagens</h2><Link className="subtle-link" href={`/campanhas/${campaignId}/personagens`}>Ver todos <ArrowUpRight size={15} /></Link></div> : <div className="systems-toolbar"><div className="form-field system-search"><label htmlFor="character-search">Buscar personagens</label><input id="character-search" value={search} maxLength={80} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div></div>}
    <div className="character-list-body">
      {error ? <div className="feedback error"><p role="alert">{error}</p><button className="button button-secondary button-small" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : !result ? <p role="status">Carregando personagens…</p> : !result.items.length ? <p className="muted">{search ? 'Nenhum personagem corresponde à busca.' : 'Nenhum personagem disponível. Crie sua ficha dentro de uma campanha.'}</p> : <>
        <div className="character-cards">{(compact ? result.items.slice(0, 3) : result.items).map(character => <article className="character-card" key={character.id}><div><h3><Link href={`/personagens/${character.id}`} aria-label={`Abrir ${character.name}`}>{character.name}</Link></h3><p className="muted">{character.campaign.name} · {character.owner.displayName}</p>{character.description ? <p className="character-card-description">{character.description}</p> : null}<small>{character.system.name} · versão {character.system.version}{character.level !== null ? ` · nível ${character.level}` : ''}</small></div><Link className="icon-button" href={`/personagens/${character.id}`} aria-label={`Ver ficha de ${character.name}`}><ArrowUpRight size={19} /></Link></article>)}</div>
        {!compact && result.total > result.pageSize ? <div className="list-pagination"><span className="muted">Página {page} · {result.total} personagens</span><div><button className="button button-secondary button-small" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="button button-secondary button-small" disabled={page * result.pageSize >= result.total} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div> : null}
      </>}
    </div>
  </div>;
}
