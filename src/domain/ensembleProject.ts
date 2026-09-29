import { computeAssembly, type AssemblyStep } from './assembly';
import { mergePieces, pieceIdentity, refLetter } from './cutlist';
import { caissonLabel, caissonTag, ensembleDepth, ensembleHeight, ensembleWidth, isSuspended, placements } from './ensemble';
import { maxHeight } from './geometry';
import type { HardwareItem } from './hardware';
import { packPieces, type PackingResult } from './packing';
import { computeProject, summarize, type Project, type Summary } from './project';
import type { ClosetConfig, Ensemble, Issue, NumberedPiece, Piece } from './types';
import { designIssues, packingIssues } from './validation';

export interface PlacedCaisson {
  readonly index: number;
  readonly label: string;
  readonly cfg: ClosetConfig;
  /** Calcul du caisson seul (références de pièces locales). */
  readonly project: Project;
  readonly x: number;
  /** Hauteur du dessous du caisson depuis le sol (caisson suspendu). */
  readonly y: number;
  readonly z: number;
}

/** Sorties globales d'un ensemble : même forme que Project pour le dossier de fabrication. */
export interface EnsembleProject {
  readonly caissons: readonly PlacedCaisson[];
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly pieces: readonly NumberedPiece[];
  readonly packs: readonly PackingResult[];
  readonly hardware: readonly HardwareItem[];
  readonly steps: readonly AssemblyStep[];
  readonly issues: readonly Issue[];
  readonly summary: Summary;
}

const tagWhere = (tag: string, where?: string): string => (where ? `${tag} ${where.split(', ').join(`, ${tag} `)}` : tag);

function globalPieces(caissons: readonly PlacedCaisson[]): NumberedPiece[] {
  const raw: Piece[] = caissons.flatMap((c) =>
    c.project.pieces.map(({ ref: _ref, ...p }) => ({ ...p, where: tagWhere(caissonTag(c.index), p.where) })),
  );
  return mergePieces(raw).map((p, i) => ({ ...p, ref: refLetter(i) }));
}

/** Pièces d'un caisson renumérotées avec les références globales (pour la notice de montage). */
const withGlobalRefs = (local: readonly NumberedPiece[], global: readonly NumberedPiece[]): NumberedPiece[] =>
  local.map((p) => ({ ...p, ref: global.find((g) => pieceIdentity(g) === pieceIdentity(p))?.ref ?? p.ref }));

const ANTI_TIP = 'Équerres de fixation murale (anti-basculement)';

/** Un caisson suspendu est porté par un rail mural plutôt que retenu par des équerres anti-basculement. */
function suspensionItems(caissons: readonly PlacedCaisson[]): HardwareItem[] {
  const hung = caissons.filter((c) => isSuspended(c.cfg));
  if (hung.length === 0) return [];
  return [{
    name: 'Rail de suspension et crochets pour meuble haut',
    qty: hung.length,
    note: hung.map((c) => `${caissonTag(c.index)} : rail de ${c.cfg.width - 2 * c.cfg.thickness} mm, dessous du caisson à ${c.y} mm du sol`).join(' · '),
  }];
}

function mergeHardware(caissons: readonly PlacedCaisson[]): HardwareItem[] {
  const tagged = caissons.flatMap((c) =>
    c.project.hardware.filter((h) => !(isSuspended(c.cfg) && h.name === ANTI_TIP)).map((h) => ({ ...h, note: h.note && h.name.startsWith('Tringle') ? tagWhere(caissonTag(c.index), h.note) : h.note })),
  );
  const merged = tagged.reduce<HardwareItem[]>((acc, h) => {
    const idx = acc.findIndex((a) => a.name === h.name);
    if (idx === -1) return [...acc, h];
    return acc.map((a, i) => {
      if (i !== idx) return a;
      const note = a.note === h.note || !h.note ? a.note : a.note ? `${a.note} · ${h.note}` : h.note;
      return { ...a, qty: a.qty + h.qty, note };
    });
  }, []);
  const joints = caissons.length - 1;
  const all = [...merged, ...suspensionItems(caissons)];
  return joints > 0
    ? [...all, {
        name: 'Vis à bois 4×30 (liaison entre caissons)',
        qty: joints * 4,
        note: '4 par jonction, vissées depuis l\'intérieur à travers les deux côtés accolés',
      }]
    : all;
}

const PER_CAISSON = new Set(['Perçages avant assemblage', 'Assemblage du caisson (à plat, au sol)', 'Équerrage et fond']);

