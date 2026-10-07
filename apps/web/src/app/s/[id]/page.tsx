import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import type { SystemDetail } from '@paralax/contracts';
import { Brand } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { SystemPreview } from '@/components/system-preview';

export default async function PublicSystem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/v1/systems/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (response.status === 404 || response.status === 400) notFound();
  if (!response.ok) throw new Error('Sistema temporariamente indisponível.');
  const system = await response.json() as SystemDetail;
  return <div><header className="landing-header"><Brand /><Link href="/sistemas" className="button button-secondary button-small">Meus sistemas <ArrowUpRight size={16} /></Link></header><main id="conteudo" className="public-system"><div className="system-public-banner" aria-hidden="true" /><section className="panel public-system-intro"><div className="public-system-badges"><Badge tone="accent">Versão {system.revision}</Badge><Badge>{system.visibility === 'PUBLIC' ? 'Público' : 'Não listado'}</Badge></div><h1>{system.name}</h1><p className="system-description">{system.description || 'Regras criadas para contar novas histórias.'}</p><Link className="subtle-link" href={`/u/${system.owner.username}`}>Criado por {system.owner.displayName} <ArrowUpRight size={14} /></Link></section><section className="panel"><SystemPreview name={system.name} definition={system.definition} /></section></main></div>;
}
