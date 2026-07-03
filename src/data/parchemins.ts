// Les parchemins de stats du Mercier (plan 11 §2) — la méta-progression
// façon Swarm : PERMANENTS, survivent à la recouture. Coûts géométriques
// ×1,35 (coutParchemin dans data/swarm.ts). Thème couture assumé.

export type EffetParchemin =
  | 'puissance'
  | 'vie'
  | 'regen'
  | 'celerite'
  | 'cadence'
  | 'aimant'
  | 'zone'
  | 'projectiles';

export interface ParcheminDef {
  id: EffetParchemin;
  nom: string;
  icone: string;
  description: (niv: number) => string;
  max: number;
  coutBase: number;
}

// Effets par niveau (lus par recalculerStats — jamais en dur ailleurs)
export const EFFETS_PARCHEMINS = {
  puissance: 0.08, // +8 % dégâts (tout : mêlée ET sorts)
  vie: 20, // +20 PV max
  regen: 0.5, // +0,5 PV/s
  celerite: 0.03, // +3 % vitesse
  cadence: 6, // +6 hâte (cd = base × 100/(100+hâte))
  aimant: 0.12, // +12 % rayon de ramassage
  zone: 0.05, // +5 % taille des zones d'effet
};

const pct = (x: number) => `${Math.round(x * 100)} %`;

export const PARCHEMINS: ParcheminDef[] = [
  {
    id: 'puissance', nom: 'FIL DE FORCE', icone: '🧵', max: 25, coutBase: 150,
    description: (n) => `+${pct(EFFETS_PARCHEMINS.puissance)} dégâts par niveau (act. +${pct(EFFETS_PARCHEMINS.puissance * n)})`,
  },
  {
    id: 'vie', nom: 'DOUBLURE MATELASSÉE', icone: '🛡', max: 20, coutBase: 120,
    description: (n) => `+${EFFETS_PARCHEMINS.vie} PV max par niveau (act. +${EFFETS_PARCHEMINS.vie * n} PV)`,
  },
  {
    id: 'regen', nom: 'FIL AUTO-RÉPARANT', icone: '💞', max: 12, coutBase: 200,
    description: (n) => `+${EFFETS_PARCHEMINS.regen} PV/s par niveau (act. +${(EFFETS_PARCHEMINS.regen * n).toFixed(1)} PV/s)`,
  },
  {
    id: 'celerite', nom: 'SEMELLES DE SATIN', icone: '👟', max: 10, coutBase: 250,
    description: (n) => `+${pct(EFFETS_PARCHEMINS.celerite)} vitesse par niveau (act. +${pct(EFFETS_PARCHEMINS.celerite * n)})`,
  },
  {
    id: 'cadence', nom: 'DÉS À COUDRE HUILÉS', icone: '⏱', max: 12, coutBase: 300,
    description: (n) => `+${EFFETS_PARCHEMINS.cadence} hâte par niveau — accélère les sorts (act. ${EFFETS_PARCHEMINS.cadence * n} hâte)`,
  },
  {
    id: 'aimant', nom: 'AIMANT À ÉPINGLES', icone: '🧲', max: 8, coutBase: 180,
    description: (n) => `+${pct(EFFETS_PARCHEMINS.aimant)} rayon de ramassage par niveau (act. +${pct(EFFETS_PARCHEMINS.aimant * n)})`,
  },
  {
    id: 'zone', nom: 'GRANDS CISEAUX', icone: '✂', max: 10, coutBase: 400,
    description: (n) => `+${pct(EFFETS_PARCHEMINS.zone)} taille des zones d'effet par niveau (act. +${pct(EFFETS_PARCHEMINS.zone * n)})`,
  },
  {
    id: 'projectiles', nom: 'BOBINE DOUBLE', icone: '🧶', max: 2, coutBase: 6000,
    description: (n) => `+1 projectile aux sorts multi (ciseaux, aiguilles, bobines) — act. +${n}`,
  },
];

export function parcheminDef(id: string): ParcheminDef {
  return PARCHEMINS.find((p) => p.id === id) ?? PARCHEMINS[0];
}
