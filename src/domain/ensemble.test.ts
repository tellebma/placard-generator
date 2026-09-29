import { describe, expect, it } from 'vitest';
import { defaultConfig, newColumn } from './defaults';
import { addCaisson, moveCaisson, parseEnsemble, placements, removeCaisson, updateCaisson } from './ensemble';
import { computeEnsemble } from './ensembleProject';
import { PRESETS } from './presets';
import { computeProject } from './project';
import type { ClosetConfig, Ensemble } from './types';

const caisson = (patch: Partial<ClosetConfig>): ClosetConfig => ({
  ...defaultConfig(),
  plinth: 80,
  columns: [newColumn({ doors: 1 })],
  ...patch,
});

const trio = (): Ensemble => PRESETS.find((p) => p.id === 'niche')!.build();

describe('placements', () => {
  it('pose les caissons de gauche à droite, alignés contre le mur', () => {
    expect(placements(trio())).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 1000, y: 2000, z: 300 },
      { x: 1800, y: 0, z: 0 },
    ]);
    const p = computeEnsemble(trio());
    expect([p.width, p.height, p.depth]).toEqual([2400, 2400, 600]);
  });
});

describe('édition', () => {
  it('propage les réglages communs à tous les caissons', () => {
    const e = trio();
    const next = updateCaisson(e, 1, { ...e.caissons[1], thickness: 19, width: 700 });
    expect(next.caissons.map((c) => c.thickness)).toEqual([19, 19, 19]);
    expect(next.caissons.map((c) => c.width)).toEqual([1000, 700, 600]);
  });

  it('garde le socle commun aux caissons au sol, jamais sous un caisson suspendu', () => {
    const e = trio();
    expect(e.caissons.map((c) => c.plinth)).toEqual([80, 0, 80]);
    const higher = updateCaisson(e, 0, { ...e.caissons[0], plinth: 100 });
    expect(higher.caissons.map((c) => c.plinth)).toEqual([100, 0, 100]);
    const down = updateCaisson(higher, 1, { ...higher.caissons[1], elevation: 0 });
    expect(down.caissons[1].plinth).toBe(100);
    const up = updateCaisson(down, 1, { ...down.caissons[1], elevation: 1800 });
    expect(up.caissons[1].plinth).toBe(0);
  });

  it('remplace les équerres anti-basculement par un rail pour un caisson suspendu', () => {
    const p = computeEnsemble(trio());
    expect(p.hardware.find((h) => h.name.startsWith('Équerres'))?.qty).toBe(4);
    expect(p.hardware.find((h) => h.name.startsWith('Rail'))?.note).toContain('2000 mm du sol');
    expect(p.steps.find((s) => s.title === 'Liaison des caissons')?.details.join(' ')).toContain('suspendu');
  });

  it('ajoute, déplace et supprime des caissons sans perdre le dernier', () => {
    const e = addCaisson(trio());
    expect(e.caissons).toHaveLength(4);
    expect(moveCaisson(e, 0, 1).caissons[1].name).toBe('Colonne gauche');
    const one = { ...e, caissons: [e.caissons[0]] };
    expect(removeCaisson(one, 0)).toBe(one);
  });
});

describe('ensemble', () => {
  it('fusionne les pièces identiques et additionne les quantités', () => {
    const a = caisson({ width: 600 });
    const b = caisson({ width: 600 });
    const p = computeEnsemble({ name: 'x', caissons: [a, b] });
    const sides = p.pieces.find((q) => q.name === 'Côté');
    expect(sides?.qty).toBe(4);
    expect(sides?.where).toBe('C1, C2');
    expect(p.summary.pieceCount).toBe(2 * computeProject(a).summary.pieceCount);
  });

  it('signale les côtés visibles autour d\'un caisson moins profond', () => {
    const infos = computeEnsemble(trio()).issues.filter((i) => i.level === 'info');
    expect(infos.map((i) => i.caisson)).toEqual([0, 2]);
    expect(infos[0].message).toContain('300 mm en façade, 2000 mm en dessous');
  });

  it('numérote la notice avec les références globales et ajoute la liaison', () => {
    const p = computeEnsemble(trio());
    const titles = p.steps.map((s) => s.title);
    expect(titles[0]).toBe('Préparation');
    expect(titles.filter((t) => t.includes('Assemblage du caisson'))).toHaveLength(3);
    expect(titles).toContain('Liaison des caissons');
    expect(titles.filter((t) => t === 'Mise en place')).toHaveLength(1);
    const refs = new Set(p.pieces.map((q) => q.ref));
    const cited = p.steps.flatMap((s) => s.details).join(' ').match(/\(([A-Z](?:, [A-Z])*)\)/g) ?? [];
    cited.flatMap((c) => c.slice(1, -1).split(', ')).forEach((r) => expect(refs.has(r)).toBe(true));
  });

  it('garde le comportement d\'un caisson seul', () => {
    const cfg = caisson({ width: 1000 });
    const single = computeEnsemble({ name: 'x', caissons: [cfg] });
    const alone = computeProject(cfg);
    expect(single.steps).toEqual(alone.steps);
    expect(single.summary).toEqual(alone.summary);
  });
});

describe('parseEnsemble', () => {
  it('relit un ancien fichier à caisson unique', () => {
    const cfg = caisson({ width: 900 });
    const e = parseEnsemble(JSON.parse(JSON.stringify(cfg)));
    expect(e?.caissons).toHaveLength(1);
    expect(e?.caissons[0].width).toBe(900);
  });

  it('harmonise les réglages communs et dédoublonne les identifiants', () => {
    const a = caisson({ id: 'a', thickness: 18 });
    const b = caisson({ id: 'a', thickness: 22 });
    const e = parseEnsemble({ name: 'n', caissons: [a, b] });
    expect(e?.caissons.map((c) => c.thickness)).toEqual([18, 18]);
    expect(new Set(e?.caissons.map((c) => c.id)).size).toBe(2);
    expect(parseEnsemble({ caissons: [] })).toBeNull();
  });
});
