// Le donjon à vagues (plans 09-10) — hub l'Antre, vagues au budget de
// menace, bestiaire à rôles (mêlée/tireur/tank/kamikaze), skillshots
// télégraphés TOUJOURS esquivables, boss à patterns, escouade de
// compagnons (plan 13). Un seul chemin de dégâts vers les monstres
// (infligerAuMonstre) et un seul vers l'héroïne (blesserHeroine).
//
// Ce fichier garde aussi les compétences (SP) et les PV de l'héroïne —
// l'ancien systems/combat.ts vit ici, réusiné.

import { CONFIG, THEME } from '../data/config';
import { COMBAT, xpPourNiveau, type CompetenceId } from '../data/combat';
import { MONSTRES, typeMonstre, type MonstreDef } from '../data/monstres';
import { bossDef, type PatternId } from '../data/boss';
import { SWARM, budgetVague, multDegats, multPV } from '../data/swarm';
import {
  PORTE_SANS_FIN,
  nomBossParId,
  viviersBossDechirure,
  type CompositionEntree,
  type PorteDef,
} from '../data/portes';
import { jeu } from '../core/mode';
import { recalculerStats, state } from '../core/state';
import { Grille } from '../core/grille';
import { clamp, dist, formatNombre } from '../core/utils';
import { birb, centreBirb } from '../entities/birb';
import { prechargerDonjon } from '../core/sprites';
import type { Monstre } from '../entities/monstre';
import { PROJECTILES, tirerProjectile, viderProjectiles } from '../entities/projectile';
import {
  majTelegraphes,
  poserFlaque,
  poserTelegrapheLigne,
  poserTelegrapheZone,
  viderTelegraphes,
} from './telegraphes';
import { crediterDore } from './economy';
import {
  delaiRespawnChat,
  getEscouade,
  preparerEscouade,
  viderEscouade,
  type Compagnon,
} from './compagnons';
import { majSorts, viderSorts } from './sorts';
import {
  arreterDefi,
  couronneSuivante,
  defiReussi,
  demarrerDefi,
  evenementDefi,
  mortPourDefi,
  tickDefi,
  vagueFiniePourDefi,
} from './defis';
import { scoreMaledictions } from '../data/maledictions';
import { collectionComplete, nomArchimonstre } from '../data/archimonstres';
import { progresserQuete, signalerDonjonTermine } from './quetes';
import { bonusActif } from './calendrier';
import { evaluerSucces } from './succes';
import { effilocheuseActive } from './filrouge';
import {
  cablerConsommables,
  majConsommables,
  multDegatsConsommables,
  multDoresConsommables,
  regenConsommables,
  viderBuffs,
} from './consommables';
import { ouvrirDialogue } from '../ui/dialogue';
import { ajouterParticules, ajouterTexteFlottant } from './fx';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';
import { ouvrirFinDonjon } from '../ui/overlays';
import { entrerAntre } from './antre';
import { appliquerPreparationsDonjon, consommerPreparationsDonjon } from './matieres';

export type RareteCoffre = 'commun' | 'rare' | 'epique' | 'legendaire';
export type PhaseDonjon = 'combat' | 'pause' | 'boss' | 'victoire';

export interface Coffre {
  x: number;
  y: number;
  rarete: RareteCoffre;
  age: number;
}

// ----------------------------------------------------------- état
const monstres: Monstre[] = [];
const coffres: Coffre[] = [];
const grille = new Grille<Monstre>();
let porte: PorteDef | null = null;
let vagueIndex = 0;
let phase: PhaseDonjon = 'combat';
let tPause = 0;
let vagueSansFin = 0; // compteur de vagues de la porte sans fin
let fileAttente: { type: string; elite: boolean }[] = [];
let tSpawn = 0;
let pv = COMBAT.pvBase;
let tAttaqueHeros = 0;
let tGrace = 0; // invulnérabilité après un coup (SWARM.graceContactSec)
// stats du panneau de fin
let chrono = 0;
let degatsPris = 0;
let doresRamasses = 0;
let xpPorte = 0; // XP gagnée dans la porte (base des bonus défi/malédictions)
let vagueDebut = 0; // chrono du début de la vague (défi ÉCLAIR)
let archiCetteVague = false; // jamais deux archis dans la même vague
let archisVaincus: string[] = []; // pour le récap de fin
let dernierePos = { x: 0, y: 0 }; // suivi d'immobilité (défi BOUGEOTTE)

// malédictions du run (plan 14 §2) — choisies dans le modal de porte,
// verrouillées une fois entré (comme les idoles : on finit avec)
let maledictions: string[] = [];

export function setMaledictionsPorte(ids: string[]): void {
  maledictions = [...ids];
}

export function getMaledictionsActives(): string[] {
  return maledictions;
}

function maudit(id: string): boolean {
  return maledictions.includes(id);
}

/** PV max effectifs du donjon (VERRE FILÉ : −25 %). */
export function pvMaxCourant(): number {
  return Math.ceil(state.stats.pvMax * (maudit('verre') ? SWARM.maledictions.verrePV : 1));
}

// les consommables de la hotbar (plan 18 §4) pilotent le donjon par
// ces deux crochets — évite un énième cycle d'import
cablerConsommables({
  soigner: (pct) => {
    pv = clamp(pv + (pvMaxCourant() * pct) / 100, 0, pvMaxCourant());
  },
  ondeDeChoc: () => {
    // repousse, n'inflige RIEN : un bouton panique, pas un sort gratuit
    const centre = centreBirb();
    for (const m of monstres) {
      if (m.boss) continue;
      const d = Math.max(1, dist(m.x, m.y, centre.x, centre.y));
      if (d > SWARM.consommables.porteeOndeChoc) continue;
      m.x = clamp(m.x + ((m.x - centre.x) / d) * SWARM.consommables.reculOndeChoc, 30, CONFIG.monde.largeur - 30);
      m.y = clamp(m.y + ((m.y - centre.y) / d) * SWARM.consommables.reculOndeChoc, 30, CONFIG.monde.hauteur - 30);
    }
    ajouterParticules(centre.x, centre.y, '#ffffff', 22);
  },
});

export function enDonjon(): boolean {
  return jeu.mode === 'donjon';
}

export function getMonstres(): Monstre[] {
  return monstres;
}

/** La grille spatiale du donjon, reconstruite à chaque frame (plan 10 §7). */
export function grilleMonstres(): Grille<Monstre> {
  return grille;
}

export function getCoffres(): Coffre[] {
  return coffres;
}

export function getPv(): number {
  return pv;
}

export function getPorte(): PorteDef | null {
  return porte;
}

export function getVague(): { index: number; total: number; phase: PhaseDonjon } {
  return {
    index: porte?.sansFin ? vagueSansFin : vagueIndex,
    total: porte?.nbVagues ?? 0,
    phase,
  };
}

export function getBoss(): Monstre | null {
  return monstres.find((m) => m.boss) ?? null;
}

/** Tous les boss vivants (la Déchirure en aligne plusieurs). */
export function getBosses(): Monstre[] {
  return monstres.filter((m) => m.boss);
}

// -------------------------------------------------- niveau effectif
// La sans-fin scale à l'infini : stats = H(12) × sansFin.stats^vague.
function multPVCourant(): number {
  if (!porte) return 1;
  if (!porte.sansFin) return multPV(porte.niveau);
  return multPV(12) * Math.pow(SWARM.sansFin.stats, vagueSansFin);
}

