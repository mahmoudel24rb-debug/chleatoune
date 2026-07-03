// ============================================================
// SWARM — TOUT l'équilibrage de la refonte donjons (plan 12).
// Règle de la maison : aucune de ces valeurs n'est écrite en dur
// dans un système. On règle ICI, nulle part ailleurs.
//
// Table de référence (plan 12 §2) — puissance attendue A(n) et repères :
// | Porte | H(n)  | PV glouton | Dég. | PV boss | A(n) DPS | Coups pour mourir |
// |   1   | 1,00  |     20     |   5  |   200   |    25    | 22 (très clément) |
// |   2   | 1,45  |     29     |   6  |   290   |    36    | 20 |
// |   3   | 2,10  |     42     |   8  |   420   |    53    | 17 |
// |   4   | 3,05  |     61     |  10  |   610   |    76    | 15 |
// |   6   | 6,40  |    128     |  17  |  1 280  |   160    | 17 |
// |   8   | 13,5  |    270     |  28  |  2 700  |   336    | 13 |
// |  10   | 28,4  |    568     |  46  |  5 680  |   707    | 10 |
// |  12   | 59,6  |   1 192    |  76  | 11 920  |  1 487   | 7–8 |
// Cibles de temps : vague 15–35 s · dernière ≤ 40 s · boss 45–90 s ·
// porte 4–8 min. Hors fourchette → toucher `budgetBase` d'abord,
// `croissancePV` ensuite, JAMAIS les deux à la fois.
// En cas de doute : la version LA PLUS CLÉMENTE (c'est un cadeau).
// ============================================================

export const SWARM = {
  // ---- scaling ennemi (géométrique : crée les murs doux)
  croissancePV: 1.45, // ×PV, ×XP, ×butin par porte
  croissanceDegats: 1.28, // les dégâts montent MOINS vite que les PV
  multElitePV: 5,
  multEliteDegats: 1.5,
  multEliteButin: 4, // XP et butin
  pvBossBase: 25, // PV boss = pvBossBase × multBoss × H(n)
  multBoss: 8,
  multDegatsBoss: 2, // dégâts de contact du boss
  multSkillshot: 2.25, // les tirs télégraphés font PEUR (plan 10)

  // ---- budget de menace & vagues (plan 12 §3)
  budgetBase: 8, // B(n) = budgetBase + budgetParNiveau × n
  budgetParNiveau: 3,
  multVagues: [1, 1.25, 1.55, 1.9, 2.3], // vagues normales successives
  multVagueBoss: 1.6, // budget de la garde du boss

  // ---- rythme du donjon
  capMonstres: 30, // cap dur simultané (perf, plan 10 §7)
  pauseVagueSec: 2.5, // respiration entre deux vagues
  spawn: {
    paquet: 4, // monstres par paquet
    cadenceSec: 0.4, // délai entre paquets
    rayonMin: 420, // anneau hors écran autour de l'héroïne
    rayonMax: 620,
  },

  // ---- joueuse
  coefMelee: 1.5, // le contrat risque/récompense de la mêlée

  // ---- télégraphes (plan 10, utilisés à partir du bestiaire v2)
  telegrapheLigneSec: 0.7,
  telegrapheZoneSec: 0.9,

  // ---- méta-progression (plan 11)
  croissanceCoutParchemin: 1.35,
  croissanceCoutSort: 1.45,

  // ---- porte sans fin (anti-plafond)
  sansFin: {
    budget: 1.12, // budget de la vague v = B(12) × budget^v
    stats: 1.06, // multiplicateur de stats = H(12) × stats^v
    bossToutesLes: 5, // un boss toutes les N vagues
  },

  // ---- compagnons de biome (plan 13)
  compagnons: {
    tickSec: 5, // récolte statistique des biomes inactifs
    rendementTick: 0.8, // collectible-équivalent par unité et par tick
    rendementDoreTick: 0.4,
    vitesse: 170, // défaut ; surcharges par espèce possibles ici
  },
};

/** Multiplicateur de PV/XP/butin de la porte n (H(n) du plan 12). */
export function multPV(niveau: number): number {
  return Math.pow(SWARM.croissancePV, niveau - 1);
}

/** Multiplicateur de dégâts de la porte n (Dg(n) du plan 12). */
export function multDegats(niveau: number): number {
  return Math.pow(SWARM.croissanceDegats, niveau - 1);
}

/** Budget de menace de base de la porte n : B(n). */
export function budgetPorte(niveau: number): number {
  return SWARM.budgetBase + SWARM.budgetParNiveau * niveau;
}

/** Budget d'une vague (index 0-based ; la dernière est celle du boss). */
export function budgetVague(niveauPorte: number, vagueIndex: number, nbVagues: number): number {
  const base = budgetPorte(niveauPorte);
  if (vagueIndex === nbVagues - 1) return base * SWARM.multVagueBoss; // garde du boss
  const mult = SWARM.multVagues[Math.min(vagueIndex, SWARM.multVagues.length - 1)];
  return base * mult;
}
