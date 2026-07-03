// Objets interactifs posés sur les cartes : portail, autel, panneaux
// d'amélioration, marchand, arbre géant, ponton… S'approcher affiche
// une infobulle, la touche E déclenche l'action.

import { INDEX_DONJON } from '../data/config';
import { jeu } from '../core/mode';
import { state } from '../core/state';
import { dist } from '../core/utils';
import { birb } from '../entities/birb';

export interface Interactif {
  id: string;
  x: number;
  y: number;
  /** Sprite dessiné dans le monde (ancré aux pieds), optionnel. */
  sprite?: () => HTMLCanvasElement;
  /** Distance d'activation. */
  rayon: number;
  /** Contenu de l'infobulle (peut contenir des \n). */
  texte: () => string;
  action: () => void;
  visible?: () => boolean;
  /** Petit texte permanent au-dessus du sprite (nom de porte…). */
  etiquette?: () => string;
  /** true = anneau pulsant (la prochaine porte à battre…). */
  pulse?: () => boolean;
}

// Un registre par contexte : 'zone-N' pour le monde, 'expedition'.
const registre = new Map<string, Interactif[]>();
let courant: Interactif | null = null;
let infobulle: HTMLElement;

export function enregistrer(contexte: string, objets: Interactif[]): void {
  registre.set(contexte, [...(registre.get(contexte) ?? []), ...objets]);
}

function contexteActuel(): string {
  if (jeu.mode === 'antre') return 'antre';
  if (jeu.mode === 'donjon') return 'donjon';
  return `zone-${state.save.zone}`;
}

export function interactifsActifs(): Interactif[] {
  return (registre.get(contexteActuel()) ?? []).filter((o) => !o.visible || o.visible());
}

export function initInteractions(): void {
  infobulle = document.getElementById('infobulle')!;
}

export function majInteractions(): void {
  courant = null;
  let meilleure = Infinity;
  for (const o of interactifsActifs()) {
    const d = dist(o.x, o.y, birb.x, birb.y);
    if (d <= o.rayon && d < meilleure) {
      meilleure = d;
      courant = o;
    }
  }
  if (jeu.mode === 'peche') courant = null;

  const texte = courant ? `[E] ${courant.texte()}` : '';
  if (infobulle.textContent !== texte) {
    infobulle.textContent = texte;
    infobulle.classList.toggle('cache', !texte);
  }
}

/** Touche E : déclenche l'objet le plus proche. */
export function activerInteraction(): void {
  courant?.action();
}

export function dessinerInteractifs(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  for (const o of interactifsActifs()) {
    if (!o.sprite) continue;
    const sprite = o.sprite();
    const x = Math.round(o.x - camX - sprite.width / 2);
    const y = Math.round(o.y - camY - sprite.height);
    // petite ombre au sol
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(Math.round(o.x - camX), Math.round(o.y - camY), sprite.width / 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // anneau pulsant (ex. la prochaine porte à battre)
    if (o.pulse?.()) {
      const phase = (Math.sin(performance.now() / 300) + 1) / 2;
      ctx.strokeStyle = `rgba(255, 217, 74, ${0.35 + phase * 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(
        Math.round(o.x - camX),
        Math.round(o.y - camY),
        sprite.width / 2 + 8 + phase * 5,
        14 + phase * 3,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.drawImage(sprite, x, y);
    // étiquette permanente au-dessus (nom de porte…)
    if (o.etiquette) {
      const texte = o.etiquette();
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const cx = Math.round(o.x - camX);
      const largeur = ctx.measureText(texte).width;
      ctx.fillStyle = 'rgba(10,10,14,0.75)';
      ctx.fillRect(cx - largeur / 2 - 5, y - 18, largeur + 10, 14);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(texte, cx, y - 8);
    }
    if (o === courant) {
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 3, y - 3, sprite.width + 6, sprite.height + 6);
    }
  }
}

/** Le hall du donjon = la zone marquée donjon. */
export function contexteHub(): string {
  return `zone-${INDEX_DONJON}`;
}
