'use client';

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Focus, Maximize2, Minus, Plus } from 'lucide-react';
import type { VttSceneSettings } from '@paralax/contracts';
import type { MapToken } from '@/lib/vtt-demo-types';
import { fitMap, mapPoint, tokenPosition, zoomMap, type MapView, type Point } from '@/lib/vtt-viewport';

interface Props {
  settings: VttSceneSettings;
  backgroundSrc: string | null;
  tokens: readonly MapToken[];
  selectedId: string;
  snap: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, position: Point) => void;
}
type Gesture = { kind: 'pan'; point: Point; view: MapView }
  | { kind: 'token'; token: MapToken; point: Point; next: Point }
  | { kind: 'pinch'; distance: number; anchor: Point; scale: number };

const MapArtwork = memo(function MapArtwork({ settings, backgroundSrc, tokens, selectedId, patternId, onTokenKey, onSelect, onImageError, imageAttempt }: {
  settings: VttSceneSettings; backgroundSrc: string | null; tokens: readonly MapToken[]; selectedId: string;
  patternId: string; onTokenKey: (event: KeyboardEvent<SVGGElement>, token: MapToken) => void;
  onSelect: (id: string) => void; onImageError: () => void; imageAttempt: number;
}) {
  const grid = settings.grid;
  return <>
    <defs>{grid.type === 'SQUARE' ? <pattern id={patternId} width={grid.cellSize} height={grid.cellSize} x={grid.offsetX} y={grid.offsetY} patternUnits="userSpaceOnUse"><path d={`M ${grid.cellSize} 0 L 0 0 0 ${grid.cellSize}`} fill="none" stroke="#dce8e2" strokeWidth="1" opacity=".28" /></pattern> : null}</defs>
    <rect width={settings.width} height={settings.height} fill="#1b3032" />
    {backgroundSrc ? <image key={imageAttempt} href={backgroundSrc} width={settings.width} height={settings.height} onError={onImageError} /> : null}
    {grid.type === 'SQUARE' ? <rect data-testid="map-grid" width={settings.width} height={settings.height} fill={`url(#${patternId})`} pointerEvents="none" /> : null}
    {tokens.map(token => <g key={token.id} data-token-id={token.id} data-x={token.x} data-y={token.y}
      data-can-move={token.canMove} transform={`translate(${token.x} ${token.y})`}
      role="button" tabIndex={selectedId === token.id ? 0 : -1} aria-pressed={selectedId === token.id}
      aria-label={`${token.name ?? 'Marcador sem nome'}, ${token.canMove ? 'pode mover' : 'somente leitura'}, posição ${token.x}, ${token.y}`}
      onFocus={() => onSelect(token.id)} onKeyDown={event => onTokenKey(event, token)}>
      <circle r={token.size / 2 + 6} fill="transparent" stroke={selectedId === token.id ? '#f2f4f7' : 'transparent'} strokeWidth="2" />
      {token.shape === 'CIRCLE' ? <circle r={token.size / 2} fill="#141821" stroke={token.color} strokeWidth="3" strokeDasharray={token.hidden ? '5 4' : undefined} />
        : <rect x={-token.size / 2} y={-token.size / 2} width={token.size} height={token.size} rx="5" fill="#141821" stroke={token.color} strokeWidth="3" />}
      <path d={`M 0 ${-token.size * .25} L ${token.size * .21} ${token.size * .14} L 0 ${token.size * .05} L ${-token.size * .21} ${token.size * .14} Z`} fill={token.color} pointerEvents="none" />
      {selectedId === token.id && token.name ? <text y={token.size / 2 + 22} textAnchor="middle" fill="#f2f4f7" stroke="#141821" strokeWidth="4" paintOrder="stroke" fontSize="15" pointerEvents="none">{token.name}</text> : null}
    </g>)}
  </>;
});

