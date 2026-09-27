import type { BoardSpec, ClosetConfig, ColumnConfig, DoorCount, Prices, Shape } from './types';

export const newId = (): string => Math.random().toString(36).slice(2, 10);

export const newColumn = (patch: Partial<ColumnConfig> = {}): ColumnConfig => ({
  id: newId(),
  width: null,
  shelves: [],
  rodHeight: null,
  doors: 1,
  ...patch,
});

export const defaultConfig = (): ClosetConfig => ({
  name: 'Mon placard',
  shape: 'droit',
  width: 2000,
  heightLeft: 2400,
  heightRight: 1400,
  depth: 600,
  thickness: 18,
  backThickness: 3,
  plinth: 80,
  doorGap: 3,
  board: { length: 2800, width: 2070, kerf: 4 },
  backBoard: { length: 2440, width: 1220, kerf: 4 },
  prices: { board: 65, backBoard: 18, edge: 0.8 },
  columns: [
    newColumn({ width: 900, shelves: [1800], rodHeight: 1740, doors: 2 }),
    newColumn({ shelves: [350, 700, 1050, 1400, 1800] }),
    newColumn({ shelves: [450, 900, 1350, 1800] }),
  ],
});

/** Répartit n étagères régulièrement sur une hauteur intérieure. */
export const evenShelves = (count: number, innerHeight: number, thickness: number): number[] => {
  const step = (innerHeight + thickness) / (count + 1);
  return Array.from({ length: count }, (_, i) => Math.round(step * (i + 1) - thickness));
};

// --- Lecture sécurisée (localStorage, import de fichier) ---

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

function parseBoard(raw: unknown, fallback: BoardSpec): BoardSpec {
  const o = obj(raw);
  return { length: num(o.length, fallback.length), width: num(o.width, fallback.width), kerf: num(o.kerf, fallback.kerf) };
}

function parsePrices(raw: unknown, fallback: Prices): Prices {
  const o = obj(raw);
  return { board: num(o.board, fallback.board), backBoard: num(o.backBoard, fallback.backBoard), edge: num(o.edge, fallback.edge) };
}

function parseColumn(raw: unknown): ColumnConfig {
  const o = obj(raw);
  const doors = [0, 1, 2].includes(o.doors as number) ? (o.doors as DoorCount) : 1;
  return {
    id: typeof o.id === 'string' ? o.id : newId(),
    width: typeof o.width === 'number' && Number.isFinite(o.width) ? o.width : null,
    shelves: Array.isArray(o.shelves) ? o.shelves.filter((s): s is number => typeof s === 'number' && Number.isFinite(s)) : [],
    rodHeight: typeof o.rodHeight === 'number' && Number.isFinite(o.rodHeight) ? o.rodHeight : null,
    doors,
  };
}

export function parseConfig(raw: unknown): ClosetConfig | null {
  const o = obj(raw);
  if (!Array.isArray(o.columns)) return null;
  const d = defaultConfig();
  const shape: Shape = o.shape === 'sous-pente' ? 'sous-pente' : 'droit';
  return {
    name: typeof o.name === 'string' ? o.name : d.name,
    shape,
    width: num(o.width, d.width),
    heightLeft: num(o.heightLeft, d.heightLeft),
    heightRight: num(o.heightRight, d.heightRight),
    depth: num(o.depth, d.depth),
    thickness: num(o.thickness, d.thickness),
    backThickness: num(o.backThickness, d.backThickness),
    plinth: num(o.plinth, d.plinth),
    doorGap: num(o.doorGap, d.doorGap),
    board: parseBoard(o.board, d.board),
    backBoard: parseBoard(o.backBoard, d.backBoard),
    prices: parsePrices(o.prices, d.prices),
    columns: o.columns.map(parseColumn),
  };
}
