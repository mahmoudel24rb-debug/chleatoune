// Le panneau du MODE DEV (F1) : se donner des ressources pour tester
// l'équilibrage sans farmer. Verrouillé par mot de passe — déverrouillé
// pour la session (sessionStorage), jamais sauvegardé.
//
// Les crédits sont BRUTS (pas de multiplicateurs, pas de progression de
// quêtes/recouture) : c'est un outil de test, pas un gain de jeu.

import { THEME, MONNAIES, type MonnaieId } from '../data/config';
import { recalculerStats, state } from '../core/state';
import { el, formatNombre } from '../core/utils';
import { sauvegarder } from '../systems/save';
import { sons } from '../systems/audio';
import { ajouterToast } from './toasts';

const MOT_DE_PASSE = 'RakTma123456';
const CLE_SESSION = 'chleatoune_dev';

type RessourceId = MonnaieId | 'dore' | 'plume' | 'sp';

const RESSOURCES: { id: RessourceId; nom: string }[] = [
  ...MONNAIES.map((m) => ({ id: m as RessourceId, nom: THEME.monnaies[m].nom })),
  { id: 'dore', nom: THEME.dore.pluriel },
  { id: 'plume', nom: THEME.prestige.nom },
  { id: 'sp', nom: 'SP (points de compétence)' },
];

let panneau: HTMLElement | null = null;

function deverrouille(): boolean {
  return sessionStorage.getItem(CLE_SESSION) === 'oui';
}

function crediterDev(id: RessourceId, montant: number): void {
  const save = state.save;
  if (id === 'dore') {
    save.soldeDore += montant;
    save.cumulDore += montant;
  } else if (id === 'plume') {
    // le solde ET le cumul : le bonus passif suit, comme un vrai gain
    save.plumes += montant;
    save.cumulPlumes += montant;
  } else if (id === 'sp') {
    save.heros.sp += montant;
  } else {
    save.soldes[id] += montant;
    save.cumulsGlobaux[id] += montant;
  }
  recalculerStats();
  sauvegarder();
  sons.achat();
  const nom = RESSOURCES.find((r) => r.id === id)?.nom ?? id;
  ajouterToast(`🛠 DEV : +${formatNombre(montant, 0)} ${nom}`);
}

function construire(): HTMLElement {
  const boite = el('div', 'dev-panneau');
  boite.id = 'dev-panneau';

  if (!deverrouille()) {
    boite.appendChild(el('div', 'dev-titre', '🛠 MODE DEV — VERROUILLÉ'));
    const champ = el('input', 'dev-champ') as HTMLInputElement;
    champ.type = 'password';
    champ.placeholder = 'Mot de passe…';
    const btn = el('button', 'btn dev-btn', 'DÉVERROUILLER');
    const valider = () => {
      if (champ.value === MOT_DE_PASSE) {
        sessionStorage.setItem(CLE_SESSION, 'oui');
        sons.niveau();
        ajouterToast('🛠 MODE DEV DÉVERROUILLÉ (pour cette session)');
        reconstruire();
      } else {
        sons.refus();
        champ.value = '';
        ajouterToast('MOT DE PASSE INCORRECT…');
      }
    };
    btn.addEventListener('click', valider);
    champ.addEventListener('keydown', (e) => {
      e.stopPropagation(); // ne pas déclencher les raccourcis du jeu
      if (e.key === 'Enter') valider();
    });
    boite.append(champ, btn);
    return boite;
  }

  boite.appendChild(el('div', 'dev-titre', '🛠 MODE DEV — SE DONNER DES RESSOURCES'));
  const ligne = el('div', 'dev-ligne');
  const choix = el('select', 'dev-champ') as HTMLSelectElement;
  for (const r of RESSOURCES) {
    const opt = el('option', '', r.nom) as HTMLOptionElement;
    opt.value = r.id;
    choix.appendChild(opt);
  }
  const montant = el('input', 'dev-champ dev-nombre') as HTMLInputElement;
  montant.type = 'number';
  montant.min = '1';
  montant.value = '1000';
  montant.addEventListener('keydown', (e) => e.stopPropagation());
  const btn = el('button', 'btn dev-btn', 'AJOUTER');
  btn.addEventListener('click', () => {
    const n = Math.floor(Number(montant.value));
    if (!Number.isFinite(n) || n <= 0) {
      sons.refus();
      return;
    }
    crediterDev(choix.value as RessourceId, n);
  });
  ligne.append(choix, montant, btn);
  boite.appendChild(ligne);

  // raccourcis fréquents
  const rapide = el('div', 'dev-ligne');
  for (const [texte, id, n] of [
    ['+10 000 SMISKI', 'popcorn', 10000],
    ['+500 ✦', 'dore', 500],
    ['+10 PLUMES', 'plume', 10],
    ['+10 SP', 'sp', 10],
  ] as [string, RessourceId, number][]) {
    const b = el('button', 'btn dev-btn', texte);
    b.addEventListener('click', () => crediterDev(id, n));
    rapide.appendChild(b);
  }
  boite.appendChild(rapide);
  return boite;
}

function reconstruire(): void {
  if (!panneau) return;
  const parent = panneau.parentElement!;
  const remplaçant = construire();
  parent.replaceChild(remplaçant, panneau);
  panneau = remplaçant;
}

/** Affiché/masqué avec l'overlay F1 (main.ts). */
export function basculerModeDev(visible: boolean): void {
  if (!panneau) {
    panneau = construire();
    document.body.appendChild(panneau);
  }
  panneau.classList.toggle('cache', !visible);
}
