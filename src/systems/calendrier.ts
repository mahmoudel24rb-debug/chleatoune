// Le Calendrier de l'Atelier (plan 16 §5) : bonus du jour + offrande.
// Tout en date LOCALE calculée à la volée. Si la date recule (voyage,
// horloge), on ne pénalise pas : jour différent = offrande disponible.

import { BONUS_JOURS, OFFRANDES, RECOMPENSE_OFFRANDE, type BonusJour } from '../data/calendrier';
import { state } from '../core/state';
import { crediterDore } from './economy';
import { retirerCommuns } from './besace';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function bonusDuJour(): BonusJour {
  const jour = new Date().getDay();
  return BONUS_JOURS.find((b) => b.jour === jour) ?? BONUS_JOURS[0];
}

/** Multiplicateur/flag du bonus, consulté aux endroits concernés. */
export function bonusActif(effet: BonusJour['effet']): boolean {
  return bonusDuJour().effet === effet;
}

export function offrandeDuJour() {
  const index = new Date().getDay() % OFFRANDES.length;
  return OFFRANDES[index];
}

export function offrandeDisponible(): boolean {
  return state.save.calendrier.dernierJour !== aujourdhui();
}

export function faireOffrande(): boolean {
  if (!offrandeDisponible()) return false;
  const offrande = offrandeDuJour();
  if (offrande.monnaie === 'dore') {
    if (state.save.soldeDore < offrande.quantite) return false;
    state.save.soldeDore -= offrande.quantite;
  } else if (offrande.monnaie === 'poissons') {
    if (!retirerCommuns(offrande.quantite)) return false;
  } else {
    if (state.save.soldes[offrande.monnaie] < offrande.quantite) return false;
    state.save.soldes[offrande.monnaie] -= offrande.quantite;
  }
  const hier = state.save.calendrier.dernierJour;
  const dHier = new Date(Date.now() - 86400000);
  const chaineHier = `${dHier.getFullYear()}-${String(dHier.getMonth() + 1).padStart(2, '0')}-${String(dHier.getDate()).padStart(2, '0')}`;
  // série : consécutif = +1, sinon on repart à 1 — SANS message
  // culpabilisant (zéro FOMO, c'est un cadeau)
  state.save.calendrier.serie = hier === chaineHier ? state.save.calendrier.serie + 1 : 1;
  state.save.calendrier.dernierJour = aujourdhui();
  crediterDore(RECOMPENSE_OFFRANDE, 0, 0, true);
  sons.rebirb();
  ajouterToast(
    state.save.calendrier.serie === 7
      ? `🗓 OFFRANDE ACCEPTÉE ! +${RECOMPENSE_OFFRANDE} ✦ — 7 JOURS DE SUITE, L'ATELIER TE SALUE 🎉`
      : `🗓 OFFRANDE ACCEPTÉE ! +${RECOMPENSE_OFFRANDE} ✦ (série : ${state.save.calendrier.serie})`
  );
  sauvegarder();
  return true;
}
