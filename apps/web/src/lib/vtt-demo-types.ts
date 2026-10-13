import type { VttTable } from '@paralax/contracts';

export type DemoView = 'GM' | 'PLAYER' | 'OUTSIDER';
export type DemoScenario = 'ready' | 'loading' | 'error' | 'empty' | 'read-only' | 'revoked' | 'conflict';
export type DemoSceneKey = 'ruins' | 'crossing';
export interface VttDemoData {
  view: DemoView;
  scenario: DemoScenario;
  sceneKey: DemoSceneKey;
  count: 25 | 200;
  table: VttTable | null;
  backgroundSrc: string | null;
  scenes: { key: DemoSceneKey; name: string; image: string }[];
}
export interface MapToken {
  id: string;
  name: string | null;
  x: number;
  y: number;
  size: number;
  shape: 'CIRCLE' | 'SQUARE';
  color: string;
  canMove: boolean;
  hidden: boolean;
}
