'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { NotificationSummary } from '@paralax/contracts';
import { useAuth } from './auth-provider';

const empty: NotificationSummary = { incomingRequests: 0, unreadMessages: 0, unreadNotifications: 0, sessionUnreadMessages: 0 };
const Context = createContext({ summary: empty, refresh: () => {} });
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { api, user } = useAuth();
  const path = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ owner: string; summary: NotificationSummary } | null>(null);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!user) { setState(null); return; }
    const owner = user.id, abort = new AbortController(); let inFlight = false;
    async function fetchSummary() {
      if (inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try { const summary = await api.request<NotificationSummary>('/social/notifications/summary', { signal: abort.signal }); if (!abort.signal.aborted) setState({ owner, summary }); }
      catch { /* Keep the last successful counters and retry on focus or next poll. */ }
      finally { inFlight = false; }
    }
    void fetchSummary(); const timer = setInterval(() => void fetchSummary(), 15000);
    const focus = () => void fetchSummary(); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [api, user?.id, path, attempt]);
  const summary = user && state?.owner === user.id ? state.summary : empty;
  const value = useMemo(() => ({ summary, refresh }), [summary, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useNotifications() { return useContext(Context); }
export function NotificationBell() {
  const { summary } = useNotifications();
  return <Link href="/notificacoes" className="icon-button notification-bell" aria-label="Notificações" title={`${summary.unreadNotifications} notificações não vistas`}><Bell size={20} />{summary.unreadNotifications > 0 ? <span className="notification-badge" data-testid="notification-count">{summary.unreadNotifications > 99 ? '99+' : summary.unreadNotifications}</span> : null}</Link>;
}
