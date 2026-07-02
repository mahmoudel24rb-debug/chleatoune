// Petits messages temporaires en bas de l'écran.

import { el } from '../core/utils';

export function ajouterToast(texte: string): void {
  const conteneur = document.getElementById('toasts')!;
  const toast = el('div', 'toast', texte);
  conteneur.appendChild(toast);
  window.setTimeout(() => toast.classList.add('sortie'), 2200);
  window.setTimeout(() => toast.remove(), 2800);
}
