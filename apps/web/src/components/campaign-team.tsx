'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mail, UserMinus, Users } from 'lucide-react';
import { createInvitationSchema, invitationStatusLabels, type CampaignMembers, type InvitationsPage } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { Badge } from './ui/badge';
import { ApiError, errorMessage } from '@/lib/api';

export function CampaignTeam({ campaignId, isOwner, closed, onAccessLost }: { campaignId: string; isOwner: boolean; closed: boolean; onAccessLost: () => void }) {
  const { api } = useAuth();
  const [members, setMembers] = useState<CampaignMembers | null>(null);
  const [invitations, setInvitations] = useState<InvitationsPage | null>(null);
  const [page, setPage] = useState(1);
  const [username, setUsername] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    const abort = new AbortController(); setError('');
    Promise.all([
      api.request<CampaignMembers>(`/campaigns/${campaignId}/members`, { signal: abort.signal }),
      isOwner ? api.request<InvitationsPage>(`/campaigns/${campaignId}/invitations?page=${page}`, { signal: abort.signal }) : Promise.resolve(null),
    ]).then(([team, sent]) => { if (!abort.signal.aborted) { setMembers(team); setInvitations(sent); } })
      .catch(cause => { if (!abort.signal.aborted) { if (cause instanceof ApiError && cause.status === 404) onAccessLost(); else setError(errorMessage(cause)); } });
    return () => abort.abort();
  }, [api, campaignId, isOwner, page, attempt, onAccessLost]);
  useEffect(() => {
    const refresh = () => { if (!busyRef.current && document.visibilityState === 'visible') setAttempt(value => value + 1); };
    window.addEventListener('focus', refresh); const timer = setInterval(refresh, 30000);
    return () => { window.removeEventListener('focus', refresh); clearInterval(timer); };
  }, []);
  async function act(action: () => Promise<unknown>, success: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); setAttempt(value => value + 1); }
    catch (cause) { if (cause instanceof ApiError && cause.status === 404 && !isOwner) onAccessLost(); else setError(errorMessage(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (busyRef.current) return;
    const parsed = createInvitationSchema.safeParse({ username });
    if (!parsed.success) { setFieldError(parsed.error.issues[0].message); return; }
    setFieldError('');
    await act(async () => { await api.request(`/campaigns/${campaignId}/invitations`, { method: 'POST', body: JSON.stringify(parsed.data) }); setUsername(''); setPage(1); }, 'Convite enviado. A pessoa poderá responder no próprio painel.');
  }
  return <section className="panel campaign-team"><div className="panel-heading"><h2><Users size={18} /> Membros da campanha</h2>{members ? <Badge>{members.playerCount}/{members.maxPlayers} jogadores</Badge> : null}</div>
    <div className="team-content">
      {notice ? <p className="feedback success" role="status">{notice}</p> : null}
      {error ? <div><p className="feedback error" role="alert">{error}</p><button className="button button-secondary button-small" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Atualizar membros e convites</button></div> : null}
      {!members && !error ? <p role="status">Carregando membros…</p> : members ? <><ul className="team-members">{members.items.map(member => <li key={member.user.id}><div><Link className="subtle-link" href={`/u/${member.user.username}`}>{member.user.displayName}</Link><small>@{member.user.username} · {member.role === 'OWNER' ? 'Mestre' : 'Jogador'}</small></div>{isOwner && member.role === 'PLAYER' ? <button className="button button-secondary button-small" disabled={busy} onClick={() => { if (window.confirm(`Remover ${member.user.displayName} da campanha? Essa pessoa perderá o acesso privado.`)) void act(() => api.request(`/campaigns/${campaignId}/members/${member.user.id}`, { method: 'DELETE' }), 'Jogador removido. O acesso privado foi revogado.'); }} aria-label={`Remover jogador ${member.user.username}`}><UserMinus size={16} />Remover</button> : <Badge>{member.role === 'OWNER' ? 'Mestre' : 'Jogador'}</Badge>}</li>)}</ul>{members.playerCount === 0 ? <p className="muted">Ainda não há jogadores nesta campanha.</p> : null}</> : null}
      {isOwner ? <><div className="team-invite"><h3><Mail size={17} /> Convidar jogador</h3>{closed ? <p className="muted">Reabra a campanha para enviar novos convites.</p> : <form onSubmit={send} className="invite-form" noValidate><div className="form-field"><label htmlFor="invitation-username">Nome de usuário do jogador</label><input id="invitation-username" autoComplete="off" placeholder="@nome_de_usuario" maxLength={25} value={username} disabled={busy} aria-invalid={!!fieldError} aria-describedby="invitation-username-hint" onChange={event => { setUsername(event.target.value); setFieldError(''); }} /><small id="invitation-username-hint" className={fieldError ? 'field-error' : undefined}>{fieldError || 'Conta existente. Convite válido por 7 dias; não reserva vaga.'}</small></div><button className="button" type="submit" disabled={busy}>Enviar convite</button></form>}</div>
        <div className="team-sent"><h3>Convites enviados</h3>{!invitations && !error ? <p role="status">Carregando convites enviados…</p> : invitations?.items.length ? <><ul className="sent-invitations">{invitations.items.map(invitation => <li key={invitation.id}><div><strong>@{invitation.recipient.username}</strong><small>{invitationStatusLabels[invitation.status]} · {new Date(invitation.createdAt).toLocaleDateString('pt-BR')}</small></div>{invitation.status === 'PENDING' ? <button className="button button-secondary button-small" disabled={busy} aria-label={`Revogar convite de ${invitation.recipient.username}`} onClick={() => void act(() => api.request(`/campaigns/${campaignId}/invitations/${invitation.id}`, { method: 'DELETE' }), 'Convite revogado.')}>Revogar</button> : <Badge>{invitationStatusLabels[invitation.status]}</Badge>}</li>)}</ul><div className="list-pagination"><span className="muted">Página {page}</span><div><button className="button button-secondary button-small" disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="button button-secondary button-small" disabled={page * invitations.pageSize >= invitations.total || busy} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div></> : invitations ? <p className="muted">Nenhum convite enviado.</p> : null}</div>
      </> : <p className="muted">Você participa como jogador. O mestre administra os membros e convites.</p>}
    </div>
  </section>;
}
