// Skillshots & télégraphes (plan 10 §3). Deux formes, lisibles à
// l'échelle ×3 : formes PLEINES semi-transparentes au sol qui se
// remplissent pendant la visée (comme les indicateurs de Swarm), puis
// l'attaque part. LA décision qui rend le jeu juste : la position est
// FIGÉE au début de la visée — le télégraphe ne suit jamais la cible.
//
// Les flaques (zone) vivent aussi ici : 2 s au sol, dégâts par tick à
// quiconque reste dedans.

import { SWARM } from '../data/swarm';

export interface Telegraphe {
  forme: 'ligne' | 'zone';
  x: number;
  y: number;
  /** ligne : orientation et longueur du rectangle au sol */
  angle: number;
  longueur: number;
  /** zone : rayon du disque */
  rayon: number;
  t: number;
  duree: number;
  couleur: string;
  /** déclenché quand le remplissage est complet (tir, charge…) */
  surFin: () => void;
}

export interface Flaque {
  x: number;
  y: number;
  rayon: number;
  t: number;
  degats: number;
  couleur: string;
  /** accumulateur du tick de dégâts */
  tickAcc: number;
}

const telegraphes: Telegraphe[] = [];
const flaques: Flaque[] = [];

export function getTelegraphes(): readonly Telegraphe[] {
  return telegraphes;
}

export function getFlaques(): readonly Flaque[] {
  return flaques;
}

export function poserTelegrapheLigne(
  x: number,
  y: number,
  angle: number,
  longueur: number,
  couleur: string,
  surFin: () => void,
  duree = SWARM.telegrapheLigneSec
): void {
  telegraphes.push({ forme: 'ligne', x, y, angle, longueur, rayon: 0, t: 0, duree, couleur, surFin });
}

export function poserTelegrapheZone(
  x: number,
  y: number,
  rayon: number,
  couleur: string,
  surFin: () => void,
  duree = SWARM.telegrapheZoneSec
): void {
  telegraphes.push({ forme: 'zone', x, y, angle: 0, longueur: 0, rayon, t: 0, duree, couleur, surFin });
}

export function poserFlaque(x: number, y: number, rayon: number, degats: number, couleur: string): void {
  flaques.push({ x, y, rayon, t: 0, degats, couleur, tickAcc: 0 });
}

/** `dansFlaque` : appelée à chaque tick pour blesser qui reste dedans. */
export function majTelegraphes(dt: number, surTickFlaque: (f: Flaque) => void): void {
  for (let i = telegraphes.length - 1; i >= 0; i--) {
    const t = telegraphes[i];
    t.t += dt;
    if (t.t >= t.duree) {
      telegraphes.splice(i, 1);
      t.surFin();
    }
  }
  for (let i = flaques.length - 1; i >= 0; i--) {
    const f = flaques[i];
    f.t += dt;
    f.tickAcc += dt;
    if (f.tickAcc >= SWARM.flaque.tickSec) {
      f.tickAcc -= SWARM.flaque.tickSec;
      surTickFlaque(f);
    }
    if (f.t >= SWARM.flaque.dureeSec) flaques.splice(i, 1);
  }
}

export function viderTelegraphes(): void {
  telegraphes.length = 0;
  flaques.length = 0;
}

/** Rendu : un seul fill par forme (plan 10 §7). */
export function dessinerTelegraphes(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  for (const f of flaques) {
    const alpha = f.t > SWARM.flaque.dureeSec - 0.4 ? (SWARM.flaque.dureeSec - f.t) / 0.4 : 1;
    ctx.fillStyle = f.couleur;
    ctx.globalAlpha = 0.3 * alpha;
    ctx.beginPath();
    ctx.arc(Math.round(f.x - camX), Math.round(f.y - camY), f.rayon, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const t of telegraphes) {
    const progres = Math.min(1, t.t / t.duree);
    if (t.forme === 'zone') {
      // contour de la zone + remplissage progressif du centre
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = t.couleur;
      ctx.beginPath();
      ctx.arc(Math.round(t.x - camX), Math.round(t.y - camY), t.rayon, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(Math.round(t.x - camX), Math.round(t.y - camY), t.rayon * progres, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // rectangle au sol orienté, rempli progressivement dans la longueur
      ctx.save();
      ctx.translate(Math.round(t.x - camX), Math.round(t.y - camY));
      ctx.rotate(t.angle);
      ctx.fillStyle = t.couleur;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(0, -SWARM.projectiles.largeurLigne / 2, t.longueur, SWARM.projectiles.largeurLigne);
      ctx.globalAlpha = 0.45;
      ctx.fillRect(0, -SWARM.projectiles.largeurLigne / 2, t.longueur * progres, SWARM.projectiles.largeurLigne);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
