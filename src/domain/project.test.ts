import { describe, expect, it } from 'vitest';
import { backSegments } from './cutlist';
import { defaultConfig, evenShelves, newColumn, parseConfig } from './defaults';
import { hingeCount } from './doors';
import { computeLayout } from './geometry';
import { computeProject } from './project';
import type { ClosetConfig } from './types';

const simple = (patch: Partial<ClosetConfig> = {}): ClosetConfig => ({
  ...defaultConfig(),
  width: 1000,
  heightLeft: 2000,
  depth: 500,
  backThickness: 3,
  plinth: 0,
  columns: [newColumn({ shelves: [500, 1000], doors: 2 })],
  ...patch,
});

const find = (cfg: ClosetConfig, name: string) => computeProject(cfg).pieces.find((p) => p.name === name);

describe('layout', () => {
  it('répartit les colonnes auto en tenant compte des épaisseurs', () => {
    const cfg = simple({ columns: [newColumn(), newColumn()] });
    const layout = computeLayout(cfg);
    // 1000 - 3 × 18 = 946 → 473 par colonne
    expect(layout.columns.map((c) => c.width)).toEqual([473, 473]);
    expect(layout.columns[1].x).toBe(18 + 473 + 18);
    expect(layout.separations).toEqual([491]);
  });

  it('fait absorber la différence par la dernière colonne si aucune n\'est auto', () => {
    const cfg = simple({ columns: [newColumn({ width: 400 }), newColumn({ width: 400 })] });
    expect(computeLayout(cfg).columns[1].width).toBe(546);
  });
});

describe('liste de débit', () => {
  it('calcule côtés, bas, dessus, étagères et fond', () => {
    const cfg = simple();
    expect(find(cfg, 'Côté')).toMatchObject({ qty: 2, length: 2000, width: 497 });
    expect(find(cfg, 'Bas')).toMatchObject({ length: 964, width: 497 });
    expect(find(cfg, 'Dessus')).toMatchObject({ length: 964 });
    expect(find(cfg, 'Étagère')).toMatchObject({ qty: 2, length: 962 });
    expect(find(cfg, 'Fond')).toMatchObject({ length: 2000, width: 1000, thickness: 3 });
  });

  it('calcule des portes en applique avec jeu', () => {
    const doors = computeProject(simple()).pieces.find((p) => p.name === 'Porte');
    // 2 portes sur 1000 mm, jeu de 3 mm : 500 - 3 = 497
    expect(doors).toMatchObject({ qty: 2, width: 497, length: 1997 });
  });

  it('ajoute le socle et réduit les séparations', () => {
    const cfg = simple({ plinth: 100, columns: [newColumn(), newColumn()] });
    expect(find(cfg, 'Socle avant')).toMatchObject({ length: 964, width: 100 });
    // 2000 - 100 (socle) - 18 (bas) - 18 (dessus)
    expect(find(cfg, 'Séparation')).toMatchObject({ length: 1864 });
  });

  it('gère une sous-pente avec coupes biaises', () => {
    const cfg = simple({ shape: 'sous-pente', heightLeft: 2000, heightRight: 1000 });
    const pieces = computeProject(cfg).pieces;
    expect(pieces.find((p) => p.name === 'Côté gauche')?.length).toBe(2000);
    expect(pieces.find((p) => p.name === 'Côté droit')?.length).toBe(1018);
    const top = pieces.find((p) => p.name === 'Dessus incliné');
    expect(top?.length).toBe(Math.round(Math.hypot(964, 964)));
  });
});

describe('fond', () => {
  it('coupe le fond au droit des séparations', () => {
    const cfg = simple({ width: 2400, columns: [newColumn(), newColumn(), newColumn()] });
    const segs = backSegments(cfg, computeLayout(cfg));
    expect(segs.length).toBe(3);
    expect(segs.every(([a, b]) => b - a <= 1220)).toBe(true);
    expect(segs[segs.length - 1][1]).toBe(2400);
  });
});

describe('calepinage', () => {
  it('place toutes les pièces sans chevauchement', () => {
    const project = computeProject(defaultConfig());
    const pack = project.packs[0];
    const placed = pack.boards.flatMap((b) => b.placements).length;
    const expected = project.pieces.filter((p) => p.material === 'panneau').reduce((s, p) => s + p.qty, 0);
    expect(placed).toBe(expected);
    pack.boards.forEach((b) =>
      b.placements.forEach((p) => {
        expect(p.x + p.l).toBeLessThanOrEqual(pack.spec.length);
        expect(p.y + p.w).toBeLessThanOrEqual(pack.spec.width);
      }),
    );
  });
});

describe('divers', () => {
  it('conseille le nombre de charnières selon la hauteur', () => {
    expect([800, 1200, 1900, 2300].map(hingeCount)).toEqual([2, 3, 4, 5]);
  });

  it('répartit les étagères régulièrement', () => {
    expect(evenShelves(3, 1982, 18)).toEqual([482, 982, 1482]);
  });

  it('la configuration par défaut est valide', () => {
    const issues = computeProject(defaultConfig()).issues.filter((i) => i.level === 'error');
    expect(issues).toEqual([]);
  });

  it('rejette une configuration importée invalide', () => {
    expect(parseConfig({ foo: 1 })).toBeNull();
    expect(parseConfig({ columns: [{ doors: 7 }] })?.columns[0].doors).toBe(1);
  });
});
