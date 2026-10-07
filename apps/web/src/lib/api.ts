import type { ApiErrorBody, AuthResponse } from '@paralax/contracts';

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ApiErrorBody) { super(body.error.message); }
}

async function read<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.error ? body : {
    error: { code: 'NETWORK_ERROR', message: 'Não foi possível concluir a ação. Tente novamente.', requestId: '' },
  });
  return body as T;
}

// One instance per AuthProvider. Tokens stay in memory, never in localStorage or server module state.
export function createApiClient(onSessionExpired?: () => void) {
  let accessToken: string | null = null;
  let pendingRefresh: Promise<AuthResponse | null> | null = null;
  let sessionEpoch = 0;
  const base = '/api/v1';
  const client = {
    setToken(token: string | null) { accessToken = token; sessionEpoch++; },
    async refresh(): Promise<AuthResponse | null> {
      if (pendingRefresh) return pendingRefresh;
      const epoch = sessionEpoch;
      const run = async () => {
        const response = await fetch(`${base}/auth/refresh`, { method: 'POST', credentials: 'include', cache: 'no-store' });
        if (response.status === 401) {
          if (epoch === sessionEpoch) { accessToken = null; onSessionExpired?.(); }
          return null;
        }
        const session = await read<AuthResponse>(response);
        if (epoch !== sessionEpoch) return null;
        accessToken = session.accessToken;
        return session;
      };
      // Web Locks serialize refreshes between tabs sharing the same HttpOnly cookie.
      pendingRefresh = (async () => {
        return typeof navigator !== 'undefined' && navigator.locks
          ? await navigator.locks.request('paralax-refresh', run) : await run();
      })().finally(() => { pendingRefresh = null; });
      return pendingRefresh;
    },
    async request<T>(path: string, options: RequestInit = {}, authenticate = true): Promise<T> {
      const send = () => {
        const headers = new Headers(options.headers);
        if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
        if (authenticate && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
        return fetch(`${base}${path}`, { ...options, headers, credentials: 'include', cache: 'no-store' });
      };
      let response = await send();
      if (authenticate && response.status === 401) {
        const session = await client.refresh();
        if (session) response = await send();
      }
      return read<T>(response);
    },
  };
  return client;
}
export type ApiClient = ReturnType<typeof createApiClient>;
export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível conectar. Confira sua conexão e tente novamente.';
}
