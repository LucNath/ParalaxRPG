'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionStatusLabels, type CampaignDetail, type GameSession, type PublicGameSession } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { SessionEditor } from './session-editor';
import { SessionList } from './session-list';
import { SessionRolls } from './session-rolls';
import { SessionChat } from './session-chat';
import { Badge } from './ui/badge';
import { ApiError, errorMessage } from '@/lib/api';
import { sessionDate, sessionDuration } from '@/lib/session-date';

export function SessionWorkspace({ create = false, edit = false }: { create?: boolean; edit?: boolean }) {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>(), { api } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null), [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState(''), [actionError, setActionError] = useState(''), [saving, setSaving] = useState(false), [attempt, setAttempt] = useState(0);
  const busy = useRef(false), active = useRef<AbortController | null>(null);
  const accessLost = useCallback(() => { setSession(null); setCampaign(null); setError('Você não tem mais acesso a esta sessão ou campanha.'); }, []);
  const changed = useCallback((next: GameSession) => setSession(next), []);
  useEffect(() => {
    let disposed = false; setSession(null); setCampaign(null); setError(''); setActionError('');
    const load = async () => {
      if (disposed || busy.current) return; active.current?.abort(); const request = new AbortController(); active.current = request;
      try {
        if (create) { const value = await api.request<CampaignDetail>(`/campaigns/mine/${id}`, { signal: request.signal }); if (!disposed && !request.signal.aborted) setCampaign(value); }
        else { const value = await api.request<GameSession>(`/sessions/${sessionId}`, { signal: request.signal }); if (!disposed && !request.signal.aborted) setSession(value); }
        if (!disposed && !request.signal.aborted) { setError(''); setActionError(''); }
      } catch (cause) { if (!disposed && !request.signal.aborted) { setSession(null); setCampaign(null); setError(cause instanceof ApiError && cause.status === 404 ? 'Você não tem mais acesso a esta sessão ou campanha.' : errorMessage(cause)); } }
    };
    void load(); const refresh = () => { if (!document.hidden && !create && !edit) void load(); };
    const interval = setInterval(refresh, 30000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { disposed = true; active.current?.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, id, sessionId, create, edit, attempt]);
  async function action(verb: 'start' | 'end' | 'cancel') {
    if (!session || busy.current || (verb !== 'start' && !window.confirm(verb === 'end' ? 'Encerrar esta sessão? Ela não poderá ser reaberta.' : 'Cancelar esta agenda? Crie outra sessão se quiser retomar.'))) return;
    busy.current = true; active.current?.abort(); setSaving(true); setActionError('');
    try { const saved = await api.request<GameSession>(`/sessions/${session.id}/${verb}`, { method: 'POST', body: JSON.stringify({ expectedRevision: session.revision }) }); setSession(saved); }
    catch (cause) { setActionError(errorMessage(cause)); if (cause instanceof ApiError && cause.status === 404) accessLost(); }
    finally { busy.current = false; setSaving(false); }
  }
  if (error) return <div className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button><Link href="/sessoes" className="subtle-link">Suas sessões</Link></div>;
  if (create && campaign) return campaign.role !== 'OWNER' ? <p role="alert">Somente o mestre pode agendar sessões.</p> : ['ENDED', 'CANCELLED'].includes(campaign.status) ? <p role="alert">Reabra a campanha para agendar sessões.</p> : <SessionEditor campaign={campaign} onAccessLost={accessLost} onSessionChange={changed} />;
  if (!session) return <p role="status">Carregando sessão…</p>;
  const closed = ['ENDED', 'CANCELLED'].includes(session.campaign.status);
  if (edit) return session.canManage && session.status === 'SCHEDULED' && !closed ? <SessionEditor key={session.id} session={session} onAccessLost={accessLost} onSessionChange={changed} /> : <div className="panel page-state"><p role="alert">Esta agenda não pode ser editada. Somente o mestre edita sessões agendadas em campanhas abertas.</p><Link className="button button-secondary" href={`/sessoes/${session.id}`}>Voltar à sessão</Link></div>;
  return <><Link className="subtle-link" href={`/campanhas/${session.campaign.id}/sessoes`}>Sessões de {session.campaign.name}</Link><div className="page-heading heading-with-action"><div><Badge tone={session.status === 'LIVE' ? 'accent' : undefined}>{sessionStatusLabels[session.status]}</Badge><h1>{session.title}</h1><p>Mestre: {session.owner.displayName} · {session.system.name} · versão {session.system.version}</p></div><div className="editor-actions">{session.canManage && session.status === 'SCHEDULED' ? <>{!closed ? <><Link className="button button-secondary" href={`/sessoes/${session.id}/editar`}>Editar agenda</Link><button className="button" disabled={saving} onClick={() => void action('start')}>{saving ? 'Aguarde…' : 'Iniciar sessão'}</button></> : null}<button className="button button-secondary" disabled={saving} onClick={() => void action('cancel')}>Cancelar sessão</button></> : session.canManage && session.status === 'LIVE' ? <button className="button" disabled={saving} onClick={() => void action('end')}>{saving ? 'Aguarde…' : 'Encerrar sessão'}</button> : null}</div></div>
    {actionError ? <div className="feedback error" role="alert"><p>{actionError}</p><button className="button button-secondary button-small" disabled={saving} onClick={() => setAttempt(value => value + 1)}>Atualizar sessão</button></div> : null}
    <section className="panel campaign-presentation"><h2>O encontro</h2><p className="system-description">{session.description || 'Sem descrição.'}</p><dl className="session-facts"><div><dt>Agendada para</dt><dd><time dateTime={session.scheduledAt}>{sessionDate(session.scheduledAt, session.timeZone)}</time> · {session.timeZone}</dd></div><div><dt>Visibilidade</dt><dd>{session.visibility === 'PUBLIC' ? 'Pública quando ao vivo em campanha pública' : 'Privada — mestre e jogadores ativos'}</dd></div>{session.startedAt ? <div><dt>Iniciada em</dt><dd><time dateTime={session.startedAt}>{sessionDate(session.startedAt, session.timeZone)}</time></dd></div> : null}{session.endedAt ? <div><dt>Encerrada em</dt><dd><time dateTime={session.endedAt}>{sessionDate(session.endedAt, session.timeZone)}</time> · duração {sessionDuration(session.durationSeconds!)}</dd></div> : null}{session.cancelledAt ? <div><dt>Cancelada em</dt><dd>{sessionDate(session.cancelledAt, session.timeZone)}</dd></div> : null}</dl>
      <Link className="subtle-link" href={`/campanhas/${session.campaign.id}`}>Abrir campanha e fichas</Link>{session.status === 'LIVE' && session.visibility === 'PUBLIC' && session.campaign.visibility === 'PUBLIC' ? <Link className="button button-secondary" href={`/ao-vivo/${session.id}`} target="_blank" rel="noopener noreferrer">Ver apresentação pública</Link> : null}
      <p className="campaign-rules-note">Todos os jogadores ativos desta campanha podem acompanhar o encontro e consultar o histórico de rolagens.</p>
    </section><SessionChat key={`chat-${session.id}`} session={session} onAccessLost={accessLost} /><SessionRolls key={session.id} session={session} onAccessLost={accessLost} /></>;
}

export function CampaignSessions() {
  const { id } = useParams<{ id: string }>(), { api } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const accessLost = useCallback(() => { setCampaign(null); setError('Você não tem mais acesso a esta campanha.'); }, []);
  useEffect(() => { const abort = new AbortController(); setCampaign(null); setError(''); api.request<CampaignDetail>(`/campaigns/mine/${id}`, { signal: abort.signal }).then(value => { if (!abort.signal.aborted) setCampaign(value); }).catch(cause => { if (!abort.signal.aborted) setError(errorMessage(cause)); }); return () => abort.abort(); }, [api, id, attempt]);
  if (error) return <div className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>;
  if (!campaign) return <p role="status">Carregando campanha…</p>;
  return <><Link href={`/campanhas/${id}`} className="subtle-link">Voltar à campanha</Link><div className="page-heading heading-with-action"><div><h1>Sessões de {campaign.name}</h1><p>Agenda e histórico desta mesa.</p></div>{campaign.role === 'OWNER' && !['ENDED', 'CANCELLED'].includes(campaign.status) ? <Link className="button" href={`/campanhas/${id}/sessoes/nova`}>Agendar sessão</Link> : null}</div><SessionList campaignId={id} onAccessLost={accessLost} /></>;
}

export function PublicSession() {
  const { id } = useParams<{ id: string }>(), { api } = useAuth();
  const [session, setSession] = useState<PublicGameSession | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false, active: AbortController | undefined; setSession(null); setError('');
    const load = async () => { if (disposed || document.hidden) return; active?.abort(); active = new AbortController(); const request = active; try { const saved = await api.request<PublicGameSession>(`/sessions/public/${id}`, { signal: request.signal }, false); if (!disposed && !request.signal.aborted) { setSession(saved); setError(''); } } catch (cause) { if (!disposed && !request.signal.aborted) { setSession(null); setError(cause instanceof ApiError && cause.status === 404 ? 'Esta sessão não está mais pública ou ao vivo.' : errorMessage(cause)); } } };
    void load(); const refresh = () => void load(), interval = setInterval(refresh, 30000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { disposed = true; active?.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, id, attempt]);
  if (error) return <section className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button><Link className="subtle-link" href="/ao-vivo">Voltar ao catálogo</Link></section>;
  if (!session) return <p role="status">Carregando apresentação…</p>;
  return <><div className="page-heading"><Badge tone="accent">Ao vivo</Badge><h1>{session.title}</h1><p>{session.campaign.name} · Mestre: {session.owner.displayName}</p></div><section className="panel campaign-presentation"><p className="system-description">{session.description || 'Uma aventura está acontecendo.'}</p><p>Iniciada em {sessionDate(session.startedAt, session.timeZone)} · {session.timeZone}</p><p>{session.system.name} · versão {session.system.version}</p><Link className="subtle-link" href={`/c/${session.campaign.id}`}>Conhecer campanha</Link><p className="campaign-rules-note">Esta página apresenta o encontro. As fichas e o histórico de rolagens ficam disponíveis para o mestre e os jogadores ativos da campanha.</p></section></>;
}
