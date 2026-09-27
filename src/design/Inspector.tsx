import { ArrowLeft, ChevronLeft, ChevronRight, Copy, MoveLeft, MoveRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { evenShelves } from '../domain/defaults';
import { addColumn, addShelf, duplicateColumn, moveColumn, removeColumn, removeShelf, setShelf, updateColumn } from '../domain/edit';
import { bottomY, columnInnerHeight, type ColumnLayout } from '../domain/geometry';
import type { Project } from '../domain/project';
import type { ClosetConfig, DoorCount, Issue } from '../domain/types';
import { NONE, selectedColumnId, type Selection } from '../state/selection';
import type { SetOptions } from '../state/useHistory';
import { NumberInput, Row, Segmented, Switch } from '../ui/controls';
import { Section } from './ClosetPanel';
import { ColumnGlyph, DoorsIcon } from './glyphs';

interface Props {
  readonly cfg: ClosetConfig;
  readonly project: Project;
  readonly selection: Selection;
  readonly onSelect: (s: Selection) => void;
  readonly apply: (next: ClosetConfig, opts?: SetOptions) => void;
}

export function Inspector(props: Props) {
  const colId = selectedColumnId(props.selection);
  const col = props.project.layout.columns.find((c) => c.id === colId);
  return col ? <ColumnInspector {...props} col={col} /> : <ColumnsOverview {...props} />;
}

const describe = (col: ColumnLayout): string =>
  [
    `${Math.round(col.width)} mm`,
    col.config.rodHeight !== null ? 'penderie' : null,
    col.config.shelves.length > 0 ? `${col.config.shelves.length} étagère${col.config.shelves.length > 1 ? 's' : ''}` : null,
    col.config.doors > 0 ? `${col.config.doors} porte${col.config.doors > 1 ? 's' : ''}` : 'ouverte',
  ]
    .filter(Boolean)
    .join(' · ');

function ColumnsOverview({ cfg, project, onSelect, apply }: Props) {
  const levelOf = (i: number) => project.issues.find((x) => x.column === i && x.level === 'error')?.level
    ?? project.issues.find((x) => x.column === i)?.level;
  return (
    <div className="panel-scroll">
      <Section title="Aménagement" aside={<span className="badge">{cfg.columns.length} col.</span>}>
        <p className="text-3 small">Cliquez sur une colonne dans le plan, ou choisissez-la ci-dessous.</p>
        <ul className="col-list">
          {project.layout.columns.map((col) => (
            <li key={col.id}>
              <button type="button" className="col-item" onClick={() => onSelect({ kind: 'column', col: col.id })}>
                <ColumnGlyph column={col.config} />
                <span className="col-item__text">
                  <strong>Colonne {col.index + 1}</strong>
                  <span>{describe(col)}</span>
                </span>
                {levelOf(col.index) && <span className={`dot dot--${levelOf(col.index)}`} aria-label="Alerte" />}
                <ChevronRight size={16} className="text-3" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn--block" onClick={() => {
          const next = addColumn(cfg);
          apply(next);
          onSelect({ kind: 'column', col: next.columns[next.columns.length - 1].id });
        }}>
          <Plus size={16} /> Ajouter une colonne
        </button>
      </Section>
    </div>
  );
}

function ColumnInspector({ cfg, project, selection, onSelect, apply, col }: Props & { readonly col: ColumnLayout }) {
  const c = col.config;
  const total = project.layout.columns.length;
  const inner = Math.floor(columnInnerHeight(cfg, col));
  const issues = project.issues.filter((i) => i.column === col.index);
  const go = (index: number) => onSelect({ kind: 'column', col: project.layout.columns[index].id });
  const update = (patch: Partial<typeof c>, key: string) => apply(updateColumn(cfg, c.id, patch), { coalesce: `${c.id}.${key}` });

  return (
    <div className="panel-scroll">
      <header className="insp-head">
        <button type="button" className="btn btn--icon btn--ghost" onClick={() => onSelect(NONE)} aria-label="Retour à la liste">
          <ArrowLeft size={16} />
        </button>
        <div className="insp-head__title">
          <strong>Colonne {col.index + 1}</strong>
          <span className="text-3">sur {total}</span>
        </div>
        <button type="button" className="btn btn--icon btn--ghost" disabled={col.index === 0} onClick={() => go(col.index - 1)} aria-label="Colonne précédente">
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="btn btn--icon btn--ghost" disabled={col.index === total - 1} onClick={() => go(col.index + 1)} aria-label="Colonne suivante">
          <ChevronRight size={16} />
        </button>
      </header>

      <div className="insp-actions">
        <button type="button" className="btn btn--sm btn--ghost" disabled={col.index === 0} onClick={() => apply(moveColumn(cfg, c.id, -1))} title="Déplacer à gauche">
          <MoveLeft size={14} />
        </button>
        <button type="button" className="btn btn--sm btn--ghost" disabled={col.index === total - 1} onClick={() => apply(moveColumn(cfg, c.id, 1))} title="Déplacer à droite">
          <MoveRight size={14} />
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => apply(duplicateColumn(cfg, c.id))} title="Dupliquer">
          <Copy size={14} /> Dupliquer
        </button>
        <span className="spacer" />
        <button type="button" className="btn btn--sm btn--ghost btn--danger" disabled={total === 1} onClick={() => { apply(removeColumn(cfg, c.id)); onSelect(NONE); }} title="Supprimer la colonne">
          <Trash2 size={14} />
        </button>
      </div>

      {issues.length > 0 && <ColumnIssues issues={issues} />}

      <Section title="Largeur">
        <Segmented
          ariaLabel="Mode de largeur"
          value={c.width === null ? 'auto' : 'fixe'}
          options={[{ value: 'auto', label: 'Automatique' }, { value: 'fixe', label: 'Fixe' }]}
          onChange={(m) => update({ width: m === 'auto' ? null : Math.round(col.width) }, 'widthMode')}
        />
        {c.width !== null ? (
          <Row label="Largeur intérieure">{(id) => <NumberInput id={id} value={c.width ?? 0} min={100} onChange={(v) => update({ width: v }, 'width')} />}</Row>
        ) : (
          <p className="text-3 small">Partage la place restante : <strong className="mono">{Math.round(col.width)} mm</strong>. Glissez une séparation sur le plan pour ajuster.</p>
        )}
        <p className="text-3 small">Hauteur intérieure : <strong className="mono">{inner} mm</strong></p>
      </Section>

      <Section title="Portes">
        <Segmented<DoorCount>
          ariaLabel="Nombre de portes"
          value={c.doors}
          options={([0, 1, 2] as DoorCount[]).map((n) => ({
            value: n,
            label: <span className="seg-icon"><DoorsIcon count={n} />{n === 0 ? 'Aucune' : n === 1 ? '1 porte' : '2 portes'}</span>,
          }))}
          onChange={(doors) => update({ doors }, 'doors')}
        />
      </Section>

      <Section
        title="Penderie"
        aside={<Switch checked={c.rodHeight !== null} ariaLabel="Penderie" onChange={(on) => update({ rodHeight: on ? Math.min(1700, inner - 60) : null }, 'rodToggle')} />}
      >
        {c.rodHeight !== null ? (
          <Row label="Hauteur de la tringle" hint={`${Math.round(c.rodHeight + bottomY(cfg))} mm du sol`}>
            {(id) => <NumberInput id={id} value={c.rodHeight ?? 0} onChange={(v) => update({ rodHeight: v }, 'rod')} />}
          </Row>
        ) : (
          <p className="text-3 small">Ajoute une tringle pour suspendre des vêtements.</p>
        )}
      </Section>

      <ShelvesSection cfg={cfg} col={col} inner={inner} selection={selection} onSelect={onSelect} apply={apply} />
    </div>
  );
}

function ColumnIssues({ issues }: { readonly issues: readonly Issue[] }) {
  return (
    <ul className="insp-issues">
      {issues.map((i) => (
        <li key={i.message} className={`callout callout--${i.level}`}>{i.message.replace(/^Colonne \d+ : /, '')}</li>
      ))}
    </ul>
  );
}

interface ShelvesProps {
  readonly cfg: ClosetConfig;
  readonly col: ColumnLayout;
  readonly inner: number;
  readonly selection: Selection;
  readonly onSelect: (s: Selection) => void;
  readonly apply: (next: ClosetConfig, opts?: SetOptions) => void;
}

function ShelvesSection({ cfg, col, inner, selection, onSelect, apply }: ShelvesProps) {
  const c = col.config;
  const [count, setCount] = useState(Math.max(3, c.shelves.length));
  const e = cfg.thickness;
  const order = c.shelves.map((h, index) => ({ h, index })).sort((a, b) => b.h - a.h);
  const gapBelow = (h: number) => {
    const below = c.shelves.filter((x) => x < h);
    return Math.round(h - (below.length > 0 ? Math.max(...below) + e : 0));
  };
  const add = () => {
    const top = c.shelves.length > 0 ? Math.max(...c.shelves) : 0;
    const h = Math.min(top + 350, inner - e);
    apply(addShelf(cfg, c.id, h));
    onSelect({ kind: 'shelf', col: c.id, index: c.shelves.length });
  };

  return (
    <Section title="Étagères" aside={<button type="button" className="btn btn--sm" onClick={add}><Plus size={14} /> Ajouter</button>}>
      {order.length === 0 && <p className="text-3 small">Aucune étagère. Double-cliquez dans la colonne sur le plan pour en poser une.</p>}
      <ul className="shelf-list">
        {order.map(({ h, index }) => {
          const selected = selection.kind === 'shelf' && selection.col === c.id && selection.index === index;
          return (
            <li key={index} className={`shelf-item${selected ? ' is-selected' : ''}`} onClick={() => onSelect({ kind: 'shelf', col: c.id, index })}>
              <NumberInput ariaLabel={`Hauteur de l'étagère ${index + 1}`} value={h} min={1} max={inner - e} onChange={(v) => apply(setShelf(cfg, c.id, index, v), { coalesce: `${c.id}.shelf.${index}` })} />
              <span className="shelf-item__gap" title="Espace libre sous l'étagère">↕ {gapBelow(h)}</span>
              <button type="button" className="btn btn--icon btn--ghost btn--danger" aria-label="Retirer l'étagère" onClick={(ev) => { ev.stopPropagation(); apply(removeShelf(cfg, c.id, index)); onSelect({ kind: 'column', col: c.id }); }}>
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="even-row">
        <span className="text-2 small">Répartir</span>
        <NumberInput ariaLabel="Nombre d'étagères" unit="" value={count} min={1} max={20} onChange={(v) => setCount(Math.max(1, Math.min(20, Math.round(v))))} />
        <button type="button" className="btn btn--sm" onClick={() => apply(updateColumn(cfg, c.id, { shelves: evenShelves(count, inner, e) }))}>
          régulièrement
        </button>
      </div>
      <p className="text-3 small">Hauteur = dessous de l'étagère, depuis le bas intérieur.</p>
    </Section>
  );
}
