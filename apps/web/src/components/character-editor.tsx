'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { characterSettingsSchema, characterValuesForDefinitionSchema, initialCharacterValues, type CampaignDetail, type CharacterDetail, type CharacterSettings } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { CharacterFields } from './character-fields';
import { ApiError, errorMessage } from '@/lib/api';

function settings(character?: CharacterDetail): CharacterSettings { return character ? { name: character.name, description: character.description, story: character.story, level: character.level } : { name: '', description: '', story: '', level: null }; }
export function CharacterEditor({ campaign, character, onAccessLost }: { campaign?: CampaignDetail; character?: CharacterDetail; onAccessLost: () => void }) {
  const { api } = useAuth(); const router = useRouter();
  const definition = (character ?? campaign)!.definition;
  const [input, setInput] = useState(() => settings(character));
  const [values, setValues] = useState(() => character?.values ?? initialCharacterValues(definition));
  const [baseline, setBaseline] = useState(() => JSON.stringify({ ...settings(character), values: character?.values ?? initialCharacterValues(definition) }));
  const [revision, setRevision] = useState(character?.revision ?? 0);
  const [error, setError] = useState(''), [errors, setErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false), [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dirty = JSON.stringify({ ...input, values }) !== baseline;
  const characterId = character?.id;
  useEffect(() => {
    if (!characterId) return;
    let active: AbortController | undefined;
    const verify = async () => {
      if (document.hidden || savingRef.current) return;
      active?.abort(); active = new AbortController(); const request = active;
      try {
        const saved = await api.request<CharacterDetail>(`/characters/${characterId}`, { signal: request.signal });
        if (!request.signal.aborted && saved.revision !== revision) { setConflict(true); setError('Esta ficha foi alterada em outra janela. Seu rascunho foi preservado. Carregue a versão atual antes de salvar.'); }
      } catch (cause) {
        if (request.signal.aborted) return;
        if (cause instanceof ApiError && cause.status === 404) onAccessLost();
      }
    };
    const refresh = () => void verify();
    const interval = setInterval(refresh, 30000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { active?.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [api, characterId, revision, onAccessLost]);
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
  function change(next: CharacterSettings) { setInput(next); setErrors({}); if (!conflict) setError(''); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (savingRef.current || conflict) return;
    const metadata = characterSettingsSchema.safeParse(input), fields = characterValuesForDefinitionSchema(definition).safeParse(values);
    if (!metadata.success || !fields.success) {
      setErrors(Object.fromEntries([...(metadata.success ? [] : metadata.error.issues.map(issue => [issue.path.join('.'), issue.message])), ...(fields.success ? [] : fields.error.issues.map(issue => [`values.${issue.path.join('.')}`, issue.message]))])); setError('Confira os campos destacados antes de salvar.'); return;
    }
    savingRef.current = true; setSaving(true); setErrors({}); setError('');
    try {
      const saved = await api.request<CharacterDetail>(characterId ? `/characters/${characterId}` : `/campaigns/${campaign!.id}/characters`, { method: characterId ? 'PUT' : 'POST', body: JSON.stringify({ ...metadata.data, values: fields.data, ...(characterId ? { expectedRevision: revision } : {}) }) });
      const next = settings(saved); setInput(next); setValues(saved.values); setRevision(saved.revision); setBaseline(JSON.stringify({ ...next, values: saved.values })); setConflict(false);
      if (!characterId) router.replace(`/personagens/${saved.id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause instanceof ApiError) {
        if (cause.status === 404) onAccessLost();
        if (cause.body.error.code === 'CHARACTER_REVISION_CONFLICT') setConflict(true);
        if (cause.body.error.details) setErrors(Object.fromEntries(cause.body.error.details.map(issue => [issue.field, issue.message])));
      }
    } finally { savingRef.current = false; setSaving(false); }
  }
  async function reload() {
    if (!characterId || savingRef.current || !window.confirm('Carregar a ficha salva? Suas alterações locais serão descartadas.')) return;
    savingRef.current = true; setSaving(true);
    try {
      const saved = await api.request<CharacterDetail>(`/characters/${characterId}`), next = settings(saved);
      setInput(next); setValues(saved.values); setRevision(saved.revision); setBaseline(JSON.stringify({ ...next, values: saved.values })); setConflict(false); setError(''); setErrors({});
    } catch (cause) { setError(errorMessage(cause)); if (cause instanceof ApiError && cause.status === 404) onAccessLost(); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <form className="character-editor" onSubmit={save} noValidate>
    <div className="editor-heading"><div><Link className="subtle-link" href={characterId ? `/personagens/${characterId}` : `/campanhas/${campaign!.id}`}><ArrowLeft size={15} />{characterId ? 'Voltar à ficha' : 'Voltar à campanha'}</Link><h1>{characterId ? 'Editar personagem' : 'Crie seu personagem'}</h1><span className="save-state" role="status">{saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : revision ? 'Ficha salva' : 'Novo personagem'}</span></div><button className="button" type="submit" disabled={saving || conflict || (!!characterId && !dirty)}><Save size={17} />{characterId ? 'Salvar ficha' : 'Criar personagem'}</button></div>
    <p className="campaign-rules-note">{(character ?? campaign)!.system.name} · versão {(character ?? campaign)!.system.version}. Somente o dono ativo e o mestre podem consultar e editar esta ficha.</p>
    {error ? <div className="feedback error" role="alert"><p>{error}</p>{conflict ? <button type="button" className="button button-secondary button-small" disabled={saving} onClick={() => void reload()}>Carregar versão atual</button> : null}</div> : null}
    <fieldset className="character-form" disabled={saving}><section className="panel"><div className="panel-heading"><h2>Identidade e história</h2></div><div className="editor-fields form-stack">
      {(['name', 'description', 'story'] as const).map(key => <div className="form-field" key={key}><label htmlFor={`character-${key}`}>{key === 'name' ? 'Nome do personagem' : key === 'description' ? 'Descrição do personagem' : 'História do personagem'}</label>{key === 'name' ? <input id={`character-${key}`} maxLength={80} required value={input[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `character-${key}-error` : undefined} onChange={event => change({ ...input, [key]: event.target.value })} /> : <textarea id={`character-${key}`} rows={key === 'story' ? 6 : 3} maxLength={key === 'story' ? 4000 : 2000} value={input[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `character-${key}-error` : undefined} onChange={event => change({ ...input, [key]: event.target.value })} />}{errors[key] ? <small className="field-error" id={`character-${key}-error`}>{errors[key]}</small> : null}</div>)}
      <div className="form-field"><label htmlFor="character-level">Nível (opcional)</label><input id="character-level" type="number" min={1} max={1000000} step={1} value={input.level === null || !Number.isFinite(input.level) ? '' : input.level} aria-invalid={!!errors.level} aria-describedby="character-level-hint" onChange={event => change({ ...input, level: event.target.value === '' ? null : event.target.valueAsNumber })} /><small id="character-level-hint" className={errors.level ? 'field-error' : undefined}>{errors.level || 'Deixe vazio se o sistema não usa níveis.'}</small></div>
    </div></section><CharacterFields definition={definition} values={values} errors={errors} onChange={next => { setValues(next); setErrors({}); if (!conflict) setError(''); }} /></fieldset>
  </form>;
}
