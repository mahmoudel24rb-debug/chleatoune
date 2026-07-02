// Choix d'équilibrage documentés (plan 06) :
// - Seuil de rebirb : 1 000 popcorn cumulés dans le cycle, ×5 à chaque rebirb.
// - Gain : (nombre de rebirbs + 1) plumes — 1, puis 2, puis 3…
// - Bonus des plumes : +10 % de gains par plume (CONFIG.prestige.bonusParPlume).
// - Déblocages : 1er rebirb → GRAINES + zone 2 + mode AUTO ;
//   2e → BRINDILLES + zone 3 ; 3e → MINE + zone 4.

import { MONNAIES } from './config';

export function seuilRebirb(rebirbs: number): number {
  return 1000 * Math.pow(5, rebirbs);
}

export function plumesGagnees(rebirbs: number): number {
  return rebirbs + 1;
}

/** Nombre d'arbres (onglets) et de zones accessibles. */
export function zonesDebloquees(rebirbs: number): number {
  return 1 + Math.min(rebirbs, MONNAIES.length - 1);
}

export function autoDebloque(rebirbs: number): boolean {
  return rebirbs >= 1;
}

export function ordinal(n: number): string {
  // féminin : « 1RE RECOUTURE », « 2E RECOUTURE »…
  return n === 1 ? '1RE' : `${n}E`;
}

export function prochainDeblocage(rebirbs: number): string {
  switch (rebirbs) {
    case 0:
      return 'GRAINES + ZONE 2 + MODE AUTO';
    case 1:
      return 'BRINDILLES + ZONE 3';
    case 2:
      return 'MINERAI + ZONE 4';
    default:
      return 'ENCORE PLUS DE PLUMES';
  }
}
