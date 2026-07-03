// Les espèces du Mikudex marin (plan 17). Chaque espèce a désormais :
// une OMBRE de taille fixe (le savoir de pêcheuse : « ombre M au bord
// le matin = peut-être un axolotl »), une BANDE d'eau préférée, un
// CRÉNEAU horaire éventuel (heure locale, ~6 espèces sur 16 — le reste
// mord toujours), et une fourchette de TAILLE en cm (tirage biaisé vers
// le bas : les gros sont rares). Les variantes SHINY valent ×10.
//
// PERSONNALISATION : les `blague` de révélation (le « I caught a sea
// bass! » d'Animal Crossing) se remplacent librement — private jokes
// bienvenues.

export type RaretePoisson = 'commun' | 'rare' | 'epique' | 'legendaire';
export type OmbrePoisson = 'S' | 'M' | 'L' | 'XL' | 'AILERON';
export type BandeEau = 'bord' | 'milieu' | 'large';
export type CreneauJour = 'matin' | 'jour' | 'soir' | 'nuit';

export interface EspecePoisson {
  id: string;
  nom: string;
  rarete: RaretePoisson;
  /** couleurs [corps, ventre/detail] (icône de secours, révélation) */
  couleurs: [string, string];
  ombre: OmbrePoisson;
  bande: BandeEau;
  /** null = mord à toute heure */
  creneau: CreneauJour | null;
  /** fourchette de taille [min, max] en cm */
  cm: [number, number];
  /** la ligne de la carte de révélation (personnalisable à volonté) */
  blague: string;
}

export const RARETES: Record<RaretePoisson, { poids: number; valeur: number; xp: number; couleur: string }> = {
  commun: { poids: 70, valeur: 15, xp: 12, couleur: '#c8ccd4' },
  rare: { poids: 23, valeur: 60, xp: 30, couleur: '#5ab4d4' },
  epique: { poids: 6, valeur: 250, xp: 80, couleur: '#b48ae0' },
  legendaire: { poids: 1, valeur: 1200, xp: 250, couleur: '#f2d16b' },
};

