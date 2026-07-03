// Grille spatiale (plan 10 §7) : hash 128×128 px reconstruit à chaque
// frame du donjon (< 100 insertions, trivial). Toutes les requêtes
// « le plus proche » / « dans le rayon » passent par elle — fini les
// O(n²) quand 30 monstres et 60 projectiles se cherchent.

const TAILLE_CASE = 128;

export interface PointGrille {
  x: number;
  y: number;
}

export class Grille<T extends PointGrille> {
  private cases = new Map<number, T[]>();

  private cle(cx: number, cy: number): number {
    return cx * 4096 + cy;
  }

  vider(): void {
    this.cases.clear();
  }

  inserer(objet: T): void {
    const cle = this.cle(Math.floor(objet.x / TAILLE_CASE), Math.floor(objet.y / TAILLE_CASE));
    const liste = this.cases.get(cle);
    if (liste) liste.push(objet);
    else this.cases.set(cle, [objet]);
  }

  reconstruire(objets: readonly T[]): void {
    this.vider();
    for (const o of objets) this.inserer(o);
  }

  /** Visite les objets des cases couvertes par le disque (x, y, rayon). */
  private visiter(x: number, y: number, rayon: number, fn: (o: T) => void): void {
    const cx0 = Math.floor((x - rayon) / TAILLE_CASE);
    const cx1 = Math.floor((x + rayon) / TAILLE_CASE);
    const cy0 = Math.floor((y - rayon) / TAILLE_CASE);
    const cy1 = Math.floor((y + rayon) / TAILLE_CASE);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const liste = this.cases.get(this.cle(cx, cy));
        if (!liste) continue;
        for (const o of liste) fn(o);
      }
    }
  }

  /** L'objet le plus proche de (x, y) à moins de `rayonMax`, ou null. */
  plusProche(x: number, y: number, rayonMax: number, filtre?: (o: T) => boolean): T | null {
    let meilleur: T | null = null;
    let meilleureD2 = rayonMax * rayonMax;
    this.visiter(x, y, rayonMax, (o) => {
      if (filtre && !filtre(o)) return;
      const dx = o.x - x;
      const dy = o.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < meilleureD2) {
        meilleureD2 = d2;
        meilleur = o;
      }
    });
    return meilleur;
  }

  /** Tous les objets à moins de `rayon` de (x, y). */
  dansRayon(x: number, y: number, rayon: number, filtre?: (o: T) => boolean): T[] {
    const resultat: T[] = [];
    const r2 = rayon * rayon;
    this.visiter(x, y, rayon, (o) => {
      if (filtre && !filtre(o)) return;
      const dx = o.x - x;
      const dy = o.y - y;
      if (dx * dx + dy * dy <= r2) resultat.push(o);
    });
    return resultat;
  }
}
