import { useRef, useState } from 'react';
import { addShelf, moveSeparation, setShelf, snap, updateColumn } from '../domain/edit';
import { bottomY, columnInnerHeight, innerTopAt, rightHeight, type ColumnLayout } from '../domain/geometry';
import type { Part } from '../domain/parts';
import type { Project } from '../domain/project';
import type { ClosetConfig } from '../domain/types';
import { HDim, VDim } from '../drawing/Dimension';
import { DoorOverlay } from '../drawing/DoorOverlay';
import { makeFrame, type Frame } from '../drawing/frame';
import { NONE, selectedColumnId, type Selection } from '../state/selection';
import type { History } from '../state/useHistory';

interface Props {
  readonly project: Project;
  readonly history: History<ClosetConfig>;
  readonly selection: Selection;
  readonly onSelect: (s: Selection) => void;
  readonly showDoors: boolean;
}

type Drag =
  | { readonly kind: 'shelf'; readonly col: string; readonly index: number; readonly startY: number; readonly startH: number; readonly max: number; readonly start: ClosetConfig }
  | { readonly kind: 'rod'; readonly col: string; readonly startY: number; readonly startH: number; readonly max: number; readonly start: ClosetConfig }
  | { readonly kind: 'sep'; readonly sep: number; readonly startX: number; readonly startSep: number; readonly startWidth: number; readonly start: ClosetConfig };

const ROD_CLEARANCE = 40;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Espaces libres d'une colonne, du bas vers le haut (bornes en hauteur depuis le sol). */
function compartments(cfg: ClosetConfig, col: ColumnLayout): { y0: number; y1: number }[] {
  const by = bottomY(cfg);
  const top = by + columnInnerHeight(cfg, col);
  const sorted = [...col.config.shelves].sort((a, b) => a - b);
  const bounds = sorted.reduce<{ spans: { y0: number; y1: number }[]; prev: number }>(
    (acc, h) => ({ spans: [...acc.spans, { y0: acc.prev, y1: by + h }], prev: by + h + cfg.thickness }),
    { spans: [], prev: by },
  );
  return [...bounds.spans, { y0: bounds.prev, y1: top }].filter((s) => s.y1 - s.y0 > 1);
}

