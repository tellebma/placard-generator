import { columnInnerHeight, maxHeight, type ColumnLayout, type Layout } from './geometry';
import type { PackingResult } from './packing';
import type { ClosetConfig, DoorGeom, Issue } from './types';

const MIN_COLUMN_WIDTH = 150;
const SHELF_SAG_LIMIT = 900;
const ROD_CLEARANCE = 40;
const HANGER_DEPTH = 550;

function globalIssues(cfg: ClosetConfig): Issue[] {
  const issues: Issue[] = [];
  if (cfg.width < 300 || maxHeight(cfg) < 300 || cfg.depth < 200) {
    issues.push({ level: 'error', message: 'Dimensions trop petites (min. 300 × 300 × 200 mm).' });
  }
  if (cfg.thickness < 10 || cfg.thickness > 40) {
    issues.push({ level: 'error', message: "L'épaisseur des panneaux doit être comprise entre 10 et 40 mm." });
  }
  if (cfg.columns.length === 0) {
    issues.push({ level: 'error', message: 'Ajoute au moins une colonne.' });
  }
  if (cfg.plinth === 0 && cfg.elevation === 0 && cfg.columns.some((c) => c.doors > 0)) {
    issues.push({ level: 'warning', message: 'Sans socle, le bas des portes est au ras du sol : un socle de 60 à 100 mm est recommandé.' });
  }
  return issues;
}

function shelfIssues(cfg: ClosetConfig, col: ColumnLayout, label: string): Issue[] {
  const column = col.index;
  const inner = columnInnerHeight(cfg, col);
  const sorted = [...col.config.shelves].sort((a, b) => a - b);
  const issues: Issue[] = [];
  if (sorted.some((h) => h <= 0 || h + cfg.thickness > inner)) {
    issues.push({ level: 'error', column, message: `${label} : une étagère sort du caisson (hauteur intérieure ${Math.round(inner)} mm).` });
  }
  if (sorted.some((h, i) => i > 0 && h - sorted[i - 1] < cfg.thickness + 50)) {
    issues.push({ level: 'warning', column, message: `${label} : deux étagères sont espacées de moins de 5 cm.` });
  }
  if (sorted.length > 0 && col.width > SHELF_SAG_LIMIT) {
    issues.push({ level: 'warning', column, message: `${label} : étagères de ${Math.round(col.width)} mm, risque de flèche. Au-delà de ${SHELF_SAG_LIMIT} mm, ajouter une séparation ou un renfort.` });
  }
  return issues;
}

function rodIssues(cfg: ClosetConfig, layout: Layout, col: ColumnLayout, label: string): Issue[] {
  const column = col.index;
  const rod = col.config.rodHeight;
  if (rod === null) return [];
  const inner = columnInnerHeight(cfg, col);
  const shelfAbove = col.config.shelves.filter((h) => h > rod).sort((a, b) => a - b)[0];
  const limit = (shelfAbove ?? inner) - ROD_CLEARANCE;
  const issues: Issue[] = [];
  if (rod <= 0 || rod > limit) {
    issues.push({ level: 'error', column, message: `${label} : la tringle doit être au moins ${ROD_CLEARANCE} mm sous l'étagère ou le dessus (max ${Math.round(limit)} mm).` });
  }
  if (layout.caissonDepth < HANGER_DEPTH) {
    issues.push({ level: 'warning', column, message: `${label} : profondeur ${layout.caissonDepth} mm, les cintres (~${HANGER_DEPTH} mm) risquent de frotter.` });
  }
  return issues;
}

function columnIssues(cfg: ClosetConfig, layout: Layout): Issue[] {
  return layout.columns.flatMap((col) => {
    const label = `Colonne ${col.index + 1}`;
    const widthIssue: Issue[] =
      col.width < MIN_COLUMN_WIDTH
        ? [{ level: 'error', column: col.index, message: `${label} : largeur ${Math.round(col.width)} mm, trop étroite (min. ${MIN_COLUMN_WIDTH} mm). Réduis les largeurs fixes.` }]
        : [];
    return [...widthIssue, ...shelfIssues(cfg, col, label), ...rodIssues(cfg, layout, col, label)];
  });
}

function doorIssues(doors: readonly DoorGeom[]): Issue[] {
  const wideColumns = [...new Set(doors.filter((d) => d.x1 - d.x0 > 650).map((d) => d.columnIndex))];
  return wideColumns.map((column) => ({
    level: 'warning' as const,
    column,
    message: `Colonne ${column + 1} : porte de plus de 650 mm de large, préfère 2 portes.`,
  }));
}

export function packingIssues(packs: readonly PackingResult[]): Issue[] {
  return packs
    .filter((p) => p.oversize.length > 0)
    .map((p) => ({
      level: 'warning' as const,
      message: `Pièce(s) ${p.oversize.join(', ')} plus grande(s) que le panneau brut ${p.spec.length} × ${p.spec.width} : prévoir un panneau plus grand ou une jonction${p.material === 'fond' ? ' (sur une étagère fixe pour le fond)' : ''}.`,
    }));
}

/** Problèmes de conception d'un caisson, indépendants du calepinage. */
export function designIssues(cfg: ClosetConfig, layout: Layout, doors: readonly DoorGeom[]): Issue[] {
  return [...globalIssues(cfg), ...columnIssues(cfg, layout), ...doorIssues(doors)];
}

export function validate(
  cfg: ClosetConfig,
  layout: Layout,
  doors: readonly DoorGeom[],
  packs: readonly PackingResult[],
): Issue[] {
  return [...designIssues(cfg, layout, doors), ...packingIssues(packs)];
}
