// Le « juice » (plans 04 et 07) : textes flottants et particules.

interface TexteFlottant {
  x: number;
  y: number;
  texte: string;
  couleur: string;
  age: number;
  duree: number;
}

interface Particule {
  x: number;
  y: number;
  vx: number;
  vy: number;
  couleur: string;
  age: number;
  duree: number;
}

let textes: TexteFlottant[] = [];
let particules: Particule[] = [];

export function ajouterTexteFlottant(x: number, y: number, texte: string, couleur = '#ffffff'): void {
  textes.push({ x, y, texte, couleur, age: 0, duree: 0.9 });
}

export function ajouterParticules(x: number, y: number, couleur: string, nombre = 6): void {
  for (let i = 0; i < nombre; i++) {
    const angle = Math.random() * Math.PI * 2;
    const vitesse = 40 + Math.random() * 80;
    particules.push({
      x,
      y,
      vx: Math.cos(angle) * vitesse,
      vy: Math.sin(angle) * vitesse - 60,
      couleur,
      age: 0,
      duree: 0.5 + Math.random() * 0.3,
    });
  }
}

export function majFx(dt: number): void {
  for (const t of textes) t.age += dt;
  textes = textes.filter((t) => t.age < t.duree);
  for (const p of particules) {
    p.age += dt;
    p.vy += 220 * dt; // petite gravité
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  particules = particules.filter((p) => p.age < p.duree);
}

export function dessinerFx(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  for (const p of particules) {
    ctx.globalAlpha = 1 - p.age / p.duree;
    ctx.fillStyle = p.couleur;
    ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), 3, 3);
  }
  ctx.globalAlpha = 1;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  for (const t of textes) {
    ctx.globalAlpha = 1 - t.age / t.duree;
    const y = Math.round(t.y - camY - t.age * 34);
    const x = Math.round(t.x - camX);
    ctx.fillStyle = '#000000';
    ctx.fillText(t.texte, x + 1, y + 1);
    ctx.fillStyle = t.couleur;
    ctx.fillText(t.texte, x, y);
  }
  ctx.globalAlpha = 1;
}
