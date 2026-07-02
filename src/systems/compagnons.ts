// Les compagnons ramasseurs : les doughcats (partout, niveau de
// l'amélioration permanente « DOUGHCAT ») et Yuumi (gardienne de la
// forêt, débloquée au premier palier de l'arbre géant).

import { CONFIG, INDEX_FORET } from '../data/config';
import { jeu } from '../core/mode';
import { niveau, state } from '../core/state';
import { dist } from '../core/utils';
import { birb } from '../entities/birb';
import type { Collectible } from '../entities/collectible';
import { entitesZoneActive } from './spawner';
import { encaisserCollectible } from './economy';

export interface Compagnon {
  x: number;
  y: number;
  flip: boolean;
  animT: number;
  enMouvement: boolean;
  /** Combat : chaque doughcat a 25 % des stats de l'héroïne. */
  pv: number;
  pvMax: number;
  tAttaque: number;
  /** > 0 : K.O., temps restant avant respawn (s). */
  mortT: number;
}

export const PART_STATS_CHAT = 0.25;

function creerCompagnon(x: number, y: number): Compagnon {
  const pvMax = Math.ceil(state.stats.pvMax * PART_STATS_CHAT);
  return { x, y, flip: false, animT: 0, enMouvement: false, pv: pvMax, pvMax, tAttaque: 0, mortT: 0 };
}

const chats: Compagnon[] = [];
const yuumi: Compagnon = creerCompagnon(0, 0);
let yuumiPlacee = false;

const VITESSE_BASE = 170;
const RAYON_RAMASSAGE = 26;

export function getChats(): Compagnon[] {
  return chats;
}

export function getYuumi(): Compagnon | null {
  return yuumiActive() ? yuumi : null;
}

function yuumiActive(): boolean {
  return jeu.mode === 'monde' && state.save.nid >= 1 && state.save.zone === INDEX_FORET;
}

function avancer(c: Compagnon, cibleX: number, cibleY: number, dt: number, vitesse: number): void {
  const d = dist(c.x, c.y, cibleX, cibleY);
  if (d < 1) return;
  c.x += ((cibleX - c.x) / d) * vitesse * dt;
  c.y += ((cibleY - c.y) / d) * vitesse * dt;
  if (Math.abs(cibleX - c.x) > 2) c.flip = cibleX < c.x;
  c.enMouvement = true;
  c.animT += dt;
}

function piloterRamasseur(
  c: Compagnon,
  liste: Collectible[],
  prises: Set<Collectible>,
  dt: number,
  vitesse: number
): void {
  c.enMouvement = false;

  let cible: Collectible | null = null;
  let meilleure = Infinity;
  for (const objet of liste) {
    if (prises.has(objet)) continue;
    const d = dist(c.x, c.y, objet.x, objet.y);
    if (d < meilleure) {
      meilleure = d;
      cible = objet;
    }
  }

  if (cible) {
    prises.add(cible);
    avancer(c, cible.x, cible.y, dt, vitesse);
    if (dist(c.x, c.y, cible.x, cible.y) < RAYON_RAMASSAGE) {
      const index = liste.indexOf(cible);
      if (index >= 0) {
        liste.splice(index, 1);
        encaisserCollectible(cible);
      }
    }
  } else if (dist(c.x, c.y, birb.x, birb.y) > 110) {
    avancer(c, birb.x + 40, birb.y + 20, dt, vitesse);
  }

  c.x = Math.max(20, Math.min(CONFIG.monde.largeur - 20, c.x));
  c.y = Math.max(20, Math.min(CONFIG.monde.hauteur - 20, c.y));
}

/** Délai de respawn d'un doughcat K.O. : grandit avec le niveau. */
export function delaiRespawnChat(): number {
  return Math.min(120, 30 + state.save.heros.niveau * 0.5);
}

export function majCompagnons(dt: number): void {
  const vitesse = VITESSE_BASE * state.stats.vitesseChats;

  const nombre = niveau('p_doughcat');
  while (chats.length < nombre) {
    chats.push(
      creerCompagnon(birb.x + (Math.random() - 0.5) * 120, birb.y + (Math.random() - 0.5) * 120)
    );
  }
  chats.length = Math.min(chats.length, nombre);

  // Stats de combat suivies en continu (25 % de celles de l'héroïne)
  const pvMax = Math.ceil(state.stats.pvMax * PART_STATS_CHAT);
  for (const chat of [...chats, yuumi]) {
    chat.pvMax = pvMax;
    chat.tAttaque = Math.max(0, chat.tAttaque - dt);
    if (chat.mortT > 0) {
      // K.O. : le chat récupère puis réapparaît près de l'héroïne
      chat.mortT -= dt;
      if (chat.mortT <= 0) {
        chat.mortT = 0;
        chat.pv = chat.pvMax;
        chat.x = birb.x + (Math.random() - 0.5) * 100;
        chat.y = birb.y + (Math.random() - 0.5) * 100;
      }
      continue;
    }
    chat.pv = Math.min(chat.pvMax, chat.pv + state.stats.regen * PART_STATS_CHAT * dt);
  }

  // En expédition, c'est le système de combat qui pilote les chats.
  if (jeu.mode !== 'monde') return;
  const liste = entitesZoneActive();
  const prises = new Set<Collectible>();

  for (const chat of chats) {
    if (chat.mortT > 0) continue;
    piloterRamasseur(chat, liste, prises, dt, vitesse);
  }

  // Yuumi vit dans la forêt et y ramasse les brindilles.
  if (yuumiActive()) {
    if (!yuumiPlacee) {
      yuumi.x = birb.x + 80;
      yuumi.y = birb.y;
      yuumiPlacee = true;
    }
    piloterRamasseur(yuumi, liste, prises, dt, vitesse * 1.1);
  } else {
    yuumiPlacee = false;
  }
}
