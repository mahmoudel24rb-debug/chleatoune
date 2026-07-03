// Le Fil Rouge (plan 15 §4-5) : la quête principale en 7 chapitres.
// Le monde est une tapisserie brodée par le GRAND COUTURIER, disparu.
// Elle s'effiloche. Chléatoune retrouve les 6 bobines primordiales,
// recoud le monde, et rouvre l'ATELIER où l'attend ce qu'il a laissé.
//
// RÈGLE CAPITALE : une étape `collecter` compte à partir de son
// ACCEPTATION (delta de cumul), jamais depuis les cumuls globaux —
// sinon une sauvegarde avancée auto-complète l'histoire en 10 s.
// Les chapitres sont STRICTEMENT séquentiels ; leurs conditions
// s'alignent sur la progression existante, jamais l'inverse.

import type { MonnaieId } from './config';
import type { SaveData } from '../core/state';

export interface EtapeDef {
  id: string;
  type: 'parler' | 'collecter' | 'action' | 'porte' | 'chasse';
  pnj?: string;
  dialogue?: string;
  objectif?: { monnaie?: MonnaieId | 'dore'; quantite?: number; action?: string; porte?: number };
  /** ligne du suivi HUD : « PARLER À YUUMI » */
  journal: string;
}

export interface ChapitreDef {
  numero: number;
  titre: string;
  zone: number;
  /** gating d'ACCÈS au chapitre */
  condition: (s: SaveData) => boolean;
  etapes: EtapeDef[];
  bobine: { id: string; nom: string; couleur: string } | null;
  recompense: { plumes: number; dores?: number };
}

