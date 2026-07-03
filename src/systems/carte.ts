// L'aménagement des cartes : où sont posés le portail, l'autel, la
// porte du château, les panneaux de talents, l'arbre du désert, le
// marchand, l'arbre géant et le ponton — et ce qu'ils font.

import { INDEX_DESERT, INDEX_DONJON, INDEX_FORET, THEME } from '../data/config';
import { TALENTS } from '../data/talents';
import { ARBRE_DESERT } from '../data/desert';
import { COMPAGNONS_BIOMES, UNITES_MAX } from '../data/compagnons-biomes';
import { recalculerStats, state } from '../core/state';
import { formatNombre } from '../core/utils';
import {
  SPRITE_ARBRE_GEANT,
  SPRITE_AUTEL,
  SPRITE_MARCHAND,
  SPRITE_PONTON,
  SPRITE_PORTAIL,
  SPRITE_PORTE,
  SPRITES_PANNEAUX,
} from '../core/structures';
import { enregistrer } from './interactions';
import { amenagerAntre, entrerAntre } from './antre';
import { entrerPeche } from './peche';
import { coutProchainPalier, NID_MAX, nourrirNid } from './nid';
import { sauvegarder } from './save';
import { sons } from './audio';
import { ouvrirAdoption, ouvrirAutel, ouvrirChateau, ouvrirMarchand } from '../ui/overlays';
import { ajouterToast } from '../ui/toasts';

// Position du panneau d'adoption de chaque biome (plan 13 §3)
const POSITIONS_ADOPTION: Record<string, { x: number; y: number }> = {
  prairie: { x: 1980, y: 1150 },
  scene: { x: 1200, y: 420 },
  foret: { x: 520, y: 1180 },
  mine: { x: 1200, y: 420 },
  desert: { x: 2000, y: 640 },
};

function panneauEtat(possede: boolean, abordable: boolean): HTMLCanvasElement {
  if (possede) return SPRITES_PANNEAUX.possede;
  return abordable ? SPRITES_PANNEAUX.disponible : SPRITES_PANNEAUX.verrouille;
}

