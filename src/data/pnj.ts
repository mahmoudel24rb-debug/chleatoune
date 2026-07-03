// Les PNJ du Fil Rouge (plan 15 §3). Zéro asset neuf : chaque PNJ
// réutilise un sprite existant (compagnons GLB, doughcat, Yuumi).
// Marqueur au-dessus de la tête : `!` doré = étape du Fil Rouge
// disponible ; `…` gris = ambiance seulement.

export interface PnjDef {
  id: string;
  nom: string;
  zone: number;
  x: number;
  y: number;
  /** sprite : 'doughcat' | 'yuumi' | préfixe GLB (c_scene, c_mine…) */
  spriteId: string;
  /** id de dialogue d'ambiance (hors-quête) */
  ambiance: string;
  couleur: string;
}

export const PNJS: PnjDef[] = [
  { id: 'brioche', nom: 'GRAND-MÈRE BRIOCHE', zone: 0, x: 700, y: 1100, spriteId: 'doughcat', ambiance: 'ambiance_brioche', couleur: '#e8c58a' },
  { id: 'regisseuse', nom: 'LA RÉGISSEUSE', zone: 1, x: 900, y: 700, spriteId: 'c_scene', ambiance: 'ambiance_regisseuse', couleur: '#39c5bb' },
  { id: 'yuumi', nom: 'YUUMI', zone: 2, x: 1050, y: 640, spriteId: 'yuumi', ambiance: 'ambiance_yuumi', couleur: '#b48ae0' },
  { id: 'vieuxpic', nom: 'LE VIEUX PIC', zone: 3, x: 700, y: 900, spriteId: 'c_mine', ambiance: 'ambiance_vieuxpic', couleur: '#9db2c9' },
];

/** Noms/couleurs des voix qui n'ont pas de PnjDef (dialogues spéciaux). */
export const VOIX: Record<string, { nom: string; couleur: string }> = {
  chleatoune: { nom: 'CHLÉATOUNE', couleur: '#ff8ac2' },
  narrateur: { nom: '', couleur: '#c8ccd4' },
  mercier: { nom: 'LE MERCIER', couleur: '#f2d16b' },
  sphinge: { nom: 'LA SPHINGE DES SABLES', couleur: '#d9b95c' },
  effilocheuse: { nom: 'LA GRANDE EFFILOCHEUSE', couleur: '#b48ae0' },
  brioche: { nom: 'GRAND-MÈRE BRIOCHE', couleur: '#e8c58a' },
  regisseuse: { nom: 'LA RÉGISSEUSE', couleur: '#39c5bb' },
  yuumi: { nom: 'YUUMI', couleur: '#b48ae0' },
  vieuxpic: { nom: 'LE VIEUX PIC', couleur: '#9db2c9' },
};

export function pnjParId(id: string): PnjDef | undefined {
  return PNJS.find((p) => p.id === id);
}
