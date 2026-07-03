// La pêche v3, façon Animal Crossing (plan 17) : les poissons existent
// AVANT d'être pêchés (ombres de taille fixe par espèce), le lancer se
// CHARGE (3 bandes de profondeur), la touche se lit (mordillages qui
// punissent le ferrage hâtif, plongeon à fenêtre courte), et les
// rares+ se GAGNENT à la lutte (capture vs tension, un seul bouton).
// Toute l'économie (raretés, valeurs, XP, cannes, appâts, pêcheurs
// auto, Mikudex) est conservée telle quelle.

import { jeu } from '../core/mode';
import { state } from '../core/state';
import { input } from '../core/input';
import {
  creneauActuel,
  especeMord,
  POISSONS,
  RARETES,
  tirerEspece,
  tirerTaille,
  xpPourNiveauPeche,
  type EspecePoisson,
} from '../data/poissons';
import { PECHE, tirerMordillages } from '../data/peche-config';
import { APPATS, CANNES, DELAI_PECHEUR } from '../data/peche-boutique';
import { crediter } from './economy';
import { bonusActif } from './calendrier';
import { progresserQuete } from './quetes';
import { evaluerSucces } from './succes';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export type EtatPeche = 'vise' | 'charge' | 'attente' | 'mordille' | 'plongeon' | 'lutte' | 'revele';

export interface Ombre {
  espece: EspecePoisson;
  shiny: boolean;
  /** position : x en fraction de la largeur d'eau, prof en px du ponton */
  x: number;
  prof: number;
  vx: number;
  tVie: number;
  tDemiTour: number;
  phase: number; // ondulation
  /** l'ombre a mordu à l'hameçon (elle est sous le bouchon) */
  accrochee: boolean;
}

export interface PriseRevelee {
  espece: EspecePoisson;
  shiny: boolean;
  taille: number;
  record: boolean;
  t: number; // temps depuis la révélation (pose fière puis carte)
}

const peche = {
  etat: 'vise' as EtatPeche,
  message: 'MAINTIENS ESPACE : LANCER — B : BOUTIQUE',
  animT: 0,
  /** position de l'héroïne le long du ponton (fraction de la largeur) */
  x: 0.3,
  /** le banc : des OISEAUX tournent au-dessus (fraction) */
  spot: 0.65,
  spotT: 18,

  // le lancer chargé
  jauge: 0,
  sensJauge: 1,
  // le bouchon
  bouchonX: 0,
  bouchonProf: 0,
  // la séquence de touche
  ombreCible: null as Ombre | null,
  mordillesRestants: 0,
  tEtat: 0,
  // la lutte
  capture: 0,
  tension: 0,
  tremblement: 0, // > 0 : ça tremble, relâche !
  tProchainTremblement: 0,
  tremblementsFaits: 0,
  // la révélation
  prise: null as PriseRevelee | null,
  // secousse d'écran au plongeon
  shake: 0,
};

const ombres: Ombre[] = [];
let tSpawnOmbre = 3;
// les prises des pêcheurs automatiques (pour le petit splash au ponton)
const prisesAuto: { t: number; index: number }[] = [];

export function getPeche() {
  return peche;
}

export function getOmbres(): readonly Ombre[] {
  return ombres;
}

export function getPrisesAuto(): readonly { t: number; index: number }[] {
  return prisesAuto;
}

export function canneEquipee() {
  return CANNES[Math.min(state.save.peche.canne, CANNES.length - 1)];
}

export function appatEquipe() {
  const id = state.save.peche.appatActif;
  if (!id || (state.save.peche.appats[id] ?? 0) <= 0) return null;
  return APPATS.find((a) => a.id === id) ?? null;
}

export function entrerPeche(): void {
  jeu.mode = 'peche';
  peche.etat = 'vise';
  peche.message = 'MAINTIENS ESPACE : LANCER — B : BOUTIQUE';
  peche.prise = null;
  ombres.length = 0;
  tSpawnOmbre = 1;
}

export function sortirPeche(): void {
  jeu.mode = 'monde';
  sauvegarder();
}

/** Le bouchon est-il sous les oiseaux du banc ? (rareté ×1,5) */
export function sousLeBanc(): boolean {
  return Math.abs(peche.bouchonX - peche.spot) < PECHE.rayonBanc / 900;
}

export function bonusChance(): number {
  const appat = appatEquipe();
  return (
    (1 + state.save.peche.niveau * 0.05) *
    canneEquipee().chance *
    (appat?.chance ?? 1) *
    (sousLeBanc() ? PECHE.multBanc : 1)
  );
}

