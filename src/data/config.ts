// ============================================================
// TOUTE la configuration du jeu est ici (plan 01, étape 7).
//
// POUR PERSONNALISER LE JEU (autre héros, autre objet à ramasser,
// autres noms/couleurs) : modifie THEME et ZONES ci-dessous, puis
// les dessins dans src/core/sprites.ts. Rien d'autre à toucher.
// Voir aussi PERSONNALISATION.md à la racine du projet.
// ============================================================

export type MonnaieId = 'popcorn' | 'graine' | 'brindille' | 'minerai';

/** Ordre de déblocage des arbres/onglets (1 rebirb = 1 arbre de plus). */
export const MONNAIES: MonnaieId[] = ['popcorn', 'graine', 'brindille', 'minerai'];

export const THEME = {
  titre: 'CHLÉATOUNE',
  heros: 'CHLÉATOUNE',
  /** La monnaie de prestige, gagnée à chaque recouture (le prestige :
   *  Gwen est une poupée couturière, elle recoud le fil de sa vie). */
  prestige: { nom: 'PLUMES', verbe: 'RECOUTURE', couleur: '#a8d8ff' },
  /** La monnaie rare du désert. */
  dore: { nom: 'SMISKI DORÉ', pluriel: 'SMISKI DORÉS', couleur: '#f2d16b' },
  /** Le message de la salle du château (donjon). PERSONNALISE-MOI :
   *  c'est l'endroit parfait pour une lettre cachée. */
  /** L'inscription sur la porte du château : une ÉNIGME pendant tout le
   *  jeu — sa vraie signification tombe au chapitre 7 (il n'y a jamais
   *  eu de monstre dans l'Atelier ; juste ce qu'il a laissé). */
  messageChateau: [
    'ICI DORT CE QUE LE COUTURIER',
    'AIMAIT LE PLUS AU MONDE.',
    '',
    'N’ENTRE PAS ARMÉE.',
    'ENTRE COUSUE.',
    '',
    '— gravé en fil d’or, six trous',
    'd’aiguille en forme de serrure',
  ],
  /** Le Grand Couturier (plan 15) — le créateur disparu de la tapisserie. */
  couturier: { nom: 'LE GRAND COUTURIER' },
  /** La lettre de l'Atelier (plan 15 §7), page par page, ligne par ligne.
   *  Version « fiction » signée du Grand Couturier — REMPLAÇABLE par une
   *  vraie lettre personnelle avant d'offrir (c'est le moment cadeau). */
  lettreAtelier: [
    [
      'À celle qui a trouvé les six bobines,',
      '',
      'Si tu lis ceci, alors le monde tient',
      'encore debout — et c’est grâce à toi.',
      'Je le savais. Je t’ai cousue exprès.',
      '',
      'On me demandait souvent pourquoi',
      'je brodais un monde si grand pour',
      'une si petite poupée. Je répondais :',
      '« Vous verrez. » Voilà. Vous voyez.',
    ],
    [
      'La tapisserie s’usera encore. C’est',
      'sa nature, et ce n’est pas grave :',
      'je ne t’ai pas faite pour empêcher',
      'les accrocs. Je t’ai faite pour que',
      'quelqu’un, toujours, choisisse de',
      'recoudre.',
      '',
      'L’Effilocheuse défait. Toi, tu',
      'reprises. Entre les deux, il y a',
      'tout ce qui compte : les doughcats,',
      'les concerts, les poissons qui',
      'boudent, les matins dorés.',
    ],
    [
      'Prends soin d’eux. Prends soin de',
      'toi. Recouds souvent, râle un peu,',
      'et laisse toujours une lumière',
      'allumée sur le ponton.',
      '',
      'Cet atelier est à toi maintenant.',
      'Il l’a toujours été.',
      '',
      'Avec tout le fil de mon cœur,',
      '',
      '— LE GRAND COUTURIER',
      '(P.S. : le Mercier te fera 20 %.',
      'Il dira que non. Insiste.)',
    ],
  ] as string[][],
  monnaies: {
    popcorn: { nom: 'SMISKI', couleur: '#d9edb2' },
    graine: { nom: 'MIKU', couleur: '#39c5bb' },
    brindille: { nom: 'BRINDILLES', couleur: '#b07a4e' },
    minerai: { nom: 'MINERAI', couleur: '#9db2c9' },
  } as Record<MonnaieId, { nom: string; couleur: string }>,
};

/** Une zone = une carte du monde avec sa monnaie et ses couleurs.
 *  - `donjon` : le hall du donjon — pas de collectibles, on y trouve le
 *    portail d'expédition, l'autel de sacrifice et le château.
 *  - `dore` : le désert — les collectibles sont des smiski dorés.
 *  - `rebirbsRequis` : nombre de rebirbs pour y accéder (défaut 0). */
export interface ZoneDef {
  monnaie: MonnaieId;
  nom: string;
  fond: string;
  fonce: string;
  clair: string;
  fleurs: string[];
  donjon?: boolean;
  dore?: boolean;
  rebirbsRequis?: number;
}

