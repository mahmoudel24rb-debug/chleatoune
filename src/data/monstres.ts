// Le bestiaire à rôles (plan 10 §1), calqué sur la taxonomie de Swarm :
// normaux (nombreux, fragiles), tireurs (skillshots esquivables),
// tanks, kamikazes. Règle d'or : les attaques de contact ne ratent
// jamais, les sorts à distance sont TOUJOURS télégraphés et esquivables.
//
// Stats de BASE — le scaling par porte est au plan 12 §2 (data/swarm.ts).
// `id` lie la def aux sprites GLB : public/assets/monstres/m_{id}_*.png.

export type ComportementMonstre = 'melee' | 'tireur' | 'tank' | 'kamikaze';

export interface MonstreDef {
  id: string;
  nom: string;
  comportement: ComportementMonstre;
  /** coût en budget de menace (plan 12 §3) */
  cout: number;
  pv: number;
  /** dégâts de CONTACT */
  degats: number;
  vitesse: number;
  xp: number;
  /** smiski dorés lâchés à la mort (÷3, avant multiplicateurs) */
  butin: number;
  rayon: number;
  /** tireurs uniquement */
  tir?: { portee: number; cooldown: number; multDegats: number; projectile: 'ligne' | 'zone' };
  /** teinte du télégraphe / des projectiles */
  couleur: string;
}

// Règle demandée et respectée : les tireurs ont ~2× moins de PV que les
// mêlées équivalents — leur menace vient du positionnement, pas de la masse.
export const MONSTRES: MonstreDef[] = [
  { id: 'glouton', nom: 'GLOUTON', comportement: 'melee', cout: 1, pv: 20, degats: 5, vitesse: 55, xp: 6, butin: 2, rayon: 16, couleur: '#b04a3a' },
  { id: 'spectre', nom: 'SPECTRE', comportement: 'melee', cout: 1.5, pv: 14, degats: 6, vitesse: 85, xp: 8, butin: 3, rayon: 14, couleur: '#8a5fc9' },
  { id: 'golem', nom: 'GOLEM', comportement: 'tank', cout: 3, pv: 65, degats: 10, vitesse: 30, xp: 14, butin: 6, rayon: 18, couleur: '#7a8494' },
  {
    id: 'epingleur', nom: 'ÉPINGLEUR', comportement: 'tireur', cout: 2, pv: 12, degats: 4, vitesse: 42, xp: 9, butin: 4, rayon: 14, couleur: '#d9764a',
    tir: { portee: 240, cooldown: 3, multDegats: 2, projectile: 'ligne' },
  },
  {
    id: 'cracheur', nom: 'CRACHEUR', comportement: 'tireur', cout: 2.5, pv: 16, degats: 4, vitesse: 36, xp: 11, butin: 5, rayon: 16, couleur: '#6ea84a',
    tir: { portee: 220, cooldown: 4, multDegats: 2.5, projectile: 'zone' },
  },
  { id: 'bombix', nom: 'BOMBIX', comportement: 'kamikaze', cout: 1.5, pv: 10, degats: 12, vitesse: 95, xp: 8, butin: 3, rayon: 13, couleur: '#e5533f' },
];

export function typeMonstre(id: string): MonstreDef {
  return MONSTRES.find((m) => m.id === id) ?? MONSTRES[0];
}