function multDegatsCourant(): number {
  if (!porte) return 1;
  if (!porte.sansFin) return multDegats(porte.niveau);
  return multDegats(12) * Math.pow(SWARM.sansFin.stats, vagueSansFin);
}

// ----------------------------------------------------------- compos

// Répartition du BUDGET par catégorie selon la porte (plan 12 §3).
function repartition(niveau: number): { melee: number; tireur: number; kamikaze: number } {
  if (niveau <= 2) return { melee: 1, tireur: 0, kamikaze: 0 };
  if (niveau <= 5) return { melee: 0.7, tireur: 0.3, kamikaze: 0 };
  if (niveau <= 9) return { melee: 0.55, tireur: 0.35, kamikaze: 0.1 };
  return { melee: 0.45, tireur: 0.35, kamikaze: 0.2 };
}

function tirageDansCategorie(categorie: 'melee' | 'tireur' | 'kamikaze', vague: number): MonstreDef {
  if (categorie === 'kamikaze') return typeMonstre('bombix');
  if (categorie === 'tireur') {
    return typeMonstre(Math.random() < 0.6 ? 'epingleur' : 'cracheur');
  }
  // mêlée : golem pondéré vers les vagues paires (ça varie le rythme)
  const poids: [string, number][] = [
    ['glouton', 0.55],
    ['spectre', 0.3],
    ['golem', vague % 2 === 1 ? 0.3 : 0.15],
  ];
  const total = poids.reduce((a, [, p]) => a + p, 0);
  let tirage = Math.random() * total;
  for (const [id, p] of poids) {
    tirage -= p;
    if (tirage <= 0) return typeMonstre(id);
  }
  return typeMonstre('glouton');
}

/** Génère une composition au budget (plan 12 §3). */
function genererComposition(budget: number, vague: number): CompositionEntree[] {
  const niveau = porte?.sansFin ? 12 : (porte?.niveau ?? 1);
  const parts = repartition(niveau);
  const compo: CompositionEntree[] = [];

  const ajouter = (type: string, elite = false) => {
    const existant = compo.find((c) => c.type === type && !c.elite === !elite);
    if (existant) existant.nombre += 1;
    else compo.push({ type, nombre: 1, elite: elite || undefined });
  };

  // portes ≥ 4, vague ≥ 3 (index ≥ 2) : une élite, déduite du budget
  let restant = budget;
  if (porte && !porte.sansFin && porte.niveau >= 4 && vague >= 2) {
    const elite = typeMonstre(vague % 2 === 1 ? 'golem' : 'spectre');
    if (restant >= elite.cout * 4) {
      ajouter(elite.id, true);
      restant -= elite.cout * 4;
    }
  }

  for (const categorie of ['melee', 'tireur', 'kamikaze'] as const) {
    let budgetCat = restant * parts[categorie];
    let garde = 100;
    while (budgetCat >= 1 && garde-- > 0) {
      let choisi = tirageDansCategorie(categorie, vague);
      if (choisi.cout > budgetCat) {
        if (categorie !== 'melee') break;
        choisi = typeMonstre('glouton'); // le glouton bouche toujours le budget
        if (choisi.cout > budgetCat) break;
      }
      ajouter(choisi.id);
      budgetCat -= choisi.cout;
    }
  }
  if (compo.length === 0) compo.push({ type: 'glouton', nombre: Math.max(2, Math.round(budget)) });
  return compo;
}

function compositionVague(index: number): CompositionEntree[] {
  if (!porte) return [];
  const multMeute = maudit('meute') ? SWARM.maledictions.meuteBudget : 1;
  const scenarisee = porte.vaguesScenarisees?.[index];
  if (scenarisee && multMeute === 1) return scenarisee;
  if (scenarisee) {
    // LA MEUTE gonfle aussi les vagues scénarisées (+25 % sur le compte)
    return scenarisee.map((e) => ({ ...e, nombre: Math.ceil(e.nombre * multMeute) }));
  }
  const budget =
    (porte.sansFin
      ? budgetVague(12, Math.min(index, 3), 99) * Math.pow(SWARM.sansFin.budget, vagueSansFin)
      : budgetVague(porte.niveau, index, porte.nbVagues)) * multMeute;
  return genererComposition(budget, index);
}

// ----------------------------------------------------------- spawn

function creerMonstre(
  typeId: string,
  elite: boolean,
  boss = false,
  bossId?: string,
  multPVBoss = 1
): Monstre {
  const type = typeMonstre(typeId);
  const mPV = multPVCourant() * (elite ? SWARM.multElitePV : 1);
  const mDeg = multDegatsCourant() * (elite ? SWARM.multEliteDegats : 1);
  const marge = 60;
  const angle = Math.random() * Math.PI * 2;
  const rayon =
    SWARM.spawn.rayonMin + Math.random() * (SWARM.spawn.rayonMax - SWARM.spawn.rayonMin);
  const x = clamp(birb.x + Math.cos(angle) * rayon, marge, CONFIG.monde.largeur - marge);
  const y = clamp(birb.y + Math.sin(angle) * rayon, marge, CONFIG.monde.hauteur - marge);

  const defBoss = boss && porte ? bossDef(bossId ?? porte.bossId) : null;

  // promotion en ARCHIMONSTRE (plan 14 §3) : jamais un boss, jamais la
  // vague 1 de la porte 1, jamais deux dans la même vague
  const A = SWARM.archi;
  const archi =
    !boss &&
    !elite &&
    !archiCetteVague &&
    !(porte?.niveau === 1 && vagueIndex === 0) &&
    Math.random() < A.chance;
  if (archi) {
    archiCetteVague = true;
    sons.archi(); // l'oreille prévient avant l'œil
    ajouterToast(`👑 ${nomArchimonstre(type.id)} !`);
  }

  const pvMax = Math.ceil(
    defBoss
      ? SWARM.pvBossBase * SWARM.multBoss * multPVCourant() * defBoss.pv * multPVBoss
      : type.pv * mPV * (archi ? A.multPV : 1)
  );
  return {
    type,
    x,
    y,
    pv: pvMax,
    pvMax,
    // boss : « contact ×2 » s'entend du MONSTRE DE BASE (table plan 12 §2),
    // pas du golem qui lui sert de gabarit — sinon ×4 déguisé
    degats: Math.ceil(
      (boss ? typeMonstre('glouton').degats : type.degats) *
        mDeg *
        (boss ? SWARM.multDegatsBoss : 1) *
        (archi ? A.multDegats : 1)
    ),
    xp: Math.ceil(
      type.xp * multPVCourant() * (elite ? SWARM.multEliteButin : 1) * (boss ? 8 : 1) * (archi ? A.multXp : 1)
    ),
    butin: Math.ceil(
      type.butin * multPVCourant() * (elite ? SWARM.multEliteButin : 1) * (archi ? A.multButin : 1)
    ),
    boss,
    elite,
    archi,
    tAttaque: 0,
    tErrance: 0,
    dirX: 0,
    dirY: 0,
    echelle: defBoss ? defBoss.echelle : elite ? 1.3 : archi ? A.echelle : 1,
    tTir: type.tir ? type.tir.cooldown * (0.4 + Math.random() * 0.6) : 0,
    viseT: 0,
    clignoteT: 0,
    attaqueT: 0,
    ...(defBoss
      ? {
          bossId: defBoss.id,
          patterns: defBoss.patterns,
          patternIndex: 0,
          tPattern: SWARM.boss.cadencePatternSec * 0.7,
          enrage: false,
          chargeDist: 0,
          etourdiT: 0,
        }
      : {}),
  };
}

