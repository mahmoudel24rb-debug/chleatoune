export type BuffMatiereId = 'concert' | 'projecteurs';
export type PreparationMatiereId = 'renfort' | 'kit';

export interface CoutMatieres {
  popcorn?: number;
  graine?: number;
  brindille?: number;
  minerai?: number;
}

export interface BuffMatiereDef {
  id: BuffMatiereId;
  nom: string;
  desc: string;
  dureeSec: number;
  cout: CoutMatieres;
}

export interface PreparationMatiereDef {
  id: PreparationMatiereId;
  nom: string;
  desc: string;
  cout: CoutMatieres;
}

export const BONUS_MATIERES = {
  concertRecolteCompagnons: 0.25,
  projecteursRayonAuto: 0.4,
  renfortPvCompagnons: 0.15,
  kitRespawnCompagnons: 0.2,
};

export const BUFFS_MATIERES: BuffMatiereDef[] = [
  {
    id: 'concert',
    nom: 'CONCERT DE MIKU',
    desc: 'Compagnons récolteurs +25 % pendant 10 min.',
    dureeSec: 600,
    cout: { graine: 2500 },
  },
  {
    id: 'projecteurs',
    nom: 'PROJECTEURS',
    desc: 'Rayon AUTO +40 % pendant 10 min.',
    dureeSec: 600,
    cout: { graine: 1800, brindille: 300 },
  },
];

export const PREPARATIONS_MATIERES: PreparationMatiereDef[] = [
  {
    id: 'renfort',
    nom: 'BOUCLES DE RENFORT',
    desc: 'Compagnons de combat +15 % PV sur la prochaine porte.',
    cout: { minerai: 900 },
  },
  {
    id: 'kit',
    nom: 'KIT DE COUTURE',
    desc: 'Respawn des compagnons -20 % sur la prochaine porte.',
    cout: { minerai: 700, graine: 700 },
  },
];

export function coutReparationPorte(niveau: number): CoutMatieres {
  return {
    graine: 120 * niveau,
    minerai: 90 * niveau,
  };
}

// ------------------------------------------- la Teinturerie (cosmétique)
// Lavis de couleur sur la tenue de l'héroïne : achat PERMANENT (survit à
// la recouture, comme tout `save.matieres`), une seule teinture portée à
// la fois. Sink principal des brindilles — le parent pauvre des monnaies.

export interface TeintureDef {
  id: string;
  nom: string;
  desc: string;
  /** couleur du lavis (appliqué en source-atop, voir core/sprites.ts) */
  couleur: string;
  cout: CoutMatieres;
}

export const TEINTURES: TeintureDef[] = [
  {
    id: 'rose_the',
    nom: 'ROSE THÉ',
    desc: 'Un bain de pétales. La classique des ateliers.',
    couleur: '#ff9eb5',
    cout: { brindille: 800, graine: 600 },
  },
  {
    id: 'bleu_nuit',
    nom: 'BLEU NUIT',
    desc: 'Teinte à la belle étoile. Sobre, mystérieuse.',
    couleur: '#6f8fe8',
    cout: { brindille: 1200, graine: 900 },
  },
  {
    id: 'menthe',
    nom: 'MENTHE GIVRÉE',
    desc: 'Fraîche comme un matin de Congère.',
    couleur: '#7fe0c3',
    cout: { brindille: 1600, minerai: 600 },
  },
  {
    id: 'lavande',
    nom: 'LAVANDE',
    desc: 'Cousue main, séchée au soleil du Désert Doré.',
    couleur: '#c09bf0',
    cout: { brindille: 2200, graine: 1500 },
  },
  {
    id: 'fil_dor',
    nom: 'FIL D’OR',
    desc: 'La touche finale des grandes couturières.',
    couleur: '#ffd94a',
    cout: { brindille: 3000, minerai: 1500 },
  },
];
