import { maxHeight } from '../domain/geometry';
import type { Pt } from '../domain/parts';
import type { ClosetConfig } from '../domain/types';

/** Repère de dessin : millimètres, origine au sol à gauche, y vers le haut. */
export interface Frame {
  readonly W: number;
  readonly H: number;
  /** Unité graphique (1 % de la plus grande dimension). */
  readonly u: number;
  /** Taille de police des cotes. */
  readonly fs: number;
  readonly Y: (y: number) => number;
  readonly points: (poly: readonly Pt[]) => string;
  readonly viewBox: string;
}

export function makeFrame(cfg: ClosetConfig, pad = { l: 12, r: 12, t: 10, b: 9 }): Frame {
  const W = cfg.width;
  const H = maxHeight(cfg);
  const u = Math.max(W, H) / 100;
  const Y = (y: number) => H - y;
  return {
    W,
    H,
    u,
    fs: 2.3 * u,
    Y,
    points: (poly) => poly.map(([x, y]) => `${x},${Y(y)}`).join(' '),
    viewBox: `${-pad.l * u} ${-pad.t * u} ${W + (pad.l + pad.r) * u} ${H + (pad.t + pad.b) * u}`,
  };
}
