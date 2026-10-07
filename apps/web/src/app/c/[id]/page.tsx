import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { campaignStatusLabels, type CampaignSummary } from '@paralax/contracts';
import { Brand } from '@/components/brand';
import { Badge } from '@/components/ui/badge';

export default async function PublicCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/v1/campaigns/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (response.status === 404 || response.status === 400) notFound();
  if (!response.ok) throw new Error('Campanha temporariamente indisponível.');
  const campaign = await response.json() as CampaignSummary;
  return <div><header className="landing-header"><Brand /><Link href="/campanhas" className="button button-secondary button-small">Campanhas <ArrowUpRight size={16} /></Link></header><main id="conteudo" className="public-system"><div className="system-public-banner campaign-banner" aria-hidden="true" /><section className="panel public-system-intro"><div className="public-system-badges"><Badge tone="accent">{campaignStatusLabels[campaign.status]}</Badge><Badge>Pública</Badge></div><h1>{campaign.name}</h1><p className="system-description">{campaign.description || 'Uma nova história começa por aqui.'}</p><Link className="subtle-link" href={`/u/${campaign.owner.username}`}>Mestre: {campaign.owner.displayName} <ArrowUpRight size={14} /></Link><div className="campaign-meta"><span>Até {campaign.maxPlayers} jogadores</span><span>{campaign.system.name} · versão {campaign.system.version}</span></div></section></main></div>;
}
