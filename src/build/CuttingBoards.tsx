import { useState } from 'react';
import type { PackedBoard, PackingResult } from '../domain/packing';
import type { NumberedPiece } from '../domain/types';

interface Props {
  readonly packs: readonly PackingResult[];
  readonly pieces: readonly NumberedPiece[];
}

export function CuttingBoards({ packs, pieces }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="stack">
      {packs.map((pack) => {
        const refs = pieces.filter((p) => p.material === pack.material);
        return (
          <div key={`${pack.material}-${pack.thickness}`} className="card">
            <div className="card__title">
              <h3>
                {pack.material === 'fond' ? 'Fond' : 'Panneaux'} {pack.thickness} mm
                <span className="text-2"> · {pack.boards.length} × {pack.spec.length} × {pack.spec.width}</span>
              </h3>
              <span className="meter" title="Matière utilisée">
                <span className="meter__bar"><span style={{ width: `${Math.round(pack.usage * 100)}%` }} /></span>
                <span className="small mono">{Math.round(pack.usage * 100)} % utilisé</span>
              </span>
            </div>
            {pack.oversize.length > 0 && (
              <p className="callout callout--warning">Hors format, non placées : {pack.oversize.join(', ')}. Prévoir un panneau plus grand ou une jonction.</p>
            )}
            <div className="legend" onMouseLeave={() => setHover(null)}>
              {refs.map((p) => (
                <button
                  key={p.ref}
                  type="button"
                  className={`legend__item${hover === p.ref ? ' is-hover' : ''}`}
                  onMouseEnter={() => setHover(p.ref)}
                  onFocus={() => setHover(p.ref)}
                  onBlur={() => setHover(null)}
                >
                  <span className="ref">{p.ref}</span> {p.name} <span className="text-3 mono">{p.length}×{p.width}</span>
                  {p.qty > 1 && <span className="text-3"> ×{p.qty}</span>}
                </button>
              ))}
            </div>
            <div className="boards">
              {pack.boards.map((b, i) => (
                <Board key={i} board={b} index={i} pack={pack} hover={hover} onHover={setHover} />
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-3 small">
        Découpe en bandes : couper d'abord sur toute la longueur du panneau (bandes), puis recouper chaque bande. Le trait de scie est déjà compté.
      </p>
    </div>
  );
}

interface BoardProps {
  readonly board: PackedBoard;
  readonly index: number;
  readonly pack: PackingResult;
  readonly hover: string | null;
  readonly onHover: (ref: string | null) => void;
}

function Board({ board, index, pack, hover, onHover }: BoardProps) {
  const { length: L, width: Wd } = pack.spec;
  const fs = Math.max(L, Wd) / 42;
  return (
    <figure className="board">
      <svg viewBox={`-12 -12 ${L + 24} ${Wd + 24}`} role="img" aria-label={`Panneau ${index + 1}`}>
        <rect className="board__raw" x={0} y={0} width={L} height={Wd} />
        {board.placements.map((p, i) => {
          const dims = p.rotated ? `${p.w}×${p.l}` : `${p.l}×${p.w}`;
          const showDims = p.l > fs * 7 && p.w > fs * 2.6;
          const showRef = p.l > fs * 1.6 && p.w > fs * 1.1;
          return (
            <g
              key={i}
              className={`board__piece${hover === p.ref ? ' is-hover' : ''}${hover && hover !== p.ref ? ' is-dim' : ''}`}
              onMouseEnter={() => onHover(p.ref)}
              onMouseLeave={() => onHover(null)}
            >
              <rect x={p.x} y={p.y} width={p.l} height={p.w} />
              {showRef && (
                <text x={p.x + p.l / 2} y={p.y + p.w / 2} fontSize={Math.min(fs, p.w * 0.4)} textAnchor="middle" dominantBaseline="central">
                  <tspan className="board__ref">{p.ref}</tspan>
                  {showDims && <tspan className="board__dims" dx={fs * 0.4}>{dims}</tspan>}
                </text>
              )}
              <title>{`${p.ref} · ${dims} mm`}</title>
            </g>
          );
        })}
      </svg>
      <figcaption>Panneau {index + 1}</figcaption>
    </figure>
  );
}
