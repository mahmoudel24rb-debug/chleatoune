// La BESACE (plan 18 §1-2), la cuisine (§3), l'aquarium (§5) et les
// circuits secondaires (§6). Empilement par espèce, jamais d'objets
// individuels. Après ce plan, chaque prise pose un CHOIX : vendre,
// cuisiner, croquer, exposer.

import { POISSONS, RARETES, type EspecePoisson } from '../data/poissons';
import { PLATS, platDef, type IngredientsPlat } from '../data/cuisine';
import { state } from '../core/state';
import { crediter } from './economy';
import { evaluerSucces } from './succes';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export function espece(id: string): EspecePoisson | undefined {
  return POISSONS.find((p) => p.id === id);
}

export function stock(id: string): { n: number; shiny: number } {
  return state.save.inventaire.poissons[id] ?? { n: 0, shiny: 0 };
}

export function ajouterPoisson(id: string, shiny: boolean): void {
  const poissons = state.save.inventaire.poissons;
  const entree = poissons[id] ?? { n: 0, shiny: 0 };
  if (shiny) entree.shiny += 1;
  else entree.n += 1;
  poissons[id] = entree;
}

export function valeurPoisson(id: string, shiny: boolean): number {
  const p = espece(id);
  if (!p) return 0;
  return RARETES[p.rarete].valeur * (shiny ? 10 : 1);
}

/** Vend n exemplaires NON-shiny d'une espèce. Renvoie le gain. */
export function vendrePoissons(id: string, n: number, discret = true): number {
  const entree = state.save.inventaire.poissons[id];
  if (!entree) return 0;
  const vendus = Math.min(n, entree.n);
  if (vendus <= 0) return 0;
  entree.n -= vendus;
  const gain = valeurPoisson(id, false) * vendus;
  crediter('popcorn', gain, 0, 0, discret);
  return gain;
}

/** Vend les shiny d'une espèce (bouton DISTINCT : jamais par mégarde). */
export function vendreShiny(id: string, n: number): number {
  const entree = state.save.inventaire.poissons[id];
  if (!entree) return 0;
  const vendus = Math.min(n, entree.shiny);
  if (vendus <= 0) return 0;
  entree.shiny -= vendus;
  const gain = valeurPoisson(id, true) * vendus;
  crediter('popcorn', gain, 0, 0, true);
  return gain;
}

/** Total d'un « tout vendre » (les shiny ne sont JAMAIS inclus). */
export function totalToutVendre(filtre?: (p: EspecePoisson) => boolean): number {
  let total = 0;
  for (const p of POISSONS) {
    if (filtre && !filtre(p)) continue;
    total += stock(p.id).n * valeurPoisson(p.id, false);
  }
  return total;
}

export function toutVendre(filtre?: (p: EspecePoisson) => boolean): number {
  let total = 0;
  for (const p of POISSONS) {
    if (filtre && !filtre(p)) continue;
    total += vendrePoissons(p.id, stock(p.id).n);
  }
  if (total > 0) {
    sons.achat();
    sauvegarder();
  }
  return total;
}

/** Vente automatique à la capture (option de confort, plan 18 §2).
 *  JAMAIS un shiny ; « doublons exposés » = déjà à l'aquarium ET 5+. */
export function venteAutoALaCapture(id: string, shiny: boolean): boolean {
  if (shiny) return false;
  const p = espece(id);
  if (!p) return false;
  const mode = state.save.venteAuto;
  if (mode === 'communs' && p.rarete === 'commun') {
    vendrePoissons(id, 1);
    return true;
  }
  if (mode === 'exposes' && state.save.aquarium[id] && stock(id).n >= 5) {
    vendrePoissons(id, 1);
    return true;
  }
  return false;
}

// ------------------------------------------------------- la cuisine

/** L'ingrédient est-il disponible ? (les shiny ne comptent JAMAIS
 *  comme communs/rares — seul `shiny` en consomme, avec confirmation) */
export function peutCuisiner(ing: IngredientsPlat): boolean {
  const compte = (rarete: string) =>
    POISSONS.filter((p) => p.rarete === rarete).reduce((n, p) => n + stock(p.id).n, 0);
  if (ing.communs && compte('commun') < ing.communs) return false;
  if (ing.rares && compte('rare') < ing.rares) return false;
  if (ing.espece && stock(ing.espece).n < 1) return false;
  if (ing.shiny) {
    const totalShiny = POISSONS.reduce((n, p) => n + stock(p.id).shiny, 0);
    if (totalShiny < ing.shiny) return false;
  }
  if (ing.brindilles && state.save.soldes.brindille < ing.brindilles) return false;
  return true;
}

/** Retire n poissons d'une rareté, en commençant par les moins chers. */
function retirerParRarete(rarete: string, n: number): void {
  let restant = n;
  for (const p of POISSONS.filter((q) => q.rarete === rarete)) {
    const entree = state.save.inventaire.poissons[p.id];
    if (!entree || restant <= 0) continue;
    const pris = Math.min(entree.n, restant);
    entree.n -= pris;
    restant -= pris;
  }
}

