import { computeAssembly, type AssemblyStep } from './assembly';
import { computeCutList, edgeBandingMeters } from './cutlist';
import { computeDoors } from './doors';
import { computeLayout, type Layout } from './geometry';
import { computeHardware, type HardwareItem } from './hardware';
import { packPieces, type PackingResult } from './packing';
import { computeParts, computeRods, type Part, type Rod } from './parts';
import type { ClosetConfig, DoorGeom, Issue, NumberedPiece } from './types';
import { validate } from './validation';

export interface Summary {
  readonly pieceCount: number;
  readonly refCount: number;
  readonly boards: number;
  readonly backBoards: number;
  readonly edgeMeters: number;
  /** Budget matière estimé (panneaux + fond + chant), en euros. */
  readonly cost: number;
}

export interface Project {
  readonly layout: Layout;
  readonly doors: readonly DoorGeom[];
  readonly parts: readonly Part[];
  readonly rods: readonly Rod[];
  readonly pieces: readonly NumberedPiece[];
  readonly packs: readonly PackingResult[];
  readonly hardware: readonly HardwareItem[];
  readonly steps: readonly AssemblyStep[];
  readonly issues: readonly Issue[];
  readonly summary: Summary;
}

export function summarize(cfg: ClosetConfig, pieces: readonly NumberedPiece[], packs: readonly PackingResult[]): Summary {
  const boardsOf = (material: 'panneau' | 'fond') =>
    packs.filter((p) => p.material === material).reduce((s, p) => s + p.boards.length + p.oversize.length, 0);
  const boards = boardsOf('panneau');
  const backBoards = boardsOf('fond');
  const edgeMeters = edgeBandingMeters(pieces) * 1.1;
  return {
    pieceCount: pieces.reduce((s, p) => s + p.qty, 0),
    refCount: pieces.length,
    boards,
    backBoards,
    edgeMeters,
    cost: boards * cfg.prices.board + backBoards * cfg.prices.backBoard + edgeMeters * cfg.prices.edge,
  };
}

/** Calcule l'ensemble des sorties (plan, débit, découpe, quincaillerie, montage) d'une configuration. */
export function computeProject(cfg: ClosetConfig): Project {
  const layout = computeLayout(cfg);
  const doors = computeDoors(cfg, layout);
  const pieces = computeCutList(cfg, layout, doors);
  const packs = [
    packPieces(pieces, 'panneau', cfg.thickness, cfg.board),
    ...(cfg.backThickness > 0 ? [packPieces(pieces, 'fond', cfg.backThickness, cfg.backBoard)] : []),
  ];
  return {
    layout,
    doors,
    parts: computeParts(cfg, layout, doors),
    rods: computeRods(cfg, layout),
    pieces,
    packs,
    hardware: computeHardware(cfg, layout, doors, pieces),
    steps: computeAssembly(cfg, layout, doors, pieces),
    issues: validate(cfg, layout, doors, packs),
    summary: summarize(cfg, pieces, packs),
  };
}
