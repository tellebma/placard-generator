import { useEffect, useId, useState, type ReactNode } from 'react';

interface NumberInputProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly id?: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
}

const clamp = (v: number, min?: number, max?: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));

/**
 * Champ numérique avec unité intégrée. Flèches haut/bas : ±pas, Maj + flèches : ±10 pas.
 * La saisie intermédiaire (champ vide, "12.") est conservée sans casser la valeur.
 */
export function NumberInput({ value, onChange, unit = 'mm', min = 0, max, step = 1, id, ariaLabel, disabled }: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (text: string) => {
    setDraft(text);
    const n = Number(text.replace(',', '.'));
    if (text.trim() !== '' && Number.isFinite(n)) onChange(n);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
    onChange(clamp(Math.round((value + delta) * 100) / 100, min, max));
  };

  return (
    <span className={`num-input${disabled ? ' is-disabled' : ''}`}>
      <input
        id={id}
        inputMode="decimal"
        value={draft}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(e) => commit(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setDraft(String(value))}
        onFocus={(e) => e.target.select()}
      />
      {unit && <span className="num-input__unit">{unit}</span>}
    </span>
  );
}

interface RowProps {
  readonly label: ReactNode;
  readonly hint?: string;
  readonly children: (id: string) => ReactNode;
}

/** Ligne d'inspecteur : libellé à gauche, contrôle à droite. */
export function Row({ label, hint, children }: RowProps) {
  const id = useId();
  return (
    <div className="row">
      <label className="row__label" htmlFor={id}>
        {label}
        {hint && <span className="row__hint">{hint}</span>}
      </label>
      <div className="row__control">{children(id)}</div>
    </div>
  );
}

interface SegmentedOption<T> {
  readonly value: T;
  readonly label: ReactNode;
  readonly title?: string;
}

interface SegmentedProps<T> {
  readonly value: T;
  readonly options: readonly SegmentedOption<T>[];
  readonly onChange: (value: T) => void;
  readonly ariaLabel: string;
  readonly size?: 'sm' | 'md';
}

export function Segmented<T extends string | number>({ value, options, onChange, ariaLabel, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={`segmented segmented--${size}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          className={o.value === value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface SwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly id?: string;
  readonly ariaLabel?: string;
}

export function Switch({ checked, onChange, id, ariaLabel }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__thumb" />
    </button>
  );
}

export function Checkbox({ checked, onChange, label }: { readonly checked: boolean; readonly onChange: () => void; readonly label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`check${checked ? ' is-on' : ''}`} onClick={onChange}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </button>
  );
}

export function Kbd({ children }: { readonly children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
