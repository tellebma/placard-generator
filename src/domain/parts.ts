import { backSegments } from './cutlist';
import { bottomY, heightAt, innerTopAt, type Layout } from './geometry';
import type { ClosetConfig, DoorGeom } from './types';

/**
 * Modèle géométrique commun au plan 2D et à la vue 3D : chaque pièce est un polygone
 * dans le plan de façade (x, y) extrudé en profondeur entre z0 et z1
 * (z = 0 : devant du caisson, z croissant vers le mur).
 */

export type Pt = readonly [number, number];

export type PartKind = 'side' | 'bottom' | 'top' | 'separation' | 'plinth' | 'shelf' | 'door' | 'back';

export interface Part {
  readonly key: string;
  readonly kind: PartKind;
  readonly poly: readonly Pt[];
  readonly z0: number;
  readonly z1: number;
  readonly column?: number;
  readonly shelf?: number;
  readonly separation?: number;
  readonly door?: DoorGeom;
}

export interface Rod {
  readonly column: number;
  readonly y: number;
  readonly x0: number;
  readonly x1: number;
  readonly z: number;
}

type YFn = (x: number) => number;

const quad = (x0: number, x1: number, yb: YFn, yt: YFn): Pt[] => [
  [x0, yb(x0)],
  [x1, yb(x1)],
  [x1, yt(x1)],
  [x0, yt(x0)],
];

function carcassParts(cfg: ClosetConfig, layout: Layout): Part[] {
  const e = cfg.thickness;
  const W = cfg.width;
  const d = layout.caissonDepth;
  const by = bottomY(cfg);
  const outer: YFn = (x) => heightAt(cfg, x);
  const innerTop: YFn = (x) => innerTopAt(cfg, x);
  const floor: YFn = () => 0;
  const plinthTop: YFn = () => cfg.plinth;

  const plinths: Part[] =
    cfg.plinth > 0
      ? [
          { key: 'plinth-front', kind: 'plinth', poly: quad(e, W - e, floor, plinthTop), z0: 0, z1: e },
          { key: 'plinth-back', kind: 'plinth', poly: quad(e, W - e, floor, plinthTop), z0: d - e, z1: d },
        ]
      : [];

  return [
    { key: 'side-left', kind: 'side', poly: quad(0, e, floor, outer), z0: 0, z1: d },
    { key: 'side-right', kind: 'side', poly: quad(W - e, W, floor, outer), z0: 0, z1: d },
    { key: 'bottom', kind: 'bottom', poly: quad(e, W - e, plinthTop, () => by), z0: 0, z1: d },
    { key: 'top', kind: 'top', poly: quad(e, W - e, innerTop, outer), z0: 0, z1: d },
    ...plinths,
    ...layout.separations.map((x, i) => ({
      key: `sep-${i}`,
      kind: 'separation' as const,
      poly: quad(x, x + e, () => by, innerTop),
      z0: 0,
      z1: d,
      separation: i,
    })),
  ];
}

function shelfParts(cfg: ClosetConfig, layout: Layout): Part[] {
  const by = bottomY(cfg);
  const e = cfg.thickness;
  return layout.columns.flatMap((col) =>
    col.config.shelves.map((h, i) => ({
      key: `shelf-${col.id}-${i}`,
      kind: 'shelf' as const,
      poly: quad(col.x + 1, col.x + col.width - 1, () => by + h, () => by + h + e),
      z0: 0,
      z1: layout.caissonDepth,
      column: col.index,
      shelf: i,
    })),
  );
}

function backParts(cfg: ClosetConfig, layout: Layout): Part[] {
  if (cfg.backThickness <= 0) return [];
  const d = layout.caissonDepth;
  return backSegments(cfg, layout).map(([x0, x1], i) => ({
    key: `back-${i}`,
    kind: 'back' as const,
    poly: quad(x0, x1, () => 0, (x) => heightAt(cfg, x)),
    z0: d,
    z1: d + cfg.backThickness,
  }));
}

function doorParts(cfg: ClosetConfig, doors: readonly DoorGeom[]): Part[] {
  return doors.map((door, i) => ({
    key: `door-${i}`,
    kind: 'door' as const,
    poly: [
      [door.x0, door.y0],
      [door.x1, door.y0],
      [door.x1, door.topRight],
      [door.x0, door.topLeft],
    ],
    z0: -cfg.thickness - 1,
    z1: -1,
    column: door.columnIndex,
    door,
  }));
}

export function computeParts(cfg: ClosetConfig, layout: Layout, doors: readonly DoorGeom[]): Part[] {
  return [...backParts(cfg, layout), ...carcassParts(cfg, layout), ...shelfParts(cfg, layout), ...doorParts(cfg, doors)];
}

export function computeRods(cfg: ClosetConfig, layout: Layout): Rod[] {
  const by = bottomY(cfg);
  return layout.columns
    .filter((c) => c.config.rodHeight !== null)
    .map((c) => ({
      column: c.index,
      y: by + (c.config.rodHeight ?? 0),
      x0: c.x + 4,
      x1: c.x + c.width - 4,
      z: layout.caissonDepth / 2,
    }));
}
