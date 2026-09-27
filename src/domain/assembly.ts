import { bottomY, maxHeight, type Layout } from './geometry';
import type { ClosetConfig, DoorGeom, NumberedPiece } from './types';

export interface AssemblyStep {
  readonly title: string;
  readonly details: readonly string[];
}

const refsOf = (pieces: readonly NumberedPiece[], ...names: string[]): string => {
  const refs = pieces.filter((p) => names.some((n) => p.name.startsWith(n))).map((p) => p.ref);
  return refs.length > 0 ? ` (${refs.join(', ')})` : '';
};

/** Diagonale du meuble couché : hauteur sous plafond minimale pour le redresser. */
export const tiltDiagonal = (cfg: ClosetConfig): number =>
  Math.ceil(Math.hypot(maxHeight(cfg), cfg.depth));

function drillingStep(cfg: ClosetConfig, layout: Layout, doors: readonly DoorGeom[]): AssemblyStep {
  const hasShelves = layout.columns.some((c) => c.config.shelves.length > 0);
  const rods = layout.columns.filter((c) => c.config.rodHeight !== null);
  return {
    title: 'Perçages avant assemblage',
    details: [
      ...(hasShelves
        ? [
            'Taquets : sur les côtés et séparations, percer des rangées de trous Ø5 à 37 mm du bord avant et du bord arrière, entraxe 32 mm (un gabarit de perçage fait gagner beaucoup de temps).',
            `Profondeur 10 mm maximum. Sur une séparation percée des deux côtés, décaler les trous de 16 mm d'une face à l'autre pour ne pas traverser le panneau de ${cfg.thickness} mm.`,
            'Les cotes des étagères du plan sont mesurées depuis le dessus du bas du caisson.',
          ]
        : []),
      ...rods.map(
        (c) =>
          `Tringle col. ${c.index + 1} : pré-percer les supports à ${c.config.rodHeight} mm au-dessus du bas (soit ${Math.round((c.config.rodHeight ?? 0) + bottomY(cfg))} mm du sol), centrés en profondeur.`,
      ),
      ...(doors.length > 0
        ? [
            'Portes : percer les cuvettes de charnière Ø35, profondeur 12-13 mm, axe à 22,5 mm du chant (vérifier la notice des charnières), la première et la dernière à 100 mm des extrémités.',
          ]
        : []),
    ],
  };
}

function carcassStep(cfg: ClosetConfig, layout: Layout, pieces: readonly NumberedPiece[]): AssemblyStep {
  return {
    title: 'Assemblage du caisson (à plat, au sol)',
    details: [
      `Poser un côté${refsOf(pieces, 'Côté')} à plat, face intérieure vers le haut, sur un sol propre (carton ou couverture).`,
      `Fixer le bas${refsOf(pieces, 'Bas')} de façon à ce que son dessus soit à ${bottomY(cfg)} mm du bas du côté.`,
      ...(cfg.plinth > 0
        ? [`Fixer le socle avant et arrière${refsOf(pieces, 'Socle')} sous le bas, affleurant les chants avant et arrière.`]
        : []),
      `Fixer le dessus${refsOf(pieces, 'Dessus')} en haut du côté.`,
      ...(layout.separations.length > 0
        ? [
            `Glisser les séparations${refsOf(pieces, 'Séparation')} entre bas et dessus, et les visser au travers du bas et du dessus. Positions (bord gauche, depuis l'extérieur gauche) : ${layout.separations.map((x) => `${Math.round(x)} mm`).join(', ')}.`,
          ]
        : []),
      'Poser le second côté et le visser.',
    ],
  };
}

export function computeAssembly(
  cfg: ClosetConfig,
  layout: Layout,
  doors: readonly DoorGeom[],
  pieces: readonly NumberedPiece[],
): AssemblyStep[] {
  return [
    {
      title: 'Préparation',
      details: [
        'Vérifier chaque pièce avec la liste de débit et noter sa référence au crayon sur un chant non visible.',
        'Pour une découpe en magasin, apporter le plan de découpe : les coupes sont prévues en bandes (scie à panneaux).',
      ],
    },
    {
      title: 'Chants',
      details: [
        'Plaquer le chant thermocollant sur les bords indiqués dans la colonne « Chants » AVANT l\'assemblage (fer à repasser, puis araser au cutter/rabot à chants).',
      ],
    },
    drillingStep(cfg, layout, doors),
    carcassStep(cfg, layout, pieces),
    {
      title: 'Équerrage et fond',
      details: [
        'Mesurer les deux diagonales du caisson : elles doivent être égales (à 2 mm près). Sinon, pousser sur l\'angle le plus long.',
        ...(cfg.backThickness > 0
          ? [`Clouer/visser le fond${refsOf(pieces, 'Fond')} sur l'arrière du caisson. Les jonctions entre panneaux de fond tombent au milieu d'une séparation.`]
          : []),
      ],
    },
    {
      title: 'Mise en place',
      details: [
        `Pour redresser le meuble il faut une hauteur sous plafond d'au moins ${tiltDiagonal(cfg)} mm (diagonale du caisson). Sinon, assembler debout ou en place.`,
        'Caler au niveau (cales sous le socle), puis fixer au mur avec les équerres anti-basculement.',
      ],
    },
    {
      title: 'Aménagement',
      details: ['Poser les taquets et les étagères, puis la tringle sur ses supports.'],
    },
    ...(doors.length > 0
      ? [{
          title: 'Portes',
          details: [
            'Visser les embases dans le caisson, clipser les portes, puis régler les charnières (3 vis : hauteur, profondeur, latéral) pour obtenir un jeu régulier de ' +
              `${cfg.doorGap} mm.`,
          ],
        }]
      : []),
  ];
}
