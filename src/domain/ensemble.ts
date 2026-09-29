import { defaultConfig, newColumn, newId, parseConfig } from './defaults';
import { maxHeight } from './geometry';
import type { ClosetConfig, Ensemble } from './types';

/**
 * Réglages communs à tous les caissons d'un ensemble : même matière, pour un calepinage global.
 * Le socle est commun aux seuls caissons posés au sol (bas alignés) ; un caisson suspendu n'en a pas.
 */
export const SHARED_KEYS = ['thickness', 'backThickness', 'doorGap', 'board', 'backBoard', 'prices'] as const;

export type SharedKey = (typeof SHARED_KEYS)[number];
export type SharedSettings = Pick<ClosetConfig, SharedKey>;

export const isSharedKey = (key: string): key is SharedKey => (SHARED_KEYS as readonly string[]).includes(key);

export const sharedOf = (cfg: ClosetConfig): SharedSettings =>
  Object.fromEntries(SHARED_KEYS.map((k) => [k, cfg[k]])) as SharedSettings;

export const caissonLabel = (cfg: ClosetConfig, index: number): string => cfg.name.trim() || `Caisson ${index + 1}`;

/** Repère court utilisé dans la liste de débit (« C1 col. 2 »). */
export const caissonTag = (index: number): string => `C${index + 1}`;

export const singleEnsemble = (cfg: ClosetConfig): Ensemble => ({ name: cfg.name, caissons: [cfg] });

// --- Encombrement ---

export interface Placement {
  /** Abscisse du bord gauche extérieur, depuis la gauche de l'ensemble. */
  readonly x: number;
  /** Hauteur du dessous du caisson depuis le sol (caisson suspendu). */
  readonly y: number;
  /** Retrait de la façade par rapport à la façade la plus avancée (caissons alignés au mur du fond). */
  readonly z: number;
}

export const ensembleWidth = (e: Ensemble): number => e.caissons.reduce((s, c) => s + c.width, 0);
export const isSuspended = (cfg: ClosetConfig): boolean => cfg.elevation > 0;
export const ensembleHeight = (e: Ensemble): number => Math.max(0, ...e.caissons.map((c) => c.elevation + maxHeight(c)));
export const ensembleDepth = (e: Ensemble): number => Math.max(0, ...e.caissons.map((c) => c.depth));

export function placements(e: Ensemble): Placement[] {
  const depth = ensembleDepth(e);
  const starts = e.caissons.reduce<number[]>((acc, _c, i) => [...acc, i === 0 ? 0 : acc[i - 1] + e.caissons[i - 1].width], []);
  return e.caissons.map((c, i) => ({ x: starts[i], y: c.elevation, z: depth - c.depth }));
}

// --- Édition (fonctions pures) ---

const withCaissons = (e: Ensemble, caissons: readonly ClosetConfig[]): Ensemble => ({ ...e, caissons });

export const replaceCaisson = (e: Ensemble, index: number, cfg: ClosetConfig): Ensemble =>
  e.caissons[index] === cfg ? e : withCaissons(e, e.caissons.map((c, i) => (i === index ? cfg : c)));

/** Applique un réglage commun à tous les caissons. */
export const applyShared = (e: Ensemble, patch: Partial<SharedSettings>): Ensemble =>
  withCaissons(e, e.caissons.map((c) => ({ ...c, ...patch })));

/** Socle des caissons posés au sol, hors celui d'index `except`. */
const floorPlinth = (caissons: readonly ClosetConfig[], except: number): number | undefined =>
  caissons.find((c, i) => i !== except && !isSuspended(c))?.plinth;

/** Pose au sol ou suspension : un caisson suspendu n'a pas de socle, un caisson au sol reprend celui des autres. */
function settle(e: Ensemble, index: number, prev: ClosetConfig, next: ClosetConfig): ClosetConfig {
  if (isSuspended(next)) return next.plinth === 0 ? next : { ...next, plinth: 0 };
  if (isSuspended(prev)) return { ...next, plinth: floorPlinth(e.caissons, index) ?? next.plinth };
  return next;
}

/** Met à jour un caisson ; les réglages communs modifiés (et le socle) sont propagés aux autres. */
export function updateCaisson(e: Ensemble, index: number, raw: ClosetConfig): Ensemble {
  const prev = e.caissons[index];
  if (!prev || prev === raw) return e;
  const next = settle(e, index, prev, raw);
  const shared = SHARED_KEYS.filter((k) => prev[k] !== next[k]);
  const patch = Object.fromEntries(shared.map((k) => [k, next[k]])) as Partial<SharedSettings>;
  const plinthChanged = !isSuspended(prev) && !isSuspended(next) && prev.plinth !== next.plinth;
  if (shared.length === 0 && !plinthChanged) return replaceCaisson(e, index, next);
  return withCaissons(e, e.caissons.map((c, i) => {
    if (i === index) return next;
    const withShared = { ...c, ...patch };
    return plinthChanged && !isSuspended(c) ? { ...withShared, plinth: next.plinth } : withShared;
  }));
}

export function addCaisson(e: Ensemble): Ensemble {
  const last = e.caissons.at(-1) ?? defaultConfig();
  const cfg: ClosetConfig = {
    ...last,
    id: newId(),
    name: `Caisson ${e.caissons.length + 1}`,
    shape: 'droit',
    width: 600,
    elevation: 0,
    plinth: floorPlinth(e.caissons, -1) ?? last.plinth,
    columns: [newColumn({ doors: 1 })],
  };
  return withCaissons(e, [...e.caissons, cfg]);
}

export function duplicateCaisson(e: Ensemble, index: number): Ensemble {
  const src = e.caissons[index];
  if (!src) return e;
  const copy: ClosetConfig = {
    ...src,
    id: newId(),
    name: `${caissonLabel(src, index)} (copie)`,
    columns: src.columns.map((c) => ({ ...c, id: newId() })),
  };
  return withCaissons(e, [...e.caissons.slice(0, index + 1), copy, ...e.caissons.slice(index + 1)]);
}

export const removeCaisson = (e: Ensemble, index: number): Ensemble =>
  e.caissons.length <= 1 ? e : withCaissons(e, e.caissons.filter((_, i) => i !== index));

export function moveCaisson(e: Ensemble, index: number, delta: number): Ensemble {
  const to = index + delta;
  if (index < 0 || index >= e.caissons.length || to < 0 || to >= e.caissons.length) return e;
  return withCaissons(e, e.caissons.map((c, i) => (i === index ? e.caissons[to] : i === to ? e.caissons[index] : c)));
}

// --- Lecture sécurisée ---

/** Lit un ensemble, ou un ancien fichier à caisson unique. Les réglages communs sont harmonisés sur le premier caisson. */
export function parseEnsemble(raw: unknown): Ensemble | null {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  if (!Array.isArray(o.caissons)) {
    const single = parseConfig(raw);
    return single ? singleEnsemble(single) : null;
  }
  const parsed = o.caissons.map(parseConfig).filter((c): c is ClosetConfig => c !== null);
  if (parsed.length === 0) return null;
  const seen = new Set<string>();
  const plinth = floorPlinth(parsed, -1) ?? 0;
  const caissons = parsed.map((c) => {
    const id = seen.has(c.id) ? newId() : c.id;
    seen.add(id);
    return { ...c, ...sharedOf(parsed[0]), id, plinth: isSuspended(c) ? 0 : plinth };
  });
  return { name: typeof o.name === 'string' ? o.name : caissons[0].name, caissons };
}
