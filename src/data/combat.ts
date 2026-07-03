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
  /** coût en budget de menace (plan 12 §3) */
  cout: number;
  pv: number; // stats de BASE, avant multiplicateurs de porte
  degats: number;
  vitesse: number;
  xp: number;
  /** Smiski dorés lâchés à la mort (÷3, avant multiplicateurs). */
  butin: number;
  rayon: number;
}

// Bestiaire v1 (plan 09) — stats de base alignées sur la table du
// plan 10 ; les rôles tireur/kamikaze arrivent au plan 10.
export const MONSTRES: TypeMonstre[] = [
  { id: 'glouton', nom: 'GLOUTON', cout: 1, pv: 20, degats: 5, vitesse: 55, xp: 6, butin: 2, rayon: 16 },
  { id: 'spectre', nom: 'SPECTRE', cout: 1.5, pv: 14, degats: 6, vitesse: 85, xp: 8, butin: 3, rayon: 14 },
  { id: 'golem', nom: 'GOLEM', cout: 3, pv: 65, degats: 10, vitesse: 30, xp: 14, butin: 6, rayon: 18 },
];

export function typeMonstre(id: string): TypeMonstre {
  return MONSTRES.find((m) => m.id === id) ?? MONSTRES[0];
}

export const COMPETENCES = [
  { id: 'vitalite', nom: 'VITALITÉ', desc: `+${COMBAT.pvParPointVitalite} PV par point` },
  { id: 'recuperation', nom: 'RÉCUPÉRATION', desc: `+${COMBAT.regenParPoint} PV/s par point` },
  { id: 'force', nom: 'FORCE', desc: `+${COMBAT.degatsParPoint} dégâts par point` },
] as const;

export type CompetenceId = (typeof COMPETENCES)[number]['id'];
