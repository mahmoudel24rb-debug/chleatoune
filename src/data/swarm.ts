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
  pvBossBase: 25, // PV boss = pvBossBase × multBoss × H(n) × croissancePVBoss^(n-1)
  multBoss: 8,
  // Courbe PV propre aux boss (équilibrage 2026-07-04, retour de
  // playtest réel : « les boss meurent plus vite que les monstres de
  // base »). Vrai à la lettre : un golem élite = 65×5 = 325×H(n) de PV,
  // la plupart des boss = 200×H(n). Et la puissance de la joueuse
  // (parchemins, évolutions, hotbar) croît plus vite que H(n) → les
  // boss tardifs fondaient (27 s mesurées porte 6, cible 45-90 s).
  // ×1,12^(n-1) : porte 1 intacte (49 s ✔), porte 6 ×1,76 (→ ~48 s),
  // porte 12 ×3,47 (vrai mur final), Déchirure ×3,90 (continuité).
  // Manette : trop dur → 1,10 ; encore trop court → 1,15 (jamais avec
  // pvBossBase en même temps). Les DÉGÂTS des boss ne bougent PAS
  // (clémence : la difficulté passe par la durée, pas la punition).
  croissancePVBoss: 1.12,
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
  // La clémence des bullet heavens : après CHAQUE coup reçu, une courte
  // fenêtre d'invulnérabilité (clignotement). Être encerclée fait mal,
  // mais ne one-burst jamais — « jamais frustrant » (plan 12 §0).
  graceContactSec: 0.4,

  // ---- télégraphes & skillshots (plan 10 §3)
  telegrapheLigneSec: 0.7,
  telegrapheZoneSec: 0.9,
  projectiles: {
    largeurLigne: 18, // largeur du rectangle télégraphié au sol
    vitesse: 300, // px/s — esquivable à vitesse de base SANS parchemin
    taille: 8, // côté du carré dessiné
    rayonZone: 35, // flaque Ø 70 du cracheur
  },
  flaque: {
    dureeSec: 2, // la flaque reste au sol
    tickSec: 0.5, // dégâts 1×/tick à quiconque reste dedans
  },
  kamikaze: {
    distance: 26, // distance de déclenchement du clignotement
    clignoteSec: 0.4, // blanc/rouge, puis boum
    rayon: 25, // explosion Ø 50
  },

  // ---- tireurs (plan 10 §2) : machine à états
  tireur: {
    seuilApproche: 0.85, // approche tant que dist > portée × ça
    seuilRecul: 0.45, // recule si dist < portée × ça
  },

  // ---- boss (plan 10 §4) : les patterns partagés
  boss: {
    cadencePatternSec: 4.5, // délai entre deux patterns
    vitesse: 48, // px/s de poursuite (lent : la menace, ce sont les patterns)
    charge: { viseSec: 0.8, vitesse: 380, distance: 300, etourdiSec: 1, multDegats: 2 },
    volee: { nb: 5, ecartDeg: 18 }, // éventail : esquive entre les rayons
    pluie: { nb: 6, rayonDispersion: 150 }, // zones autour de la joueuse
    invocation: { min: 4, max: 6 }, // gloutons/spectres (respecte le cap)
    anneau: { nb: 16, breche: 3 }, // projectiles en anneau, une brèche
    enrage: { seuil: 0.25, vitesse: 1.3, cadence: 1.5 }, // sous 25 % PV
  },

  // ---- plan 14 : défis, malédictions, archimonstres
  defis: {
    mult: 1.4, // ×dorés et ×XP de la porte si le défi est réussi
    rafaleN: 5, // « rafale » : N monstres…
    rafaleSec: 3, // …en moins de N secondes
    eclairSec: 20, // « éclair » : une vague finie en moins de ça
    bougeotteSec: 2, // « bougeotte » : immobile max autorisé
  },
  maledictions: {
    plafond: 2.5, // plafond ABSOLU du mult (leçon des idoles de Dofus)
    presseVitesse: 1.3,
    filTendu: 0.65, // × durée des télégraphes
    meuteBudget: 1.25,
    pointesDegats: 1.5,
    verrePV: 0.75,
  },
  archi: {
    chance: 0.015, // proba de promotion à chaque creerMonstre
    multPV: 4,
    multDegats: 1.25,
    multXp: 5,
    multButin: 6,
    echelle: 1.25,
    plumesPremiere: 2, // première victoire sur CHAQUE archi
    plumesCollection: 25, // la collection complète
  },

  // ---- méta-progression (plan 11)
  croissanceCoutParchemin: 1.35,
  croissanceCoutSort: 1.45,
  coutEvolutionDores: 600, // le puits à smiski dorés du late-game

  // ---- consommables (plan 18 §4)
  consommables: {
    cdGlobal: 8, // partagé par les 3 slots — LE garde-fou anti-goinfrage
    porteeOndeChoc: 320, // l'onde de choc repousse les monstres à portée…
    reculOndeChoc: 120, // …de ça (0 dégât : bouton panique, pas un sort)
  },

  // ---- porte sans fin : LA DÉCHIRURE (anti-plafond)
  sansFin: {
    budget: 1.12, // budget de la vague v = B(12) × budget^v
    stats: 1.06, // multiplicateur de stats = H(12) × stats^v
    bossToutesLes: 5, // une vague de boss toutes les N vagues
    // les boss sont tirés AU HASARD parmi les 12 des portes ; plus on
    // descend, plus ils viennent en bande (jamais deux fois le même)
    bossSupplementaireTous: 10, // +1 boss simultané toutes les N vagues
    maxBossSimultanes: 4,
    aurelionToutesLes: 25, // AURELION SOL mène la danse aux vagues 25, 50…
    // PV TOTAL d'une vague multi-boss = ×ce facteur, réparti entre eux
    // (3 boss à PV plein = mur ; 3 boss aux 43 % chacun = spectacle)
    pvTotalMultiBoss: 1.3,
  },

  // ---- compagnons de biome (plan 13)
  compagnons: {
    tickSec: 5, // récolte statistique des biomes inactifs
    rendementTick: 0.8, // collectible-équivalent par unité et par tick
    rendementDoreTick: 0.4,
    respawnBaseSec: 45,
    respawnParNiveauSec: 0.75,
    respawnMaxSec: 150,
    vitesse: { defaut: 170, foret: 130, mine: 140 } as Record<string, number>,
    escouadeMax: 3, // copies de combat simultanées (plan 13 §5)
    porteeTaunt: 90, // le tank « provoque » les monstres à moins de ça
    porteeSoin: 120, // aura du soigneur
    soinPctParSec: 1.5, // % des PV max soignés par seconde
    bonusChanceux: 0.1, // +10 % butin quand le chanceux achève
  },
};

/** Coût du niveau suivant d'un parchemin (plan 11 §2). */
export function coutParchemin(coutBase: number, niveauActuel: number): number {
  return Math.ceil(coutBase * Math.pow(SWARM.croissanceCoutParchemin, niveauActuel));
}

/** Coût de la montée du sort vers le niveau `versNiveau` (2..6). */
export function coutNiveauSort(coutDeblocage: number, versNiveau: number): number {
  return Math.ceil((coutDeblocage / 2) * Math.pow(SWARM.croissanceCoutSort, versNiveau - 2));
}

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
