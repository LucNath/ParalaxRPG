'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Eye, LockKeyhole, Map, RotateCcw } from 'lucide-react';
import { vttTokenFitsScene, type VttSceneSettings, type VttTable } from '@paralax/contracts';
import type { MapToken, VttDemoData } from '@/lib/vtt-demo-types';
import { tokenPosition, type Point } from '@/lib/vtt-viewport';
import { Brand } from './brand';
import { Badge } from './ui/badge';
import { VttViewport } from './vtt-viewport';
import { VttSceneControls } from './vtt-scene-controls';

const viewLabels = { GM: 'Mestre', PLAYER: 'Jogador', OUTSIDER: 'Terceiro sem acesso' };
const scenarios = { ready: 'Mesa aberta', loading: 'Carregamento', error: 'Erro de conexão', empty: 'Nenhuma cena', 'read-only': 'Sessão encerrada', revoked: 'Acesso revogado', conflict: 'Movimento concorrente' };

export function VttDemo({ initial }: { initial: VttDemoData }) {
  const [table, setTable] = useState<VttTable | null>(initial.table), [selectedId, setSelectedId] = useState('');
  const [snap, setSnap] = useState(true), [message, setMessage] = useState(''), [conflict, setConflict] = useState<{ id: string; position: Point } | null>(null);
  const [simulateConflict, setSimulateConflict] = useState(initial.scenario === 'conflict');
  const scene = table?.scene;
  const tokens = useMemo<MapToken[]>(() => !table?.scene ? [] : table.audience === 'GM'
    ? table.scene.tokens.map(row => ({ id: row.id, name: row.token.name, x: row.token.x, y: row.token.y, size: row.token.size, shape: row.token.shape, color: row.token.color, canMove: row.canMove, hidden: row.token.visibility === 'GM' }))
    : table.scene.tokens.map(row => ({ ...row, hidden: false })), [table]);
  const selected = tokens.find(token => token.id === selectedId) ?? tokens.find(token => token.canMove) ?? tokens[0];
  const canManage = table?.audience === 'GM' && table.canManage;
  const href = (state = 'ready', sceneKey = initial.sceneKey) => `/mesa-demo?visao=${initial.view}&estado=${state}&cena=${sceneKey}&tokens=${initial.count}`;
  const applyPosition = useCallback((id: string, position: Point) => {
    setTable(old => {
      if (!old?.scene) return old;
      if (old.audience === 'GM') return { ...old, revision: old.revision + 1, scene: { ...old.scene, revision: old.scene.revision + 1, tokens: old.scene.tokens.map(row => row.id === id ? { ...row, revision: row.revision + 1, token: { ...row.token, ...position } } : row) } };
      return { ...old, revision: old.revision + 1, scene: { ...old.scene, revision: old.scene.revision + 1, tokens: old.scene.tokens.map(row => row.id === id ? { ...row, revision: row.revision + 1, ...position } : row) } };
    });
  }, []);
  const move = useCallback((id: string, position: Point) => {
    const token = tokens.find(row => row.id === id);
    if (!scene || !token?.canMove || conflict || !vttTokenFitsScene(scene.settings, { ...position, size: token.size })) return;
    if (simulateConflict) {
      setConflict({ id, position: tokenPosition(scene.settings, token.size, { x: token.x + 50, y: token.y }, false) });
      setMessage(''); return;
    }
    applyPosition(id, position); setMessage('Posição atualizada nesta demonstração.');
  }, [applyPosition, conflict, scene, simulateConflict, tokens]);
  function applySettings(settings: VttSceneSettings) {
    if (!canManage) return;
    setTable(old => old?.audience === 'GM' && old.scene && old.canManage ? { ...old, revision: old.revision + 1, scene: { ...old.scene, settings, revision: old.scene.revision + 1 } } : old);
    setMessage('Grade e escala atualizadas nesta demonstração.');
  }
  const hasAccess = initial.view !== 'OUTSIDER' && initial.scenario !== 'revoked';
  return <div className="vtt-demo">
    <header className="vtt-demo-header"><Brand /><Link href="/sessoes" className="button button-secondary">Meu espaço <ArrowRight size={16} /></Link></header>
    <main id="conteudo" className="vtt-demo-main">
      <div className="vtt-demo-intro"><div><span className="eyebrow">UMA NOVA FORMA DE CONTAR HISTÓRIAS</span><h1>Sua próxima cena.</h1><p>Prepare o encontro. Explore o mapa. Dê espaço à imaginação.</p></div><Badge tone="accent">Demonstração da mesa</Badge></div>
      <div className="vtt-demo-notice"><BookOpen size={20} /><p>Esta mesa usa dados fictícios. Experimente as visões de mestre e jogador. As alterações reiniciam ao recarregar e não afetam suas campanhas.</p></div>
      <details className="vtt-demo-options"><summary>Explorar visões e estados da demonstração</summary><form method="get" action="/mesa-demo">
        <input type="hidden" name="cena" value={initial.sceneKey} />
        <label>Visão da demonstração<select name="visao" defaultValue={initial.view}>{Object.entries(viewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Estado da demonstração<select name="estado" defaultValue={initial.scenario}>{Object.entries(scenarios).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Tamanho da mesa<select name="tokens" defaultValue={initial.count}><option value="25">25 marcadores</option><option value="200">200 marcadores</option></select></label>
        <button className="button button-secondary" type="submit">Abrir demonstração</button>
      </form></details>
      {!hasAccess ? <section className="panel vtt-page-state"><LockKeyhole size={32} /><h2>{initial.scenario === 'revoked' ? 'Acesso à mesa revogado' : 'Esta mesa é reservada aos participantes'}</h2><p role="alert">{initial.scenario === 'revoked' ? 'Você não faz mais parte desta campanha. O mapa e os marcadores foram removidos desta visão.' : 'Um convite pendente ou uma apresentação pública não concede acesso ao mapa.'}</p><p>Escolha outra visão nas opções da demonstração para continuar o teste.</p></section>
        : !table && ['loading', 'error'].includes(initial.scenario) ? <section className="panel vtt-page-state" aria-busy={initial.scenario === 'loading'}>
          <Map size={32} /><h2>{initial.scenario === 'loading' ? 'Abrindo a mesa…' : 'Não foi possível abrir a mesa'}</h2>
          <p role={initial.scenario === 'loading' ? 'status' : 'alert'}>{initial.scenario === 'loading' ? 'Carregando a cena e seus marcadores.' : 'A conexão falhou. Tente novamente para recuperar a cena.'}</p>
          <Link className="button button-secondary" href={href()} prefetch={false}>{initial.scenario === 'loading' ? 'Concluir carregamento de exemplo' : 'Tentar novamente'}</Link>
        </section> : <section className={`vtt-table-layout ${canManage ? '' : 'vtt-player-layout'}`}>
          <div className="vtt-table-main panel">
            <div className="vtt-table-title"><div><span className="eyebrow">{table?.audience === 'GM' ? 'PREPARAÇÃO E MESA' : 'CENA COMPARTILHADA'}</span><h2>{scene?.settings.name ?? 'Nenhuma cena publicada'}</h2></div><Badge>{initial.scenario === 'read-only' ? 'Somente leitura' : viewLabels[initial.view]}</Badge></div>
            {conflict ? <div className="feedback error vtt-movement-feedback" role="alert"><p>Outra pessoa moveu este marcador. Sua tentativa não foi aplicada.</p><button className="button button-secondary button-small" onClick={() => { applyPosition(conflict.id, conflict.position); setConflict(null); setSimulateConflict(false); setMessage('Posição atual carregada. Você pode tentar um novo movimento.'); }}>Carregar posição atual</button></div> : null}
            {message ? <p className="vtt-movement-feedback" role="status">{message}</p> : null}
            {scene ? <VttViewport key={scene.id} settings={scene.settings} backgroundSrc={initial.backgroundSrc} tokens={conflict ? tokens.map(token => ({ ...token, canMove: false })) : tokens}
              selectedId={selected?.id ?? ''} onSelect={setSelectedId} onMove={move} snap={snap} />
              : <div className="vtt-page-state"><Map size={36} /><h3>A aventura ainda não tem um cenário.</h3><p>{canManage ? 'Escolha uma cena na preparação para apresentá-la aos jogadores.' : 'Aguarde o mestre escolher uma cena para a sessão.'}</p></div>}
          </div>
          <aside className="vtt-inspector panel" aria-label="Controles da mesa">
            {table?.audience === 'GM' ? <section className="vtt-inspector-section"><div className="vtt-section-heading"><h2>Cenas da sessão</h2><Badge>Preparação</Badge></div><div className="vtt-scene-list">{initial.scenes.map(item => canManage ? <Link key={item.key} href={href('ready', item.key)} prefetch={false} className={`vtt-scene-choice ${scene && initial.sceneKey === item.key ? 'vtt-selected-scene' : ''}`} aria-current={scene && initial.sceneKey === item.key ? 'true' : undefined}>
              <span className={`vtt-scene-thumbnail vtt-scene-${item.key}`} aria-hidden="true" /><span>{item.name}<small>{initial.sceneKey === item.key && scene ? 'Em exibição' : 'Selecionar cena'}</small></span><ArrowRight size={16} /></Link> : <div key={item.key} className="vtt-scene-choice"><span className={`vtt-scene-thumbnail vtt-scene-${item.key}`} aria-hidden="true" /><span>{item.name}<small>{initial.sceneKey === item.key ? 'Em exibição · somente leitura' : 'Preparação · somente leitura'}</small></span></div>)}</div></section> : null}
            {scene ? <>
              <section className="vtt-inspector-section"><h2>Sobre a cena</h2><p>{scene.settings.description}</p><p className="muted">{tokens.length} marcadores nesta visão.</p></section>
              {table?.audience === 'GM' ? <VttSceneControls settings={scene.settings} disabled={!canManage} onApply={applySettings} /> : null}
              <section className="vtt-inspector-section"><h2>Marcadores</h2><label>Marcador selecionado<select value={selected?.id ?? ''} onChange={event => setSelectedId(event.target.value)}>{tokens.map(token => <option key={token.id} value={token.id}>{token.name ?? 'Marcador sem nome'}{token.hidden ? ' · oculto' : ''}</option>)}</select></label>
                {selected ? <><p className="vtt-token-permission"><Eye size={16} />{selected.hidden ? 'Visível apenas ao mestre' : selected.canMove && !conflict ? 'Você pode mover este marcador' : 'Marcador somente leitura'}</p><output className="vtt-token-position" aria-label="Posição do marcador">X {Number(selected.x.toFixed(2))} · Y {Number(selected.y.toFixed(2))}</output>
                  <fieldset className="vtt-nudge" disabled={!selected.canMove || !!conflict} aria-label="Mover marcador">{[{ icon: ArrowLeft, label: 'Mover para esquerda', x: -1, y: 0 }, { icon: ArrowUp, label: 'Mover para cima', x: 0, y: -1 }, { icon: ArrowDown, label: 'Mover para baixo', x: 0, y: 1 }, { icon: ArrowRight, label: 'Mover para direita', x: 1, y: 0 }].map(({ icon: Icon, label, x, y }) => <button key={label} className="icon-button" aria-label={label} onClick={() => { const step = scene.settings.grid.type === 'SQUARE' ? scene.settings.grid.cellSize : 25; move(selected.id, tokenPosition(scene.settings, selected.size, { x: selected.x + x * step, y: selected.y + y * step }, snap)); }}><Icon size={20} /></button>)}</fieldset>
                </> : null}
                <label className="vtt-snap"><input type="checkbox" checked={snap} onChange={event => setSnap(event.target.checked)} />Encaixar arraste na grade</label>
              </section>
              {table?.audience === 'GM' ? <section className="vtt-inspector-section vtt-gm-notes"><h2><LockKeyhole size={16} /> Notas do mestre</h2><p>{table.scene?.gmNotes}</p><small>Estas notas e os marcadores ocultos não são enviados à visão do jogador.</small></section> : null}
            </> : null}
            <section className="vtt-inspector-section"><Link href={href(initial.scenario)} className="subtle-link" prefetch={false}><RotateCcw size={16} />Reiniciar demonstração</Link></section>
          </aside>
        </section>}
    </main>
    <footer className="vtt-demo-footer">PARALAX RPG <span>Um cenário. Infinitas histórias.</span></footer>
  </div>;
}
