// La Cuisine de Brioche (plan 18 §3) : les recettes, débloquées par
// paliers du Mikudex — la collection nourrit la cuisine. Chaque plat
// s'utilise EN COMBAT via la hotbar (touches 1/2/3).
// Les `commentaire` sont les mots de Brioche (remplaçables à volonté).

export interface EffetPlat {
  /** soin instantané, en % des PV max */
  soinPct?: number;
  /** régénération bonus : +PV/s pendant N secondes */
  regen?: { parSec: number; duree: number };
  /** +% dégâts pendant N secondes */
  degats?: { pct: number; duree: number };
  /** +% dorés (butin du donjon) pendant N secondes */
  dores?: { pct: number; duree: number };
  /** onde de choc : repousse les monstres (0 dégât — bouton panique) */
  ondeChoc?: boolean;
}

export interface IngredientsPlat {
  communs?: number; // n poissons communs (jamais de shiny)
  rares?: number; // n poissons rares
  espece?: string; // 1 poisson d'une espèce précise
  shiny?: number; // n shiny, au choix (avec confirmation)
  brindilles?: number;
}

export interface PlatDef {
  id: string;
  nom: string;
  icone: string;
  /** captures d'espèces différentes requises au Mikudex */
  deblocageDex: number;
  ingredients: IngredientsPlat;
  effet: EffetPlat;
  description: string;
  commentaire: string; // la ligne de Brioche — [À ÉCRIRE]
}

export const PLATS: PlatDef[] = [
  {
    id: 'onigiri', nom: 'ONIGIRI DU PONTON', icone: '🍙', deblocageDex: 0,
    ingredients: { communs: 2 },
    effet: { soinPct: 30 },
    description: 'Soigne 30 % des PV, instantané.',
    commentaire: '« UN TRIANGLE DE RIZ, C’EST UN CÂLIN QUI SE MANGE. »',
  },
  {
    id: 'soupe', nom: 'SOUPE RÉCONFORT', icone: '🍲', deblocageDex: 0,
    ingredients: { communs: 3, brindilles: 10 },
    effet: { soinPct: 20, regen: { parSec: 2, duree: 10 } },
    description: 'Soigne 20 % + régén +2/s pendant 10 s.',
    commentaire: '« LA SOUPE RÉPARE TOUT. MÊME CE QUI N’ÉTAIT PAS CASSÉ. »',
  },
  {
    id: 'brochette', nom: 'BROCHETTE FLAMBÉE', icone: '🍢', deblocageDex: 4,
    ingredients: { communs: 2, rares: 1 },
    effet: { degats: { pct: 20, duree: 25 } },
    description: '+20 % de dégâts pendant 25 s.',
    commentaire: '« FLAMBÉE ! COMME MA JEUNESSE. N’EN PARLONS PLUS. »',
  },
  {
    id: 'chips', nom: 'CHIPS DE BALLON', icone: '🍘', deblocageDex: 8,
    ingredients: { espece: 'ballon', communs: 1 },
    effet: { ondeChoc: true },
    description: 'Onde de choc : repousse tous les monstres (0 dégât).',
    commentaire: '« IL A BOUDÉ TOUTE SA VIE. AU MOINS, LÀ, IL SERT À QUELQUE CHOSE. »',
  },
  {
    id: 'friture', nom: 'FRITURE DORÉE', icone: '🍤', deblocageDex: 12,
    ingredients: { rares: 3 },
    effet: { dores: { pct: 30, duree: 40 } },
    description: '+30 % de dorés pendant 40 s.',
    commentaire: '« L’OR, ÇA NE SE MANGE PAS. LA FRITURE DORÉE, SI. J’AI GAGNÉ. »',
  },
  {
    id: 'tisane', nom: 'TISANE D’AXOLOTL', icone: '🍵', deblocageDex: 12,
    ingredients: { espece: 'axolotl' },
    effet: { regen: { parSec: 3, duree: 20 } },
    description: 'Régén +3/s pendant 20 s. (Il RÉGÉNÈRE, évidemment.)',
    commentaire: '« BOIS TANT QUE C’EST CHAUD, REPOUSSE TANT QUE C’EST FROID. »',
  },
  {
    id: 'sashimi', nom: 'SASHIMI SCINTILLANT', icone: '🍣', deblocageDex: 16,
    ingredients: { shiny: 1 },
    effet: { soinPct: 40, degats: { pct: 15, duree: 20 }, ondeChoc: true },
    description: '40 % de soin + 15 % dégâts 20 s + onde de choc.',
    commentaire: '« ON NE CUISINE PAS UNE ÉTOILE… ON LA PRÉSENTE. BAISSE LA VOIX. »',
  },
  // ---- circuit secondaire (plan 18 §6) : le pont pêche ↔ compagnons
  {
    id: 'patee', nom: 'PÂTÉE DU CHAT', icone: '🥫', deblocageDex: 0,
    ingredients: { communs: 3 },
    effet: {},
    description: 'À donner sur un panneau d’adoption : récolte du biome +30 % pendant 10 min.',
    commentaire: '« C’EST MA RECETTE LA PLUS DEMANDÉE. JAMAIS PAR DES GENS. »',
  },
];

export function platDef(id: string): PlatDef | undefined {
  return PLATS.find((p) => p.id === id);
}

/** Soin d'un poisson CRU croqué en combat (plan 18 §4), en % des PV. */
export const SOIN_POISSON_CRU: Record<string, number> = {
  commun: 8,
  rare: 15,
  epique: 25,
  legendaire: 30,
};