export function EditorCanvas({ project, history, selection, onSelect, showDoors }: Props) {
  const cfg = history.value;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const f = makeFrame(cfg, { l: 12, r: 12, t: 11, b: 10 });
  const { W, u, fs, Y } = f;
  const e = cfg.thickness;
  const by = bottomY(cfg);
  const selCol = selectedColumnId(selection);
  const errorCols = new Set(project.issues.filter((i) => i.level === 'error' && i.column !== undefined).map((i) => i.column));

  const toMm = (clientX: number, clientY: number) => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: f.H - p.y };
  };

  const beginDrag = (ev: React.PointerEvent, next: (p: { x: number; y: number }) => Drag) => {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    const p = toMm(ev.clientX, ev.clientY);
    if (!p) return;
    svgRef.current?.setPointerCapture(ev.pointerId);
    setDrag(next(p));
  };

  const startShelf = (ev: React.PointerEvent, col: ColumnLayout, index: number) => {
    onSelect({ kind: 'shelf', col: col.id, index });
    beginDrag(ev, (p) => ({
      kind: 'shelf', col: col.id, index, startY: p.y, startH: col.config.shelves[index], max: columnInnerHeight(cfg, col) - e, start: cfg,
    }));
  };

  const startRod = (ev: React.PointerEvent, col: ColumnLayout) => {
    onSelect({ kind: 'rod', col: col.id });
    beginDrag(ev, (p) => ({
      kind: 'rod', col: col.id, startY: p.y, startH: col.config.rodHeight ?? 0, max: columnInnerHeight(cfg, col) - ROD_CLEARANCE, start: cfg,
    }));
  };

  const startSep = (ev: React.PointerEvent, sep: number) => {
    beginDrag(ev, (p) => ({
      kind: 'sep', sep, startX: p.x, startSep: project.layout.separations[sep], startWidth: project.layout.columns[sep].width, start: cfg,
    }));
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (!drag) return;
    const p = toMm(ev.clientX, ev.clientY);
    if (!p) return;
    const step = ev.shiftKey ? 1 : 5;
    if (drag.kind === 'sep') {
      const width = snap(drag.startWidth + p.x - drag.startX, step);
      history.set(moveSeparation(drag.start, drag.sep, drag.startSep + width - drag.startWidth), { transient: true });
      return;
    }
    const h = clamp(snap(drag.startH + p.y - drag.startY, step), 1, drag.max);
    const next = drag.kind === 'shelf'
      ? setShelf(drag.start, drag.col, drag.index, h)
      : updateColumn(drag.start, drag.col, { rodHeight: h });
    history.set(next, { transient: true });
  };

  const endDrag = () => {
    if (!drag) return;
    history.commitFrom(drag.start);
    setDrag(null);
  };

  const onColumnDoubleClick = (ev: React.MouseEvent, col: ColumnLayout) => {
    const p = toMm(ev.clientX, ev.clientY);
    if (!p) return;
    const h = clamp(snap(p.y - by - e / 2, 5), 1, columnInnerHeight(cfg, col) - e);
    history.set(addShelf(cfg, col.id, h));
    onSelect({ kind: 'shelf', col: col.id, index: col.config.shelves.length });
  };

  const shelfPart = (p: Part) => project.layout.columns[p.column ?? 0];
  const isSelectedShelf = (p: Part) =>
    selection.kind === 'shelf' && selection.col === shelfPart(p).id && selection.index === p.shelf;

  return (
    <svg
      ref={svgRef}
      className={`editor${drag ? ` is-dragging is-dragging--${drag.kind}` : ''}`}
      viewBox={f.viewBox}
      role="application"
      aria-label="Plan de face interactif"
      onPointerDown={() => onSelect(NONE)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <line className="plan__floor" x1={-6 * u} y1={Y(0)} x2={W + 6 * u} y2={Y(0)} />

      {project.layout.columns.map((col) => (
        <polygon
          key={col.id}
          className={`zone${col.id === selCol ? ' is-selected' : ''}${errorCols.has(col.index) ? ' is-error' : ''}`}
          points={f.points([
            [col.x, by],
            [col.x + col.width, by],
            [col.x + col.width, innerTopAt(cfg, col.x + col.width)],
            [col.x, innerTopAt(cfg, col.x)],
          ])}
          onPointerDown={(ev) => {
            ev.stopPropagation();
            onSelect({ kind: 'column', col: col.id });
          }}
          onDoubleClick={(ev) => onColumnDoubleClick(ev, col)}
        />
      ))}

      {project.parts
        .filter((p) => p.kind !== 'back' && p.kind !== 'door' && p.kind !== 'shelf')
        .map((p) =>
          p.kind === 'separation' ? (
            <polygon key={p.key} className="plan__part part-sep" points={f.points(p.poly)} onPointerDown={(ev) => startSep(ev, p.separation ?? 0)}>
              <title>Glisser pour redimensionner les colonnes</title>
            </polygon>
          ) : (
            <polygon key={p.key} className={`plan__part plan__part--${p.kind}`} points={f.points(p.poly)} pointerEvents="none" />
          ),
        )}

      {project.parts
        .filter((p) => p.kind === 'shelf')
        .map((p) => {
          const col = shelfPart(p);
          const h = col.config.shelves[p.shelf ?? 0];
          return (
            <g key={p.key} className={`shelf${isSelectedShelf(p) ? ' is-selected' : ''}`} onPointerDown={(ev) => startShelf(ev, col, p.shelf ?? 0)}>
              <polygon className="plan__part plan__part--shelf" points={f.points(p.poly)} />
              <rect className="hit" x={col.x} y={Y(by + h + e) - 1.2 * u} width={col.width} height={e + 2.4 * u} />
              <text className="shelf__label" x={col.x + 3.5 * u} y={Y(by + h + e) - 0.7 * u} fontSize={fs * 0.72}>{h}</text>
            </g>
          );
        })}

      {project.rods.map((r) => {
        const col = project.layout.columns[r.column];
        const selected = selection.kind === 'rod' && selection.col === col.id;
        return (
          <g key={r.column} className={`rod${selected ? ' is-selected' : ''}`} onPointerDown={(ev) => startRod(ev, col)}>
            <line className="rod__bar" x1={r.x0 + u} y1={Y(r.y)} x2={r.x1 - u} y2={Y(r.y)} />
            <line className="hit" x1={r.x0} y1={Y(r.y)} x2={r.x1} y2={Y(r.y)} strokeWidth={3 * u} />
            <text className="shelf__label" x={(r.x0 + r.x1) / 2} y={Y(r.y) + 2.8 * u} fontSize={fs * 0.72} textAnchor="middle">
              tringle {col.config.rodHeight}
            </text>
          </g>
        );
      })}

      {showDoors && <DoorOverlay frame={f} doors={project.doors} />}

      <Dimensions cfg={cfg} project={project} frame={f} selCol={selCol} />
    </svg>
  );
}

function Dimensions({ cfg, project, frame, selCol }: { cfg: ClosetConfig; project: Project; frame: Frame; selCol: string | null }) {
  const { W, u, fs, Y } = frame;
  const selected = project.layout.columns.find((c) => c.id === selCol);
  return (
    <g pointerEvents="none">
      <HDim x1={0} x2={W} y={Y(0) + 6 * u} label={`${W}`} fs={fs} />
      <VDim y1={Y(0)} y2={Y(cfg.heightLeft)} x={-6 * u} label={`${cfg.heightLeft}`} fs={fs} />
      <VDim y1={Y(0)} y2={Y(rightHeight(cfg))} x={W + 7 * u} label={`${rightHeight(cfg)}`} fs={fs} />
      {project.layout.columns.map((col) => (
        <g key={col.id} className={col.id === selCol ? 'dim--accent' : ''}>
          <HDim x1={col.x} x2={col.x + col.width} y={-4 * u} label={`${Math.round(col.width)}`} fs={fs} />
        </g>
      ))}
      {selected &&
        compartments(cfg, selected).map((s) => (
          <g key={s.y0} className="dim--accent dim--gap">
            <VDim y1={Y(s.y0)} y2={Y(s.y1)} x={selected.x + selected.width - 3 * u} label={`${Math.round(s.y1 - s.y0)}`} fs={fs * 0.8} />
          </g>
        ))}
    </g>
  );
}