export const ZONES: ZoneDef[] = [
  { monnaie: 'popcorn', nom: 'PRAIRIE', fond: '#4a9e46', fonce: '#3f8c3c', clair: '#57b053', fleurs: ['#ffffff', '#ffd94a', '#ff8ac2'] },
  { monnaie: 'graine', nom: 'SCÈNE', fond: '#a8973f', fonce: '#968635', clair: '#bfae52', fleurs: ['#39c5bb', '#ffffff', '#ff8ac2'], rebirbsRequis: 1 },
  { monnaie: 'brindille', nom: 'FORÊT', fond: '#3c7a44', fonce: '#33693a', clair: '#4b8f52', fleurs: ['#d9c37e', '#b07a4e', '#ffffff'], rebirbsRequis: 2 },
  { monnaie: 'minerai', nom: 'MINE', fond: '#6b6f7a', fonce: '#5c606b', clair: '#7d828e', fleurs: ['#9db2c9', '#c9d4e2', '#f2d16b'], rebirbsRequis: 3 },
  { monnaie: 'popcorn', nom: 'DÉSERT DORÉ', fond: '#d9b95c', fonce: '#c9a94e', clair: '#e5c976', fleurs: ['#4a9e46', '#57b053', '#f2d16b'], dore: true, rebirbsRequis: 1 },
  { monnaie: 'popcorn', nom: 'DONJON', fond: '#2c2337', fonce: '#231b2c', clair: '#3a2d47', fleurs: ['#6b5a8a', '#8a5a6b', '#f2d16b'], donjon: true },
];

export const INDEX_DONJON = ZONES.findIndex((z) => z.donjon);
export const INDEX_DESERT = ZONES.findIndex((z) => z.dore);
export const INDEX_FORET = 2;

/** Biomes des étages d'expédition (rotation, puis ça reboucle plus dur). */
export interface BiomeDef {
  nom: string;
  fond: string;
  fonce: string;
  clair: string;
  fleurs: string[];
}

export const BIOMES_EXPEDITION: BiomeDef[] = [
  { nom: 'FORÊT VERTE', fond: '#4a9e46', fonce: '#3f8c3c', clair: '#57b053', fleurs: ['#ffffff', '#ffd94a', '#ff8ac2'] },
  { nom: 'FORÊT MAUDITE', fond: '#8a5fa8', fonce: '#7a5296', clair: '#9b6fb8', fleurs: ['#c9a0e0', '#5c3a6e', '#e8d5f2'] },
  { nom: 'DÉSERT', fond: '#d9b95c', fonce: '#c9a94e', clair: '#e5c976', fleurs: ['#4a9e46', '#8a5a34', '#f2f2f2'] },
  { nom: 'PLAGE', fond: '#e0cfa0', fonce: '#d0bf90', clair: '#ecdcb0', fleurs: ['#5ab4d4', '#ff8ac2', '#f2f2f2'] },
  { nom: 'FOND MARIN', fond: '#5a8fc4', fonce: '#4c81b6', clair: '#68a0d4', fleurs: ['#ff8a5c', '#39c5bb', '#e8b4e0'] },
  { nom: 'NEIGE', fond: '#dce8f2', fonce: '#c8d8e8', clair: '#ecf4fa', fleurs: ['#4a9e46', '#9db2c9', '#5ab4d4'] },
];

export const CONFIG = {
  monde: { largeur: 2400, hauteur: 1600 },
  /** Zoom entier du pixel art (plan 02, étape 6). */
  echelle: 3,
  birb: {
    vitesseBase: 130,
    bonusVitesseParNiveau: 0.05, // « 100 % → 105 % » de la capture
    rayonRamassage: 48,
    /** La position (x, y) est aux PIEDS du sprite ; le corps est plus
     *  haut. Les hitbox (ramassage, combat) partent de ce centre. */
    centreCorpsY: 36,
  },
  spawn: {
    delaiBase: 2.4,
    reductionDelai: 0.175, // par niveau de l'amélioration « plus rapides »
    delaiMin: 0.3,
    capBase: 2,
    capParNiveau: 2,
    valeurBase: 1,
    distanceMinBirb: 40, // pas de spawn collé au birb (plan 04, pièges)
    distanceMaxBirb: 520, // …mais pas à l'autre bout du monde non plus
  },
  auto: { rayonAimant: 130, vitesseAimant: 260 },
  /** Choix documenté (plan 06, étape 5) : chaque plume donne +10 % de gains. */
  prestige: { bonusParPlume: 0.1 },
  camera: { lissage: 8 },
  tauxFenetreSec: 10,
  autosaveSec: 10,
  // NE PAS « corriger » ce nom : c'est la clé localStorage HISTORIQUE
  // (avant les personnages multiples). Elle ne sert plus qu'à la
  // migration automatique dans systems/profils.ts, et les sauvegardes
  // par personnage gardent le préfixe birblike_save_<id> pour la même
  // raison de rétrocompatibilité.
  cleSauvegarde: 'birblike_save_v1',
};
