/** Lignes de cote en coordonnées SVG (y vers le bas). */

interface HProps {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly label: string;
  readonly fs: number;
}

export function HDim({ x1, x2, y, label, fs }: HProps) {
  const t = fs * 0.5;
  return (
    <g className="dim">
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - t} x2={x1} y2={y + t} />
      <line x1={x2} y1={y - t} x2={x2} y2={y + t} />
      <text x={(x1 + x2) / 2} y={y - fs * 0.35} fontSize={fs} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

interface VProps {
  readonly y1: number;
  readonly y2: number;
  readonly x: number;
  readonly label: string;
  readonly fs: number;
}

export function VDim({ y1, y2, x, label, fs }: VProps) {
  const t = fs * 0.5;
  const cy = (y1 + y2) / 2;
  return (
    <g className="dim">
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <line x1={x - t} y1={y1} x2={x + t} y2={y1} />
      <line x1={x - t} y1={y2} x2={x + t} y2={y2} />
      <text x={x - fs * 0.35} y={cy} fontSize={fs} textAnchor="middle" transform={`rotate(-90 ${x - fs * 0.35} ${cy})`}>
        {label}
      </text>
    </g>
  );
}
