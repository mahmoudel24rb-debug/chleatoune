// Sauvegarde localStorage (plan 07) : uniquement l'état source, jamais
// les valeurs dérivées — tout se recalcule au chargement.

import { INDEX_DONJON, MONNAIES, ZONES } from '../data/config';
import { cleSauvegardeActive } from './profils';
import { zonesDebloquees } from '../data/progression';
import { clamp } from '../core/utils';
import { defautsSave, recalculerStats, state, type SaveData } from '../core/state';

/** API exposée par Electron (electron/preload.cjs) — absente dans le
 *  navigateur. Quand elle est là, la sauvegarde vit AUSSI sur disque. */
interface ApiBureau {
  lireSauvegarde(): string | null;
  ecrireSauvegarde(json: string): void;
  exporterVersFichier(json: string): Promise<boolean>;
  importerDepuisFichier(): Promise<string | null>;
}

export const apiBureau = (window as unknown as { chleatouneApp?: ApiBureau }).chleatouneApp;

/** La clé de sauvegarde du personnage actif (null = pas encore créé). */
function cle(): string | null {
  return cleSauvegardeActive();
}

// Verrou posé pendant un changement de personnage : sans lui, le
// beforeunload re-sauvegarderait l'état de l'ANCIEN perso sous la clé
// du nouveau (le profil actif change juste avant le rechargement).
let verrou = false;
export function verrouillerSauvegarde(): void {
  verrou = true;
}
/** Le cloud doit AUSSI respecter le verrou (sinon le beacon de fermeture
 *  pousse l'état de l'ancien perso sous le code du nouveau). */
export function sauvegardeVerrouillee(): boolean {
  return verrou;
}

export function sauvegarder(): void {
  if (verrou) return;
  const cleActive = cle();
  if (!cleActive) return; // pas de personnage : rien à sauver
  try {
    state.save.derniereVisite = Date.now(); // pour les gains hors-ligne
    const json = JSON.stringify(state.save);
    localStorage.setItem(cleActive, json);
    apiBureau?.ecrireSauvegarde(json); // mode bureau : copie sur disque
  } catch (e) {
    console.warn('Sauvegarde impossible :', e);
  }
}

/** Fusion avec les valeurs par défaut + garde-fous (version, bornes). */
function fusionner(brut: unknown): SaveData {
  const defauts = defautsSave();
  if (typeof brut !== 'object' || brut === null) return defauts;
  const d = brut as Partial<SaveData>;
  const save: SaveData = {
    ...defauts,
    ...d,
    soldes: { ...defauts.soldes, ...(d.soldes ?? {}) },
    cumulsGlobaux: { ...defauts.cumulsGlobaux, ...(d.cumulsGlobaux ?? {}) },
    niveaux: { ...(d.niveaux ?? {}) },
    heros: {
      ...defauts.heros,
      ...(d.heros ?? {}),
      competences: { ...defauts.heros.competences, ...(d.heros?.competences ?? {}) },
    },
    talents: { ...(d.talents ?? {}) },
    desert: { ...(d.desert ?? {}) },
    quetes: {
      actives: Array.isArray(d.quetes?.actives) ? d.quetes.actives : [],
      terminees: d.quetes?.terminees ?? 0,
    },
    peche: {
      ...defauts.peche,
      ...(d.peche ?? {}),
      dex: { ...(d.peche?.dex ?? {}) },
    },
    swarm: {
      ...defauts.swarm,
      ...(d.swarm ?? {}),
      termines: { ...(d.swarm?.termines ?? {}) },
      escouade: Array.isArray(d.swarm?.escouade) ? d.swarm.escouade : [],
    },
    parchemins: { ...(d.parchemins ?? {}) },
    sorts: { ...(d.sorts ?? {}) },
    evolutions: { ...(d.evolutions ?? {}) },
    compagnons: { ...(d.compagnons ?? {}) },
  };
  // Migration v1 → v2 : le bonus passif passe sur les plumes cumulées.
  if ((d.version ?? 1) < 2 && d.cumulPlumes === undefined) {
    save.cumulPlumes = save.plumes;
  }
  // Migration v2 → v3 (plan 12 §6) : l'étage d'expédition devient une
  // porte par ÉQUIVALENCE DE PUISSANCE (1,45^(p-1) = 1 + 0,4×(e-1)).
  // Généreux exprès : personne ne doit avoir l'impression de régresser.
  if ((d.version ?? 1) < 3) {
    const e = Math.max(1, save.meilleurEtage ?? 1);
    save.swarm.porteMax = clamp(
      Math.round(1 + Math.log(1 + 0.4 * (e - 1)) / Math.log(1.45)),
      1,
      12
    );
    save.compagnons.prairie = save.niveaux['p_doughcat'] ?? 0;
    save.sorts.ciseaux = Math.max(1, save.sorts.ciseaux ?? 0); // jamais démunie
    // les quêtes « étage » deviennent des quêtes « donjon »
    for (const q of save.quetes.actives as { type: string; objectif: number; progres: number }[]) {
      if (q.type === 'etage') {
        q.type = 'donjon';
        q.objectif = Math.max(1, Math.round(q.objectif / 3));
        q.progres = 0;
      }
    }
  }
  save.version = 3;
  const zone = Math.floor(save.zone);
  // le donjon est toujours accessible ; les autres zones dépendent des
  // rebirbs (table `rebirbsRequis` de ZONES)
  if (zone === INDEX_DONJON) {
    save.zone = zone;
  } else if (ZONES[zone] && save.rebirbs >= (ZONES[zone].rebirbsRequis ?? 0)) {
    save.zone = zone;
  } else {
    save.zone = clamp(zone, 0, zonesDebloquees(save.rebirbs) - 1);
  }
  save.volume = clamp(save.volume, 0, 1);
  for (const m of MONNAIES) {
    if (!Number.isFinite(save.soldes[m])) save.soldes[m] = 0;
    if (!Number.isFinite(save.cumulsGlobaux[m])) save.cumulsGlobaux[m] = 0;
  }
  return save;
}

export function charger(): void {
  try {
    // mode bureau : le fichier disque fait foi, localStorage en secours
    const cleActive = cle();
    const brut =
      apiBureau?.lireSauvegarde() ?? (cleActive ? localStorage.getItem(cleActive) : null);
    if (brut) state.save = fusionner(JSON.parse(brut));
  } catch (e) {
    // Une sauvegarde corrompue ne doit pas empêcher le jeu de démarrer.
    console.warn('Sauvegarde illisible, on repart de zéro :', e);
    state.save = defautsSave();
  }
  recalculerStats();
}

export function exporterJSON(): string {
  return JSON.stringify(state.save);
}

export function importerJSON(texte: string): boolean {
  try {
    state.save = fusionner(JSON.parse(texte));
    recalculerStats();
    sauvegarder();
    return true;
  } catch {
    return false;
  }
}

export function reinitialiser(): void {
  state.save = defautsSave();
  recalculerStats();
  sauvegarder();
}

export function initAutosave(): void {
  window.addEventListener('beforeunload', sauvegarder);
}
