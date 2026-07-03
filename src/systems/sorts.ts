// Les 6 sorts automatiques (plan 11 §4) : appelés depuis la boucle en
// mode donjon UNIQUEMENT (pas de sorts dans le monde — le ramassage
// reste le gameplay zen, le donjon le gameplay nerveux). Ciblage via la
// grille spatiale (plan 10 §7) ; les dégâts passent par la MÊME
// fonction infligerAuMonstre que la mêlée : un seul chemin.

import {
  NIVEAU_MAX_SORT,
  SORTS,
  multCooldownSort,
  multNiveauSort,
  porteeNiveauSort,
  projectilesNiveauSort,
  rayonOrbiteSort,
  type SortDef,
} from '../data/sorts';
import { state } from '../core/state';
import { dist } from '../core/utils';
import { birb, centreBirb } from '../entities/birb';
import type { Monstre } from '../entities/monstre';
import { tirerProjectile } from '../entities/projectile';
import { grilleMonstres, infligerAuMonstre } from './donjon';
import { ajouterParticules } from './fx';
import { getCoffres } from './donjon';

// ------------------------------------------------------- état des sorts

interface Ciseau {
  x: number;
  y: number;
  angle: number;
  phase: 'aller' | 'retour';
  parcouru: number;
  touches: Set<Monstre>;
  /** mini-ciseau d'évolution : une seule phase, pas de retour */
  mini: boolean;
}

interface Pelote {
  x: number;
  y: number;
  t: number;
  /** mine d'évolution déjà « rebondie » : n'en repose plus */
  rebond: boolean;
}

interface Tourelle {
  x: number;
  y: number;
  t: number;
  tirAcc: number;
}

interface Zap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
}

interface Tempete {
  cible: Monstre;
  t: number;
  tickAcc: number;
}

const ciseaux: Ciseau[] = [];
const pelotes: Pelote[] = [];
const tourelles: Tourelle[] = [];
const zaps: Zap[] = [];
const tempetes: Tempete[] = [];
const cooldowns: Record<string, number> = {};
let angleOrbite = 0;
// une bobine ne retouche pas la même cible avant 0,5 s
const toucheBobine = new Map<Monstre, number>();

const COULEUR_SORT = '#ff8ac2';

export function niveauSort(id: string): number {
  return state.save.sorts[id] ?? 0;
}

export function evolue(id: string): boolean {
  return state.save.evolutions[id] === true;
}

/** Dégâts d'un tick du sort (coef × D × niveaux, ×1,35 si évolué). */
function degatsSort(def: SortDef): number {
  const evolutionMult = evolue(def.id) ? 1.35 : 1;
  return Math.max(
    1,
    Math.round(def.coef * state.stats.degats * multNiveauSort(def, niveauSort(def.id)) * evolutionMult)
  );
}

/** Cooldown effectif : base × niveaux × 100/(100 + hâte). */
function cooldownSort(def: SortDef): number {
  return (def.cooldown * multCooldownSort(def, niveauSort(def.id)) * 100) / (100 + state.stats.hate);
}

function nbProjectiles(def: SortDef): number {
  return (
    1 +
    projectilesNiveauSort(def, niveauSort(def.id)) +
    (def.accepteProjectiles ? state.stats.projectilesBonus : 0)
  );
}

export function viderSorts(): void {
  ciseaux.length = 0;
  pelotes.length = 0;
  tourelles.length = 0;
  zaps.length = 0;
  tempetes.length = 0;
  toucheBobine.clear();
  for (const id of Object.keys(cooldowns)) cooldowns[id] = 0;
}

/** DPS théorique affiché (fiche du Mercier / F1). */
export function dpsSort(def: SortDef): number {
  const cd = cooldownSort(def) || 0.5;
  return degatsSort(def) / cd;
}

// --------------------------------------------------------------- boucle