function lancerVague(index: number): void {
  if (!porte) return;
  const compo = compositionVague(index);
  fileAttente = [];
  for (const entree of compo) {
    for (let i = 0; i < entree.nombre; i++) {
      fileAttente.push({ type: entree.type, elite: entree.elite === true });
    }
  }
  // COUR D'ÉLITE : +1 élite par vague (plan 14 §2)
  if (maudit('elite')) {
    fileAttente.push({ type: index % 2 === 1 ? 'golem' : 'spectre', elite: true });
  }
  archiCetteVague = false;
  vagueDebut = chrono;
  tSpawn = 0;
  const derniere = !porte.sansFin && index === porte.nbVagues - 1;
  const bossSansFin =
    porte.sansFin && vagueSansFin > 0 && vagueSansFin % SWARM.sansFin.bossToutesLes === 0;
  if (derniere) {
    phase = 'boss';
    monstres.push(creerMonstre('golem', false, true));
    sons.boss();
    ajouterToast(`☠ ${porte.nomBoss} !`);
  } else if (bossSansFin) {
    // LA DÉCHIRURE : boss tirés au hasard parmi les 12 des portes —
    // et plus on descend, plus ils viennent EN BANDE. Aurelion Sol
    // mène la danse aux vagues 25, 50, 75…
    phase = 'boss';
    const SF = SWARM.sansFin;
    const nbBoss = Math.min(
      1 + Math.floor(vagueSansFin / SF.bossSupplementaireTous),
      SF.maxBossSimultanes
    );
    const vivier = viviersBossDechirure();
    const choisis: string[] = [];
    if (vagueSansFin % SF.aurelionToutesLes === 0) choisis.push(porte.bossId); // aurelionsol
    while (choisis.length < nbBoss && vivier.length > 0) {
      const index2 = Math.floor(Math.random() * vivier.length);
      choisis.push(vivier.splice(index2, 1)[0]); // jamais deux fois le même
    }
    const multPVBoss = SF.pvTotalMultiBoss / choisis.length;
    for (const bossId of choisis) {
      monstres.push(creerMonstre('golem', false, true, bossId, multPVBoss));
    }
    sons.boss();
    const noms = choisis.map((id) => nomBossParId(id).split(',')[0]);
    ajouterToast(choisis.length === 1 ? `☠ ${nomBossParId(choisis[0])} !` : `☠☠ ${noms.join(' & ')} !`);
  } else {
    phase = 'combat';
  }
}

// ------------------------------------------------- entrer / sortir

export function entrerDonjon(p: PorteDef): void {
  porte = p;
  jeu.mode = 'donjon';
  // sprites GLB chargés à l'entrée, jamais au boot (plan 10 §6) — la
  // Déchirure pioche parmi TOUS les boss, elle précharge tout le vivier
  prechargerDonjon(MONSTRES.map((m) => m.id), p.bossId);
  if (p.sansFin) for (const bossId of viviersBossDechirure()) prechargerDonjon([], bossId);
  // malédictions : uniquement sur une porte déjà terminée, jamais la
  // sans-fin (elle scale déjà) — le modal fait la police, ceci re-vérifie
  if (p.sansFin || (state.save.swarm.termines[p.niveau] ?? 0) === 0) maledictions = [];
  birb.x = CONFIG.monde.largeur / 2;
  birb.y = CONFIG.monde.hauteur / 2;
  monstres.length = 0;
  coffres.length = 0;
  viderTelegraphes();
  viderProjectiles();
  viderSorts();
  appliquerPreparationsDonjon();
  preparerEscouade();
  vagueIndex = 0;
  vagueSansFin = 0;
  chrono = 0;
  degatsPris = 0;
  doresRamasses = 0;
  xpPorte = 0;
  archisVaincus = [];
  dernierePos = { x: birb.x, y: birb.y };
  pv = pvMaxCourant();
  demarrerDefi(p, getEscouade().length, bossDef(p.bossId).patterns);
  lancerVague(0);
  // la Grande Effilocheuse se présente (plan 15 §6) : première entrée
  // en porte 12 avec le chapitre 6 actif — le donjon gèle pendant les
  // 2 boîtes (main.ts fige la boucle tant qu'un dialogue est ouvert)
  if (p.niveau === 12 && effilocheuseActive() && !state.save.drapeaux.effilocheusePresentee) {
    state.save.drapeaux.effilocheusePresentee = true;
    ouvrirDialogue('effilocheuse_avant');
  }
  ajouterToast(`⚔ ${p.nom} — VAGUE 1/${p.sansFin ? '∞' : p.nbVagues}`);
}

export function sortirDonjon(): void {
  consommerPreparationsDonjon(); // K.O. et sortie volontaire (idempotent)
  monstres.length = 0;
  coffres.length = 0;
  fileAttente = [];
  viderTelegraphes();
  viderProjectiles();
  viderSorts();
  viderEscouade();
  viderBuffs();
  arreterDefi();
  maledictions = [];
  porte = null;
  entrerAntre();
}

/** Sortie volontaire (tapis) : seulement pendant une pause/victoire. */
export function essayerSortirDonjon(): void {
  if (phase === 'pause' || phase === 'victoire') sortirDonjon();
  else ajouterToast('TERMINE LA VAGUE D’ABORD !');
}

// ----------------------------------------------------------- coffres

const MULT_RARETE: Record<RareteCoffre, number> = {
  commun: 1,
  rare: 2.5,
  epique: 6,
  legendaire: 15,
};

function rareteCoffrePorte(niveau: number): RareteCoffre {
  let index = niveau <= 3 ? 0 : niveau <= 6 ? 1 : niveau <= 9 ? 2 : 3;
  if (state.save.desert['d_fortune']) index += 1; // FORTUNE : +1 rang
  return (['commun', 'rare', 'epique', 'legendaire'] as RareteCoffre[])[Math.min(index, 3)];
}

function ouvrirCoffre(c: Coffre): void {
  const niveau = porte?.niveau ?? 1;
  // SAMEDI DES COFFRES (plan 16 §5) : butin +25 % ; FRITURE DORÉE aussi
  const multJour = bonusActif('coffres') ? 1.25 : 1;
  const dores = Math.round(
    (3 + niveau * 4) * MULT_RARETE[c.rarete] * state.stats.multCoffres * multJour * multDoresConsommables()
  );
  crediterDore(dores, c.x, c.y);
  doresRamasses += dores;
  if (c.rarete !== 'commun' && Math.random() < 0.25) {
    state.save.heros.sp += 1;
    ajouterTexteFlottant(c.x, c.y - 34, '+1 SP', '#a8d8ff');
  }
  if ((c.rarete === 'epique' || c.rarete === 'legendaire') && Math.random() < 0.35) {
    state.save.plumes += 1;
    state.save.cumulPlumes += 1;
    recalculerStats();
    ajouterTexteFlottant(c.x, c.y - 48, `+1 ${THEME.prestige.nom}`, THEME.prestige.couleur);
  }
  sons.achat();
  ajouterParticules(c.x, c.y, '#f2d16b', 12);
}

