// Rendu des sprites de poissons AC-style (plan 17 §7) depuis les cartes
// de data/poissons-sprites.ts. Cache par (espèce, frame, shiny, zoom).
// Shiny = palette éclaircie une fois au chargement (jamais par frame).

import { CARTES_POISSONS } from '../data/poissons-sprites';
import { creerSprite } from './sprites';

const cache = new Map<string, HTMLCanvasElement>();

/** Éclaircit un #rrggbb vers le blanc (palette shiny). */
function eclaircir(hex: string, force = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * force));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * force));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * force));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function spritePoisson(id: string, frame: 0 | 1, zoom = 3, shiny = false): HTMLCanvasElement | null {
  const carte = CARTES_POISSONS[id];
  if (!carte) return null;
  const cle = `${id}_${frame}_${zoom}_${shiny ? 's' : 'n'}`;
  const existant = cache.get(cle);
  if (existant) return existant;
  const palette = shiny
    ? Object.fromEntries(Object.entries(carte.palette).map(([k, v]) => [k, eclaircir(v)]))
    : carte.palette;
  const sprite = creerSprite(carte.frames[frame], palette, zoom);
  cache.set(cle, sprite);
  return sprite;
}