function gagnerXpPeche(montant: number): void {
  const p = state.save.peche;
  p.xp += Math.round(montant * state.stats.multXp);
  let monte = false;
  while (p.xp >= xpPourNiveauPeche(p.niveau)) {
    p.xp -= xpPourNiveauPeche(p.niveau);
    p.niveau += 1;
    monte = true;
  }
  if (monte) {
    sons.niveau();
    ajouterToast(`PÊCHE NIVEAU ${p.niveau} ! 🎣`);
  }
}

/** Enregistre une capture : dex, records, gains, XP, quêtes, succès. */
function enregistrerCapture(espece: EspecePoisson, shiny: boolean, taille: number, part = 1): boolean {
  const r = RARETES[espece.rarete];
  crediter('popcorn', r.valeur * (shiny ? 10 : 1) * part, 0, 0, true);
  gagnerXpPeche(r.xp * (shiny ? 3 : 1) * part);
  progresserQuete('pecher', 1);

  const dex = state.save.peche.dex;
  const entree = dex[espece.id] ?? { captures: 0, shiny: 0, tailleRecord: 0 };
  const premiere = entree.captures === 0;
  entree.captures += 1;
  if (shiny) entree.shiny += 1;
  const record = taille > (entree.tailleRecord ?? 0);
  if (record) entree.tailleRecord = taille;
  dex[espece.id] = entree;

  if (premiere && espece.rarete !== 'commun') {
    const plumes = espece.rarete === 'rare' ? 1 : espece.rarete === 'epique' ? 3 : 10;
    state.save.plumes += plumes;
    state.save.cumulPlumes += plumes;
    ajouterToast(`PREMIÈRE CAPTURE : ${espece.nom} ! +${plumes} PLUMES`);
  }
  evaluerSucces();
  return record;
}

// -------------------------------------------------------- les ombres

function creerOmbre(): Ombre | null {
  // l'espèce est tirée D'ABORD (rareté + créneau), sa bande la place
  const espece = tirerEspece(bonusChance(), (p) => especeMord(p));
  const [pMin, pMax] = PECHE.bandes[espece.bande];
  return {
    espece,
    shiny: Math.random() < 0.02 * canneEquipee().shiny,
    x: Math.random() < 0.5 ? -0.05 : 1.05, // entre par un bord
    prof: pMin + 10 + Math.random() * (pMax - pMin - 20),
    vx: (0.03 + Math.random() * 0.04) * (Math.random() < 0.5 ? 1 : -1),
    tVie: PECHE.vieMin + Math.random() * (PECHE.vieMax - PECHE.vieMin),
    tDemiTour: 3 + Math.random() * 6,
    phase: Math.random() * Math.PI * 2,
    accrochee: false,
  };
}

function majOmbres(dt: number): void {
  tSpawnOmbre -= dt;
  if (tSpawnOmbre <= 0 && ombres.length < PECHE.ombresMax) {
    const ombre = creerOmbre();
    if (ombre) ombres.push(ombre);
    tSpawnOmbre = PECHE.spawnMin + Math.random() * (PECHE.spawnMax - PECHE.spawnMin);
  }

  const bouchonActif = peche.etat === 'attente';
  const rayon =
    (PECHE.rayonAttraction * (appatEquipe() ? PECHE.multAttractionAppat : 1)) / 900; // en fraction

  for (let i = ombres.length - 1; i >= 0; i--) {
    const o = ombres[i];
    if (o === peche.ombreCible) continue; // en pleine séquence de touche
    o.tVie -= dt;
    o.phase += dt * 2;
    if (o.tVie <= 0) {
      // elle repart d'elle-même, vers le bord le plus proche
      o.x += (o.x < 0.5 ? -1 : 1) * 0.12 * dt;
      if (o.x < -0.08 || o.x > 1.08) ombres.splice(i, 1);
      continue;
    }
    o.tDemiTour -= dt;
    if (o.tDemiTour <= 0) {
      o.tDemiTour = 3 + Math.random() * 6;
      o.vx *= -1;
    }
    // attirance vers le bouchon posé dans son rayon
    if (bouchonActif && !o.accrochee) {
      const dx = peche.bouchonX - o.x;
      const dProf = peche.bouchonProf - o.prof;
      const d = Math.hypot(dx * 900, dProf);
      if (d < PECHE.rayonAttraction * (appatEquipe() ? PECHE.multAttractionAppat : 1)) {
        o.x += Math.sign(dx) * Math.min(Math.abs(dx), 0.06 * dt * (bonusActif('morsure') ? 1.25 : 1));
        o.prof += Math.sign(dProf) * Math.min(Math.abs(dProf), 26 * dt);
        if (Math.abs(dx) < 0.015 && Math.abs(dProf) < 12) {
          // elle se place dessous : la séquence de touche commence
          o.accrochee = true;
          peche.ombreCible = o;
          peche.mordillesRestants = tirerMordillages(o.espece.rarete);
          peche.etat = 'mordille';
          peche.tEtat = 0.15;
        }
        continue;
      }
    }
    o.x += o.vx * dt;
    o.prof += Math.sin(o.phase) * 4 * dt;
    if (o.x < -0.08 || o.x > 1.08) ombres.splice(i, 1);
  }
  void rayon;
}

