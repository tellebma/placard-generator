import {
  heightAt,
  innerHeightAt,
  isSloped,
  slopeAngle,
  slopeDegrees,
  type Layout,
} from './geometry';
import type { ClosetConfig, DoorGeom, NumberedPiece, Piece } from './types';

type PieceInput = Omit<Piece, 'material' | 'qty' | 'thickness' | 'edgeLong' | 'edgeShort'> &
  Partial<Pick<Piece, 'material' | 'qty' | 'thickness' | 'edgeLong' | 'edgeShort'>>;

const makePiece = (cfg: ClosetConfig, p: PieceInput): Piece => ({
  material: 'panneau',
  qty: 1,
  thickness: cfg.thickness,
  edgeLong: 0,
  edgeShort: 0,
  ...p,
  length: Math.round(p.length),
  width: Math.round(p.width),
});

const bevelNote = (cfg: ClosetConfig, a: number, b: number): string | undefined =>
  isSloped(cfg)
    ? `Tête coupée en biais (${slopeDegrees(cfg).toFixed(1)}°) : ${Math.round(Math.min(a, b))} → ${Math.round(Math.max(a, b))} mm`
    : undefined;

function sidePieces(cfg: ClosetConfig, layout: Layout): Piece[] {
  const e = cfg.thickness;
  const base = { width: layout.caissonDepth, edgeLong: 1 as const };
  if (!isSloped(cfg)) {
    return [makePiece(cfg, { ...base, name: 'Côté', qty: 2, length: cfg.heightLeft })];
  }
  const side = (name: string, xOuter: number, xInner: number): Piece => {
    const a = heightAt(cfg, xOuter);
    const b = heightAt(cfg, xInner);
    return makePiece(cfg, { ...base, name, length: Math.max(a, b), note: bevelNote(cfg, a, b) });
  };
  return [side('Côté gauche', 0, e), side('Côté droit', cfg.width, cfg.width - e)];
}

function bottomTopPieces(cfg: ClosetConfig, layout: Layout): Piece[] {
  const span = cfg.width - 2 * cfg.thickness;
  const base = { width: layout.caissonDepth, edgeLong: 1 as const };
  const bottom = makePiece(cfg, { ...base, name: 'Bas', length: span });
  const top = isSloped(cfg)
    ? makePiece(cfg, {
        ...base,
        name: 'Dessus incliné',
        length: span / Math.cos(slopeAngle(cfg)),
        note: `Extrémités coupées d'aplomb à ${slopeDegrees(cfg).toFixed(1)}°`,
      })
    : makePiece(cfg, { ...base, name: 'Dessus', length: span });
  return [bottom, top];
}

function separationPieces(cfg: ClosetConfig, layout: Layout): Piece[] {
  return layout.separations.map((x, i) => {
    const a = innerHeightAt(cfg, x);
    const b = innerHeightAt(cfg, x + cfg.thickness);
    return makePiece(cfg, {
      name: 'Séparation',
      length: Math.max(a, b),
      width: layout.caissonDepth,
      edgeLong: 1,
      note: bevelNote(cfg, a, b),
      where: `col. ${i + 1}|${i + 2}`,
    });
  });
}

function plinthPieces(cfg: ClosetConfig): Piece[] {
  if (cfg.plinth <= 0) return [];
  const length = cfg.width - 2 * cfg.thickness;
  return [
    makePiece(cfg, { name: 'Socle avant', length, width: cfg.plinth, edgeLong: 1 }),
    makePiece(cfg, { name: 'Socle arrière', length, width: cfg.plinth }),
  ];
}

/** Jeu latéral des étagères posées sur taquets. */
export const SHELF_CLEARANCE = 2;

function shelfPieces(cfg: ClosetConfig, layout: Layout): Piece[] {
  return layout.columns
    .filter((col) => col.config.shelves.length > 0)
    .map((col) =>
      makePiece(cfg, {
        name: 'Étagère',
        qty: col.config.shelves.length,
        length: col.width - SHELF_CLEARANCE,
        width: layout.caissonDepth,
        edgeLong: 1,
        where: `col. ${col.index + 1}`,
      }),
    );
}

