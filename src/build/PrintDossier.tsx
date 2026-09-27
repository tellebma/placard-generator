import { maxHeight } from '../domain/geometry';
import type { Project } from '../domain/project';
import type { ClosetConfig } from '../domain/types';
import { PlanDrawing } from '../drawing/PlanDrawing';
import { SideView } from '../drawing/SideView';
import { AssemblyGuide, ShoppingList, shoppingItems } from './Checklists';
import { CuttingBoards } from './CuttingBoards';
import { PiecesTable } from './PiecesTable';

const paper = { isChecked: () => false, toggle: () => undefined };

/** Dossier complet, rendu uniquement à l'impression (cases vides à cocher sur papier). */
export function PrintDossier({ cfg, project }: { readonly cfg: ClosetConfig; readonly project: Project }) {
  return (
    <div className="print-dossier" aria-hidden="true">
      <section className="print-page">
        <header className="print-head">
          <h1>{cfg.name}</h1>
          <p>
            {cfg.width} × {maxHeight(cfg)} × {cfg.depth} mm · {cfg.shape === 'sous-pente' ? 'sous-pente' : 'droit'} · panneaux {cfg.thickness} mm ·{' '}
            {project.summary.pieceCount} pièces · {new Date().toLocaleDateString('fr-FR')}
          </p>
        </header>
        <div className="print-plan">
          <PlanDrawing cfg={cfg} project={project} />
          <SideView cfg={cfg} layout={project.layout} />
        </div>
      </section>
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
