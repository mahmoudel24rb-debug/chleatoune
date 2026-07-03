// Les MALÉDICTIONS (plan 14 §2) — les « idoles » de Dofus : de la
// difficulté choisie AVANT d'entrer, contre du butin multiplié.
// Uniquement sur une porte déjà terminée, jamais sur la sans-fin.
//
// GARDE-FOU (la leçon d'Ankama, qui a dû SUPPRIMER les idoles après
// qu'elles ont fait exploser l'économie) : le multiplicateur
// 1 + score/100 est PLAFONNÉ à ×2,5 et ne s'applique QU'AUX dorés et
// à l'XP de la porte. JAMAIS aux smiski, jamais aux plumes, jamais au
// multiplicateur global.

export interface MaledictionDef {
  id: string;
  nom: string;
  effet: string;
  score: number;
}

export const MALEDICTIONS: MaledictionDef[] = [
  { id: 'presse', nom: 'PRESSE-BOBINES', effet: 'Monstres +30 % vitesse', score: 30 },
  { id: 'fil_tendu', nom: 'FIL TENDU', effet: 'Télégraphes 35 % plus rapides', score: 35 },
  { id: 'sans_reprise', nom: 'SANS REPRISE', effet: 'Régénération désactivée', score: 40 },
  { id: 'meute', nom: 'LA MEUTE', effet: 'Vagues +25 % de budget', score: 35 },
  { id: 'pointes', nom: 'POINTES DOUBLES', effet: 'Skillshots ×1,5 dégâts', score: 25 },
  { id: 'verre', nom: 'VERRE FILÉ', effet: 'PV max −25 %', score: 40 },
  { id: 'tempo', nom: 'TEMPO INFERNAL', effet: 'Pauses entre vagues supprimées', score: 20 },
  { id: 'elite', nom: 'COUR D’ÉLITE', effet: '+1 élite par vague', score: 30 },
];

export function maledictionDef(id: string): MaledictionDef | undefined {
  return MALEDICTIONS.find((m) => m.id === id);
}

export function scoreMaledictions(ids: string[]): number {
  return ids.reduce((somme, id) => somme + (maledictionDef(id)?.score ?? 0), 0);
}
