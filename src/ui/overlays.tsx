import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// --- Modale ---------------------------------------------------------------

interface ModalProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly onClose?: () => void;
  readonly children: ReactNode;
  readonly wide?: boolean;
}

export function Modal({ title, subtitle, onClose, children, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="text-2">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="btn btn--icon btn--ghost" onClick={onClose} aria-label="Fermer">
              <X size={18} />
            </button>
          )}
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

// --- Menu déroulant ----------------------------------------------------------

interface MenuProps {
  readonly trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  readonly children: (close: () => void) => ReactNode;
  readonly align?: 'left' | 'right';
}

export function Menu({ trigger, children, align = 'right' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={`menu__panel menu__panel--${align}`} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

// --- Notifications -----------------------------------------------------------

interface Toast {
  readonly id: number;
  readonly message: string;
  readonly action?: { readonly label: string; readonly run: () => void };
  readonly tone?: 'default' | 'error';
}

type Notify = (toast: Omit<Toast, 'id'>) => void;

const ToastContext = createContext<Notify>(() => undefined);

export const useToast = (): Notify => useContext(ToastContext);

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const notify = useCallback<Notify>(
    (toast) => {
      const id = nextId.current++;
      setToasts((ts) => [...ts.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.tone === 'error' ? ' toast--error' : ''}`}>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
