import type { ColumnConfig } from '../domain/types';

/** Petit pictogramme de colonne (étagères, tringle, portes) pour les listes. */
export function ColumnGlyph({ column }: { readonly column: ColumnConfig }) {
  const max = Math.max(1, ...column.shelves, column.rodHeight ?? 0) * 1.12;
  const y = (h: number) => 34 - (h / max) * 28;
  return (
    <svg viewBox="0 0 28 40" className="col-glyph" aria-hidden="true">
      <rect x="2" y="3" width="24" height="33" rx="2" className="col-glyph__box" />
      {column.shelves.map((h, i) => (
        <line key={i} x1="4" x2="24" y1={y(h)} y2={y(h)} className="col-glyph__shelf" />
      ))}
      {column.rodHeight !== null && <line x1="6" x2="22" y1={y(column.rodHeight)} y2={y(column.rodHeight)} className="col-glyph__rod" />}
    </svg>
  );
}

export function DoorsIcon({ count }: { readonly count: number }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="doors-icon">
      <rect x="3" y="2" width="14" height="16" rx="1" fill="none" />
      {count === 1 && <circle cx="14" cy="10" r="0.9" />}
      {count === 2 && (
        <>
          <line x1="10" y1="2" x2="10" y2="18" />
          <circle cx="8.3" cy="10" r="0.9" />
          <circle cx="11.7" cy="10" r="0.9" />
        </>
      )}
      {count === 0 && <line x1="3" y1="9" x2="17" y2="9" />}
    </svg>
  );
}
