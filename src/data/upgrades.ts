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

/** Renchérissement par recouture (équilibrage 2026-07-04) : sans lui,
 *  re-maxer les pistes plafonnées coûte un total FIXE (~97 500 smiski)
 *  face à un revenu qui grandit à chaque recouture → tout re-maxé en
 *  quelques secondes dès la 5e-6e. Avec ×1,6^recoutures, le rebuild
 *  reste une chasse de quelques minutes, tout en fondant par rapport au
 *  seuil du cycle (×5^r) : la recouture reste toujours plus rentable.
 *  Ne touche PAS le seuil de recouture (cumulCycle = gains bruts). */
export const CROISSANCE_COUT_RECOUTURE = 1.6;

export function multCoutRecouture(rebirbs: number): number {
  return Math.pow(CROISSANCE_COUT_RECOUTURE, rebirbs);
}

export function coutAmelioration(a: Amelioration, niveau: number, rebirbs = 0): number {
  const multRecouture = a.permanent ? 1 : multCoutRecouture(rebirbs);
  return Math.ceil(a.coutBase * Math.pow(a.croissance, niveau) * multRecouture);
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
  }
);

// L'entrée DOUGHCAT de la boutique a été retirée (plan 13 §2) : l'achat
// des compagnons est désormais diégétique, au panneau d'adoption de
// chaque biome (systems/carte.ts). Les anciens niveaux `p_doughcat` sont
// migrés vers save.compagnons.prairie dans systems/save.ts.
