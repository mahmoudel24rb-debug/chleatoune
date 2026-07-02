// Structures et PNJ du monde, en pixel art maison (grilles de lettres,
// comme les sprites) : portail d'expédition, autel de sacrifice, porte
// du château, arbre géant, marchand, coffres, panneaux d'amélioration.

import { creerSprite } from './sprites';

// ------------------------------------------------------- portail (arche)
export const SPRITE_PORTAIL = creerSprite(
  [
    '......KKKKKKKKKKKK......',
    '....KKSSSSSSSSSSSSKK....',
    '...KSSsSSKKKKKKSSsSSK...',
    '..KSSsKKPPPPPPPPKKsSSK..',
    '..KSsKPPpPPPPPPpPPKsSK..',
    '.KSsKPpPPWWPPPPPPPpKsSK.',
    '.KSsKPPPWppWPPWWPPPKsSK.',
    '.KSsKPPWpPPpWWppWPPKsSK.',
    '.KSsKPPWpPPPppPPpWPKsSK.',
    '.KSsKPPPWWpPPPPPpWPKsSK.',
    '.KSsKPPPPpWWWWWWpPPKsSK.',
    '.KSsKPPPPPPppppPPPPKsSK.',
    '.KSsKPPPPPPPPPPPPPPKsSK.',
    '.KSsKPpPPPPPPPPPPpPKsSK.',
    '.KSsKPPPPPPPPPPPPPPKsSK.',
    '.KSSKKKKKKKKKKKKKKKKSSK.',
    '.KSSSSsSSsSSSSsSSsSSSSK.',
    '..KKKKKKKKKKKKKKKKKKKK..',
  ],
  { K: '#2c2337', S: '#8a8a96', s: '#6e6e7a', P: '#8a4fc4', p: '#5c3a8a', W: '#c9a0e0' },
  4
);

// -------------------------------------------------- autel de sacrifice
export const SPRITE_AUTEL = creerSprite(
  [
    '......BBB.......',
    '.....BBbBB......',
    '....BBbbbBB.....',
    '....BBbBbBB.....',
    '.....BbbbB......',
    '....KKKKKKK.....',
    '...KRRrRRrRK....',
    '..KRrRRfRRrRK...',
    '..KRRfFFfRRRK...',
    '..KKKKKKKKKKK...',
    '...KsKKKKKsK....',
    '..FFsF.F.FsFF...',
    '.F.F.FF.FF.F.F..',
  ],
  { K: '#2c2337', B: '#5a7ac4', b: '#3c5aa0', R: '#8a3a3a', r: '#a84a4a', f: '#f2932e', F: '#ffd94a', s: '#6e6e7a' },
  4
);

// ---------------------------------------------------- porte du château
export const SPRITE_PORTE = creerSprite(
  [
    '..KKKKKKKKKK..',
    '.KSSSSSSSSSSK.',
    '.KSKKKKKKKKSK.',
    '.KSKBBbbBBKSK.',
    '.KSKBbBBbBKSK.',
    '.KSKBBBBBBKSK.',
    '.KSKBBfBBBKSK.',
    '.KSKBBBBBBKSK.',
    '.KSKBbBBbBKSK.',
    '.KSKBBBBbBKSK.',
    '.KSKKKKKKKKSK.',
    '.KKKKKKKKKKKK.',
  ],
  { K: '#2c2337', S: '#8a8a96', B: '#6e4a2c', b: '#5a3a20', f: '#f2d16b' },
  4
);

// ------------------------------------------------------- arbre géant
export const SPRITE_ARBRE_GEANT = creerSprite(
  [
    '........VVVVVVVVVV........',
    '......VVvVVVVVVVVvVV......',
    '....VVVVVVvVVVVvVVVVVV....',
    '...VVvVVVVVVVVVVVVVVvVV...',
    '...VVVVVvVVVVVVVVvVVVVV...',
    '....VVVVVVVVVVVVVVVVVV....',
    '.....VVvVVVVVVVVVVvVV.....',
    '......KTTTTTTTTTTTTK......',
    '......KTtTTTTTTTTtTK......',
    '.....KTTTKKKKKKTTTTTK.....',
    '.....KTtTKkkkkKTTtTTK.....',
    '....KTTTKkkkkkkKTTTTTK....',
    '....KTtTKkkkkkkKTtTTTK....',
    '...KTTTTKkkkkkkKTTTTTTK...',
    '...KTtTTTKkkkkKTTTtTTTK...',
    '..KTTTTtTTKKKKTTTTTTtTTK..',
    '..KKKKKKKKKKKKKKKKKKKKKK..',
  ],
  { K: '#2c2337', V: '#4a9e46', v: '#3f8c3c', T: '#8a5a34', t: '#6e4a2c', k: '#241c14' },
  4
);

