// Sprites en pixel art « maison », dessinés depuis des cartes de caractères.
// Aucun asset sous licence (plan 00, règle importante).
//
// POUR PERSONNALISER : redessine les cartes ci-dessous (chaque lettre est
// un pixel, « . » = transparent) et ajuste les palettes. C'est tout.

import { CONFIG, type MonnaieId } from '../data/config';

type Palette = Record<string, string>;

export function creerSprite(carte: string[], palette: Palette, echelle = CONFIG.echelle): HTMLCanvasElement {
  const h = carte.length;
  const w = carte[0].length;
  const c = document.createElement('canvas');
  c.width = w * echelle;
  c.height = h * echelle;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const couleur = palette[carte[y][x]];
      if (!couleur) continue;
      ctx.fillStyle = couleur;
      ctx.fillRect(x * echelle, y * echelle, echelle, echelle);
    }
  }
  return c;
}

// ------------------------------------------------------------------
// L'HÉROÏNE : Chléatoune. Les frames principales sont des PNG pré-rendus
// depuis le modèle 3D (perso/chibi_crystal_rose_gwen.glb) via
// outils/rendu-glb/ — voir PERSONNALISATION.md. Le pixel art ci-dessous
// sert de secours pendant le chargement des images.
// ------------------------------------------------------------------

const PALETTE_BIRB: Palette = {
  K: '#4a3548', // contour
  B: '#d9535e', // cheveux roux
  P: '#ff8ac2', // roses dans les cheveux
  S: '#ffe3cf', // peau
  E: '#e87aa4', // yeux roses
  M: '#e56a8a', // bouche
  W: '#ffffff', // robe / bas
  D: '#f2b0c8', // jupe rosée
  R: '#e88bb0', // rubans roses
  U: '#c94f6d', // chaussures
};

// Corps commun (13 lignes), les 3 dernières lignes = jambes selon la frame.
const CORPS = [
  '....PP.RR.PP....',
  '...KPPKRRKPPK...',
  '..KBBBBBBBBBBK..',
  '..KBPBBBBBBPBK..',
  '.KBBKSSSSSSKBBK.',
  '.KBBKSESSESKBBK.',
  '.KBBKSESSESKBBK.',
  '.KBPKSSMMSSKBBK.',
  '..KBKSSSSSSKBK..',
  '...KWWDDDDWWK...',
  '...KDDDDDDDDK...',
  '..KDDWWWWWWDDK..',
  '...KKKKKKKKKK...',
];

const PATTES_IDLE = ['......W..W......', '......W..W......', '.....UU..UU.....'];
const PATTES_MARCHE_1 = ['.....W....W.....', '....W......W....', '...UU......UU...'];
const PATTES_MARCHE_2 = ['.......WW.......', '.......WW.......', '......UUU.......'];

/** Les trois vues du personnage selon la direction de déplacement :
 *  bas → face, haut → dos, gauche/droite → profil (retourné à gauche). */
export type DirectionHeroine = 'face' | 'dos' | 'profil';

interface JeuDeFrames {
  idle: HTMLCanvasElement;
  marche: HTMLCanvasElement[];
  attaque: HTMLCanvasElement[];
}

function secours(): JeuDeFrames {
  const idle = creerSprite([...CORPS, ...PATTES_IDLE], PALETTE_BIRB);
  return {
    idle,
    marche: [
      creerSprite([...CORPS, ...PATTES_MARCHE_1], PALETTE_BIRB),
      creerSprite([...CORPS, ...PATTES_MARCHE_2], PALETTE_BIRB),
    ],
    attaque: [idle, idle],
  };
}

export const SPRITES_HEROINE: Record<DirectionHeroine, JeuDeFrames> = {
  face: secours(),
  dos: secours(),
  profil: secours(),
};

