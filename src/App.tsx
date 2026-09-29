import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BuildView } from './build/BuildView';
import { PrintDossier } from './build/PrintDossier';
import { ClosetPanel } from './design/ClosetPanel';
import { DesignView } from './design/DesignView';
import { Inspector } from './design/Inspector';
import { PresetsModal } from './design/PresetsModal';
import { computeEnsemble } from './domain/ensembleProject';
import { PRESETS } from './domain/presets';
import { computeProject } from './domain/project';
import type { ClosetConfig, Ensemble } from './domain/types';
import { exportCsv, exportJson, importJson, loadStoredEnsemble, storeEnsemble } from './io';
import { NONE, sanitizeSelection, type Selection } from './state/selection';
import { useFocusedHistory } from './state/useFocusedHistory';
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
  const [stored] = useState(() => loadStoredEnsemble());
  const history = useHistory<Ensemble>(() => stored ?? PRESETS[0].build());
  const [showPresets, setShowPresets] = useState(stored === null);
  const [mode, setMode] = useState<Mode>('design');
  const [rawActive, setRawActive] = useState(0);
  const [rawSelection, setSelection] = useState<Selection>(NONE);
  const fileInput = useRef<HTMLInputElement>(null);
  const notify = useToast();

  const ensemble = history.value;
  const active = Math.min(rawActive, ensemble.caissons.length - 1);
  const focused = useFocusedHistory(history, active);
  const cfg = focused.value;
  const selection = sanitizeSelection(rawSelection, cfg);
  const project = useMemo(() => computeProject(cfg), [cfg]);
  const ensembleProject = useMemo(() => computeEnsemble(ensemble), [ensemble]);
  const hasErrors = ensembleProject.issues.some((i) => i.level === 'error');

  useEffect(() => storeEnsemble(ensemble), [ensemble]);
  useEffect(() => {
    document.title = `${ensemble.name} · Configurateur de placard`;
  }, [ensemble.name]);

  const apply = useCallback((next: ClosetConfig, opts?: SetOptions) => focused.set(next, opts), [focused]);
  const applyEnsemble = useCallback((next: Ensemble) => history.set(next), [history]);
  const onActive = useCallback((index: number) => {
    setRawActive(index);
    setSelection(NONE);
  }, []);

  const replaceAll = (next: Ensemble) => {
    history.set(next);
    setRawActive(0);
    setSelection(NONE);
  };

  const pickPreset = (next: Ensemble) => {
    const firstRun = stored === null && !history.canUndo;
    replaceAll(next);
    setShowPresets(false);
    setMode('design');
    if (!firstRun) notify({ message: `Nouveau projet « ${next.name} »`, action: { label: 'Annuler', run: history.undo } });
  };

  const onSave = useCallback(() => {
    exportJson(ensemble);
    notify({ message: 'Projet enregistré dans vos téléchargements.' });
  }, [ensemble, notify]);

  const onOpen = useCallback(() => fileInput.current?.click(), []);
  const onCsv = () => exportCsv(ensemble.name, ensembleProject.pieces);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      replaceAll(await importJson(file));
      notify({ message: `« ${file.name} » ouvert.`, action: { label: 'Annuler', run: history.undo } });
    } catch (err) {
      notify({ message: err instanceof Error ? err.message : 'Import impossible.', tone: 'error' });
    }
  };

  useShortcuts({ history: focused, selection, setSelection, project, onSave, onOpen, enabled: mode === 'design' && !showPresets });

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
        onCsv={onCsv}
        onPrint={() => window.print()}
      />

      {mode === 'design' ? (
        <div className="workspace">
          <aside className="panel panel--left" aria-label="Forme et dimensions">
            <ClosetPanel
              key={cfg.id}
              cfg={cfg}
              shared={ensemble.caissons.length > 1}
              onChange={(patch, key) => focused.set((c) => ({ ...c, ...patch }), { coalesce: `${cfg.id}.${key}` })}
            />
          </aside>
          <main className="stage-wrap">
            <DesignView
              ensemble={ensemble}
              ensembleProject={ensembleProject}
              active={active}
              onActive={onActive}
              applyEnsemble={applyEnsemble}
              project={project}
              history={focused}
              selection={selection}
              onSelect={setSelection}
              onBuild={() => setMode('build')}
            />
          </main>
          <aside className="panel panel--right" aria-label="Aménagement">
            <Inspector cfg={cfg} project={project} selection={selection} onSelect={setSelection} apply={apply} />
          </aside>
        </div>
      ) : (
        <BuildView
          name={ensemble.name}
          project={ensembleProject}
          onPrint={() => window.print()}
          onCsv={onCsv}
          onFix={() => setMode('design')}
        />
      )}

      <PrintDossier name={ensemble.name} project={ensembleProject} />

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
