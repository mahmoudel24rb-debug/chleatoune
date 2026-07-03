// État central du jeu : la sauvegarde (source de vérité, plan 07) et les
// stats dérivées, recalculées après tout achat, chargement ou rebirb.

import { CONFIG, MONNAIES, type MonnaieId } from '../data/config';
import { capSpawn, delaiSpawn, valeurCollecte, vitesseBirb } from '../data/upgrades';
import { COMBAT, type CompetenceId } from '../data/combat';
import { EFFETS_PARCHEMINS } from '../data/parchemins';
import { talentPossede } from '../data/talents';
import type { TypeQuete } from '../data/desert';

export interface SaveData {
  version: number;
  /** Soldes dépensables, par monnaie. */
  soldes: Record<MonnaieId, number>;
  /** Cumuls de toute la partie (stats, jamais remis à zéro). */
  cumulsGlobaux: Record<MonnaieId, number>;
  /** Popcorn cumulés du cycle courant — la progression du rebirb. */
  cumulCycle: number;
  /** Niveaux d'améliorations, par id (plan 05, pièges). */
  niveaux: Record<string, number>;
  plumes: number;
  rebirbs: number;
  zone: number;
  auto: boolean;
  volume: number;
  tempsJeu: number;
  /** Progression de combat (donjon) : niveau, XP du niveau en cours,
   *  points de compétence libres et points dépensés. */
  heros: {
    niveau: number;
    xp: number;
    sp: number;
    competences: Record<CompetenceId, number>;
  };
  meilleurEtage: number;
  // ---- v2 ----
  /** Plumes gagnées depuis toujours : c'est ELLE qui donne le bonus
   *  passif ; le solde `plumes` se dépense dans l'arbre de talents. */
  cumulPlumes: number;
  soldeDore: number;
  cumulDore: number;
  talents: Record<string, boolean>;
  desert: Record<string, boolean>;
  /** Paliers de l'autel de sacrifice (SP sacrifiés). */
  sacrifices: number;
  quetes: {
    actives: { type: TypeQuete; objectif: number; progres: number; recompense: number }[];
    terminees: number;
  };
  peche: {
    niveau: number;
    xp: number;
    /** captures par espèce : { normales, shiny } */
    dex: Record<string, { captures: number; shiny: number }>;
    /** index de la canne équipée (data/peche-boutique.ts) */
    canne: number;
    /** stock d'appâts par id */
    appats: Record<string, number>;
    appatActif: string | null;
    /** pêcheurs automatiques débloqués (0..PECHEURS_MAX) */
    pecheurs: number;
  };
  /** Paliers de l'arbre géant (le nid). */
  nid: number;
  /** Timestamp de la dernière sauvegarde, pour les gains hors-ligne. */
  derniereVisite: number;
  // ---- v3 (refonte donjons, plans 09-13) ----
  swarm: {
    /** plus haute porte débloquée (1..13) */
    porteMax: number;
    /** niveau de porte → nombre de complétions */
    termines: Record<number, number>;
    /** meilleure vague atteinte à la porte sans fin */
    sansFinRecord: number;
    /** copies de combat choisies (plan 13, max 3) */
    escouade: string[];
  };
  /** id de parchemin → niveau (plan 11) — PERMANENT (survit à la recouture) */
  parchemins: Record<string, number>;
  /** id de sort → niveau (0 = non débloqué) — PERMANENT */
  sorts: Record<string, number>;
  evolutions: Record<string, boolean>;
  /** biomeId → unités de compagnons (plan 13) — PERMANENT */
  compagnons: Record<string, number>;
  // ---- plan 14 (additif, pas de bump de version) ----
  /** typeId → victoires sur son archimonstre */
  bestiaire: Record<string, number>;
  /** récompense de collection déjà versée */
  bestiaireComplet: boolean;
  // ---- plan 16 (additif) ----
  /** id de succès → débloqué */
  succes: Record<string, boolean>;
  titres: string[];
  titreActif: string | null;
  /** fils secrets déjà tirés (une seule fois par profil) */
  secrets: string[];
  /** chasse au trésor en cours (null = aucune) */
  chasse: { id: string; etape: number; tSansProgres: number } | null;
  chassesFaites: number;
  /** date LOCALE en chaîne : les fuseaux ne cassent jamais une série */
  calendrier: { dernierJour: string; serie: number };
  /** petits drapeaux d'événements (succès « sans dégât », etc.) */
  drapeaux: Record<string, boolean>;
  // ---- plan 15 (additif) ----
  filRouge: { chapitre: number; etape: number; bobines: string[]; compteur: number };
}

function zeros(): Record<MonnaieId, number> {
  return Object.fromEntries(MONNAIES.map((m) => [m, 0])) as Record<MonnaieId, number>;
}

