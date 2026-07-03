// Les ARCHIMONSTRES (plan 14 §3) — le « Dofus Ocre » : chaque type a sa
// version rare, nommée, dorée. Les collectionner toutes = récompense
// majeure (la trilogie collection : shiny, Mikudex, bestiaire).
//
// RÈGLE DE MAINTENANCE : tout nouveau type de monstre ajouté à
// data/monstres.ts DOIT recevoir son archimonstre ici.

export const ARCHIMONSTRES: Record<string, string> = {
  glouton: 'GLOUTORAK LE SANS-FOND',
  spectre: 'SPECTRALINE LA FURTIVE',
  golem: 'GOLEMUS L’INÉBRANLABLE',
  epingleur: 'ÉPINGLOR LE PERCE-TOUT',
  cracheur: 'CRACHEDENT LA VÉNÉNEUSE',
  bombix: 'BOMBASTOR L’IMPATIENT',
};

export function nomArchimonstre(typeId: string): string {
  return ARCHIMONSTRES[typeId] ?? `L’ARCHI-${typeId.toUpperCase()}`;
}

/** La collection est complète quand chaque archi a ≥ 1 victoire. */
export function collectionComplete(bestiaire: Record<string, number>): boolean {
  return Object.keys(ARCHIMONSTRES).every((id) => (bestiaire[id] ?? 0) > 0);
}