export function cuisiner(platId: string): boolean {
  const plat = platDef(platId);
  if (!plat || !peutCuisiner(plat.ingredients)) return false;
  const ing = plat.ingredients;
  if (ing.communs) retirerParRarete('commun', ing.communs);
  if (ing.rares) retirerParRarete('rare', ing.rares);
  if (ing.espece) {
    const entree = state.save.inventaire.poissons[ing.espece];
    if (entree) entree.n -= 1;
  }
  if (ing.shiny) {
    let restant = ing.shiny;
    for (const p of POISSONS) {
      const entree = state.save.inventaire.poissons[p.id];
      if (!entree || restant <= 0) continue;
      const pris = Math.min(entree.shiny, restant);
      entree.shiny -= pris;
      restant -= pris;
    }
  }
  if (ing.brindilles) state.save.soldes.brindille -= ing.brindilles;
  state.save.inventaire.plats[platId] = (state.save.inventaire.plats[platId] ?? 0) + 1;
  sons.achat();
  ajouterToast(`${plat.icone} ${plat.nom} CUISINÉ !`);
  sauvegarder();
  return true;
}

/** Recettes visibles au palier de Mikudex actuel. */
export function platsDebloques(): typeof PLATS {
  const decouvertes = POISSONS.filter((p) => (state.save.peche.dex[p.id]?.captures ?? 0) > 0).length;
  return PLATS.filter((p) => decouvertes >= p.deblocageDex);
}

/** Consomme n poissons communs (offrande du calendrier, plan 18 §6). */
export function retirerCommuns(n: number): boolean {
  const communs = POISSONS.filter((p) => p.rarete === 'commun').reduce((s, p) => s + stock(p.id).n, 0);
  if (communs < n) return false;
  retirerParRarete('commun', n);
  return true;
}

// ----------------------------------------------------- le recyclage

/** 3 communs → 1 MIETTES DE BRIOCHE (la pêche s'auto-alimente). */
export function recyclerEnAppat(): boolean {
  const communs = POISSONS.filter((p) => p.rarete === 'commun').reduce((n, p) => n + stock(p.id).n, 0);
  if (communs < 3) return false;
  retirerParRarete('commun', 3);
  state.save.peche.appats['miettes'] = (state.save.peche.appats['miettes'] ?? 0) + 1;
  sons.achat();
  ajouterToast('♻ 3 POISSONS → 1 MIETTES DE BRIOCHE !');
  sauvegarder();
  return true;
}

// ------------------------------------------------------ l'aquarium

const PLUMES_PAR_PALIER = 2; // tous les 4 dons
const PLUMES_COLLECTION = 10;

export function nbDonsAquarium(): number {
  return Object.keys(state.save.aquarium).length;
}

/** Donne un spécimen (LE CONSOMME — c'est la tension du système). */
export function donnerAquarium(id: string, shiny: boolean): boolean {
  const entree = state.save.inventaire.poissons[id];
  if (!entree) return false;
  const dejaExpose = state.save.aquarium[id];
  // un shiny remplace un don normal, jamais l'inverse
  if (dejaExpose && (!shiny || dejaExpose.shiny)) return false;
  if (shiny ? entree.shiny < 1 : entree.n < 1) return false;
  if (shiny) entree.shiny -= 1;
  else entree.n -= 1;
  const nouveau = !dejaExpose;
  state.save.aquarium[id] = { shiny };
  sons.rebirb();
  ajouterToast(
    shiny
      ? `✨ ${espece(id)?.nom} SCINTILLE DANS LE GRAND AQUARIUM !`
      : `🐟 ${espece(id)?.nom} REJOINT LE GRAND AQUARIUM !`
  );
  if (nouveau) {
    const dons = nbDonsAquarium();
    if (dons % 4 === 0) {
      state.save.plumes += PLUMES_PAR_PALIER;
      state.save.cumulPlumes += PLUMES_PAR_PALIER;
      ajouterToast(`🏛 ${dons} ESPÈCES EXPOSÉES : +${PLUMES_PAR_PALIER} PLUMES !`);
    }
    if (dons >= POISSONS.length && !state.save.drapeaux.aquariumComplet) {
      state.save.drapeaux.aquariumComplet = true;
      state.save.plumes += PLUMES_COLLECTION;
      state.save.cumulPlumes += PLUMES_COLLECTION;
      if (!state.save.titres.includes('CONSERVATRICE DE L’AQUARIUM')) {
        state.save.titres.push('CONSERVATRICE DE L’AQUARIUM');
      }
      ajouterToast(`🏆 L'AQUARIUM EST COMPLET ! +${PLUMES_COLLECTION} PLUMES — CONSERVATRICE DE L'AQUARIUM`);
    }
  }
  evaluerSucces();
  sauvegarder();
  return true;
}

// ----------------------------------------- la pâtée (boost de biome)

/** espèce de compagnon → fin du boost (epoch ms) — session seulement */
const boostsPatee: Record<string, number> = {};

export function donnerPatee(especeCompagnon: string): boolean {
  if ((state.save.inventaire.plats['patee'] ?? 0) < 1) return false;
  state.save.inventaire.plats['patee'] -= 1;
  boostsPatee[especeCompagnon] = performance.now() + 10 * 60 * 1000;
  sons.niveau();
  ajouterToast('🥫 MIAM ! RÉCOLTE DU BIOME +30 % PENDANT 10 MIN');
  sauvegarder();
  return true;
}

export function multPatee(especeCompagnon: string): number {
  return (boostsPatee[especeCompagnon] ?? 0) > performance.now() ? 1.3 : 1;
}
