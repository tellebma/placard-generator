import { describe, expect, it } from 'vitest';
import { defaultConfig, newColumn } from './defaults';
import { addShelf, duplicateColumn, moveColumn, moveSeparation, removeColumn, removeShelf, setShelf } from './edit';
import { computeLayout } from './geometry';
import { PRESETS } from './presets';
import { computeProject } from './project';
import type { ClosetConfig } from './types';

const cfg3 = (): ClosetConfig => ({
  ...defaultConfig(),
  width: 1200,
  columns: [newColumn(), newColumn(), newColumn()],
});

describe('moveSeparation', () => {
  it('conserve la largeur des autres colonnes', () => {
    const cfg = cfg3();
    const before = computeLayout(cfg).columns.map((c) => c.width);
    const after = computeLayout(moveSeparation(cfg, 0, computeLayout(cfg).separations[0] + 50)).columns.map((c) => c.width);
    expect(after[0]).toBe(Math.round(before[0] + 50));
    expect(after[0] + after[1]).toBeCloseTo(before[0] + before[1], 0);
    expect(after[2]).toBeCloseTo(before[2], 5);
  });

  it('empêche une colonne de devenir trop étroite', () => {
    const cfg = cfg3();
    const moved = computeLayout(moveSeparation(cfg, 0, -500));
    expect(moved.columns[0].width).toBe(150);
  });
});

describe('étagères et colonnes', () => {
  it('ajoute, modifie et retire une étagère', () => {
    const cfg = cfg3();
    const id = cfg.columns[1].id;
    const added = addShelf(cfg, id, 400);
    expect(added.columns[1].shelves).toEqual([400]);
    expect(setShelf(added, id, 0, 500).columns[1].shelves).toEqual([500]);
    expect(removeShelf(added, id, 0).columns[1].shelves).toEqual([]);
    expect(cfg.columns[1].shelves).toEqual([]);
  });

  it('duplique, déplace et supprime une colonne', () => {
    const cfg = cfg3();
    const [a, b] = cfg.columns;
    const dup = duplicateColumn(cfg, a.id);
    expect(dup.columns).toHaveLength(4);
    expect(dup.columns[1].id).not.toBe(a.id);
    expect(moveColumn(cfg, a.id, 1).columns[1].id).toBe(a.id);
    expect(moveColumn(cfg, a.id, -1)).toBe(cfg);
    expect(removeColumn(cfg, b.id).columns.map((c) => c.id)).not.toContain(b.id);
  });
});

describe('modèles', () => {
  it.each(PRESETS.map((p) => [p.title, p] as const))('le modèle « %s » est sans erreur', (_title, preset) => {
    const errors = computeProject(preset.build()).issues.filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
  });
});

describe('modèles sans conseil', () => {
  it.each(PRESETS.map((p) => [p.title, p] as const))('le modèle « %s » ne déclenche aucune alerte', (_title, preset) => {
    expect(computeProject(preset.build()).issues).toEqual([]);
  });
});
