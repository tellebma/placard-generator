import { AlertTriangle, Download, LayoutGrid, ListChecks, Printer, Ruler, ShoppingCart, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { caissonTag } from '../domain/ensemble';
import type { EnsembleProject, PlacedCaisson } from '../domain/ensembleProject';
import { maxHeight } from '../domain/geometry';
import { EnsembleFront, EnsembleTop } from '../drawing/EnsembleDrawing';
import { PlanDrawing } from '../drawing/PlanDrawing';
import { SideView } from '../drawing/SideView';
import { useChecklist } from '../state/useChecklist';
import { AssemblyGuide, ShoppingList, shoppingItems } from './Checklists';
import { CuttingBoards } from './CuttingBoards';
import { PiecesTable, pieceKey } from './PiecesTable';

type SectionId = 'plan' | 'pieces' | 'cutting' | 'shopping' | 'assembly';

interface Props {
  readonly name: string;
  readonly project: EnsembleProject;
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

function CaissonCard({ caisson: c, active }: { readonly caisson: PlacedCaisson; readonly active: boolean }) {
  return (
    <div id={`caisson-${c.index}`} className={`card plan-grid__unit${active ? ' is-active' : ''}`}>
      <h3 className="plan-grid__unit-title">
        {caissonTag(c.index)} — {c.label} ({c.cfg.width} × {maxHeight(c.cfg)} × {c.cfg.depth}){c.y > 0 ? ` · suspendu à ${c.y} mm du sol` : ''}
      </h3>
      <div className="plan-grid__unit-body">
        <PlanDrawing cfg={c.cfg} project={c.project} showDoors={false} />
        <SideView cfg={c.cfg} layout={c.project.layout} />
      </div>
    </div>
  );
}

function PlanSection({ project }: { readonly project: EnsembleProject }) {
  const [active, setActive] = useState<number | undefined>(undefined);
  const pick = (index: number) => {
    setActive(index);
    document.getElementById(`caisson-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const solo = project.caissons[0];

  return (
    <div className="plan-grid">
      {project.caissons.length === 1 ? (
        <>
          <div className="card"><PlanDrawing cfg={solo.cfg} project={solo.project} showDoors={false} /></div>
          <div className="card"><SideView cfg={solo.cfg} layout={solo.project.layout} /></div>
        </>
      ) : (
        <>
          <div className="card plan-grid__wide"><EnsembleFront project={project} activeIndex={active} onPick={pick} /></div>
          <div className="card plan-grid__wide plan-grid__top"><EnsembleTop project={project} activeIndex={active} onPick={pick} /></div>
          <div className="plan-grid__units">
            {project.caissons.map((c) => (
              <CaissonCard key={c.index} caisson={c} active={active === c.index} />
            ))}
          </div>
        </>
      )}
      <p className="text-3 small plan-grid__note">
        Cotes en mm. Largeurs de colonnes = intérieur. Hauteur des étagères = dessous de l'étagère, depuis le dessus du bas.
      </p>
    </div>
  );
}

export function BuildView({ name, project, onPrint, onCsv, onFix }: Props) {
  const [section, setSection] = useState<SectionId>('plan');
  const cut = useChecklist('pieces');
  const shop = useChecklist('shopping');
  const build = useChecklist('assembly');
  const items = shoppingItems(project.packs, project.hardware);
  const errors = project.issues.filter((i) => i.level === 'error');
  const caissonCount = project.caissons.length;
  const thickness = project.caissons[0]?.cfg.thickness ?? 0;

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
            <h1>{name}</h1>
            <p className="text-2 mono small">
              {project.width} × {project.height} × {project.depth} mm · {caissonCount} caisson{caissonCount > 1 ? 's' : ''} · {project.summary.pieceCount} pièces · {thickness} mm
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

        {section === 'plan' && <PlanSection project={project} />}
        {section === 'pieces' && <PiecesTable pieces={project.pieces} checklist={cut} />}
        {section === 'cutting' && <CuttingBoards packs={project.packs} pieces={project.pieces} />}
        {section === 'shopping' && <ShoppingList items={items} checklist={shop} />}
        {section === 'assembly' && <AssemblyGuide steps={project.steps} checklist={build} />}
      </div>
    </div>
  );
}
