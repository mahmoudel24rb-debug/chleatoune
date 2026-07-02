// Un objet posé au sol (popcorn, graine…). Sa valeur est calculée au
// ramassage depuis les stats courantes, pas figée au spawn.

import type { MonnaieId } from '../data/config';

export interface Collectible {
  x: number;
  y: number;
  monnaie: MonnaieId;
  /** Âge en secondes, pour l'animation « pop » à l'apparition. */
  age: number;
  /** true = smiski doré (monnaie rare du désert). */
  dore?: boolean;
}
