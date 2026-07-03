// Compagnons de biome (plan 13 §1) : chaque biome a SON espèce, qui vit
// et récolte sur place — même quand la joueuse est ailleurs (jeu ouvert).
// Collection : 4/4 unités d'une espèce → 1 copie de combat à rôle qui
// peut rejoindre l'escouade des donjons (max 3).
// Yuumi n'est PAS achetable : elle reste la gardienne unique du nid.

import type { MonnaieId } from './config';

export type RoleCombat = 'bagarreur' | 'tireur' | 'soigneur' | 'tank' | 'chanceux';

export interface CompagnonBiomeDef {
  id: string;
  /** index dans ZONES */
  zone: number;
  nom: string;
  nomPluriel: string;
  monnaieAchat: MonnaieId | 'dore';
  /** coût des 4 unités */
  couts: [number, number, number, number];
  /** copie de combat débloquée à 4/4 */
  combat: { role: RoleCombat; partStats: number; descRole: string };
}

export const COMPAGNONS_BIOMES: CompagnonBiomeDef[] = [
  {
    id: 'prairie', zone: 0, nom: 'DOUGHCAT', nomPluriel: 'DOUGHCATS',
    monnaieAchat: 'popcorn', couts: [100, 300, 900, 2700],
    combat: { role: 'bagarreur', partStats: 0.3, descRole: 'BAGARREUR — fonce et tape (30 % des stats)' },
  },
  {
    id: 'scene', zone: 1, nom: 'MIKU-BOT', nomPluriel: 'MIKU-BOTS',
    monnaieAchat: 'graine', couts: [150, 450, 1350, 4000],
    combat: { role: 'tireur', partStats: 0.22, descRole: 'TIREUR — aiguilles à distance (22 % des stats)' },
  },
  {
    id: 'foret', zone: 2, nom: 'HÉRISSON COUTURIER', nomPluriel: 'HÉRISSONS COUTURIERS',
    monnaieAchat: 'brindille', couts: [120, 360, 1080, 3200],
    combat: { role: 'tank', partStats: 0.08, descRole: 'TANK — 60 % PV, provoque les monstres proches' },
  },
  {
    id: 'mine', zone: 3, nom: 'GOLEMITE', nomPluriel: 'GOLEMITES',
    monnaieAchat: 'minerai', couts: [150, 450, 1350, 4000],
    combat: { role: 'chanceux', partStats: 0.15, descRole: 'CHANCEUX — +10 % butin sur ses coups de grâce' },
  },
  {
    id: 'desert', zone: 4, nom: 'FENNEC DORÉ', nomPluriel: 'FENNECS DORÉS',
    monnaieAchat: 'dore', couts: [40, 90, 200, 450],
    combat: { role: 'soigneur', partStats: 0, descRole: 'SOIGNEUR — aura de soin, ne se bat pas (fragile !)' },
  },
];

export const UNITES_MAX = 4;

export function especeCompagnon(id: string): CompagnonBiomeDef | undefined {
  return COMPAGNONS_BIOMES.find((c) => c.id === id);
}

export function especeParZone(zone: number): CompagnonBiomeDef | undefined {
  return COMPAGNONS_BIOMES.find((c) => c.zone === zone);
}
