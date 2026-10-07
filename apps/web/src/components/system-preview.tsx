import type { SystemDefinition } from '@paralax/contracts';
import { Badge } from './ui/badge';

function number(value: number) { return Number.isFinite(value) ? value : '—'; }
export function SystemPreview({ name, definition }: { name: string; definition: SystemDefinition }) {
  return <div className="system-preview">
    <div className="preview-title"><span className="eyebrow">PRÉVIA DA FICHA</span><h2>{name || 'Seu novo sistema'}</h2><p>Campos e valores iniciais definidos por você.</p></div>
    <section><h3>Atributos</h3>{definition.attributes.length ? <div className="preview-stats">{definition.attributes.map((field, index) => <div key={field.id}><span>{field.name || `Atributo ${index + 1}`}</span><strong>{number(field.defaultValue)}</strong></div>)}</div> : <p className="preview-empty">Adicione os atributos que fazem parte das suas regras.</p>}</section>
    <section><h3>Perícias</h3>{definition.skills.length ? <ul className="preview-skills">{definition.skills.map((field, index) => <li key={field.id}><div><span>{field.name || `Perícia ${index + 1}`}</span>{field.attributeId ? <small>{definition.attributes.find(attribute => attribute.id === field.attributeId)?.name || 'Atributo sem nome'}</small> : null}</div><strong>{number(field.defaultValue)}</strong></li>)}</ul> : <p className="preview-empty">As perícias aparecerão aqui.</p>}</section>
    <section><h3>Recursos</h3>{definition.resources.length ? <div className="preview-resources">{definition.resources.map((field, index) => <div key={field.id}><div><span>{field.name || `Recurso ${index + 1}`}</span><strong>{number(field.defaultValue)}{field.maxValue !== null ? ` / ${number(field.maxValue)}` : ''}</strong></div>{field.maxValue !== null && Number.isFinite(field.maxValue) && Number.isFinite(field.defaultValue) ? <div className="stat-track" aria-hidden="true"><span style={{ width: `${field.maxValue > 0 ? Math.min(100, Math.max(0, field.defaultValue / field.maxValue * 100)) : 0}%` }} /></div> : <small>Sem máximo definido</small>}</div>)}</div> : <p className="preview-empty">Vida, energia ou outros recursos do seu mundo.</p>}</section>
    <section><h3>Dados habilitados</h3><div className="dice-badges">{definition.dice.length ? definition.dice.map(sides => <Badge key={sides}>d{sides}</Badge>) : <p className="preview-empty">Este sistema não utiliza dados.</p>}</div></section>
  </div>;
}
