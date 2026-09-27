import { newColumn, newId } from './defaults';
import { computeLayout } from './geometry';
import type { ClosetConfig, ColumnConfig } from './types';

/** Opérations d'édition pures : chaque fonction renvoie une nouvelle configuration. */

export const MIN_DRAG_WIDTH = 150;

const withColumns = (cfg: ClosetConfig, columns: readonly ColumnConfig[]): ClosetConfig => ({ ...cfg, columns });

export const updateColumn = (cfg: ClosetConfig, id: string, patch: Partial<ColumnConfig>): ClosetConfig =>
  withColumns(cfg, cfg.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)));

export const addColumn = (cfg: ClosetConfig): ClosetConfig => withColumns(cfg, [...cfg.columns, newColumn()]);

export function duplicateColumn(cfg: ClosetConfig, id: string): ClosetConfig {
  const idx = cfg.columns.findIndex((c) => c.id === id);
  if (idx === -1) return cfg;
  const copy = { ...cfg.columns[idx], id: newId() };
  return withColumns(cfg, [...cfg.columns.slice(0, idx + 1), copy, ...cfg.columns.slice(idx + 1)]);
}

export const removeColumn = (cfg: ClosetConfig, id: string): ClosetConfig =>
  cfg.columns.length <= 1 ? cfg : withColumns(cfg, cfg.columns.filter((c) => c.id !== id));

export function moveColumn(cfg: ClosetConfig, id: string, delta: number): ClosetConfig {
  const from = cfg.columns.findIndex((c) => c.id === id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= cfg.columns.length) return cfg;
  return withColumns(
    cfg,
    cfg.columns.map((c, i) => (i === from ? cfg.columns[to] : i === to ? cfg.columns[from] : c)),
  );
}

const columnById = (cfg: ClosetConfig, id: string): ColumnConfig | undefined => cfg.columns.find((c) => c.id === id);

export function setShelf(cfg: ClosetConfig, id: string, index: number, height: number): ClosetConfig {
  const col = columnById(cfg, id);
  if (!col) return cfg;
  return updateColumn(cfg, id, { shelves: col.shelves.map((s, i) => (i === index ? height : s)) });
}

export function addShelf(cfg: ClosetConfig, id: string, height: number): ClosetConfig {
  const col = columnById(cfg, id);
  return col ? updateColumn(cfg, id, { shelves: [...col.shelves, height] }) : cfg;
}

export function removeShelf(cfg: ClosetConfig, id: string, index: number): ClosetConfig {
  const col = columnById(cfg, id);
  return col ? updateColumn(cfg, id, { shelves: col.shelves.filter((_, i) => i !== index) }) : cfg;
}

/**
 * Déplace une séparation : les deux colonnes voisines passent en largeur fixe,
 * leur somme est conservée pour ne pas perturber les autres colonnes.
 */
export function moveSeparation(cfg: ClosetConfig, sepIndex: number, newX: number): ClosetConfig {
  const layout = computeLayout(cfg);
  const current = layout.separations[sepIndex];
  const left = layout.columns[sepIndex];
  const right = layout.columns[sepIndex + 1];
  if (current === undefined || !left || !right) return cfg;
  const minDelta = MIN_DRAG_WIDTH - left.width;
  const maxDelta = right.width - MIN_DRAG_WIDTH;
  const delta = Math.min(maxDelta, Math.max(minDelta, newX - current));
  const a = Math.round(left.width + delta);
  const b = Math.round(left.width + right.width) - a;
  return withColumns(
    cfg,
    cfg.columns.map((c, i) => (i === sepIndex ? { ...c, width: a } : i === sepIndex + 1 ? { ...c, width: b } : c)),
  );
}

/** Arrondit une valeur au pas donné. */
export const snap = (value: number, step: number): number => Math.round(value / step) * step;
