import { areaByMaterial } from '../domain/cutlist';
import type { Material, NumberedPiece } from '../domain/types';
import { Checkbox } from '../ui/controls';

export const pieceKey = (p: NumberedPiece): string => `${p.ref}:${p.name}:${p.length}x${p.width}x${p.thickness}`;

interface Checklist {
  readonly isChecked: (id: string) => boolean;
  readonly toggle: (id: string) => void;
}

const EdgeMarks = ({ piece }: { readonly piece: NumberedPiece }) => {
  if (piece.edgeLong === 0 && piece.edgeShort === 0) return <span className="text-3">—</span>;
  // Schéma du panneau : les bords épais portent un chant.
  const long = piece.edgeLong;
  const short = piece.edgeShort;
  return (
    <span className="edges" title={`${long} chant(s) sur la longueur, ${short} sur la largeur`}>
      <svg viewBox="0 0 36 18" aria-hidden="true">
        <rect x="2" y="2" width="32" height="14" className="edges__panel" />
        {long >= 1 && <line x1="2" y1="16" x2="34" y2="16" className="edges__on" />}
        {long >= 2 && <line x1="2" y1="2" x2="34" y2="2" className="edges__on" />}
        {short >= 1 && <line x1="2" y1="2" x2="2" y2="16" className="edges__on" />}
        {short >= 2 && <line x1="34" y1="2" x2="34" y2="16" className="edges__on" />}
      </svg>
    </span>
  );
};

const GROUPS: readonly { material: Material; title: string }[] = [
  { material: 'panneau', title: 'Panneaux' },
  { material: 'fond', title: 'Fond' },
];

export function PiecesTable({ pieces, checklist }: { readonly pieces: readonly NumberedPiece[]; readonly checklist: Checklist }) {
  return (
    <div className="stack">
      {GROUPS.map(({ material, title }) => {
        const rows = pieces.filter((p) => p.material === material);
        if (rows.length === 0) return null;
        return (
          <div key={material} className="card card--flush">
            <div className="card__title">
              <h3>{title} · {rows[0].thickness} mm</h3>
              <span className="text-3 small mono">{areaByMaterial(pieces, material).toFixed(2)} m²</span>
            </div>
            <div className="table-wrap">
              <table className="table table--pieces">
                <thead>
                  <tr>
                    <th className="col-check" aria-label="Découpée" />
                    <th className="col-ref">Réf.</th>
                    <th className="col-name">Pièce</th>
                    <th className="num col-qty">Qté</th>
                    <th className="num col-dim">Longueur</th>
                    <th className="num col-dim">Largeur</th>
                    <th className="col-edges">Chants</th>
                    <th>Remarques</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const done = checklist.isChecked(pieceKey(p));
                    return (
                      <tr key={p.ref} className={done ? 'is-done' : ''}>
                        <td className="col-check"><Checkbox checked={done} onChange={() => checklist.toggle(pieceKey(p))} label={`${p.ref} découpée`} /></td>
                        <td><span className="ref">{p.ref}</span></td>
                        <td className="strong">{p.name}</td>
                        <td className="num">{p.qty}</td>
                        <td className="num">{p.length}</td>
                        <td className="num">{p.width}</td>
                        <td><EdgeMarks piece={p} /></td>
                        <td className="small text-2">{[p.where, p.note].filter(Boolean).join(' — ')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <p className="text-3 small">
        Dimensions finies en mm, chants compris. Sur le schéma des chants, les bords en couleur sont à plaquer.
      </p>
    </div>
  );
}