/** Agrandit un PNG en gardant les pixels nets (zoom entier). */
function agrandir(img: HTMLImageElement, facteur: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width * facteur;
  c.height = img.height * facteur;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// Remplace le secours par les rendus du modèle 3D dès qu'ils sont chargés.
const FACTEUR_PNG = 2; // PNG 114×54 (corps ~54 px) → corps ~108 px à l'écran
// À incrémenter à chaque régénération des PNG : force le navigateur à
// recharger les images au lieu de servir son cache.
const VERSION_SPRITES = 6;

function chargerPng(chemin: string, facteur: number, appliquer: (c: HTMLCanvasElement) => void): void {
  const img = new Image();
  img.onload = () => appliquer(agrandir(img, facteur));
  img.src = `${chemin}?v=${VERSION_SPRITES}`;
}

// Le skin vient du personnage actif (créateur de personnage).
import { skinActif } from '../systems/profils';
const PREFIXE_SKIN = skinActif().prefixe;

for (const direction of ['face', 'dos', 'profil'] as DirectionHeroine[]) {
  const charger = (pose: string, appliquer: (c: HTMLCanvasElement) => void) =>
    chargerPng(`assets/${PREFIXE_SKIN}_${direction}_${pose}.png`, FACTEUR_PNG, appliquer);
  charger('idle', (c) => (SPRITES_HEROINE[direction].idle = c));
  charger('marche1', (c) => (SPRITES_HEROINE[direction].marche[0] = c));
  charger('marche2', (c) => (SPRITES_HEROINE[direction].marche[1] = c));
  charger('attaque1', (c) => (SPRITES_HEROINE[direction].attaque[0] = c));
  charger('attaque2', (c) => (SPRITES_HEROINE[direction].attaque[1] = c));
}

// ------------------------------------------------------------------
// LE DOUGHCAT : compagnon chat-brioche, rendu depuis perso/doughcat.glb.
// Secours pixel art en attendant le chargement des PNG.
// ------------------------------------------------------------------

const CHAT_SECOURS = creerSprite(
  [
    '............',
    '..P......P..',
    '..PPPPPPPP..',
    '.PPKPPPPKPP.',
    '.PPPPPPPPPP.',
    '.PCCCCCCCCP.',
    '.PCCCCCCCCP.',
    '.PCCCCCCCCP.',
    '..P..PP..P..',
    '............',
    '............',
    '............',
  ],
  { P: '#e8c58a', C: '#c8934a', K: '#4a3524' },
  2
);

export const SPRITES_DOUGHCAT = {
  idle: CHAT_SECOURS,
  marche: [CHAT_SECOURS, CHAT_SECOURS] as HTMLCanvasElement[],
};

chargerPng('assets/doughcat_idle.png', 2, (c) => (SPRITES_DOUGHCAT.idle = c));
chargerPng('assets/doughcat_marche1.png', 2, (c) => (SPRITES_DOUGHCAT.marche[0] = c));
chargerPng('assets/doughcat_marche2.png', 2, (c) => (SPRITES_DOUGHCAT.marche[1] = c));

// ------------------------------------------------------------------
// YUUMI : la gardienne de la forêt (rendu depuis perso/chibi_yuumi.glb),
// débloquée avec le premier palier de l'arbre géant.
// ------------------------------------------------------------------

export const SPRITES_YUUMI = {
  idle: CHAT_SECOURS,
  marche: [CHAT_SECOURS, CHAT_SECOURS] as HTMLCanvasElement[],
};

chargerPng('assets/yuumi_idle.png', 2, (c) => (SPRITES_YUUMI.idle = c));
chargerPng('assets/yuumi_marche1.png', 2, (c) => (SPRITES_YUUMI.marche[0] = c));
chargerPng('assets/yuumi_marche2.png', 2, (c) => (SPRITES_YUUMI.marche[1] = c));

// ------------------------------------------------------------------
// LES OBJETS À RAMASSER (un par monnaie) + l'icône de plume
// ------------------------------------------------------------------

// Un Smiski : petite figurine vert pâle qui semble briller dans le noir.
const POPCORN = creerSprite(
  [
    '..........',
    '...GGGG...',
    '..GGGGAG..',
    '..GEGGEG..',
    '..GGGGAG..',
    '...GGGG...',
    '..GGGGGG..',
    '..GGGGAG..',
    '...G..G...',
    '..........',
  ],
  { G: '#d9edb2', A: '#b5d488', E: '#54663d' }
);

// Une figurine Miku : couettes turquoise, tenue grise.
const GRAINE = creerSprite(
  [
    '..........',
    '.T......T.',
    '.TTTTTTTT.',
    '.TTSSSSTT.',
    '.T.SKKS.T.',
    '.T.SSSS.T.',
    '.T..GG..T.',
    '.T.GTTG.T.',
    '....SS....',
    '..........',
  ],
  { T: '#39c5bb', S: '#ffe3cf', K: '#2b3a4a', G: '#565a6b' }
);

const BRINDILLE = creerSprite(
  [
    '..........',
    '........B.',
    '.......BB.',
    '..B...BB..',
    '..BB.BB...',
    '...BBB....',
    '...BB.....',
    '..BB......',
    '..B.......',
    '..........',
  ],
  { B: '#8a5a34' }
);

const MINERAI = creerSprite(
  [
    '..........',
    '...RRR....',
    '..RRSRR...',
    '.RRSSRRR..',
    '.RSSRRRR..',
    '.RRRRRSR..',
    '..RRRSRR..',
    '...RRRR...',
    '..........',
    '..........',
  ],
  { R: '#8d97a8', S: '#c3cddb' }
);

export const SPRITES_MONNAIES: Record<MonnaieId, HTMLCanvasElement> = {
  popcorn: POPCORN,
  graine: GRAINE,
  brindille: BRINDILLE,
  minerai: MINERAI,
};

// Le smiski doré : même figurine, en or (monnaie rare du désert).
export const SPRITE_SMISKI_DORE = creerSprite(
  [
    '..........',
    '...GGGG...',
    '..GGGGAG..',
    '..GEGGEG..',
    '..GGGGAG..',
    '...GGGG...',
    '..GGGGGG..',
    '..GGGGAG..',
    '...G..G...',
    '..........',
  ],
  { G: '#f2d16b', A: '#d9a94e', E: '#8a6a2c' }
);

// ------------------------------------------------------------------
// LES MONSTRES DU DONJON (grilles 12×12, boss = même sprite agrandi)
// ------------------------------------------------------------------

const GLOUTON = creerSprite(
  [
    '............',
    '............',
    '............',
    '...VVVVVV...',
    '..VVVVVVVV..',
    '.VVKVVVVKVV.',
    '.VVKVVVVKVV.',
    '.VVVVVVVVVV.',
    '.VVKVVVVKVV.',
    '.VVVKKKKVVV.',
    '..VVVVVVVV..',
    '............',
  ],
  { V: '#7dbb5c', K: '#2c3a24' }
);

const SPECTRE = creerSprite(
  [
    '............',
    '....FFFF....',
    '...FFFFFF...',
    '..FFKFFKFF..',
    '..FFKFFKFF..',
    '..FFFFFFFF..',
    '..FFFOOFFF..',
    '..FFFFFFFF..',
    '..FFFFFFFF..',
    '..F.FF.FF...',
    '............',
    '............',
  ],
  { F: '#cfd4ec', K: '#3a3550', O: '#6b6390' }
);

const GOLEM = creerSprite(
  [
    '............',
    '...RRRRRR...',
    '..RRRRRRRR..',
    '.RRCRRRRCRR.',
    '.RRRRRRRRRR.',
    '.RRKRRRRKRR.',
    '.RRRRRRRRRR.',
    '.RRRRKKRRRR.',
    '..RRRRRRRR..',
    '..RR....RR..',
    '.RRR....RRR.',
    '............',
  ],
  { R: '#8a8296', C: '#b48ae0', K: '#2e2838' }
);

export const SPRITES_MONSTRES: Record<string, HTMLCanvasElement> = {
  glouton: GLOUTON,
  spectre: SPECTRE,
  golem: GOLEM,
};

// ------------------------------------------------------------------
// BESTIAIRE GLB (plan 10 §6) : chargement PARESSEUX des rendus
// public/assets/monstres/{prefixe}_{vue}_{pose}.png — appelé à l'entrée
// du donjon, jamais au boot (12 boss × 10 PNG ne pèsent pas sur le
// premier lancement). Convention STRICTE : m_{id}, b_{id}, c_{id},
// pnj_mercier. Tant qu'une frame n'est pas chargée : secours pixel art.
// ------------------------------------------------------------------

export type VueMonstre = 'face' | 'profil';
export type PoseMonstre = 'idle' | 'marche1' | 'marche2' | 'attaque1' | 'attaque2';

type FramesGlb = Partial<Record<string, HTMLCanvasElement>>;
const cacheGlb = new Map<string, FramesGlb>();

export function chargerSpritesGlb(prefixe: string, facteur = 1): FramesGlb {
  const existant = cacheGlb.get(prefixe);
  if (existant) return existant;
  const frames: FramesGlb = {};
  cacheGlb.set(prefixe, frames);
  for (const vue of ['face', 'profil'] as VueMonstre[]) {
    for (const pose of ['idle', 'marche1', 'marche2', 'attaque1', 'attaque2'] as PoseMonstre[]) {
      chargerPng(`assets/monstres/${prefixe}_${vue}_${pose}.png`, facteur, (c) => {
        frames[`${vue}_${pose}`] = c;
      });
    }
  }
  return frames;
}

export function frameGlb(prefixe: string, vue: VueMonstre, pose: PoseMonstre): HTMLCanvasElement | undefined {
  const frames = cacheGlb.get(prefixe);
  return frames?.[`${vue}_${pose}`] ?? frames?.[`face_${pose}`] ?? frames?.['face_idle'];
}

/** Précharge tout ce dont un donjon a besoin (monstres + le boss). */
export function prechargerDonjon(idsMonstres: string[], bossId: string): void {
  for (const id of idsMonstres) chargerSpritesGlb(`m_${id}`);
  chargerSpritesGlb(`b_${bossId}`);
}

/** Frames d'un compagnon de biome (GLB c_{id}, ×2 comme l'héroïne),
 *  doughcat/yuumi gardent leurs sprites historiques. */
export function framesCompagnon(espece: string): { idle: HTMLCanvasElement; marche: HTMLCanvasElement[] } {
  if (espece === 'prairie') return SPRITES_DOUGHCAT;
  if (espece === 'yuumi') return SPRITES_YUUMI;
  const glb = chargerSpritesGlb(`c_${espece}`, 2);
  const idle = glb['face_idle'] ?? CHAT_SECOURS;
  return {
    idle,
    marche: [glb['profil_marche1'] ?? idle, glb['profil_marche2'] ?? idle],
  };
}

/** Le PNJ Mercier de l'Antre (Elderwood Bard). */
export function spriteMercier(): HTMLCanvasElement | null {
  const glb = chargerSpritesGlb('pnj_mercier', 2);
  return glb['face_idle'] ?? null;
}

export const SPRITE_PLUME = creerSprite(
  [
    '..........',
    '......PP..',
    '.....PPPP.',
    '....PPPP..',
    '...PPPP...',
    '..PPPP....',
    '..PPP.....',
    '.PP.......',
    '..........',
    '..........',
  ],
  { P: '#a8d8ff' }
);

export const TAILLE_OBJET = 10 * CONFIG.echelle;
