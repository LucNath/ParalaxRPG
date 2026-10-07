'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { SystemDetail } from '@paralax/contracts';
import { useAuth } from '@/components/auth-provider';
import { SystemEditor } from '@/components/system-editor';
import { errorMessage } from '@/lib/api';

export default function EditSystem() {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [system, setSystem] = useState<SystemDetail | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setSystem(null); setError('');
    api.request<SystemDetail>(`/systems/mine/${id}`, { signal: abort.signal }).then(value => { if (!abort.signal.aborted) setSystem(value); }).catch(cause => { if (!abort.signal.aborted) setError(errorMessage(cause)); });
    return () => abort.abort();
  }, [api, id, attempt]);
  if (error) return <div className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button><Link href="/sistemas" className="subtle-link">Voltar aos sistemas</Link></div>;
  if (!system) return <p role="status">Carregando seu sistema…</p>;
  return <SystemEditor key={system.id} system={system} />;
}
