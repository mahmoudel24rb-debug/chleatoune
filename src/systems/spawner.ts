// Apparition des collectibles (plan 04) : un spawner par zone (plan 06),
// seule la zone active tourne. Délai, cap et valeur sont lus depuis les
// stats dérivées des améliorations, jamais en dur.

import { CONFIG, ZONES } from '../data/config';
import type { Collectible } from '../entities/collectible';
import { birb } from '../entities/birb';
import { state } from '../core/state';
import { clamp, dist } from '../core/utils';

const parZone: Collectible[][] = ZONES.map(() => []);
const timers: number[] = ZONES.map(() => 0);

export function entitesZoneActive(): Collectible[] {
  return parZone[state.save.zone];
}

export function majSpawner(dt: number): void {
  const zi = state.save.zone;
  const zone = ZONES[zi];
  if (zone.donjon) return; // pas de collectibles au hall du donjon
  const liste = parZone[zi];

  // Le désert doré a ses propres réglages : dense et rapide, avec un
  // remplissage éclair à l'arrivée (le désert doit déborder d'or).
  const cap = zone.dore ? 30 : state.stats.monnaies[zone.monnaie].cap;
  const delai = zone.dore
    ? (liste.length < 15 ? 0.08 : 0.5) / (state.save.desert['d_irrigation'] ? 1.5 : 1)
    : state.stats.monnaies[zone.monnaie].delai;

  timers[zi] += dt;
  if (timers[zi] < delai) return;
  timers[zi] = 0;
  if (liste.length >= cap) return;

  // Position dans un anneau autour du birb : jamais collée (ramassage
  // instantané, plan 04) mais jamais à l'autre bout du monde non plus,
  // sinon on ne trouve rien en début de partie.
  const marge = 40;
  const angle = Math.random() * Math.PI * 2;
  const rayon =
    CONFIG.spawn.distanceMinBirb +
    Math.random() * (CONFIG.spawn.distanceMaxBirb - CONFIG.spawn.distanceMinBirb);
  const x = clamp(birb.x + Math.cos(angle) * rayon, marge, CONFIG.monde.largeur - marge);
  const y = clamp(birb.y + Math.sin(angle) * rayon, marge, CONFIG.monde.hauteur - marge);
  if (dist(x, y, birb.x, birb.y) < CONFIG.spawn.distanceMinBirb) return;

  // « Cœur du désert » : 2 % de smiski doré dans les autres zones.
  const dore = zone.dore || (state.save.desert['d_prairie'] === true && Math.random() < 0.02);
  liste.push({ x, y, monnaie: zone.monnaie, age: 0, dore });
}

/** Au rebirb : on repart sur des prairies vides. */
export function viderCollectibles(): void {
  for (const liste of parZone) liste.length = 0;
  timers.fill(0);
}