// ------------------------------------------------- la machine à états

function fuite(message: string): void {
  if (peche.ombreCible) {
    const index = ombres.indexOf(peche.ombreCible);
    if (index >= 0) ombres.splice(index, 1);
  }
  peche.ombreCible = null;
  peche.etat = 'vise';
  peche.message = message;
  sons.refus();
}

function remonterLigne(): void {
  if (peche.ombreCible) peche.ombreCible.accrochee = false;
  peche.ombreCible = null;
  peche.etat = 'vise';
  peche.message = 'MAINTIENS ESPACE : LANCER — B : BOUTIQUE';
}

function ferrer(): void {
  const ombre = peche.ombreCible;
  if (!ombre) return;
  // l'appât se consomme À LA TOUCHE (plan 17, pièges)
  const appat = appatEquipe();
  if (appat) {
    state.save.peche.appats[appat.id] -= 1;
    if (state.save.peche.appats[appat.id] <= 0) {
      state.save.peche.appatActif = null;
      ajouterToast(`PLUS DE ${appat.nom} !`);
    }
  }
  // commun non-shiny : capture directe (le rythme cozy est préservé)
  if (ombre.espece.rarete === 'commun' && !ombre.shiny) {
    reveler();
    return;
  }
  // rare+ ou shiny : LA LUTTE
  peche.etat = 'lutte';
  peche.capture = 0;
  peche.tension = 0;
  peche.tremblement = 0;
  peche.tremblementsFaits = 0;
  peche.tProchainTremblement = 0.8 + Math.random() * 1.2;
  peche.message = 'MAINTIENS POUR RAMENER — RELÂCHE SI ÇA TREMBLE !';
}

function reveler(): void {
  const ombre = peche.ombreCible!;
  const taille = tirerTaille(ombre.espece, ombre.shiny);
  const record = enregistrerCapture(ombre.espece, ombre.shiny, taille);
  peche.prise = { espece: ombre.espece, shiny: ombre.shiny, taille, record, t: 0 };
  const index = ombres.indexOf(ombre);
  if (index >= 0) ombres.splice(index, 1);
  peche.ombreCible = null;
  peche.etat = 'revele';
  peche.message = '';
  sons.achat();
  if (record) ajouterToast(`📏 NOUVEAU RECORD : ${ombre.espece.nom} — ${taille} CM !`);
  sauvegarder();
}

/** ESPACE (appui) : selon l'état — armer, ferrer, passer. */
export function actionPeche(): void {
  switch (peche.etat) {
    case 'vise':
      peche.etat = 'charge';
      peche.jauge = 0;
      peche.sensJauge = 1;
      peche.message = 'RELÂCHE POUR LANCER !';
      break;
    case 'attente':
      // neutre : on remonte juste la ligne — seule la fausse touche punit
      remonterLigne();
      break;
    case 'mordille':
      // LA punition AC : ferrer un mordillage = le poisson fuit
      fuite('TROP TÔT ! L’OMBRE FILE…');
      break;
    case 'plongeon':
      ferrer();
      break;
    case 'revele':
      if ((peche.prise?.t ?? 0) > 0.8) {
        peche.prise = null;
        peche.etat = 'vise';
        peche.message = 'MAINTIENS ESPACE : LANCER — B : BOUTIQUE';
      }
      break;
    default:
      break;
  }
}

