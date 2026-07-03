// Le Calendrier de l'Atelier (plan 16 §5) — l'Almanax, version cadeau :
// ZÉRO FOMO. La série est purement cosmétique ; la casser ne retire
// RIEN, ne réduit RIEN, et le jeu ne le fait jamais remarquer.
// Le bonus tourne sur le JOUR DE LA SEMAINE (heure locale), jamais
// écrit dans la save — consulté à la volée aux endroits concernés.

import type { MonnaieId } from './config';

export interface BonusJour {
  jour: number; // getDay() : 0 = dimanche
  nom: string;
  description: string;
  effet:
    | 'brindilles' // gains de brindilles +50 %
    | 'morsure' // morsure de pêche ×0,8
    | 'xpEnvers' // XP du donjon +25 %
    | 'doreDesert' // +1 doré par ramassage au désert
    | 'vitesse' // vitesse +10 %
    | 'coffres' // butin des coffres +25 %
    | 'metier'; // gains hors-ligne ×1,5
}

export const BONUS_JOURS: BonusJour[] = [
  { jour: 1, nom: 'LUNDI DU BOIS', description: 'Brindilles +50 %', effet: 'brindilles' },
  { jour: 2, nom: 'MARDI DU BOUCHON', description: 'Morsure de pêche plus rapide', effet: 'morsure' },
  { jour: 3, nom: 'MERCREDI DE L’ENVERS', description: 'XP des donjons +25 %', effet: 'xpEnvers' },
  { jour: 4, nom: 'JEUDI DORÉ', description: '+1 doré par ramassage au désert', effet: 'doreDesert' },
  { jour: 5, nom: 'VENDREDI DES SEMELLES', description: 'Vitesse +10 %', effet: 'vitesse' },
  { jour: 6, nom: 'SAMEDI DES COFFRES', description: 'Butin des coffres +25 %', effet: 'coffres' },
  { jour: 0, nom: 'DIMANCHE DU MÉTIER', description: 'Le Métier tisse ×1,5 (hors-ligne)', effet: 'metier' },
];

/** L'offrande du jour : une petite somme dans une monnaie tournante. */
export interface OffrandeDef {
  monnaie: MonnaieId | 'dore';
  quantite: number;
}

export const OFFRANDES: OffrandeDef[] = [
  { monnaie: 'popcorn', quantite: 200 },
  { monnaie: 'brindille', quantite: 20 },
  { monnaie: 'dore', quantite: 5 },
];

export const RECOMPENSE_OFFRANDE = 40; // en dorés
