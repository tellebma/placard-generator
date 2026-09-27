import { parseConfig } from './domain/defaults';
import type { ClosetConfig, NumberedPiece } from './domain/types';

const STORAGE_KEY = 'placard-builder:config';

export function loadStoredConfig(): ClosetConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseConfig(JSON.parse(raw)) : null;
  } catch (err) {
    console.warn('Configuration sauvegardée illisible, valeurs par défaut utilisées.', err);
    return null;
  }
}

export function storeConfig(cfg: ClosetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.warn('Impossible de sauvegarder la configuration.', err);
  }
}

const slug = (name: string): string =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'placard';

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(cfg: ClosetConfig): void {
  download(`${slug(cfg.name)}.json`, JSON.stringify(cfg, null, 2), 'application/json');
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV au format Excel français (séparateur « ; », BOM UTF-8). */
export function exportCsv(cfg: ClosetConfig, pieces: readonly NumberedPiece[]): void {
  const header = ['Réf', 'Pièce', 'Qté', 'Longueur', 'Largeur', 'Épaisseur', 'Matériau', 'Chants L', 'Chants l', 'Emplacement', 'Remarque'];
  const rows = pieces.map((p) => [
    p.ref, p.name, p.qty, p.length, p.width, p.thickness, p.material, p.edgeLong, p.edgeShort, p.where ?? '', p.note ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
  download(`${slug(cfg.name)}-debit.csv`, `﻿${csv}`, 'text/csv;charset=utf-8');
}

export async function importJson(file: File): Promise<ClosetConfig> {
  const text = await file.text();
  const cfg = parseConfig(JSON.parse(text));
  if (!cfg) throw new Error("Ce fichier n'est pas une configuration de placard valide.");
  return cfg;
}
