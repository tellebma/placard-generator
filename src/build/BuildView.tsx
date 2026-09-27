import { AlertTriangle, Download, LayoutGrid, ListChecks, Printer, Ruler, ShoppingCart, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { maxHeight } from '../domain/geometry';
import type { Project } from '../domain/project';
import type { ClosetConfig } from '../domain/types';
import { PlanDrawing } from '../drawing/PlanDrawing';
import { SideView } from '../drawing/SideView';
import { useChecklist } from '../state/useChecklist';
import { AssemblyGuide, ShoppingList, shoppingItems } from './Checklists';
import { CuttingBoards } from './CuttingBoards';
import { PiecesTable, pieceKey } from './PiecesTable';

type SectionId = 'plan' | 'pieces' | 'cutting' | 'shopping' | 'assembly';

interface Props {
  readonly cfg: ClosetConfig;
  readonly project: Project;
  readonly onPrint: () => void;
  readonly onCsv: () => void;
  readonly onFix: () => void;
}

const Progress = ({ done, total }: { readonly done: number; readonly total: number }) => (
  <span className={`progress${done === total && total > 0 ? ' is-complete' : ''}`}>
    <span className="progress__bar"><span style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} /></span>
    <span className="mono small">{done}/{total}</span>
  </span>
);

export function BuildView({ cfg, project, onPrint, onCsv, onFix }: Props) {
  const [section, setSection] = useState<SectionId>('plan');
  const cut = useChecklist('pieces');
  const shop = useChecklist('shopping');
  const build = useChecklist('assembly');
  const items = shoppingItems(project.packs, project.hardware);
  const errors = project.issues.filter((i) => i.level === 'error');

  const nav: readonly { id: SectionId; label: string; icon: ReactNode; progress?: ReactNode }[] = [
    { id: 'plan', label: 'Plan coté', icon: <Ruler size={17} /> },
    { id: 'pieces', label: 'Liste de débit', icon: <Table2 size={17} />, progress: <Progress done={cut.count(project.pieces.map(pieceKey))} total={project.pieces.length} /> },
    { id: 'cutting', label: 'Plan de découpe', icon: <LayoutGrid size={17} /> },
    { id: 'shopping', label: 'Liste de courses', icon: <ShoppingCart size={17} />, progress: <Progress done={shop.count(items.map((i) => i.id))} total={items.length} /> },
    { id: 'assembly', label: 'Montage', icon: <ListChecks size={17} />, progress: <Progress done={build.count(project.steps.map((s) => s.title))} total={project.steps.length} /> },
  ];

  return (
    <div className="build">
      <nav className="build__nav" aria-label="Sections du dossier">
        {nav.map((n) => (
          <button key={n.id} type="button" className={`build__link${section === n.id ? ' is-active' : ''}`} aria-current={section === n.id} onClick={() => setSection(n.id)}>
            {n.icon}
            <span className="build__label">{n.label}</span>
            {n.progress}
          </button>
        ))}
      </nav>

      <div className="build__main">
        <header className="build__head">
          <div>
            <h1>{cfg.name}</h1>
            <p className="text-2 mono small">
              {cfg.width} × {maxHeight(cfg)} × {cfg.depth} mm · {project.summary.pieceCount} pièces · {cfg.thickness} mm
            </p>
          </div>
          <div className="build__actions">
            <button type="button" className="btn" onClick={onCsv}><Download size={16} /> CSV</button>
            <button type="button" className="btn btn--primary" onClick={onPrint}><Printer size={16} /> Imprimer le dossier</button>
          </div>
        </header>

        {errors.length > 0 && (
          <div className="callout callout--error callout--row">
            <AlertTriangle size={16} />
            <span>{errors.length} erreur{errors.length > 1 ? 's' : ''} dans la conception : corrige-les avant de découper.</span>
            <button type="button" className="btn btn--sm" onClick={onFix}>Corriger</button>
          </div>
        )}

        {section === 'plan' && (
          <div className="plan-grid">
            <div className="card"><PlanDrawing cfg={cfg} project={project} showDoors={false} /></div>
            <div className="card"><SideView cfg={cfg} layout={project.layout} /></div>
            <p className="text-3 small plan-grid__note">
              Cotes en mm. Largeurs de colonnes = intérieur. Hauteur des étagères = dessous de l'étagère, depuis le dessus du bas.
            </p>
          </div>
        )}
        {section === 'pieces' && <PiecesTable pieces={project.pieces} checklist={cut} />}
        {section === 'cutting' && <CuttingBoards packs={project.packs} pieces={project.pieces} />}
        {section === 'shopping' && <ShoppingList items={items} checklist={shop} />}
        {section === 'assembly' && <AssemblyGuide steps={project.steps} checklist={build} />}
      </div>
    </div>
  );
}
