// Un monstre du donjon. Créé et piloté par systems/combat.ts.

import type { TypeMonstre } from '../data/combat';

export interface Monstre {
  type: TypeMonstre;
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
  /** Cooldown avant sa prochaine attaque (s). */
  tAttaque: number;
  /** Temps restant avant de changer de direction d'errance (s). */
  tErrance: number;
  dirX: number;
  dirY: number;
  /** Zoom d'affichage (les boss sont plus gros). */
  echelle: number;
}