// ---------------------------------------------------------- marchand
export const SPRITE_MARCHAND = creerSprite(
  [
    '..KKKKKKKKKKKKKK..',
    '.KRRWWRRWWRRWWRRK.',
    '.KWWRRWWRRWWRRWWK.',
    '..KT..........T...',
    '..KT.KSSSSSSK.T...',
    '..KT.KSsKKsSK.T...',
    '..KT.KSSSSSSK.T...',
    '..KT..KMMMM"..T...',
    '..KTKKKKKKKKKKT...',
    '..KTKBBbBBbBKKT...',
    '..KTKBbBBBbBKKT...',
    '..KKKKKKKKKKKKK...',
  ],
  { K: '#2c2337', R: '#e5533f', W: '#f2f2f2', T: '#8a5a34', S: '#ffe3cf', s: '#4a3548', M: '#8a5a34', B: '#6e4a2c', b: '#5a3a20', '"': '#8a5a34' },
  4
);

// ------------------------------------------------------------ coffres
const CARTE_COFFRE = [
  '.KKKKKKKKKK.',
  'KCCcCCCCcCCK',
  'KCcCCCCCCcCK',
  'KKKKKKKKKKKK',
  'KCCCCffCCCCK',
  'KCcCCffCCcCK',
  'KCCCCCCCCCCK',
  '.KKKKKKKKKK.',
];

function coffre(corps: string, ombre: string): HTMLCanvasElement {
  return creerSprite(CARTE_COFFRE, { K: '#2c2337', C: corps, c: ombre, f: '#f2d16b' }, 3);
}

export const SPRITES_COFFRES: Record<string, HTMLCanvasElement> = {
  commun: coffre('#8a5a34', '#6e4a2c'),
  rare: coffre('#5a8fe8', '#3f6cd6'),
  epique: coffre('#b48ae0', '#8a4fc4'),
  legendaire: coffre('#f2d16b', '#d9a94e'),
};

// --------------------------------------------- panneaux d'amélioration
const CARTE_PANNEAU = [
  '.KKKKKKKKKKKK.',
  'KPPPPPPPPPPPPK',
  'KPpPPPPPPPPpPK',
  'KPPPPPPPPPPPPK',
  'KPpPPPPPPPPpPK',
  'KPPPPPPPPPPPPK',
  'KKKKKKKKKKKKKK',
  '.....KTT......',
  '.....KTT......',
  '....KKTTKK....',
];

function panneau(fond: string, ombre: string): HTMLCanvasElement {
  return creerSprite(CARTE_PANNEAU, { K: '#2c2337', P: fond, p: ombre, T: '#6e4a2c' }, 3);
}

export const SPRITES_PANNEAUX: Record<string, HTMLCanvasElement> = {
  disponible: panneau('#1f5c2a', '#17441f'),
  possede: panneau('#d9a94e', '#b8893a'),
  verrouille: panneau('#4a4a55', '#3a3a45'),
};

// ------------------------------------------------------------- ponton
export const SPRITE_PONTON = creerSprite(
  [
    'KTTKTTKTTKTTKTTK',
    'KtTKtTKtTKtTKtTK',
    'KTTKTTKTTKTTKTTK',
    'KtTKtTKtTKtTKtTK',
    '.KP..........P..',
    '.KP..BBBB.....P.',
    '.KP.B....B....P.',
    '.KP..........P..',
  ],
  { K: '#2c2337', T: '#8a5a34', t: '#6e4a2c', P: '#5a3a20', B: '#5ab4d4' },
  4
);
