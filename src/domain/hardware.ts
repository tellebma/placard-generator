import { edgeBandingMeters } from './cutlist';
import type { Layout } from './geometry';
import type { ClosetConfig, DoorGeom, Piece } from './types';

export interface HardwareItem {
  readonly name: string;
  readonly qty: number;
  readonly unit?: string;
  readonly note?: string;
}

function assemblyScrews(cfg: ClosetConfig, layout: Layout): HardwareItem {
  const perJoint = layout.caissonDepth >= 450 ? 3 : 2;
  const joints = 4 + 2 * layout.separations.length + (cfg.plinth > 0 ? 4 : 0);
  return {
    name: "Vis d'assemblage type Confirmat 7×50",
    qty: joints * perJoint,
    note: `${perJoint} par jonction. Avant-trous Ø7 dans la face, Ø5 dans le chant (ou tourillons Ø8 + colle).`,
  };
}

function rodItems(layout: Layout): HardwareItem[] {
  const cols = layout.columns.filter((c) => c.config.rodHeight !== null);
  if (cols.length === 0) return [];
  const rods = cols.map((c) => ({ len: Math.floor(c.width - 4), long: c.width > 1000, idx: c.index + 1 }));
  return [
    {
      name: 'Tringle de penderie',
      qty: rods.length,
      note: rods.map((r) => `col. ${r.idx} : couper à ${r.len} mm`).join(' · '),
    },
    { name: 'Supports de tringle', qty: rods.length * 2 },
    ...(rods.some((r) => r.long)
      ? [{ name: 'Support central de tringle', qty: rods.filter((r) => r.long).length, note: 'Tringle > 1 m' }]
      : []),
  ];
}

function doorItems(doors: readonly DoorGeom[]): HardwareItem[] {
  if (doors.length === 0) return [];
  const count = (type: DoorGeom['hingeType']) =>
    doors.filter((d) => d.hingeType === type).reduce((s, d) => s + d.hinges, 0);
  const full = count('applique');
  const half = count('semi-applique');
  return [
    ...(full > 0
      ? [{ name: 'Charnières invisibles Ø35 — applique', qty: full, note: 'Porte montée sur un côté extérieur' }]
      : []),
    ...(half > 0
      ? [{ name: 'Charnières invisibles Ø35 — semi-applique', qty: half, note: 'Porte montée sur une séparation' }]
      : []),
    { name: 'Poignées ou boutons', qty: doors.length },
  ];
}

export function computeHardware(
  cfg: ClosetConfig,
  layout: Layout,
  doors: readonly DoorGeom[],
  pieces: readonly Piece[],
): HardwareItem[] {
  const shelves = layout.columns.reduce((s, c) => s + c.config.shelves.length, 0);
  const edge = edgeBandingMeters(pieces);
  const backPerimeter = pieces
    .filter((p) => p.material === 'fond')
    .reduce((s, p) => s + p.qty * 2 * (p.length + p.width), 0);

  return [
    assemblyScrews(cfg, layout),
    ...(shelves > 0 ? [{ name: "Taquets d'étagère Ø5", qty: shelves * 4 }] : []),
    ...rodItems(layout),
    ...doorItems(doors),
    ...(backPerimeter > 0
      ? [{ name: 'Pointes ou vis 3×16 pour le fond', qty: Math.ceil(backPerimeter / 150), note: 'Un point tous les 15 cm' }]
      : []),
    ...(edge > 0
      ? [{
          name: `Chant thermocollant (largeur ≥ ${cfg.thickness + 4} mm)`,
          qty: Math.ceil(edge * 1.1),
          unit: 'm',
          note: `${edge.toFixed(1)} m nets + 10 % de chute`,
        }]
      : []),
    { name: 'Équerres de fixation murale (anti-basculement)', qty: 2, note: 'Indispensable pour un meuble haut' },
  ];
}
