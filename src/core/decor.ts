// Décor procédural seedé, généré UNE FOIS par palette dans un canvas
// offscreen puis blitté à chaque frame (plan 02, étape 4 et pièges).
// Sert aux zones du monde ET aux biomes d'expédition.

import { BIOMES_EXPEDITION, CONFIG, ZONES, type BiomeDef } from '../data/config';
import { mulberry32 } from './utils';

const cache = new Map<string, HTMLCanvasElement>();

function genererDecor(palette: BiomeDef, graine: number): HTMLCanvasElement {
  const { largeur, hauteur } = CONFIG.monde;
  const px = 4; // taille d'un « pixel » de décor

  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext('2d')!;
  const alea = mulberry32(graine);

  // Fond uni
  ctx.fillStyle = palette.fond;
  ctx.fillRect(0, 0, largeur, hauteur);

  // Bruit : petites taches plus claires / plus foncées
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = alea() < 0.5 ? palette.fonce : palette.clair;
    ctx.fillRect(Math.floor(alea() * largeur), Math.floor(alea() * hauteur), px, px);
  }

  // Touffes : 2 à 4 pixels groupés à la verticale
  for (let i = 0; i < 700; i++) {
    const x = Math.floor(alea() * largeur);
    const y = Math.floor(alea() * hauteur);
    const taille = 2 + Math.floor(alea() * 3);
    for (let j = 0; j < taille; j++) {
      ctx.fillStyle = alea() < 0.5 ? palette.fonce : palette.clair;
      ctx.fillRect(x + Math.floor(alea() * 3 - 1) * px, y - j * px, px, px);
    }
  }

  // Fleurs / props : croix colorée + cœur clair
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(alea() * (largeur - 3 * px)) + px;
    const y = Math.floor(alea() * (hauteur - 3 * px)) + px;
    const couleur = palette.fleurs[Math.floor(alea() * palette.fleurs.length)];
    ctx.fillStyle = couleur;
    ctx.fillRect(x - px, y, px, px);
    ctx.fillRect(x + px, y, px, px);
    ctx.fillRect(x, y - px, px, px);
    ctx.fillRect(x, y + px, px, px);
    ctx.fillStyle = '#fff6c9';
    ctx.fillRect(x, y, px, px);
  }

  return canvas;
}

export function decorZone(zoneIndex: number): HTMLCanvasElement {
  const cle = `zone-${zoneIndex}`;
  let canvas = cache.get(cle);
  if (!canvas) {
    canvas = genererDecor(ZONES[zoneIndex], 1234 + zoneIndex * 999);
    cache.set(cle, canvas);
  }
  return canvas;
}

/** Décor d'un étage d'expédition : les biomes tournent en boucle. */
export function decorExpedition(etage: number): HTMLCanvasElement {
  const biome = (etage - 1) % BIOMES_EXPEDITION.length;
  const cle = `biome-${biome}`;
  let canvas = cache.get(cle);
  if (!canvas) {
    canvas = genererDecor(BIOMES_EXPEDITION[biome], 7777 + biome * 313);
    cache.set(cle, canvas);
  }
  return canvas;
}

export function biomeEtage(etage: number): BiomeDef {
  return BIOMES_EXPEDITION[(etage - 1) % BIOMES_EXPEDITION.length];
}
