'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Search, Send, UserPlus } from 'lucide-react';
import type { SocialConnectionsPage, SocialConnection, SocialPerson, DirectMessagesPage, DirectMessageItem } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { Avatar } from './avatar';
import { ApiError, errorMessage } from '@/lib/api';

type Action = 'accept' | 'decline' | 'cancel' | 'remove' | 'block' | 'unblock';
export function SocialWorkspace() {
  const { api } = useAuth();
  const [connections, setConnections] = useState<SocialConnectionsPage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SocialPerson[] | null>(null);
  const [selected, setSelected] = useState<SocialConnection | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const busyRef = useRef(false);
  const [confirmation, setConfirmation] = useState<{ connection: SocialConnection; action: 'block' | 'remove' } | null>(null);
  useEffect(() => {
    const abort = new AbortController(); let inFlight = false;
    const refresh = async () => {
      if (inFlight || busyRef.current || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const value = await api.request<SocialConnectionsPage>(`/social/connections?page=${page}`, { signal: abort.signal });
        if (!abort.signal.aborted) {
          setConnections(value);
          setSelected(previous => {
            if (!previous) return null;
            const current = value.items.find(item => item.id === previous.id);
            // Page changes do not discard an open chat; the chat independently checks access.
            return current ? current.status === 'ACCEPTED' ? current : null : previous;
          });
        }
      } catch (cause) { if (!abort.signal.aborted) setError(errorMessage(cause)); }
      finally { inFlight = false; }
    };
    void refresh(); const timer = setInterval(() => void refresh(), 15000);
    const focus = () => void refresh(); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [api, page, attempt]);
  async function find(event: React.FormEvent) {
    event.preventDefault(); if (searching) return;
    setSearching(true); setError(''); setResults(null);
    try { setResults((await api.request<{ items: SocialPerson[] }>(`/social/search?search=${encodeURIComponent(search.trim())}`)).items); }
    catch (cause) { setError(errorMessage(cause)); } finally { setSearching(false); }
  }
  async function add(username: string) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await api.request('/social/requests', { method: 'POST', body: JSON.stringify({ username }) }); setNotice('Solicitação enviada. A conversa ficará disponível após o aceite.'); setAttempt(value => value + 1); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function act(connection: SocialConnection, action: Action) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await api.request(`/social/connections/${connection.id}/action`, { method: 'POST', body: JSON.stringify({ action }) });
      setNotice({ accept: 'Amizade aceita. Vocês já podem conversar.', decline: 'Solicitação recusada.', cancel: 'Solicitação cancelada.', remove: 'Amizade removida.', block: 'Pessoa bloqueada. Novas solicitações e mensagens estão impedidas.', unblock: 'Pessoa desbloqueada. A amizade não é restaurada automaticamente.' }[action]);
      if (selected?.id === connection.id && action !== 'accept') setSelected(null);
      setConfirmation(null); setAttempt(value => value + 1);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <>
    <section className="panel social-search"><h2><UserPlus size={20} /> Encontre aventureiros</h2><form onSubmit={find}><label htmlFor="friend-search">Nome de usuário</label><div className="social-search-row"><input id="friend-search" placeholder="@nomeusuario" value={search} onChange={event => setSearch(event.target.value)} minLength={3} maxLength={31} required /><button className="button" disabled={searching}><Search size={17} />{searching ? 'Buscando…' : 'Buscar'}</button></div><p className="muted">Digite pelo menos 3 caracteres. A busca usa o início do nome de usuário.</p></form>
      {results ? <div className="social-search-results">{results.length ? results.map(person => <div className="social-person" key={person.id}><Avatar user={person} /><Link href={`/u/${person.username}`}>{person.displayName}<small>@{person.username}</small></Link><button className="button button-secondary button-small" disabled={busy || connections?.items.some(item => item.person.id === person.id)} onClick={() => void add(person.username)}>Adicionar</button></div>) : <p className="muted">Nenhum aventureiro encontrado.</p>}</div> : null}
    </section>
    {notice ? <p className="feedback success" role="status">{notice}</p> : null}
    {error ? <div className="social-error"><p className="feedback error" role="alert">{error}</p><button className="button button-secondary button-small" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Atualizar lista</button></div> : null}
    <div className="social-grid"><section className="panel social-connections"><div className="panel-heading"><h2><MessageCircle size={18} /> Sua companhia</h2></div>
      {!connections && !error ? <p role="status" className="social-empty">Carregando amizades…</p> : connections?.items.length === 0 ? <p className="social-empty muted">Sua próxima amizade começa com um convite. Busque alguém acima para adicionar.</p> : null}
      <div className="social-connection-list">{connections?.items.map(connection => <article className={`social-connection ${selected?.id === connection.id ? 'active' : ''}`} key={connection.id} aria-label={`Amizade com ${connection.person.username}`}><div className="social-person"><Avatar user={connection.person} /><Link href={`/u/${connection.person.username}`}>{connection.person.displayName}<small>@{connection.person.username}</small></Link>{connection.unread > 0 ? <span className="social-unread" aria-label={`${connection.unread} mensagens não lidas`}>{connection.unread}</span> : null}</div>
        {connection.status === 'ACCEPTED' ? <><p className="social-preview muted">{connection.lastMessage?.content || 'Vocês já podem conversar.'}</p><div className="social-actions"><button className="button button-small" onClick={() => setSelected(connection)}>Conversar</button><button className="subtle-link" disabled={busy} onClick={() => setConfirmation({ connection, action: 'remove' })}>Remover</button><button className="subtle-link" disabled={busy} onClick={() => setConfirmation({ connection, action: 'block' })}>Bloquear</button></div></> : connection.status === 'PENDING' ? <><p className="muted">{connection.incoming ? 'Quer adicionar você como amigo.' : 'Solicitação enviada. Aguardando resposta.'}</p><div className="social-actions">{connection.incoming ? <><button className="button button-small" disabled={busy} onClick={() => void act(connection, 'accept')}>Aceitar amizade</button><button className="button button-secondary button-small" disabled={busy} onClick={() => void act(connection, 'decline')}>Recusar</button></> : <button className="button button-secondary button-small" disabled={busy} onClick={() => void act(connection, 'cancel')}>Cancelar solicitação</button>}<button className="subtle-link" disabled={busy} onClick={() => setConfirmation({ connection, action: 'block' })}>Bloquear</button></div></> : <><p className="muted">Você bloqueou esta pessoa.</p><button className="button button-secondary button-small" disabled={busy} onClick={() => void act(connection, 'unblock')}>Desbloquear</button></>}
      </article>)}</div>
      {connections && (page > 1 || connections.total > connections.pageSize) ? <div className="social-pagination"><button className="button button-secondary button-small" disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>Anterior</button><span className="muted">Página {page}</span><button className="button button-secondary button-small" disabled={page * connections.pageSize >= connections.total || busy} onClick={() => setPage(value => value + 1)}>Próxima</button></div> : null}
    </section><section className="panel social-chat">{selected ? <DirectConversation key={selected.id} connection={selected} onRead={() => setAttempt(value => value + 1)} onUnavailable={() => { setSelected(null); setAttempt(value => value + 1); setNotice('Esta conversa não está mais disponível.'); }} /> : <div className="social-chat-placeholder"><MessageCircle size={34} /><h2>Uma conversa pode começar uma aventura.</h2><p className="muted">Selecione um amigo para trocar mensagens privadas.</p></div>}</section></div>
    {confirmation ? <div className="social-confirmation" role="alertdialog" aria-modal="false" aria-label="Confirmar alteração de amizade"><p>{confirmation.action === 'block' ? `Bloquear @${confirmation.connection.person.username}? Novas mensagens e solicitações serão impedidas.` : `Remover @${confirmation.connection.person.username} dos seus amigos? A conversa ficará indisponível.`}</p><div className="social-actions"><button className="button" disabled={busy} onClick={() => void act(confirmation.connection, confirmation.action)}>Confirmar {confirmation.action === 'block' ? 'bloqueio' : 'remoção'}</button><button className="button button-secondary" disabled={busy} onClick={() => setConfirmation(null)}>Voltar</button></div></div> : null}
  </>;
}

function DirectConversation({ connection, onRead, onUnavailable }: { connection: SocialConnection; onRead: () => void; onUnavailable: () => void }) {
  const { api, user } = useAuth();
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const hasMore = messages.length > 0 && messages[0].sequence > 1;
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [olderBusy, setOlderBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onRead, onUnavailable }); callbacks.current = { onRead, onUnavailable };
  const sendRef = useRef(false);
  const pending = useRef<{ content: string; requestId: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const scroll = useRef(true);
  const readSequence = useRef(0);
  const path = `/social/connections/${connection.id}`;
  useEffect(() => {
    const abort = new AbortController(); let inFlight = false;
    const refresh = async () => {
      if (inFlight || document.visibilityState !== 'visible') return; inFlight = true;
      try {
        const result = await api.request<DirectMessagesPage>(`${path}/messages`, { signal: abort.signal });
        if (abort.signal.aborted) return;
        setMessages(previous => {
          if (previous.length && result.items.length && result.items[0].sequence > previous.at(-1)!.sequence + 1) return result.items;
          return mergeMessages(previous, result.items);
        });
        setLoaded(true);
        const sequence = result.items.at(-1)?.sequence ?? 0;
        if (document.visibilityState === 'visible' && scroll.current && sequence > readSequence.current) {
          await api.request(`${path}/read`, { method: 'POST', signal: abort.signal, body: JSON.stringify({ sequence }) });
          if (!abort.signal.aborted) { readSequence.current = sequence; callbacks.current.onRead(); }
        }
      } catch (cause) {
        if (!abort.signal.aborted) { if (cause instanceof ApiError && cause.status === 404) callbacks.current.onUnavailable(); else setError(errorMessage(cause)); }
      } finally { inFlight = false; }
    };
    void refresh(); const timer = setInterval(() => void refresh(), 7000);
    const focus = () => void refresh(); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [api, path, attempt]);
  useEffect(() => { if (scroll.current) end.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);
  async function older() {
    if (olderBusy) return; setOlderBusy(true); setError(''); scroll.current = false;
    try { const result = await api.request<DirectMessagesPage>(`${path}/messages?before=${messages[0].sequence}`); setMessages(previous => mergeMessages(previous, result.items)); }
    catch (cause) { setError(errorMessage(cause)); } finally { setOlderBusy(false); }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault(); const content = draft.trim(); if (!content || sendRef.current) return;
    sendRef.current = true; setSending(true); setError('');
    if (pending.current?.content !== content) pending.current = { content, requestId: crypto.randomUUID() };
    try {
      const result = await api.request<DirectMessageItem>(`${path}/messages`, { method: 'POST', body: JSON.stringify(pending.current) });
      scroll.current = true; setMessages(previous => mergeMessages(previous, [result])); setDraft(''); pending.current = null; setAttempt(value => value + 1); callbacks.current.onRead();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { sendRef.current = false; setSending(false); }
  }
  return <><header className="social-chat-heading"><Avatar user={connection.person} /><div><h2>Conversa com {connection.person.displayName}</h2><Link className="muted" href={`/u/${connection.person.username}`}>@{connection.person.username}</Link></div></header>
    {error ? <div className="social-error"><p className="feedback error" role="alert">{error}</p><button className="button button-secondary button-small" onClick={() => { setError(''); setAttempt(value => value + 1); }}>Atualizar conversa</button></div> : null}
    <div className="social-message-scroll" onScroll={event => { const element = event.currentTarget; scroll.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }}>
      {hasMore ? <button className="button button-secondary button-small" disabled={olderBusy} onClick={() => void older()}>{olderBusy ? 'Carregando…' : 'Carregar mensagens anteriores'}</button> : null}
      {!loaded ? <p role="status">Carregando conversa…</p> : !messages.length ? <p className="muted">Ainda não há mensagens. Diga olá!</p> : null}
      <ol className="social-messages" aria-label="Mensagens da conversa">{messages.map(item => <li className={item.senderId === user?.id ? 'mine' : ''} key={item.id}><span className="social-message-author">{item.senderId === user?.id ? 'Você' : connection.person.displayName}</span><p>{item.content}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></li>)}</ol><div ref={end} />
    </div><form className="social-message-form" onSubmit={send}><label htmlFor="direct-message">Sua mensagem</label><textarea id="direct-message" value={draft} onChange={event => setDraft(event.target.value)} disabled={sending} maxLength={2000} rows={3} required placeholder="Combine a próxima aventura…" /><div><small className="muted">{draft.length}/2000 · Conversa privada entre amigos</small><button className="button" disabled={sending || !draft.trim()}><Send size={16} />{sending ? 'Enviando…' : 'Enviar mensagem'}</button></div></form>
  </>;
}
function mergeMessages(previous: DirectMessageItem[], incoming: DirectMessageItem[]) {
  const rows = new Map(previous.map(item => [item.sequence, item])); for (const item of incoming) rows.set(item.sequence, item);
  return [...rows.values()].sort((a, b) => a.sequence - b.sequence);
}
