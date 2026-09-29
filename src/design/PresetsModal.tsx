import { useMemo } from 'react';
import { computeEnsemble } from '../domain/ensembleProject';
import { PRESETS, type Preset } from '../domain/presets';
import type { Ensemble } from '../domain/types';
import { EnsembleFront } from '../drawing/EnsembleDrawing';
import { Modal } from '../ui/overlays';

interface Props {
  readonly onPick: (ensemble: Ensemble) => void;
  readonly onClose?: () => void;
}

function PresetCard({ preset, onPick }: { readonly preset: Preset; readonly onPick: (ensemble: Ensemble) => void }) {
  const project = useMemo(() => computeEnsemble(preset.build()), [preset]);
  return (
    <button type="button" className="preset" onClick={() => onPick(preset.build())}>
      <span className="preset__thumb">
        <EnsembleFront project={project} thumbnail />
      </span>
      <strong>{preset.title}</strong>
      <span className="text-2 small">{preset.description}</span>
    </button>
  );
}

export function PresetsModal({ onPick, onClose }: Props) {
  return (
    <Modal
      title="Nouveau placard"
      subtitle="Choisissez un point de départ : tout reste modifiable ensuite."
      onClose={onClose}
      wide
    >
      <div className="presets">
        {PRESETS.map((p) => (
          <PresetCard key={p.id} preset={p} onPick={onPick} />
        ))}
      </div>
    </Modal>
  );
}
