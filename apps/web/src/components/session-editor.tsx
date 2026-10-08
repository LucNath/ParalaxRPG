'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { sessionSettingsSchema, sessionInstant, sessionLocalTime, type CampaignDetail, type GameSession } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { ApiError, errorMessage } from '@/lib/api';

function draft(session?: GameSession) {
  const timeZone = session?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { title: session?.title ?? '', description: session?.description ?? '', visibility: session?.visibility ?? 'PRIVATE', timeZone, local: sessionLocalTime(session?.scheduledAt ?? new Date(Date.now() + 3600000).toISOString(), timeZone) };
}
export function SessionEditor({ campaign, session, onAccessLost, onSessionChange }: { campaign?: CampaignDetail; session?: GameSession; onAccessLost: () => void; onSessionChange: (value: GameSession) => void }) {
  const { api } = useAuth(), router = useRouter();
  const [input, setInput] = useState(() => draft(session)); const [baseline, setBaseline] = useState(() => JSON.stringify(input));
  const [fixed, setFixed] = useState(session), [saving, setSaving] = useState(false), [conflict, setConflict] = useState(false);
  const [error, setError] = useState(''), [errors, setErrors] = useState<Record<string, string>>({});
  const busy = useRef(false), dirty = JSON.stringify(input) !== baseline, sessionId = session?.id, revision = fixed?.revision;
  useEffect(() => {
    if (!sessionId) return; let disposed = false, active: AbortController | undefined;
    const refresh = async () => {
      if (disposed || document.hidden || busy.current) return; active?.abort(); active = new AbortController(); const request = active;
      try { const saved = await api.request<GameSession>(`/sessions/${sessionId}`, { signal: request.signal }); if (!disposed && !request.signal.aborted && (saved.revision !== revision || saved.status !== 'SCHEDULED')) { setConflict(true); setError('Esta sessão foi alterada em outra janela. Seu rascunho foi preservado. Carregue a versão atual antes de salvar.'); } }
      catch (cause) { if (!disposed && !request.signal.aborted && cause instanceof ApiError && cause.status === 404) onAccessLost(); }
    };
    const update = () => void refresh(), interval = setInterval(update, 30000); window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    return () => { disposed = true; active?.abort(); clearInterval(interval); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [api, sessionId, revision, onAccessLost]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => { if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null; if (link && link.target !== '_blank' && link.href !== location.href && !window.confirm('Você tem alterações não salvas. Sair do editor?')) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  function change(next: typeof input) { setInput(next); setErrors({}); if (!conflict) setError(''); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy.current || conflict) return; setErrors({}); setError('');
    let scheduledAt: string;
    try { scheduledAt = fixed && fixed.timeZone === input.timeZone && sessionLocalTime(fixed.scheduledAt, fixed.timeZone) === input.local ? fixed.scheduledAt : sessionInstant(input.local, input.timeZone); }
    catch (cause) { setErrors({ scheduledAt: cause instanceof Error ? cause.message : 'Confira a agenda.' }); setError('Confira a data e o fuso antes de salvar.'); return; }
    const parsed = sessionSettingsSchema.safeParse({ title: input.title, description: input.description, visibility: input.visibility, timeZone: input.timeZone, scheduledAt });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message]))); setError('Confira os campos destacados antes de salvar.'); return; }
    busy.current = true; setSaving(true);
    try {
      const saved = await api.request<GameSession>(sessionId ? `/sessions/${sessionId}` : `/campaigns/${campaign!.id}/sessions`, { method: sessionId ? 'PUT' : 'POST', body: JSON.stringify({ ...parsed.data, ...(sessionId ? { expectedRevision: revision } : {}) }) });
      const next = draft(saved); setInput(next); setBaseline(JSON.stringify(next)); setFixed(saved); setConflict(false); onSessionChange(saved); if (!sessionId) router.replace(`/sessoes/${saved.id}`);
    } catch (cause) { setError(errorMessage(cause)); if (cause instanceof ApiError) { if (cause.status === 404) onAccessLost(); if (cause.body.error.code === 'SESSION_REVISION_CONFLICT') setConflict(true); if (cause.body.error.details) setErrors(Object.fromEntries(cause.body.error.details.map(issue => [issue.field, issue.message]))); } }
    finally { busy.current = false; setSaving(false); }
  }
  async function reload() {
    if (!sessionId || busy.current || !window.confirm('Carregar a sessão salva? Suas alterações locais serão descartadas.')) return; busy.current = true; setSaving(true);
    try { const saved = await api.request<GameSession>(`/sessions/${sessionId}`), next = draft(saved); setInput(next); setBaseline(JSON.stringify(next)); setFixed(saved); setConflict(false); setError(''); setErrors({}); onSessionChange(saved); }
    catch (cause) { setError(errorMessage(cause)); if (cause instanceof ApiError && cause.status === 404) onAccessLost(); }
    finally { busy.current = false; setSaving(false); }
  }
  const parent = campaign ?? session!.campaign;
  return <form className="session-editor" onSubmit={save} noValidate><div className="editor-heading"><div><Link className="subtle-link" href={sessionId ? `/sessoes/${sessionId}` : `/campanhas/${parent.id}`}>{sessionId ? 'Voltar à sessão' : 'Voltar à campanha'}</Link><h1>{sessionId ? 'Editar sessão' : 'Agendar sessão'}</h1><span className="save-state" role="status">{saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : fixed ? 'Agenda salva' : 'Nova sessão'}</span></div><button className="button" type="submit" disabled={saving || conflict || (!!sessionId && !dirty)}>{sessionId ? 'Salvar agenda' : 'Criar sessão'}</button></div>
    {error ? <div className="feedback error" role="alert"><p>{error}</p>{conflict ? <button className="button button-secondary button-small" type="button" onClick={() => void reload()} disabled={saving}>Carregar versão atual</button> : null}</div> : null}
    <section className="panel"><div className="panel-heading"><h2>{parent.name}</h2></div><fieldset className="editor-fields form-stack" disabled={saving}>
      <div className="form-field"><label htmlFor="session-title">Título da sessão</label><input id="session-title" maxLength={120} required value={input.title} aria-invalid={!!errors.title} aria-describedby={errors.title ? 'session-title-error' : undefined} onChange={event => change({ ...input, title: event.target.value })} />{errors.title ? <small id="session-title-error" className="field-error">{errors.title}</small> : null}</div>
      <div className="form-field"><label htmlFor="session-description">Descrição da sessão</label><textarea id="session-description" rows={5} maxLength={4000} value={input.description} aria-invalid={!!errors.description} aria-describedby={errors.description ? 'session-description-error' : undefined} onChange={event => change({ ...input, description: event.target.value })} />{errors.description ? <small id="session-description-error" className="field-error">{errors.description}</small> : null}</div>
      <div className="campaign-settings-grid"><div className="form-field"><label htmlFor="session-date">Data e horário</label><input id="session-date" type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" required value={input.local} aria-invalid={!!errors.scheduledAt} aria-describedby="session-date-hint" onChange={event => change({ ...input, local: event.target.value })} /><small id="session-date-hint" className={errors.scheduledAt ? 'field-error' : undefined}>{errors.scheduledAt || 'Horário no fuso escolhido. A sessão começa quando o mestre clicar em Iniciar.'}</small></div>
      <div className="form-field"><label htmlFor="session-zone">Fuso horário</label><input id="session-zone" value={input.timeZone} maxLength={80} list="session-zones" required aria-invalid={!!errors.timeZone} aria-describedby="session-zone-hint" onChange={event => change({ ...input, timeZone: event.target.value })} /><datalist id="session-zones">{['America/Fortaleza', 'America/Sao_Paulo', 'America/Manaus', 'America/Rio_Branco', 'Europe/Lisbon', 'America/New_York', 'UTC'].map(zone => <option key={zone} value={zone} />)}</datalist><small id="session-zone-hint" className={errors.timeZone ? 'field-error' : undefined}>{errors.timeZone || 'Use um fuso IANA, como America/Fortaleza ou UTC.'}</small></div></div>
      <div className="form-field"><label htmlFor="session-visibility">Visibilidade da sessão</label><select id="session-visibility" value={input.visibility} onChange={event => change({ ...input, visibility: event.target.value as typeof input.visibility })}><option value="PRIVATE">Privada — mestre e jogadores ativos</option><option value="PUBLIC" disabled={parent.visibility !== 'PUBLIC'}>Pública — apresentação enquanto ao vivo</option></select><small>{input.visibility === 'PUBLIC' ? 'Enquanto ao vivo e em campanha pública, título, descrição, agenda, mestre e nome/versão do sistema aparecerão no catálogo público. Fichas e regras privadas permanecem protegidas.' : 'Todos os jogadores ativos desta campanha podem consultar a agenda.'}</small></div>
    </fieldset></section></form>;
}
