import { BUFFS_MATIERES, BONUS_MATIERES, PREPARATIONS_MATIERES, TEINTURES, type BuffMatiereId, type CoutMatieres, type PreparationMatiereId } from '../data/matieres';
import { THEME, type MonnaieId } from '../data/config';
import { recalculerStats, state } from '../core/state';
import { formatNombre } from '../core/utils';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

const effetsDonjon = {
  renfort: false,
  kit: false,
};

export function tempsBuffMatiere(id: BuffMatiereId): number {
  return Math.max(0, state.save.matieres.buffs[id] ?? 0);
}

export function buffMatiereActif(id: BuffMatiereId): boolean {
  return tempsBuffMatiere(id) > 0;
}

export function multRecolteCompagnons(): number {
  return buffMatiereActif('concert') ? 1 + BONUS_MATIERES.concertRecolteCompagnons : 1;
}

export function multPvCompagnonsDonjon(): number {
  return effetsDonjon.renfort ? 1 + BONUS_MATIERES.renfortPvCompagnons : 1;
}

export function multRespawnCompagnonsDonjon(): number {
  return effetsDonjon.kit ? 1 - BONUS_MATIERES.kitRespawnCompagnons : 1;
}

/** À l'entrée d'une porte : arme les effets SANS consommer la préparation.
 *  La consommation n'a lieu qu'à la conclusion du run (victoire, K.O.,
 *  sortie volontaire) — un rechargement en plein donjon ramène à l'Envers
 *  sans rien perdre (règle de clémence). */
export function appliquerPreparationsDonjon(): void {
  effetsDonjon.renfort = state.save.matieres.preparations.renfort === true;
  effetsDonjon.kit = state.save.matieres.preparations.kit === true;
  if (!effetsDonjon.renfort && !effetsDonjon.kit) return;
  const effets = [
    effetsDonjon.renfort ? 'PV COMPAGNONS +15 %' : '',
    effetsDonjon.kit ? 'RESPAWN COMPAGNONS -20 %' : '',
  ].filter(Boolean);
  ajouterToast(`PRÉPARATION DE FORGE : ${effets.join(' · ')}`);
}

/** À la fin d'un run (victoire, K.O. ou sortie) : consomme les
 *  préparations réellement utilisées. Idempotente — appelée à la fois
 *  par la victoire et par sortirDonjon(), sans double effet. */
export function consommerPreparationsDonjon(): void {
  if (!effetsDonjon.renfort && !effetsDonjon.kit) return;
  if (effetsDonjon.renfort) state.save.matieres.preparations.renfort = false;
  if (effetsDonjon.kit) state.save.matieres.preparations.kit = false;
  effetsDonjon.renfort = false;
  effetsDonjon.kit = false;
  sauvegarder();
}

export function tickMatieres(dt: number): void {
  let projecteursChange = false;
  for (const def of BUFFS_MATIERES) {
    const avant = tempsBuffMatiere(def.id);
    if (avant <= 0) continue;
    const apres = Math.max(0, avant - dt);
    state.save.matieres.buffs[def.id] = apres;
    if (def.id === 'projecteurs' && avant > 0 && apres === 0) projecteursChange = true;
  }
  if (projecteursChange) recalculerStats();
}

export function peutPayerCout(cout: CoutMatieres): boolean {
  return Object.entries(cout).every(([m, n]) => state.save.soldes[m as MonnaieId] >= (n ?? 0));
}

export function texteCout(cout: CoutMatieres): string {
  return Object.entries(cout)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([m, n]) => `${formatNombre(n ?? 0, 0)} ${THEME.monnaies[m as MonnaieId].nom}`)
    .join(' + ');
}

function payerCout(cout: CoutMatieres): boolean {
  if (!peutPayerCout(cout)) {
    sons.refus();
    return false;
  }
  for (const [m, n] of Object.entries(cout)) state.save.soldes[m as MonnaieId] -= n ?? 0;
  return true;
}

export function acheterBuffMatiere(id: BuffMatiereId): boolean {
  const def = BUFFS_MATIERES.find((b) => b.id === id);
  // un bonus déjà actif ne se relance pas : on ne laisse pas payer
  // plein tarif pour quelques secondes (règle de clémence)
  if (!def || buffMatiereActif(id) || !payerCout(def.cout)) return false;
  state.save.matieres.buffs[id] = def.dureeSec;
  sons.rebirb();
  ajouterToast(`${def.nom} LANCÉ !`);
  recalculerStats();
  sauvegarder();
  return true;
}

export function acheterPreparationMatiere(id: PreparationMatiereId): boolean {
  const def = PREPARATIONS_MATIERES.find((p) => p.id === id);
  if (!def || state.save.matieres.preparations[id] || !payerCout(def.cout)) return false;
  state.save.matieres.preparations[id] = true;
  sons.achat();
  ajouterToast(`${def.nom} PRÊT POUR LA PROCHAINE PORTE.`);
  sauvegarder();
  return true;
}

// ------------------------------------------- la Teinturerie (cosmétique)

export function teinturePossedee(id: string): boolean {
  return state.save.matieres.teintures.includes(id);
}

/** Couleur du lavis porté par l'héroïne, ou null (tenue d'origine). */
export function couleurTeintureActive(): string | null {
  const id = state.save.matieres.teintureActive;
  if (!id) return null;
  return TEINTURES.find((t) => t.id === id)?.couleur ?? null;
}

/** Achat permanent — la teinture est portée aussitôt (c'est le plaisir). */
export function acheterTeinture(id: string): boolean {
  const def = TEINTURES.find((t) => t.id === id);
  if (!def || teinturePossedee(id) || !payerCout(def.cout)) return false;
  state.save.matieres.teintures.push(id);
  state.save.matieres.teintureActive = id;
  sons.niveau();
  ajouterToast(`✂ TEINTURE ${def.nom} COUSUE — ELLE TE VA À MERVEILLE !`);
  sauvegarder();
  return true;
}

/** Porter une teinture possédée, ou null pour la tenue d'origine. */
export function porterTeinture(id: string | null): boolean {
  if (id !== null && !teinturePossedee(id)) return false;
  if (state.save.matieres.teintureActive === id) return true;
  state.save.matieres.teintureActive = id;
  sons.achat();
  const def = id ? TEINTURES.find((t) => t.id === id) : null;
  ajouterToast(def ? `TEINTURE ${def.nom} PORTÉE.` : 'TENUE D’ORIGINE RETROUVÉE.');
  sauvegarder();
  return true;
}

export function reparerSoclePorte(niveau: number, cout: CoutMatieres): boolean {
  // seule une porte déjà terminée mérite son socle (l'UI filtre déjà,
  // ceinture et bretelles ici)
  if ((state.save.swarm.termines[niveau] ?? 0) === 0) return false;
  if (state.save.matieres.portesReparees.includes(niveau) || !payerCout(cout)) return false;
  state.save.matieres.portesReparees.push(niveau);
  state.save.matieres.portesReparees.sort((a, b) => a - b);
  sons.niveau();
  ajouterToast(`SOCLE DE LA PORTE ${niveau} RECOUSU.`);
  sauvegarder();
  return true;
}