export const CHAPITRES: ChapitreDef[] = [
  {
    numero: 1,
    titre: 'LA PREMIÈRE MAILLE',
    zone: 0,
    condition: (s) => s.cumulsGlobaux.popcorn >= 50,
    etapes: [
      { id: 'c1_parler', type: 'parler', pnj: 'brioche', dialogue: 'ch1_rencontre', journal: 'PARLER À GRAND-MÈRE BRIOCHE' },
      { id: 'c1_collecter', type: 'collecter', objectif: { monnaie: 'popcorn', quantite: 150 }, journal: 'COLLECTER 150 SMISKI' },
      { id: 'c1_retour', type: 'parler', pnj: 'brioche', dialogue: 'ch1_retour', journal: 'REVENIR VOIR BRIOCHE' },
    ],
    bobine: { id: 'verte', nom: 'LA BOBINE VERTE', couleur: '#7dbb5c' },
    recompense: { plumes: 2 },
  },
  {
    numero: 2,
    titre: 'LE FIL DE LA MÉLODIE',
    zone: 1,
    condition: (s) => s.rebirbs >= 1,
    etapes: [
      { id: 'c2_parler', type: 'parler', pnj: 'regisseuse', dialogue: 'ch2_rencontre', journal: 'PARLER À LA RÉGISSEUSE (SCÈNE)' },
      { id: 'c2_collecter', type: 'collecter', objectif: { monnaie: 'graine', quantite: 300 }, journal: 'COLLECTER 300 MIKU' },
      { id: 'c2_cercle', type: 'parler', pnj: 'regisseuse', dialogue: 'ch2_cercle', journal: 'REVENIR VOIR LA RÉGISSEUSE' },
      { id: 'c2_action', type: 'action', objectif: { action: 'cercle_scene' }, journal: 'RESTER 20 S DANS LE CERCLE DE SCÈNE' },
      { id: 'c2_fin', type: 'parler', pnj: 'regisseuse', dialogue: 'ch2_fin', journal: 'LA RÉGISSEUSE T’ATTEND' },
    ],
    bobine: { id: 'turquoise', nom: 'LA BOBINE TURQUOISE', couleur: '#39c5bb' },
    recompense: { plumes: 3 },
  },
  {
    numero: 3,
    titre: 'LE MÉTIER ENDORMI',
    zone: 2,
    condition: (s) => s.rebirbs >= 2,
    etapes: [
      { id: 'c3_parler', type: 'parler', pnj: 'yuumi', dialogue: 'ch3_rencontre', journal: 'PARLER À YUUMI (FORÊT)' },
      { id: 'c3_action', type: 'action', objectif: { action: 'nid1' }, journal: 'ÉVEILLER LE MÉTIER (PALIER 1 DE L’ARBRE)' },
      { id: 'c3_fin', type: 'parler', pnj: 'yuumi', dialogue: 'ch3_fin', journal: 'REVENIR VOIR YUUMI' },
    ],
    bobine: { id: 'brune', nom: 'LA BOBINE BRUNE', couleur: '#8a5a34' },
    recompense: { plumes: 4 },
  },
  {
    numero: 4,
    titre: 'LA FORGE À AIGUILLES',
    zone: 3,
    condition: (s) => s.rebirbs >= 3,
    etapes: [
      { id: 'c4_parler', type: 'parler', pnj: 'vieuxpic', dialogue: 'ch4_rencontre', journal: 'PARLER AU VIEUX PIC (MINE)' },
      { id: 'c4_collecter', type: 'collecter', objectif: { monnaie: 'minerai', quantite: 400 }, journal: 'COLLECTER 400 MINERAI' },
      { id: 'c4_avant_forge', type: 'parler', pnj: 'vieuxpic', dialogue: 'ch4_forge', journal: 'REVENIR VOIR LE VIEUX PIC' },
      { id: 'c4_action', type: 'action', objectif: { action: 'forge' }, journal: 'ACTIVER LA FORGE, AU FOND DE LA MINE' },
      { id: 'c4_fin', type: 'parler', pnj: 'vieuxpic', dialogue: 'ch4_fin', journal: 'LE VIEUX PIC T’ATTEND' },
    ],
    bobine: { id: 'grise', nom: 'LA BOBINE GRISE', couleur: '#9aa2b3' },
    recompense: { plumes: 5 },
  },
  {
    numero: 5,
    titre: 'LA RÉSERVE DORÉE',
    zone: 4,
    condition: (s) => s.filRouge.chapitre > 4,
    etapes: [
      { id: 'c5_parler', type: 'parler', pnj: 'sphinge', dialogue: 'ch5_rencontre', journal: 'PARLER À LA SPHINGE (DÉSERT)' },
      { id: 'c5_chasse', type: 'chasse', journal: 'SUIVRE LES INDICES DE LA SPHINGE' },
      { id: 'c5_fin', type: 'parler', pnj: 'sphinge', dialogue: 'ch5_fin', journal: 'LA SPHINGE T’ATTEND' },
    ],
    bobine: { id: 'doree', nom: 'LA BOBINE DORÉE', couleur: '#f2d16b' },
    recompense: { plumes: 6 },
  },
  {
    numero: 6,
    titre: 'L’ENVERS DU DÉCOR',
    zone: -1, // le Mercier vit dans l'Envers
    condition: (s) => s.swarm.porteMax >= 12,
    etapes: [
      { id: 'c6_recit', type: 'parler', pnj: 'mercier', dialogue: 'ch6_recit', journal: 'ÉCOUTER LE MERCIER (L’ENVERS)' },
      { id: 'c6_porte', type: 'porte', objectif: { porte: 12 }, journal: 'VAINCRE LA GRANDE EFFILOCHEUSE (PORTE 12)' },
      { id: 'c6_fin', type: 'parler', pnj: 'mercier', dialogue: 'ch6_fin', journal: 'REVENIR VOIR LE MERCIER' },
    ],
    bobine: { id: 'violette', nom: 'LA BOBINE VIOLETTE', couleur: '#b48ae0' },
    recompense: { plumes: 8 },
  },
  {
    numero: 7,
    titre: 'L’ATELIER',
    zone: 5,
    condition: (s) => s.filRouge.bobines.length >= 6,
    etapes: [
      { id: 'c7_atelier', type: 'action', objectif: { action: 'atelier' }, journal: 'OUVRIR LA PORTE DE L’ATELIER (6 BOBINES)' },
    ],
    bobine: null,
    recompense: { plumes: 0 },
  },
];

export function chapitreDef(numero: number): ChapitreDef | undefined {
  return CHAPITRES.find((c) => c.numero === numero);
}
