import type { CharacterValues, SystemDefinition } from '@paralax/contracts';

const labels = { attributes: 'Atributos', skills: 'Perícias', resources: 'Recursos' };
export function CharacterFields({ definition, values, onChange, errors = {} }: {
  definition: SystemDefinition; values: CharacterValues;
  onChange?: (values: CharacterValues) => void; errors?: Record<string, string>;
}) {
  return <div className="character-fields">{(['attributes', 'skills', 'resources'] as const).map(category => <section className="panel" key={category}>
    <div className="panel-heading"><h2>{labels[category]}</h2></div><div className="editor-fields form-stack">
      {!definition[category].length ? <p className="muted">Esta versão não define {labels[category].toLowerCase()}.</p> : null}
      {definition[category].map(field => {
        const index = values[category].findIndex(entry => entry.fieldId === field.id);
        const value = values[category][index]?.value;
        const resource = category === 'resources' ? definition.resources.find(entry => entry.id === field.id) : undefined;
        const skill = category === 'skills' ? definition.skills.find(entry => entry.id === field.id) : undefined;
        const attribute = skill?.attributeId ? definition.attributes.find(entry => entry.id === skill.attributeId)?.name : undefined;
        const error = errors[`values.${category}.${index}.value`];
        const hint = resource ? resource.maxValue === null ? 'Sem máximo definido pelo sistema.' : `Máximo: ${resource.maxValue}.` : attribute ? `Atributo relacionado: ${attribute}.` : 'Valor inteiro.';
        const id = `character-field-${field.id}`;
        return <div className="form-field character-value" key={field.id}><label htmlFor={onChange ? id : undefined}>{field.name}</label>{onChange ? <input id={id} type="number" step={1} min={resource ? 0 : -1000000} max={resource?.maxValue ?? 1000000} required value={Number.isFinite(value) ? value : ''} aria-invalid={!!error} aria-describedby={`${id}-hint`} onChange={event => onChange({ ...values, [category]: values[category].map(entry => entry.fieldId === field.id ? { ...entry, value: event.target.valueAsNumber } : entry) })} /> : <strong className="character-number">{value}</strong>}<small id={`${id}-hint`} className={error ? 'field-error' : undefined}>{error || hint}</small></div>;
      })}
    </div></section>)}</div>;
}
