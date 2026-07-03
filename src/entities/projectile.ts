// Pool de projectiles (plan 10 §3 et §7) : tableau pré-alloué, flag
// `actif` — zéro allocation pendant le combat. Deux camps : les tirs
// des monstres (blessent l'héroïne) et les aiguilles des sorts
// (blessent les monstres). Les projectiles ennemis ne sont jamais
// interceptés par les sorts (décision du plan : trop cher, illisible).

export interface Projectile {
  actif: boolean;
  camp: 'monstre' | 'sort';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** demi-taille du carré dessiné (px) */
  taille: number;
  couleur: string;
  degats: number;
  /** distance restante avant extinction (px) */
  reste: number;
  /** camp monstre : d'où vient le tir (défis du plan 14) */
  origine: 'tir' | 'volee' | 'anneau' | 'sort';
}

const TAILLE_POOL = 128;

export const PROJECTILES: Projectile[] = Array.from({ length: TAILLE_POOL }, () => ({
  actif: false,
  camp: 'monstre',
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  taille: 4,
  couleur: '#ffffff',
  degats: 0,
  reste: 0,
  origine: 'tir',
}));

export function tirerProjectile(
  camp: 'monstre' | 'sort',
  x: number,
  y: number,
  angle: number,
  vitesse: number,
  portee: number,
  degats: number,
  couleur: string,
  taille = 4,
  origine: 'tir' | 'volee' | 'anneau' | 'sort' = camp === 'sort' ? 'sort' : 'tir'
): void {
  const p = PROJECTILES.find((q) => !q.actif);
  if (!p) return; // pool plein : on saute le tir plutôt que d'allouer
  p.actif = true;
  p.camp = camp;
  p.origine = origine;
  p.x = x;
  p.y = y;
  p.vx = Math.cos(angle) * vitesse;
  p.vy = Math.sin(angle) * vitesse;
  p.taille = taille;
  p.couleur = couleur;
  p.degats = degats;
  p.reste = portee;
}

export function viderProjectiles(): void {
  for (const p of PROJECTILES) p.actif = false;
}

export function nbProjectilesActifs(): number {
  let n = 0;
  for (const p of PROJECTILES) if (p.actif) n++;
  return n;
}
