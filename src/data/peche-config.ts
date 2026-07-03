// TOUTES les constantes du minijeu de pêche v3 (plan 17) — la fenêtre
// de ferrage, les mordillages, la lutte… jamais en dur dans le système.

export const PECHE = {
  // ---- les ombres (§1)
  ombresMax: 4,
  spawnMin: 4, // nouvelle ombre toutes les 4-9 s
  spawnMax: 9,
  vieMin: 20, // une ombre ignorée repart après 20-40 s
  vieMax: 40,
  rayonAttraction: 140, // px ; ×1,4 avec un appât équipé
  multAttractionAppat: 1.4,
  /** demi-largeur de l'ellipse d'ombre, par gabarit */
  taillesOmbre: { S: 10, M: 16, L: 24, XL: 34, AILERON: 18 } as Record<string, number>,

  // ---- le lancer chargé (§2)
  chargeSec: 1, // jauge 0→100 en 1 s, aller-retour
  profMin: 40, // px depuis le ponton
  profMax: 260,
  bandes: { bord: [0, 90], milieu: [90, 180], large: [180, 260] } as Record<string, [number, number]>,
  rayonBanc: 60, // rareté ×1,5 sous les oiseaux
  multBanc: 1.5,

  // ---- touches & plongeon (§3)
  fenetreFerrage: 0.75, // LA fenêtre, en secondes
  mordilleSec: 0.5, // durée d'un tressautement
  entreMordilles: [0.6, 1.6] as [number, number],

  // ---- la lutte (§4) : un seul bouton, 3 à 6 secondes
  lutte: {
    vitesseCapture: 26, // %/s quand on MAINTIENT
    vitesseTension: 18, // %/s quand on maintient…
    detenteTension: 30, // …et ça redescend quand on relâche
    multTremblement: 3, // la tension monte ×3 pendant un tremblement
    dureeTremblement: [0.5, 1.1] as [number, number],
    /** tolérance de tension par canne (branche/bambou/turquoise/royale) */
    toleranceCannes: [1, 1.15, 1.35, 1.6],
    multShiny: 1.35, // jauge plus nerveuse contre un shiny
  },
};

/** Nombre de mordillages avant le plongeon (épiques+ : plus de fausses
 *  touches en moyenne — c'est ça qui crée la tension). */
export function tirerMordillages(rarete: string): number {
  const base = rarete === 'epique' || rarete === 'legendaire' ? 2 : 1;
  return base + Math.floor(Math.random() * 2); // 1-2 ou 2-3
}