export const POISSONS: EspecePoisson[] = [
  { id: 'sardine', nom: 'SARDINE ROSE', rarete: 'commun', couleurs: ['#ff8ac2', '#ffd0e8'], ombre: 'S', bande: 'bord', creneau: null, cm: [8, 15], blague: 'Une sardine rose ! Elle rougit, ou c’est de naissance ?' },
  { id: 'goujon', nom: 'GOUJON GRIS', rarete: 'commun', couleurs: ['#9aa2b3', '#c8ccd4'], ombre: 'S', bande: 'bord', creneau: null, cm: [6, 13], blague: 'Un goujon gris ! Le poisson préféré des lundis.' },
  { id: 'perche', nom: 'PERCHE MENTHE', rarete: 'commun', couleurs: ['#7dbb5c', '#c8e6a0'], ombre: 'M', bande: 'milieu', creneau: 'jour', cm: [15, 30], blague: 'Une perche menthe ! Fraîche… mais pas à l’haleine.' },
  { id: 'anchois', nom: 'ANCHOIS BLEUET', rarete: 'commun', couleurs: ['#5a8fe8', '#a8d8ff'], ombre: 'S', bande: 'milieu', creneau: 'matin', cm: [7, 12], blague: 'Un anchois bleuet ! Petit œil ? Non : GRAND caractère.' },
  { id: 'truite', nom: 'TRUITE PÊCHE', rarete: 'commun', couleurs: ['#f2b48a', '#ffe3cf'], ombre: 'M', bande: 'milieu', creneau: 'matin', cm: [20, 40], blague: 'Une truite pêche ! Une truite-fruit. La nature s’amuse.' },
  { id: 'crevette', nom: 'CREVETTE TIMIDE', rarete: 'commun', couleurs: ['#ff9a76', '#ffd0b8'], ombre: 'S', bande: 'bord', creneau: 'nuit', cm: [5, 9], blague: 'Une crevette timide ! Elle s’excuse d’avoir mordu.' },
  { id: 'poulpe', nom: 'MINI-POULPE VIOLET', rarete: 'rare', couleurs: ['#b48ae0', '#d8c0f2'], ombre: 'M', bande: 'large', creneau: 'nuit', cm: [12, 25], blague: 'Un mini-poulpe violet ! Huit bras et AUCUN câlin. Vexant.' },
  { id: 'koi', nom: 'KOÏ IMPÉRIALE', rarete: 'rare', couleurs: ['#f2932e', '#ffffff'], ombre: 'L', bande: 'milieu', creneau: null, cm: [30, 60], blague: 'Une koï impériale ! Elle exige d’être relâchée avec le titre.' },
  { id: 'chat', nom: 'POISSON-CHAT BRIOCHE', rarete: 'rare', couleurs: ['#c8934a', '#e8c58a'], ombre: 'L', bande: 'bord', creneau: 'soir', cm: [25, 55], blague: 'Un poisson-chat brioche ! Il ronronne ou il mijote ?' },
  { id: 'ballon', nom: 'POISSON-BALLON BOUDEUR', rarete: 'rare', couleurs: ['#e5a0a0', '#f2d0d0'], ombre: 'M', bande: 'large', creneau: 'jour', cm: [10, 22], blague: 'Un poisson-ballon boudeur ! Il gonfle. C’est sa réponse à tout.' },
  { id: 'hippocampe', nom: 'HIPPOCAMPE TURQUOISE', rarete: 'rare', couleurs: ['#39c5bb', '#a0e8e2'], ombre: 'S', bande: 'large', creneau: null, cm: [8, 16], blague: 'Un hippocampe turquoise ! Le seul cheval qui tient dans une poche.' },
  { id: 'axolotl', nom: 'AXOLOTL SOURIANT', rarete: 'epique', couleurs: ['#ffb4c8', '#ffe3cf'], ombre: 'M', bande: 'bord', creneau: 'matin', cm: [15, 28], blague: 'Un axolotl souriant ! Il sourit même à l’hameçon. Respect.' },
  { id: 'meduse', nom: 'MÉDUSE ÉTOILÉE', rarete: 'epique', couleurs: ['#b48ae0', '#e0d0f2'], ombre: 'M', bande: 'large', creneau: 'nuit', cm: [12, 24], blague: 'Une méduse étoilée ! Un ciel de poche, avec des tentacules.' },
  { id: 'lune', nom: 'POISSON-LUNE', rarete: 'epique', couleurs: ['#dce8f2', '#f2d16b'], ombre: 'XL', bande: 'large', creneau: 'jour', cm: [60, 120], blague: 'Un poisson-lune ! La pleine lune a mordu. Prévenir la marée.' },
  { id: 'dragon', nom: 'DRAGON D’EAU', rarete: 'epique', couleurs: ['#39c5bb', '#c8f2ee'], ombre: 'L', bande: 'large', creneau: 'soir', cm: [40, 80], blague: 'Un dragon d’eau ! Il crache des bulles. C’est déjà ça.' },
  { id: 'miku', nom: 'LA LÉGENDE DORÉE', rarete: 'legendaire', couleurs: ['#f2d16b', '#fff6c9'], ombre: 'AILERON', bande: 'large', creneau: null, cm: [100, 180], blague: 'LA LÉGENDE DORÉE !!! Elle existait. ELLE EXISTAIT VRAIMENT !' },
];

export function xpPourNiveauPeche(niveau: number): number {
  return Math.ceil(40 * Math.pow(niveau, 1.5));
}

/** Le créneau horaire ACTUEL (heure locale, jamais persisté). */
export function creneauActuel(): CreneauJour {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'matin';
  if (h >= 11 && h < 18) return 'jour';
  if (h >= 18 && h < 23) return 'soir';
  return 'nuit';
}

/** L'espèce mord-elle en ce moment ? */
export function especeMord(p: EspecePoisson): boolean {
  return p.creneau === null || p.creneau === creneauActuel();
}

export function tirerEspece(bonusChance: number, filtre?: (p: EspecePoisson) => boolean): EspecePoisson {
  // bonusChance > 1 déplace le tirage vers les raretés hautes
  const candidats = POISSONS.filter((p) => !filtre || filtre(p));
  const source = candidats.length > 0 ? candidats : POISSONS;
  const tirage: EspecePoisson[] = [];
  for (const p of source) {
    const r = RARETES[p.rarete];
    const poids = p.rarete === 'commun' ? r.poids : r.poids * bonusChance;
    for (let i = 0; i < Math.round(poids * 10); i++) tirage.push(p);
  }
  return tirage[Math.floor(Math.random() * tirage.length)];
}

/** Taille tirée à la capture : biaisée vers le bas, shiny ×1,15. */
export function tirerTaille(p: EspecePoisson, shiny: boolean): number {
  const [min, max] = p.cm;
  const taille = min + (max - min) * Math.pow(Math.random(), 2);
  return Math.round(taille * (shiny ? 1.15 : 1) * 10) / 10;
}
