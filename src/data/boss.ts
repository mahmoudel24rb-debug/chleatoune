// Les 12 boss uniques + celui de la sans-fin (plan 10 §4). Chaque boss
// combine 2-3 patterns réutilisables (cooldowns alternés) : c'est ce qui
// rend chaque boss différent SANS coder 13 IA. `enrage` s'ajoute sous
// 25 % de PV. Le sprite vient du pipeline GLB : b_{id}_*.png.
//
// PV réels = pvBossBase × multBoss × H(n) (data/swarm.ts) — le champ
// `pv` d'ici est un MULTIPLICATEUR de cette base (1 = boss standard).

export type PatternId = 'charge' | 'volee' | 'pluie' | 'invocation' | 'anneau';

export interface BossDef {
  id: string;
  patterns: PatternId[];
  /** ×30 % vitesse et cooldowns ÷1,5 sous 25 % PV (plan 10 §4.6) */
  enrage: boolean;
  /** multiplicateur du PV de base (1 = standard) */
  pv: number;
  /** zoom d'affichage du sprite GLB */
  echelle: number;
}

// Attribution (plan 10) : porte 1 = charge seule, ça monte en
// complexité ; portes 10-12 = 3 patterns + enrage.
export const BOSS: Record<string, BossDef> = {
  maokai: { id: 'maokai', patterns: ['charge'], enrage: false, pv: 1, echelle: 1.5 },
  morgana: { id: 'morgana', patterns: ['volee'], enrage: false, pv: 1, echelle: 1.5 },
  skarner: { id: 'skarner', patterns: ['charge', 'pluie'], enrage: false, pv: 1, echelle: 1.6 },
  fizz: { id: 'fizz', patterns: ['pluie', 'invocation'], enrage: false, pv: 1, echelle: 1.5 },
  belveth: { id: 'belveth', patterns: ['charge', 'volee'], enrage: false, pv: 1, echelle: 1.6 },
  nunubot: { id: 'nunubot', patterns: ['anneau', 'invocation'], enrage: false, pv: 1.1, echelle: 1.6 },
  ornn: { id: 'ornn', patterns: ['charge', 'anneau'], enrage: false, pv: 1.1, echelle: 1.7 },
  fiddlesticks: { id: 'fiddlesticks', patterns: ['pluie', 'invocation', 'volee'], enrage: false, pv: 1, echelle: 1.7 },
  malphite: { id: 'malphite', patterns: ['charge', 'anneau', 'invocation'], enrage: false, pv: 1.2, echelle: 1.7 },
  leona: { id: 'leona', patterns: ['volee', 'anneau', 'charge'], enrage: true, pv: 1.1, echelle: 1.6 },
  nautilus: { id: 'nautilus', patterns: ['charge', 'pluie', 'anneau'], enrage: true, pv: 1.25, echelle: 1.7 },
  velkoz: { id: 'velkoz', patterns: ['volee', 'pluie', 'anneau'], enrage: true, pv: 1.1, echelle: 1.7 },
  aurelionsol: { id: 'aurelionsol', patterns: ['anneau', 'pluie', 'volee'], enrage: true, pv: 1.3, echelle: 1.8 },
};

export function bossDef(id: string): BossDef {
  return BOSS[id] ?? BOSS.maokai;
}