// ----------------------------------------------------------- XP / SP

function gagnerXp(montant: number, brut = false): void {
  const heros = state.save.heros;
  // MERCREDI DE L'ENVERS (plan 16 §5) : XP des donjons +25 %
  const multJour = !brut && enDonjon() && bonusActif('xpEnvers') ? 1.25 : 1;
  const gain = Math.round(brut ? montant : montant * state.stats.multXp * multJour);
  heros.xp += gain;
  if (enDonjon()) xpPorte += gain;
  let monte = false;
  while (heros.xp >= xpPourNiveau(heros.niveau)) {
    heros.xp -= xpPourNiveau(heros.niveau);
    heros.niveau += 1;
    heros.sp += COMBAT.spParNiveau;
    monte = true;
  }
  if (monte) {
    pv = pvMaxCourant();
    sons.niveau();
    ajouterToast(`NIVEAU ${heros.niveau} ! +${COMBAT.spParNiveau} SP 🎉`);
    sauvegarder();
  }
}

export function acheterCompetence(id: CompetenceId): boolean {
  const heros = state.save.heros;
  if (heros.sp < 1) return false;
  heros.sp -= 1;
  heros.competences[id] += 1;
  recalculerStats();
  if (id === 'vitalite') pv += COMBAT.pvParPointVitalite;
  pv = clamp(pv, 0, pvMaxCourant());
  sons.achat();
  sauvegarder();
  return true;
}

export function reinitialiserCompetences(): void {
  const heros = state.save.heros;
  const total =
    heros.competences.vitalite + heros.competences.recuperation + heros.competences.force;
  heros.sp += total;
  heros.competences = { vitalite: 0, recuperation: 0, force: 0 };
  recalculerStats();
  pv = clamp(pv, 0, pvMaxCourant());
  sons.achat();
  sauvegarder();
}

// ------------------------------------------------- victoire / K.O.

function victoire(): void {
  if (!porte) return;
  phase = 'victoire';
  const premiere = !porte.sansFin && (state.save.swarm.termines[porte.niveau] ?? 0) === 0;

  // coffre garanti, ouvert avec panache au niveau de l'héroïne
  ouvrirCoffre({ x: birb.x, y: birb.y - 40, rarete: rareteCoffrePorte(porte.niveau), age: 0 });

  state.save.swarm.termines[porte.niveau] = (state.save.swarm.termines[porte.niveau] ?? 0) + 1;
  signalerDonjonTermine();
  consommerPreparationsDonjon(); // le run est conclu : la forge a servi

  if (premiere) {
    state.save.swarm.porteMax = Math.max(state.save.swarm.porteMax, porte.niveau + 1);
    state.save.plumes += porte.recompensePremiere.plumes;
    state.save.cumulPlumes += porte.recompensePremiere.plumes;
    crediterDore(porte.recompensePremiere.dores, birb.x, birb.y - 70);
    doresRamasses += porte.recompensePremiere.dores;
    recalculerStats();
    ajouterToast(
      porte.niveau === 12 ? '🚪 LA DÉCHIRURE SE DÉVOILE…' : '🚪 UNE NOUVELLE PORTE S’OUVRE…'
    );
  }
  // ---- bonus défi + malédictions (plan 14) : dorés et XP de la porte
  // UNIQUEMENT — jamais les smiski, jamais les plumes, jamais multGlobal
  const resultatDefi = defiReussi();
  const score = scoreMaledictions(maledictions);
  const multMaledictions = Math.min(SWARM.maledictions.plafond, 1 + score / 100);
  const multTotal = (resultatDefi?.reussi ? SWARM.defis.mult : 1) * multMaledictions;
  let bonusDores = 0;
  if (multTotal > 1) {
    bonusDores = Math.round(doresRamasses * (multTotal - 1));
    const bonusXp = Math.round(xpPorte * (multTotal - 1));
    if (bonusDores > 0) {
      crediterDore(bonusDores, birb.x, birb.y - 90);
      doresRamasses += bonusDores;
    }
    if (bonusXp > 0) gagnerXp(bonusXp, true);
  }

  // drapeaux des succès (plan 16) : « sans une égratignure », « maudite »
  if (degatsPris === 0) state.save.drapeaux.porteSansDegat = true;
  if (score >= 100) state.save.drapeaux.mauditeScore100 = true;
  // le Fil Rouge (plan 15) lira ce drapeau une fois de retour à l'Envers
  if (porte.niveau === 12) state.save.drapeaux.effilocheuseVaincue = true;
  evaluerSucces();

  sons.rebirb();
  sauvegarder();

  const porteFinie = porte;
  const stats = {
    nomPorte: porteFinie.nom,
    tempsSec: chrono,
    degatsPris,
    dores: doresRamasses,
    plumes: premiere ? porteFinie.recompensePremiere.plumes : 0,
    premiere,
    defi: resultatDefi ?? undefined,
    maledictions: maledictions.length > 0 ? { n: maledictions.length, mult: multMaledictions } : undefined,
    bonusDores,
    archis: [...archisVaincus],
  };
  window.setTimeout(() => {
    if (jeu.mode !== 'donjon' || porte !== porteFinie) return;
    ouvrirFinDonjon(stats, {
      surRejouer: () => entrerDonjon(porteFinie),
      surRetour: () => sortirDonjon(),
    });
  }, 1400);
}

function mortHeroine(): void {
  sons.degat();
  ajouterToast('K.O. ! LE BUTIN EST GARDÉ — RETOUR À L’ANTRE…');
  pv = state.stats.pvMax;
  sortirDonjon();
  sauvegarder();
}

/** > 0 : l'héroïne vient d'encaisser, elle clignote (rendu). */
export function graceHeroine(): number {
  return tGrace;
}

export type SourceDegat = 'contact' | 'skillshot' | 'charge' | 'anneau';

/** Un seul chemin pour blesser l'héroïne (contact, skillshots, flaques). */
export function blesserHeroine(degats: number, source: SourceDegat = 'contact'): void {
  if (!enDonjon()) return;
  if (tGrace > 0) return; // fenêtre de grâce : pas de one-burst en foule
  tGrace = SWARM.graceContactSec;
  if (source === 'skillshot') evenementDefi('degatSkillshot');
  if (source === 'charge') evenementDefi('degatCharge');
  if (source === 'anneau') {
    evenementDefi('degatAnneau');
    evenementDefi('degatSkillshot');
  }
  pv -= degats;
  degatsPris += degats;
  ajouterTexteFlottant(birb.x, birb.y - 60, `-${formatNombre(degats, 0)}`, '#ff6b6b');
  sons.degat();
  if (pv <= 0) mortHeroine();
}

function blesserCopie(copie: Compagnon, degats: number): void {
  copie.pv -= degats;
  ajouterTexteFlottant(copie.x, copie.y - 40, `-${formatNombre(degats, 0)}`, '#ff6b6b');
  if (copie.pv <= 0) {
    copie.pv = 0;
    copie.mortT = delaiRespawnChat();
    sons.degat();
    evenementDefi('compagnonKO');
  }
}

