// Le moteur du Fil Rouge (plan 15 §4). Chapitres strictement
// séquentiels ; les étapes `collecter` comptent depuis leur ACCEPTATION
// (delta de cumul mémorisé dans save.filRouge.compteur) ; toutes les
// `action` sont refaisables/instantanées si déjà accomplies — une
// sauvegarde avancée déroule ch. 1→6 sans soft-lock.

import { chapitreDef, type ChapitreDef, type EtapeDef } from '../data/filrouge';
import { CHASSE_FIL_ROUGE } from '../data/chasses';
import { THEME } from '../data/config';
import { state } from '../core/state';
import { dist } from '../core/utils';
import { birb } from '../entities/birb';
import { jeu } from '../core/mode';
import { demarrerChasseScenarisee, chasseActive } from './chasses';
import { evaluerSucces } from './succes';
import { ajouterParticules, ajouterTexteFlottant } from './fx';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';
import { ouvrirDialogue } from '../ui/dialogue';

// le cercle de scène du chapitre 2 (mini-événement : notes + confettis)
const CERCLE_SCENE = { x: 1200, y: 800, rayon: 130 };
let tCercle = 0;

export function chapitreCourant(): ChapitreDef | null {
  return chapitreDef(state.save.filRouge.chapitre) ?? null;
}

export function etapeCourante(): EtapeDef | null {
  const chapitre = chapitreCourant();
  if (!chapitre) return null;
  if (!chapitre.condition(state.save)) return null; // pas encore accessible
  return chapitre.etapes[state.save.filRouge.etape] ?? null;
}

/** La ligne du suivi HUD : « 🧵 CH. 3 — RÉVEILLER LE MÉTIER ». */
export function ligneFilRouge(): string | null {
  const chapitre = chapitreCourant();
  if (!chapitre) return null;
  if (!chapitre.condition(state.save)) return null;
  const etape = chapitre.etapes[state.save.filRouge.etape];
  if (!etape) return null;
  return `🧵 CH. ${chapitre.numero} — ${etape.journal}`;
}

function cumulPour(monnaie: string): number {
  if (monnaie === 'dore') return state.save.cumulDore;
  return state.save.cumulsGlobaux[monnaie as 'popcorn'] ?? 0;
}

/** Progression d'une étape collecter (0..1), depuis son acceptation. */
export function progresCollecte(): number {
  const etape = etapeCourante();
  if (!etape || etape.type !== 'collecter' || !etape.objectif?.monnaie) return 0;
  const acquis = cumulPour(etape.objectif.monnaie) - state.save.filRouge.compteur;
  return Math.min(1, acquis / (etape.objectif.quantite ?? 1));
}

function finirChapitre(chapitre: ChapitreDef): void {
  const fr = state.save.filRouge;
  // le ch. 4 laisse un objet d'histoire : l'Aiguille du Couturier
  if (chapitre.numero === 4) state.save.drapeaux.aiguilleCouturier = true;
  if (chapitre.bobine) {
    fr.bobines.push(chapitre.bobine.id);
    ajouterToast(`🧵 ${chapitre.bobine.nom} ! (${fr.bobines.length}/6)`);
  }
  if (chapitre.recompense.plumes > 0) {
    state.save.plumes += chapitre.recompense.plumes;
    state.save.cumulPlumes += chapitre.recompense.plumes;
    ajouterTexteFlottant(birb.x, birb.y - 60, `+${chapitre.recompense.plumes} ${THEME.prestige.nom}`, THEME.prestige.couleur);
  }
  fr.chapitre += 1;
  fr.etape = 0;
  fr.compteur = 0;
  sons.rebirb();
  ajouterParticules(birb.x, birb.y - 30, chapitre.bobine?.couleur ?? '#f2d16b', 18);
  evaluerSucces();
  sauvegarder();
}

export function avancerEtape(): void {
  const chapitre = chapitreCourant();
  const etape = etapeCourante();
  if (!chapitre || !etape) return;
  const fr = state.save.filRouge;
  fr.etape += 1;
  const suivante = chapitre.etapes[fr.etape];
  if (!suivante) {
    finirChapitre(chapitre);
    return;
  }
  // une étape collecter démarre SON compteur à l'acceptation
  if (suivante.type === 'collecter' && suivante.objectif?.monnaie) {
    fr.compteur = cumulPour(suivante.objectif.monnaie);
  }
  // une étape chasse lance la chasse scénarisée (gratuite, hors rotation)
  if (suivante.type === 'chasse') {
    demarrerChasseScenarisee(CHASSE_FIL_ROUGE.id);
    ajouterToast(`🗺 ${CHASSE_FIL_ROUGE.etapes[0].indice}`);
  }
  ajouterToast(`🧵 ${suivante.journal}`);
  sauvegarder();
}

