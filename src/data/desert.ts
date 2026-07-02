// L'arbre du désert (payé en smiski dorés) et les modèles de quêtes du
// marchand — inspirés du désert au popcorn doré du Birb original.

export interface NoeudDesert {
  id: string;
  nom: string;
  desc: string;
  cout: number; // en smiski dorés
}

export const ARBRE_DESERT: NoeudDesert[] = [
  { id: 'd_marchand', nom: 'MARCHAND DE QUÊTES', desc: 'Débloque le marchand de quêtes du désert.', cout: 60 },
  { id: 'd_irrigation', nom: 'IRRIGATION', desc: '+50 % de vitesse d’apparition au désert.', cout: 200 },
  { id: 'd_moisson', nom: 'MOISSON PRÉCIEUSE', desc: '×2 smiski dorés gagnés au désert.', cout: 500 },
  { id: 'd_prairie', nom: 'CŒUR DU DÉSERT', desc: '2 % de chance de smiski doré dans les autres zones.', cout: 400 },
  { id: 'd_fortune', nom: 'FORTUNE', desc: 'Coffres d’expédition : +1 niveau de rareté.', cout: 900 },
];

// ---------------------------------------------------------------- quêtes

export type TypeQuete = 'ramasser' | 'chasser' | 'etage' | 'pecher';

export interface ModeleQuete {
  type: TypeQuete;
  texte: (objectif: number) => string;
  /** objectif selon le nombre de quêtes déjà terminées (difficulté). */
  objectif: (terminees: number) => number;
  /** récompense en smiski dorés (les quêtes d'étage donnent des plumes). */
  recompense: (terminees: number) => number;
}

export const MODELES_QUETES: ModeleQuete[] = [
  {
    type: 'ramasser',
    texte: (n) => `Ramasse ${n} smiski`,
    objectif: (t) => 150 + t * 100,
    recompense: (t) => 20 + t * 8,
  },
  {
    type: 'chasser',
    texte: (n) => `Vaincs ${n} monstres en expédition`,
    objectif: (t) => 15 + t * 8,
    recompense: (t) => 30 + t * 10,
  },
  {
    type: 'etage',
    texte: (n) => `Termine l'étage ${n} de l'expédition`,
    objectif: (t) => 3 + t * 2,
    recompense: (t) => 40 + t * 15,
  },
  {
    type: 'pecher',
    texte: (n) => `Pêche ${n} poissons`,
    objectif: (t) => 5 + t * 3,
    recompense: (t) => 25 + t * 10,
  },
];
