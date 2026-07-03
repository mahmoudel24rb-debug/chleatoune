// Les 40 succès (plan 16 §1) + les titres de rang (§2). Conditions
// évaluées sur ÉVÉNEMENT (jamais par frame) + un balayage au chargement
// pour rattraper une sauvegarde avancée. Elles ne lisent QUE la save.
// Les succès `cache` restent masqués tant que non débloqués (spoilers).

import type { SaveData } from '../core/state';
import { ARBRE_DESERT } from './desert';
import { POISSONS } from './poissons';
import { ARCHIMONSTRES } from './archimonstres';
import { COMPAGNONS_BIOMES, UNITES_MAX } from './compagnons-biomes';
import { PARCHEMINS } from './parchemins';
import { SORTS } from './sorts';
import { autoDebloque } from './progression';

export type CategorieSucces = 'monde' | 'envers' | 'peche' | 'collection' | 'histoire';

export interface SuccesDef {
  id: string;
  nom: string;
  description: string;
  categorie: CategorieSucces;
  /** boolean = tout ou rien · number = progression 0..1 (barre) */
  condition: (s: SaveData) => boolean | number;
  recompense?: { plumes?: number; dores?: number; titre?: string };
  cache?: boolean;
}

const nbDex = (s: SaveData) => Object.values(s.peche.dex).filter((d) => d.captures > 0).length;
const nbShiny = (s: SaveData) => Object.values(s.peche.dex).reduce((n, d) => n + d.shiny, 0);

