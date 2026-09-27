import { AlertTriangle, ArrowRight, Box, CheckCircle2, PenLine } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { Project } from '../domain/project';
import type { ClosetConfig, Issue } from '../domain/types';
import { selectedColumnId, type Selection } from '../state/selection';
import type { History } from '../state/useHistory';
import { Kbd, Segmented } from '../ui/controls';
import { Menu } from '../ui/overlays';
import type { DoorMode } from './Canvas3D';
import { EditorCanvas } from './EditorCanvas';

const Canvas3D = lazy(() => import('./Canvas3D'));

type ViewMode = '2d' | '3d';

interface Props {
  readonly project: Project;
  readonly history: History<ClosetConfig>;
  readonly selection: Selection;
  readonly onSelect: (s: Selection) => void;
  readonly onBuild: () => void;
}

const euros = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function DesignView({ project, history, selection, onSelect, onBuild }: Props) {
  const [view, setView] = useState<ViewMode>('2d');
  const [doorMode, setDoorMode] = useState<DoorMode>('hidden');
  const cfg = history.value;
  const selIndex = project.layout.columns.find((c) => c.id === selectedColumnId(selection))?.index ?? null;
  const s = project.summary;

  return (
    <div className="stage">
      <div className="stage__toolbar">
        <Segmented<ViewMode>
          ariaLabel="Vue"
          size="sm"
          value={view}
          options={[
            { value: '2d', label: <span className="seg-icon"><PenLine size={14} />Plan</span> },
            { value: '3d', label: <span className="seg-icon"><Box size={14} />3D</span> },
          ]}
          onChange={setView}
        />
        <Segmented<DoorMode>
          ariaLabel="Portes"
          size="sm"
          value={view === '2d' && doorMode === 'open' ? 'closed' : doorMode}
          options={[
            { value: 'hidden', label: 'Sans portes' },
            { value: 'closed', label: 'Fermées' },
            ...(view === '3d' ? [{ value: 'open' as const, label: 'Ouvertes' }] : []),
          ]}
          onChange={setDoorMode}
        />
        <span className="spacer" />
        <IssuesButton issues={project.issues} onPick={(col) => onSelect({ kind: 'column', col: project.layout.columns[col].id })} />
      </div>

      <div className="stage__canvas">
        {view === '2d' ? (
          <EditorCanvas project={project} history={history} selection={selection} onSelect={onSelect} showDoors={doorMode !== 'hidden'} />
        ) : (
          <Suspense fallback={<div className="stage__loading">Chargement de la 3D…</div>}>
            <Canvas3D cfg={cfg} project={project} doorMode={doorMode} selectedColumn={selIndex} />
          </Suspense>
        )}
        {view === '2d' && (
          <p className="stage__hint">
            <span>Clic : sélectionner</span>
            <span>Glisser : déplacer (<Kbd>Maj</Kbd> = au mm)</span>
            <span>Double-clic : ajouter une étagère</span>
            <span><Kbd>Suppr</Kbd> retirer · <Kbd>↑</Kbd><Kbd>↓</Kbd> ajuster</span>
          </p>
        )}
        {view === '3d' && <p className="stage__hint"><span>Glisser : tourner</span><span>Molette : zoomer</span><span>Clic droit : déplacer</span></p>}
      </div>

      <footer className="summary">
        <dl className="summary__stats">
          <div><dt>Pièces</dt><dd className="mono">{s.pieceCount}</dd></div>
          <div><dt>Panneaux à acheter</dt><dd className="mono">{s.boards}{s.backBoards > 0 ? ` + ${s.backBoards} fond` : ''}</dd></div>
          <div><dt>Chant</dt><dd className="mono">{Math.ceil(s.edgeMeters)} m</dd></div>
          <div><dt>Budget matière</dt><dd className="mono">≈ {euros(s.cost)}</dd></div>
        </dl>
        <button type="button" className="btn btn--primary" onClick={onBuild}>
          Voir le dossier de fabrication <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}

function IssuesButton({ issues, onPick }: { readonly issues: readonly Issue[]; readonly onPick: (col: number) => void }) {
  const errors = issues.filter((i) => i.level === 'error').length;
  const tone = errors > 0 ? 'error' : issues.length > 0 ? 'warning' : 'ok';
  if (issues.length === 0) {
    return (
      <span className="status status--ok"><CheckCircle2 size={14} /> Tout est cohérent</span>
    );
  }
  return (
    <Menu
      trigger={({ toggle, open }) => (
        <button type="button" className={`status status--${tone} status--button`} aria-expanded={open} onClick={toggle}>
          <AlertTriangle size={14} />
          {errors > 0 ? `${errors} erreur${errors > 1 ? 's' : ''}` : ''}
          {errors > 0 && issues.length > errors ? ' · ' : ''}
          {issues.length > errors ? `${issues.length - errors} conseil${issues.length - errors > 1 ? 's' : ''}` : ''}
        </button>
      )}
    >
      {(close) => (
        <ul className="issue-menu">
          {issues.map((i) => (
            <li key={i.message}>
              <button
                type="button"
                className={`callout callout--${i.level}`}
                disabled={i.column === undefined}
                onClick={() => {
                  if (i.column !== undefined) onPick(i.column);
                  close();
                }}
              >
                {i.message}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Menu>
  );
}
