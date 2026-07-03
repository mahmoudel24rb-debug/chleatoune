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
