// Boutique data-driven (plan 05) : chaque arbre de monnaie reçoit les
// trois améliorations de base (valeur, vitesse d'apparition, capacité),
// l'arbre popcorn a en plus l'entraînement des ailes.

import { CONFIG, MONNAIES, THEME, type MonnaieId } from './config';

export interface Amelioration {
  id: string;
  arbre: MonnaieId;
  nom: string;
  desc: string;
  niveauMax: number;
  coutBase: number;
  croissance: number;
  /** Les améliorations permanentes survivent au rebirb (plan 06, étape 4). */
  permanent: boolean;
  /** Ligne « valeur actuelle → valeur suivante » de la carte. */
  affichage(niveau: number): string;
}

export function coutAmelioration(a: Amelioration, niveau: number): number {
  return Math.ceil(a.coutBase * Math.pow(a.croissance, niveau));
}

// --- Formules d'effet (lues par recalculerStats, jamais en dur ailleurs) ---
export const valeurCollecte = (niv: number) => CONFIG.spawn.valeurBase + niv;
export const delaiSpawn = (niv: number) =>
  Math.max(CONFIG.spawn.delaiMin, CONFIG.spawn.delaiBase - CONFIG.spawn.reductionDelai * niv);
export const capSpawn = (niv: number) => CONFIG.spawn.capBase + CONFIG.spawn.capParNiveau * niv;
export const vitesseBirb = (niv: number) =>
  CONFIG.birb.vitesseBase * (1 + CONFIG.birb.bonusVitesseParNiveau * niv);

export const AMELIORATIONS: Amelioration[] = [];

for (const m of MONNAIES) {
  const nomM = THEME.monnaies[m].nom;
  AMELIORATIONS.push(
    {
      id: `${m}_valeur`,
      arbre: m,
      nom: `VALEUR ${nomM}`,
      desc: 'Chaque ramassage rapporte plus.',
      niveauMax: 999,
      coutBase: 1,
      croissance: 1.15,
      permanent: false,
      affichage: (n) => `${valeurCollecte(n)} → ${valeurCollecte(n + 1)}`,
    },
    {
      id: `${m}_delai`,
      arbre: m,
      nom: `${nomM} PLUS RAPIDES`,
      desc: 'Apparition plus fréquente.',
      niveauMax: 12,
      coutBase: 3,
      croissance: 1.6,
      permanent: false,
      affichage: (n) => `${delaiSpawn(n).toFixed(1)} s → ${delaiSpawn(n + 1).toFixed(1)} s`,
    },
    {
      id: `${m}_cap`,
      arbre: m,
      nom: `CAPACITÉ ${nomM}`,
      desc: "Plus d'exemplaires à l'écran.",
      niveauMax: 40,
      coutBase: 3,
      croissance: 1.25,
      permanent: false,
      affichage: (n) => `${capSpawn(n)} → ${capSpawn(n + 1)}`,
    }
  );
}

AMELIORATIONS.push(
  {
    id: 'p_ailes',
    arbre: 'popcorn',
    nom: 'CHAUSSURES MAGIQUES',
    desc: 'Vitesse de déplacement.',
    niveauMax: 20,
    coutBase: 5,
    croissance: 1.35,
    permanent: false,
    affichage: (n) =>
      `${Math.round(100 * (1 + CONFIG.birb.bonusVitesseParNiveau * n))} % → ${Math.round(
        100 * (1 + CONFIG.birb.bonusVitesseParNiveau * (n + 1))
      )} %`,
  },
  {
    id: 'p_doughcat',
    arbre: 'popcorn',
    nom: 'DOUGHCAT',
    desc: 'Un chat-brioche ramasse pour toi. Survit à la recouture.',
    niveauMax: 4,
    coutBase: 100,
    croissance: 3,
    permanent: true, // les compagnons survivent au rebirb (plan 06, étape 4)
    affichage: (n) => `${n} → ${n + 1} CHAT${n + 1 > 1 ? 'S' : ''}`,
  }
);
