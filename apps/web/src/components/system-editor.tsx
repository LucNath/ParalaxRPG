'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Check, Dice5, Layers3, Plus, Save, Settings2, Sparkles, Trash2, Zap } from 'lucide-react';
import { createSystemSchema, type CreateSystemInput, type SystemDetail, type SystemDefinition } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { SystemPreview } from './system-preview';
import { ApiError, errorMessage } from '@/lib/api';

const sections = [{ key: 'general', name: 'Informações gerais', icon: Settings2 }, { key: 'attributes', name: 'Atributos', icon: Layers3 }, { key: 'skills', name: 'Perícias', icon: Sparkles }, { key: 'resources', name: 'Recursos', icon: Zap }, { key: 'dice', name: 'Dados', icon: Dice5 }] as const;
type Section = typeof sections[number]['key'];
type Category = 'attributes' | 'skills' | 'resources';
const labels = { attributes: 'atributo', skills: 'perícia', resources: 'recurso' };
function inputFrom(system: SystemDetail): CreateSystemInput { return { name: system.name, description: system.description, visibility: system.visibility, definition: system.definition }; }
function initial(): CreateSystemInput { return { name: '', description: '', visibility: 'PRIVATE', definition: { schemaVersion: 1, attributes: [], skills: [], resources: [], dice: [4, 6, 8, 10, 12, 20] } }; }

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return <div className="form-field"><label htmlFor={id}>{label}</label>{children}{error || hint ? <small id={`${id}-hint`} className={error ? 'field-error' : undefined}>{error || hint}</small> : null}</div>;
}

