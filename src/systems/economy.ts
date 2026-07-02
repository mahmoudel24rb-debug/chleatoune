// Crédit des gains, cumuls et taux « /s » sur fenêtre glissante (plan 04).
// v2 : multiplicateur global (sacrifices, étoile), smiski dorés,
// progression des quêtes.

import { CONFIG, THEME, type MonnaieId } from '../data/config';
import { state } from '../core/state';
import type { Collectible } from '../entities/collectible';
import { ajouterParticules, ajouterTexteFlottant } from './fx';
import { sons } from './audio';
import { formatNombre } from '../core/utils';
import { progresserQuete } from './quetes';

type CleTaux = MonnaieId | 'plume' | 'dore';

const fenetres = new Map<CleTaux, { t: number; montant: number }[]>();

export function enregistrerGain(cle: CleTaux, montant: number): void {
  let fenetre = fenetres.get(cle);
  if (!fenetre) {
    fenetre = [];
    fenetres.set(cle, fenetre);
  }
  fenetre.push({ t: performance.now(), montant });
}

/** Gains des N dernières secondes ÷ N. */
export function taux(cle: CleTaux): number {
  const fenetre = fenetres.get(cle);
  if (!fenetre) return 0;
  const limite = performance.now() - CONFIG.tauxFenetreSec * 1000;
  while (fenetre.length && fenetre[0].t < limite) fenetre.shift();
  return fenetre.reduce((somme, g) => somme + g.montant, 0) / CONFIG.tauxFenetreSec;
}

/** Gain d'une monnaie classique : solde, cumuls, cycle, feedback. */
export function crediter(monnaie: MonnaieId, valeurBase: number, x: number, y: number, discret = false): void {
  const gain = valeurBase * state.stats.multiplicateurPlumes * state.stats.multGlobal;
  state.save.soldes[monnaie] += gain;
  state.save.cumulsGlobaux[monnaie] += gain;
  // Seuls les smiski font avancer le rebirb (plan 06, étape 1).
  if (monnaie === 'popcorn') {
    state.save.cumulCycle += gain;
    progresserQuete('ramasser', 1);
  }
  enregistrerGain(monnaie, gain);

  if (!discret) {
    const couleur = THEME.monnaies[monnaie].couleur;
    ajouterTexteFlottant(x, y - 14, `+${formatNombre(gain)}`, couleur);
    ajouterParticules(x, y, couleur);
    sons.ramassage();
  }
  window.dispatchEvent(new CustomEvent('birb-gain', { detail: monnaie }));
}

/** Gain de smiski dorés (désert, coffres, quêtes). */
export function crediterDore(montant: number, x: number, y: number, discret = false): void {
  const gain = Math.round(montant * state.stats.multGlobal);
  state.save.soldeDore += gain;
  state.save.cumulDore += gain;
  enregistrerGain('dore', gain);
  if (!discret) {
    ajouterTexteFlottant(x, y - 14, `+${formatNombre(gain, 0)} ✦`, THEME.dore.couleur);
    ajouterParticules(x, y, THEME.dore.couleur);
    sons.ramassage();
  }
  window.dispatchEvent(new CustomEvent('birb-gain', { detail: 'dore' }));
}

/** Encaisse un collectible ramassé (par l'héroïne, un chat, l'aimant…). */
export function encaisserCollectible(c: Collectible): void {
  if (c.dore) {
    const bonus = state.save.desert['d_moisson'] ? 2 : 1;
    crediterDore(bonus, c.x, c.y);
  } else {
    crediter(c.monnaie, state.stats.monnaies[c.monnaie].valeur, c.x, c.y);
  }
}
