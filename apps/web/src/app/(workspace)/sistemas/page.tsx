'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Plus, Search, Sparkles } from 'lucide-react';
import type { SystemsPage } from '@paralax/contracts';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { errorMessage } from '@/lib/api';

const visibility = { PRIVATE: 'Privado', PUBLIC: 'Público', UNLISTED: 'Não listado' };
export default function Systems() {
  const { api } = useAuth();
  const [scope, setScope] = useState<'mine' | 'public'>('mine');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SystemsPage | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setResult(null); setError('');
    const timeout = setTimeout(() => { api.request<SystemsPage>(`/systems/${scope}?page=${page}&search=${encodeURIComponent(search)}`, { signal: abort.signal }, scope === 'mine').then(value => { if (!abort.signal.aborted) setResult(value); }).catch(cause => { if (!abort.signal.aborted) setError(errorMessage(cause)); }); }, 250);
    return () => { clearTimeout(timeout); abort.abort(); };
  }, [api, scope, page, search, attempt]);
  return <><div className="page-heading heading-with-action"><div><span className="eyebrow">CRIE POSSIBILIDADES</span><h1>Seus sistemas.</h1><p>Suas regras, seus personagens, seus próximos mundos.</p></div><Link className="button" href="/sistemas/novo"><Plus size={18} />Criar sistema</Link></div>
    <div className="systems-toolbar"><div className="scope-switch" aria-label="Listagem de sistemas"><button type="button" aria-pressed={scope === 'mine'} className={scope === 'mine' ? 'selected' : ''} onClick={() => { setScope('mine'); setPage(1); }}>Meus sistemas</button><button type="button" aria-pressed={scope === 'public'} className={scope === 'public' ? 'selected' : ''} onClick={() => { setScope('public'); setPage(1); }}>Catálogo público</button></div><div className="system-search"><Search size={17} aria-hidden="true" /><input aria-label="Buscar sistemas" placeholder="Buscar por nome ou descrição" maxLength={80} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div></div>
    {error ? <div className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : !result ? <p role="status">Carregando sistemas…</p> : result.items.length ? <><div className="systems-grid">{result.items.map(system => <article className="panel system-card" key={system.id}><div className="system-card-art"><Image src="/art/astral-observatory.webp" alt="" fill sizes="(max-width:650px) 90vw, (max-width:1100px) 40vw, 30vw" /><Badge>{visibility[system.visibility]}</Badge></div><div className="system-card-content"><span className="eyebrow">VERSÃO {system.revision}</span><h2><Link href={scope === 'mine' ? `/sistemas/${system.id}/editar` : `/s/${system.id}`}>{system.name}</Link></h2><p>{system.description || 'Um novo universo de regras, criado do seu jeito.'}</p><span className="system-author">por {system.owner.displayName}</span><Link className="card-action" href={scope === 'mine' ? `/sistemas/${system.id}/editar` : `/s/${system.id}`}>{scope === 'mine' ? 'Editar sistema' : 'Conhecer sistema'}{scope === 'mine' ? <ArrowRight size={17} /> : <ArrowUpRight size={17} />}</Link></div></article>)}</div><div className="list-pagination"><span className="muted">{result.total} {result.total === 1 ? 'sistema' : 'sistemas'} · Página {result.page}</span><div><button className="button button-secondary button-small" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="button button-secondary button-small" disabled={page * result.pageSize >= result.total} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div></> : <section className="panel"><EmptyState icon={<Sparkles size={25} />} title={search ? 'Nenhum sistema encontrado' : scope === 'mine' ? 'Seu primeiro universo começa aqui' : 'O catálogo está esperando novas ideias'}>{search ? 'Tente buscar por outro nome ou descrição.' : scope === 'mine' ? 'Crie um sistema com atributos, perícias, recursos e dados. A ficha começa com as suas regras.' : 'Quando um criador publicar um sistema, ele aparecerá aqui.'}</EmptyState>{!search && scope === 'mine' ? <div className="empty-state-action"><Link className="button" href="/sistemas/novo"><Plus size={17} />Criar meu primeiro sistema</Link></div> : null}</section>}
  </>;
}
