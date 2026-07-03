// Compagnons de biome (plan 13) : chaque biome a SON espèce, qui récolte
// dans son biome — en direct quand la joueuse y est, statistiquement
// sinon (jeu ouvert ; jeu fermé = gains hors-ligne du nid, inchangés).
// À 4/4 unités, une espèce débloque sa COPIE DE COMBAT à rôle, qui peut
// rejoindre l'escouade des donjons (max SWARM.compagnons.escouadeMax).
// Yuumi reste la gardienne unique du nid (palier 1), non achetable.

import { CONFIG, INDEX_FORET, ZONES } from '../data/config';
import {
  COMPAGNONS_BIOMES,
  UNITES_MAX,
  especeParZone,
  type CompagnonBiomeDef,
  type RoleCombat,
} from '../data/compagnons-biomes';
import { SWARM } from '../data/swarm';
import { jeu } from '../core/mode';
import { state } from '../core/state';
import { dist } from '../core/utils';
import { birb } from '../entities/birb';
import type { Collectible } from '../entities/collectible';
import { entitesZoneActive } from './spawner';
import { crediter, crediterDore, encaisserCollectible } from './economy';
import { multPatee } from './besace';

export interface Compagnon {
  /** id d'espèce ('prairie', 'scene'…) ou 'yuumi' */
  espece: string;
  x: number;
  y: number;
  flip: boolean;
  animT: number;
  enMouvement: boolean;
  /** copies de combat uniquement */
  role: RoleCombat | null;
  pv: number;
  pvMax: number;
  degats: number;
  tAttaque: number;
  /** > 0 : K.O., temps restant avant respawn (s). */
  mortT: number;
}

function creerCompagnon(espece: string, x: number, y: number): Compagnon {
  return {
    espece, x, y, flip: false, animT: 0, enMouvement: false,
    role: null, pv: 1, pvMax: 1, degats: 0, tAttaque: 0, mortT: 0,
  };
}

// ------------------------------------------------------------- unités

export function unites(espece: string): number {
  return state.save.compagnons[espece] ?? 0;
}

export function copieDebloquee(espece: string): boolean {
  return unites(espece) >= UNITES_MAX;
}

/** Les espèces dont la copie de combat est débloquée (4/4). */
export function especesCombat(): CompagnonBiomeDef[] {
  return COMPAGNONS_BIOMES.filter((c) => copieDebloquee(c.id));
}

function vitesseEspece(espece: string): number {
  return (SWARM.compagnons.vitesse[espece] ?? SWARM.compagnons.vitesse.defaut) * multPatee(espece);
}

// --------------------------------------------- ramasseurs (zone active)

const ramasseurs: Compagnon[] = [];
let zoneRamasseurs = -1;

const yuumi = creerCompagnon('yuumi', 0, 0);
let yuumiPlacee = false;

