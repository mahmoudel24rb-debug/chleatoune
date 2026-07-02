// Les espèces du Mikudex marin. Chaque prise donne des smiski et de
// l'XP de pêche ; la première capture d'une espèce rare+ donne des
// plumes. Les variantes SHINY (2 %) valent ×10.
//
// PERSONNALISATION : change librement les noms — c'est une collection,
// autant y glisser des private jokes.

export type RaretePoisson = 'commun' | 'rare' | 'epique' | 'legendaire';

export interface EspecePoisson {
  id: string;
  nom: string;
  rarete: RaretePoisson;
  /** couleurs [corps, ventre/detail] du sprite procédural */
  couleurs: [string, string];
}

export const RARETES: Record<RaretePoisson, { poids: number; valeur: number; xp: number; couleur: string }> = {
  commun: { poids: 70, valeur: 15, xp: 12, couleur: '#c8ccd4' },
  rare: { poids: 23, valeur: 60, xp: 30, couleur: '#5ab4d4' },
  epique: { poids: 6, valeur: 250, xp: 80, couleur: '#b48ae0' },
  legendaire: { poids: 1, valeur: 1200, xp: 250, couleur: '#f2d16b' },
};

export const POISSONS: EspecePoisson[] = [
  { id: 'sardine', nom: 'SARDINE ROSE', rarete: 'commun', couleurs: ['#ff8ac2', '#ffd0e8'] },
  { id: 'goujon', nom: 'GOUJON GRIS', rarete: 'commun', couleurs: ['#9aa2b3', '#c8ccd4'] },
  { id: 'perche', nom: 'PERCHE MENTHE', rarete: 'commun', couleurs: ['#7dbb5c', '#c8e6a0'] },
  { id: 'anchois', nom: 'ANCHOIS BLEUET', rarete: 'commun', couleurs: ['#5a8fe8', '#a8d8ff'] },
  { id: 'truite', nom: 'TRUITE PÊCHE', rarete: 'commun', couleurs: ['#f2b48a', '#ffe3cf'] },
  { id: 'crevette', nom: 'CREVETTE TIMIDE', rarete: 'commun', couleurs: ['#ff9a76', '#ffd0b8'] },
  { id: 'poulpe', nom: 'MINI-POULPE VIOLET', rarete: 'rare', couleurs: ['#b48ae0', '#d8c0f2'] },
  { id: 'koi', nom: 'KOÏ IMPÉRIALE', rarete: 'rare', couleurs: ['#f2932e', '#ffffff'] },
  { id: 'chat', nom: 'POISSON-CHAT BRIOCHE', rarete: 'rare', couleurs: ['#c8934a', '#e8c58a'] },
  { id: 'ballon', nom: 'POISSON-BALLON BOUDEUR', rarete: 'rare', couleurs: ['#e5a0a0', '#f2d0d0'] },
  { id: 'hippocampe', nom: 'HIPPOCAMPE TURQUOISE', rarete: 'rare', couleurs: ['#39c5bb', '#a0e8e2'] },
  { id: 'axolotl', nom: 'AXOLOTL SOURIANT', rarete: 'epique', couleurs: ['#ffb4c8', '#ffe3cf'] },
  { id: 'meduse', nom: 'MÉDUSE ÉTOILÉE', rarete: 'epique', couleurs: ['#b48ae0', '#e0d0f2'] },
  { id: 'lune', nom: 'POISSON-LUNE', rarete: 'epique', couleurs: ['#dce8f2', '#f2d16b'] },
  { id: 'dragon', nom: 'DRAGON D’EAU', rarete: 'epique', couleurs: ['#39c5bb', '#c8f2ee'] },
  { id: 'miku', nom: 'LA LÉGENDE DORÉE', rarete: 'legendaire', couleurs: ['#f2d16b', '#fff6c9'] },
];

export function xpPourNiveauPeche(niveau: number): number {
  return Math.ceil(40 * Math.pow(niveau, 1.5));
}

export function tirerEspece(bonusChance: number): EspecePoisson {
  // bonusChance > 1 déplace le tirage vers les raretés hautes
  const tirage: EspecePoisson[] = [];
  for (const p of POISSONS) {
    const r = RARETES[p.rarete];
    const poids = p.rarete === 'commun' ? r.poids : r.poids * bonusChance;
    for (let i = 0; i < Math.round(poids * 10); i++) tirage.push(p);
  }
  return tirage[Math.floor(Math.random() * tirage.length)];
}
