import { Copy, MoveLeft, MoveRight, Plus, Trash2 } from 'lucide-react';
import { addCaisson, caissonLabel, caissonTag, duplicateCaisson, moveCaisson, removeCaisson } from '../domain/ensemble';
import { maxHeight } from '../domain/geometry';
import type { Ensemble, Issue } from '../domain/types';

interface Props {
  readonly ensemble: Ensemble;
  readonly active: number;
  readonly issues: readonly Issue[];
  readonly onActive: (index: number) => void;
  readonly apply: (next: Ensemble) => void;
}

const cm = (mm: number): string => `${Math.round(mm) / 10}`;

/** Onglets des caissons de l'ensemble, de gauche à droite, avec les actions sur le caisson actif. */
export function CaissonBar({ ensemble, active, issues, onActive, apply }: Props) {
  const count = ensemble.caissons.length;
  const levelOf = (i: number) =>
    issues.find((x) => x.caisson === i && x.level === 'error')?.level ?? issues.find((x) => x.caisson === i && x.level === 'warning')?.level;
  const run = (next: Ensemble, focus: number) => {
    apply(next);
    onActive(Math.max(0, Math.min(next.caissons.length - 1, focus)));
  };

  return (
    <div className="caissons" role="toolbar" aria-label="Caissons de l'ensemble">
      <div className="caissons__tabs" role="tablist" aria-label="Caisson à modifier">
        {ensemble.caissons.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`caisson-tab${i === active ? ' is-active' : ''}`}
            onClick={() => onActive(i)}
          >
            <span className="caisson-tab__tag mono">{caissonTag(i)}</span>
            <span className="caisson-tab__text">
              <strong>{caissonLabel(c, i)}</strong>
              <span className="mono">{cm(c.width)} × {cm(maxHeight(c))} × {cm(c.depth)} cm</span>
            </span>
            {levelOf(i) && <span className={`dot dot--${levelOf(i)}`} aria-label="Alerte" />}
          </button>
        ))}
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => run(addCaisson(ensemble), count)} title="Ajouter un caisson à droite">
          <Plus size={14} /> Caisson
        </button>
      </div>
      <div className="caissons__actions">
        <button type="button" className="btn btn--icon btn--sm btn--ghost" disabled={active === 0} onClick={() => run(moveCaisson(ensemble, active, -1), active - 1)} title="Déplacer à gauche" aria-label="Déplacer le caisson à gauche">
          <MoveLeft size={14} />
        </button>
        <button type="button" className="btn btn--icon btn--sm btn--ghost" disabled={active === count - 1} onClick={() => run(moveCaisson(ensemble, active, 1), active + 1)} title="Déplacer à droite" aria-label="Déplacer le caisson à droite">
          <MoveRight size={14} />
        </button>
        <button type="button" className="btn btn--icon btn--sm btn--ghost" onClick={() => run(duplicateCaisson(ensemble, active), active + 1)} title="Dupliquer" aria-label="Dupliquer le caisson">
          <Copy size={14} />
        </button>
        <button type="button" className="btn btn--icon btn--sm btn--ghost btn--danger" disabled={count === 1} onClick={() => run(removeCaisson(ensemble, active), active - 1)} title="Supprimer le caisson" aria-label="Supprimer le caisson">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
