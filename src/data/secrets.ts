// Les 15 fils secrets (plan 16 §3) — « les fils qui dépassent » : 3 par
// zone (hors Envers), positions FIXES dans des recoins. Pas de marqueur,
// pas d'indice UI : c'est un secret. Visibles seulement de près (~180 px),
// tirés UNE fois par profil. 5 fils contiennent une plume.

export interface SecretDef {
  id: string;
  zone: number;
  x: number;
  y: number;
  recompense: { dores?: number; plume?: boolean; appat?: { id: string; n: number } };
}

export const SECRETS: SecretDef[] = [
  // PRAIRIE (zone 0)
  { id: 'fil_prairie_1', zone: 0, x: 80, y: 90, recompense: { dores: 30 } },
  { id: 'fil_prairie_2', zone: 0, x: 2320, y: 1520, recompense: { plume: true } },
  { id: 'fil_prairie_3', zone: 0, x: 90, y: 1500, recompense: { appat: { id: 'miettes', n: 5 } } },
  // SCÈNE (zone 1)
  { id: 'fil_scene_1', zone: 1, x: 2320, y: 100, recompense: { dores: 45 } },
  { id: 'fil_scene_2', zone: 1, x: 70, y: 800, recompense: { plume: true } },
  { id: 'fil_scene_3', zone: 1, x: 1200, y: 1540, recompense: { dores: 60 } },
  // FORÊT (zone 2)
  { id: 'fil_foret_1', zone: 2, x: 120, y: 120, recompense: { dores: 60 } },
  { id: 'fil_foret_2', zone: 2, x: 2300, y: 700, recompense: { appat: { id: 'paillettes', n: 4 } } },
  { id: 'fil_foret_3', zone: 2, x: 1900, y: 1520, recompense: { plume: true } },
  // MINE (zone 3)
  { id: 'fil_mine_1', zone: 3, x: 2330, y: 1500, recompense: { dores: 90 } },
  { id: 'fil_mine_2', zone: 3, x: 100, y: 400, recompense: { plume: true } },
  { id: 'fil_mine_3', zone: 3, x: 1250, y: 80, recompense: { dores: 75 } },
  // DÉSERT DORÉ (zone 4)
  { id: 'fil_desert_1', zone: 4, x: 90, y: 1520, recompense: { dores: 120 } },
  { id: 'fil_desert_2', zone: 4, x: 2330, y: 300, recompense: { plume: true } },
  { id: 'fil_desert_3', zone: 4, x: 1180, y: 1550, recompense: { dores: 100 } },
];
