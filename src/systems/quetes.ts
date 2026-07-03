// Les quêtes du marchand du désert : 3 quêtes actives tirées des
// modèles, la progression est suivie via progresserQuete() appelé par
// l'économie, le combat et la pêche.

import { MODELES_QUETES, type TypeQuete } from '../data/desert';
import { state } from '../core/state';

function creerQuete(type: TypeQuete) {
  const modele = MODELES_QUETES.find((m) => m.type === type)!;
  const t = state.save.quetes.terminees;
  return {
    type,
    objectif: modele.objectif(t),
    progres: 0,
    recompense: modele.recompense(t),
  };
}

/** Garantit 3 quêtes actives (appelé au chargement et après validation). */
export function garantirQuetes(): void {
  const actives = state.save.quetes.actives;
  const typesActifs = new Set(actives.map((q) => q.type));
  for (const modele of MODELES_QUETES) {
    if (actives.length >= 3) break;
    if (!typesActifs.has(modele.type)) {
      actives.push(creerQuete(modele.type));
      typesActifs.add(modele.type);
    }
  }
}

export function progresserQuete(type: TypeQuete, montant: number): void {
  for (const q of state.save.quetes.actives) {
    if (q.type === type) q.progres = Math.min(q.objectif, q.progres + montant);
  }
}

/** Un donjon (une porte de l'Antre) vient d'être terminé. */
export function signalerDonjonTermine(): void {
  progresserQuete('donjon', 1);
}

export function queteTexte(q: { type: TypeQuete; objectif: number }): string {
  return MODELES_QUETES.find((m) => m.type === q.type)!.texte(q.objectif);
}

/** Valide la quête d'index donné, retourne la récompense en dorés (0 si pas prête). */
export function validerQuete(index: number): number {
  const q = state.save.quetes.actives[index];
  if (!q || q.progres < q.objectif) return 0;
  state.save.quetes.actives.splice(index, 1);
  state.save.quetes.terminees += 1;
  garantirQuetes();
  return q.recompense;
}
