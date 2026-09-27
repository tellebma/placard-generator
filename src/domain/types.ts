/** Toutes les dimensions sont en millimètres. */

export type Shape = 'droit' | 'sous-pente';
export type DoorCount = 0 | 1 | 2;

export interface ColumnConfig {
  readonly id: string;
  /** Largeur intérieure fixe, ou null pour une répartition automatique. */
  readonly width: number | null;
  /** Hauteur du dessous de chaque étagère, mesurée depuis le dessus du bas du caisson. */
  readonly shelves: readonly number[];
  /** Hauteur de la tringle depuis le dessus du bas, ou null si pas de penderie. */
  readonly rodHeight: number | null;
  readonly doors: DoorCount;
}

export interface BoardSpec {
  readonly length: number;
  readonly width: number;
  /** Épaisseur du trait de scie. */
  readonly kerf: number;
}

export interface Prices {
  /** Prix d'un panneau brut (€). */
  readonly board: number;
  /** Prix d'un panneau de fond brut (€). */
  readonly backBoard: number;
  /** Prix du chant au mètre (€). */
  readonly edge: number;
}

export interface ClosetConfig {
  readonly name: string;
  readonly shape: Shape;
  /** Largeur extérieure totale. */
  readonly width: number;
  /** Hauteur extérieure côté gauche. */
  readonly heightLeft: number;
  /** Hauteur extérieure côté droit (utilisée uniquement en sous-pente). */
  readonly heightRight: number;
  /** Profondeur totale, fond compris. */
  readonly depth: number;
  /** Épaisseur des panneaux du caisson et des portes. */
  readonly thickness: number;
  /** Épaisseur du fond (0 = sans fond). */
  readonly backThickness: number;
  /** Hauteur du socle (0 = sans socle). */
  readonly plinth: number;
  /** Jeu autour des portes. */
  readonly doorGap: number;
  readonly board: BoardSpec;
  readonly backBoard: BoardSpec;
  readonly prices: Prices;
  readonly columns: readonly ColumnConfig[];
}

export type Material = 'panneau' | 'fond';
export type EdgeCount = 0 | 1 | 2;

export interface Piece {
  readonly name: string;
  readonly material: Material;
  readonly qty: number;
  readonly length: number;
  readonly width: number;
  readonly thickness: number;
  /** Nombre de chants à plaquer sur les grands côtés. */
  readonly edgeLong: EdgeCount;
  /** Nombre de chants à plaquer sur les petits côtés. */
  readonly edgeShort: EdgeCount;
  readonly note?: string;
  readonly where?: string;
}

export interface NumberedPiece extends Piece {
  readonly ref: string;
}

export type HingeType = 'applique' | 'semi-applique';

export interface DoorGeom {
  readonly columnIndex: number;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly topLeft: number;
  readonly topRight: number;
  readonly hingeSide: 'left' | 'right';
  readonly hingeType: HingeType;
  readonly hinges: number;
}

export interface Issue {
  readonly level: 'error' | 'warning' | 'info';
  readonly message: string;
  /** Index de la colonne concernée, le cas échéant. */
  readonly column?: number;
}
