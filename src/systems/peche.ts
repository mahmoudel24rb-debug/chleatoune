// La pêche v2, fidèle au Birb original : on se place où on veut sur le
// ponton (un banc de poissons bouge dans l'eau), ESPACE lance/ferre,
// et la boutique (B) vend des cannes, des appâts et des pêcheurs
// automatiques qui travaillent même quand on est ailleurs.

import { jeu } from '../core/mode';
import { state } from '../core/state';
import { input } from '../core/input';
import { POISSONS, RARETES, tirerEspece, xpPourNiveauPeche, type EspecePoisson } from '../data/poissons';
import { APPATS, CANNES, DELAI_PECHEUR } from '../data/peche-boutique';
import { crediter } from './economy';
import { progresserQuete } from './quetes';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export type EtatPeche = 'pret' | 'attente' | 'touche';

const peche = {
  etat: 'pret' as EtatPeche,
  temps: 0,
  message: 'ESPACE : LANCER — B : BOUTIQUE',
  prise: null as { espece: EspecePoisson; shiny: boolean } | null,
  animT: 0,
  /** position de l'héroïne le long du ponton (fraction de la largeur) */
  x: 0.3,
  /** le banc de poissons : position (fraction) + temps avant déplacement */
  spot: 0.65,
  spotT: 18,
};

export function getPeche() {
  return peche;
}

export function canneEquipee() {
  return CANNES[Math.min(state.save.peche.canne, CANNES.length - 1)];
}

export function appatEquipe() {
  const id = state.save.peche.appatActif;
  if (!id || (state.save.peche.appats[id] ?? 0) <= 0) return null;
  return APPATS.find((a) => a.id === id) ?? null;
}

/** Le bouchon tombe un peu devant l'héroïne. */
export function positionBouchon(): number {
  return Math.min(0.97, peche.x + 0.14);
}

export function surLeSpot(): boolean {
  return Math.abs(positionBouchon() - peche.spot) < 0.09;
}

export function entrerPeche(): void {
  jeu.mode = 'peche';
  peche.etat = 'pret';
  peche.message = 'ESPACE : LANCER — B : BOUTIQUE';
  peche.prise = null;
}

export function sortirPeche(): void {
  jeu.mode = 'monde';
  sauvegarder();
}

export function bonusChance(): number {
  const appat = appatEquipe();
  return (
    (1 + state.save.peche.niveau * 0.05) *
    canneEquipee().chance *
    (appat?.chance ?? 1) *
    (surLeSpot() ? 1.5 : 1)
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

/** Enregistre une capture (héroïne ou pêcheur auto) : dex, gains, XP. */
function enregistrerCapture(espece: EspecePoisson, shiny: boolean, part = 1): void {
  const r = RARETES[espece.rarete];
  crediter('popcorn', r.valeur * (shiny ? 10 : 1) * part, 0, 0, true);
  gagnerXpPeche(r.xp * (shiny ? 3 : 1) * part);
  progresserQuete('pecher', 1);

  const dex = state.save.peche.dex;
  const entree = dex[espece.id] ?? { captures: 0, shiny: 0 };
  const premiere = entree.captures === 0;
  entree.captures += 1;
  if (shiny) entree.shiny += 1;
  dex[espece.id] = entree;

  if (premiere && espece.rarete !== 'commun') {
    const plumes = espece.rarete === 'rare' ? 1 : espece.rarete === 'epique' ? 3 : 10;
    state.save.plumes += plumes;
    state.save.cumulPlumes += plumes;
    ajouterToast(`PREMIÈRE CAPTURE : ${espece.nom} ! +${plumes} PLUMES`);
  }
}

function capturer(): void {
  const espece = tirerEspece(bonusChance());
  const shiny = Math.random() < 0.02 * canneEquipee().shiny;
  enregistrerCapture(espece, shiny);
  peche.prise = { espece, shiny };
  peche.message = `${shiny ? '✨ SHINY ! ' : ''}${espece.nom} (${espece.rarete.toUpperCase()}) — ESPACE POUR RELANCER`;
  sons.achat();
  sauvegarder();
}

/** ESPACE : lancer la ligne, ou ferrer si ça mord. */
export function actionPeche(): void {
  if (peche.etat === 'pret') {
    // consomme un appât s'il y en a un d'équipé
    const appat = appatEquipe();
    if (appat) {
      state.save.peche.appats[appat.id] -= 1;
      if (state.save.peche.appats[appat.id] <= 0) {
        state.save.peche.appatActif = null;
        ajouterToast(`PLUS DE ${appat.nom} !`);
      }
    }
    peche.etat = 'attente';
    peche.temps =
      ((2 + Math.random() * 3.5) / (1 + state.save.peche.niveau * 0.015)) *
      canneEquipee().vitesse *
      (appat?.vitesse ?? 1) *
      (surLeSpot() ? 0.6 : 1);
    peche.message = surLeSpot() ? '… (LE BANC EST LÀ !)' : '…';
    peche.prise = null;
    sons.coup();
  } else if (peche.etat === 'touche') {
    peche.etat = 'pret';
    capturer();
  } else {
    peche.etat = 'pret';
    peche.message = 'TROP TÔT ! LE POISSON S’EST ENFUI…';
    sons.refus();
  }
}

export function majPeche(dt: number): void {
  peche.animT += dt;

  // Se déplacer sur le ponton pour choisir son spot
  const axe = input.axeX();
  if (axe !== 0) {
    peche.x = Math.max(0.05, Math.min(0.82, peche.x + axe * 0.14 * dt));
  }

  // Le banc de poissons se déplace régulièrement
  peche.spotT -= dt;
  if (peche.spotT <= 0) {
    peche.spotT = 14 + Math.random() * 10;
    peche.spot = 0.15 + Math.random() * 0.8;
  }

  if (peche.etat === 'attente') {
    peche.temps -= dt;
    if (peche.temps <= 0) {
      peche.etat = 'touche';
      peche.temps = 0.9;
      peche.message = '! ! !  ESPACE  ! ! !';
      sons.touche();
    }
  } else if (peche.etat === 'touche') {
    peche.temps -= dt;
    if (peche.temps <= 0) {
      peche.etat = 'pret';
      peche.message = 'ÇA S’EST ENFUI… ESPACE POUR RELANCER';
      sons.refus();
    }
  }
}

// ------------------------------------------------ pêcheurs automatiques

let tPecheurs = 0;

/** Les pêcheurs travaillent en continu, où que soit l'héroïne. */
export function majPecheurs(dt: number): void {
  const nombre = state.save.peche.pecheurs;
  if (nombre <= 0) return;
  tPecheurs += dt * nombre;
  while (tPecheurs >= DELAI_PECHEUR) {
    tPecheurs -= DELAI_PECHEUR;
    const espece = tirerEspece(0.8); // ils visent moins bien que toi
    enregistrerCapture(espece, Math.random() < 0.01, 0.5);
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
