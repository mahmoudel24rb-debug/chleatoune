// Gestion du devicePixelRatio et du resize (plan 02, étape 2).

export interface Ecran {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  largeur: number; // taille CSS = taille "logique" utilisée par la caméra
  hauteur: number;
}

export function initCanvas(canvas: HTMLCanvasElement): Ecran {
  const ecran: Ecran = { canvas, ctx: canvas.getContext('2d')!, largeur: 0, hauteur: 0 };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    ecran.largeur = canvas.clientWidth;
    ecran.hauteur = canvas.clientHeight;
    canvas.width = Math.round(ecran.largeur * dpr);
    canvas.height = Math.round(ecran.hauteur * dpr);
    // Changer canvas.width réinitialise le contexte : on re-règle tout ici.
    ecran.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ecran.ctx.imageSmoothingEnabled = false;
  };

  window.addEventListener('resize', resize);
  resize();
  return ecran;
}
