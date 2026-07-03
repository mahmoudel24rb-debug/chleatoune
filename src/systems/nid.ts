// L'arbre géant de la forêt (le « nid ») : on le nourrit en brindilles,
// chaque palier améliore les gains hors-ligne et le premier réveille
// Yuumi, la gardienne de la forêt.

import { THEME } from '../data/config';
import { state } from '../core/state';
import { clamp, formatNombre } from '../core/utils';
import { crediter } from './economy';
import { bonusActif } from './calendrier';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export const PALIERS_NID = [200, 1000, 5000, 25000, 100000];
export const NID_MAX = PALIERS_NID.length;

export function coutProchainPalier(): number | null {
  return state.save.nid >= NID_MAX ? null : PALIERS_NID[state.save.nid];
}

export function nourrirNid(): boolean {
  const cout = coutProchainPalier();
  if (cout === null) return false;
  if (state.save.soldes.brindille < cout) {
    sons.refus();
    return false;
  }
  state.save.soldes.brindille -= cout;
  state.save.nid += 1;
  sons.niveau();
  ajouterToast(
    state.save.nid === 1
      ? "L'ARBRE S'ÉVEILLE… YUUMI VEILLE SUR LA FORÊT ! 🐱"
      : `L'ARBRE GÉANT PASSE AU PALIER ${state.save.nid} !`
  );
  sauvegarder();
  return true;
}

/** Gains hors-ligne, calculés une fois au chargement (plan « nid »).
 *  Formule : palier × 3 smiski/minute, plafonné à 12 h,
 *  doublé par le talent RÊVES FERTILES. Yuumi ajoute des brindilles. */
export function appliquerGainsHorsLigne(): void {
  const save = state.save;
  if (!save.derniereVisite || save.nid <= 0) return;
  const minutes = clamp((Date.now() - save.derniereVisite) / 60000, 0, 720);
  if (minutes < 2) return;

  // DIMANCHE DU MÉTIER (plan 16 §5) : le Métier tisse ×1,5
  const facteur = (save.talents['t_offline'] ? 2 : 1) * (bonusActif('metier') ? 1.5 : 1);
  const smiski = Math.round(save.nid * 3 * minutes * facteur);
  const brindilles = Math.round(save.nid * minutes * facteur);
  if (smiski <= 0) return;

  crediter('popcorn', smiski, 0, 0, true);
  crediter('brindille', brindilles, 0, 0, true);
  // « le Métier tisse pendant ton absence » (plan 15 §1)
  ajouterToast(
    `LE MÉTIER A TISSÉ PENDANT TON ABSENCE (${Math.round(minutes)} MIN) : +${formatNombre(smiski, 0)} ${THEME.monnaies.popcorn.nom} ET +${formatNombre(brindilles, 0)} ${THEME.monnaies.brindille.nom} 🧵`
  );
}