export function defautsSave(): SaveData {
  return {
    version: 1,
    soldes: zeros(),
    cumulsGlobaux: zeros(),
    cumulCycle: 0,
    niveaux: {},
    plumes: 0,
    rebirbs: 0,
    zone: 0,
    auto: false,
    volume: 0.5,
    tempsJeu: 0,
    heros: {
      niveau: 1,
      xp: 0,
      sp: 0,
      competences: { vitalite: 0, recuperation: 0, force: 0 },
    },
    meilleurEtage: 0,
    cumulPlumes: 0,
    soldeDore: 0,
    cumulDore: 0,
    talents: {},
    desert: {},
    sacrifices: 0,
    quetes: { actives: [], terminees: 0 },
    peche: { niveau: 1, xp: 0, dex: {}, canne: 0, appats: {}, appatActif: null, pecheurs: 0 },
    nid: 0,
    derniereVisite: 0,
    swarm: { porteMax: 1, termines: {}, sansFinRecord: 0, escouade: [] },
    parchemins: {},
    sorts: {},
    evolutions: {},
    compagnons: {},
    bestiaire: {},
    bestiaireComplet: false,
    succes: {},
    titres: [],
    titreActif: null,
    secrets: [],
    chasse: null,
    chassesFaites: 0,
    calendrier: { dernierJour: '', serie: 0 },
    drapeaux: {},
    filRouge: { chapitre: 1, etape: 0, bobines: [], compteur: 0 },
  };
}

export interface StatsMonnaie {
  valeur: number;
  delai: number;
  cap: number;
}

export const state = {
  save: defautsSave(),
  stats: {
    monnaies: {} as Record<MonnaieId, StatsMonnaie>,
    vitesseBirb: CONFIG.birb.vitesseBase,
    multiplicateurPlumes: 1,
    pvMax: COMBAT.pvBase,
    regen: COMBAT.regenBase,
    degats: COMBAT.degatsBase,
    // ---- v2 : talents, sacrifices ----
    /** ×gains toutes monnaies : sacrifices × étoile de cristal. */
    multGlobal: 1,
    multXp: 1,
    rayonAimant: CONFIG.auto.rayonAimant,
    vitesseChats: 1,
    /** smiski passifs par seconde (talent générateur). */
    generateur: 0,
    multCoffres: 1,
    capBonus: 0,
    // ---- v3 : parchemins du Mercier (plan 11) ----
    /** hâte : cd effectif = base × 100/(100+hâte) — jamais de cd nul */
    hate: 0,
    /** × taille des zones d'effet (flaques de sorts, explosions) */
    multZone: 1,
    /** +N projectiles aux sorts multi (parchemin BOBINE DOUBLE) */
    projectilesBonus: 0,
  },
};

export function niveau(id: string): number {
  return state.save.niveaux[id] ?? 0;
}

/** À appeler après tout achat, chargement ou rebirb (plan 06, pièges). */
export function recalculerStats(): void {
  const s = state.stats;
  const t = state.save.talents;
  const a = (id: string) => talentPossede(t, id);

  s.capBonus = a('t_cap') ? 4 : 0;
  for (const m of MONNAIES) {
    s.monnaies[m] = {
      valeur: valeurCollecte(niveau(`${m}_valeur`)) * (m === 'popcorn' && a('t_valeur') ? 1.5 : 1),
      delai: delaiSpawn(niveau(`${m}_delai`)),
      cap: capSpawn(niveau(`${m}_cap`)) + s.capBonus,
    };
  }
  // parchemins du Mercier (plan 11 §5) — l'ordre des multiplicateurs
  // suit le modèle de puissance du plan 12 §1, sommé ICI et nulle part
  // ailleurs
  const p = (id: string) => state.save.parchemins[id] ?? 0;

  s.vitesseBirb =
    vitesseBirb(niveau('p_ailes')) *
    (a('t_vitesse') ? 1.15 : 1) *
    (1 + EFFETS_PARCHEMINS.celerite * p('celerite'));
  // le bonus passif vient des plumes gagnées DEPUIS TOUJOURS : dépenser
  // ses plumes dans les talents ne le fait pas reculer
  s.multiplicateurPlumes = 1 + CONFIG.prestige.bonusParPlume * state.save.cumulPlumes;

  const c = state.save.heros.competences;
  s.pvMax = COMBAT.pvBase + COMBAT.pvParPointVitalite * c.vitalite + EFFETS_PARCHEMINS.vie * p('vie');
  s.regen =
    COMBAT.regenBase +
    COMBAT.regenParPoint * c.recuperation +
    (a('t_regen') ? 1 : 0) +
    EFFETS_PARCHEMINS.regen * p('regen');
  // D = (10 + 2×Force) × (1 + 0,08×puissance) × (1,3 talent) — plan 12 §1
  s.degats = Math.round(
    (COMBAT.degatsBase + COMBAT.degatsParPoint * c.force) *
      (1 + EFFETS_PARCHEMINS.puissance * p('puissance')) *
      (a('t_degats') ? 1.3 : 1)
  );
  s.hate = EFFETS_PARCHEMINS.cadence * p('cadence');
  s.multZone = 1 + EFFETS_PARCHEMINS.zone * p('zone');
  s.projectilesBonus = p('projectiles');

  s.multGlobal = (1 + 0.2 * state.save.sacrifices) * (a('t_etoile') ? 2 : 1);
  s.multXp = a('t_xp') ? 1.3 : 1;
  s.rayonAimant =
    CONFIG.auto.rayonAimant * (a('t_aimant') ? 1.6 : 1) * (1 + EFFETS_PARCHEMINS.aimant * p('aimant'));
  s.vitesseChats = a('t_chats') ? 1.4 : 1;
  s.generateur = a('t_generateur') ? 1 : 0;
  s.multCoffres = (a('t_coffres') ? 1.5 : 1) * (1 + 0.1 * state.save.sacrifices);
}

recalculerStats();