function doorPieces(cfg: ClosetConfig, doors: readonly DoorGeom[]): Piece[] {
  return doors.map((d) => {
    const hl = d.topLeft - d.y0;
    const hr = d.topRight - d.y0;
    return makePiece(cfg, {
      name: 'Porte',
      length: Math.max(hl, hr),
      width: d.x1 - d.x0,
      edgeLong: 2,
      edgeShort: 2,
      note: bevelNote(cfg, hl, hr),
      where: `col. ${d.columnIndex + 1}`,
    });
  });
}

/**
 * Découpe le fond en panneaux dont les jonctions tombent dans l'axe d'une séparation
 * (pour pouvoir les clouer dessus), sans dépasser la largeur du panneau brut.
 */
export function backSegments(cfg: ClosetConfig, layout: Layout): [number, number][] {
  const maxW = cfg.backBoard.width;
  const joints = layout.separations.map((x) => x + cfg.thickness / 2);
  const next = (start: number): [number, number][] => {
    if (cfg.width - start <= maxW) return [[start, cfg.width]];
    const reachable = joints.filter((j) => j > start && j - start <= maxW);
    const end = reachable.at(-1) ?? joints.find((j) => j > start) ?? cfg.width;
    return end >= cfg.width ? [[start, cfg.width]] : [[start, end], ...next(end)];
  };
  return next(0);
}

function backPieces(cfg: ClosetConfig, layout: Layout): Piece[] {
  if (cfg.backThickness <= 0) return [];
  return backSegments(cfg, layout).map(([x0, x1]) => {
    const a = heightAt(cfg, x0);
    const b = heightAt(cfg, x1);
    return makePiece(cfg, {
      name: 'Fond',
      material: 'fond',
      thickness: cfg.backThickness,
      length: Math.max(a, b),
      width: x1 - x0,
      note: isSloped(cfg) ? `Trapèze : ${Math.round(a)} (gauche) → ${Math.round(b)} (droite)` : undefined,
    });
  });
}

/** Identité d'une pièce (hors quantité et emplacement) : deux pièces de même identité sont interchangeables. */
export const pieceIdentity = (p: Piece): string =>
  [p.name, p.material, p.length, p.width, p.thickness, p.edgeLong, p.edgeShort, p.note ?? ''].join('|');

const joinWhere = (a?: string, b?: string): string | undefined => {
  if (!a || !b) return a ?? b;
  return a.split(', ').includes(b) ? a : `${a}, ${b}`;
};

/** Regroupe les pièces identiques en additionnant les quantités. */
export function mergePieces(pieces: readonly Piece[]): Piece[] {
  return pieces.reduce<Piece[]>((acc, p) => {
    const idx = acc.findIndex((q) => pieceIdentity(q) === pieceIdentity(p));
    if (idx === -1) return [...acc, p];
    return acc.map((q, i) => (i === idx ? { ...q, qty: q.qty + p.qty, where: joinWhere(q.where, p.where) } : q));
  }, []);
}

export const refLetter = (i: number): string =>
  i < 26 ? String.fromCharCode(65 + i) : refLetter(Math.floor(i / 26) - 1) + refLetter(i % 26);

export function computeCutList(cfg: ClosetConfig, layout: Layout, doors: readonly DoorGeom[]): NumberedPiece[] {
  const raw = [
    ...sidePieces(cfg, layout),
    ...bottomTopPieces(cfg, layout),
    ...separationPieces(cfg, layout),
    ...plinthPieces(cfg),
    ...shelfPieces(cfg, layout),
    ...doorPieces(cfg, doors),
    ...backPieces(cfg, layout),
  ];
  return mergePieces(raw).map((p, i) => ({ ...p, ref: refLetter(i) }));
}

/** Longueur totale de chant à plaquer, en mètres. */
export const edgeBandingMeters = (pieces: readonly Piece[]): number =>
  pieces.reduce((s, p) => s + p.qty * (p.edgeLong * p.length + p.edgeShort * p.width), 0) / 1000;

/** Surface totale par matériau, en m². */
export const areaByMaterial = (pieces: readonly Piece[], material: Piece['material']): number =>
  pieces.filter((p) => p.material === material).reduce((s, p) => s + p.qty * p.length * p.width, 0) / 1e6;
