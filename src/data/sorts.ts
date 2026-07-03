// Les 6 sorts automatiques du Mercier (plan 11 §3) — les Weapons de
// Swarm, cousus main. Aucune touche : ils tournent seuls en donjon
// (jouable clavier ET tactile). La mêlée reste la seule action
// offensive manuelle — risquée, payante (×1,5, plan 12 §1).
//
// dégâts d'un tick = coef × dégâts de l'héroïne × multiplicateur des
// niveaux 2..6 (champ `effets`, appliqué cumulativement).

export interface EffetNiveauSort {
  /** multiplicateur de dégâts (×1,25 = « +25 % ») */
  degats?: number;
  /** +N projectiles/ciseaux/bobines */
  projectiles?: number;
  /** multiplicateur de cooldown (×0,85 = « −15 % ») */
  cooldown?: number;
  /** + portée en px */
  portee?: number;
  /** multiplicateur du rayon d'orbite (bobines) */
  rayonOrbite?: number;
  texte: string;
}

export interface SortDef {
  id: string;
  nom: string;
  /** équivalent Swarm, pour le guide */
  clin: string;
  description: string;
  /** en smiski ; 0 = offert à la première visite */
  coutDeblocage: number;
  /** coefficient : dégâts du tick = coef × dégâts de l'héroïne */
  coef: number;
  /** secondes, réduit par la hâte ; 0 = permanent (bobines) */
  cooldown: number;
  /** le parchemin BOBINE DOUBLE (+1 projectile) s'applique-t-il ? */
  accepteProjectiles: boolean;
  /** effets des niveaux 2..6, appliqués cumulativement */
  effets: [EffetNiveauSort, EffetNiveauSort, EffetNiveauSort, EffetNiveauSort, EffetNiveauSort];
  evolution: { nom: string; effet: string; parcheminLie: string };
}