function joinStep(caissons: readonly PlacedCaisson[]): AssemblyStep {
  return {
    title: 'Liaison des caissons',
    details: [
      `Mettre les caissons en place de gauche à droite : ${caissons.map((c) => `${caissonTag(c.index)} ${c.label} (${c.cfg.width} mm)`).join(', ')}.`,
      'Tous les caissons sont plaqués contre le mur du fond : les moins profonds sont en retrait en façade.',
      'Caler chaque caisson au niveau, aligner les socles, serrer deux côtés voisins au serre-joint puis les visser ensemble depuis l\'intérieur (vis plus courtes que deux épaisseurs de panneau).',
      ...caissons.filter((c) => isSuspended(c.cfg)).map((c) =>
        `${caissonTag(c.index)} ${c.label} est suspendu : poser d'abord les caissons au sol, tracer au niveau le dessous à ${c.y} mm du sol, fixer le rail au mur (chevilles adaptées au support), accrocher le caisson puis le visser aux côtés de ses voisins.`,
      ),
    ],
  };
}

function ensembleSteps(caissons: readonly PlacedCaisson[], pieces: readonly NumberedPiece[]): AssemblyStep[] {
  const perCaisson = caissons.map((c) =>
    computeAssembly(c.cfg, c.project.layout, c.project.doors, withGlobalRefs(c.project.pieces, pieces)),
  );
  if (caissons.length === 1) return perCaisson[0];
  const common = (title: string): AssemblyStep | null => {
    const found = perCaisson.flatMap((steps) => steps.filter((s) => s.title === title));
    return found.length === 0 ? null : { title, details: [...new Set(found.flatMap((s) => s.details))] };
  };
  const titles = [...new Set(perCaisson.flat().map((s) => s.title))];
  const before = titles.slice(0, titles.findIndex((t) => PER_CAISSON.has(t)));
  const after = titles.filter((t) => !PER_CAISSON.has(t) && !before.includes(t));
  const built = perCaisson.flatMap((steps, i) =>
    steps.filter((s) => PER_CAISSON.has(s.title)).map((s) => ({ ...s, title: `${caissonTag(i)} ${caissons[i].label} — ${s.title}` })),
  );
  const pick = (ts: readonly string[]) => ts.map(common).filter((s): s is AssemblyStep => s !== null);
  return [...pick(before), ...built, joinStep(caissons), ...pick(after)];
}

const top = (c: PlacedCaisson): number => c.y + maxHeight(c.cfg);

/** Côté d'un caisson laissé visible par un voisin moins haut, moins profond ou suspendu (niche, passage). */
function exposedSide(big: PlacedCaisson, small: PlacedCaisson, side: 'gauche' | 'droit'): Issue[] {
  const extraDepth = big.cfg.depth - small.cfg.depth;
  const below = Math.min(top(big), small.y) - big.y;
  const above = top(big) - Math.max(big.y, top(small));
  const parts = [
    extraDepth > 0 ? `${extraDepth} mm en façade` : null,
    below > 0 ? `${below} mm en dessous` : null,
    above > 0 ? `${above} mm au-dessus` : null,
  ].filter(Boolean);
  if (parts.length === 0) return [];
  return [{
    level: 'info',
    caisson: big.index,
    message: `${caissonTag(big.index)} ${big.label} : son côté ${side} reste visible à côté de ${caissonTag(small.index)} (${parts.join(', ')}). Prévoir une face propre (chant, finition).`,
  }];
}

function nicheIssues(caissons: readonly PlacedCaisson[]): Issue[] {
  return caissons.slice(1).flatMap((right, i) => {
    const left = caissons[i];
    return [...exposedSide(left, right, 'droit'), ...exposedSide(right, left, 'gauche')];
  });
}

function ensembleIssues(caissons: readonly PlacedCaisson[], packs: readonly PackingResult[]): Issue[] {
  const multi = caissons.length > 1;
  const own = caissons.flatMap((c) =>
    designIssues(c.cfg, c.project.layout, c.project.doors).map((issue) => ({
      ...issue,
      caisson: c.index,
      message: multi ? `${caissonTag(c.index)} ${c.label} — ${issue.message}` : issue.message,
    })),
  );
  return [...own, ...(multi ? nicheIssues(caissons) : []), ...packingIssues(packs)];
}

export function computeEnsemble(e: Ensemble): EnsembleProject {
  const places = placements(e);
  const caissons = e.caissons.map((cfg, index) => ({
    index,
    label: caissonLabel(cfg, index),
    cfg,
    project: computeProject(cfg),
    ...places[index],
  }));
  const ref = e.caissons[0];
  const pieces = globalPieces(caissons);
  const packs = [
    packPieces(pieces, 'panneau', ref.thickness, ref.board),
    ...(ref.backThickness > 0 ? [packPieces(pieces, 'fond', ref.backThickness, ref.backBoard)] : []),
  ];
  return {
    caissons,
    width: ensembleWidth(e),
    height: ensembleHeight(e),
    depth: ensembleDepth(e),
    pieces,
    packs,
    hardware: mergeHardware(caissons),
    steps: ensembleSteps(caissons, pieces),
    issues: ensembleIssues(caissons, packs),
    summary: summarize(ref, pieces, packs),
  };
}
