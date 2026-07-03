// Données du donjon : monstres, étages, courbe d'XP et compétences.
// Inspiré du Birb original : niveau de personnage gagné en combattant,
// points de compétence (SP) à répartir, étages de plus en plus durs,
// boss tous les BOSS_TOUS_LES étages.

export const COMBAT = {
  pvBase: 100,
  pvParPointVitalite: 10, // +10 PV par point de Vitalité
  regenBase: 1, // PV/s
  regenParPoint: 0.5,
  degatsBase: 10,
  degatsParPoint: 2,
  porteeAttaque: 60, // l'héroïne frappe automatiquement à cette distance
  delaiAttaque: 0.5, // secondes entre deux coups
  spParNiveau: 3,
  porteeAggro: 300, // distance à laquelle un monstre se met à poursuivre
};

/** XP nécessaire pour passer du niveau n au niveau n+1. */
export function xpPourNiveau(niveau: number): number {
  return Math.ceil(25 * Math.pow(niveau, 1.6));
}

// Le bestiaire vit dans data/monstres.ts depuis le plan 10.

export const COMPETENCES = [
  { id: 'vitalite', nom: 'VITALITÉ', desc: `+${COMBAT.pvParPointVitalite} PV par point` },
  { id: 'recuperation', nom: 'RÉCUPÉRATION', desc: `+${COMBAT.regenParPoint} PV/s par point` },
  { id: 'force', nom: 'FORCE', desc: `+${COMBAT.degatsParPoint} dégâts par point` },
] as const;

export type CompetenceId = (typeof COMPETENCES)[number]['id'];
