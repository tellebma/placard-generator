import type { AssemblyStep } from '../domain/assembly';
import type { HardwareItem } from '../domain/hardware';
import type { PackingResult } from '../domain/packing';
import { Checkbox } from '../ui/controls';

interface Checklist {
  readonly isChecked: (id: string) => boolean;
  readonly toggle: (id: string) => void;
}

export interface ShoppingItem {
  readonly id: string;
  readonly name: string;
  readonly qty: string;
  readonly note?: string;
}

/** Liste de courses : panneaux bruts puis quincaillerie. */
export function shoppingItems(packs: readonly PackingResult[], hardware: readonly HardwareItem[]): ShoppingItem[] {
  const boards = packs
    .filter((p) => p.boards.length > 0)
    .map((p) => ({
      id: `board-${p.material}-${p.thickness}`,
      name: p.material === 'fond' ? `Panneau de fond ${p.thickness} mm (HDF)` : `Panneau ${p.thickness} mm (mélaminé ou contreplaqué)`,
      qty: `${p.boards.length + p.oversize.length}`,
      note: `Format ${p.spec.length} × ${p.spec.width} mm`,
    }));
  const items = hardware.map((h) => ({ id: h.name, name: h.name, qty: `${h.qty}${h.unit ? ` ${h.unit}` : ''}`, note: h.note }));
  return [...boards, ...items];
}

export function ShoppingList({ items, checklist }: { readonly items: readonly ShoppingItem[]; readonly checklist: Checklist }) {
  return (
    <div className="card card--flush">
      <ul className="checklist">
        {items.map((it) => {
          const done = checklist.isChecked(it.id);
          return (
            <li key={it.id} className={done ? 'is-done' : ''}>
              <Checkbox checked={done} onChange={() => checklist.toggle(it.id)} label={it.name} />
              <span className="checklist__qty mono">{it.qty}</span>
              <span className="checklist__text">
                <strong>{it.name}</strong>
                {it.note && <span className="text-2 small">{it.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AssemblyGuide({ steps, checklist }: { readonly steps: readonly AssemblyStep[]; readonly checklist: Checklist }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => {
        const done = checklist.isChecked(s.title);
        return (
          <li key={s.title} className={`step${done ? ' is-done' : ''}`}>
            <div className="step__rail">
              <span className="step__num">{i + 1}</span>
            </div>
            <div className="step__body">
              <header className="step__head">
                <h3>{s.title}</h3>
                <label className="step__check">
                  <Checkbox checked={done} onChange={() => checklist.toggle(s.title)} label={`Étape ${i + 1} terminée`} />
                  <span className="small text-2">Terminé</span>
                </label>
              </header>
              <ul>
                {s.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
