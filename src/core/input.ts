// InputManager (plan 03, étape 1). On utilise e.code (position physique) :
// KeyW/KeyA/KeyS/KeyD couvrent automatiquement ZQSD sur AZERTY
// et WASD sur QWERTY, plus les flèches.

const HAUT = ['ArrowUp', 'KeyW'];
const BAS = ['ArrowDown', 'KeyS'];
const GAUCHE = ['ArrowLeft', 'KeyA'];
const DROITE = ['ArrowRight', 'KeyD'];

const enfoncees = new Set<string>();
const raccourcis = new Map<string, () => void>();

function dansUnChamp(e: KeyboardEvent): boolean {
  const t = e.target;
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
}

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    if (dansUnChamp(e)) return;
    if (e.code.startsWith('Arrow') || e.code === 'F1') e.preventDefault();
    if (!e.repeat) raccourcis.get(e.code)?.();
    enfoncees.add(e.code);
  });
  window.addEventListener('keyup', (e) => enfoncees.delete(e.code));
  // Sinon le birb continue de courir tout seul après un alt-tab (plan 03, pièges).
  window.addEventListener('blur', () => enfoncees.clear());
}

export function surTouche(code: string, action: () => void): void {
  raccourcis.set(code, action);
}

function actif(codes: string[]): boolean {
  return codes.some((c) => enfoncees.has(c));
}

export const input = {
  axeX: () => (actif(DROITE) ? 1 : 0) - (actif(GAUCHE) ? 1 : 0),
  axeY: () => (actif(BAS) ? 1 : 0) - (actif(HAUT) ? 1 : 0),
};
