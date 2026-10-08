'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Pencil, Users } from 'lucide-react';
import { campaignStatusLabels, campaignVisibilityLabels, type CampaignDetail } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { CampaignEditor } from './campaign-editor';
import { CampaignTeam } from './campaign-team';
import { CharacterList } from './character-list';
import { SessionList } from './session-list';
import { SystemPreview } from './system-preview';
import { Badge } from './ui/badge';
import { errorMessage } from '@/lib/api';

export function CampaignWorkspace({ edit = false }: { edit?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const { api } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const accessLost = useCallback(() => { setCampaign(null); setError('Você não tem mais acesso a esta campanha.'); }, []);
  useEffect(() => {
    const abort = new AbortController(); setCampaign(null); setError('');
    api.request<CampaignDetail>(`/campaigns/mine/${id}`, { signal: abort.signal }).then(value => { if (!abort.signal.aborted) setCampaign(value); }).catch(cause => { if (!abort.signal.aborted) setError(errorMessage(cause)); });
    return () => abort.abort();
  }, [api, id, attempt, edit]);
  if (error) return <div className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button><Link className="subtle-link" href="/campanhas">Voltar às campanhas</Link></div>;
  if (!campaign) return <p role="status">Carregando sua campanha…</p>;
  if (edit) return campaign.role === 'OWNER' ? <CampaignEditor key={campaign.id} campaign={campaign} /> : <div className="panel page-state"><p role="alert">Somente o mestre pode editar a campanha.</p><Link className="button button-secondary" href={`/campanhas/${campaign.id}`}>Voltar à campanha</Link></div>;
  return <><Link className="subtle-link" href="/campanhas"><ArrowLeft size={15} /> Suas campanhas</Link><div className="page-heading heading-with-action campaign-heading"><div><div className="public-system-badges"><Badge tone="accent">{campaignStatusLabels[campaign.status]}</Badge><Badge>{campaignVisibilityLabels[campaign.visibility]}</Badge><Badge>{campaign.role === 'OWNER' ? 'Você é o mestre' : 'Você é jogador'}</Badge></div><h1>{campaign.name}</h1><p>Mestre: {campaign.owner.displayName}</p></div><div className="editor-actions">{campaign.visibility === 'PUBLIC' ? <Link className="button button-secondary" href={`/c/${campaign.id}`} target="_blank" rel="noopener noreferrer">Ver página pública <ArrowUpRight size={16} /></Link> : null}{campaign.role === 'OWNER' ? <Link className="button" href={`/campanhas/${campaign.id}/editar`}><Pencil size={17} />Editar campanha</Link> : null}</div></div>
    <div className="campaign-layout"><section className="panel campaign-presentation"><h2>A história</h2><p className="system-description">{campaign.description || 'Uma nova aventura está sendo preparada.'}</p><div className="campaign-meta"><span><Users size={17} />Até {campaign.maxPlayers} jogadores</span><span>{campaign.system.name} · versão {campaign.system.version}</span></div></section><aside className="panel campaign-presentation"><h2>{campaign.role === 'OWNER' ? 'Reúna sua mesa' : 'Seu lugar nesta história'}</h2><p className="system-description">{campaign.role === 'OWNER' ? 'Convide jogadores pelo nome de usuário e acompanhe sua mesa abaixo.' : 'Você pode consultar a campanha, os membros e as regras escolhidas pelo mestre.'} Crie sua ficha com as regras desta campanha. Acompanhe a agenda e os encontros desta mesa abaixo.</p>{!['ENDED', 'CANCELLED'].includes(campaign.status) ? <Link className="button button-secondary" href={`/campanhas/${campaign.id}/personagens/novo`}>Criar meu personagem</Link> : null}</aside></div>
    <section className="panel campaign-characters"><CharacterList campaignId={campaign.id} compact onAccessLost={accessLost} /></section>
    <section className="panel campaign-characters"><SessionList campaignId={campaign.id} compact canSchedule={campaign.role === 'OWNER' && !['ENDED', 'CANCELLED'].includes(campaign.status)} onAccessLost={accessLost} /></section>
    <CampaignTeam campaignId={campaign.id} isOwner={campaign.role === 'OWNER'} closed={['ENDED', 'CANCELLED'].includes(campaign.status)} onAccessLost={accessLost} />
    <section className="panel campaign-rules"><div className="panel-heading"><h2>Regras da campanha · versão {campaign.system.version}</h2></div><p className="campaign-rules-note">Esta versão permanece igual quando você edita o sistema original.</p><SystemPreview name={campaign.system.name} definition={campaign.definition} /></section>
  </>;
}
