import type { VttSceneSettings } from '@paralax/contracts';

export interface Point { x: number; y: number }
export interface MapView extends Point { scale: number }
export const zoomLimits = { min: 0.1, max: 4 };
export function fitMap(width: number, height: number, mapWidth: number, mapHeight: number): MapView {
  const scale = Math.max(zoomLimits.min, Math.min(zoomLimits.max, (width - 32) / mapWidth, (height - 32) / mapHeight));
  return { scale, x: (width - mapWidth * scale) / 2, y: (height - mapHeight * scale) / 2 };
}
export function zoomMap(view: MapView, scale: number, anchor: Point): MapView {
  const next = Math.max(zoomLimits.min, Math.min(zoomLimits.max, scale));
  return { scale: next, x: anchor.x - (anchor.x - view.x) * next / view.scale, y: anchor.y - (anchor.y - view.y) * next / view.scale };
}
export function mapPoint(view: MapView, point: Point): Point {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}
export function tokenPosition(settings: VttSceneSettings, size: number, position: Point, snap: boolean): Point {
  let { x, y } = position;
  if (snap && settings.grid.type === 'SQUARE') {
    const grid = settings.grid;
    x = grid.offsetX + grid.cellSize / 2 + Math.round((x - grid.offsetX - grid.cellSize / 2) / grid.cellSize) * grid.cellSize;
    y = grid.offsetY + grid.cellSize / 2 + Math.round((y - grid.offsetY - grid.cellSize / 2) / grid.cellSize) * grid.cellSize;
  }
  return { x: Math.max(size / 2, Math.min(settings.width - size / 2, x)), y: Math.max(size / 2, Math.min(settings.height - size / 2, y)) };
}