/** Le PNJ `id` a-t-il une étape « parler » disponible ? (marqueur `!`) */
export function pnjAUneEtape(id: string): boolean {
  const etape = etapeCourante();
  return etape?.type === 'parler' && etape.pnj === id;
}

/** Interaction avec un PNJ : étape du Fil Rouge, sinon ambiance. */
export function parlerAuPnj(id: string, ambiance: string): void {
  const etape = etapeCourante();
  if (etape?.type === 'parler' && etape.pnj === id && etape.dialogue) {
    ouvrirDialogue(etape.dialogue, () => avancerEtape());
    return;
  }
  ouvrirDialogue(ambiance);
}

/** Signal d'une action du monde (forge, atelier…). */
export function signalerActionFilRouge(action: string): void {
  const etape = etapeCourante();
  if (etape?.type === 'action' && etape.objectif?.action === action) avancerEtape();
}

/** L'Effilocheuse est-elle « en scène » ? (dialogue d'avant-combat) */
export function effilocheuseActive(): boolean {
  const etape = etapeCourante();
  return etape?.type === 'porte' && etape.objectif?.porte === 12;
}


/** Le cercle de scène (ch. 2) : où en est le compte à rebours ? */
export function cercleScene(): { actif: boolean; x: number; y: number; rayon: number; progres: number } {
  const etape = etapeCourante();
  const actif = etape?.type === 'action' && etape.objectif?.action === 'cercle_scene' && jeu.mode === 'monde' && state.save.zone === 1;
  return { actif, ...CERCLE_SCENE, progres: Math.min(1, tCercle / 20) };
}

let accNote = 0;

export function majFilRouge(dt: number): void {
  const etape = etapeCourante();
  if (!etape) return;

  // collecter : auto-validée quand le delta atteint l'objectif
  if (etape.type === 'collecter' && progresCollecte() >= 1) {
    ajouterToast('🧵 OBJECTIF ATTEINT !');
    avancerEtape();
    return;
  }

  // les actions « instantanées » si déjà accomplies (pas de soft-lock)
  if (etape.type === 'action' && etape.objectif?.action === 'nid1' && state.save.nid >= 1) {
    avancerEtape();
    return;
  }

  // porte 12 vaincue : la défaite de l'Effilocheuse se joue HORS donjon
  // (un seul overlay à la fois — le récap de victoire d'abord)
  if (
    etape.type === 'porte' &&
    etape.objectif?.porte === 12 &&
    state.save.drapeaux.effilocheuseVaincue &&
    jeu.mode !== 'donjon'
  ) {
    avancerEtape();
    ouvrirDialogue('effilocheuse_defaite');
    return;
  }

  // chasse : la fin est signalée par l'événement de chasses.ts
  if (etape.type === 'chasse' && !chasseActive()) {
    // la chasse scénarisée a été finie (ou perdue → on la relance)
    if (state.save.drapeaux.chasseFilRougeFinie) {
      avancerEtape();
    } else {
      demarrerChasseScenarisee(CHASSE_FIL_ROUGE.id);
    }
    return;
  }

  // le cercle de scène : rester 20 s dedans (notes + confettis)
  if (etape.type === 'action' && etape.objectif?.action === 'cercle_scene') {
    const cercle = cercleScene();
    if (cercle.actif && dist(birb.x, birb.y, cercle.x, cercle.y) < cercle.rayon) {
      tCercle += dt;
      accNote += dt;
      if (accNote > 0.8) {
        accNote = 0;
        ajouterParticules(birb.x + (Math.random() - 0.5) * 80, birb.y - 40, '#39c5bb', 3);
        ajouterTexteFlottant(birb.x + (Math.random() - 0.5) * 60, birb.y - 70, '♪', '#39c5bb');
      }
      if (tCercle >= 20) {
        tCercle = 0;
        ajouterParticules(birb.x, birb.y - 40, '#ff8ac2', 24);
        avancerEtape();
      }
    } else {
      tCercle = Math.max(0, tCercle - dt * 2); // sortie = ça redescend
    }
  }
}

export function initFilRouge(): void {
  window.addEventListener('chleatoune-chasse-finie', (e) => {
    if ((e as CustomEvent).detail === CHASSE_FIL_ROUGE.id) {
      state.save.drapeaux.chasseFilRougeFinie = true;
      sauvegarder();
    }
  });
}
