import { useId, type KeyboardEvent } from 'react';
import { caissonTag } from '../domain/ensemble';
import type { EnsembleProject, PlacedCaisson } from '../domain/ensembleProject';
import { heightAt, maxHeight } from '../domain/geometry';
import type { Pt } from '../domain/parts';
import type { DoorGeom } from '../domain/types';
import { DoorOverlay } from './DoorOverlay';
import { HDim, VDim } from './Dimension';
import { makeFrameFor, type Frame } from './frame';

const shiftPoly = (poly: readonly Pt[], dx: number, dy: number): Pt[] => poly.map(([x, y]) => [x + dx, y + dy] as Pt);
const shiftDoor = (d: DoorGeom, dx: number, dy: number): DoorGeom => ({
  ...d, x0: d.x0 + dx, x1: d.x1 + dx, y0: d.y0 + dy, topLeft: d.topLeft + dy, topRight: d.topRight + dy,
});
/** Hauteur du dessus du caisson depuis le sol. */
const topOf = (c: PlacedCaisson): number => c.y + maxHeight(c.cfg);

/** Silhouette avant du caisson (trapèze si sous-pente), pour la trame de retrait. */
const outline = (c: PlacedCaisson): Pt[] => [
  [c.x, c.y],
  [c.x + c.cfg.width, c.y],
  [c.x + c.cfg.width, c.y + heightAt(c.cfg, c.cfg.width)],
  [c.x, c.y + heightAt(c.cfg, 0)],
];

/** Props communes d'un caisson cliquable (accessible au clavier). */
function pickProps(onPick: ((index: number) => void) | undefined, index: number, active: boolean, label: string) {
  if (!onPick) return {};
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': active,
    'aria-label': label,
    onClick: () => onPick(index),
    onKeyDown: (ev: KeyboardEvent<SVGGElement>) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        onPick(index);
      }
    },
  };
}

const unitClass = (recessed: boolean, active: boolean, clickable: boolean): string =>
  ['ensemble__unit', recessed && 'ensemble__unit--recessed', active && 'is-active', clickable && 'is-clickable']
    .filter(Boolean)
    .join(' ');

interface FrontProps {
  readonly project: EnsembleProject;
  readonly showDoors?: boolean;
  readonly thumbnail?: boolean;
  readonly activeIndex?: number;
  readonly onPick?: (index: number) => void;
}

interface UnitProps {
  readonly caisson: PlacedCaisson;
  readonly frame: Frame;
  readonly hatchId: string;
  readonly showDoors: boolean;
  readonly active: boolean;
  readonly onPick?: (index: number) => void;
}

function CaissonFrontUnit({ caisson: c, frame, hatchId, showDoors, active, onPick }: UnitProps) {
  const { points, Y } = frame;
  const dx = c.x;
  const H = maxHeight(c.cfg);
  const visible = c.project.parts.filter((p) => p.kind !== 'back' && p.kind !== 'door');
  const recessed = c.z > 0;
  const label = `${caissonTag(c.index)} ${c.label}`;

  return (
    <g className={unitClass(recessed, active, Boolean(onPick))} {...pickProps(onPick, c.index, active, label)}>
      <rect className="ensemble__hit" x={dx} y={Y(c.y + H)} width={c.cfg.width} height={H} fill="transparent" />
      {visible.map((p) => (
        <polygon key={p.key} className={`plan__part plan__part--${p.kind}`} points={points(shiftPoly(p.poly, dx, c.y))} />
      ))}
      {recessed && (
        <polygon className="ensemble__recess-overlay" points={points(outline(c))} fill={`url(#${hatchId})`} pointerEvents="none" />
      )}
      {showDoors && <DoorOverlay frame={frame} doors={c.project.doors.map((d) => shiftDoor(d, dx, c.y))} />}
    </g>
  );
}