export const SUCCES: SuccesDef[] = [
  // ------------------------------------------------- MONDE (10)
  { id: 'perle', nom: 'PREMIÈRE PERLE', description: 'Ramasse ton premier smiski.', categorie: 'monde', condition: (s) => s.cumulsGlobaux.popcorn >= 1 },
  { id: 'ramasseuse', nom: 'RAMASSEUSE', description: '10 000 smiski cumulés.', categorie: 'monde', condition: (s) => Math.min(1, s.cumulsGlobaux.popcorn / 10000), recompense: { dores: 5 } },
  { id: 'mer_perles', nom: 'MER DE PERLES', description: '1 000 000 de smiski cumulés.', categorie: 'monde', condition: (s) => Math.min(1, s.cumulsGlobaux.popcorn / 1e6), recompense: { plumes: 2 } },
  { id: 'recouture1', nom: 'PREMIÈRE RECOUTURE', description: 'Recoudre le fil de ton aventure.', categorie: 'monde', condition: (s) => s.rebirbs >= 1 },
  { id: 'recouturiere', nom: 'RECOUTURIÈRE', description: '5 recoutures.', categorie: 'monde', condition: (s) => Math.min(1, s.rebirbs / 5), recompense: { titre: 'RECOUTURIÈRE' } },
  { id: 'panneaux_desert', nom: 'TOUS LES PANNEAUX DU DÉSERT', description: 'Toutes les améliorations du désert doré.', categorie: 'monde', condition: (s) => Math.min(1, ARBRE_DESERT.filter((n) => s.desert[n.id]).length / ARBRE_DESERT.length) },
  { id: 'metier1', nom: 'LE MÉTIER ÉVEILLÉ', description: 'Premier palier de l’arbre géant.', categorie: 'monde', condition: (s) => s.nid >= 1 },
  { id: 'metier5', nom: 'MÉTIER AU MAXIMUM', description: 'L’arbre géant au dernier palier.', categorie: 'monde', condition: (s) => Math.min(1, s.nid / 5), recompense: { plumes: 3 } },
  { id: 'saisons', nom: 'QUATRE SAISONS', description: 'Récolter dans les 4 biomes.', categorie: 'monde', condition: (s) => Math.min(1, (['popcorn', 'graine', 'brindille', 'minerai'] as const).filter((m) => s.cumulsGlobaux[m] > 0).length / 4) },
  { id: 'mains_pleines', nom: 'MAINS PLEINES', description: 'Débloquer le ramassage automatique.', categorie: 'monde', condition: (s) => autoDebloque(s.rebirbs) },

  // ------------------------------------------------- L'ENVERS (10)
  { id: 'accroc1', nom: 'PREMIER ACCROC', description: 'Terminer la porte 1.', categorie: 'envers', condition: (s) => (s.swarm.termines[1] ?? 0) >= 1 },
  { id: 'maille12', nom: 'LA DOUZIÈME MAILLE', description: 'Terminer la porte 12.', categorie: 'envers', condition: (s) => (s.swarm.termines[12] ?? 0) >= 1, recompense: { titre: 'LA DOUZIÈME MAILLE' } },
  { id: 'sans_egratignure', nom: 'SANS UNE ÉGRATIGNURE', description: 'Finir une porte sans subir de dégât.', categorie: 'envers', condition: (s) => s.drapeaux.porteSansDegat === true, recompense: { plumes: 3 } },
  { id: 'escouade3', nom: 'ESCOUADE AU COMPLET', description: '3 copies de combat dans l’escouade.', categorie: 'envers', condition: (s) => s.swarm.escouade.length >= 3 },
  { id: 'tisseuse', nom: 'TISSEUSE DE SORTS', description: 'Débloquer les 6 sorts du Mercier.', categorie: 'envers', condition: (s) => Math.min(1, SORTS.filter((d) => (s.sorts[d.id] ?? 0) >= 1).length / 6) },
  { id: 'haute_couture', nom: 'HAUTE COUTURE', description: 'Première évolution de sort.', categorie: 'envers', condition: (s) => Object.values(s.evolutions).some(Boolean) },
  { id: 'garde_robe', nom: 'GARDE-ROBE COMPLÈTE', description: 'Les 6 évolutions cousues.', categorie: 'envers', condition: (s) => Math.min(1, SORTS.filter((d) => s.evolutions[d.id]).length / 6), recompense: { titre: 'GARDE-ROBE COMPLÈTE' } },
  { id: 'dechirure10', nom: 'ARPENTEUSE DE LA DÉCHIRURE', description: 'Vague 10 de la porte sans fin.', categorie: 'envers', condition: (s) => Math.min(1, s.swarm.sansFinRecord / 10) },
  { id: 'dechirure25', nom: 'AU FOND DE LA DÉCHIRURE', description: 'Vague 25 de la porte sans fin.', categorie: 'envers', condition: (s) => Math.min(1, s.swarm.sansFinRecord / 25), recompense: { plumes: 5 } },
  { id: 'maudite', nom: 'MAUDITE ET FIÈRE', description: 'Finir une porte à 100 de score de malédictions.', categorie: 'envers', cache: true, condition: (s) => s.drapeaux.mauditeScore100 === true },

  // ------------------------------------------------- PÊCHE (8)
  { id: 'prise1', nom: 'PREMIÈRE PRISE', description: 'Attraper un poisson.', categorie: 'peche', condition: (s) => nbDex(s) >= 1 },
  { id: 'dex8', nom: 'MIKUDEX 8/16', description: 'La moitié du Mikudex.', categorie: 'peche', condition: (s) => Math.min(1, nbDex(s) / 8) },
  { id: 'dex16', nom: 'MIKUDEX COMPLET', description: 'Les 16 espèces attrapées.', categorie: 'peche', condition: (s) => Math.min(1, nbDex(s) / POISSONS.length), recompense: { titre: 'MAÎTRESSE DU MIKUDEX' } },
  { id: 'shiny1', nom: 'ÇA BRILLE !', description: 'Attraper un shiny.', categorie: 'peche', condition: (s) => nbShiny(s) >= 1 },
  { id: 'shiny5', nom: 'COLLECTION SCINTILLANTE', description: '5 shiny au total.', categorie: 'peche', condition: (s) => Math.min(1, nbShiny(s) / 5), recompense: { plumes: 3 } },
  { id: 'legende', nom: 'LA LÉGENDE DORÉE', description: 'ELLE existe. Tu l’as vue.', categorie: 'peche', condition: (s) => (s.peche.dex['miku']?.captures ?? 0) >= 1 },
  { id: 'canne_royale', nom: 'PATIENCE DORÉE', description: 'Acheter la canne royale.', categorie: 'peche', condition: (s) => s.peche.canne >= 3 },
  { id: 'flotte', nom: 'FLOTTE DE PONTONS', description: 'Les 3 pêcheurs automatiques.', categorie: 'peche', condition: (s) => Math.min(1, s.peche.pecheurs / 3) },

  // ------------------------------------------------- COLLECTION (6)
  { id: 'adoption1', nom: 'PREMIÈRE ADOPTION', description: 'Adopter un compagnon de biome.', categorie: 'collection', condition: (s) => Object.values(s.compagnons).some((u) => u >= 1) },
  { id: 'refuge', nom: 'REFUGE COMPLET', description: 'Une espèce à 4/4.', categorie: 'collection', condition: (s) => Object.values(s.compagnons).some((u) => u >= UNITES_MAX) },
  { id: 'arche', nom: 'ARCHE DE CHLÉA', description: 'Toutes les espèces à 4/4.', categorie: 'collection', condition: (s) => Math.min(1, COMPAGNONS_BIOMES.filter((c) => (s.compagnons[c.id] ?? 0) >= UNITES_MAX).length / COMPAGNONS_BIOMES.length), recompense: { titre: 'ARCHE DE CHLÉA' } },
  { id: 'archi1', nom: 'PREMIER ARCHIMONSTRE', description: 'Vaincre un archimonstre.', categorie: 'collection', cache: true, condition: (s) => Object.values(s.bestiaire).some((n) => n > 0) },
  { id: 'collectionneuse', nom: 'LA GRANDE COLLECTIONNEUSE', description: 'Le bestiaire des archimonstres au complet.', categorie: 'collection', cache: true, condition: (s) => Math.min(1, Object.keys(ARCHIMONSTRES).filter((id) => (s.bestiaire[id] ?? 0) > 0).length / Object.keys(ARCHIMONSTRES).length), recompense: { plumes: 10, titre: 'GRANDE COLLECTIONNEUSE' } },
  { id: 'trousse', nom: 'TROUSSE PLEINE', description: 'Les 8 parchemins du Mercier au niveau 1+.', categorie: 'collection', condition: (s) => Math.min(1, PARCHEMINS.filter((p) => (s.parchemins[p.id] ?? 0) >= 1).length / PARCHEMINS.length) },

  // ------------------------------------------------- HISTOIRE (6, cachés)
  { id: 'ch1', nom: 'LA PREMIÈRE MAILLE', description: 'Chapitre 1 du Fil Rouge.', categorie: 'histoire', cache: true, condition: (s) => s.filRouge.chapitre > 1 },
  { id: 'ch4', nom: 'LE FIL RENOUÉ', description: 'Chapitre 4 du Fil Rouge.', categorie: 'histoire', cache: true, condition: (s) => s.filRouge.chapitre > 4 },
  { id: 'ch6', nom: 'FACE À L’EFFILOCHEUSE', description: 'Chapitre 6 du Fil Rouge.', categorie: 'histoire', cache: true, condition: (s) => s.filRouge.chapitre > 6 },
  { id: 'ch7', nom: 'LA DERNIÈRE MAILLE', description: 'Ouvrir l’Atelier.', categorie: 'histoire', cache: true, condition: (s) => s.filRouge.chapitre > 7 },
  { id: 'fils15', nom: 'TOUS LES FILS TIRÉS', description: 'Les 15 fils secrets.', categorie: 'histoire', cache: true, condition: (s) => Math.min(1, s.secrets.length / 15), recompense: { titre: 'TOUS LES FILS TIRÉS' } },
  { id: 'cartographe', nom: 'CARTOGRAPHE DES SABLES', description: '5 chasses au trésor.', categorie: 'histoire', cache: true, condition: (s) => Math.min(1, s.chassesFaites / 5) },
];

/** Titres de rang, liés au % global de succès (plan 16 §2). */
export const TITRES_RANG: { seuil: number; titre: string }[] = [
  { seuil: 0, titre: 'APPRENTIE' },
  { seuil: 0.25, titre: 'PETITE MAIN' },
  { seuil: 0.5, titre: 'SECONDE D’ATELIER' },
  { seuil: 0.75, titre: 'PREMIÈRE D’ATELIER' },
  { seuil: 1, titre: 'GRANDE COUTURIÈRE' },
];

export const CATEGORIES_SUCCES: { id: CategorieSucces; nom: string }[] = [
  { id: 'monde', nom: 'MONDE' },
  { id: 'envers', nom: 'L’ENVERS' },
  { id: 'peche', nom: 'PÊCHE' },
  { id: 'collection', nom: 'COLLECTION' },
  { id: 'histoire', nom: 'HISTOIRE' },
];
