import { heightAt, type ColumnLayout, type Layout } from './geometry';
import type { ClosetConfig, DoorGeom } from './types';

/** Nombre de charnières conseillé selon la hauteur de porte. */
export function hingeCount(height: number): number {
  if (height <= 1000) return 2;
  if (height <= 1500) return 3;
  if (height <= 2000) return 4;
  return 5;
}

/**
 * Portes en applique : chaque colonne est couverte de l'axe de la séparation
 * (ou du bord extérieur) jusqu'à l'axe suivant, moins le jeu.
 */
function columnSpan(cfg: ClosetConfig, layout: Layout, col: ColumnLayout): [number, number] {
  const half = cfg.thickness / 2;
  const isFirst = col.index === 0;
  const isLast = col.index === layout.columns.length - 1;
  return [isFirst ? 0 : col.x - half, isLast ? cfg.width : col.x + col.width + half];
}

function doorsForColumn(cfg: ClosetConfig, layout: Layout, col: ColumnLayout): DoorGeom[] {
  const n = col.config.doors;
  if (n === 0) return [];
  const [left, right] = columnSpan(cfg, layout, col);
  const slot = (right - left) / n;
  const gap = cfg.doorGap;

  return Array.from({ length: n }, (_, k) => {
    const x0 = left + k * slot + gap / 2;
    const x1 = left + (k + 1) * slot - gap / 2;
    const hingeSide = n === 2 && k === 1 ? 'right' : 'left';
    const hingeEdge = hingeSide === 'left' ? left + k * slot : left + (k + 1) * slot;
    const onOuterSide = hingeEdge <= 0 || hingeEdge >= cfg.width;
    const topLeft = heightAt(cfg, x0) - gap / 2;
    const topRight = heightAt(cfg, x1) - gap / 2;
    return {
      columnIndex: col.index,
      x0,
      x1,
      y0: cfg.plinth + gap / 2,
      topLeft,
      topRight,
      hingeSide,
      hingeType: onOuterSide ? 'applique' : 'semi-applique',
      hinges: hingeCount(Math.max(topLeft, topRight) - cfg.plinth - gap / 2),
    };
  });
}

export function computeDoors(cfg: ClosetConfig, layout: Layout): DoorGeom[] {
  return layout.columns.flatMap((col) => doorsForColumn(cfg, layout, col));
}
