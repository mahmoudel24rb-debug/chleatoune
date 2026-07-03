// Chasses au trésor (plan 16 §4) + fils secrets (§3). Les repères d'une
// chasse n'apparaissent dans le monde QUE pendant leur propre étape ;
// après SWARM.chasse.aideSec sans progrès, une flèche discrète pulse
// vers la cible. Annuler/racheter = la carte en cours est perdue.

import { CHASSES, chasseParId, type ChasseDef } from '../data/chasses';
import { SECRETS } from '../data/secrets';
import { state } from '../core/state';
import { dist } from '../core/utils';
import { birb } from '../entities/birb';
import { jeu } from '../core/mode';
import { crediterDore } from './economy';
import { evaluerSucces } from './succes';
import { ajouterParticules, ajouterTexteFlottant } from './fx';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export const AIDE_CHASSE_SEC = 90; // flèche d'aide après N s sans progrès

export function chasseActive(): { def: ChasseDef; etape: number } | null {
  const c = state.save.chasse;
  if (!c) return null;
  const def = chasseParId(c.id);
  if (!def) return null;
  return { def, etape: c.etape };
}

/** L'indice courant, pour la ligne de suivi du HUD. */
export function indiceCourant(): string | null {
  const c = chasseActive();
  if (!c) return null;
  return `🗺 ${c.def.etapes[c.etape].indice}`;
}

/** Tirage sans remise (les chasses déjà faites tournent en boucle). */
export function acheterChasse(): ChasseDef {
  const index = state.save.chassesFaites % CHASSES.length;
  const def = CHASSES[index];
  state.save.chasse = { id: def.id, etape: 0, tSansProgres: 0 };
  sauvegarder();
  return def;
}

export function demarrerChasseScenarisee(id: string): void {
  state.save.chasse = { id, etape: 0, tSansProgres: 0 };
  sauvegarder();
}

/** Interaction avec le repère de l'étape courante. */
export function activerRepere(): void {
  const c = chasseActive();
  if (!c || !state.save.chasse) return;
  const etape = c.def.etapes[c.etape];
  sons.touche();
  ajouterParticules(etape.x, etape.y, '#f2d16b', 10);
  if (c.etape < 2) {
    state.save.chasse.etape += 1;
    state.save.chasse.tSansProgres = 0;
    ajouterToast(`🗺 INDICE SUIVANT : ${c.def.etapes[c.etape + 1].indice}`);
    sauvegarder();
    return;
  }
  // 3ᵉ repère : creuser ! (1,5 s de suspense, particules de terre)
  ajouterToast('⛏ ELLE CREUSE…');
  ajouterParticules(etape.x, etape.y, '#8a5a34', 18);
  const def = c.def;
  window.setTimeout(() => {
    const [min, max] = def.recompense.dores;
    const dores = min + Math.floor(Math.random() * (max - min + 1));
    crediterDore(dores, birb.x, birb.y - 40);
    if (Math.random() < def.recompense.chancePlume) {
      state.save.plumes += 1;
      state.save.cumulPlumes += 1;
      ajouterTexteFlottant(birb.x, birb.y - 70, '+1 PLUME', '#a8d8ff');
    }
    if (def.id !== 'chasse_filrouge') state.save.chassesFaites += 1;
    state.save.chasse = null;
    sons.rebirb();
    ajouterToast(`💰 TRÉSOR DÉTERRÉ : ${dores} ✦ !`);
    window.dispatchEvent(new CustomEvent('chleatoune-chasse-finie', { detail: def.id }));
    evaluerSucces();
    sauvegarder();
  }, 1500);
}

/** Tick : compteur d'aide (la flèche pulse ensuite, rendue par main.ts). */
export function majChasse(dt: number): void {
  const c = state.save.chasse;
  if (!c || jeu.mode !== 'monde') return;
  c.tSansProgres += dt;
}

/** Cible de la flèche d'aide (ou null si pas d'aide méritée). */
export function cibleAideChasse(): { x: number; y: number } | null {
  const c = chasseActive();
  if (!c || !state.save.chasse) return null;
  if (state.save.chasse.tSansProgres < AIDE_CHASSE_SEC) return null;
  const etape = c.def.etapes[c.etape];
  if (etape.zone !== state.save.zone || jeu.mode !== 'monde') return null;
  return { x: etape.x, y: etape.y };
}

// ------------------------------------------------- les fils secrets

export function tirerFilSecret(id: string): void {
  const def = SECRETS.find((s) => s.id === id);
  if (!def || state.save.secrets.includes(id)) return;
  // « elle tire le fil » : une seconde de suspense, puis la cache
  ajouterToast('🧵 ELLE TIRE LE FIL…');
  window.setTimeout(() => {
    if (state.save.secrets.includes(id)) return;
    state.save.secrets.push(id);
    ajouterParticules(def.x, def.y, '#f2d16b', 16);
    sons.rebirb();
    const r = def.recompense;
    if (r.dores) crediterDore(r.dores, def.x, def.y);
    if (r.plume) {
      state.save.plumes += 1;
      state.save.cumulPlumes += 1;
      ajouterTexteFlottant(def.x, def.y - 40, '+1 PLUME', '#a8d8ff');
    }
    if (r.appat) {
      state.save.peche.appats[r.appat.id] = (state.save.peche.appats[r.appat.id] ?? 0) + r.appat.n;
      ajouterToast(`🎣 +${r.appat.n} APPÂTS TROUVÉS DANS LA CACHE !`);
    }
    ajouterToast(`✨ FIL SECRET ${state.save.secrets.length}/15 !`);
    evaluerSucces();
    sauvegarder();
  }, 1000);
}

/** Indice de la Sphinge (60 dorés) : la ZONE d'un fil restant, jamais plus. */
export function indiceFilSecret(): string | null {
  const restants = SECRETS.filter((s) => !state.save.secrets.includes(s.id));
  if (restants.length === 0) return null;
  const fil = restants[Math.floor(Math.random() * restants.length)];
  return fil.id.includes('prairie')
    ? 'LA PRAIRIE'
    : fil.id.includes('scene')
      ? 'LA SCÈNE'
      : fil.id.includes('foret')
        ? 'LA FORÊT'
        : fil.id.includes('mine')
          ? 'LA MINE'
          : 'LE DÉSERT DORÉ';
}

export { SECRETS, dist };
