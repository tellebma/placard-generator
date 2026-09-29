import { caissonTag } from '../domain/ensemble';
import type { EnsembleProject, PlacedCaisson } from '../domain/ensembleProject';
import { maxHeight } from '../domain/geometry';
import { EnsembleFront, EnsembleTop } from '../drawing/EnsembleDrawing';
import { PlanDrawing } from '../drawing/PlanDrawing';
import { SideView } from '../drawing/SideView';
import { AssemblyGuide, ShoppingList, shoppingItems } from './Checklists';
import { CuttingBoards } from './CuttingBoards';
import { PiecesTable } from './PiecesTable';

const paper = { isChecked: () => false, toggle: () => undefined };

/** Page dédiée à un caisson de l'ensemble (plan + coupe), une par caisson à l'impression. */
function CaissonPrintPage({ caisson: c }: { readonly caisson: PlacedCaisson }) {
  return (
    <section className="print-page">
      <h2>
        {caissonTag(c.index)} — {c.label} ({c.cfg.width} × {maxHeight(c.cfg)} × {c.cfg.depth}){c.y > 0 ? ` · suspendu à ${c.y} mm du sol` : ''}
      </h2>
      <div className="print-plan">
        <PlanDrawing cfg={c.cfg} project={c.project} />
        <SideView cfg={c.cfg} layout={c.project.layout} />
      </div>
    </section>
  );
}

/** Plan d'ensemble ou plan unique, sur la première page. */
function OverviewPlan({ project }: { readonly project: EnsembleProject }) {
  const solo = project.caissons[0];
  if (project.caissons.length === 1) {
    return (
      <div className="print-plan">
        <PlanDrawing cfg={solo.cfg} project={solo.project} />
        <SideView cfg={solo.cfg} layout={solo.project.layout} />
      </div>
    );
  }
  return (
    <div className="print-plan">
      <EnsembleFront project={project} />
      <EnsembleTop project={project} />
    </div>
  );
}

/** Dossier complet, rendu uniquement à l'impression (cases vides à cocher sur papier). */
export function PrintDossier({ name, project }: { readonly name: string; readonly project: EnsembleProject }) {
  const n = project.caissons.length;
  const thickness = project.caissons[0]?.cfg.thickness ?? 0;
  return (
    <div className="print-dossier" aria-hidden="true">
      <section className="print-page">
        <header className="print-head">
          <h1>{name}</h1>
          <p>
            {project.width} × {project.height} × {project.depth} mm · {n} caisson{n > 1 ? 's' : ''} · panneaux {thickness} mm ·{' '}
            {project.summary.pieceCount} pièces · {new Date().toLocaleDateString('fr-FR')}
          </p>
        </header>
        <OverviewPlan project={project} />
      </section>
      {project.caissons.length > 1 && project.caissons.map((c) => <CaissonPrintPage key={c.index} caisson={c} />)}
      <section className="print-page">
        <h2>Liste de débit</h2>
        <PiecesTable pieces={project.pieces} checklist={paper} />
      </section>
      <section className="print-page">
        <h2>Plan de découpe</h2>
        <CuttingBoards packs={project.packs} pieces={project.pieces} />
      </section>
      <section className="print-page">
        <h2>Liste de courses</h2>
        <ShoppingList items={shoppingItems(project.packs, project.hardware)} checklist={paper} />
        <h2>Montage</h2>
        <AssemblyGuide steps={project.steps} checklist={paper} />
      </section>
    </div>
  );
}