export function VttViewport({ settings, backgroundSrc, tokens, selectedId, snap, onSelect, onMove }: Props) {
  const svg = useRef<SVGSVGElement>(null), world = useRef<SVGGElement>(null);
  const [size, setSize] = useState({ width: 960, height: 600 });
  const [view, setView] = useState(() => fitMap(960, 600, settings.width, settings.height));
  const currentView = useRef(view), currentSize = useRef(size);
  const pointers = useRef(new Map<number, Point>()), gesture = useRef<Gesture | null>(null), frame = useRef<number | null>(null);
  const [imageError, setImageError] = useState(false), [imageAttempt, setImageAttempt] = useState(0);
  const patternId = useId().replace(/:/g, '');
  const byId = useMemo(() => new Map(tokens.map(token => [token.id, token])), [tokens]);
  const imageFailed = useCallback(() => setImageError(true), []);
  useEffect(() => {
    if (!backgroundSrc) return;
    let disposed = false;
    const probe = new window.Image();
    probe.onerror = () => { if (!disposed) setImageError(true); };
    probe.onload = () => { if (!disposed) setImageError(false); };
    probe.src = backgroundSrc;
    return () => { disposed = true; probe.onload = null; probe.onerror = null; };
  }, [backgroundSrc, imageAttempt]);
  const applyView = useCallback((next: MapView) => { currentView.current = next; setView(next); }, []);
  const paint = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const next = currentView.current;
      world.current?.setAttribute('transform', `translate(${next.x} ${next.y}) scale(${next.scale})`);
      const drag = gesture.current;
      if (drag?.kind === 'token') svg.current?.querySelector(`[data-token-id="${drag.token.id}"]`)?.setAttribute('transform', `translate(${drag.next.x} ${drag.next.y})`);
    });
  }, []);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      if (!next.width || !next.height) return;
      currentSize.current = next; setSize(next);
      applyView(fitMap(next.width, next.height, settings.width, settings.height));
    });
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      if (pointers.current.size) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      applyView(zoomMap(currentView.current, currentView.current.scale * Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .003), { x: event.clientX - rect.left, y: event.clientY - rect.top }));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    const tracked = pointers.current;
    return () => { observer.disconnect(); element.removeEventListener('wheel', wheel); if (frame.current !== null) cancelAnimationFrame(frame.current); tracked.clear(); };
  }, [applyView, settings.width, settings.height]);

  function local(event: PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function restoreToken() {
    const drag = gesture.current;
    if (drag?.kind === 'token') svg.current?.querySelector(`[data-token-id="${drag.token.id}"]`)?.setAttribute('transform', `translate(${drag.token.x} ${drag.token.y})`);
  }
  function down(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const point = local(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size >= 2) {
      restoreToken();
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), anchor: mapPoint(currentView.current, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), scale: currentView.current.scale };
      return;
    }
    const target = (event.target as Element).closest<SVGGElement>('[data-token-id]');
    const token = target ? byId.get(target.dataset.tokenId!) : undefined;
    if (token) { onSelect(token.id); target?.focus({ preventScroll: true }); }
    else event.currentTarget.focus({ preventScroll: true });
    gesture.current = token?.canMove
      ? { kind: 'token', token, point: mapPoint(currentView.current, point), next: { x: token.x, y: token.y } }
      : { kind: 'pan', point, view: { ...currentView.current } };
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    const point = local(event), drag = gesture.current;
    pointers.current.set(event.pointerId, point);
    if (drag.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!b) return;
      const nextScale = Math.max(.1, Math.min(4, drag.scale * Math.hypot(a.x - b.x, a.y - b.y) / drag.distance));
      currentView.current = { scale: nextScale, x: (a.x + b.x) / 2 - drag.anchor.x * nextScale, y: (a.y + b.y) / 2 - drag.anchor.y * nextScale };
    } else if (drag.kind === 'pan') currentView.current = { ...drag.view, x: drag.view.x + point.x - drag.point.x, y: drag.view.y + point.y - drag.point.y };
    else {
      const position = mapPoint(currentView.current, point);
      drag.next = tokenPosition(settings, drag.token.size, { x: drag.token.x + position.x - drag.point.x, y: drag.token.y + position.y - drag.point.y }, snap);
    }
    paint();
  }
  function finish(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    if (!pointers.current.has(event.pointerId)) return;
    const drag = gesture.current;
    restoreToken();
    gesture.current = null;
    if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    const captured = [...pointers.current.keys()];
    pointers.current.clear();
    for (const pointerId of captured) if (event.currentTarget.hasPointerCapture(pointerId)) event.currentTarget.releasePointerCapture(pointerId);
    applyView({ ...currentView.current });
    if (!cancelled && drag?.kind === 'token' && (drag.next.x !== drag.token.x || drag.next.y !== drag.token.y)) onMove(drag.token.id, drag.next);
  }
  const tokenKey = useCallback((event: KeyboardEvent<SVGGElement>, token: MapToken) => {
    if (event.key === 'Enter' || event.key === ' ') { event.stopPropagation(); event.preventDefault(); onSelect(token.id); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.stopPropagation(); event.preventDefault();
    if (!token.canMove) return;
    const step = event.shiftKey ? 1 : settings.grid.type === 'SQUARE' ? settings.grid.cellSize : 25;
    onMove(token.id, tokenPosition(settings, token.size, { x: token.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), y: token.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) }, false));
  }, [onMove, onSelect, settings]);
  function zoom(factor: number) { applyView(zoomMap(currentView.current, currentView.current.scale * factor, { x: size.width / 2, y: size.height / 2 })); }
  function fit() { applyView(fitMap(size.width, size.height, settings.width, settings.height)); }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Home') { event.preventDefault(); fit(); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.2); }
    else if (event.key === '-') { event.preventDefault(); zoom(1 / 1.2); }
    else if (event.key.startsWith('Arrow')) {
      event.preventDefault(); const old = currentView.current;
      applyView({ ...old, x: old.x + (event.key === 'ArrowRight' ? -40 : event.key === 'ArrowLeft' ? 40 : 0), y: old.y + (event.key === 'ArrowDown' ? -40 : event.key === 'ArrowUp' ? 40 : 0) });
    }
  }
  return <div className="vtt-map-wrap">
    <div className="vtt-map-toolbar"><span>{settings.width} × {settings.height} <span className="muted">· {settings.scale.pixelsPerUnit} px / {settings.scale.unit}</span></span><div>
      <button type="button" className="icon-button" aria-label="Afastar mapa" onClick={() => zoom(1 / 1.2)}><Minus size={18} /></button>
      <output aria-label="Zoom do mapa">{Math.round(view.scale * 100)}%</output>
      <button type="button" className="icon-button" aria-label="Aproximar mapa" onClick={() => zoom(1.2)}><Plus size={18} /></button>
      <button type="button" className="icon-button" aria-label="Enquadrar mapa" onClick={fit}><Maximize2 size={18} /></button>
      <button type="button" className="icon-button" aria-label="Centralizar marcador selecionado" disabled={!byId.has(selectedId)} onClick={() => {
        const token = byId.get(selectedId);
        if (!token) return;
        const scale = Math.max(currentView.current.scale, .85);
        applyView({ scale, x: size.width / 2 - token.x * scale, y: size.height / 2 - token.y * scale });
      }}><Focus size={18} /></button>
    </div></div>
    {imageError ? <div className="feedback error" role="alert">A imagem não carregou. A grade continua disponível. <button className="button button-secondary button-small" onClick={() => { setImageError(false); setImageAttempt(value => value + 1); }}>Recarregar imagem</button></div> : null}
    <svg ref={svg} className="vtt-map" viewBox={`0 0 ${size.width} ${size.height}`} role="group" tabIndex={0}
      aria-label={`Mapa: ${settings.name}`} aria-describedby="vtt-map-help" data-testid="vtt-map"
      data-scale={view.scale} data-pan-x={view.x} data-pan-y={view.y}
      onPointerDown={down} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
      onLostPointerCapture={event => finish(event, true)} onKeyDown={key}>
      <g ref={world} data-testid="map-world" transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        <MapArtwork settings={settings} backgroundSrc={backgroundSrc} tokens={tokens} selectedId={selectedId} patternId={patternId}
          onTokenKey={tokenKey} onSelect={onSelect} onImageError={imageFailed} imageAttempt={imageAttempt} />
      </g>
    </svg>
    <p id="vtt-map-help" className="vtt-map-help">Arraste o fundo para navegar. Use dois dedos ou a roda para o zoom. No mapa, use as setas para navegar e Home para enquadrar. No marcador selecionado, as setas movem; Shift faz ajuste fino.</p>
  </div>;
}
