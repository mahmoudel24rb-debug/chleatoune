// Moteur de succès (plan 16 §1-2) : évaluation sur ÉVÉNEMENT (gains,
// fins de porte, captures…) + un balayage au chargement pour rattraper
// une sauvegarde avancée — jamais par frame. Anti-spam de toasts :
// 3 max d'un coup, puis « +N autres ».

import { SUCCES, TITRES_RANG } from '../data/succes';
import { recalculerStats, state } from '../core/state';
import { crediterDore } from './economy';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export function progressionSucces(): { faits: number; total: number; pct: number } {
  const faits = SUCCES.filter((s) => state.save.succes[s.id]).length;
  return { faits, total: SUCCES.length, pct: SUCCES.length ? faits / SUCCES.length : 0 };
}

function accorderTitre(titre: string): void {
  if (!state.save.titres.includes(titre)) {
    state.save.titres.push(titre);
    ajouterToast(`👗 NOUVEAU TITRE : ${titre}`);
  }
}

/** Passe en revue toutes les conditions ; débloque ce qui est mérité. */
export function evaluerSucces(silencieux = false): void {
  const save = state.save;
  const nouveaux: string[] = [];
  for (const def of SUCCES) {
    if (save.succes[def.id]) continue;
    const resultat = def.condition(save);
    const atteint = resultat === true || (typeof resultat === 'number' && resultat >= 1);
    if (!atteint) continue;
    save.succes[def.id] = true;
    nouveaux.push(def.nom);
    if (def.recompense?.plumes) {
      save.plumes += def.recompense.plumes;
      save.cumulPlumes += def.recompense.plumes;
    }
    if (def.recompense?.dores) crediterDore(def.recompense.dores, 0, 0, true);
    if (def.recompense?.titre) accorderTitre(def.recompense.titre);
  }

  // titres de rang (hiérarchie de la haute couture, plan 16 §2)
  const pct = progressionSucces().pct;
  for (const rang of TITRES_RANG) {
    if (pct >= rang.seuil) accorderTitre(rang.titre);
  }
  if (!save.titreActif) save.titreActif = 'APPRENTIE';

  if (nouveaux.length > 0) {
    recalculerStats();
    if (!silencieux) {
      sons.succes();
      for (const nom of nouveaux.slice(0, 3)) ajouterToast(`🏆 SUCCÈS — ${nom}`);
      if (nouveaux.length > 3) ajouterToast(`🏆 …ET ${nouveaux.length - 3} AUTRES SUCCÈS !`);
    }
    sauvegarder();
  }
}

let accSucces = 0;

/** Câblage : gains (event), fins de porte & captures (les systèmes
 *  appellent evaluerSucces), + un filet périodique très espacé. */
export function initSucces(): void {
  window.addEventListener('birb-gain', () => {
    // throttle : les gains pleuvent, on n'évalue qu'à ~2 s d'écart
    if (accSucces > 0) return;
    accSucces = 2;
    evaluerSucces();
  });
  // rattrapage d'une sauvegarde avancée : APRÈS migration + recalcul —
  // les succès mérités tombent en rafale (anti-spam : 3 toasts + « +N »)
  evaluerSucces();
}

export function majSucces(dt: number): void {
  accSucces = Math.max(0, accSucces - dt);
}
