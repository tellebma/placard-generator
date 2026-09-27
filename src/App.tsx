import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuildView } from './build/BuildView';
import { PrintDossier } from './build/PrintDossier';
import { ClosetPanel } from './design/ClosetPanel';
import { DesignView } from './design/DesignView';
import { Inspector } from './design/Inspector';
import { PresetsModal } from './design/PresetsModal';
import { PRESETS } from './domain/presets';
import { computeProject } from './domain/project';
import type { ClosetConfig } from './domain/types';
import { exportCsv, exportJson, importJson, loadStoredConfig, storeConfig } from './io';
import { NONE, sanitizeSelection, type Selection } from './state/selection';
import { useHistory, type SetOptions } from './state/useHistory';
import { useShortcuts } from './state/useShortcuts';
import { TopBar, type Mode } from './TopBar';
import { ToastProvider, useToast } from './ui/overlays';

export default function App() {
  return (
    <ToastProvider>
      <Workspace />
    </ToastProvider>
  );
}

function Workspace() {
  const [stored] = useState(() => loadStoredConfig());
  const history = useHistory<ClosetConfig>(() => stored ?? PRESETS[0].build());
  const [showPresets, setShowPresets] = useState(stored === null);
  const [mode, setMode] = useState<Mode>('design');
  const [rawSelection, setSelection] = useState<Selection>(NONE);
  const fileInput = useRef<HTMLInputElement>(null);
  const notify = useToast();

  const cfg = history.value;
  const selection = sanitizeSelection(rawSelection, cfg);
  const project = useMemo(() => computeProject(cfg), [cfg]);
  const hasErrors = project.issues.some((i) => i.level === 'error');

  useEffect(() => storeConfig(cfg), [cfg]);
  useEffect(() => {
    document.title = `${cfg.name} · Configurateur de placard`;
  }, [cfg.name]);

  const apply = useCallback((next: ClosetConfig, opts?: SetOptions) => history.set(next, opts), [history]);

  const pickPreset = (next: ClosetConfig) => {
    const firstRun = stored === null && !history.canUndo;
    history.set(next);
    setSelection(NONE);
    setShowPresets(false);
    setMode('design');
    if (!firstRun) notify({ message: `Nouveau projet « ${next.name} »`, action: { label: 'Annuler', run: history.undo } });
  };

  const onSave = useCallback(() => {
    exportJson(cfg);
    notify({ message: 'Projet enregistré dans vos téléchargements.' });
  }, [cfg, notify]);

  const onOpen = useCallback(() => fileInput.current?.click(), []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      history.set(await importJson(file));
      setSelection(NONE);
      notify({ message: `« ${file.name} » ouvert.`, action: { label: 'Annuler', run: history.undo } });
    } catch (err) {
      notify({ message: err instanceof Error ? err.message : 'Import impossible.', tone: 'error' });
    }
  };

  useShortcuts({ history, selection, setSelection, project, onSave, onOpen, enabled: mode === 'design' && !showPresets });

  return (
    <div className={`app app--${mode}`}>
      <TopBar
        history={history}
        mode={mode}
        onMode={setMode}
        hasErrors={hasErrors}
        onNew={() => setShowPresets(true)}
        onOpen={onOpen}
        onSave={onSave}
        onCsv={() => exportCsv(cfg, project.pieces)}
        onPrint={() => window.print()}
      />

      {mode === 'design' ? (
        <div className="workspace">
          <aside className="panel panel--left" aria-label="Forme et dimensions">
            <ClosetPanel cfg={cfg} onChange={(patch, key) => history.set((c) => ({ ...c, ...patch }), { coalesce: key })} />
          </aside>
          <main className="stage-wrap">
            <DesignView project={project} history={history} selection={selection} onSelect={setSelection} onBuild={() => setMode('build')} />
          </main>
          <aside className="panel panel--right" aria-label="Aménagement">
            <Inspector cfg={cfg} project={project} selection={selection} onSelect={setSelection} apply={apply} />
          </aside>
        </div>
      ) : (
        <BuildView
          cfg={cfg}
          project={project}
          onPrint={() => window.print()}
          onCsv={() => exportCsv(cfg, project.pieces)}
          onFix={() => setMode('design')}
        />
      )}

      <PrintDossier cfg={cfg} project={project} />

      {showPresets && <PresetsModal onPick={pickPreset} onClose={() => setShowPresets(false)} />}

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
