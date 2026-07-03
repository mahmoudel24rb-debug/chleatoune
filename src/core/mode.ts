// L'état de « scène » du jeu (plan 09) : le monde ouvert (zones),
// l'Antre (le hub aux 13 portes), le donjon (combat à vagues) et la
// pêche (vue de côté).
// Module minuscule et sans dépendance pour éviter les cycles d'import.

export type ModeJeu = 'monde' | 'antre' | 'donjon' | 'peche';

export const jeu = {
  mode: 'monde' as ModeJeu,
};
