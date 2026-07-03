// La boîte de dialogue (plan 15 §2) : cadre rétro en bas d'écran,
// portrait à gauche, nom en couleur, texte au fil (~45 caractères/s).
// Touche action = compléter la ligne, puis passer. Échap = couper
// proprement (reprise à la boîte en cours à la prochaine ouverture).
// Pendant un dialogue : déplacements bloqués ; interdits en mode donjon.

import { DIALOGUES, type Replique } from '../data/dialogues';
import { pnjParId, VOIX } from '../data/pnj';
import {
  SPRITES_DOUGHCAT,
  SPRITES_HEROINE,
  SPRITES_YUUMI,
  chargerSpritesGlb,
  frameGlb,
} from '../core/sprites';

const VITESSE_TEXTE = 45; // caractères par seconde

let boite: HTMLElement | null = null;
let portraitEl: HTMLCanvasElement;
let nomEl: HTMLElement;
let texteEl: HTMLElement;
let suiteEl: HTMLElement;

let dialogueId: string | null = null;
let repliques: Replique[] = [];
let index = 0;
let tTexte = 0;
let surFin: (() => void) | null = null;
// Échap en plein dialogue : on retient où on en était, par dialogue
const reprises: Record<string, number> = {};

export function dialogueEnCours(): boolean {
  return dialogueId !== null;
}

function portraitPour(qui: string): HTMLCanvasElement | null {
  if (qui === 'chleatoune') return SPRITES_HEROINE.face.idle;
  if (qui === 'narrateur') return null;
  if (qui === 'mercier') return frameGlb('pnj_mercier', 'face', 'idle') ?? null;
  if (qui === 'effilocheuse') return frameGlb('b_velkoz', 'face', 'idle') ?? null;
  if (qui === 'sphinge') return chargerSpritesGlb('c_desert', 2)['face_idle'] ?? null;
  const pnj = pnjParId(qui);
  if (!pnj) return null;
  if (pnj.spriteId === 'doughcat') return SPRITES_DOUGHCAT.idle;
  if (pnj.spriteId === 'yuumi') return SPRITES_YUUMI.idle;
  return chargerSpritesGlb(pnj.spriteId, 2)['face_idle'] ?? null;
}

function construire(): void {
  if (boite) return;
  boite = document.createElement('div');
  boite.id = 'dialogue';
  boite.className = 'dialogue cache';
  portraitEl = document.createElement('canvas');
  portraitEl.className = 'dialogue-portrait';
  portraitEl.width = 96;
  portraitEl.height = 96;
  const droite = document.createElement('div');
  droite.className = 'dialogue-droite';
  nomEl = document.createElement('div');
  nomEl.className = 'dialogue-nom';
  texteEl = document.createElement('div');
  texteEl.className = 'dialogue-texte';
  suiteEl = document.createElement('div');
  suiteEl.className = 'dialogue-suite';
  suiteEl.textContent = '▼ [E]';
  droite.append(nomEl, texteEl, suiteEl);
  boite.append(portraitEl, droite);
  document.getElementById('game-wrap')!.appendChild(boite);
  boite.addEventListener('click', avancerDialogue);
}

function montrerReplique(): void {
  const r = repliques[index];
  const voix = VOIX[r.qui] ?? { nom: r.qui.toUpperCase(), couleur: '#e8e8f0' };
  nomEl.textContent = voix.nom;
  nomEl.style.color = voix.couleur;
  tTexte = 0;
  texteEl.textContent = '';
  const ctx = portraitEl.getContext('2d')!;
  ctx.clearRect(0, 0, 96, 96);
  const portrait = portraitPour(r.qui);
  portraitEl.style.visibility = portrait ? 'visible' : 'hidden';
  if (portrait) {
    ctx.imageSmoothingEnabled = false;
    const echelle = Math.min(96 / portrait.width, 96 / portrait.height);
    const w = portrait.width * echelle;
    const h = portrait.height * echelle;
    ctx.drawImage(portrait, (96 - w) / 2, 96 - h, w, h);
  }
}

export function ouvrirDialogue(id: string, apres?: () => void): void {
  const liste = DIALOGUES[id];
  if (!liste || liste.length === 0) {
    apres?.();
    return;
  }
  construire();
  dialogueId = id;
  repliques = liste;
  index = Math.min(reprises[id] ?? 0, liste.length - 1);
  surFin = apres ?? null;
  boite!.classList.remove('cache');
  montrerReplique();
}

/** Échap : coupe proprement, on reprendra à la boîte en cours. */
export function couperDialogue(): void {
  if (!dialogueId) return;
  reprises[dialogueId] = index;
  dialogueId = null;
  surFin = null;
  boite?.classList.add('cache');
}

/** Touche action : complète la ligne, puis passe à la suivante. */
export function avancerDialogue(): void {
  if (!dialogueId) return;
  const texte = repliques[index].texte;
  if (tTexte * VITESSE_TEXTE < texte.length) {
    tTexte = texte.length / VITESSE_TEXTE; // compléter la ligne
    return;
  }
  index += 1;
  if (index >= repliques.length) {
    const fin = surFin;
    delete reprises[dialogueId];
    dialogueId = null;
    surFin = null;
    boite?.classList.add('cache');
    fin?.();
    return;
  }
  montrerReplique();
}

/** Tick du texte au fil (appelé par la boucle). */
export function majDialogue(dt: number): void {
  if (!dialogueId) return;
  tTexte += dt;
  const texte = repliques[index].texte;
  const n = Math.min(texte.length, Math.floor(tTexte * VITESSE_TEXTE));
  const visible = texte.slice(0, n);
  if (texteEl.textContent !== visible) texteEl.textContent = visible;
  suiteEl.style.visibility = n >= texte.length ? 'visible' : 'hidden';
}
