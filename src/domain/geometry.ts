import type { ClosetConfig, ColumnConfig } from './types';

export interface ColumnLayout {
  readonly index: number;
  readonly id: string;
  /** Bord gauche intérieur de la colonne. */
  readonly x: number;
  /** Largeur intérieure. */
  readonly width: number;
  readonly auto: boolean;
  readonly config: ColumnConfig;
}

export interface Layout {
  readonly columns: readonly ColumnLayout[];
  /** Abscisse du bord gauche de chaque séparation. */
  readonly separations: readonly number[];
  readonly caissonDepth: number;
}

export const isSloped = (cfg: ClosetConfig): boolean =>
  cfg.shape === 'sous-pente' && cfg.heightRight !== cfg.heightLeft;

export const rightHeight = (cfg: ClosetConfig): number =>
  cfg.shape === 'sous-pente' ? cfg.heightRight : cfg.heightLeft;

export const maxHeight = (cfg: ClosetConfig): number => Math.max(cfg.heightLeft, rightHeight(cfg));

/** Angle de la pente en radians (signé : positif si le côté droit est plus haut). */
export const slopeAngle = (cfg: ClosetConfig): number =>
  Math.atan((rightHeight(cfg) - cfg.heightLeft) / cfg.width);

export const slopeDegrees = (cfg: ClosetConfig): number =>
  Math.abs((slopeAngle(cfg) * 180) / Math.PI);

/** Hauteur extérieure du placard à l'abscisse x. */
export const heightAt = (cfg: ClosetConfig, x: number): number =>
  cfg.heightLeft + ((rightHeight(cfg) - cfg.heightLeft) * x) / cfg.width;

/** Épaisseur verticale du dessus (plus grande que l'épaisseur réelle si incliné). */
export const topVerticalThickness = (cfg: ClosetConfig): number =>
  cfg.thickness / Math.cos(slopeAngle(cfg));

/** Hauteur du dessous du panneau "dessus" à l'abscisse x. */
export const innerTopAt = (cfg: ClosetConfig, x: number): number =>
  heightAt(cfg, x) - topVerticalThickness(cfg);

/** Hauteur du dessus du panneau "bas". */
export const bottomY = (cfg: ClosetConfig): number => cfg.plinth + cfg.thickness;

/** Hauteur libre intérieure (entre le bas et le dessus) à l'abscisse x. */
export const innerHeightAt = (cfg: ClosetConfig, x: number): number =>
  innerTopAt(cfg, x) - bottomY(cfg);

export const columnInnerHeight = (cfg: ClosetConfig, col: ColumnLayout): number =>
  Math.min(innerHeightAt(cfg, col.x), innerHeightAt(cfg, col.x + col.width));

export const availableInnerWidth = (cfg: ClosetConfig): number =>
  cfg.width - 2 * cfg.thickness - Math.max(0, cfg.columns.length - 1) * cfg.thickness;

/**
 * Calcule la largeur de chaque colonne. Les colonnes "auto" se partagent la place restante.
 * S'il n'y a aucune colonne auto, la dernière absorbe la différence.
 */
function resolveWidths(cfg: ClosetConfig): readonly { width: number; auto: boolean }[] {
  const available = availableInnerWidth(cfg);
  const cols = cfg.columns;
  const autoCount = cols.filter((c) => c.width === null).length;

  if (autoCount === 0) {
    const othersSum = cols.slice(0, -1).reduce((s, c) => s + (c.width ?? 0), 0);
    return cols.map((c, i) =>
      i === cols.length - 1 ? { width: available - othersSum, auto: true } : { width: c.width ?? 0, auto: false },
    );
  }

  const fixedSum = cols.reduce((s, c) => s + (c.width ?? 0), 0);
  const autoWidth = (available - fixedSum) / autoCount;
  return cols.map((c) => (c.width === null ? { width: autoWidth, auto: true } : { width: c.width, auto: false }));
}

export function computeLayout(cfg: ClosetConfig): Layout {
  const e = cfg.thickness;
  const widths = resolveWidths(cfg);
  const starts = widths.reduce<readonly number[]>(
    (acc, _w, i) => (i === 0 ? [e] : [...acc, acc[i - 1] + widths[i - 1].width + e]),
    [],
  );
  const columns = cfg.columns.map((config, index) => ({
    index,
    id: config.id,
    x: starts[index],
    width: widths[index].width,
    auto: widths[index].auto,
    config,
  }));
  return {
    columns,
    separations: columns.slice(0, -1).map((c) => c.x + c.width),
    caissonDepth: cfg.depth - cfg.backThickness,
  };
}
