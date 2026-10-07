'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthResponse, CurrentUser, LoginInput, RegisterInput } from '@paralax/contracts';
import { ApiClient, createApiClient, errorMessage } from '@/lib/api';

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  initializationError: string | null;
  api: ApiClient;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: CurrentUser) => void;
  retry: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [api] = useState(() => createApiClient(() => setUser(null)));
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setInitializationError(null);
    api.refresh().then(session => { if (active) setUser(session?.user || null); })
      .catch(error => { if (active) setInitializationError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, attempt]);
  const login = useCallback(async (input: LoginInput) => {
    const session = await api.request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }, false);
    api.setToken(session.accessToken); setUser(session.user); setInitializationError(null);
  }, [api]);
  const register = useCallback(async (input: RegisterInput) => {
    const session = await api.request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }, false);
    api.setToken(session.accessToken); setUser(session.user); setInitializationError(null);
  }, [api]);
  const logout = useCallback(async () => {
    await api.request('/auth/logout', { method: 'POST' }, false);
    api.setToken(null); setUser(null);
  }, [api]);
  const value = useMemo(() => ({ user, loading, initializationError, api, login, register, logout, updateUser: setUser, retry: () => setAttempt(value => value + 1) }),
    [user, loading, initializationError, api, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa do AuthProvider.');
  return context;
}
