// Un monstre du donjon. Créé et piloté par systems/donjon.ts.

import type { MonstreDef } from '../data/monstres';
import type { PatternId } from '../data/boss';

export interface Monstre {
  type: MonstreDef;
  x: number;
  y: number;
  pv: number;
  pvMax: number;
  degats: number;
  xp: number;
  butin: number;
  boss: boolean;
  /** élite : ×5 PV, halo pulsant, lâche un coffre (plan 10 §1) */
  elite: boolean;
  /** archimonstre : rare, nommé, doré (plan 14 §3) */
  archi: boolean;
  /** défi DANS L'ORDRE : ① ② ③ au-dessus de la tête (plan 14 §1) */
  couronne?: number;
  /** Cooldown avant sa prochaine attaque de contact (s). */
  tAttaque: number;
  /** Temps restant avant de changer de direction d'errance (s). */
  tErrance: number;
  dirX: number;
  dirY: number;
  /** Zoom d'affichage (les boss sont plus gros). */
  echelle: number;

  // ---- plan 10 : rôles ----
  /** tireurs : cooldown de tir restant (s) */
  tTir: number;
  /** tireurs/boss : temps de visée restant — IMMOBILE tant que > 0 */
  viseT: number;
  /** kamikazes : temps de clignotement restant avant explosion */
  clignoteT: number;
  /** > 0 : anime la frame d'attaque du sprite GLB */
  attaqueT: number;

  // ---- plan 10 : boss ----
  bossId?: string;
  patterns?: PatternId[];
  patternIndex?: number;
  /** cooldown avant le prochain pattern (s) */
  tPattern?: number;
  enrage?: boolean;
  /** charge : distance restante à parcourir (px) ; 0 = pas en charge */
  chargeDist?: number;
  chargeDirX?: number;
  chargeDirY?: number;
  chargeTouche?: boolean;
  /** fin de charge : fenêtre de punition (s) */
  etourdiT?: number;
}