export function majSorts(dt: number, monstres: readonly Monstre[]): void {
  const centre = centreBirb();
  const grille = grilleMonstres();

  for (const def of SORTS) {
    const niv = niveauSort(def.id);
    if (niv <= 0) continue;
    if (def.cooldown > 0) {
      cooldowns[def.id] = (cooldowns[def.id] ?? 0) - dt;
    }

    switch (def.id) {
      case 'ciseaux': {
        if (cooldowns[def.id] > 0) break;
        const cible = grille.plusProche(centre.x, centre.y, 280);
        if (!cible) break;
        cooldowns[def.id] = cooldownSort(def);
        const nb = nbProjectiles(def);
        const angleBase = Math.atan2(cible.y - centre.y, cible.x - centre.x);
        for (let i = 0; i < nb; i++) {
          const angle = angleBase + (i - (nb - 1) / 2) * 0.35;
          ciseaux.push({
            x: centre.x, y: centre.y, angle, phase: 'aller', parcouru: 0,
            touches: new Set(), mini: false,
          });
        }
        break;
      }

      case 'aiguilles': {
        if (cooldowns[def.id] > 0) break;
        const portee = 230 + porteeNiveauSort(def, niv);
        const cible = grille.plusProche(centre.x, centre.y, portee);
        if (!cible) break;
        cooldowns[def.id] = cooldownSort(def);
        const angle = Math.atan2(cible.y - centre.y, cible.x - centre.x);
        const salve = evolue('aiguilles') ? 2 : 1;
        const nb = nbProjectiles(def);
        for (let s = 0; s < salve; s++) {
          for (let i = 0; i < nb; i++) {
            const a = angle + (i - (nb - 1) / 2) * 0.18 + s * 0.09;
            tirerProjectile('sort', centre.x, centre.y, a, 420, portee + 40, degatsSort(def), COULEUR_SORT, 3);
          }
        }
        break;
      }

      case 'bobines': {
        // permanent : pas de cooldown, juste l'orbite qui tourne
        const nb = 2 + projectilesNiveauSort(def, niv) +
          (def.accepteProjectiles ? state.stats.projectilesBonus : 0) +
          (evolue('bobines') ? 2 : 0);
        angleOrbite += dt * 2.4;
        const rayon = 70 * rayonOrbiteSort(def, niv) * state.stats.multZone;
        const recul = evolue('bobines') ? 40 : 20;
        for (let i = 0; i < nb; i++) {
          const a = angleOrbite + (i * Math.PI * 2) / nb;
          const bx = centre.x + Math.cos(a) * rayon;
          const by = centre.y + Math.sin(a) * rayon;
          for (const m of grille.dansRayon(bx, by, 26)) {
            const prochainCoup = toucheBobine.get(m) ?? 0;
            if (prochainCoup > 0) continue;
            toucheBobine.set(m, 0.5);
            infligerAuMonstre(m, degatsSort(def), COULEUR_SORT);
            if (!m.boss) {
              const d = Math.max(1, dist(m.x, m.y, centre.x, centre.y));
              m.x += ((m.x - centre.x) / d) * recul;
              m.y += ((m.y - centre.y) / d) * recul;
            }
          }
        }
        break;
      }

      case 'eclair': {
        if (cooldowns[def.id] > 0) break;
        const premiere = grille.plusProche(centre.x, centre.y, 300);
        if (!premiere) break;
        cooldowns[def.id] = cooldownSort(def);
        const touchees: Monstre[] = [premiere];
        let origine: Monstre = premiere;
        for (let saut = 0; saut < 2; saut++) {
          const suivante = grille.plusProche(origine.x, origine.y, 160, (m) => !touchees.includes(m));
          if (!suivante) break;
          touchees.push(suivante);
          origine = suivante;
        }
        let px = centre.x;
        let py = centre.y;
        for (const m of touchees) {
          zaps.push({ x1: px, y1: py, x2: m.x, y2: m.y, t: 0.16 });
          px = m.x;
          py = m.y;
          infligerAuMonstre(m, degatsSort(def), '#9adcff');
        }
        if (evolue('eclair')) tempetes.push({ cible: premiere, t: 2, tickAcc: 0 });
        break;
      }

      case 'pelote': {
        if (cooldowns[def.id] > 0) break;
        cooldowns[def.id] = cooldownSort(def);
        // posée devant l'héroïne, vers l'ennemi le plus proche s'il y en a un
        const cible = grille.plusProche(centre.x, centre.y, 340);
        const angle = cible
          ? Math.atan2(cible.y - centre.y, cible.x - centre.x)
          : Math.random() * Math.PI * 2;
        pelotes.push({ x: centre.x + Math.cos(angle) * 70, y: centre.y + Math.sin(angle) * 70, t: 3, rebond: false });
        break;
      }

      case 'tourelle': {
        if (cooldowns[def.id] > 0) break;
        cooldowns[def.id] = cooldownSort(def);
        tourelles.push({ x: centre.x, y: centre.y, t: 6, tirAcc: 0 });
        break;
      }
    }
  }

  // ---- entités vivantes des sorts ----

  // ciseaux : aller (transpercent), retour vers l'héroïne (2e touche)
  const defCiseaux = SORTS[0];
  for (let i = ciseaux.length - 1; i >= 0; i--) {
    const c = ciseaux[i];
    const vitesse = c.phase === 'aller' ? 330 : 400;
    if (c.phase === 'aller') {
      c.x += Math.cos(c.angle) * vitesse * dt;
      c.y += Math.sin(c.angle) * vitesse * dt;
      c.parcouru += vitesse * dt;
      const porteeMax = c.mini ? 130 : 240;
      if (c.parcouru >= porteeMax) {
        if (c.mini) {
          ciseaux.splice(i, 1);
          continue;
        }
        c.phase = 'retour';
        c.touches.clear();
      }
    } else {
      const d = Math.max(1, dist(c.x, c.y, centre.x, centre.y));
      c.x += ((centre.x - c.x) / d) * vitesse * dt;
      c.y += ((centre.y - c.y) / d) * vitesse * dt;
      if (d < 26) {
        // retour au bercail — l'évolution fait exploser en 4 mini-ciseaux
        if (evolue('ciseaux') && !c.mini) {
          for (let k = 0; k < 4; k++) {
            ciseaux.push({
              x: c.x, y: c.y, angle: (k * Math.PI) / 2 + 0.4, phase: 'aller',
              parcouru: 0, touches: new Set(), mini: true,
            });
          }
        }
        ciseaux.splice(i, 1);
        continue;
      }
    }
    const degats = Math.round(degatsSort(defCiseaux) * (c.mini ? 0.4 : 1));
    for (const m of grille.dansRayon(c.x, c.y, 24, (m) => !c.touches.has(m))) {
      c.touches.add(m);
      infligerAuMonstre(m, degats, COULEUR_SORT);
    }
  }

  // le tick des bobines par cible
  for (const [m, t] of toucheBobine) {
    const reste = t - dt;
    if (reste <= 0 || m.pv <= 0) toucheBobine.delete(m);
    else toucheBobine.set(m, reste);
  }

  // pelotes : explosent au contact ou à la fin du minuteur
  const defPelote = SORTS[4];
  const rayonPelote = (40 + porteeNiveauSort(defPelote, niveauSort('pelote'))) * state.stats.multZone;
  for (let i = pelotes.length - 1; i >= 0; i--) {
    const p = pelotes[i];
    p.t -= dt;
    const contact = grille.plusProche(p.x, p.y, 20);
    if (p.t <= 0 || contact) {
      pelotes.splice(i, 1);
      const rayon = rayonPelote * (p.rebond ? 0.7 : 1);
      const degats = Math.round(degatsSort(defPelote) * (p.rebond ? 0.5 : 1));
      ajouterParticules(p.x, p.y, COULEUR_SORT, 14);
      for (const m of grille.dansRayon(p.x, p.y, rayon)) {
        infligerAuMonstre(m, degats, COULEUR_SORT);
      }
      if (evolue('pelote') && !p.rebond) {
        pelotes.push({ x: p.x + (Math.random() - 0.5) * 60, y: p.y + (Math.random() - 0.5) * 60, t: 3, rebond: true });
      }
    }
  }

  // tourelles : tirent comme des aiguilles ×0,5 ; MIKU PRIME aspire les coffres
  const defTourelle = SORTS[5];
  for (let i = tourelles.length - 1; i >= 0; i--) {
    const t = tourelles[i];
    t.t -= dt;
    if (t.t <= 0) {
      tourelles.splice(i, 1);
      continue;
    }
    t.tirAcc -= dt;
    if (t.tirAcc <= 0) {
      const cible = grille.plusProche(t.x, t.y, 230);
      if (cible) {
        t.tirAcc = 0.6;
        const angle = Math.atan2(cible.y - t.y, cible.x - t.x);
        tirerProjectile('sort', t.x, t.y, angle, 420, 270, Math.max(1, Math.round(degatsSort(defTourelle) * 0.5)), '#39c5bb', 3);
      }
    }
    if (evolue('tourelle')) {
      for (const coffre of getCoffres()) {
        const d = dist(coffre.x, coffre.y, t.x, t.y);
        if (d < 150 && d > 8) {
          coffre.x += ((t.x - coffre.x) / d) * 90 * dt;
          coffre.y += ((t.y - coffre.y) / d) * 90 * dt;
        }
      }
    }
  }

  // zaps (visuel) et tempêtes (évolution de l'éclair)
  for (let i = zaps.length - 1; i >= 0; i--) {
    zaps[i].t -= dt;
    if (zaps[i].t <= 0) zaps.splice(i, 1);
  }
  const defEclair = SORTS[3];
  for (let i = tempetes.length - 1; i >= 0; i--) {
    const tp = tempetes[i];
    tp.t -= dt;
    tp.tickAcc += dt;
    if (tp.cible.pv <= 0 || tp.t <= 0) {
      tempetes.splice(i, 1);
      continue;
    }
    if (tp.tickAcc >= 0.5) {
      tp.tickAcc -= 0.5;
      infligerAuMonstre(tp.cible, Math.max(1, Math.round(degatsSort(defEclair) * 0.5)), '#9adcff');
    }
  }

  void monstres;
  void birb;
}

