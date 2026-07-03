// Les 13 portes de l'Antre (plan 09 §4) : 12 portes à difficulté
// croissante (biomes en rotation) + la PORTE SANS FIN. Les positions
// sont codées en dur le long d'un chemin serpentant — c'est de la mise
// en scène, pas de la génération.
//
// Budgets et génération de composition : plan 12 §3 (data/swarm.ts).
// Les `composition` explicites sont les vagues SCÉNARISÉES (moments
// signature) ; ailleurs, le générateur remplit le budget.
// NOTE bestiaire v1 (plan 09) : seuls glouton/spectre/golem existent —
// les compos scénarisées avec tireurs/kamikazes arrivent au plan 10.

export interface CompositionEntree {
  type: string;
  nombre: number;
  elite?: boolean;
}

export interface VagueDef {
  /** budget de menace ; ignoré si `composition` est fournie */
  budget?: number;
  composition?: CompositionEntree[];
}

export interface PorteDef {
  niveau: number; // 1..12 ; la sans-fin a niveau = 13
  nom: string;
  biome: number; // index dans BIOMES_EXPEDITION
  nbVagues: number; // la dernière contient le boss
  /** vagues scénarisées : index de vague (0-based) → composition */
  vaguesScenarisees?: Record<number, CompositionEntree[]>;
  bossId: string; // id du bestiaire des boss (plan 10 ; placeholder au 09)
  nomBoss: string;
  x: number;
  y: number;
  recompensePremiere: { plumes: number; dores: number };
  sansFin?: boolean;
}

// Nombre de vagues par niveau (plan 09 §4) : 1–2 → 3, 3–5 → 4,
// 6–9 → 5, 10–12 → 6.
function nbVagues(niveau: number): number {
  if (niveau <= 2) return 3;
  if (niveau <= 5) return 4;
  if (niveau <= 9) return 5;
  return 6;
}

function recompense(niveau: number): { plumes: number; dores: number } {
  const plumes = niveau <= 3 ? 2 : niveau <= 6 ? 3 : niveau <= 9 ? 5 : 8;
  return { plumes, dores: 20 * niveau };
}

function porte(
  niveau: number,
  nom: string,
  biome: number,
  bossId: string,
  nomBoss: string,
  x: number,
  y: number,
  vaguesScenarisees?: Record<number, CompositionEntree[]>
): PorteDef {
  return {
    niveau,
    nom,
    biome,
    nbVagues: nbVagues(niveau),
    vaguesScenarisees,
    bossId,
    nomBoss,
    x,
    y,
    recompensePremiere: recompense(niveau),
  };
}

// Chemin serpentant : rangée du bas (1→4), du milieu (5→8, en sens
// inverse), du haut (9→12), et la sans-fin tout en haut au centre.
export const PORTES: PorteDef[] = [
  porte(1, 'LA CLAIRIÈRE', 0, 'maokai', 'MAOKAI, LE CŒUR DE PIERRE', 420, 1250, {
    // vague 1 scénarisée : 8 gloutons — le tutoriel de fait (plan 12 §3)
    0: [{ type: 'glouton', nombre: 8 }],
  }),
  porte(2, 'LE BOIS MURMURANT', 1, 'morgana', 'MORGANA, L’ANGE DÉCHU', 940, 1250),
  porte(3, 'LES SABLES ROYAUX', 2, 'skarner', 'SKARNER, GARDIEN DES SABLES', 1460, 1250, {
    // vague 3 : la première élite, mise en scène
    2: [
      { type: 'glouton', nombre: 6 },
      { type: 'golem', nombre: 1, elite: true },
    ],
  }),
  porte(4, 'LA CRIQUE', 3, 'fizz', 'FIZZ, LE FARCEUR DES MARÉES', 1980, 1250),
  porte(5, 'LES RÉCIFS', 4, 'belveth', 'BEL’VETH, L’IMPÉRATRICE', 1980, 800, {
    // le raz-de-marée de bombix (plan 12 §3) — ça clignote de partout
    2: [
      { type: 'bombix', nombre: 12 },
      { type: 'glouton', nombre: 4 },
    ],
  }),
  porte(6, 'LA CONGÈRE', 5, 'nunubot', 'WILLUMP-BOT', 1460, 800),
  porte(7, 'LE CŒUR DES RONCES', 0, 'ornn', 'ORNN DES BOIS ANCIENS', 940, 800),
  porte(8, 'LA MOISSON NOIRE', 1, 'fiddlesticks', 'FIDDLESTICKS, LA TERREUR', 420, 800),
  porte(9, 'LE CANYON', 2, 'malphite', 'MALPHITE, LE COLOSSE', 420, 380, {
    // le mur de golems, les cracheurs planqués derrière (plan 12 §3)
    3: [
      { type: 'golem', nombre: 5 },
      { type: 'cracheur', nombre: 3 },
      { type: 'glouton', nombre: 4 },
    ],
  }),
  porte(10, 'LE LAGON SOLAIRE', 3, 'leona', 'LEONA, GARDIENNE DU LAGON', 940, 380),
  porte(11, 'LA FOSSE ABYSSALE', 4, 'nautilus', 'NAUTILUS, LE TITAN', 1460, 380),
  porte(12, 'LE GIVRE ÉTERNEL', 5, 'velkoz', 'VEL’KOZ, L’ŒIL DU GIVRE', 1980, 380),
  {
    // « LA DÉCHIRURE » (plan 15 §1) : le monde s'usera toujours — la
    // porte sans fin est la justification canonique du scaling infini
    ...porte(13, 'LA DÉCHIRURE', 1, 'aurelionsol', 'AURELION SOL, SEIGNEUR DE CENDRE', 1200, 130),
    sansFin: true,
  },
];

export const PORTE_SANS_FIN = PORTES[PORTES.length - 1];

export function porteParNiveau(niveau: number): PorteDef | undefined {
  return PORTES.find((p) => p.niveau === niveau);
}
