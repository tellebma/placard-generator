import type { BoardSpec, Material, NumberedPiece } from './types';

/**
 * Calepinage simple par bandes (guillotine) : les pièces sont rangées en bandes
 * horizontales, ce qui correspond à des coupes réalisables à la scie de découpe en magasin.
 */

export interface Placement {
  readonly ref: string;
  readonly x: number;
  readonly y: number;
  /** Dimension le long de la longueur du panneau brut. */
  readonly l: number;
  /** Dimension le long de la largeur du panneau brut. */
  readonly w: number;
  readonly rotated: boolean;
}

interface Strip {
  readonly y: number;
  readonly height: number;
  readonly used: number;
}

export interface PackedBoard {
  readonly strips: readonly Strip[];
  readonly placements: readonly Placement[];
  readonly usedHeight: number;
}

export interface PackingResult {
  readonly material: Material;
  readonly thickness: number;
  readonly spec: BoardSpec;
  readonly boards: readonly PackedBoard[];
  readonly oversize: readonly string[];
  /** Taux d'utilisation de la matière (0-1). */
  readonly usage: number;
}

interface Rect {
  readonly ref: string;
  readonly l: number;
  readonly w: number;
  readonly rotated: boolean;
}

const fits = (r: Rect, spec: BoardSpec): boolean => r.l <= spec.length && r.w <= spec.width;

/** Oriente la pièce de préférence avec sa grande dimension le long du panneau. */
function orient(ref: string, a: number, b: number, spec: BoardSpec): Rect | null {
  const long = { ref, l: Math.max(a, b), w: Math.min(a, b), rotated: a < b };
  const cross = { ref, l: Math.min(a, b), w: Math.max(a, b), rotated: a >= b };
  if (fits(long, spec)) return long;
  return fits(cross, spec) ? cross : null;
}

function tryStrips(board: PackedBoard, r: Rect, spec: BoardSpec): PackedBoard | null {
  const idx = board.strips.findIndex((s) => r.w <= s.height && s.used + r.l <= spec.length);
  if (idx === -1) return null;
  const strip = board.strips[idx];
  return {
    ...board,
    strips: board.strips.map((s, i) => (i === idx ? { ...s, used: s.used + r.l + spec.kerf } : s)),
    placements: [...board.placements, { ...r, x: strip.used, y: strip.y }],
  };
}

function tryNewStrip(board: PackedBoard, r: Rect, spec: BoardSpec): PackedBoard | null {
  if (board.usedHeight + r.w > spec.width) return null;
  const strip = { y: board.usedHeight, height: r.w, used: r.l + spec.kerf };
  return {
    strips: [...board.strips, strip],
    placements: [...board.placements, { ...r, x: 0, y: strip.y }],
    usedHeight: board.usedHeight + r.w + spec.kerf,
  };
}

function placeRect(boards: readonly PackedBoard[], r: Rect, spec: BoardSpec): PackedBoard[] {
  const attempts = [tryStrips, tryNewStrip];
  for (const attempt of attempts) {
    for (let i = 0; i < boards.length; i++) {
      const updated = attempt(boards[i], r, spec);
      if (updated) return boards.map((b, j) => (j === i ? updated : b));
    }
  }
  const empty: PackedBoard = { strips: [], placements: [], usedHeight: 0 };
  return [...boards, tryNewStrip(empty, r, spec) as PackedBoard];
}

export function packPieces(
  pieces: readonly NumberedPiece[],
  material: Material,
  thickness: number,
  spec: BoardSpec,
): PackingResult {
  const expanded = pieces
    .filter((p) => p.material === material && p.thickness === thickness)
    .flatMap((p) => Array.from({ length: p.qty }, () => p));

  const oriented = expanded.map((p) => ({ ref: p.ref, rect: orient(p.ref, p.length, p.width, spec) }));
  const oversize = [...new Set(oriented.filter((o) => o.rect === null).map((o) => o.ref))];
  const rects = oriented
    .flatMap((o) => (o.rect ? [o.rect] : []))
    .sort((a, b) => b.w - a.w || b.l - a.l);

  const boards = rects.reduce<PackedBoard[]>((acc, r) => placeRect(acc, r, spec), []);
  const usedArea = rects.reduce((s, r) => s + r.l * r.w, 0);
  const totalArea = boards.length * spec.length * spec.width;

  return {
    material,
    thickness,
    spec,
    boards,
    oversize,
    usage: totalArea > 0 ? usedArea / totalArea : 0,
  };
}