/** Vue de face cotée de tout l'ensemble : chaque caisson décalé de son abscisse, portes en option. */
export function EnsembleFront({ project, showDoors = false, thumbnail = false, activeIndex, onPick }: FrontProps) {
  const hatchId = useId();
  const pad = thumbnail ? { l: 3, r: 3, t: 3, b: 3 } : { l: 14, r: 12 + 6 * project.caissons.length, t: 18, b: 15 };
  const f = makeFrameFor(project.width, project.height, pad);
  const { u, fs, Y } = f;
  const recessed = project.caissons.filter((c) => c.z > 0);
  const plinth = project.caissons.find((c) => c.y === 0)?.cfg.plinth ?? 0;
  const hung = project.caissons.filter((c) => c.y > 0);

  return (
    <svg className={`plan ensemble${thumbnail ? ' plan--thumb' : ''}`} viewBox={f.viewBox} role="img" aria-label="Vue de face cotée de l'ensemble">
      {recessed.length > 0 && (
        <defs>
          <pattern id={hatchId} width={3 * u} height={3 * u} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={3 * u} className="ensemble__hatch-line" />
          </pattern>
        </defs>
      )}
      <line className="plan__floor" x1={-4 * u} y1={Y(0)} x2={project.width + 4 * u} y2={Y(0)} />

      {project.caissons.map((c) => (
        <CaissonFrontUnit key={c.index} caisson={c} frame={f} hatchId={hatchId} showDoors={showDoors} active={activeIndex === c.index} onPick={onPick} />
      ))}

      {!thumbnail && (
        <>
          {project.caissons.map((c) => (
            <text
              key={`tag-${c.index}`}
              className="plan__label ensemble__tag"
              x={c.x + c.cfg.width / 2}
              y={Y(topOf(c)) - 5 * u}
              fontSize={fs * 1.1}
              textAnchor="middle"
            >
              {caissonTag(c.index)}
            </text>
          ))}
          {project.caissons.map((c) => (
            <text
              key={`label-${c.index}`}
              className="plan__label"
              x={c.x + c.cfg.width / 2}
              y={Y(topOf(c)) - 2 * u}
              fontSize={fs * 0.85}
              textAnchor="middle"
            >
              {c.label}
            </text>
          ))}
          {recessed.map((c) => (
            <text
              key={`recess-${c.index}`}
              className="plan__label ensemble__recess-label"
              x={c.x + c.cfg.width / 2}
              y={Y(topOf(c)) + 6 * u}
              fontSize={fs * 0.85}
              textAnchor="middle"
            >
              retrait {c.z}
            </text>
          ))}
          {project.caissons.map((c) => (
            <g key={`w-${c.index}`} className={activeIndex === c.index ? 'dim--accent' : undefined}>
              <HDim x1={c.x} x2={c.x + c.cfg.width} y={Y(0) + 6 * u} label={`${c.cfg.width}`} fs={fs} />
            </g>
          ))}
          <HDim x1={0} x2={project.width} y={Y(0) + 11 * u} label={`total ${project.width}`} fs={fs} />
          {project.caissons.map((c, i) => (
            <VDim key={`h-${c.index}`} y1={Y(c.y)} y2={Y(topOf(c))} x={project.width + (5 + 6 * i) * u} label={`${maxHeight(c.cfg)}`} fs={fs * 0.85} />
          ))}
          {hung.map((c) => (
            <g key={`pose-${c.index}`} className="dim--accent">
              <VDim y1={Y(0)} y2={Y(c.y)} x={c.x + c.cfg.width / 2} label={`pose ${c.y}`} fs={fs * 0.85} />
            </g>
          ))}
          {plinth > 0 && <VDim y1={Y(0)} y2={Y(plinth)} x={-2.5 * u} label={`${plinth}`} fs={fs * 0.7} />}
        </>
      )}
    </svg>
  );
}

interface TopProps {
  readonly project: EnsembleProject;
  readonly activeIndex?: number;
  readonly onPick?: (index: number) => void;
}

/** Vue de dessus cotée : le mur du fond en haut, chaque caisson aligné dessus. */
export function EnsembleTop({ project, activeIndex, onPick }: TopProps) {
  const W = project.width;
  const D = project.depth;
  const pad = { l: 14, r: 10 + 8 * project.caissons.length, t: 10, b: 20 };
  const u = Math.max(W, D) / 100;
  const fs = 2.3 * u;
  const viewBox = `${-pad.l * u} ${-pad.t * u} ${W + (pad.l + pad.r) * u} ${D + (pad.t + pad.b) * u}`;

  return (
    <svg className="plan ensemble ensemble--top" viewBox={viewBox} role="img" aria-label="Vue de dessus cotée de l'ensemble">
      <line className="plan__wall" x1={-4 * u} y1={0} x2={W + 4 * u} y2={0} />
      <text className="plan__label" x={-6 * u} y={3 * u} fontSize={fs * 0.8} textAnchor="end">mur</text>
      <line className="plan__floor ensemble__facade" x1={-4 * u} y1={D} x2={W + 4 * u} y2={D} />
      <text className="plan__label" x={-6 * u} y={D + 3 * u} fontSize={fs * 0.8} textAnchor="end">façade</text>

      {project.caissons.map((c, i) => {
        const recessed = c.z > 0;
        const active = activeIndex === c.index;
        const label = `${caissonTag(c.index)} ${c.label}`;
        const dimX = W + (6 + 8 * i) * u;
        return (
          <g key={c.index} className={unitClass(recessed, active, Boolean(onPick))} {...pickProps(onPick, c.index, active, label)}>
            <rect className="plan__part plan__part--top" x={c.x} y={0} width={c.cfg.width} height={c.cfg.depth} />
            <text className="plan__label" x={c.x + c.cfg.width / 2} y={c.cfg.depth / 2} fontSize={fs * 1.1} textAnchor="middle">
              {caissonTag(c.index)}
            </text>
            <HDim x1={c.x} x2={c.x + c.cfg.width} y={D + 8 * u} label={`${c.cfg.width}`} fs={fs} />
            <VDim y1={0} y2={c.cfg.depth} x={dimX} label={`${c.cfg.depth}`} fs={fs * 0.8} />
            {recessed && (
              <g className="dim--accent">
                <VDim y1={c.cfg.depth} y2={D} x={dimX} label={`retrait ${c.z}`} fs={fs * 0.7} />
              </g>
            )}
          </g>
        );
      })}
      <HDim x1={0} x2={W} y={D + 14 * u} label={`total ${W}`} fs={fs} />
    </svg>
  );
}