function mortMonstre(index: number, source: SourceCoup = 'sort'): void {
  const m = monstres[index];
  monstres.splice(index, 1);
  gagnerXp(m.xp);
  progresserQuete('chasser', 1);
  ajouterParticules(
    m.x,
    m.y,
    m.boss || m.archi ? '#f2d16b' : m.elite ? '#ffd94a' : '#b48ae0',
    m.boss || m.archi ? 18 : 8
  );
  sons.mortMonstre();

  // défis : rafale, protocole, au_contact
  mortPourDefi(chrono, m.couronne);
  if (m.elite && source !== 'melee') evenementDefi('eliteMorteAutre');

  // archimonstre vaincu : bestiaire + récompenses (plan 14 §3)
  if (m.archi) {
    const bestiaire = state.save.bestiaire;
    const premiere = (bestiaire[m.type.id] ?? 0) === 0;
    bestiaire[m.type.id] = (bestiaire[m.type.id] ?? 0) + 1;
    archisVaincus.push(nomArchimonstre(m.type.id));
    if (premiere) {
      state.save.plumes += SWARM.archi.plumesPremiere;
      state.save.cumulPlumes += SWARM.archi.plumesPremiere;
      recalculerStats();
      ajouterToast(`👑 ${nomArchimonstre(m.type.id)} AU BESTIAIRE ! +${SWARM.archi.plumesPremiere} ${THEME.prestige.nom}`);
      if (collectionComplete(bestiaire) && !state.save.bestiaireComplet) {
        state.save.bestiaireComplet = true;
        state.save.plumes += SWARM.archi.plumesCollection;
        state.save.cumulPlumes += SWARM.archi.plumesCollection;
        recalculerStats();
        ajouterToast(`🏆 LA GRANDE COLLECTIONNEUSE ! +${SWARM.archi.plumesCollection} ${THEME.prestige.nom}`);
      }
    }
    sauvegarder();
  }

  // butin : les élites lâchent un coffre, les autres des dorés
  // (FRITURE DORÉE : ×1,3 pendant le buff — plan 18)
  if (m.elite) {
    coffres.push({ x: m.x, y: m.y, rarete: rareteCoffrePorte(porte?.niveau ?? 1), age: 0 });
  } else {
    const dores = Math.max(1, Math.round((m.butin / 3) * multDoresConsommables()));
    crediterDore(dores, m.x, m.y);
    doresRamasses += dores;
  }

  // fin de vague ? (plateau vide ET file de spawn vide)
  if (monstres.length === 0 && fileAttente.length === 0 && porte) {
    vagueFiniePourDefi(chrono - vagueDebut);
    if (porte.sansFin) {
      vagueSansFin += 1;
      state.save.swarm.sansFinRecord = Math.max(state.save.swarm.sansFinRecord, vagueSansFin);
      phase = 'pause';
      tPause = SWARM.pauseVagueSec;
      ajouterToast(`VAGUE ${vagueSansFin} TENUE — RECORD : ${state.save.swarm.sansFinRecord}`);
      sauvegarder();
    } else if (vagueIndex === porte.nbVagues - 1) {
      victoire();
    } else {
      phase = 'pause';
      tPause = SWARM.pauseVagueSec;
    }
  }
}

export type SourceCoup = 'melee' | 'sort' | 'compagnon';

/** Un seul chemin pour blesser un monstre (mêlée, escouade, sorts). */
export function infligerAuMonstre(
  m: Monstre,
  degats: number,
  couleur = '#ffd94a',
  source: SourceCoup = 'sort'
): void {
  m.pv -= degats;
  ajouterTexteFlottant(m.x, m.y - 20, `-${formatNombre(degats, 0)}`, couleur);
  if (m.pv <= 0) {
    const index = monstres.indexOf(m);
    if (index >= 0) mortMonstre(index, source);
  }
}

// ------------------------------------------------------- IA : tireurs

function majTireur(m: Monstre, cible: { x: number; y: number }, d: number, dt: number): void {
  const tir = m.type.tir!;
  m.tTir -= dt;

  // en pleine visée : IMMOBILE — la fenêtre pour le punir (plan 10 §2)
  if (m.viseT > 0) {
    m.viseT -= dt;
    return;
  }

  if (m.tTir <= 0 && d <= tir.portee) {
    // télégraphe figé sur la position ACTUELLE de la cible : c'est ça
    // qui rend l'esquive latérale possible et juste (plan 10, pièges)
    const multPointes = maudit('pointes') ? SWARM.maledictions.pointesDegats : 1;
    const multTendu = maudit('fil_tendu') ? SWARM.maledictions.filTendu : 1;
    const degats = Math.ceil(m.degats * tir.multDegats * multPointes);
    const couleur = m.type.couleur;
    if (tir.projectile === 'ligne') {
      const angle = Math.atan2(cible.y - m.y, cible.x - m.x);
      const origine = { x: m.x, y: m.y };
      m.viseT = SWARM.telegrapheLigneSec * multTendu;
      poserTelegrapheLigne(m.x, m.y, angle, tir.portee + 40, couleur, () => {
        if (m.pv <= 0) return;
        tirerProjectile('monstre', origine.x, origine.y, angle, SWARM.projectiles.vitesse, tir.portee + 60, degats, couleur, SWARM.projectiles.taille / 2);
        m.attaqueT = 0.3;
      }, SWARM.telegrapheLigneSec * multTendu);
    } else {
      const zx = cible.x;
      const zy = cible.y;
      m.viseT = SWARM.telegrapheZoneSec * multTendu;
      poserTelegrapheZone(zx, zy, SWARM.projectiles.rayonZone, couleur, () => {
        if (m.pv <= 0) return;
        poserFlaque(zx, zy, SWARM.projectiles.rayonZone, Math.ceil(degats / 2), couleur);
        m.attaqueT = 0.3;
      }, SWARM.telegrapheZoneSec * multTendu);
    }
    m.tTir = tir.cooldown;
    return;
  }

  // garde ses distances : pousse la joueuse à décider (plonger ou esquiver)
  let dirX = 0;
  let dirY = 0;
  if (d > tir.portee * SWARM.tireur.seuilApproche) {
    dirX = (cible.x - m.x) / d;
    dirY = (cible.y - m.y) / d;
  } else if (d < tir.portee * SWARM.tireur.seuilRecul) {
    dirX = (m.x - cible.x) / d;
    dirY = (m.y - cible.y) / d;
  }
  if (dirX !== 0 || dirY !== 0) {
    m.dirX = dirX;
    m.dirY = dirY;
    const v = m.type.vitesse * (maudit('presse') ? SWARM.maledictions.presseVitesse : 1);
    m.x = clamp(m.x + dirX * v * dt, 30, CONFIG.monde.largeur - 30);
    m.y = clamp(m.y + dirY * v * dt, 30, CONFIG.monde.hauteur - 30);
  }
}

// --------------------------------------------------------- IA : boss

