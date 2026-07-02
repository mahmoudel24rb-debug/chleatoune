// Le prestige (plan 06) : tout recommencer contre des plumes permanentes.

import { MONNAIES, THEME } from '../data/config';
import { AMELIORATIONS } from '../data/upgrades';
import { plumesGagnees, seuilRebirb } from '../data/progression';
import { recalculerStats, state } from '../core/state';
import { viderCollectibles } from './spawner';
import { enregistrerGain } from './economy';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export function rebirbDisponible(): boolean {
  return state.save.cumulCycle >= seuilRebirb(state.save.rebirbs);
}

export function faireRebirb(): boolean {
  if (!rebirbDisponible()) return false;

  const gain = plumesGagnees(state.save.rebirbs);
  state.save.plumes += gain;
  state.save.cumulPlumes += gain; // le bonus passif suit le cumul
  state.save.rebirbs += 1;

  // Remise à zéro : soldes, cycle, améliorations non permanentes.
  for (const m of MONNAIES) state.save.soldes[m] = 0;
  state.save.cumulCycle = 0;
  for (const a of AMELIORATIONS) {
    if (!a.permanent) delete state.save.niveaux[a.id];
  }
  viderCollectibles();
  recalculerStats();

  enregistrerGain('plume', gain);
  sons.rebirb();
  ajouterToast(`${THEME.prestige.verbe} ! +${gain} PLUME${gain > 1 ? 'S' : ''} ✂🎉`);
  sauvegarder();
  return true;
}