export const SORTS: SortDef[] = [
  {
    id: 'ciseaux', nom: 'CISO-RANG', clin: 'Blade-o-rang',
    description: 'Des ciseaux volent vers l’ennemi le plus proche, transpercent, puis reviennent (2 touches).',
    coutDeblocage: 0, coef: 0.55, cooldown: 2.2, accepteProjectiles: true,
    effets: [
      { degats: 1.25, texte: '+25 % dégâts' },
      { projectiles: 1, texte: '+1 ciseau' },
      { degats: 1.25, texte: '+25 % dégâts' },
      { cooldown: 0.85, texte: 'cooldown −15 %' },
      { projectiles: 1, texte: '+1 ciseau' },
    ],
    evolution: { nom: 'CISEAUX FRACTALS', effet: 'Explosent en 4 mini-ciseaux au retour.', parcheminLie: 'celerite' },
  },
  {
    id: 'aiguilles', nom: 'MITRAILLE D’AIGUILLES', clin: 'Gatling UwU',
    description: 'Une aiguille toutes les 0,3 s vers l’ennemi le plus proche (portée 230).',
    coutDeblocage: 400, coef: 0.16, cooldown: 0.3, accepteProjectiles: true,
    effets: [
      { degats: 1.2, texte: '+20 % dégâts' },
      { portee: 60, texte: '+60 de portée' },
      { degats: 1.2, texte: '+20 % dégâts' },
      { cooldown: 0.8, texte: 'cadence ×1,25' },
      { degats: 1.2, texte: '+20 % dégâts' },
    ],
    evolution: { nom: 'RAFALE DOUBLE', effet: 'Tire 2 aiguilles à la fois.', parcheminLie: 'cadence' },
  },
  {
    id: 'bobines', nom: 'BOBINES ORBITALES', clin: 'Cyclonic Slicers',
    description: '2 bobines en orbite : dégâts et mini-recul au contact (tick 0,5 s par cible).',
    coutDeblocage: 1500, coef: 0.3, cooldown: 0, accepteProjectiles: true,
    effets: [
      { projectiles: 1, texte: '+1 bobine' },
      { degats: 1.25, texte: '+25 % dégâts' },
      { rayonOrbite: 1.15, texte: '+15 % rayon d’orbite' },
      { projectiles: 1, texte: '+1 bobine' },
      { degats: 1.25, texte: '+25 % dégâts' },
    ],
    evolution: { nom: 'ORBITE ÉTERNELLE', effet: '+2 bobines, recul doublé.', parcheminLie: 'regen' },
  },
  {
    id: 'eclair', nom: 'FIL DE FOUDRE', clin: 'Statikk Sword',
    description: 'Un zap sur l’ennemi le plus proche, qui rebondit sur 2 autres.',
    coutDeblocage: 5000, coef: 0.7, cooldown: 3, accepteProjectiles: false,
    effets: [
      { degats: 1.25, texte: '+25 % dégâts' },
      { cooldown: 0.85, texte: 'cooldown −15 %' },
      { degats: 1.25, texte: '+25 % dégâts' },
      { cooldown: 0.85, texte: 'cooldown −15 %' },
      { degats: 1.25, texte: '+25 % dégâts' },
    ],
    evolution: { nom: 'TEMPÊTE COUSUE', effet: 'L’orage persiste 2 s sur la cible (dégâts continus).', parcheminLie: 'vie' },
  },
  {
    id: 'pelote', nom: 'PELOTE PIÉGÉE', clin: 'Ani-Mines',
    description: 'Pose une pelote qui explose (Ø 80) au contact ou après 3 s.',
    coutDeblocage: 15000, coef: 1.1, cooldown: 3.5, accepteProjectiles: false,
    effets: [
      { degats: 1.25, texte: '+25 % dégâts' },
      { cooldown: 0.85, texte: 'cooldown −15 %' },
      { degats: 1.25, texte: '+25 % dégâts' },
      { portee: 12, texte: '+30 % zone d’explosion' },
      { degats: 1.25, texte: '+25 % dégâts' },
    ],
    evolution: { nom: 'CHAPELET', effet: 'Chaque explosion en repose une petite (50 %, 1 rebond).', parcheminLie: 'zone' },
  },
  {
    id: 'tourelle', nom: 'MIKU-TOURELLE', clin: 'YuumiBot',
    description: 'Pose un drone 6 s qui tire des aiguilles (×0,5).',
    coutDeblocage: 40000, coef: 0.16, cooldown: 8, accepteProjectiles: false,
    effets: [
      { degats: 1.25, texte: '+25 % dégâts' },
      { cooldown: 0.85, texte: 'cooldown −15 %' },
      { degats: 1.25, texte: '+25 % dégâts' },
      { cooldown: 0.85, texte: 'cooldown −15 %' },
      { degats: 1.25, texte: '+25 % dégâts' },
    ],
    evolution: { nom: 'MIKU PRIME', effet: 'La tourelle aspire aussi le butin autour d’elle.', parcheminLie: 'aimant' },
  },
];

export const NIVEAU_MAX_SORT = 6;

export function sortDef(id: string): SortDef {
  return SORTS.find((s) => s.id === id) ?? SORTS[0];
}

/** Multiplicateur de dégâts cumulé des niveaux 2..niv. */
export function multNiveauSort(def: SortDef, niv: number): number {
  let mult = 1;
  for (let k = 0; k < Math.min(niv - 1, 5); k++) mult *= def.effets[k].degats ?? 1;
  return mult;
}

/** Multiplicateur de cooldown cumulé des niveaux 2..niv. */
export function multCooldownSort(def: SortDef, niv: number): number {
  let mult = 1;
  for (let k = 0; k < Math.min(niv - 1, 5); k++) mult *= def.effets[k].cooldown ?? 1;
  return mult;
}

/** Projectiles bonus des niveaux 2..niv (hors parchemin BOBINE DOUBLE). */
export function projectilesNiveauSort(def: SortDef, niv: number): number {
  let bonus = 0;
  for (let k = 0; k < Math.min(niv - 1, 5); k++) bonus += def.effets[k].projectiles ?? 0;
  return bonus;
}

/** Portée bonus cumulée des niveaux 2..niv (px). */
export function porteeNiveauSort(def: SortDef, niv: number): number {
  let bonus = 0;
  for (let k = 0; k < Math.min(niv - 1, 5); k++) bonus += def.effets[k].portee ?? 0;
  return bonus;
}

/** Multiplicateur de rayon d'orbite cumulé (bobines). */
export function rayonOrbiteSort(def: SortDef, niv: number): number {
  let mult = 1;
  for (let k = 0; k < Math.min(niv - 1, 5); k++) mult *= def.effets[k].rayonOrbite ?? 1;
  return mult;
}