// ---------------------------------------------------------------- rendu

export function dessinerSorts(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  const centre = centreBirb();

  // bobines en orbite
  const nivBobines = niveauSort('bobines');
  if (nivBobines > 0) {
    const def = SORTS[2];
    const nb = 2 + projectilesNiveauSort(def, nivBobines) +
      (def.accepteProjectiles ? state.stats.projectilesBonus : 0) +
      (evolue('bobines') ? 2 : 0);
    const rayon = 70 * rayonOrbiteSort(def, nivBobines) * state.stats.multZone;
    for (let i = 0; i < nb; i++) {
      const a = angleOrbite + (i * Math.PI * 2) / nb;
      const bx = Math.round(centre.x + Math.cos(a) * rayon - camX);
      const by = Math.round(centre.y + Math.sin(a) * rayon - camY);
      ctx.fillStyle = '#c94f6d';
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd7e6';
      ctx.fillRect(bx - 2, by - 7, 4, 14);
    }
  }

  // ciseaux volants
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  for (const c of ciseaux) {
    ctx.save();
    ctx.translate(Math.round(c.x - camX), Math.round(c.y - camY));
    ctx.rotate(performance.now() / 90);
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText('✂', 0, 6);
    ctx.restore();
  }

  // pelotes posées
  for (const p of pelotes) {
    const px = Math.round(p.x - camX);
    const py = Math.round(p.y - camY);
    const pulse = p.t < 0.8 ? Math.sin(performance.now() / 60) > 0 : false;
    ctx.fillStyle = pulse ? '#ffffff' : p.rebond ? '#e88bb0' : '#c94f6d';
    ctx.beginPath();
    ctx.arc(px, py, p.rebond ? 6 : 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd7e6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, p.rebond ? 3 : 5, 0.4, 2.6);
    ctx.stroke();
  }

  // tourelles Miku
  for (const t of tourelles) {
    const tx = Math.round(t.x - camX);
    const ty = Math.round(t.y - camY);
    ctx.fillStyle = '#2c2337';
    ctx.fillRect(tx - 7, ty - 4, 14, 6);
    ctx.fillStyle = '#39c5bb';
    ctx.fillRect(tx - 5, ty - 16, 10, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(tx - 2, ty - 13, 4, 3);
    // la durée de vie restante, en anneau
    ctx.strokeStyle = 'rgba(57,197,187,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty - 8, 13, -Math.PI / 2, -Math.PI / 2 + (t.t / 6) * Math.PI * 2);
    ctx.stroke();
  }

  // zaps de foudre
  ctx.lineWidth = 2;
  for (const z of zaps) {
    ctx.globalAlpha = Math.max(0, z.t / 0.16);
    ctx.strokeStyle = '#9adcff';
    ctx.beginPath();
    ctx.moveTo(Math.round(z.x1 - camX), Math.round(z.y1 - camY));
    const mx = (z.x1 + z.x2) / 2 + (Math.random() - 0.5) * 14;
    const my = (z.y1 + z.y2) / 2 + (Math.random() - 0.5) * 14;
    ctx.lineTo(Math.round(mx - camX), Math.round(my - camY));
    ctx.lineTo(Math.round(z.x2 - camX), Math.round(z.y2 - camY));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // tempêtes cousues
  for (const tp of tempetes) {
    const tx = Math.round(tp.cible.x - camX);
    const ty = Math.round(tp.cible.y - camY);
    ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 70) * 0.3;
    ctx.strokeStyle = '#9adcff';
    ctx.beginPath();
    ctx.arc(tx, ty - 14, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export { NIVEAU_MAX_SORT };
