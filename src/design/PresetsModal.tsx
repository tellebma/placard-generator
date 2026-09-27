import { useMemo } from 'react';
import { PRESETS, type Preset } from '../domain/presets';
import { computeProject } from '../domain/project';
import type { ClosetConfig } from '../domain/types';
import { PlanDrawing } from '../drawing/PlanDrawing';
import { Modal } from '../ui/overlays';

interface Props {
  readonly onPick: (cfg: ClosetConfig) => void;
  readonly onClose?: () => void;
}

function PresetCard({ preset, onPick }: { readonly preset: Preset; readonly onPick: (cfg: ClosetConfig) => void }) {
  const cfg = useMemo(() => preset.build(), [preset]);
  const project = useMemo(() => computeProject(cfg), [cfg]);
  return (
    <button type="button" className="preset" onClick={() => onPick(preset.build())}>
      <span className="preset__thumb">
        <PlanDrawing cfg={cfg} project={project} showDoors={false} thumbnail />
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
