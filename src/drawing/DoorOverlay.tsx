import type { DoorGeom } from '../domain/types';
import type { Frame } from './frame';

/** Portes en surimpression translucide avec charnières et poignées. */
export function DoorOverlay({ frame, doors }: { readonly frame: Frame; readonly doors: readonly DoorGeom[] }) {
  const { Y, u, points } = frame;
  return (
    <g className="doors" pointerEvents="none">
      {doors.map((d, i) => {
        const hingeX = d.hingeSide === 'left' ? d.x0 + 2 * u : d.x1 - 2 * u;
        const handleX = d.hingeSide === 'left' ? d.x1 - 3 * u : d.x0 + 3 * u;
        const top = Math.min(d.topLeft, d.topRight);
        const span = top - d.y0 - 200;
        const hingeYs = Array.from({ length: d.hinges }, (_, k) => d.y0 + 100 + (span * k) / (d.hinges - 1));
        const handleY = Math.min(d.y0 + 1000, (d.y0 + top) / 2);
        return (
          <g key={i} className="door">
            <polygon points={points([[d.x0, d.y0], [d.x1, d.y0], [d.x1, d.topRight], [d.x0, d.topLeft]])} />
            {hingeYs.map((y) => (
              <circle key={y} className="door__hinge" cx={hingeX} cy={Y(y)} r={1.1 * u} />
            ))}
            <line className="door__handle" x1={handleX} y1={Y(handleY - 5 * u)} x2={handleX} y2={Y(handleY + 5 * u)} />
          </g>
        );
      })}
    </g>
  );
}
