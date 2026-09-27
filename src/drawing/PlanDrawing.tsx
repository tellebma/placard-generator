import { bottomY, rightHeight } from '../domain/geometry';
import type { Project } from '../domain/project';
import type { ClosetConfig } from '../domain/types';
import { HDim, VDim } from './Dimension';
import { makeFrame } from './frame';
import { DoorOverlay } from './DoorOverlay';

interface Props {
  readonly cfg: ClosetConfig;
  readonly project: Project;
  readonly showDoors?: boolean;
  /** Miniature sans cotes (cartes de modèles). */
  readonly thumbnail?: boolean;
}

/** Vue de face statique et cotée : sert au dossier de fabrication, à l'impression et aux miniatures. */
export function PlanDrawing({ cfg, project, showDoors = false, thumbnail = false }: Props) {
  const f = thumbnail ? makeFrame(cfg, { l: 3, r: 3, t: 3, b: 3 }) : makeFrame(cfg);
  const { W, u, fs, Y } = f;
  const by = bottomY(cfg);
  const visible = project.parts.filter((p) => p.kind !== 'back' && p.kind !== 'door');

  return (
    <svg className={`plan${thumbnail ? ' plan--thumb' : ''}`} viewBox={f.viewBox} role="img" aria-label="Vue de face cotée">
      <line className="plan__floor" x1={-4 * u} y1={Y(0)} x2={W + 4 * u} y2={Y(0)} />
      {visible.map((p) => (
        <polygon key={p.key} className={`plan__part plan__part--${p.kind}`} points={f.points(p.poly)} />
      ))}
      {project.rods.map((r) => (
        <line key={r.column} className="plan__rod" x1={r.x0 + u} y1={Y(r.y)} x2={r.x1 - u} y2={Y(r.y)} />
      ))}
      {showDoors && <DoorOverlay frame={f} doors={project.doors} />}

      {!thumbnail && (
        <>
          {project.layout.columns.map((col) =>
            col.config.shelves.map((h, i) => (
              <text key={`${col.id}-${i}`} className="plan__label" x={col.x + u} y={Y(by + h + cfg.thickness) - 0.6 * u} fontSize={fs * 0.75}>
                {h}
              </text>
            )),
          )}
          {project.rods.map((r) => (
            <text key={r.column} className="plan__label" x={(r.x0 + r.x1) / 2} y={Y(r.y) + 2.8 * u} fontSize={fs * 0.75} textAnchor="middle">
              tringle {Math.round(r.y - by)}
            </text>
          ))}
          <HDim x1={0} x2={W} y={Y(0) + 6 * u} label={`${W}`} fs={fs} />
          <VDim y1={Y(0)} y2={Y(cfg.heightLeft)} x={-6 * u} label={`${cfg.heightLeft}`} fs={fs} />
          <VDim y1={Y(0)} y2={Y(rightHeight(cfg))} x={W + 8 * u} label={`${rightHeight(cfg)}`} fs={fs} />
          {cfg.plinth > 0 && <VDim y1={Y(0)} y2={Y(cfg.plinth)} x={-2.5 * u} label={`${cfg.plinth}`} fs={fs * 0.7} />}
          {project.layout.columns.map((col) => (
            <HDim key={col.id} x1={col.x} x2={col.x + col.width} y={-4 * u} label={`${Math.round(col.width)}`} fs={fs} />
          ))}
        </>
      )}
    </svg>
  );
}
