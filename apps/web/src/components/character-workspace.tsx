'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { CampaignDetail, CharacterDetail } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { CharacterEditor } from './character-editor';
import { CharacterFields } from './character-fields';
import { CharacterList } from './character-list';
import { ApiError, errorMessage } from '@/lib/api';

export function CharacterWorkspace({ create = false, edit = false }: { create?: boolean; edit?: boolean }) {
  const { id, characterId } = useParams<{ id: string; characterId: string }>(); const { api } = useAuth();
  const [character, setCharacter] = useState<CharacterDetail | null>(null), [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const accessLost = useCallback(() => { setCharacter(null); setCampaign(null); setError('Você não tem mais acesso a esta ficha ou campanha.'); }, []);
  useEffect(() => {
    let active: AbortController | undefined;
    setCharacter(null); setCampaign(null); setError('');
    const load = async () => {
      active?.abort(); active = new AbortController(); const request = active;
      try {
        if (create) { const value = await api.request<CampaignDetail>(`/campaigns/mine/${id}`, { signal: request.signal }); if (!request.signal.aborted) setCampaign(value); }
        else { const value = await api.request<CharacterDetail>(`/characters/${characterId}`, { signal: request.signal }); if (!request.signal.aborted) setCharacter(value); }
        if (!request.signal.aborted) setError('');
      } catch (cause) { if (!request.signal.aborted) { setCharacter(null); setCampaign(null); setError(errorMessage(cause)); } }
    };
    void load();
    const refresh = () => { if (!document.hidden && !edit && !create) void load(); };
    const interval = setInterval(refresh, 30000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { active?.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, id, characterId, create, edit, attempt]);
  if (error) return <div className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button><Link className="subtle-link" href="/personagens">Seus personagens</Link></div>;
  if (create && campaign) return ['ENDED', 'CANCELLED'].includes(campaign.status) ? <p role="alert">Esta campanha está encerrada e não recebe novos personagens.</p> : <CharacterEditor key={campaign.id} campaign={campaign} onAccessLost={accessLost} />;
  if (!character) return <p role="status">Carregando ficha…</p>;
  if (edit) return character.canEdit ? <CharacterEditor key={character.id} character={character} onAccessLost={accessLost} /> : <p role="alert">Você não pode editar esta ficha.</p>;
  return <><Link className="subtle-link" href={`/campanhas/${character.campaign.id}/personagens`}>Personagens de {character.campaign.name}</Link><div className="page-heading heading-with-action"><div><span className="eyebrow">FICHA DE PERSONAGEM</span><h1>{character.name}</h1><p>{character.owner.displayName} · {character.system.name} · versão {character.system.version}{character.level !== null ? ` · nível ${character.level}` : ''}</p></div>{character.canEdit ? <Link className="button" href={`/personagens/${character.id}/editar`}>Editar ficha</Link> : null}</div><section className="panel campaign-presentation"><h2>Identidade e história</h2><p className="system-description">{character.description || 'Sem descrição.'}</p><p className="system-description">{character.story || 'A história ainda está sendo escrita.'}</p></section><CharacterFields definition={character.definition} values={character.values} /></>;
}

export function CampaignCharacters() {
  const { id } = useParams<{ id: string }>(); const { api } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const accessLost = useCallback(() => { setCampaign(null); setError('Você não tem mais acesso a esta campanha.'); }, []);
  useEffect(() => {
    const abort = new AbortController(); setCampaign(null); setError('');
    api.request<CampaignDetail>(`/campaigns/mine/${id}`, { signal: abort.signal }).then(value => { if (!abort.signal.aborted) setCampaign(value); }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof ApiError && cause.status === 404 ? 'Você não tem mais acesso a esta campanha.' : errorMessage(cause)); });
    return () => abort.abort();
  }, [api, id, attempt]);
  if (error) return <div className="panel page-state"><p role="alert">{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>;
  if (!campaign) return <p role="status">Carregando campanha…</p>;
  return <><Link className="subtle-link" href={`/campanhas/${id}`}>Voltar à campanha</Link><div className="page-heading heading-with-action"><div><h1>Personagens de {campaign.name}</h1><p>{campaign.role === 'OWNER' ? 'Como mestre, você pode consultar e editar todas as fichas desta mesa.' : 'Aqui estão suas fichas. Somente você e o mestre podem consultá-las e editá-las.'}</p></div>{!['ENDED', 'CANCELLED'].includes(campaign.status) ? <Link className="button" href={`/campanhas/${id}/personagens/novo`}>Criar meu personagem</Link> : null}</div><CharacterList campaignId={id} onAccessLost={accessLost} /></>;
}