export function majPeche(dt: number): void {
  peche.animT += dt;
  peche.shake = Math.max(0, peche.shake - dt);

  // Se déplacer sur le ponton pour choisir son spot
  if (peche.etat === 'vise' || peche.etat === 'charge') {
    const axe = input.axeX();
    if (axe !== 0) peche.x = Math.max(0.05, Math.min(0.82, peche.x + axe * 0.14 * dt));
  }

  // Les oiseaux du banc se déplacent régulièrement
  peche.spotT -= dt;
  if (peche.spotT <= 0) {
    peche.spotT = 14 + Math.random() * 10;
    peche.spot = 0.15 + Math.random() * 0.8;
  }

  majOmbres(dt);

  switch (peche.etat) {
    case 'charge': {
      // jauge aller-retour ; relâcher = lancer à la profondeur choisie
      peche.jauge += (peche.sensJauge * 100 * dt) / PECHE.chargeSec;
      if (peche.jauge >= 100) {
        peche.jauge = 100;
        peche.sensJauge = -1;
      } else if (peche.jauge <= 0) {
        peche.jauge = 0;
        peche.sensJauge = 1;
      }
      if (!input.actionTenue()) {
        peche.bouchonX = Math.min(0.97, peche.x + 0.05 + (peche.jauge / 100) * 0.18);
        peche.bouchonProf = PECHE.profMin + (peche.jauge / 100) * (PECHE.profMax - PECHE.profMin);
        peche.etat = 'attente';
        peche.message = '…';
        sons.coup();
      }
      break;
    }

    case 'mordille': {
      peche.tEtat -= dt;
      if (peche.tEtat <= 0) {
        if (peche.mordillesRestants > 0) {
          peche.mordillesRestants -= 1;
          sons.plic();
          peche.tEtat =
            PECHE.mordilleSec +
            (PECHE.entreMordilles[0] + Math.random() * (PECHE.entreMordilles[1] - PECHE.entreMordilles[0])) *
              (bonusActif('morsure') ? 0.8 : 1);
        } else {
          // LE PLONGEON : le bouchon coule, fenêtre courte
          peche.etat = 'plongeon';
          peche.tEtat = PECHE.fenetreFerrage;
          peche.shake = 0.18;
          sons.plouf();
        }
      }
      break;
    }

    case 'plongeon': {
      peche.tEtat -= dt;
      if (peche.tEtat <= 0) fuite('ENVOLÉ… IL FALLAIT FERRER PENDANT LE PLONGEON.');
      break;
    }

    case 'lutte': {
      const ombre = peche.ombreCible;
      if (!ombre) {
        peche.etat = 'vise';
        break;
      }
      const nervosite = ombre.shiny ? PECHE.lutte.multShiny : 1;
      const tolerance = PECHE.lutte.toleranceCannes[Math.min(state.save.peche.canne, 3)];
      // les phases de tremblement : il FAUT relâcher
      peche.tProchainTremblement -= dt;
      if (peche.tremblement > 0) {
        peche.tremblement -= dt;
        if (Math.floor(peche.animT * 9) % 3 === 0) sons.tension();
      } else if (peche.tProchainTremblement <= 0 && peche.tremblementsFaits < 2) {
        peche.tremblementsFaits += 1;
        peche.tremblement =
          PECHE.lutte.dureeTremblement[0] +
          Math.random() * (PECHE.lutte.dureeTremblement[1] - PECHE.lutte.dureeTremblement[0]);
        peche.tProchainTremblement = 1.2 + Math.random() * 1.4;
      }
      if (input.actionTenue()) {
        peche.capture += PECHE.lutte.vitesseCapture * dt;
        peche.tension +=
          PECHE.lutte.vitesseTension *
          nervosite *
          (peche.tremblement > 0 ? PECHE.lutte.multTremblement : 1) *
          (dt / tolerance);
      } else {
        peche.tension -= PECHE.lutte.detenteTension * dt;
      }
      peche.tension = Math.max(0, peche.tension);
      if (peche.capture >= 100) {
        reveler();
      } else if (peche.tension >= 100) {
        sons.casse();
        fuite('💔 LA LIGNE A CASSÉ ! LE POISSON EST PARTI…');
      }
      break;
    }

    case 'revele': {
      if (peche.prise) peche.prise.t += dt;
      break;
    }

    default:
      break;
  }
}

// ------------------------------------------------ pêcheurs automatiques

let tPecheurs = 0;

/** Les pêcheurs travaillent en continu, où que soit l'héroïne.
 *  (formules inchangées : 1 prise/40 s partagée, 50 % valeur, 1 % shiny) */
export function majPecheurs(dt: number): void {
  const nombre = state.save.peche.pecheurs;
  for (let i = prisesAuto.length - 1; i >= 0; i--) {
    prisesAuto[i].t -= dt;
    if (prisesAuto[i].t <= 0) prisesAuto.splice(i, 1);
  }
  if (nombre <= 0) return;
  tPecheurs += dt * nombre;
  while (tPecheurs >= DELAI_PECHEUR) {
    tPecheurs -= DELAI_PECHEUR;
    const espece = tirerEspece(0.8, (p) => especeMord(p)); // ils visent moins bien que toi
    const shiny = Math.random() < 0.01;
    enregistrerCapture(espece, shiny, tirerTaille(espece, shiny), 0.5);
    prisesAuto.push({ t: 1.4, index: Math.floor(Math.random() * Math.max(1, nombre)) });
  }
}

/** Nombre d'espèces découvertes / total (pour le profil et le dex). */
export function progressionDex(): { decouvertes: number; total: number } {
  const dex = state.save.peche.dex;
  return {
    decouvertes: POISSONS.filter((p) => (dex[p.id]?.captures ?? 0) > 0).length,
    total: POISSONS.length,
  };
}

export { creneauActuel };
