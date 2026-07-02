// Boucle requestAnimationFrame avec delta time clampé (plan 02, étape 1).

export function demarrerBoucle(update: (dt: number) => void, render: () => void): void {
  let precedent = performance.now();
  const frame = (t: number) => {
    let dt = (t - precedent) / 1000;
    precedent = t;
    dt = Math.min(dt, 0.1); // pas de téléportation après un onglet en pause
    update(dt);
    render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
