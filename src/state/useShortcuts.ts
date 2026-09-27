import { useEffect } from 'react';
import { removeShelf, setShelf, updateColumn } from '../domain/edit';
import { columnInnerHeight } from '../domain/geometry';
import type { Project } from '../domain/project';
import type { ClosetConfig } from '../domain/types';
import { NONE, type Selection } from './selection';
import type { History } from './useHistory';

interface Options {
  readonly history: History<ClosetConfig>;
  readonly selection: Selection;
  readonly setSelection: (s: Selection) => void;
  readonly project: Project;
  readonly onSave: () => void;
  readonly onOpen: () => void;
  readonly enabled: boolean;
}

const isEditable = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Déplace l'élément sélectionné (étagère ou tringle) verticalement. */
function nudge(o: Options, delta: number): void {
  const { history, selection, project } = o;
  if (selection.kind !== 'shelf' && selection.kind !== 'rod') return;
  const col = project.layout.columns.find((c) => c.id === selection.col);
  if (!col) return;
  const cfg = history.value;
  const inner = columnInnerHeight(cfg, col);
  if (selection.kind === 'shelf') {
    const h = Math.min(inner - cfg.thickness, Math.max(1, col.config.shelves[selection.index] + delta));
    history.set(setShelf(cfg, col.id, selection.index, h), { coalesce: `nudge-${col.id}-${selection.index}` });
  } else {
    const h = Math.max(1, (col.config.rodHeight ?? 0) + delta);
    history.set(updateColumn(cfg, col.id, { rodHeight: h }), { coalesce: `nudge-rod-${col.id}` });
  }
}

function remove(o: Options): void {
  const { history, selection, setSelection } = o;
  if (selection.kind === 'shelf') {
    history.set(removeShelf(history.value, selection.col, selection.index));
    setSelection({ kind: 'column', col: selection.col });
  } else if (selection.kind === 'rod') {
    history.set(updateColumn(history.value, selection.col, { rodHeight: null }));
    setSelection({ kind: 'column', col: selection.col });
  }
}

function stepColumn(o: Options, delta: number): void {
  const cols = o.project.layout.columns;
  const current = o.selection.kind === 'none' ? -1 : cols.findIndex((c) => c.id === (o.selection as { col: string }).col);
  const next = Math.min(cols.length - 1, Math.max(0, current + delta));
  o.setSelection({ kind: 'column', col: cols[next].id });
}

function handleKey(e: KeyboardEvent, o: Options): boolean {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (mod && key === 's') return o.onSave(), true;
  if (mod && key === 'o') return o.onOpen(), true;
  if (isEditable(e.target)) return false;
  if (mod && key === 'z') return (e.shiftKey ? o.history.redo() : o.history.undo()), true;
  if (mod && key === 'y') return o.history.redo(), true;
  if (mod || !o.enabled) return false;
  switch (e.key) {
    case 'Escape':
      o.setSelection(NONE);
      return true;
    case 'Delete':
    case 'Backspace':
      remove(o);
      return true;
    case 'ArrowUp':
    case 'ArrowDown': {
      const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
      nudge(o, delta);
      return o.selection.kind === 'shelf' || o.selection.kind === 'rod';
    }
    case 'ArrowLeft':
    case 'ArrowRight':
      stepColumn(o, e.key === 'ArrowLeft' ? -1 : 1);
      return true;
    default:
      return false;
  }
}

export function useShortcuts(options: Options): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (handleKey(e, options)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options]);
}
