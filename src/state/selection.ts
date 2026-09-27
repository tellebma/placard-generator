import type { ClosetConfig } from '../domain/types';

export type Selection =
  | { readonly kind: 'none' }
  | { readonly kind: 'column'; readonly col: string }
  | { readonly kind: 'shelf'; readonly col: string; readonly index: number }
  | { readonly kind: 'rod'; readonly col: string };

export const NONE: Selection = { kind: 'none' };

/** Colonne sélectionnée (quel que soit l'élément), ou null. */
export const selectedColumnId = (sel: Selection): string | null => (sel.kind === 'none' ? null : sel.col);

/** Ramène la sélection à un état valide après une modification (colonne ou étagère supprimée). */
export function sanitizeSelection(sel: Selection, cfg: ClosetConfig): Selection {
  if (sel.kind === 'none') return sel;
  const col = cfg.columns.find((c) => c.id === sel.col);
  if (!col) return NONE;
  if (sel.kind === 'shelf' && sel.index >= col.shelves.length) return { kind: 'column', col: sel.col };
  if (sel.kind === 'rod' && col.rodHeight === null) return { kind: 'column', col: sel.col };
  return sel;
}