function lancerPattern(m: Monstre, pattern: PatternId): void {
  const centre = centreBirb();
  const B = SWARM.boss;
  const multPointes = maudit('pointes') ? SWARM.maledictions.pointesDegats : 1;
  const multTendu = maudit('fil_tendu') ? SWARM.maledictions.filTendu : 1;
  switch (pattern) {
    case 'charge': {
      const angle = Math.atan2(centre.y - m.y, centre.x - m.x);
      m.viseT = B.charge.viseSec * multTendu;
      poserTelegrapheLigne(m.x, m.y, angle, B.charge.distance, '#ffd94a', () => {
        if (m.pv <= 0) return;
        m.chargeDist = B.charge.distance;
        m.chargeDirX = Math.cos(angle);
        m.chargeDirY = Math.sin(angle);
        m.chargeTouche = false;
        m.attaqueT = 0.4;
      }, B.charge.viseSec * multTendu);
      break;
    }
    case 'volee': {
      const angleBase = Math.atan2(centre.y - m.y, centre.x - m.x);
      const ecart = (B.volee.ecartDeg * Math.PI) / 180;
      for (let i = 0; i < B.volee.nb; i++) {
        const angle = angleBase + (i - (B.volee.nb - 1) / 2) * ecart;
        const ox = m.x;
        const oy = m.y;
        poserTelegrapheLigne(m.x, m.y, angle, 340, m.type.couleur, () => {
          if (m.pv <= 0) return;
          tirerProjectile('monstre', ox, oy, angle, SWARM.projectiles.vitesse, 420, Math.ceil(m.degats * multPointes), '#ffd94a', SWARM.projectiles.taille / 2, 'volee');
        }, SWARM.telegrapheLigneSec * multTendu);
      }
      m.viseT = SWARM.telegrapheLigneSec * multTendu;
      m.attaqueT = 0.4;
      break;
    }
    case 'pluie': {
      for (let i = 0; i < B.pluie.nb; i++) {
        const zx = clamp(centre.x + (Math.random() - 0.5) * 2 * B.pluie.rayonDispersion, 40, CONFIG.monde.largeur - 40);
        const zy = clamp(centre.y + (Math.random() - 0.5) * 2 * B.pluie.rayonDispersion, 40, CONFIG.monde.hauteur - 40);
        poserTelegrapheZone(zx, zy, SWARM.projectiles.rayonZone, m.type.couleur, () => {
          if (m.pv <= 0) return;
          poserFlaque(zx, zy, SWARM.projectiles.rayonZone, Math.ceil((m.degats / 2) * multPointes), m.type.couleur);
        }, SWARM.telegrapheZoneSec * multTendu);
      }
      m.attaqueT = 0.4;
      break;
    }
    case 'invocation': {
      const nb = B.invocation.min + Math.floor(Math.random() * (B.invocation.max - B.invocation.min + 1));
      for (let i = 0; i < nb; i++) {
        fileAttente.push({ type: Math.random() < 0.6 ? 'glouton' : 'spectre', elite: false });
      }
      ajouterParticules(m.x, m.y, '#b48ae0', 14);
      m.attaqueT = 0.4;
      break;
    }
    case 'anneau': {
      const breche = Math.floor(Math.random() * B.anneau.nb);
      for (let i = 0; i < B.anneau.nb; i++) {
        // une brèche aléatoire : il faut trouver le trou (plan 10 §4)
        const distBreche = Math.min(
          (i - breche + B.anneau.nb) % B.anneau.nb,
          (breche - i + B.anneau.nb) % B.anneau.nb
        );
        if (distBreche < B.anneau.breche) continue;
        const angle = (i * Math.PI * 2) / B.anneau.nb;
        tirerProjectile('monstre', m.x, m.y, angle, SWARM.projectiles.vitesse * 0.8, 520, Math.ceil(m.degats * multPointes), m.type.couleur, SWARM.projectiles.taille / 2, 'anneau');
      }
      m.attaqueT = 0.4;
      break;
    }
  }
}

function majBoss(m: Monstre, dt: number): void {
  const centre = centreBirb();
  const enragee = m.enrage === true;

  // enrage sous 25 % PV (plan 10 §4.6)
  if (!enragee && bossDef(m.bossId ?? '').enrage && m.pv < m.pvMax * SWARM.boss.enrage.seuil) {
    m.enrage = true;
    ajouterToast(`💢 ${porte?.nomBoss ?? 'LE BOSS'} S’ENRAGE !`);
    ajouterParticules(m.x, m.y, '#e5533f', 20);
  }

  // fin de charge : étourdi — la fenêtre de punition
  if ((m.etourdiT ?? 0) > 0) {
    m.etourdiT = (m.etourdiT ?? 0) - dt;
    return;
  }

  // ruée en cours
  if ((m.chargeDist ?? 0) > 0) {
    const v = SWARM.boss.charge.vitesse;
    const pas = Math.min(v * dt, m.chargeDist ?? 0);
    m.x = clamp(m.x + (m.chargeDirX ?? 0) * pas, 30, CONFIG.monde.largeur - 30);
    m.y = clamp(m.y + (m.chargeDirY ?? 0) * pas, 30, CONFIG.monde.hauteur - 30);
    m.chargeDist = (m.chargeDist ?? 0) - pas;
    if (!m.chargeTouche && dist(m.x, m.y, centre.x, centre.y) < m.type.rayon * m.echelle + 24) {
      m.chargeTouche = true;
      blesserHeroine(Math.ceil(m.degats * SWARM.boss.charge.multDegats), 'charge');
    }
    if ((m.chargeDist ?? 0) <= 0) m.etourdiT = SWARM.boss.charge.etourdiSec;
    return;
  }

  // en pleine visée : immobile
  if (m.viseT > 0) {
    m.viseT -= dt;
    return;
  }

  // prochain pattern
  m.tPattern = (m.tPattern ?? SWARM.boss.cadencePatternSec) - dt * (enragee ? SWARM.boss.enrage.cadence : 1);
  if ((m.tPattern ?? 0) <= 0 && m.patterns && m.patterns.length > 0) {
    m.tPattern = SWARM.boss.cadencePatternSec;
    const pattern = m.patterns[(m.patternIndex ?? 0) % m.patterns.length];
    m.patternIndex = (m.patternIndex ?? 0) + 1;
    lancerPattern(m, pattern);
    return;
  }

  // poursuite lente + contact
  const d = dist(m.x, m.y, centre.x, centre.y);
  const contact = m.type.rayon * m.echelle + 26;
  m.tAttaque -= dt;
  if (d > contact) {
    const v = SWARM.boss.vitesse * (enragee ? SWARM.boss.enrage.vitesse : 1);
    m.dirX = (centre.x - m.x) / d;
    m.dirY = (centre.y - m.y) / d;
    m.x = clamp(m.x + m.dirX * v * dt, 30, CONFIG.monde.largeur - 30);
    m.y = clamp(m.y + m.dirY * v * dt, 30, CONFIG.monde.hauteur - 30);
  } else if (m.tAttaque <= 0) {
    m.tAttaque = 1.1;
    m.attaqueT = 0.3;
    blesserHeroine(m.degats);
  }
}

// ------------------------------------------------------ IA : escouade

