import { SocialWorkspace } from '@/components/social-workspace';
import { Suspense } from 'react';
export default function FriendsPage() {
  return <><div className="page-heading"><span className="eyebrow">SUA COMPANHIA DE AVENTURAS</span><h1>Amigos e mensagens.</h1><p>Encontre outros aventureiros e mantenha a conversa entre uma sessão e outra.</p></div><Suspense fallback={<p role="status">Carregando amizades…</p>}><SocialWorkspace /></Suspense></>;
}
