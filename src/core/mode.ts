// L'état de « scène » du jeu : le monde ouvert (zones), l'expédition
// (étages de combat à biomes) et la pêche (vue de côté).
// Module minuscule et sans dépendance pour éviter les cycles d'import.

export type ModeJeu = 'monde' | 'expedition' | 'peche';

export const jeu = {
  mode: 'monde' as ModeJeu,
};
