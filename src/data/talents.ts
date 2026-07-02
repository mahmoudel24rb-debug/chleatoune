// L'arbre de talents permanent, payé en PLUMES — des panneaux physiques
// posés dans la prairie (comme la « map reward » du Birb original).
// Chaque talent est un achat unique. Les effets sont appliqués dans
// recalculerStats() ou lus directement par les systèmes concernés.

export interface Talent {
  id: string;
  nom: string;
  desc: string;
  cout: number; // en plumes
}

export const TALENTS: Talent[] = [
  { id: 't_valeur', nom: 'PRISME BRILLANT', desc: '+50 % de valeur des smiski.', cout: 3 },
  { id: 't_vitesse', nom: 'AILES DE PLATINE', desc: '+15 % de vitesse de déplacement.', cout: 3 },
  { id: 't_aimant', nom: 'ASPIRATEUR', desc: 'Rayon du mode AUTO +60 %.', cout: 5 },
  { id: 't_cap', nom: 'BRISE-LIMITE', desc: '+4 de capacité dans toutes les zones.', cout: 5 },
  { id: 't_generateur', nom: 'GÉNÉRATEUR AUTO', desc: '+1 smiski par seconde, passivement.', cout: 8 },
  { id: 't_chats', nom: 'CROQUETTES TURBO', desc: 'Doughcats +40 % de vitesse.', cout: 6 },
  { id: 't_xp', nom: 'SAGESSE', desc: "+30 % d'XP de combat et de pêche.", cout: 8 },
  { id: 't_regen', nom: 'BOUCLIER DE ROSES', desc: '+1 PV par seconde.', cout: 6 },
  { id: 't_degats', nom: 'CISEAUX AFFÛTÉS', desc: '+30 % de dégâts.', cout: 8 },
  { id: 't_coffres', nom: 'PIED-DE-BICHE', desc: 'Coffres d’expédition : +50 % de butin.', cout: 10 },
  { id: 't_offline', nom: 'RÊVES FERTILES', desc: 'Gains hors-ligne +100 %.', cout: 10 },
  { id: 't_etoile', nom: 'ÉTOILE DE CRISTAL', desc: '×2 sur TOUS les gains.', cout: 40 },
];

export function talentPossede(talents: Record<string, boolean>, id: string): boolean {
  return talents[id] === true;
}
