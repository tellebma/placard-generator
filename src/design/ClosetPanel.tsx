import { ArrowLeftRight, ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ClosetConfig, Shape } from '../domain/types';
import { NumberInput, Row, Segmented, Switch } from '../ui/controls';

interface Props {
  readonly cfg: ClosetConfig;
  readonly onChange: (patch: Partial<ClosetConfig>, coalesce: string) => void;
}

export function Section({ title, children, collapsible, defaultOpen = true, aside }: {
  readonly title: string;
  readonly children: ReactNode;
  readonly collapsible?: boolean;
  readonly defaultOpen?: boolean;
  readonly aside?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;
  return (
    <section className={`section${expanded ? '' : ' is-collapsed'}`}>
      <header className="section__head">
        {collapsible ? (
          <button type="button" className="section__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            <ChevronDown size={14} className="section__chevron" />
            <h3>{title}</h3>
          </button>
        ) : (
          <h3>{title}</h3>
        )}
        {aside}
      </header>
      {expanded && <div className="section__body">{children}</div>}
    </section>
  );
}

const ShapeIcon = ({ shape }: { readonly shape: Shape }) => (
  <svg viewBox="0 0 40 40" aria-hidden="true" className="shape-icon">
    {shape === 'droit' ? <rect x="9" y="6" width="22" height="30" rx="1.5" /> : <path d="M9 6 L31 18 L31 36 L9 36 Z" />}
    <line x1="4" y1="36.5" x2="36" y2="36.5" />
  </svg>
);

const SHAPES: readonly { value: Shape; title: string; text: string }[] = [
  { value: 'droit', title: 'Droit', text: 'Hauteur constante' },
  { value: 'sous-pente', title: 'Sous-pente', text: 'Plafond incliné' },
];

export function ClosetPanel({ cfg, onChange }: Props) {
  const sloped = cfg.shape === 'sous-pente';
  const num = (key: keyof ClosetConfig, value: number) => onChange({ [key]: value } as Partial<ClosetConfig>, key);

  return (
    <div className="panel-scroll">
      <Section title="Forme">
        <div className="shape-cards" role="radiogroup" aria-label="Forme du placard">
          {SHAPES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={cfg.shape === s.value}
              className={`shape-card${cfg.shape === s.value ? ' is-active' : ''}`}
              onClick={() => onChange({ shape: s.value }, 'shape')}
            >
              <ShapeIcon shape={s.value} />
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Dimensions extérieures">
        <Row label="Largeur">{(id) => <NumberInput id={id} value={cfg.width} min={300} onChange={(v) => num('width', v)} />}</Row>
        {sloped ? (
          <>
            <Row label="Hauteur à gauche">{(id) => <NumberInput id={id} value={cfg.heightLeft} min={300} onChange={(v) => num('heightLeft', v)} />}</Row>
            <Row label="Hauteur à droite">{(id) => <NumberInput id={id} value={cfg.heightRight} min={300} onChange={(v) => num('heightRight', v)} />}</Row>
            <button
              type="button"
              className="btn btn--sm btn--ghost btn--block"
              onClick={() => onChange({ heightLeft: cfg.heightRight, heightRight: cfg.heightLeft }, 'swap')}
            >
              <ArrowLeftRight size={14} /> Inverser le sens de la pente
            </button>
          </>
        ) : (
          <Row label="Hauteur">{(id) => <NumberInput id={id} value={cfg.heightLeft} min={300} onChange={(v) => num('heightLeft', v)} />}</Row>
        )}
        <Row label="Profondeur" hint="fond compris">{(id) => <NumberInput id={id} value={cfg.depth} min={200} onChange={(v) => num('depth', v)} />}</Row>
      </Section>

      <Section
        title="Socle"
        aside={<Switch checked={cfg.plinth > 0} ariaLabel="Socle" onChange={(on) => onChange({ plinth: on ? 80 : 0 }, 'plinth-toggle')} />}
      >
        {cfg.plinth > 0 ? (
          <Row label="Hauteur du socle">{(id) => <NumberInput id={id} value={cfg.plinth} min={0} onChange={(v) => num('plinth', v)} />}</Row>
        ) : (
          <p className="text-3 small">Sans socle, le caisson repose directement au sol.</p>
        )}
      </Section>

      <Section title="Matériaux" collapsible defaultOpen={false}>
        <div className="stack-sm">
          <span className="label">Épaisseur des panneaux</span>
          <Segmented
            ariaLabel="Épaisseur des panneaux"
            size="sm"
            value={cfg.thickness}
            options={[16, 18, 19, 22].map((v) => ({ value: v, label: `${v}` }))}
            onChange={(v) => onChange({ thickness: v }, 'thickness')}
          />
        </div>
        <div className="stack-sm">
          <span className="label">Fond</span>
          <Segmented
            ariaLabel="Épaisseur du fond"
            size="sm"
            value={cfg.backThickness}
            options={[
              { value: 0, label: 'Aucun' },
              { value: 3, label: '3' },
              { value: 5, label: '5' },
              { value: 8, label: '8' },
            ]}
            onChange={(v) => onChange({ backThickness: v }, 'backThickness')}
          />
        </div>
        <Row label="Jeu des portes">{(id) => <NumberInput id={id} value={cfg.doorGap} step={0.5} onChange={(v) => num('doorGap', v)} />}</Row>
      </Section>

      <Section title="Panneaux bruts & prix" collapsible defaultOpen={false}>
        <p className="text-3 small">Formats vendus en magasin, pour le plan de découpe et le budget.</p>
        <Row label="Panneau (long.)">{(id) => <NumberInput id={id} value={cfg.board.length} onChange={(v) => onChange({ board: { ...cfg.board, length: v } }, 'board.length')} />}</Row>
        <Row label="Panneau (larg.)">{(id) => <NumberInput id={id} value={cfg.board.width} onChange={(v) => onChange({ board: { ...cfg.board, width: v } }, 'board.width')} />}</Row>
        <Row label="Prix panneau">{(id) => <NumberInput id={id} unit="€" value={cfg.prices.board} onChange={(v) => onChange({ prices: { ...cfg.prices, board: v } }, 'price.board')} />}</Row>
        {cfg.backThickness > 0 && (
          <>
            <Row label="Fond (long.)">{(id) => <NumberInput id={id} value={cfg.backBoard.length} onChange={(v) => onChange({ backBoard: { ...cfg.backBoard, length: v } }, 'back.length')} />}</Row>
            <Row label="Fond (larg.)">{(id) => <NumberInput id={id} value={cfg.backBoard.width} onChange={(v) => onChange({ backBoard: { ...cfg.backBoard, width: v } }, 'back.width')} />}</Row>
            <Row label="Prix fond">{(id) => <NumberInput id={id} unit="€" value={cfg.prices.backBoard} onChange={(v) => onChange({ prices: { ...cfg.prices, backBoard: v } }, 'price.back')} />}</Row>
          </>
        )}
        <Row label="Chant">{(id) => <NumberInput id={id} unit="€/m" step={0.1} value={cfg.prices.edge} onChange={(v) => onChange({ prices: { ...cfg.prices, edge: v } }, 'price.edge')} />}</Row>
        <Row label="Trait de scie">{(id) => <NumberInput id={id} value={cfg.board.kerf} onChange={(v) => onChange({ board: { ...cfg.board, kerf: v }, backBoard: { ...cfg.backBoard, kerf: v } }, 'kerf')} />}</Row>
      </Section>
    </div>
  );
}
