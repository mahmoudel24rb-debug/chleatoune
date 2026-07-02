// La boutique de pêche (touche B sur le ponton) : cannes, appâts et
// pêcheurs automatiques — d'après la pêche du Birb original :
// « tu peux acheter des nouvelles cannes qui augmentent les stats,
//   des appâts pour avoir des meilleurs poissons plus vite,
//   et débloquer une ou plusieurs mouettes qui pêchent pour toi. »

export interface Canne {
  id: string;
  nom: string;
  /** coût en smiski (ou en dorés si `enDores`) — la canne 0 est offerte */
  cout: number;
  enDores?: boolean;
  /** multiplicateur du temps d'attente (< 1 = morsure plus rapide) */
  vitesse: number;
  /** multiplicateur de chance de rareté */
  chance: number;
  /** multiplicateur de chance de shiny */
  shiny: number;
}

export const CANNES: Canne[] = [
  { id: 'branche', nom: 'BRANCHE TROUVÉE', cout: 0, vitesse: 1, chance: 1, shiny: 1 },
  { id: 'bambou', nom: 'CANNE EN BAMBOU', cout: 1000, vitesse: 0.85, chance: 1.15, shiny: 1 },
  { id: 'turquoise', nom: 'CANNE TURQUOISE', cout: 8000, vitesse: 0.7, chance: 1.35, shiny: 1.5 },
  { id: 'royale', nom: 'CANNE ROYALE DORÉE', cout: 300, enDores: true, vitesse: 0.55, chance: 1.6, shiny: 2 },
];

export interface Appat {
  id: string;
  nom: string;
  desc: string;
  cout: number;
  enDores?: boolean;
  quantite: number;
  vitesse: number;
  chance: number;
}

export const APPATS: Appat[] = [
  { id: 'miettes', nom: 'MIETTES DE BRIOCHE', desc: 'Morsure bien plus rapide.', cout: 400, quantite: 15, vitesse: 0.6, chance: 1 },
  { id: 'paillettes', nom: 'PAILLETTES TURQUOISE', desc: 'Attire les raretés.', cout: 1500, quantite: 15, vitesse: 1, chance: 1.4 },
  { id: 'pepites', nom: 'PÉPITES DORÉES', desc: 'Le grand luxe : vite ET rare.', cout: 60, enDores: true, quantite: 10, vitesse: 0.7, chance: 1.8 },
];

/** Coût de déblocage de chaque pêcheur automatique (en smiski). */
export const COUTS_PECHEURS = [2000, 12000, 60000];
export const PECHEURS_MAX = COUTS_PECHEURS.length;
/** Un pêcheur attrape un poisson toutes les N secondes. */
export const DELAI_PECHEUR = 40;
