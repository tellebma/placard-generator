import { useMemo } from 'react';
import { replaceCaisson, updateCaisson } from '../domain/ensemble';
import type { ClosetConfig, Ensemble } from '../domain/types';
import type { History, Updater } from './useHistory';

/**
 * Vue de l'historique de l'ensemble centrée sur un caisson : les éditeurs existants
 * travaillent sur un ClosetConfig, chaque modification reste une étape de l'ensemble.
 */
export function useFocusedHistory(history: History<Ensemble>, index: number): History<ClosetConfig> {
  return useMemo(() => {
    const resolve = (updater: Updater<ClosetConfig>, current: ClosetConfig): ClosetConfig =>
      typeof updater === 'function' ? updater(current) : updater;
    return {
      value: history.value.caissons[index],
      set: (updater, opts) => history.set((e) => updateCaisson(e, index, resolve(updater, e.caissons[index])), opts),
      commitFrom: (start) =>
        history.commitFrom((e) => replaceCaisson(e, index, resolve(start, e.caissons[index]))),
      undo: history.undo,
      redo: history.redo,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
    };
  }, [history, index]);
}
