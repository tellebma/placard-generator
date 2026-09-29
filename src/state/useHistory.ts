import { useCallback, useMemo, useState } from 'react';

const MAX_HISTORY = 100;
const COALESCE_MS = 1200;

interface HistoryState<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly lastKey: string | null;
  readonly lastTime: number;
}

export interface SetOptions {
  /** Les modifications successives de même clé (saisie clavier) sont regroupées en une seule étape. */
  readonly coalesce?: string;
  /** Modification temporaire (glisser-déposer) : n'ajoute pas d'étape, à valider avec commitFrom. */
  readonly transient?: boolean;
}

export type Updater<T> = T | ((prev: T) => T);

export interface History<T> {
  readonly value: T;
  readonly set: (updater: Updater<T>, opts?: SetOptions) => void;
  /**
   * Enregistre `start` comme étape précédente si la valeur a changé depuis (fin de glisser-déposer).
   * Une fonction reçoit la valeur courante et renvoie l'état de départ à enregistrer.
   */
  readonly commitFrom: (start: Updater<T>) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

const pushPast = <T,>(past: readonly T[], value: T): readonly T[] => [...past.slice(-(MAX_HISTORY - 1)), value];

export function useHistory<T>(initial: () => T): History<T> {
  const [state, setState] = useState<HistoryState<T>>(() => ({
    past: [],
    present: initial(),
    future: [],
    lastKey: null,
    lastTime: 0,
  }));

  const set = useCallback((updater: Updater<T>, opts: SetOptions = {}) => {
    setState((s) => {
      const next = typeof updater === 'function' ? (updater as (prev: T) => T)(s.present) : updater;
      if (Object.is(next, s.present)) return s;
      if (opts.transient) return { ...s, present: next };
      const now = Date.now();
      const merge = opts.coalesce !== undefined && opts.coalesce === s.lastKey && now - s.lastTime < COALESCE_MS;
      return {
        past: merge ? s.past : pushPast(s.past, s.present),
        present: next,
        future: [],
        lastKey: opts.coalesce ?? null,
        lastTime: now,
      };
    });
  }, []);

  const commitFrom = useCallback((updater: Updater<T>) => {
    setState((s) => {
      const start = typeof updater === 'function' ? (updater as (present: T) => T)(s.present) : updater;
      return Object.is(s.present, start) ? s : { ...s, past: pushPast(s.past, start), future: [], lastKey: null };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const prev = s.past.at(-1);
      if (prev === undefined) return s;
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future], lastKey: null, lastTime: 0 };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      const [next, ...rest] = s.future;
      if (next === undefined) return s;
      return { past: pushPast(s.past, s.present), present: next, future: rest, lastKey: null, lastTime: 0 };
    });
  }, []);

  return useMemo(
    () => ({
      value: state.present,
      set,
      commitFrom,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state, set, commitFrom, undo, redo],
  );
}