export function SystemEditor({ system }: { system?: SystemDetail }) {
  const { api } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState<CreateSystemInput>(() => system ? inputFrom(system) : initial());
  const [baseline, setBaseline] = useState(() => JSON.stringify(system ? inputFrom(system) : initial()));
  const [revision, setRevision] = useState(system?.revision || 0);
  const [section, setSection] = useState<Section>('general');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [customDice, setCustomDice] = useState('');
  const savingRef = useRef(false);
  const dirty = JSON.stringify(input) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.target === '_blank' || link.href === location.href || link.hash && link.pathname === location.pathname) return;
      if (!window.confirm('Você tem alterações não salvas. Sair do editor?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', navigate, true); };
  }, [dirty]);

  function change(next: CreateSystemInput) { setInput(next); setErrors({}); if (!conflict) setError(''); }
  function definition(next: SystemDefinition) { change({ ...input, definition: next }); }
  function add(category: Category) {
    const field = { id: crypto.randomUUID(), name: '', defaultValue: 0 };
    if (category === 'attributes') definition({ ...input.definition, attributes: [...input.definition.attributes, field] });
    if (category === 'skills') definition({ ...input.definition, skills: [...input.definition.skills, { ...field, attributeId: null }] });
    if (category === 'resources') definition({ ...input.definition, resources: [...input.definition.resources, { ...field, maxValue: null }] });
  }
  function patch(category: Category, id: string, patch: Record<string, unknown>) {
    definition({ ...input.definition, [category]: input.definition[category].map(field => field.id === id ? { ...field, ...patch } : field) } as SystemDefinition);
  }
  function remove(category: Category, id: string) {
    definition({ ...input.definition, [category]: input.definition[category].filter(field => field.id !== id),
      ...(category === 'attributes' ? { skills: input.definition.skills.map(skill => skill.attributeId === id ? { ...skill, attributeId: null } : skill) } : {}) } as SystemDefinition);
  }
  function move(category: Category, index: number, direction: number) {
    const fields = [...input.definition[category]];
    [fields[index], fields[index + direction]] = [fields[index + direction], fields[index]];
    definition({ ...input.definition, [category]: fields } as SystemDefinition);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setError(''); setErrors({});
    const parsed = createSystemSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message])));
      const path = parsed.error.issues[0].path;
      setSection(path[0] === 'definition' ? path[1] as Section : 'general');
      setError('Confira os campos destacados antes de salvar.');
      return;
    }
    savingRef.current = true; setSaving(true);
    try {
      const saved = await api.request<SystemDetail>(system ? `/systems/${system.id}` : '/systems', {
        method: system ? 'PUT' : 'POST', body: JSON.stringify(system ? { ...parsed.data, expectedRevision: revision } : parsed.data),
      });
      const next = inputFrom(saved); setInput(next); setBaseline(JSON.stringify(next)); setRevision(saved.revision); setConflict(false);
      if (!system) router.replace(`/sistemas/${saved.id}/editar`);
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause instanceof ApiError) {
        if (cause.status === 409) setConflict(true);
        if (cause.body.error.details) setErrors(Object.fromEntries(cause.body.error.details.map(issue => [issue.field, issue.message])));
      }
    } finally { savingRef.current = false; setSaving(false); }
  }
  async function reload() {
    if (!system || !window.confirm('Carregar a versão salva? Suas alterações locais serão descartadas.')) return;
    setSaving(true);
    try { const current = await api.request<SystemDetail>(`/systems/mine/${system.id}`); const next = inputFrom(current); setInput(next); setBaseline(JSON.stringify(next)); setRevision(current.revision); setConflict(false); setError(''); setErrors({}); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  }

  function fields(category: Category) {
    return <><p className="editor-intro">{category === 'attributes' ? 'Defina as características essenciais dos personagens. Remover um atributo também desfaz seus vínculos com perícias.' : category === 'skills' ? 'Crie as especialidades da sua ficha. O vínculo com um atributo é opcional.' : 'Vida, energia, sanidade ou qualquer recurso das suas regras. Deixe o máximo vazio para não definir um limite.'}</p>
      <div className="definition-fields">{input.definition[category].map((field, index) => {
        const prefix = `definition.${category}.${index}`;
        const id = `${category}-${field.id}`;
        const label = labels[category];
        const resource = category === 'resources' ? input.definition.resources[index] : null;
        const skill = category === 'skills' ? input.definition.skills[index] : null;
        return <article key={field.id} className="definition-field"><div className="definition-field-heading"><span>{String(index + 1).padStart(2, '0')} / {field.name || `Novo ${label}`}</span><div><button className="icon-button" type="button" onClick={() => move(category, index, -1)} disabled={index === 0} aria-label={`Mover ${label} ${field.name || index + 1} para cima`}><ArrowUp size={16} /></button><button className="icon-button" type="button" onClick={() => move(category, index, 1)} disabled={index === input.definition[category].length - 1} aria-label={`Mover ${label} ${field.name || index + 1} para baixo`}><ArrowDown size={16} /></button><button className="icon-button remove-field" type="button" onClick={() => remove(category, field.id)} aria-label={`Remover ${label} ${field.name || index + 1}`}><Trash2 size={16} /></button></div></div>
          <div className="definition-field-grid"><Field id={`${id}-name`} label={`Nome ${label === 'perícia' ? 'da' : 'do'} ${label} ${index + 1}`} error={errors[`${prefix}.name`]}><input id={`${id}-name`} value={field.name} maxLength={50} onChange={event => patch(category, field.id, { name: event.target.value })} aria-invalid={!!errors[`${prefix}.name`]} aria-describedby={errors[`${prefix}.name`] ? `${id}-name-hint` : undefined} /></Field>
          <Field id={`${id}-value`} label={`Valor inicial ${label === 'perícia' ? 'da' : 'do'} ${label} ${index + 1}`} error={errors[`${prefix}.defaultValue`]}><input id={`${id}-value`} type="number" step={1} min={resource ? 0 : -1000000} max={1000000} value={Number.isFinite(field.defaultValue) ? field.defaultValue : ''} onChange={event => patch(category, field.id, { defaultValue: event.target.valueAsNumber })} aria-invalid={!!errors[`${prefix}.defaultValue`]} aria-describedby={errors[`${prefix}.defaultValue`] ? `${id}-value-hint` : undefined} /></Field>
          {skill ? <Field id={`${id}-attribute`} label={`Atributo da perícia ${index + 1}`} error={errors[`${prefix}.attributeId`]}><select id={`${id}-attribute`} value={skill.attributeId || ''} onChange={event => patch(category, field.id, { attributeId: event.target.value || null })}><option value="">Sem vínculo</option>{input.definition.attributes.map((attribute, n) => <option key={attribute.id} value={attribute.id}>{attribute.name || `Atributo ${n + 1}`}</option>)}</select></Field> : null}
          {resource ? <Field id={`${id}-max`} label={`Máximo do recurso ${index + 1} (opcional)`} error={errors[`${prefix}.maxValue`]}><input id={`${id}-max`} type="number" step={1} min={0} max={1000000} placeholder="Sem máximo" value={resource.maxValue !== null && Number.isFinite(resource.maxValue) ? resource.maxValue : ''} onChange={event => patch(category, field.id, { maxValue: event.target.value === '' ? null : event.target.valueAsNumber })} aria-invalid={!!errors[`${prefix}.maxValue`]} aria-describedby={errors[`${prefix}.maxValue`] ? `${id}-max-hint` : undefined} /></Field> : null}</div>
        </article>;
      })}</div>
      {!input.definition[category].length ? <div className="editor-empty"><Plus size={23} /><p>Nenhum campo adicionado. Comece com suas próprias regras.</p></div> : null}
      <button type="button" className="button button-secondary" onClick={() => add(category)} disabled={input.definition[category].length >= 40}><Plus size={17} />Adicionar {labels[category]}</button><small className="editor-limit">Até 40 campos nesta categoria.</small>
    </>;
  }
  const selected = sections.find(item => item.key === section)!;
  return <form className="system-editor" onSubmit={save} noValidate>
    <div className="editor-heading"><div><Link className="subtle-link" href="/sistemas"><ArrowLeft size={15} /> Seus sistemas</Link><h1>{system ? 'Editor de sistema' : 'Crie suas próprias regras'}</h1><span className="save-state" role="status">{saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : revision ? `Salvo · versão ${revision}` : 'Novo sistema'}</span></div><div className="editor-actions">{system && input.visibility !== 'PRIVATE' && !dirty ? <Link className="button button-secondary" href={`/s/${system.id}`} target="_blank" rel="noopener noreferrer">Ver publicação <ArrowUpRight size={16} /></Link> : null}<button className="button" type="submit" disabled={saving || (!!system && !dirty) || conflict}><Save size={17} />{saving ? 'Salvando…' : system ? 'Salvar alterações' : 'Criar sistema'}</button></div></div>
    {error ? <div className="feedback error" role="alert"><p>{error}</p>{conflict ? <button type="button" className="button button-secondary button-small" onClick={() => void reload()} disabled={saving}>Carregar versão atual</button> : null}</div> : null}
    <div className="editor-layout"><nav className="editor-navigation" aria-label="Categorias do sistema">{sections.map(({ key, name, icon: Icon }) => <button type="button" key={key} aria-pressed={section === key} onClick={() => setSection(key)} className={section === key ? 'selected' : ''}><Icon size={18} /><span>{name}</span>{key !== 'general' ? <small>{input.definition[key].length}</small> : null}</button>)}<div className="editor-navigation-note"><Check size={16} /><p>Uma definição, muitos mundos.<br />Cada edição salva uma nova versão.</p></div></nav>
      <section className="panel editor-panel"><div className="panel-heading"><h2><selected.icon size={19} /> {selected.name}</h2></div><fieldset disabled={saving} className="editor-fields">
        {section === 'general' ? <div className="form-stack"><p className="editor-intro">Dê um nome às suas regras e escolha quem pode conhecê-las.</p><Field id="system-name" label="Nome do sistema" error={errors.name}><input id="system-name" value={input.name} maxLength={80} placeholder="Como se chama seu universo?" onChange={event => change({ ...input, name: event.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'system-name-hint' : undefined} required /></Field><Field id="system-description" label="Descrição" error={errors.description} hint="Até 2000 caracteres. Apresente o estilo e as ideias do seu sistema."><textarea id="system-description" rows={5} value={input.description} maxLength={2000} placeholder="Que histórias suas regras ajudam a contar?" onChange={event => change({ ...input, description: event.target.value })} aria-invalid={!!errors.description} aria-describedby="system-description-hint" /></Field><Field id="system-visibility" label="Visibilidade" hint="Privado: só você. Não listado: qualquer pessoa com o link. Público: aparece no catálogo."><select id="system-visibility" value={input.visibility} onChange={event => change({ ...input, visibility: event.target.value as CreateSystemInput['visibility'] })}><option value="PRIVATE">Privado</option><option value="UNLISTED">Não listado</option><option value="PUBLIC">Público</option></select></Field><p className="editor-disclosure">Sistemas públicos e não listados expõem a definição completa. Você continua sendo a única pessoa que pode editá-los.</p></div> : section === 'dice' ? <><p className="editor-intro">Escolha os dados permitidos pelo sistema. Você também pode criar um sistema sem dados.</p><div className="dice-options">{[...new Set([4, 6, 8, 10, 12, 20, 100, ...input.definition.dice])].sort((a, b) => a - b).map(sides => <label key={sides}><input type="checkbox" checked={input.definition.dice.includes(sides)} onChange={event => definition({ ...input.definition, dice: event.target.checked ? [...input.definition.dice, sides].sort((a, b) => a - b) : input.definition.dice.filter(value => value !== sides) })} /><span>d{sides}</span></label>)}</div><div className="custom-dice"><Field id="custom-dice" label="Faces do dado personalizado" hint="De 2 a 1000 faces."><input id="custom-dice" type="number" min={2} max={1000} step={1} value={customDice} onChange={event => setCustomDice(event.target.value)} /></Field><button className="button button-secondary" type="button" disabled={!Number.isInteger(Number(customDice)) || Number(customDice) < 2 || Number(customDice) > 1000 || input.definition.dice.length >= 20} onClick={() => { definition({ ...input.definition, dice: [...new Set([...input.definition.dice, Number(customDice)])].sort((a, b) => a - b) }); setCustomDice(''); }}><Plus size={16} />Adicionar dado</button></div>{errors['definition.dice'] ? <p className="field-error">{errors['definition.dice']}</p> : null}</> : fields(section)}
      </fieldset></section><aside className="panel editor-preview-panel"><SystemPreview name={input.name} definition={input.definition} /></aside>
    </div>
  </form>;
}