export function amenagerCartes(): void {
  // ---------------------------------------------- hall du donjon
  enregistrer(`zone-${INDEX_DONJON}`, [
    {
      id: 'portail',
      x: 1200,
      y: 620,
      rayon: 90,
      sprite: () => SPRITE_PORTAIL,
      texte: () =>
        `ENTRER DANS L'ANTRE\n${state.save.swarm.porteMax > 12 ? 'Les 12 portes sont ouvertes… et le Fil Sans Fin.' : `Portes ouvertes : ${Math.min(state.save.swarm.porteMax, 12)}/12`}`,
      action: entrerAntre,
    },
    {
      id: 'autel',
      x: 480,
      y: 900,
      rayon: 80,
      sprite: () => SPRITE_AUTEL,
      texte: () => `AUTEL DE SACRIFICE — PALIER ${state.save.sacrifices}`,
      action: ouvrirAutel,
    },
    {
      id: 'chateau',
      x: 1920,
      y: 880,
      rayon: 80,
      sprite: () => SPRITE_PORTE,
      texte: () => 'LA PORTE DU CHÂTEAU…',
      action: ouvrirChateau,
    },
  ]);

  // ---------------------------------------------- l'Antre (13 portes)
  amenagerAntre();

  // ---------------------------------------------- prairie : talents + ponton
  const talentsInteractifs = TALENTS.map((t, i) => {
    const x = 480 + (i % 4) * 300;
    const y = 260 + Math.floor(i / 4) * 190;
    return {
      id: t.id,
      x,
      y,
      rayon: 90,
      sprite: () => panneauEtat(state.save.talents[t.id] === true, state.save.plumes >= t.cout),
      texte: () =>
        state.save.talents[t.id]
          ? `${t.nom} — POSSÉDÉ ✔\n${t.desc}`
          : `${t.nom} — ${t.cout} ${THEME.prestige.nom}\n${t.desc}`,
      action: () => {
        if (state.save.talents[t.id]) {
          ajouterToast('DÉJÀ POSSÉDÉ !');
          return;
        }
        if (state.save.plumes < t.cout) {
          sons.refus();
          ajouterToast(`IL TE FAUT ${t.cout} ${THEME.prestige.nom} (RECOUTURE, COFFRES, PÊCHE…)`);
          return;
        }
        state.save.plumes -= t.cout;
        state.save.talents[t.id] = true;
        recalculerStats();
        sons.rebirb();
        ajouterToast(`TALENT APPRIS : ${t.nom} ✨`);
        sauvegarder();
      },
    };
  });

  enregistrer('zone-0', [
    ...talentsInteractifs,
    {
      id: 'ponton',
      x: 1200,
      y: 1520,
      rayon: 90,
      sprite: () => SPRITE_PONTON,
      texte: () => `LE PONTON — PÊCHER (NIV. ${state.save.peche.niveau})`,
      action: entrerPeche,
    },
  ]);

  // ---------------------------------------------- désert : arbre + marchand
  const desertInteractifs = ARBRE_DESERT.map((n, i) => ({
    id: n.id,
    x: 420 + i * 320,
    y: 340,
    rayon: 90,
    sprite: () => panneauEtat(state.save.desert[n.id] === true, state.save.soldeDore >= n.cout),
    texte: () =>
      state.save.desert[n.id]
        ? `${n.nom} — POSSÉDÉ ✔\n${n.desc}`
        : `${n.nom} — ${n.cout} ${THEME.dore.pluriel}\n${n.desc}`,
    action: () => {
      if (state.save.desert[n.id]) {
        ajouterToast('DÉJÀ POSSÉDÉ !');
        return;
      }
      if (state.save.soldeDore < n.cout) {
        sons.refus();
        ajouterToast(`IL TE FAUT ${n.cout} ${THEME.dore.pluriel} !`);
        return;
      }
      state.save.soldeDore -= n.cout;
      state.save.desert[n.id] = true;
      recalculerStats();
      sons.rebirb();
      ajouterToast(`AMÉLIORATION DU DÉSERT : ${n.nom} ✦`);
      sauvegarder();
    },
  }));

  enregistrer(`zone-${INDEX_DESERT}`, [
    ...desertInteractifs,
    {
      id: 'marchand',
      x: 1200,
      y: 1000,
      rayon: 90,
      sprite: () => SPRITE_MARCHAND,
      visible: () => state.save.desert['d_marchand'] === true,
      texte: () => 'MARCHAND DE QUÊTES [Q]',
      action: ouvrirMarchand,
    },
  ]);

  // ------------------------------- panneaux d'adoption (plan 13 §3)
  for (const def of COMPAGNONS_BIOMES) {
    const pos = POSITIONS_ADOPTION[def.id];
    enregistrer(`zone-${def.zone}`, [
      {
        id: `adoption-${def.id}`,
        x: pos.x,
        y: pos.y,
        rayon: 90,
        sprite: () =>
          panneauEtat(
            (state.save.compagnons[def.id] ?? 0) >= UNITES_MAX,
            true // toujours « disponible » : le modal fait la police
          ),
        etiquette: () => `${def.nomPluriel} ${state.save.compagnons[def.id] ?? 0}/${UNITES_MAX}`,
        texte: () =>
          (state.save.compagnons[def.id] ?? 0) >= UNITES_MAX
            ? `${def.nomPluriel} — ★ COPIE DE COMBAT DÉBLOQUÉE\n${def.combat.descRole}`
            : `ADOPTER DES ${def.nomPluriel}\nIls récoltent ici, même quand tu es ailleurs.`,
        action: () => ouvrirAdoption(def),
      },
    ]);
  }

  // ---------------------------------------------- forêt : l'arbre géant
  enregistrer(`zone-${INDEX_FORET}`, [
    {
      id: 'arbre-geant',
      x: 1200,
      y: 520,
      rayon: 130,
      sprite: () => SPRITE_ARBRE_GEANT,
      texte: () => {
        const cout = coutProchainPalier();
        return cout === null
          ? `L'ARBRE GÉANT — PALIER ${NID_MAX}/${NID_MAX} (MAX)\nIl rayonne de gratitude.`
          : `L'ARBRE GÉANT — PALIER ${state.save.nid}/${NID_MAX}\nNOURRIR : ${formatNombre(cout, 0)} ${THEME.monnaies.brindille.nom}\n(gains hors-ligne${state.save.nid === 0 ? ' + réveille Yuumi' : ''})`;
      },
      action: () => {
        nourrirNid();
      },
    },
  ]);
}
