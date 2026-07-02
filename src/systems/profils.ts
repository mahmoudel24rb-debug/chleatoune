// Les personnages (profils) : chacun a son nom, son skin et SA propre
// sauvegarde — pour que deux personnes puissent jouer sur la même
// machine, chacune avec sa progression.

import { SKINS, type Skin } from '../data/skins';

export interface Profil {
  id: string;
  nom: string;
  skin: string;
  creeLe: number;
  /** code de synchro cloud (stable, partageable entre appareils) */
  codeSync?: string;
}

const CLE_PROFILS = 'birblike_profils_v1';
const CLE_ACTIF = 'birblike_profil_actif';
const ANCIENNE_CLE_SAUVEGARDE = 'birblike_save_v1';

export function listeProfils(): Profil[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_PROFILS) ?? '[]');
  } catch {
    return [];
  }
}

function sauverProfils(profils: Profil[]): void {
  localStorage.setItem(CLE_PROFILS, JSON.stringify(profils));
}

export function profilActif(): Profil | null {
  const id = localStorage.getItem(CLE_ACTIF);
  return listeProfils().find((p) => p.id === id) ?? null;
}

export function definirActif(id: string): void {
  localStorage.setItem(CLE_ACTIF, id);
}

export function cleSauvegardeActive(): string | null {
  const profil = profilActif();
  return profil ? `birblike_save_${profil.id}` : null;
}

export function skinActif(): Skin {
  const profil = profilActif();
  return SKINS.find((s) => s.id === profil?.skin) ?? SKINS[0];
}

export function creerProfil(nom: string, skinId: string, codeSync?: string): Profil {
  const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const profil: Profil = {
    id,
    nom: nom.trim().toUpperCase().slice(0, 16) || 'SANS NOM',
    skin: SKINS.some((s) => s.id === skinId) ? skinId : SKINS[0].id,
    creeLe: Date.now(),
    codeSync: codeSync ?? `CHLEA-${id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}`,
  };
  sauverProfils([...listeProfils(), profil]);
  return profil;
}

export function supprimerProfil(id: string): void {
  sauverProfils(listeProfils().filter((p) => p.id !== id));
  localStorage.removeItem(`birblike_save_${id}`);
  if (localStorage.getItem(CLE_ACTIF) === id) localStorage.removeItem(CLE_ACTIF);
}

/** Niveau/rebirbs d'un profil, pour l'écran de sélection. */
export function resumeProfil(id: string): string {
  try {
    const brut = localStorage.getItem(`birblike_save_${id}`);
    if (!brut) return 'NOUVELLE PARTIE';
    const save = JSON.parse(brut);
    return `NIV. ${save.heros?.niveau ?? 1} — ${save.rebirbs ?? 0} REBIRB${(save.rebirbs ?? 0) > 1 ? 'S' : ''}`;
  } catch {
    return '';
  }
}

/** Migration : l'ancienne sauvegarde unique devient le premier personnage. */
export function migrerVersProfils(): void {
  const ancienne = localStorage.getItem(ANCIENNE_CLE_SAUVEGARDE);
  if (!ancienne || listeProfils().length > 0) return;
  const profil = creerProfil('CHLÉATOUNE', SKINS[0].id);
  localStorage.setItem(`birblike_save_${profil.id}`, ancienne);
  localStorage.removeItem(ANCIENNE_CLE_SAUVEGARDE);
  definirActif(profil.id);
}
