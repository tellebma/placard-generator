import { defaultConfig, newColumn } from './defaults';
import { singleEnsemble } from './ensemble';
import type { ClosetConfig, Ensemble } from './types';

export interface Preset {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly build: () => Ensemble;
}

interface SinglePreset extends Omit<Preset, 'build'> {
  readonly build: () => ClosetConfig;
}

/** Trois caissons : deux colonnes hautes encadrant un meuble suspendu au-dessus d'une porte, plaqué au mur. */
function niche(): Ensemble {
  const base = defaultConfig();
  const caisson = (name: string, width: number, height: number, depth: number, doors: 1 | 2, elevation = 0): ClosetConfig => ({
    ...base,
    id: `${base.id}-${name}`,
    name,
    width,
    heightLeft: height,
    heightRight: height,
    depth,
    elevation,
    plinth: elevation > 0 ? 0 : base.plinth,
    columns: [newColumn({ doors })],
  });
  return {
    name: 'Placard trois caissons',
    caissons: [
      caisson('Colonne gauche', 1000, 2400, 600, 2),
      caisson('Au-dessus de la porte', 800, 400, 300, 2, 2000),
      caisson('Colonne droite', 600, 2400, 600, 1),
    ],
  };
}

const SINGLE_PRESETS: readonly SinglePreset[] = [
  {
    id: 'dressing',
    title: 'Dressing',
    description: 'Une penderie et deux colonnes d\'étagères, portes battantes.',
    build: () => ({ ...defaultConfig(), name: 'Dressing' }),
  },
  {
    id: 'sous-pente',
    title: 'Sous-pente',
    description: 'Pour les combles : la hauteur diminue d\'un côté à l\'autre.',
    build: () => ({
      ...defaultConfig(),
      name: 'Placard sous-pente',
      shape: 'sous-pente',
      width: 2400,
      heightLeft: 2200,
      heightRight: 1000,
      depth: 600,
      columns: [
        newColumn({ width: 800, shelves: [1560], rodHeight: 1500, doors: 2 }),
        newColumn({ shelves: [400, 800, 1150], doors: 2 }),
        newColumn({ shelves: [350], doors: 2 }),
      ],
    }),
  },
  {
    id: 'entree',
    title: 'Placard d\'entrée',
    description: 'Manteaux et chaussures : penderie et rangements, 1,20 m de large.',
    build: () => ({
      ...defaultConfig(),
      name: 'Placard d\'entrée',
      width: 1200,
      columns: [
        newColumn({ shelves: [1900], rodHeight: 1840, doors: 1 }),
        newColumn({ shelves: [200, 400, 900, 1400, 1900], doors: 1 }),
      ],
    }),
  },
  {
    id: 'bibliotheque',
    title: 'Bibliothèque',
    description: 'Colonnes ouvertes peu profondes, sans portes.',
    build: () => ({
      ...defaultConfig(),
      name: 'Bibliothèque',
      width: 1800,
      heightLeft: 2200,
      depth: 330,
      plinth: 60,
      columns: [0, 1, 2, 3].map(() => newColumn({ shelves: [330, 680, 1030, 1380, 1730], doors: 0 })),
    }),
  },
  {
    id: 'vide',
    title: 'Partir de zéro',
    description: 'Un simple caisson, à aménager librement.',
    build: () => ({
      ...defaultConfig(),
      name: 'Mon placard',
      width: 1000,
      columns: [newColumn({ doors: 2 })],
    }),
  },
];

export const PRESETS: readonly Preset[] = [
  {
    id: 'niche',
    title: 'Trois caissons',
    description: 'Deux colonnes de 2,40 m encadrant un meuble suspendu au-dessus d\'une porte, plaqué au mur.',
    build: niche,
  },
  ...SINGLE_PRESETS.map((p) => ({ ...p, build: () => singleEnsemble(p.build()) })),
];
