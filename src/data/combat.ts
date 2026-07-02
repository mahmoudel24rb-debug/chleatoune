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

export interface TypeMonstre {
  id: string;
  nom: string;
  pv: number;
  degats: number;
  vitesse: number;
  xp: number;
  /** Smiski lâchés à la mort (avant multiplicateurs). */
  butin: number;
  rayon: number;
}

export const MONSTRES: TypeMonstre[] = [
  { id: 'glouton', nom: 'GLOUTON', pv: 25, degats: 4, vitesse: 45, xp: 6, butin: 2, rayon: 16 },
  { id: 'spectre', nom: 'SPECTRE', pv: 16, degats: 6, vitesse: 78, xp: 8, butin: 3, rayon: 14 },
  { id: 'golem', nom: 'GOLEM', pv: 60, degats: 9, vitesse: 28, xp: 14, butin: 6, rayon: 18 },
];

export const BOSS_TOUS_LES = 5;

/** Multiplicateur de PV/dégâts/XP/butin selon l'étage. */
export function facteurEtage(etage: number): number {
  return 1 + 0.4 * (etage - 1);
}

export function monstresParEtage(etage: number): number {
  return Math.min(4 + etage, 10);
}

export const COMPETENCES = [
  { id: 'vitalite', nom: 'VITALITÉ', desc: `+${COMBAT.pvParPointVitalite} PV par point` },
  { id: 'recuperation', nom: 'RÉCUPÉRATION', desc: `+${COMBAT.regenParPoint} PV/s par point` },
  { id: 'force', nom: 'FORCE', desc: `+${COMBAT.degatsParPoint} dégâts par point` },
] as const;

export type CompetenceId = (typeof COMPETENCES)[number]['id'];
