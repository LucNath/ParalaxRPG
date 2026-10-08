'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Dices, RefreshCw } from 'lucide-react';
import { createDiceRollSchema, type CharacterDetail, type CreateDiceRollInput, type DiceRoll, type DiceRollOptions, type DiceRollsPage, type GameSession } from '@paralax/contracts';
import { useAuth } from './auth-provider';
import { ApiError, errorMessage } from '@/lib/api';

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString('pt-BR')}`;
export function SessionRolls({ session, onAccessLost }: { session: GameSession; onAccessLost: () => void }) {
  const { api } = useAuth();
  const [options, setOptions] = useState<DiceRollOptions | null>(null), [history, setHistory] = useState<DiceRollsPage | null>(null);
  const [before, setBefore] = useState<number | null>(null), [attempt, setAttempt] = useState(0), [loading, setLoading] = useState(false), [loadError, setLoadError] = useState('');
  const [count, setCount] = useState('1'), [sides, setSides] = useState(''), [modifier, setModifier] = useState('0');
  const [characterId, setCharacterId] = useState(''), [fieldId, setFieldId] = useState(''), [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [formError, setFormError] = useState(''), [pending, setPending] = useState<CreateDiceRollInput | null>(null), [saving, setSaving] = useState(false), [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const busy = useRef(false), active = useRef<AbortController | null>(null), mounted = useRef(true);
  const refresh = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.abort(); }; }, []);
  useEffect(() => {
    let disposed = false; const request = new AbortController(); setLoading(true);
    Promise.all([
      api.request<DiceRollOptions>(`/sessions/${session.id}/rolls/options`, { signal: request.signal }),
      api.request<DiceRollsPage>(`/sessions/${session.id}/rolls${before ? `?before=${before}` : ''}`, { signal: request.signal }),
    ]).then(([nextOptions, nextHistory]) => {
      if (disposed) return; setOptions(nextOptions); setHistory(nextHistory); setLoadError('');
      setSides(current => nextOptions.dice.includes(Number(current)) ? current : String(nextOptions.dice[0] ?? ''));
    }).catch(cause => {
      if (disposed || request.signal.aborted) return; setHistory(null); setOptions(null); setLoadError(errorMessage(cause));
      if (cause instanceof ApiError && [403, 404].includes(cause.status)) onAccessLost();
    }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; request.abort(); };
  }, [api, session.id, before, attempt, onAccessLost]);
  useEffect(() => {
    const update = () => { if (!document.hidden && !busy.current) refresh(); };
    const interval = setInterval(update, 30000); window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    return () => { clearInterval(interval); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); };
  }, [refresh]);
  useEffect(() => {
    setCharacter(null); if (!characterId) return; const request = new AbortController();
    api.request<CharacterDetail>(`/characters/${characterId}`, { signal: request.signal }).then(value => {
      if (!request.signal.aborted) setCharacter(value);
    }).catch(cause => {
      if (request.signal.aborted) return; setFormError(errorMessage(cause));
      if (cause instanceof ApiError && [403, 404].includes(cause.status)) { setCharacterId(''); setFieldId(''); }
    });
    return () => request.abort();
  }, [api, characterId, attempt]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return;
    const parsed = createDiceRollSchema.safeParse(pending ?? { requestId: crypto.randomUUID(), count: Number(count), sides: Number(sides), modifier: Number(modifier), characterId: characterId || null, fieldId: fieldId || null });
    if (!parsed.success) { setFormError(parsed.error.issues[0].message); return; }
    busy.current = true; setSaving(true); setFormError(''); setPending(parsed.data); active.current = new AbortController();
    try {
      const saved = await api.request<DiceRoll>(`/sessions/${session.id}/rolls`, { method: 'POST', body: JSON.stringify(parsed.data), signal: active.current.signal });
      if (!mounted.current) return; setPending(null); setLastRoll(saved); setBefore(null);
      setHistory(current => ({ items: [saved, ...(before ? [] : (current?.items ?? []).filter(item => item.id !== saved.id))].slice(0, 20), nextCursor: current?.nextCursor ?? null })); refresh();
    } catch (cause) {
      if (!mounted.current) return; setFormError(errorMessage(cause));
      if (cause instanceof ApiError && cause.status < 500 && cause.status !== 429) setPending(null);
      if (cause instanceof ApiError && [403, 404].includes(cause.status)) onAccessLost();
      if (cause instanceof ApiError && cause.status === 409) refresh();
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  const locked = saving || !!pending;
  const selectedField = character && fieldId ? [...character.definition.attributes, ...character.definition.skills].find(field => field.id === fieldId) : null;
  const selectedValue = character && fieldId ? [...character.values.attributes, ...character.values.skills].find(value => value.fieldId === fieldId)?.value : undefined;
  return <section className="panel session-rolls" aria-labelledby="rolls-heading">
    <div className="rolls-heading"><div><h2 id="rolls-heading"><Dices size={21} aria-hidden="true" /> Rolagens de dados</h2><p className="muted">Histórico compartilhado com o mestre e os jogadores ativos desta campanha.</p></div><button className="button button-secondary button-small" disabled={loading || saving} onClick={refresh}><RefreshCw size={15} aria-hidden="true" /> Atualizar histórico</button></div>
    {loadError ? <div className="feedback error" role="alert"><p>{loadError}</p><button className="button button-secondary button-small" onClick={refresh}>Tentar novamente</button></div> : null}
    {session.status === 'LIVE' || pending ? options ? options.dice.length ? <form onSubmit={submit} noValidate className="roll-form">
      <div className="roll-fields"><div className="form-field"><label htmlFor="roll-count">Quantidade de dados</label><input id="roll-count" type="number" min={1} max={50} step={1} value={count} onChange={event => setCount(event.target.value)} disabled={locked} required /></div>
        <div className="form-field"><label htmlFor="roll-sides">Tipo de dado</label><select id="roll-sides" value={sides} onChange={event => setSides(event.target.value)} disabled={locked}>{options.dice.map(value => <option key={value} value={value}>d{value}</option>)}</select></div>
        <div className="form-field"><label htmlFor="roll-modifier">Modificador adicional</label><input id="roll-modifier" type="number" min={-1000000} max={1000000} step={1} value={modifier} onChange={event => setModifier(event.target.value)} disabled={locked} required /></div></div>
      <div className="roll-fields roll-character-fields"><div className="form-field"><label htmlFor="roll-character">Ficha da rolagem</label><select id="roll-character" value={characterId} disabled={locked} onChange={event => { setCharacterId(event.target.value); setFieldId(''); setFormError(''); }}><option value="">Sem ficha</option>{options.characters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        {characterId ? <div className="form-field"><label htmlFor="roll-field">Campo da ficha</label><select id="roll-field" value={fieldId} disabled={locked || !character} onChange={event => setFieldId(event.target.value)}><option value="">Sem modificador da ficha</option>{character ? (['attributes', 'skills'] as const).map(category => <optgroup key={category} label={category === 'attributes' ? 'Atributos' : 'Perícias'}>{character.definition[category].map(field => <option key={field.id} value={field.id}>{field.name} ({signed(character.values[category].find(value => value.fieldId === field.id)!.value)})</option>)}</optgroup>) : null}</select></div> : null}</div>
      <p className="roll-note">{selectedField && selectedValue !== undefined ? `${selectedField.name}: ${signed(selectedValue)}. O servidor usa o valor salvo da ficha no momento da rolagem.` : 'Os resultados são calculados pelo servidor. O modificador adicional é somado uma vez ao total.'}</p>
      {formError ? <p className="feedback error" role="alert">{formError}</p> : null}
      {pending && !saving ? <p className="roll-note">A confirmação ainda está pendente. Reenvie esta mesma rolagem para recuperar o resultado sem duplicar o histórico.</p> : null}
      <button className="button" type="submit" disabled={saving || (!pending && (loading || (!!characterId && !character)))}><Dices size={18} aria-hidden="true" />{saving ? 'Rolando…' : pending ? 'Reenviar mesma rolagem' : 'Rolar dados'}</button>
    </form> : <p className="roll-note">A versão de regras desta campanha não tem tipos de dado disponíveis.</p> : null : <p className="roll-note">{session.status === 'SCHEDULED' ? 'O mestre precisa iniciar a sessão para liberar as rolagens.' : 'Esta sessão terminou. O histórico de rolagens permanece disponível.'}</p>}
    {lastRoll ? <p className="roll-result-confirmation" role="status">Rolagem registrada: {lastRoll.count}d{lastRoll.sides} {signed(lastRoll.modifier)} = <strong>{lastRoll.total.toLocaleString('pt-BR')}</strong>.</p> : null}
    <div className="roll-history-heading"><h3>Histórico de rolagens</h3><span className="muted">Atualização a cada 30 segundos enquanto esta tela estiver visível.</span></div>
    {!history && !loadError ? <p role="status">Carregando rolagens…</p> : history?.items.length ? <ol className="roll-history">{history.items.map(roll => <li key={roll.id} className="roll-entry">
      <div className="roll-entry-main"><div className="roll-entry-author"><strong>{roll.actor.displayName}</strong><span className="muted">@{roll.actor.username} · #{roll.sequence}</span></div>
        <p className="roll-expression">{roll.count}d{roll.sides} {signed(roll.modifier)} <span>=</span> <strong>{roll.total.toLocaleString('pt-BR')}</strong></p>
        <p className="roll-values">Dados: {roll.results.join(' · ')}{roll.character ? <><br />{roll.character.name}{roll.character.field ? ` · ${roll.character.field.name}: ${signed(roll.character.field.value)}` : ''} · adicional: {signed(roll.manualModifier)}</> : null}</p></div>
      <time dateTime={roll.createdAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: session.timeZone, dateStyle: 'short', timeStyle: 'medium' }).format(new Date(roll.createdAt))}<small>{session.timeZone}</small></time>
    </li>)}</ol> : history ? <p className="roll-note">Nenhuma rolagem registrada nesta sessão.</p> : null}
    {before || history?.nextCursor ? <div className="roll-pagination">{before ? <button className="button button-secondary button-small" disabled={loading} onClick={() => setBefore(null)}>Voltar às mais recentes</button> : null}{history?.nextCursor ? <button className="button button-secondary button-small" disabled={loading} onClick={() => setBefore(history.nextCursor)}>Rolagens mais antigas</button> : null}</div> : null}
  </section>;
}
