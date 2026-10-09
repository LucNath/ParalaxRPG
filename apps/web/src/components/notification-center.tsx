'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SocialNotificationsPage, SocialNotificationItem } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { useNotifications } from './notification-provider';
import { Avatar } from './avatar';
import { errorMessage } from '@/lib/api';

export function NotificationCenter() {
  const { api } = useAuth(); const { refresh } = useNotifications(); const router = useRouter();
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<SocialNotificationsPage | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const abort = new AbortController(); let inFlight = false;
    async function load() {
      if (inFlight || document.visibilityState !== 'visible') return; inFlight = true;
      try { const result = await api.request<SocialNotificationsPage>(`/social/notifications?page=${page}`, { signal: abort.signal }); if (!abort.signal.aborted) { setData(result); setError(''); } }
      catch (cause) { if (!abort.signal.aborted) setError(errorMessage(cause)); }
      finally { inFlight = false; }
    }
    void load(); const timer = setInterval(() => void load(), 15000); const focus = () => void load();
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [api, page, attempt]);
  async function acknowledge(item: SocialNotificationItem, open = false) {
    if (busy) return; setBusy(item.id); setError('');
    try {
      await api.request(`/social/notifications/${item.id}/read`, { method: 'POST', body: JSON.stringify({ version: item.version }) });
      refresh(); setAttempt(value => value + 1);
      if (open) router.push(item.kind === 'SESSION_MESSAGE' ? `/sessoes/${item.session.id}#chat` : `/amigos?conexao=${item.friendshipId}`);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  }
  return <section className="panel notification-center" aria-label="Central de notificações">
    {error ? <div className="social-error"><p role="alert" className="feedback error">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : null}
    {!data && !error ? <p role="status" className="social-empty">Carregando notificações…</p> : data?.total === 0 ? <p className="social-empty muted">Tudo em dia. Suas próximas amizades e conversas aparecerão aqui.</p> : null}
    {data?.items.map(item => <article key={item.id} className={`notification-item ${item.readAt ? '' : 'unseen'}`} aria-label={`Notificação de ${item.person.username}`}>
      <Avatar user={item.person} /><div className="notification-details"><p><strong>@{item.person.username}</strong> {item.kind === 'REQUEST' ? 'quer adicionar você como amigo.' : item.kind === 'ACCEPTED' ? 'aceitou sua amizade.' : item.kind === 'SESSION_MESSAGE' ? <>enviou mensagens na sessão <strong>{item.session.title}</strong>.</> : 'enviou novas mensagens.'}</p><time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString('pt-BR')}</time><span className="muted"> · {item.readAt ? 'Vista' : 'Nova'}</span><div className="social-actions"><button className="button button-small" disabled={busy !== null} onClick={() => void acknowledge(item, true)}>{item.kind === 'REQUEST' ? 'Ver solicitação' : item.kind === 'SESSION_MESSAGE' ? 'Abrir chat da sessão' : 'Abrir conversa'}</button>{!item.readAt ? <button className="subtle-link" disabled={busy !== null} onClick={() => void acknowledge(item)}>Marcar como vista</button> : null}</div></div>
    </article>)}
    {data && (page > 1 || data.total > data.pageSize) ? <div className="social-pagination"><button className="button button-secondary button-small" disabled={page === 1 || busy !== null} onClick={() => { setData(null); setPage(value => value - 1); }}>Anterior</button><span className="muted">Página {page}</span><button className="button button-secondary button-small" disabled={page * data.pageSize >= data.total || busy !== null} onClick={() => { setData(null); setPage(value => value + 1); }}>Próxima</button></div> : null}
  </section>;
}
