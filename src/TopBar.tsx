import { Download, FileJson, FilePlus2, FolderOpen, Hammer, Menu as MenuIcon, PencilRuler, Printer, Redo2, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ClosetConfig } from './domain/types';
import type { History } from './state/useHistory';
import { Segmented } from './ui/controls';
import { Menu } from './ui/overlays';

export type Mode = 'design' | 'build';

interface Props {
  readonly history: History<ClosetConfig>;
  readonly mode: Mode;
  readonly onMode: (mode: Mode) => void;
  readonly hasErrors: boolean;
  readonly onNew: () => void;
  readonly onOpen: () => void;
  readonly onSave: () => void;
  readonly onCsv: () => void;
  readonly onPrint: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

function MenuItem({ icon, label, shortcut, onClick }: { icon: ReactNode; label: string; shortcut?: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" className="menu__item" onClick={onClick}>
      {icon}
      <span>{label}</span>
      {shortcut && <kbd className="kbd">{shortcut}</kbd>}
    </button>
  );
}

export function TopBar({ history, mode, onMode, hasErrors, onNew, onOpen, onSave, onCsv, onPrint }: Props) {
  const cfg = history.value;
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <svg viewBox="0 0 32 32" className="logo" aria-hidden="true">
          <rect x="5" y="3" width="22" height="26" rx="2.5" />
          <line x1="16" y1="3" x2="16" y2="29" />
          <line x1="13" y1="14" x2="13" y2="18" />
          <line x1="19" y1="14" x2="19" y2="18" />
        </svg>
        <input
          className="topbar__name"
          value={cfg.name}
          aria-label="Nom du projet"
          onChange={(e) => history.set({ ...cfg, name: e.target.value }, { coalesce: 'name' })}
        />
      </div>

      <Segmented<Mode>
        ariaLabel="Mode"
        value={mode}
        options={[
          { value: 'design', label: <span className="seg-icon"><PencilRuler size={15} />Concevoir</span> },
          {
            value: 'build',
            label: (
              <span className="seg-icon">
                <Hammer size={15} />Fabriquer{hasErrors && <span className="dot dot--error" aria-label="erreurs" />}
              </span>
            ),
          },
        ]}
        onChange={onMode}
      />

      <div className="topbar__actions">
        <button type="button" className="btn btn--icon btn--ghost" disabled={!history.canUndo} onClick={history.undo} title={`Annuler (${mod}+Z)`} aria-label="Annuler">
          <Undo2 size={17} />
        </button>
        <button type="button" className="btn btn--icon btn--ghost" disabled={!history.canRedo} onClick={history.redo} title={`Rétablir (${mod}+Maj+Z)`} aria-label="Rétablir">
          <Redo2 size={17} />
        </button>
        <span className="topbar__sep" />
        <button type="button" className="btn btn--ghost hide-sm" onClick={onPrint}>
          <Printer size={16} /> Imprimer
        </button>
        <Menu
          trigger={({ toggle, open }) => (
            <button type="button" className="btn btn--icon btn--ghost" aria-label="Fichier" aria-expanded={open} onClick={toggle}>
              <MenuIcon size={18} />
            </button>
          )}
        >
          {(close) => {
            const run = (fn: () => void) => () => { close(); fn(); };
            return (
              <>
                <MenuItem icon={<FilePlus2 size={16} />} label="Nouveau placard…" onClick={run(onNew)} />
                <MenuItem icon={<FolderOpen size={16} />} label="Ouvrir un fichier…" shortcut={`${mod}+O`} onClick={run(onOpen)} />
                <MenuItem icon={<FileJson size={16} />} label="Enregistrer (.json)" shortcut={`${mod}+S`} onClick={run(onSave)} />
                <div className="menu__sep" />
                <MenuItem icon={<Download size={16} />} label="Exporter le débit (.csv)" onClick={run(onCsv)} />
                <MenuItem icon={<Printer size={16} />} label="Imprimer / PDF" shortcut={`${mod}+P`} onClick={run(onPrint)} />
              </>
            );
          }}
        </Menu>
      </div>
    </header>
  );
}
