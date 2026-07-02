// Le héros : déplacement 8 directions normalisé, clamp au monde (plan 03).

import { CONFIG } from '../data/config';
import { input } from '../core/input';
import { state } from '../core/state';
import { clamp } from '../core/utils';
import type { DirectionHeroine } from '../core/sprites';

export const birb = {
  x: CONFIG.monde.largeur / 2,
  y: CONFIG.monde.hauteur / 2,
  direction: 'face' as DirectionHeroine, // vue selon le dernier déplacement
  flip: false, // true = profil retourné (regarde à gauche)
  animT: 0,
  enMouvement: false,
  /** > 0 : la frame d'attaque est affichée (décrémenté chaque frame). */
  attaqueT: 0,
};

/** Centre du corps (la position x/y est aux pieds du sprite) —
 *  c'est d'ici que partent les hitbox de ramassage et de combat. */
export function centreBirb(): { x: number; y: number } {
  return { x: birb.x, y: birb.y - CONFIG.birb.centreCorpsY };
}

const MARGE = 20;

export function majBirb(dt: number): void {
  birb.attaqueT = Math.max(0, birb.attaqueT - dt);
  let ax = input.axeX();
  let ay = input.axeY();
  const longueur = Math.hypot(ax, ay);
  birb.enMouvement = longueur > 0;

  if (longueur > 0) {
    // Vecteur normalisé : les diagonales ne vont pas plus vite.
    ax /= longueur;
    ay /= longueur;
    const v = state.stats.vitesseBirb;
    birb.x += ax * v * dt;
    birb.y += ay * v * dt;
    // Vue selon l'axe dominant : côté > haut/bas (diagonales en profil).
    if (Math.abs(ax) >= Math.abs(ay)) {
      birb.direction = 'profil';
      birb.flip = ax < 0;
    } else {
      birb.direction = ay < 0 ? 'dos' : 'face';
      birb.flip = false;
    }
    birb.animT += dt;
  }

  birb.x = clamp(birb.x, MARGE, CONFIG.monde.largeur - MARGE);
  birb.y = clamp(birb.y, MARGE, CONFIG.monde.hauteur - MARGE);
}