function majEscouade(dt: number): void {
  const centre = centreBirb();
  const copies = getEscouade();
  for (const copie of copies) {
    if (copie.mortT > 0) continue;
    copie.enMouvement = false;
    const vitesse = 170;

    if (copie.role === 'soigneur') {
      // suit la joueuse, fuit les monstres, soigne autour de lui
      const menace = grille.plusProche(copie.x, copie.y, 140);
      if (menace) {
        const d = Math.max(1, dist(copie.x, copie.y, menace.x, menace.y));
        copie.x += ((copie.x - menace.x) / d) * vitesse * dt;
        copie.y += ((copie.y - menace.y) / d) * vitesse * dt;
        copie.flip = menace.x > copie.x;
        copie.enMouvement = true;
        copie.animT += dt;
      } else if (dist(copie.x, copie.y, birb.x, birb.y) > 90) {
        const d = dist(copie.x, copie.y, birb.x, birb.y);
        copie.x += ((birb.x - copie.x) / d) * vitesse * dt;
        copie.y += ((birb.y - copie.y) / d) * vitesse * dt;
        copie.flip = birb.x < copie.x;
        copie.enMouvement = true;
        copie.animT += dt;
      }
      // aura de soin (héroïne + copies)
      const soin = SWARM.compagnons.soinPctParSec / 100;
      if (dist(copie.x, copie.y, centre.x, centre.y) < SWARM.compagnons.porteeSoin) {
        pv = clamp(pv + state.stats.pvMax * soin * dt, 0, state.stats.pvMax);
      }
      for (const autre of copies) {
        if (autre === copie || autre.mortT > 0) continue;
        if (dist(copie.x, copie.y, autre.x, autre.y) < SWARM.compagnons.porteeSoin) {
          autre.pv = Math.min(autre.pvMax, autre.pv + autre.pvMax * soin * dt);
        }
      }
      continue;
    }

    if (copie.role === 'tireur') {
      const cible = grille.plusProche(copie.x, copie.y, 420);
      if (!cible) {
        if (dist(copie.x, copie.y, birb.x, birb.y) > 120) {
          const d = dist(copie.x, copie.y, birb.x, birb.y);
          copie.x += ((birb.x - copie.x) / d) * vitesse * dt;
          copie.y += ((birb.y - copie.y) / d) * vitesse * dt;
          copie.enMouvement = true;
          copie.animT += dt;
        }
        continue;
      }
      const d = Math.max(1, dist(copie.x, copie.y, cible.x, cible.y));
      copie.flip = cible.x < copie.x;
      if (d > 200) {
        copie.x += ((cible.x - copie.x) / d) * vitesse * dt;
        copie.y += ((cible.y - copie.y) / d) * vitesse * dt;
        copie.enMouvement = true;
        copie.animT += dt;
      } else if (d < 140) {
        copie.x += ((copie.x - cible.x) / d) * vitesse * dt;
        copie.y += ((copie.y - cible.y) / d) * vitesse * dt;
        copie.enMouvement = true;
        copie.animT += dt;
      } else if (copie.tAttaque <= 0) {
        copie.tAttaque = 0.9;
        const angle = Math.atan2(cible.y - copie.y, cible.x - copie.x);
        tirerProjectile('sort', copie.x, copie.y - 14, angle, 420, 260, Math.max(1, Math.round(copie.degats * 0.5)), '#39c5bb', 3);
      }
      continue;
    }

    // bagarreur / tank / chanceux : mêlée
    const rayonChasse = copie.role === 'tank' ? 460 : 420;
    const cible = grille.plusProche(copie.x, copie.y, rayonChasse);
    const vitesseRole = copie.role === 'tank' ? vitesse * 0.7 : vitesse;
    if (cible) {
      const d = Math.max(1, dist(copie.x, copie.y, cible.x, cible.y));
      const contact = cible.type.rayon * cible.echelle + 20;
      if (d > contact) {
        copie.x += ((cible.x - copie.x) / d) * vitesseRole * dt;
        copie.y += ((cible.y - copie.y) / d) * vitesseRole * dt;
        copie.flip = cible.x < copie.x;
        copie.enMouvement = true;
        copie.animT += dt;
      } else if (copie.tAttaque <= 0) {
        copie.tAttaque = COMBAT.delaiAttaque * 1.3;
        const mourra = cible.pv <= copie.degats;
        infligerAuMonstre(cible, copie.degats, '#e8c58a', 'compagnon');
        // CHANCEUX : +10 % butin quand SON coup achève (plan 13 §5)
        if (mourra && copie.role === 'chanceux' && !cible.elite) {
          const bonus = Math.max(1, Math.round((cible.butin / 3) * SWARM.compagnons.bonusChanceux * 10));
          crediterDore(bonus, cible.x, cible.y, true);
          ajouterTexteFlottant(cible.x, cible.y - 34, `+${bonus} ✦ CHANCE`, '#f2d16b');
        }
      }
    } else if (dist(copie.x, copie.y, birb.x, birb.y) > 120) {
      const d = dist(copie.x, copie.y, birb.x, birb.y);
      copie.x += ((birb.x - copie.x) / d) * vitesseRole * dt;
      copie.y += ((birb.y - copie.y) / d) * vitesseRole * dt;
      copie.flip = birb.x < copie.x;
      copie.enMouvement = true;
      copie.animT += dt;
    }
  }
}

// ----------------------------------------------------------- boucle