export function getRamasseurs(): Compagnon[] {
  return ramasseurs;
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
    if (dist(c.x, c.y, cible.x, cible.y) < 26) {
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

// ------------------------------------- récolte statistique (plan 13 §4b)

let accTick = 0;

/** Biomes où des compagnons récoltent « à distance » en ce moment. */
export function biomesEnRecolte(): number {
  let n = 0;
  for (const def of COMPAGNONS_BIOMES) {
    if (unites(def.id) === 0) continue;
    if (state.save.rebirbs < (ZONES[def.zone].rebirbsRequis ?? 0)) continue;
    if (jeu.mode === 'monde' && def.zone === state.save.zone) continue;
    n += 1;
  }
  return n;
}

function tickRecolteDistante(): void {
  for (const def of COMPAGNONS_BIOMES) {
    const u = unites(def.id);
    if (u === 0) continue;
    // seulement les biomes débloqués, et pas celui qu'on regarde (lui
    // est simulé en direct par les ramasseurs)
    if (state.save.rebirbs < (ZONES[def.zone].rebirbsRequis ?? 0)) continue;
    if (jeu.mode === 'monde' && def.zone === state.save.zone) continue;

    // la PÂTÉE (plan 18 §6) booste la récolte du biome pendant 10 min
    const patee = multPatee(def.id);
    if (def.monnaieAchat === 'dore') {
      const bonus = state.save.desert['d_moisson'] ? 2 : 1;
      crediterDore(u * SWARM.compagnons.rendementDoreTick * bonus * patee, 0, 0, true);
    } else {
      const monnaie = ZONES[def.zone].monnaie;
      const gain = u * SWARM.compagnons.rendementTick * state.stats.monnaies[monnaie].valeur * patee;
      crediter(monnaie, gain, 0, 0, true);
    }
  }
}

// --------------------------------------- copies de combat (plan 13 §5)

const escouade: Compagnon[] = [];

export function getEscouade(): Compagnon[] {
  return escouade;
}

/** PV et dégâts d'une copie selon son rôle (plan 13 §5). */
function statsRole(def: CompagnonBiomeDef): { pv: number; degats: number } {
  const s = state.stats;
  switch (def.combat.role) {
    case 'tank':
      return { pv: Math.ceil(s.pvMax * 0.6), degats: Math.max(1, Math.round(s.degats * def.combat.partStats)) };
    case 'soigneur':
      return { pv: Math.ceil(s.pvMax * 0.4), degats: 0 };
    default:
      return {
        pv: Math.ceil(s.pvMax * def.combat.partStats),
        degats: Math.max(1, Math.round(s.degats * def.combat.partStats)),
      };
  }
}

/** À l'entrée d'un donjon : matérialise l'escouade choisie (max 3). */
export function preparerEscouade(): void {
  escouade.length = 0;
  const choisies = state.save.swarm.escouade
    .filter((id) => copieDebloquee(id))
    .slice(0, SWARM.compagnons.escouadeMax);
  for (const id of choisies) {
    const def = COMPAGNONS_BIOMES.find((c) => c.id === id);
    if (!def) continue;
    const copie = creerCompagnon(id, birb.x + (Math.random() - 0.5) * 140, birb.y + 60 + Math.random() * 40);
    const stats = statsRole(def);
    copie.role = def.combat.role;
    copie.pv = stats.pv;
    copie.pvMax = stats.pv;
    copie.degats = stats.degats;
    escouade.push(copie);
  }
}

export function viderEscouade(): void {
  escouade.length = 0;
}

/** Délai de respawn d'une copie K.O. : grandit avec le niveau. */
export function delaiRespawnChat(): number {
  return Math.min(120, 30 + state.save.heros.niveau * 0.5);
}

// ------------------------------------------------------------- boucle

export function majCompagnons(dt: number): void {
  // 1. Entretien des copies de combat (regen, respawn) — l'IA de combat
  //    vit dans systems/donjon.ts.
  for (const copie of escouade) {
    copie.tAttaque = Math.max(0, copie.tAttaque - dt);
    if (copie.mortT > 0) {
      copie.mortT -= dt;
      if (copie.mortT <= 0) {
        copie.mortT = 0;
        copie.pv = copie.pvMax;
        copie.x = birb.x + (Math.random() - 0.5) * 100;
        copie.y = birb.y + (Math.random() - 0.5) * 100;
      }
      continue;
    }
    copie.pv = Math.min(copie.pvMax, copie.pv + state.stats.regen * 0.25 * dt);
  }

  // 2. Récolte statistique des biomes non regardés (jamais en donjon)
  if (jeu.mode !== 'donjon') {
    accTick += dt;
    if (accTick >= SWARM.compagnons.tickSec) {
      accTick -= SWARM.compagnons.tickSec;
      tickRecolteDistante();
    }
  }

  // 3. Ramassage en direct dans la zone regardée
  if (jeu.mode !== 'monde') return;

  const espece = especeParZone(state.save.zone);
  const nombre = espece ? unites(espece.id) : 0;
  if (zoneRamasseurs !== state.save.zone) {
    zoneRamasseurs = state.save.zone;
    ramasseurs.length = 0;
  }
  while (ramasseurs.length < nombre && espece) {
    ramasseurs.push(
      creerCompagnon(
        espece.id,
        birb.x + (Math.random() - 0.5) * 120,
        birb.y + (Math.random() - 0.5) * 120
      )
    );
  }
  ramasseurs.length = Math.min(ramasseurs.length, nombre);

  const liste = entitesZoneActive();
  const prises = new Set<Collectible>();
  for (const c of ramasseurs) {
    piloterRamasseur(c, liste, prises, dt, vitesseEspece(c.espece));
  }

  // Yuumi vit dans la forêt et y ramasse les brindilles.
  if (yuumiActive()) {
    if (!yuumiPlacee) {
      yuumi.x = birb.x + 80;
      yuumi.y = birb.y;
      yuumiPlacee = true;
    }
    piloterRamasseur(yuumi, liste, prises, dt, vitesseEspece('yuumi') * 1.1);
  } else {
    yuumiPlacee = false;
  }
}
