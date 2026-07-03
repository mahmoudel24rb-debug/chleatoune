// Suivi du défi de porte (plan 14 §1). Un défi par run, tiré au sort
// parmi les compatibles, jamais re-roll. Le donjon lui SIGNALE les
// événements ; lui seul décide réussi/raté. Feedback immédiat au HUD
// (✓ vert tant que tenu, ✗ rouge dès l'échec), bonus au récap de fin.

import { DEFIS, type DefiDef } from '../data/defis';
import { SWARM } from '../data/swarm';
import type { PorteDef } from '../data/portes';
import { sons } from './audio';
import { ajouterToast } from '../ui/toasts';

export type EvenementDefi =
  | 'degatSkillshot' // projectile ennemi ou flaque
  | 'degatCharge'
  | 'degatAnneau'
  | 'coupMelee' // un coup de mêlée a touché
  | 'compagnonKO'
  | 'eliteMorteAutre'; // une élite achevée PAS en mêlée

interface EtatDefi {
  defi: DefiDef;
  rate: boolean;
  accompli: boolean;
  // suivi interne
  tImmobile: number;
  tuesRecents: number[]; // chronos des morts (rafale)
  couronneAttendue: number; // protocole : 1 → 2 → 3
  couronnesPosees: number;
}

let etat: EtatDefi | null = null;

export function defiCourant(): { nom: string; description: string; rate: boolean; accompli: boolean } | null {
  if (!etat) return null;
  return {
    nom: etat.defi.nom,
    description: etat.defi.description,
    rate: etat.rate,
    accompli: etat.accompli,
  };
}

/** Tire le défi du run (appelé par entrerDonjon ; null sur la sans-fin). */
export function demarrerDefi(porte: PorteDef, escouadeN: number, patternsBoss: string[]): void {
  etat = null;
  if (porte.sansFin) return;
  const candidats = DEFIS.filter(
    (d) => !d.compatible || d.compatible(porte, escouadeN, patternsBoss)
  );
  if (candidats.length === 0) return;
  const defi = candidats[Math.floor(Math.random() * candidats.length)];
  etat = {
    defi,
    rate: false,
    accompli: false,
    tImmobile: 0,
    tuesRecents: [],
    couronneAttendue: 1,
    couronnesPosees: 0,
  };
}

export function arreterDefi(): void {
  etat = null;
}

function rater(): void {
  if (!etat || etat.rate || etat.accompli) return;
  etat.rate = true;
  sons.refus();
  ajouterToast(`🎯 DÉFI RATÉ : ${etat.defi.nom} (aucun malus)`);
}

function accomplir(): void {
  if (!etat || etat.rate || etat.accompli) return;
  etat.accompli = true;
  sons.niveau();
  ajouterToast(`🎯 DÉFI RÉUSSI : ${etat.defi.nom} !`);
}

export function evenementDefi(e: EvenementDefi): void {
  if (!etat || etat.rate) return;
  const id = etat.defi.id;
  if (e === 'degatSkillshot' && id === 'intouchable') rater();
  if ((e === 'degatCharge' || e === 'degatAnneau') && id === 'sang_froid') rater();
  if (e === 'coupMelee' && id === 'main_nue') rater();
  if (e === 'compagnonKO' && id === 'escorte') rater();
  if (e === 'eliteMorteAutre' && id === 'au_contact') rater();
}

/** Un monstre vient de mourir (rafale + protocole). */
export function mortPourDefi(chrono: number, couronne: number | undefined): void {
  if (!etat || etat.rate) return;
  if (etat.defi.id === 'rafale' && !etat.accompli) {
    etat.tuesRecents.push(chrono);
    etat.tuesRecents = etat.tuesRecents.filter((t) => chrono - t <= SWARM.defis.rafaleSec);
    if (etat.tuesRecents.length >= SWARM.defis.rafaleN) accomplir();
  }
  if (etat.defi.id === 'protocole' && couronne !== undefined) {
    if (couronne !== etat.couronneAttendue) {
      rater();
      return;
    }
    etat.couronneAttendue += 1;
    if (etat.couronneAttendue > 3) accomplir();
  }
}

/** Le protocole marque 3 monstres de la vague ≥ 2 : rend ① ② ③ ou 0. */
export function couronneSuivante(vagueIndex: number): number {
  if (!etat || etat.defi.id !== 'protocole' || etat.rate || etat.accompli) return 0;
  if (vagueIndex < 1 || etat.couronnesPosees >= 3) return 0;
  etat.couronnesPosees += 1;
  return etat.couronnesPosees;
}

/** Une vague vient d'être nettoyée (défi éclair). */
export function vagueFiniePourDefi(dureeSec: number): void {
  if (!etat || etat.rate) return;
  if (etat.defi.id === 'eclair' && dureeSec < SWARM.defis.eclairSec) accomplir();
}

/** Tick du donjon : immobilité (bougeotte) et seuil de PV (sans_filet). */
export function tickDefi(dt: number, immobile: boolean, pv: number, pvMax: number, enVague: boolean): void {
  if (!etat || etat.rate) return;
  if (etat.defi.id === 'bougeotte' && enVague) {
    etat.tImmobile = immobile ? etat.tImmobile + dt : 0;
    if (etat.tImmobile > SWARM.defis.bougeotteSec) rater();
  }
  if (etat.defi.id === 'sans_filet' && pv < pvMax / 2) rater();
}

/** Résultat final (appelé à la victoire) : le défi est-il gagné ? */
export function defiReussi(): { nom: string; reussi: boolean } | null {
  if (!etat) return null;
  const reussi = etat.defi.genre === 'tenir' ? !etat.rate : etat.accompli;
  return { nom: etat.defi.nom, reussi };
}
