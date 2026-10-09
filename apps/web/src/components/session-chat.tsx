'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { sessionMessageSchema, type GameSession, type SessionMessage, type SessionMessageInput, type SessionMessagesPage } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { useNotifications } from './notification-provider';
import { ApiError, errorMessage } from '@/lib/api';

function merge(previous: SessionMessage[], incoming: SessionMessage[]) {
  const messages = new Map(previous.map(item => [item.sequence, item]));
  for (const item of incoming) messages.set(item.sequence, item);
  return [...messages.values()].sort((a, b) => a.sequence - b.sequence);
}

export function SessionChat({ session, onAccessLost }: { session: GameSession; onAccessLost: () => void }) {
  const { api, user } = useAuth(); const { refresh } = useNotifications();
  const [data, setData] = useState<SessionMessagesPage | null>(null), [draft, setDraft] = useState(''), [error, setError] = useState('');
  const [sending, setSending] = useState(false), [olderBusy, setOlderBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<SessionMessageInput | null>(null), [away, setAway] = useState(false);
  const scroll = useRef<HTMLDivElement>(null), bottom = useRef(true), visible = useRef(false), readSequence = useRef(0);
  const busy = useRef(false), mounted = useRef(true), writes = useRef<AbortController | null>(null);
  const callbacks = useRef({ onAccessLost, refresh }); callbacks.current = { onAccessLost, refresh };
  const path = `/sessions/${session.id}/messages`;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; writes.current?.abort(); }; }, []);
  useEffect(() => {
    const element = scroll.current; if (!element) return;
    if (window.location.hash === '#chat') element.closest('section')?.scrollIntoView({ block: 'start' });
    const observer = new IntersectionObserver(entries => {
      visible.current = entries[0].isIntersecting;
      if (visible.current) setAttempt(value => value + 1);
    }, { threshold: 0.1 });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const abort = new AbortController(); let inFlight = false;
    async function load() {
      if (inFlight || document.hidden) return; inFlight = true;
      try {
        const result = await api.request<SessionMessagesPage>(path, { signal: abort.signal });
        if (abort.signal.aborted) return;
        setData(previous => {
          // If polling skipped a full page, replace the incomplete window and offer older history.
          const gap = previous?.items.length && result.items.length && result.items[0].sequence > previous.items.at(-1)!.sequence + 1;
          return { ...result, items: previous && !gap ? merge(previous.items, result.items) : result.items,
            nextCursor: previous && !gap ? previous.nextCursor : result.nextCursor };
        });
        setError(''); const sequence = result.items.at(-1)?.sequence ?? 0;
        readSequence.current = Math.max(readSequence.current, result.readSequence);
        if (!document.hidden && visible.current && bottom.current && sequence > readSequence.current) {
          await api.request(`${path}/read`, { method: 'POST', signal: abort.signal, body: JSON.stringify({ sequence }) });
          if (!abort.signal.aborted) { readSequence.current = sequence; callbacks.current.refresh(); }
        }
      } catch (cause) {
        if (!abort.signal.aborted) {
          if (cause instanceof ApiError && [403, 404].includes(cause.status)) callbacks.current.onAccessLost();
          else setError(errorMessage(cause));
        }
      } finally { inFlight = false; }
    }
    void load(); const timer = setInterval(() => void load(), 7000); const focus = () => void load();
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [api, path, attempt]);
  useEffect(() => { if (bottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [data?.items]);
  async function older() {
    if (olderBusy || data?.nextCursor == null) return; setOlderBusy(true); bottom.current = false; setAway(true);
    const element = scroll.current, height = element?.scrollHeight ?? 0, top = element?.scrollTop ?? 0;
    try {
      const result = await api.request<SessionMessagesPage>(`${path}?before=${data.nextCursor}`);
      if (!mounted.current) return;
      setData(previous => ({ ...(previous ?? result), items: merge(previous?.items ?? [], result.items), nextCursor: result.nextCursor })); setError('');
      requestAnimationFrame(() => { if (mounted.current && element) element.scrollTop = top + element.scrollHeight - height; });
    } catch (cause) {
      if (!mounted.current) return;
      if (cause instanceof ApiError && [403, 404].includes(cause.status)) callbacks.current.onAccessLost(); else setError(errorMessage(cause));
    } finally { if (mounted.current) setOlderBusy(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (busy.current) return;
    const parsed = sessionMessageSchema.safeParse(pending ?? { requestId: crypto.randomUUID(), content: draft });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    busy.current = true; setSending(true); setPending(parsed.data); setError(''); writes.current = new AbortController();
    try {
      const saved = await api.request<SessionMessage>(path, { method: 'POST', body: JSON.stringify(parsed.data), signal: writes.current.signal });
      if (!mounted.current) return;
      bottom.current = true; setAway(false); setData(previous => previous ? { ...previous, items: merge(previous.items, [saved]) } : previous);
      setDraft(''); setPending(null); setAttempt(value => value + 1);
    } catch (cause) {
      if (!mounted.current) return; setError(errorMessage(cause));
      if (cause instanceof ApiError && cause.status < 500 && cause.status !== 429) setPending(null);
      if (cause instanceof ApiError && [403, 404].includes(cause.status)) callbacks.current.onAccessLost();
      if (cause instanceof ApiError && cause.status === 409) setAttempt(value => value + 1);
    } finally { busy.current = false; if (mounted.current) setSending(false); }
  }
  const open = data?.canSend && ['SCHEDULED', 'LIVE'].includes(session.status);
  return <section id="chat" className="panel session-chat" aria-labelledby="session-chat-heading">
    <header className="rolls-heading"><div><h2 id="session-chat-heading"><MessageCircle size={21} aria-hidden="true" /> Chat da sessão</h2><p className="muted">Conversa privada entre o mestre e os participantes ativos da campanha.</p></div><button className="button button-secondary button-small" onClick={() => setAttempt(value => value + 1)}>Atualizar chat</button></header>
    {error ? <p className="feedback error" role="alert">{error}</p> : null}
    <div ref={scroll} className="social-message-scroll session-message-scroll" role="region" aria-label="Histórico do chat" tabIndex={0} onScroll={event => {
      const element = event.currentTarget; bottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 50; setAway(!bottom.current);
      if (bottom.current && away) setAttempt(value => value + 1);
    }}>
      {data?.nextCursor != null ? <button className="button button-secondary button-small" disabled={olderBusy} onClick={() => void older()}>{olderBusy ? 'Carregando…' : 'Carregar mensagens anteriores'}</button> : null}
      {!data ? <p role="status">Carregando chat…</p> : !data.items.length ? <p className="muted">Nenhuma mensagem ainda. Combine a próxima aventura com a mesa.</p> : null}
      <ol className="social-messages" aria-label="Mensagens da sessão">{data?.items.map(item => <li key={item.id} className={item.sender.id === user?.id ? 'mine' : ''}>
        <span className="social-message-author">{item.sender.id === user?.id ? 'Você' : item.sender.displayName} <span className="muted">@{item.sender.username}</span></span><p>{item.content}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: session.timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</time>
      </li>)}</ol>
    </div>
    {away ? <button className="button button-secondary button-small subtle-link" onClick={() => { bottom.current = true; setAway(false); if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; setAttempt(value => value + 1); }}>Ir às mensagens recentes</button> : null}
    {data && (open || pending) ? <form className="social-message-form" onSubmit={send} noValidate><label htmlFor="session-message">Mensagem para a mesa</label><textarea id="session-message" rows={3} value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} disabled={sending || !!pending} placeholder="Prepare os planos ou conte sua próxima ação…" required />
      {pending && !sending ? <p className="muted" role="status">A confirmação está pendente. Reenvie a mesma mensagem para confirmar sem duplicar.</p> : null}
      <div><small className="muted">{draft.length}/2000 · Atualiza a cada 7 segundos</small><button className="button" type="submit" disabled={sending || (!pending && !draft.trim())}><Send size={16} aria-hidden="true" />{sending ? 'Enviando…' : pending ? 'Reenviar mesma mensagem' : 'Enviar para a mesa'}</button></div>
    </form> : data ? <p className="roll-note">O envio está encerrado. O histórico permanece disponível aos participantes ativos.</p> : null}
  </section>;
}
