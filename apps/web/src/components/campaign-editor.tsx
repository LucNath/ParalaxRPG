'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, Save } from 'lucide-react';
import { campaignSettingsSchema, campaignStatusLabels, createCampaignSchema, type CampaignDetail, type CampaignSettings, type SystemDetail, type SystemsPage } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { SystemPreview } from './system-preview';
import { ApiError, errorMessage } from '@/lib/api';

function settings(campaign?: CampaignDetail): CampaignSettings {
  return campaign ? { name: campaign.name, description: campaign.description, visibility: campaign.visibility, status: campaign.status, maxPlayers: campaign.maxPlayers }
    : { name: '', description: '', visibility: 'PRIVATE', status: 'PLANNED', maxPlayers: 4 };
}
function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label>{children}{error || hint ? <small id={`${id}-hint`} className={error ? 'field-error' : undefined}>{error || hint}</small> : null}</div>;
}

export function CampaignEditor({ campaign }: { campaign?: CampaignDetail }) {
  const { api } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState(() => settings(campaign));
  const [baseline, setBaseline] = useState(() => JSON.stringify(settings(campaign)));
  const [revision, setRevision] = useState(campaign?.revision || 0);
  const [fixed, setFixed] = useState(campaign);
  const [systems, setSystems] = useState<SystemsPage | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [systemId, setSystemId] = useState('');
  const [chosen, setChosen] = useState<SystemDetail | null>(null);
  const [pickerError, setPickerError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const savingRef = useRef(false);
  const dirty = JSON.stringify(input) !== baseline || (!campaign && !!systemId);

  useEffect(() => {
    if (campaign) return;
    const abort = new AbortController(); setSystems(null); setPickerError('');
    const timeout = setTimeout(() => {
      api.request<SystemsPage>(`/systems/mine?page=${page}&search=${encodeURIComponent(search)}`, { signal: abort.signal })
        .then(value => { if (!abort.signal.aborted) setSystems(value); }).catch(cause => { if (!abort.signal.aborted) setPickerError(errorMessage(cause)); });
    }, 250);
    return () => { clearTimeout(timeout); abort.abort(); };
  }, [api, campaign, page, search, attempt]);
  useEffect(() => {
    if (!systemId || campaign) return;
    const abort = new AbortController(); setChosen(null); setPickerError('');
    api.request<SystemDetail>(`/systems/mine/${systemId}`, { signal: abort.signal })
      .then(value => { if (!abort.signal.aborted) setChosen(value); }).catch(cause => { if (!abort.signal.aborted) setPickerError(errorMessage(cause)); });
    return () => abort.abort();
  }, [api, systemId, campaign, attempt]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (link && link.target !== '_blank' && link.href !== location.href && !window.confirm('Você tem alterações não salvas. Sair do editor?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty]);

  function change(next: CampaignSettings) { setInput(next); setErrors({}); if (!conflict) setError(''); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (savingRef.current || conflict) return;
    setError(''); setErrors({});
    const parsed = campaign ? campaignSettingsSchema.safeParse(input) : createCampaignSchema.safeParse({ ...input, systemVersionId: chosen?.versionId || '' });
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message]))); setError('Confira os campos destacados antes de salvar.'); return; }
    savingRef.current = true; setSaving(true);
    try {
      const saved = await api.request<CampaignDetail>(campaign ? `/campaigns/${campaign.id}` : '/campaigns', { method: campaign ? 'PUT' : 'POST', body: JSON.stringify(campaign ? { ...parsed.data, expectedRevision: revision } : parsed.data) });
      const next = settings(saved); setInput(next); setBaseline(JSON.stringify(next)); setRevision(saved.revision); setFixed(saved); setSystemId(''); setConflict(false);
      if (!campaign) router.replace(`/campanhas/${saved.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause instanceof ApiError) {
        if (cause.body.error.code === 'CAMPAIGN_REVISION_CONFLICT') setConflict(true);
        if (cause.body.error.details) setErrors(Object.fromEntries(cause.body.error.details.map(issue => [issue.field, issue.message])));
      }
    } finally { savingRef.current = false; setSaving(false); }
  }
  async function reload() {
    if (!campaign || savingRef.current || !window.confirm('Carregar a campanha salva? Suas alterações locais serão descartadas.')) return;
    savingRef.current = true; setSaving(true);
    try {
      const saved = await api.request<CampaignDetail>(`/campaigns/mine/${campaign.id}`);
      const next = settings(saved); setInput(next); setBaseline(JSON.stringify(next)); setRevision(saved.revision); setFixed(saved); setConflict(false); setError(''); setErrors({});
    } catch (cause) { setError(errorMessage(cause)); }
    finally { savingRef.current = false; setSaving(false); }
  }
  const selected = fixed ? { name: fixed.system.name, version: fixed.system.version, definition: fixed.definition } : chosen ? { name: chosen.name, version: chosen.revision, definition: chosen.definition } : null;
  return <form onSubmit={save} className="campaign-editor" noValidate>
    <div className="editor-heading"><div><Link className="subtle-link" href={campaign ? `/campanhas/${campaign.id}` : '/campanhas'}><ArrowLeft size={15} />{campaign ? 'Voltar à campanha' : 'Suas campanhas'}</Link><h1>{campaign ? 'Editar campanha' : 'Comece uma nova história'}</h1><span className="save-state" role="status">{saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : revision ? 'Campanha salva' : 'Nova campanha'}</span></div><button className="button" type="submit" disabled={saving || conflict || (!!campaign && !dirty) || (!campaign && !!systemId && !chosen)}><Save size={17} />{campaign ? 'Salvar alterações' : 'Criar campanha'}</button></div>
    {error ? <div className="feedback error" role="alert"><p>{error}</p>{conflict ? <button type="button" className="button button-secondary button-small" disabled={saving} onClick={() => void reload()}>Carregar versão atual</button> : null}</div> : null}
    <div className="campaign-layout"><section className="panel"><div className="panel-heading"><h2><BookOpen size={19} /> Sobre a campanha</h2></div><fieldset className="editor-fields form-stack" disabled={saving}>
      <Field id="campaign-name" label="Nome da campanha" error={errors.name}><input id="campaign-name" value={input.name} maxLength={80} required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'campaign-name-hint' : undefined} onChange={event => change({ ...input, name: event.target.value })} placeholder="Que história você quer contar?" /></Field>
      <Field id="campaign-description" label="Descrição" error={errors.description} hint="Até 4000 caracteres. Apresente a proposta, o tom e a frequência dos encontros."><textarea id="campaign-description" rows={6} maxLength={4000} value={input.description} aria-invalid={!!errors.description} aria-describedby="campaign-description-hint" onChange={event => change({ ...input, description: event.target.value })} /></Field>
      <div className="campaign-settings-grid"><Field id="campaign-visibility" label="Visibilidade" hint="Pública: apresentação visível por link e no catálogo. Privada: mestre e jogadores que aceitaram o convite."><select id="campaign-visibility" value={input.visibility} aria-describedby="campaign-visibility-hint" onChange={event => change({ ...input, visibility: event.target.value as CampaignSettings['visibility'] })}><option value="PRIVATE">Privada</option><option value="PUBLIC">Pública</option></select></Field>
      <Field id="campaign-status" label="Estado da campanha"><select id="campaign-status" value={input.status} onChange={event => change({ ...input, status: event.target.value as CampaignSettings['status'] })}>{Object.entries(campaignStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
      <Field id="campaign-players" label="Máximo de jogadores" hint="De 1 a 20 jogadores, sem contar o mestre. Não pode ser menor que a quantidade de jogadores atuais." error={errors.maxPlayers}><input id="campaign-players" type="number" min={1} max={20} step={1} required value={Number.isFinite(input.maxPlayers) ? input.maxPlayers : ''} aria-invalid={!!errors.maxPlayers} aria-describedby="campaign-players-hint" onChange={event => change({ ...input, maxPlayers: event.target.valueAsNumber })} /></Field>
      {input.visibility === 'PUBLIC' ? <p className="editor-disclosure">Nome, descrição, mestre, capacidade, estado e nome/versão do sistema serão públicos. A definição do sistema permanece protegida.</p> : null}
    </fieldset></section>
    <aside className="panel campaign-system-panel"><div className="panel-heading"><h2>Regras desta história</h2></div><div className="editor-fields form-stack">
      {!campaign ? <><p className="editor-intro">Escolha um sistema criado por você. A versão selecionada será mantida nesta campanha.</p><Field id="campaign-system-search" label="Buscar seus sistemas"><input id="campaign-system-search" value={search} maxLength={80} onChange={event => { setSearch(event.target.value); setPage(1); }} disabled={saving} /></Field>
        {pickerError ? <div className="feedback error"><p role="alert">{pickerError}</p><button type="button" className="button button-secondary button-small" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : !systems ? <p role="status">Carregando sistemas…</p> : <>
          <Field id="campaign-system" label="Sistema de RPG" error={errors.systemVersionId}><select id="campaign-system" value={systemId} disabled={saving} aria-invalid={!!errors.systemVersionId} aria-describedby={errors.systemVersionId ? 'campaign-system-hint' : undefined} onChange={event => { setSystemId(event.target.value); setChosen(null); setErrors({}); }}><option value="">Selecione um sistema</option>{systemId && chosen && !systems.items.some(item => item.id === systemId) ? <option value={systemId}>{chosen.name} · versão {chosen.revision}</option> : null}{systems.items.map(system => <option key={system.id} value={system.id}>{system.name} · versão {system.revision}</option>)}</select></Field>
          {systems.total > 20 ? <div className="list-pagination"><span className="muted">Página {page}</span><div><button type="button" className="button button-secondary button-small" disabled={page === 1 || saving} onClick={() => setPage(value => value - 1)}>Anterior</button><button type="button" className="button button-secondary button-small" disabled={page * 20 >= systems.total || saving} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div> : null}
          {!systems.items.length ? <p className="muted">{search ? 'Nenhum sistema corresponde à busca.' : <>Você ainda não criou um sistema. <Link className="subtle-link" href="/sistemas/novo">Criar sistema</Link></>}</p> : null}
        </>}
        {systemId && !chosen && !pickerError ? <p role="status">Carregando a versão selecionada…</p> : null}
      </> : null}
      {selected ? <><div className="campaign-pinned"><strong>{selected.name}</strong><span>Versão {selected.version}</span><p>Editar o sistema depois não muda as regras desta campanha.</p></div><details className="campaign-definition"><summary>Consultar regras da versão</summary><SystemPreview name={selected.name} definition={selected.definition} /></details></> : null}
    </div></aside></div>
  </form>;
}