export function majDonjon(dt: number): void {
  // Régénération, partout (SANS REPRISE la coupe, en donjon seulement ;
  // les buffs de plats s'ajoutent — plan 18)
  if (!(enDonjon() && maudit('sans_reprise'))) {
    pv = clamp(
      pv + (state.stats.regen + regenConsommables()) * dt,
      0,
      enDonjon() ? pvMaxCourant() : state.stats.pvMax
    );
  }
  if (!enDonjon() || !porte) return;
  chrono += dt;
  tGrace = Math.max(0, tGrace - dt);
  majConsommables(dt);

  grille.reconstruire(monstres);

  // suivi du défi : immobilité (bougeotte) et seuil de PV (sans_filet)
  const immobile = Math.abs(birb.x - dernierePos.x) + Math.abs(birb.y - dernierePos.y) < 1;
  dernierePos = { x: birb.x, y: birb.y };
  tickDefi(dt, immobile, pv, pvMaxCourant(), phase === 'combat' || phase === 'boss');

  // pause entre deux vagues (TEMPO INFERNAL la supprime)
  if (phase === 'pause') {
    tPause -= maudit('tempo') ? 999 : dt;
    if (tPause <= 0) {
      if (porte.sansFin) {
        lancerVague(vagueSansFin);
        ajouterToast(`⚔ VAGUE ${vagueSansFin + 1}`);
      } else {
        vagueIndex += 1;
        lancerVague(vagueIndex);
        ajouterToast(`⚔ VAGUE ${vagueIndex + 1}/${porte.nbVagues}`);
      }
    }
  }

  // file de spawn : par paquets, hors écran, en respectant le cap
  if (fileAttente.length > 0 && phase !== 'victoire' && phase !== 'pause') {
    tSpawn -= dt;
    if (tSpawn <= 0) {
      tSpawn = SWARM.spawn.cadenceSec;
      let paquet = SWARM.spawn.paquet;
      while (paquet-- > 0 && fileAttente.length > 0 && monstres.length < SWARM.capMonstres) {
        const suivant = fileAttente.shift()!;
        const m = creerMonstre(suivant.type, suivant.elite);
        // défi DANS L'ORDRE : couronner ① ② ③ (vague ≥ 2, plan 14 §1)
        if (!m.elite && !m.archi) {
          const couronne = couronneSuivante(porte.sansFin ? vagueSansFin : vagueIndex);
          if (couronne > 0) m.couronne = couronne;
        }
        monstres.push(m);
      }
    }
  }

  const centre = centreBirb();

  // coffres au contact (aussi pendant les pauses)
  for (let i = coffres.length - 1; i >= 0; i--) {
    const c = coffres[i];
    c.age += dt;
    if (dist(c.x, c.y, centre.x, centre.y) < CONFIG.birb.rayonRamassage) {
      coffres.splice(i, 1);
      ouvrirCoffre(c);
    }
  }

  // télégraphes, flaques et projectiles vivent même pendant la pause
  // (une flaque posée juste avant la fin de vague brûle encore)
  majTelegraphes(dt, (f) => {
    if (dist(centre.x, centre.y, f.x, f.y) < f.rayon + 14) blesserHeroine(f.degats, 'skillshot');
  });
  majProjectiles(dt);

  if (phase === 'victoire' || phase === 'pause') return;

  // les sorts automatiques du Mercier (plan 11)
  majSorts(dt, monstres);

  // attaque auto de l'héroïne (mêlée : coefMelee × dégâts, plan 12 §1)
  tAttaqueHeros -= dt;
  if (tAttaqueHeros <= 0) {
    const cible = grille.plusProche(centre.x, centre.y, COMBAT.porteeAttaque + 30, (m) =>
      dist(m.x, m.y, centre.x, centre.y) <= COMBAT.porteeAttaque + (m.boss ? 30 : 0)
    );
    if (cible) {
      tAttaqueHeros = COMBAT.delaiAttaque;
      const dx = cible.x - centre.x;
      const dy = cible.y - centre.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        birb.direction = 'profil';
        birb.flip = dx < 0;
      } else {
        birb.direction = dy < 0 ? 'dos' : 'face';
        birb.flip = false;
      }
      birb.attaqueT = 0.28;
      ajouterParticules(cible.x, cible.y, '#ffffff', 4);
      sons.coup();
      evenementDefi('coupMelee');
      infligerAuMonstre(
        cible,
        Math.round(state.stats.degats * SWARM.coefMelee * multDegatsConsommables()),
        '#ffd94a',
        'melee'
      );
    }
  }

  // l'escouade (plan 13 §5)
  majEscouade(dt);

  // IA des monstres
  const copiesVivantes = getEscouade().filter((c) => c.mortT <= 0);
  for (const m of [...monstres]) {
    if (m.pv <= 0) continue;
    if (m.boss) {
      majBoss(m, dt);
      continue;
    }
    m.tAttaque -= dt;

    // cible : le plus proche entre héroïne et copies ; le TANK provoque
    // les monstres à < porteeTaunt (plan 13 §5)
    let cibleX = centre.x;
    let cibleY = centre.y;
    let copieCible: Compagnon | null = null;
    let d = dist(m.x, m.y, centre.x, centre.y);
    for (const copie of copiesVivantes) {
      const dc = dist(m.x, m.y, copie.x, copie.y);
      if (dc < d || (copie.role === 'tank' && dc < SWARM.compagnons.porteeTaunt)) {
        d = dc;
        copieCible = copie;
        cibleX = copie.x;
        cibleY = copie.y;
      }
    }

    // kamikaze : clignote puis explose (plan 10 §2)
    if (m.type.comportement === 'kamikaze') {
      if (m.clignoteT > 0) {
        m.clignoteT -= dt;
        if (m.clignoteT <= 0) {
          // BOUM : dégâts en zone sur héroïne et copies
          ajouterParticules(m.x, m.y, '#e5533f', 16);
          sons.degat();
          if (dist(m.x, m.y, centre.x, centre.y) < SWARM.kamikaze.rayon + 16) {
            blesserHeroine(m.degats);
          }
          for (const copie of copiesVivantes) {
            if (dist(m.x, m.y, copie.x, copie.y) < SWARM.kamikaze.rayon + 12) {
              blesserCopie(copie, m.degats);
            }
          }
          const index = monstres.indexOf(m);
          if (index >= 0) mortMonstre(index);
        }
        continue;
      }
      if (d < SWARM.kamikaze.distance + m.type.rayon) {
        m.clignoteT = SWARM.kamikaze.clignoteSec;
        continue;
      }
      m.dirX = (cibleX - m.x) / d;
      m.dirY = (cibleY - m.y) / d;
      const vKami = m.type.vitesse * (maudit('presse') ? SWARM.maledictions.presseVitesse : 1);
      m.x = clamp(m.x + m.dirX * vKami * dt, 30, CONFIG.monde.largeur - 30);
      m.y = clamp(m.y + m.dirY * vKami * dt, 30, CONFIG.monde.hauteur - 30);
      continue;
    }

    // tireur : machine à états (les tireurs ne visent QUE l'héroïne —
    // c'est elle qui esquive)
    if (m.type.comportement === 'tireur') {
      majTireur(m, centre, dist(m.x, m.y, centre.x, centre.y), dt);
      continue;
    }

    // mêlée / tank : poursuite + contact (PRESSE-BOBINES : +30 %)
    const vitesse = m.type.vitesse * (maudit('presse') ? SWARM.maledictions.presseVitesse : 1);
    if (d > 1) {
      m.dirX = (cibleX - m.x) / d;
      m.dirY = (cibleY - m.y) / d;
    }
    const contact = m.type.rayon * m.echelle + 26;
    if (d > contact) {
      m.x = clamp(m.x + m.dirX * vitesse * dt, 30, CONFIG.monde.largeur - 30);
      m.y = clamp(m.y + m.dirY * vitesse * dt, 30, CONFIG.monde.hauteur - 30);
    } else if (m.tAttaque <= 0) {
      m.tAttaque = 0.9;
      m.attaqueT = 0.3;
      if (copieCible) blesserCopie(copieCible, m.degats);
      else {
        blesserHeroine(m.degats);
        if (!enDonjon()) return; // K.O. : tout est déjà nettoyé
      }
    }
  }
}

// ------------------------------------------------------- projectiles

function majProjectiles(dt: number): void {
  const centre = centreBirb();
  for (const p of PROJECTILES) {
    if (!p.actif) continue;
    const pas = Math.hypot(p.vx, p.vy) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.reste -= pas;
    if (p.reste <= 0 || p.x < 10 || p.y < 10 || p.x > CONFIG.monde.largeur - 10 || p.y > CONFIG.monde.hauteur - 10) {
      p.actif = false;
      continue;
    }
    if (p.camp === 'monstre') {
      if (dist(p.x, p.y, centre.x, centre.y) < p.taille + 16) {
        p.actif = false;
        blesserHeroine(p.degats, p.origine === 'anneau' ? 'anneau' : 'skillshot');
      }
    } else {
      const touche = grille.plusProche(p.x, p.y, p.taille + 20);
      if (touche) {
        p.actif = false;
        infligerAuMonstre(touche, p.degats, p.couleur);
      }
    }
  }
}

/** Hook de test : saute à la vague n de la Déchirure (multi-boss). */
export function _debugVagueSansFin(n: number): void {
  if (!porte?.sansFin) return;
  monstres.length = 0;
  fileAttente = [];
  vagueSansFin = n;
  lancerVague(n);
}

/** Hook de test (overlay F1 / e2e) : inflige des dégâts à l'héroïne. */
export function _debugDegats(montant: number): void {
  pv -= montant;
  degatsPris += montant;
  if (pv <= 0) mortHeroine();
}

/** Ligne de stats pour le profil et le panneau. */
export function resumeCombat(): string {
  const s = state.stats;
  return `PV ${formatNombre(Math.ceil(pv), 0)}/${formatNombre(s.pvMax, 0)} — ${formatNombre(s.regen, 1)} PV/S — ${formatNombre(s.degats, 0)} DÉGÂTS`;
}

export { PORTE_SANS_FIN, MONSTRES };
