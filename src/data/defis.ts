// Les DÉFIS DE PORTE (plan 14 §1) — les « challenges » de Dofus.
// 1 défi tiré au sort à chaque entrée, optionnel, jamais bloquant.
// Réussi → ×SWARM.defis.mult sur les dorés ET l'XP de la porte.
// Échec = zéro malus. Jamais.

import type { PorteDef } from './portes';

export interface DefiDef {
  id: string;
  nom: string;
  /** une ligne, impérative, lisible en jeu */
  description: string;
  /** 'tenir' : réussi si jamais raté · 'accomplir' : raté si jamais réussi */
  genre: 'tenir' | 'accomplir';
  /** filtre les défis absurdes (ex. escorte sans escouade) */
  compatible?: (porte: PorteDef, escouadeN: number, patternsBoss: string[]) => boolean;
}

export const DEFIS: DefiDef[] = [
  {
    id: 'intouchable', nom: 'INTOUCHABLE', genre: 'tenir',
    description: 'Ne subis aucun dégât de skillshot (projectile ou flaque).',
  },
  {
    id: 'au_contact', nom: 'AU CONTACT', genre: 'tenir',
    description: 'Achève chaque élite en MÊLÉE.',
    compatible: (p) => p.niveau >= 4, // pas d'élite avant la porte 4
  },
  {
    id: 'eclair', nom: 'ÉCLAIR', genre: 'accomplir',
    description: 'Termine au moins une vague en moins de 20 s.',
  },
  {
    id: 'sans_filet', nom: 'SANS FILET', genre: 'tenir',
    description: 'Ne passe jamais sous 50 % de tes PV.',
  },
  {
    id: 'escorte', nom: 'ESCORTE PARFAITE', genre: 'tenir',
    description: 'Aucun compagnon K.O.',
    compatible: (_p, escouadeN) => escouadeN >= 1,
  },
  {
    id: 'bougeotte', nom: 'BOUGEOTTE', genre: 'tenir',
    description: 'Ne reste jamais immobile plus de 2 s pendant une vague.',
  },
  {
    id: 'main_nue', nom: 'SANS MÊLÉE', genre: 'tenir',
    description: 'Finis la porte sans un seul coup de mêlée.',
  },
  {
    id: 'rafale', nom: 'RAFALE', genre: 'accomplir',
    description: 'Tue 5 monstres en moins de 3 s (une fois).',
  },
  {
    id: 'protocole', nom: 'DANS L’ORDRE', genre: 'accomplir',
    description: 'Tue les monstres couronnés ① ② ③ dans l’ordre.',
  },
  {
    id: 'sang_froid', nom: 'SANG-FROID', genre: 'tenir',
    description: 'Ne te fais toucher ni par la CHARGE ni par l’ANNEAU du boss.',
    compatible: (_p, _e, patterns) => patterns.includes('charge') || patterns.includes('anneau'),
  },
];
