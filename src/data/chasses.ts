// Les chasses au trésor de la Sphinge (plan 16 §4) — le système Dofus
// adapté : suivre des indices textuels → trouver des repères → creuser.
// AUTONOME : la chasse fait apparaître SES repères (le décor procédural
// ne peut pas servir de rendez-vous fiable). Indices : texte libre AVEC
// direction cardinale + repère nommé — jamais un élément de décor.
// 10 chasses (2 par zone), tirage sans remise puis reboot. La chasse
// scénarisée du Fil Rouge (ch. 5) vit ici aussi, hors rotation.

export type RepereChasse = 'borne_cousue' | 'statue_chat' | 'rocher_marque';

export interface EtapeChasse {
  zone: number;
  x: number;
  y: number;
  repere: RepereChasse;
  indice: string;
}

export interface ChasseDef {
  id: string;
  etapes: [EtapeChasse, EtapeChasse, EtapeChasse];
  recompense: { dores: [number, number]; chancePlume: number };
}

export const CHASSES: ChasseDef[] = [
  {
    id: 'chasse_prairie_1',
    etapes: [
      { zone: 0, x: 400, y: 1400, repere: 'borne_cousue', indice: 'DEPUIS LE PONTON, VERS LE COUCHANT : CHERCHE LA BORNE COUSUE.' },
      { zone: 0, x: 300, y: 500, repere: 'statue_chat', indice: 'PLEIN NORD, PRÈS DES PANNEAUX : LA STATUE DU CHAT VEILLE.' },
      { zone: 0, x: 2100, y: 300, repere: 'rocher_marque', indice: 'LOIN VERS LE LEVANT, AU NORD : LE ROCHER MARQUÉ D’UNE CROIX.' },
    ],
    recompense: { dores: [200, 320], chancePlume: 0.15 },
  },
  {
    id: 'chasse_prairie_2',
    etapes: [
      { zone: 0, x: 2000, y: 900, repere: 'statue_chat', indice: 'VERS LE LEVANT, À MI-HAUTEUR : UNE STATUE DE CHAT SOURIT.' },
      { zone: 0, x: 1200, y: 200, repere: 'borne_cousue', indice: 'PLEIN NORD, AU CENTRE : LA BORNE COUSUE T’ATTEND.' },
      { zone: 0, x: 500, y: 1000, repere: 'rocher_marque', indice: 'REDESCENDS AU COUCHANT : LE ROCHER MARQUÉ CACHE LE TRÉSOR.' },
    ],
    recompense: { dores: [200, 320], chancePlume: 0.15 },
  },
  {
    id: 'chasse_scene_1',
    etapes: [
      { zone: 1, x: 600, y: 300, repere: 'borne_cousue', indice: 'SUR LA SCÈNE, AU NORD-COUCHANT : LA BORNE COUSUE.' },
      { zone: 1, x: 1800, y: 1200, repere: 'statue_chat', indice: 'TRAVERSE VERS LE SUD-LEVANT : LA STATUE DU CHAT MÉLOMANE.' },
      { zone: 1, x: 400, y: 1300, repere: 'rocher_marque', indice: 'REVIENS AU SUD-COUCHANT : LE ROCHER MARQUÉ SONNE CREUX.' },
    ],
    recompense: { dores: [210, 330], chancePlume: 0.15 },
  },
  {
    id: 'chasse_scene_2',
    etapes: [
      { zone: 1, x: 2200, y: 400, repere: 'rocher_marque', indice: 'AU NORD-LEVANT DE LA SCÈNE : UN ROCHER MARQUÉ.' },
      { zone: 1, x: 1100, y: 800, repere: 'borne_cousue', indice: 'AU CENTRE EXACT : LA BORNE COUSUE ÉCOUTE.' },
      { zone: 1, x: 300, y: 200, repere: 'statue_chat', indice: 'FINIS AU NORD-COUCHANT : LA STATUE DU CHAT CHEF D’ORCHESTRE.' },
    ],
    recompense: { dores: [210, 330], chancePlume: 0.15 },
  },
  {
    id: 'chasse_foret_1',
    etapes: [
      { zone: 2, x: 500, y: 800, repere: 'statue_chat', indice: 'SOUS LES FRONDAISONS DU COUCHANT : LA STATUE DU CHAT MOUSSU.' },
      { zone: 2, x: 1700, y: 300, repere: 'borne_cousue', indice: 'MONTE AU NORD-LEVANT : LA BORNE COUSUE ENTRE LES TRONCS.' },
      { zone: 2, x: 2100, y: 1300, repere: 'rocher_marque', indice: 'PLONGE AU SUD-LEVANT : LE ROCHER MARQUÉ DE SÈVE.' },
    ],
    recompense: { dores: [220, 340], chancePlume: 0.15 },
  },
  {
    id: 'chasse_foret_2',
    etapes: [
      { zone: 2, x: 800, y: 1400, repere: 'rocher_marque', indice: 'AU SUD DU MÉTIER, VERS LE COUCHANT : LE ROCHER MARQUÉ.' },
      { zone: 2, x: 300, y: 300, repere: 'statue_chat', indice: 'REMONTE PLEIN NORD-COUCHANT : LA STATUE DU CHAT ENDORMI.' },
      { zone: 2, x: 1500, y: 900, repere: 'borne_cousue', indice: 'AU CŒUR DU BOIS, VERS LE LEVANT : LA BORNE COUSUE.' },
    ],
    recompense: { dores: [220, 340], chancePlume: 0.15 },
  },
  {
    id: 'chasse_mine_1',
    etapes: [
      { zone: 3, x: 400, y: 300, repere: 'borne_cousue', indice: 'À L’ENTRÉE NORD-COUCHANT DE LA MINE : LA BORNE COUSUE.' },
      { zone: 3, x: 2000, y: 600, repere: 'rocher_marque', indice: 'SUIS LE FILON VERS LE LEVANT : LE ROCHER MARQUÉ AU PIC.' },
      { zone: 3, x: 1100, y: 1400, repere: 'statue_chat', indice: 'DESCENDS PLEIN SUD : LA STATUE DU CHAT MINEUR.' },
    ],
    recompense: { dores: [240, 360], chancePlume: 0.15 },
  },
  {
    id: 'chasse_mine_2',
    etapes: [
      { zone: 3, x: 2200, y: 1300, repere: 'statue_chat', indice: 'TOUT AU FOND, AU SUD-LEVANT : LA STATUE DU CHAT AUX YEUX DE MINERAI.' },
      { zone: 3, x: 1300, y: 500, repere: 'borne_cousue', indice: 'REMONTE VERS LE NORD : LA BORNE COUSUE SOUS LES ÉTAIS.' },
      { zone: 3, x: 300, y: 1100, repere: 'rocher_marque', indice: 'REDESCENDS AU SUD-COUCHANT : LE ROCHER MARQUÉ D’UNE VEINE D’OR.' },
    ],
    recompense: { dores: [240, 360], chancePlume: 0.15 },
  },
  {
    id: 'chasse_desert_1',
    etapes: [
      { zone: 4, x: 600, y: 600, repere: 'statue_chat', indice: 'DANS LES DUNES DU NORD-COUCHANT : LA STATUE DU CHAT-SPHINX.' },
      { zone: 4, x: 1900, y: 400, repere: 'borne_cousue', indice: 'CAP AU NORD-LEVANT : LA BORNE COUSUE À DEMI ENSEVELIE.' },
      { zone: 4, x: 1400, y: 1300, repere: 'rocher_marque', indice: 'AU SUD, LÀ OÙ LE SABLE BRÛLE : LE ROCHER MARQUÉ.' },
    ],
    recompense: { dores: [260, 380], chancePlume: 0.15 },
  },
  {
    id: 'chasse_desert_2',
    etapes: [
      { zone: 4, x: 2200, y: 1400, repere: 'rocher_marque', indice: 'AU GRAND SUD-LEVANT DES DUNES : LE ROCHER MARQUÉ.' },
      { zone: 4, x: 800, y: 1200, repere: 'statue_chat', indice: 'VERS LE COUCHANT : LA STATUE DU CHAT AUX YEUX D’OR.' },
      { zone: 4, x: 400, y: 200, repere: 'borne_cousue', indice: 'FINIS AU NORD-COUCHANT : LA BORNE COUSUE DES ANCIENS.' },
    ],
    recompense: { dores: [260, 380], chancePlume: 0.15 },
  },
];

/** La chasse scénarisée du Fil Rouge (ch. 5) : gratuite, hors rotation. */
export const CHASSE_FIL_ROUGE: ChasseDef = {
  id: 'chasse_filrouge',
  etapes: [
    { zone: 4, x: 500, y: 900, repere: 'borne_cousue', indice: 'LA SPHINGE : « OÙ LE COUCHANT MORD LES DUNES, UNE BORNE COUSUE DORT. »' },
    { zone: 4, x: 1600, y: 200, repere: 'statue_chat', indice: '« AU NORD-LEVANT, MON ANCÊTRE DE PIERRE GARDE LE SECOND FIL. »' },
    { zone: 4, x: 2100, y: 1000, repere: 'rocher_marque', indice: '« ET SOUS LE ROCHER MARQUÉ DU LEVANT… CREUSE, PETITE POUPÉE. »' },
  ],
  recompense: { dores: [150, 150], chancePlume: 0 },
};

export function chasseParId(id: string): ChasseDef | undefined {
  if (id === CHASSE_FIL_ROUGE.id) return CHASSE_FIL_ROUGE;
  return CHASSES.find((c) => c.id === id);
}
