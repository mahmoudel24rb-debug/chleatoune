// L'ANTRE (plan 09 §3) : le hub aux 13 portes, entre le hall du donjon
// et les combats à vagues. On s'y déplace librement, aucun monstre.
// Les portes se débloquent en séquence (swarm.porteMax).

import { BIOMES_EXPEDITION, CONFIG, INDEX_DONJON } from '../data/config';
import { PORTES, type PorteDef } from '../data/portes';
import { jeu } from '../core/mode';
import { state } from '../core/state';
import { birb } from '../entities/birb';
import { spritePorte, SPRITE_TAPIS, SPRITE_MARCHAND, SPRITE_TROPHEE } from '../core/structures';
import { spriteMercier } from '../core/sprites';
import { enregistrer, type Interactif } from './interactions';
import { ajouterToast } from '../ui/toasts';
import { ouvrirConfirmationPorte, ouvrirMercier } from '../ui/overlays';
import { entrerDonjon, essayerSortirDonjon } from './donjon';
import { sauvegarder } from './save';

const CLE_SCENE = 'chleatoune_scene'; // sessionStorage : recharger en plein
// donjon ramène proprement dans l'Antre (critère du plan 09)

export function porteDebloquee(p: PorteDef): boolean {
  if (p.sansFin) return state.save.swarm.porteMax > 12;
  return p.niveau <= state.save.swarm.porteMax;
}

export function entrerAntre(): void {
  jeu.mode = 'antre';
  birb.x = CONFIG.monde.largeur / 2;
  birb.y = CONFIG.monde.hauteur - 180;
  sessionStorage.setItem(CLE_SCENE, 'antre');
  // le sort offert (plan 11, pièges) : personne n'arrive porte 1 sans rien
  if ((state.save.sorts.ciseaux ?? 0) < 1) {
    state.save.sorts.ciseaux = 1;
    ajouterToast('🧵 LE MERCIER T’OFFRE TES PREMIERS CISEAUX VOLANTS !');
    sauvegarder();
  }
}

export function sortirAntre(): void {
  jeu.mode = 'monde';
  state.save.zone = INDEX_DONJON; // retour au hall
  birb.x = CONFIG.monde.largeur / 2;
  birb.y = CONFIG.monde.hauteur / 2 + 120;
  sessionStorage.removeItem(CLE_SCENE);
}

/** Au boot : si on a rechargé en pleine Antre/donjon, on y retourne. */
export function restaurerScene(): void {
  if (sessionStorage.getItem(CLE_SCENE) === 'antre') entrerAntre();
}

function etatPorte(p: PorteDef): 'ouverte' | 'verrouillee' | 'doree' {
  if (!porteDebloquee(p)) return 'verrouillee';
  return p.sansFin ? 'doree' : 'ouverte';
}

export function amenagerAntre(): void {
  const interactifs: Interactif[] = PORTES.map((p) => ({
    id: `porte-${p.niveau}`,
    x: p.x,
    y: p.y,
    rayon: 95,
    sprite: () => spritePorte(etatPorte(p), BIOMES_EXPEDITION[p.biome].fond),
    etiquette: () => {
      if (!porteDebloquee(p)) return `PORTE ${p.niveau} — ?`;
      const fois = state.save.swarm.termines[p.niveau] ?? 0;
      const record = p.sansFin && state.save.swarm.sansFinRecord > 0
        ? ` · RECORD V.${state.save.swarm.sansFinRecord}`
        : '';
      return `${p.sansFin ? '∞' : `PORTE ${p.niveau}`} — ${p.nom}${fois > 0 ? ` ✔×${fois}` : ''}${record}`;
    },
    pulse: () => porteDebloquee(p) && !p.sansFin && p.niveau === state.save.swarm.porteMax,
    texte: () =>
      porteDebloquee(p)
        ? `${p.nom} (${BIOMES_EXPEDITION[p.biome].nom})\n${p.sansFin ? 'Vagues infinies. Jusqu’où ?' : `${p.nbVagues} vagues, boss : ${p.nomBoss}`}`
        : 'TERMINE LA PORTE PRÉCÉDENTE POUR OUVRIR CELLE-CI',
    action: () => {
      if (!porteDebloquee(p)) {
        ajouterToast('TERMINE LA PORTE PRÉCÉDENTE POUR OUVRIR CELLE-CI');
        return;
      }
      ouvrirConfirmationPorte(p, () => entrerDonjon(p));
    },
  }));

  // LE MERCIER (plan 11) : près de l'entrée, impossible à rater
  interactifs.push({
    id: 'mercier',
    x: CONFIG.monde.largeur / 2 - 280,
    y: CONFIG.monde.hauteur - 160,
    rayon: 95,
    sprite: () => spriteMercier() ?? SPRITE_MARCHAND,
    etiquette: () => '🧵 LE MERCIER',
    texte: () => 'LE MERCIER [M]\nParchemins de stats et sortilèges cousus.',
    action: ouvrirMercier,
  });

  // le trophée du bestiaire complet (plan 14 §3), au mur de l'Antre
  interactifs.push({
    id: 'trophee-bestiaire',
    x: CONFIG.monde.largeur / 2 + 280,
    y: CONFIG.monde.hauteur - 160,
    rayon: 80,
    visible: () => state.save.bestiaireComplet === true,
    sprite: () => SPRITE_TROPHEE,
    etiquette: () => '🏆 LA GRANDE COLLECTIONNEUSE',
    texte: () => 'Le trophée du Bestiaire complet.\nTous les archimonstres sont tombés.',
    action: () => ajouterToast('👑 ILS AVAIENT DES NOMS. ELLE LES A TOUS RETENUS.'),
  });

  interactifs.push({
    id: 'sortie-antre',
    x: CONFIG.monde.largeur / 2,
    y: CONFIG.monde.hauteur - 90,
    rayon: 90,
    sprite: () => SPRITE_TAPIS,
    etiquette: () => 'RETOUR AU HALL',
    texte: () => 'RETOURNER AU HALL DU DONJON',
    action: sortirAntre,
  });

  enregistrer('antre', interactifs);

  // Le tapis de sortie DU DONJON : utilisable seulement entre deux
  // vagues (essayerSortirDonjon fait la police).
  enregistrer('donjon', [
    {
      id: 'sortie-donjon',
      x: CONFIG.monde.largeur / 2,
      y: CONFIG.monde.hauteur / 2 + 130,
      rayon: 80,
      sprite: () => SPRITE_TAPIS,
      etiquette: () => 'SORTIE (ENTRE DEUX VAGUES)',
      texte: () => "QUITTER LE DONJON\n(seulement pendant une pause)",
      action: () => essayerSortirDonjon(),
    },
  ]);
}
