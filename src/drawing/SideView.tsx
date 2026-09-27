import { bottomY, maxHeight, type Layout } from '../domain/geometry';
import type { ClosetConfig } from '../domain/types';
import { HDim, VDim } from './Dimension';

interface Props {
  readonly cfg: ClosetConfig;
  readonly layout: Layout;
}

/** Coupe de côté : l'avant est à gauche, le mur à droite. */
export function SideView({ cfg, layout }: Props) {
  const D = cfg.depth;
  const H = maxHeight(cfg);
  const e = cfg.thickness;
  const d = layout.caissonDepth;
  const u = Math.max(D * 2.2, H) / 100;
  const fs = 2.3 * u;
  const pad = { l: 10 * u, r: 6 * u, t: 8 * u, b: 9 * u };
  const Y = (y: number) => H - y;
  const by = bottomY(cfg);

  return (
    <svg className="plan plan--side" viewBox={`${-pad.l} ${-pad.t} ${D + pad.l + pad.r} ${H + pad.t + pad.b}`} role="img" aria-label="Vue de côté">
      <line className="plan__floor" x1={-pad.l / 2} y1={Y(0)} x2={D + pad.r} y2={Y(0)} />
      <line className="plan__wall" x1={D} y1={Y(0)} x2={D} y2={Y(H) - 4 * u} />
      <rect className="plan__part plan__part--side-face" x={0} y={Y(H)} width={d} height={H} />
      {cfg.backThickness > 0 && <rect className="plan__part plan__part--back" x={d} y={Y(H)} width={cfg.backThickness} height={H} />}
      <rect className="plan__part" x={0} y={Y(by)} width={d} height={e} />
      <rect className="plan__part" x={0} y={Y(H)} width={d} height={e} />
      {cfg.plinth > 0 && (
        <>
          <rect className="plan__part plan__part--plinth" x={0} y={Y(cfg.plinth)} width={e} height={cfg.plinth} />
          <rect className="plan__part plan__part--plinth" x={d - e} y={Y(cfg.plinth)} width={e} height={cfg.plinth} />
        </>
      )}
      <HDim x1={0} x2={D} y={Y(0) + 6 * u} label={`${D}`} fs={fs} />
      <HDim x1={0} x2={d} y={-3 * u} label={`caisson ${d}`} fs={fs * 0.8} />
      <VDim y1={Y(0)} y2={Y(H)} x={-5 * u} label={`${H}`} fs={fs} />
      <text className="plan__label" x={-1 * u} y={Y(0) + 3 * u} fontSize={fs * 0.75} textAnchor="end">avant</text>
      <text className="plan__label" x={D + u} y={Y(H) - 1.5 * u} fontSize={fs * 0.75} textAnchor="middle">mur</text>
    </svg>
  );
}
