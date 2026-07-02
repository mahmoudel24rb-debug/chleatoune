// Caméra monde → écran : « écran = monde − caméra » (plan 02, pièges).

import { CONFIG } from '../data/config';

export const camera = { x: 0, y: 0 };

export function clampCamera(vueLargeur: number, vueHauteur: number): void {
  const { largeur, hauteur } = CONFIG.monde;
  camera.x =
    largeur <= vueLargeur
      ? (largeur - vueLargeur) / 2 // monde plus petit que l'écran : centré
      : Math.max(0, Math.min(largeur - vueLargeur, camera.x));
  camera.y =
    hauteur <= vueHauteur
      ? (hauteur - vueHauteur) / 2
      : Math.max(0, Math.min(hauteur - vueHauteur, camera.y));
}

/** Suivi avec lissage : cam += (cible − cam) × 8 × dt (plan 03, étape 5). */
export function suivreCamera(
  cibleX: number,
  cibleY: number,
  vueLargeur: number,
  vueHauteur: number,
  dt: number
): void {
  const cx = cibleX - vueLargeur / 2;
  const cy = cibleY - vueHauteur / 2;
  const f = Math.min(1, CONFIG.camera.lissage * dt);
  camera.x += (cx - camera.x) * f;
  camera.y += (cy - camera.y) * f;
  clampCamera(vueLargeur, vueHauteur);
}

export function centrerCamera(cibleX: number, cibleY: number, vueLargeur: number, vueHauteur: number): void {
  camera.x = cibleX - vueLargeur / 2;
  camera.y = cibleY - vueHauteur / 2;
  clampCamera(vueLargeur, vueHauteur);
}
