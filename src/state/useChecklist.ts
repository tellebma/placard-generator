import { useCallback, useEffect, useState } from 'react';

const read = (key: string): readonly string[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch (err) {
    console.warn(`Liste « ${key} » illisible, elle est réinitialisée.`, err);
    return [];
  }
};

/** Ensemble de cases cochées persistant (suivi d'atelier : pièces découpées, achats, étapes). */
export function useChecklist(name: string) {
  const key = `placard-builder:check:${name}`;
  const [checked, setChecked] = useState<readonly string[]>(() => read(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(checked));
    } catch (err) {
      console.warn('Impossible de sauvegarder la progression.', err);
    }
  }, [key, checked]);

  const toggle = useCallback(
    (id: string) => setChecked((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id])),
    [],
  );
  const clear = useCallback(() => setChecked([]), []);
  const isChecked = useCallback((id: string) => checked.includes(id), [checked]);

  return { isChecked, toggle, clear, count: (ids: readonly string[]) => ids.filter((id) => checked.includes(id)).length };
}
