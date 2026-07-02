// Les skins jouables. Pour en ajouter un : dépose le .glb dans perso/,
// génère ses frames avec outils/rendu-glb/ (préfixe = l'id ci-dessous,
// fichiers assets/<prefixe>_{face|dos|profil}_{idle|marche1|marche2|attaque1|attaque2}.png),
// puis ajoute une entrée ici — il apparaîtra dans le créateur de personnage.

export interface Skin {
  id: string;
  nom: string;
  /** préfixe des fichiers PNG dans public/assets/ */
  prefixe: string;
}

export const SKINS: Skin[] = [
  { id: 'chleatoune', nom: 'ROSE DE CRISTAL', prefixe: 'chleatoune' },
  { id: 'gwen', nom: 'CLASSIQUE', prefixe: 'gwen' },
  { id: 'cafecuties', nom: 'CAFÉ MIGNON', prefixe: 'cafecuties' },
];
