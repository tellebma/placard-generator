import { AlertTriangle, ArrowRight, Box, CheckCircle2, Columns3, PenLine } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import type { EnsembleProject } from '../domain/ensembleProject';
import type { Project } from '../domain/project';
import type { ClosetConfig, Ensemble, Issue } from '../domain/types';
import { EnsembleFront, EnsembleTop } from '../drawing/EnsembleDrawing';
import { selectedColumnId, type Selection } from '../state/selection';
import type { History } from '../state/useHistory';
import { Kbd, Segmented } from '../ui/controls';
import { Menu } from '../ui/overlays';
import { CaissonBar } from './CaissonBar';
import type { DoorMode } from './Canvas3D';
import { EditorCanvas } from './EditorCanvas';

const Canvas3D = lazy(() => import('./Canvas3D'));

type ViewMode = '2d' | 'ensemble' | '3d';

interface Props {
  readonly ensemble: Ensemble;
  readonly ensembleProject: EnsembleProject;
  readonly active: number;
  readonly onActive: (index: number) => void;
  readonly applyEnsemble: (next: Ensemble) => void;
  /** Caisson en cours d'édition. */
  readonly project: Project;
  readonly history: History<ClosetConfig>;
  readonly selection: Selection;
  readonly onSelect: (s: Selection) => void;
  readonly onBuild: () => void;
}

const euros = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function DesignView(props: Props) {
  const { ensemble, ensembleProject, active, onActive, applyEnsemble, project, history, selection, onSelect, onBuild } = props;
  const [view, setView] = useState<ViewMode>('2d');
  const [doorMode, setDoorMode] = useState<DoorMode>('hidden');
  const selIndex = project.layout.columns.find((c) => c.id === selectedColumnId(selection))?.index ?? null;
  const s = ensembleProject.summary;
  const pickIssue = (issue: Issue) => {
    if (issue.caisson !== undefined && issue.caisson !== active) onActive(issue.caisson);
    const cols = ensembleProject.caissons[issue.caisson ?? active]?.project.layout.columns;
    if (issue.column !== undefined && cols?.[issue.column]) {
      onSelect({ kind: 'column', col: cols[issue.column].id });
      setView('2d');
    }
  };

  return (
    <div className="stage">
      <CaissonBar ensemble={ensemble} active={active} issues={ensembleProject.issues} onActive={onActive} apply={applyEnsemble} />
      <div className="stage__toolbar">
        <Segmented<ViewMode>
          ariaLabel="Vue"
          size="sm"
          value={view}
          options={[
            { value: '2d', label: <span className="seg-icon"><PenLine size={14} />Caisson</span> },
            { value: 'ensemble', label: <span className="seg-icon"><Columns3 size={14} />Ensemble</span> },
            { value: '3d', label: <span className="seg-icon"><Box size={14} />3D</span> },
          ]}
          onChange={setView}
        />
        <Segmented<DoorMode>
          ariaLabel="Portes"
          size="sm"
          value={view !== '3d' && doorMode === 'open' ? 'closed' : doorMode}
          options={[
            { value: 'hidden', label: 'Sans portes' },
            { value: 'closed', label: 'Fermées' },
            ...(view === '3d' ? [{ value: 'open' as const, label: 'Ouvertes' }] : []),
          ]}
          onChange={setDoorMode}
        />
        <span className="spacer" />
        <IssuesButton issues={ensembleProject.issues} onPick={pickIssue} />
      </div>

      <div className="stage__canvas">
        {view === '2d' && (
          <EditorCanvas project={project} history={history} selection={selection} onSelect={onSelect} showDoors={doorMode !== 'hidden'} />
        )}
        {view === 'ensemble' && (
          <div className="ensemble-views">
            <EnsembleFront project={ensembleProject} showDoors={doorMode !== 'hidden'} activeIndex={active} onPick={onActive} />
            <EnsembleTop project={ensembleProject} activeIndex={active} onPick={onActive} />
          </div>
        )}
        {view === '3d' && (
          <Suspense fallback={<div className="stage__loading">Chargement de la 3D…</div>}>
            <Canvas3D ensemble={ensembleProject} activeCaisson={active} doorMode={doorMode} selectedColumn={selIndex} onPickCaisson={onActive} />
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
        {view === 'ensemble' && <p className="stage__hint"><span>Clic sur un caisson : le modifier</span><span>Vue de face et vue de dessus, caissons alignés au mur</span></p>}
        {view === '3d' && <p className="stage__hint"><span>Clic : choisir un caisson</span><span>Glisser : tourner</span><span>Molette : zoomer</span><span>Clic droit : déplacer</span></p>}
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

function IssuesButton({ issues, onPick }: { readonly issues: readonly Issue[]; readonly onPick: (issue: Issue) => void }) {
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
                disabled={i.column === undefined && i.caisson === undefined}
                onClick={() => {
                  onPick(i);
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
