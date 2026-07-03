// La hotbar de combat (plan 18 §4) : 3 slots (touches 1/2/3), plats ET
// poissons crus, cooldown GLOBAL partagé (LE garde-fou anti-goinfrage).
// Les buffs vivent ici et sont consultés par le donjon et les sorts.
//
// Garde-fou d'équilibrage (amende le plan 12) : la puissance attendue
// A(n) suppose ZÉRO consommable — ils sont le BRISE-MUR officiel.
// Si la porte n+1 en avance devient gratuite : monter cdGlobal à 12 s
// AVANT de toucher aux effets des plats.

import { platDef, SOIN_POISSON_CRU } from '../data/cuisine';
import { SWARM } from '../data/swarm';
import { state } from '../core/state';
import { jeu } from '../core/mode';
import { espece, stock } from './besace';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

let cdGlobal = 0;
// les buffs actifs (secondes restantes)
const buffs = {
  degatsPct: 0,
  degatsT: 0,
  regenParSec: 0,
  regenT: 0,
  doresPct: 0,
  doresT: 0,
};

// câblés par systems/donjon.ts (évite un cycle d'import de plus)
let soigner: ((pct: number) => void) | null = null;
let ondeDeChoc: (() => void) | null = null;

export function cablerConsommables(hooks: { soigner: (pct: number) => void; ondeDeChoc: () => void }): void {
  soigner = hooks.soigner;
  ondeDeChoc = hooks.ondeDeChoc;
}

export function cooldownGlobal(): { restant: number; total: number } {
  return { restant: cdGlobal, total: SWARM.consommables.cdGlobal };
}

/** Multiplicateur de dégâts des buffs (mêlée ET sorts). */
export function multDegatsConsommables(): number {
  return buffs.degatsT > 0 ? 1 + buffs.degatsPct / 100 : 1;
}

export function regenConsommables(): number {
  return buffs.regenT > 0 ? buffs.regenParSec : 0;
}

/** Multiplicateur des dorés du donjon (FRITURE DORÉE). */
export function multDoresConsommables(): number {
  return buffs.doresT > 0 ? 1 + buffs.doresPct / 100 : 1;
}

export function viderBuffs(): void {
  buffs.degatsT = 0;
  buffs.regenT = 0;
  buffs.doresT = 0;
  cdGlobal = 0;
}

/** Le contenu affichable d'un slot (icône, nom, stock). */
export function contenuSlot(index: number): { icone: string; nom: string; n: number } | null {
  const id = state.save.swarm.hotbar[index];
  if (!id) return null;
  if (id.startsWith('poisson:')) {
    const pid = id.slice(8);
    const p = espece(pid);
    if (!p) return null;
    return { icone: '🐟', nom: p.nom, n: stock(pid).n };
  }
  const plat = platDef(id);
  if (!plat) return null;
  return { icone: plat.icone, nom: plat.nom, n: state.save.inventaire.plats[id] ?? 0 };
}

/** Touche 1/2/3 : consomme le slot (donjon uniquement, cd global). */
export function utiliserSlot(index: number): void {
  if (jeu.mode !== 'donjon') return;
  const id = state.save.swarm.hotbar[index];
  if (!id) return;
  if (cdGlobal > 0) {
    sons.refus();
    return;
  }

  if (id.startsWith('poisson:')) {
    // croquer un poisson cru : petit soin par rareté + arête qui vole
    const pid = id.slice(8);
    const p = espece(pid);
    const entree = state.save.inventaire.poissons[pid];
    if (!p || !entree || entree.n < 1) {
      sons.refus();
      return;
    }
    entree.n -= 1;
    cdGlobal = SWARM.consommables.cdGlobal;
    soigner?.(SOIN_POISSON_CRU[p.rarete] ?? 8);
    sons.coup();
    ajouterToast(`🦴 CROC ! ${p.nom} — +${SOIN_POISSON_CRU[p.rarete] ?? 8} % PV`);
    sauvegarder();
    return;
  }

  const plat = platDef(id);
  const nStock = state.save.inventaire.plats[id] ?? 0;
  if (!plat || nStock < 1) {
    sons.refus();
    return;
  }
  state.save.inventaire.plats[id] = nStock - 1;
  cdGlobal = SWARM.consommables.cdGlobal;
  const e = plat.effet;
  if (e.soinPct) soigner?.(e.soinPct);
  if (e.regen) {
    buffs.regenParSec = e.regen.parSec;
    buffs.regenT = e.regen.duree;
  }
  if (e.degats) {
    buffs.degatsPct = e.degats.pct;
    buffs.degatsT = e.degats.duree;
  }
  if (e.dores) {
    buffs.doresPct = e.dores.pct;
    buffs.doresT = e.dores.duree;
  }
  if (e.ondeChoc) ondeDeChoc?.();
  sons.achat();
  ajouterToast(`${plat.icone} ${plat.nom} !`);
  sauvegarder();
}

export function majConsommables(dt: number): void {
  cdGlobal = Math.max(0, cdGlobal - dt);
  buffs.degatsT = Math.max(0, buffs.degatsT - dt);
  buffs.regenT = Math.max(0, buffs.regenT - dt);
  buffs.doresT = Math.max(0, buffs.doresT - dt);
}
