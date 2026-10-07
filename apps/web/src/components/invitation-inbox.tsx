'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Mail, X } from 'lucide-react';
import { invitationStatusLabels, type InvitationsPage } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { Badge } from './ui/badge';
import { EmptyState } from './ui/empty-state';
import { errorMessage } from '@/lib/api';

export function InvitationInbox({ compact = false, onAccepted }: { compact?: boolean; onAccepted?: () => void }) {
  const { api } = useAuth();
  const [result, setResult] = useState<InvitationsPage | null>(null);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    const abort = new AbortController(); setResult(null); setError('');
    api.request<InvitationsPage>(`/users/me/invitations?page=${page}`, { signal: abort.signal })
      .then(value => { if (!abort.signal.aborted) setResult(value); })
      .catch(cause => { if (!abort.signal.aborted) setError(errorMessage(cause)); });
    return () => abort.abort();
  }, [api, page, attempt]);
  useEffect(() => {
    const refresh = () => { if (!busyRef.current && document.visibilityState === 'visible') setAttempt(value => value + 1); };
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); clearInterval(timer); };
  }, []);
  async function respond(id: string, action: 'accept' | 'decline') {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(id); setError(''); setNotice('');
    try {
      await api.request(`/invitations/${id}/${action}`, { method: 'POST' });
      setNotice(action === 'accept' ? 'Convite aceito. Você agora participa da campanha.' : 'Convite recusado.');
      if (action === 'accept') onAccepted?.();
      setAttempt(value => value + 1);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busyRef.current = false; setBusy(null); }
  }
  return <>
    {compact ? <div className="panel-heading"><h2><Mail size={18} /> Convites recebidos</h2><Link className="subtle-link" href="/convites">Ver todos <ArrowRight size={15} /></Link></div> : null}
    {notice ? <p className="feedback success invitation-feedback" role="status">{notice}</p> : null}
    {error ? <div className="invitation-feedback"><p className="feedback error" role="alert">{error}</p><button className="button button-secondary button-small" disabled={!!busy} onClick={() => { setAttempt(value => value + 1); setNotice(''); }}>Atualizar convites</button></div> : null}
    {!result && !error ? <p className="campaign-loading" role="status">Carregando convites…</p> : result?.items.length ? <>
      <div className="invitation-list">{(compact ? result.items.slice(0, 3) : result.items).map(invitation => <article className="invitation-item" key={invitation.id} aria-label={`Convite para ${invitation.campaign.name}`}>
        <div className="invitation-item-heading"><div><span className="eyebrow">{invitation.inviter.displayName} · @{invitation.inviter.username}</span><h2>{invitation.campaign.name}</h2></div><Badge tone={invitation.status === 'PENDING' ? 'accent' : 'neutral'}>{invitationStatusLabels[invitation.status]}</Badge></div>
        {invitation.status === 'PENDING' ? <><p className="muted">Válido até {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}. O aceite depende de uma vaga disponível.</p><div className="invitation-actions"><button className="button button-small" disabled={!!busy} onClick={() => void respond(invitation.id, 'accept')}><Check size={16} />{busy === invitation.id ? 'Respondendo…' : 'Aceitar convite'}</button><button className="button button-secondary button-small" disabled={!!busy} onClick={() => void respond(invitation.id, 'decline')}><X size={16} />Recusar</button></div></> : invitation.status === 'ACCEPTED' && invitation.recipientIsMember ? <Link className="subtle-link" href={`/campanhas/${invitation.campaign.id}`}>Abrir campanha <ArrowRight size={16} /></Link> : invitation.status === 'ACCEPTED' ? <p className="muted">Sua participação nesta campanha foi encerrada.</p> : null}
      </article>)}</div>
      {!compact ? <div className="list-pagination invitation-pagination"><span className="muted">{result.total} {result.total === 1 ? 'convite' : 'convites'} · Página {page}</span><div><button className="button button-secondary button-small" disabled={page === 1 || !!busy} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="button button-secondary button-small" disabled={page * result.pageSize >= result.total || !!busy} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div> : null}
    </> : result ? <EmptyState icon={<Mail size={25} />} title="Sua próxima história pode chegar por aqui">Quando um mestre convidar seu nome de usuário, você poderá aceitar ou recusar aqui.</EmptyState> : null}
  </>;
}
