// Overlays modaux : menu Échap (volume, sauvegarde, export/import, reset)
// et profil (plan 07, étape 4 ; plan 08, étape 6 pour la fiche de stats).

import { MONNAIES, THEME, ZONES } from '../data/config';
import { zonesDebloquees } from '../data/progression';
import { PARCHEMINS } from '../data/parchemins';
import { NIVEAU_MAX_SORT, SORTS, multNiveauSort, type SortDef } from '../data/sorts';
import { SWARM, coutNiveauSort, coutParchemin } from '../data/swarm';
import {
  COMPAGNONS_BIOMES,
  UNITES_MAX,
  type CompagnonBiomeDef,
} from '../data/compagnons-biomes';
import { recalculerStats, state } from '../core/state';
import { el, formatNombre } from '../core/utils';
import { apiBureau, exporterJSON, importerJSON, reinitialiser, sauvegarder } from '../systems/save';
import { viderCollectibles } from '../systems/spawner';
import { crediterDore } from '../systems/economy';
import { garantirQuetes, queteTexte, validerQuete } from '../systems/quetes';
import { progressionDex } from '../systems/peche';
import { POISSONS, RARETES } from '../data/poissons';
import { APPATS, CANNES, COUTS_PECHEURS, PECHEURS_MAX } from '../data/peche-boutique';
import { sons } from '../systems/audio';
import { construirePanneau } from './panel';
import { ajouterToast } from './toasts';
import { ouvrirSelection } from './creation';
import { profilActif } from '../systems/profils';
import { cloudDisponible, codeSync } from '../systems/cloud';

let fond: HTMLElement;
let modal: HTMLElement;

export function initOverlays(): void {
  fond = document.getElementById('modal-fond')!;
  modal = document.getElementById('modal')!;
  fond.addEventListener('click', (e) => {
    if (e.target === fond) fermerModal();
  });
}

export function modalOuvert(): boolean {
  return !fond.classList.contains('cache');
}

export function fermerModal(): void {
  fond.classList.add('cache');
  modal.textContent = '';
}

function ouvrir(): void {
  modal.textContent = '';
  fond.classList.remove('cache');
}

export function basculerParametres(): void {
  if (modalOuvert()) fermerModal();
  else ouvrirParametres();
}

export function ouvrirParametres(): void {
  ouvrir();
  modal.appendChild(el('h2', '', 'MENU'));

  // Volume
  const ligneVolume = el('div', 'ligne-modal');
  const labelVolume = el('span', '', `VOLUME : ${Math.round(state.save.volume * 100)} %`);
  const slider = el('input') as HTMLInputElement;
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(Math.round(state.save.volume * 100));
  slider.addEventListener('input', () => {
    state.save.volume = Number(slider.value) / 100;
    labelVolume.textContent = `VOLUME : ${slider.value} %`;
  });
  ligneVolume.append(labelVolume, slider);
  modal.appendChild(ligneVolume);

  // Sauvegarde manuelle
  const btnSauver = el('button', 'btn btn-modal', 'SAUVEGARDER MAINTENANT');
  btnSauver.addEventListener('click', () => {
    sauvegarder();
    ajouterToast(apiBureau ? 'SAUVEGARDÉ SUR LE DISQUE !' : 'PARTIE SAUVEGARDÉE !');
  });
  modal.appendChild(btnSauver);

  // Mode bureau (Electron) : sauvegarde/chargement par fichiers
  const api = apiBureau;
  if (api) {
    const lignesFichier = el('div', 'ligne-modal');
    const btnFichierExport = el('button', 'btn btn-modal', 'EXPORTER VERS UN FICHIER…');
    btnFichierExport.addEventListener('click', async () => {
      sauvegarder();
      if (await api.exporterVersFichier(exporterJSON())) {
        ajouterToast('SAUVEGARDE EXPORTÉE ! 💾');
      }
    });
    const btnFichierImport = el('button', 'btn btn-modal', 'IMPORTER UN FICHIER…');
    btnFichierImport.addEventListener('click', async () => {
      const contenu = await api.importerDepuisFichier();
      if (contenu && importerJSON(contenu)) {
        viderCollectibles();
        construirePanneau();
        fermerModal();
        ajouterToast('SAUVEGARDE IMPORTÉE ! 💾');
      } else if (contenu) {
        ajouterToast('FICHIER INVALIDE…');
      }
    });
    lignesFichier.append(btnFichierExport, btnFichierImport);
    modal.appendChild(lignesFichier);
  }

  // Export / import du JSON — pratique pour tester l'équilibrage (plan 07)
  const zone = el('textarea', 'zone-json') as HTMLTextAreaElement;
  zone.rows = 4;
  zone.placeholder = 'EXPORTE ta sauvegarde ici, ou COLLE un JSON puis IMPORTER.';
  const lignesBoutons = el('div', 'ligne-modal');
  const btnExport = el('button', 'btn btn-modal', 'EXPORTER');
  btnExport.addEventListener('click', () => {
    zone.value = exporterJSON();
    zone.select();
    ajouterToast('SAUVEGARDE EXPORTÉE — COPIE LE TEXTE.');
  });
  const btnImport = el('button', 'btn btn-modal', 'IMPORTER');
  btnImport.addEventListener('click', () => {
    if (importerJSON(zone.value)) {
      viderCollectibles();
      construirePanneau();
      fermerModal();
      ajouterToast('SAUVEGARDE IMPORTÉE !');
    } else {
      ajouterToast('JSON INVALIDE…');
    }
  });
  lignesBoutons.append(btnExport, btnImport);
  modal.append(lignesBoutons, zone);

  // Réinitialisation, double confirmation (plan 07, étape 4)
  let arme = false;
  const btnReset = el('button', 'btn btn-modal btn-danger', 'RÉINITIALISER LA SAUVEGARDE');
  btnReset.addEventListener('click', () => {
    if (!arme) {
      arme = true;
      btnReset.textContent = 'VRAIMENT TOUT EFFACER ? CLIQUE ENCORE';
      window.setTimeout(() => {
        arme = false;
        btnReset.textContent = 'RÉINITIALISER LA SAUVEGARDE';
      }, 3000);
      return;
    }
    reinitialiser();
    viderCollectibles();
    construirePanneau();
    fermerModal();
    ajouterToast('NOUVELLE PARTIE !');
  });
  modal.appendChild(btnReset);

  // Changer de personnage (chaque personnage a sa progression)
  const btnPerso = el('button', 'btn btn-modal', 'CHANGER DE PERSONNAGE');
  btnPerso.addEventListener('click', () => {
    sauvegarder();
    fermerModal();
    ouvrirSelection();
  });
  modal.appendChild(btnPerso);

  // Code de connexion (permet de reprendre l'aventure ailleurs)
  const code = codeSync();
  if (code) {
    modal.appendChild(
      el(
        'div',
        'ligne-modal',
        `CODE DE CONNEXION : ${code}${cloudDisponible() ? ' ☁' : ' (hors-ligne)'}`
      )
    );
  }

  const btnFermer = el('button', 'btn btn-modal', 'FERMER (ÉCHAP)');
  btnFermer.addEventListener('click', fermerModal);
  modal.appendChild(btnFermer);
}

// ------------------------------------------------------------- v2

/** Coût en SP du prochain palier de l'autel. */
export function coutSacrifice(): number {
  return 5 * (state.save.sacrifices + 1);
}

export function ouvrirAutel(): void {
  ouvrir();
  modal.appendChild(el('h2', '', 'AUTEL DE SACRIFICE'));
  modal.appendChild(
    el(
      'p',
      'rebirb-explication',
      'Offre tes points de compétence (SP) à l’autel : chaque palier donne un bonus permanent de +20 % sur TOUS les gains et +10 % sur le butin des coffres.'
    )
  );
  modal.appendChild(el('div', 'ligne-modal', `PALIERS ACCOMPLIS : ${state.save.sacrifices}`));
  modal.appendChild(
    el('div', 'ligne-modal', `BONUS ACTUEL : +${state.save.sacrifices * 20} % DE GAINS`)
  );
  modal.appendChild(el('div', 'ligne-modal', `SP DISPONIBLES : ${formatNombre(state.save.heros.sp, 0)}`));

  const cout = coutSacrifice();
  const btn = el('button', 'btn btn-modal btn-danger', `SACRIFIER ${cout} SP`);
  btn.disabled = state.save.heros.sp < cout;
  btn.addEventListener('click', () => {
    if (state.save.heros.sp < cout) return;
    state.save.heros.sp -= cout;
    state.save.sacrifices += 1;
    recalculerStats();
    sons.rebirb();
    ajouterToast(`PALIER ${state.save.sacrifices} — LES GAINS AUGMENTENT ! 🔥`);
    sauvegarder();
    ouvrirAutel(); // rafraîchit
  });
  modal.appendChild(btn);

  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function ouvrirChateau(): void {
  ouvrir();
  modal.appendChild(el('h2', '', 'LE CHÂTEAU'));
  for (const ligne of THEME.messageChateau) {
    modal.appendChild(el('div', 'ligne-chateau', ligne || ' '));
  }
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function ouvrirMarchand(): void {
  ouvrir();
  garantirQuetes();
  modal.appendChild(el('h2', '', 'MARCHAND DE QUÊTES'));
  modal.appendChild(
    el('p', 'rebirb-explication', `« Des missions contre des ${THEME.dore.pluriel.toLowerCase()}, ça te dit ? »`)
  );

  state.save.quetes.actives.forEach((q, index) => {
    const carte = el('div', 'carte');
    const haut = el('div', 'carte-haut');
    haut.append(
      el('span', 'carte-nom', queteTexte(q)),
      el('span', 'carte-niveau', `${formatNombre(Math.min(q.progres, q.objectif), 0)}/${formatNombre(q.objectif, 0)}`)
    );
    carte.appendChild(haut);
    carte.appendChild(el('div', 'carte-desc', `RÉCOMPENSE : ${q.recompense} ${THEME.dore.pluriel}`));
    const btn = el('button', 'btn btn-achat', q.progres >= q.objectif ? 'RÉCUPÉRER !' : 'EN COURS…');
    btn.disabled = q.progres < q.objectif;
    btn.classList.toggle('affordable', q.progres >= q.objectif);
    btn.addEventListener('click', () => {
      const gain = validerQuete(index);
      if (gain > 0) {
        crediterDore(gain, 0, 0, true);
        sons.achat();
        ajouterToast(`QUÊTE ACCOMPLIE ! +${gain} ${THEME.dore.pluriel} ✦`);
        sauvegarder();
        ouvrirMarchand();
      }
    });
    carte.appendChild(btn);
    modal.appendChild(carte);
  });

  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

// ---------------------------------------------- l'Antre (plan 09)

/** Confirmation avant d'entrer dans une porte de donjon. */
export function ouvrirConfirmationPorte(
  porte: {
    niveau: number;
    nom: string;
    nbVagues: number;
    nomBoss: string;
    sansFin?: boolean;
    recompensePremiere: { plumes: number; dores: number };
  },
  surEntrer: () => void
): void {
  ouvrir();
  modal.appendChild(el('h2', '', porte.sansFin ? `∞ ${porte.nom}` : `PORTE ${porte.niveau} — ${porte.nom}`));
  modal.appendChild(
    el(
      'p',
      'rebirb-explication',
      porte.sansFin
        ? `Des vagues sans fin, de plus en plus féroces. Record actuel : vague ${state.save.swarm.sansFinRecord}.`
        : `${porte.nbVagues} vagues de monstres, puis ${porte.nomBoss}. La vague suivante arrive quand TOUT est tombé.`
    )
  );
  if (!porte.sansFin && (state.save.swarm.termines[porte.niveau] ?? 0) === 0) {
    modal.appendChild(
      el(
        'div',
        'ligne-modal',
        `1ʳᵉ COMPLÉTION : +${porte.recompensePremiere.plumes} ${THEME.prestige.nom} ET +${porte.recompensePremiere.dores} ${THEME.dore.pluriel}`
      )
    );
  }
  modal.appendChild(el('div', 'ligne-modal', 'K.O. = retour à l’Antre, butin conservé.'));

  // escouade (plan 13 §5) : max 3 copies de combat, choix mémorisé
  const debloquees = COMPAGNONS_BIOMES.filter(
    (c) => (state.save.compagnons[c.id] ?? 0) >= UNITES_MAX
  );
  if (debloquees.length > 0) {
    modal.appendChild(
      el('div', 'ligne-modal', `— ESCOUADE (MAX ${SWARM.compagnons.escouadeMax}) —`)
    );
    for (const def of debloquees) {
      const ligne = el('label', 'ligne-modal ligne-escouade');
      const case_ = el('input') as HTMLInputElement;
      case_.type = 'checkbox';
      case_.checked = state.save.swarm.escouade.includes(def.id);
      case_.addEventListener('change', () => {
        const escouade = state.save.swarm.escouade.filter((id) => id !== def.id);
        if (case_.checked) {
          if (escouade.length >= SWARM.compagnons.escouadeMax) {
            case_.checked = false;
            ajouterToast(`${SWARM.compagnons.escouadeMax} COPIES MAXIMUM !`);
            return;
          }
          escouade.push(def.id);
        }
        state.save.swarm.escouade = escouade;
        sauvegarder();
      });
      ligne.append(case_, el('span', '', ` ${def.nom} — ${def.combat.descRole}`));
      modal.appendChild(ligne);
    }
  }

  const btnEntrer = el('button', 'btn btn-modal affordable', 'ENTRER ⚔');
  btnEntrer.addEventListener('click', () => {
    fermerModal();
    surEntrer();
  });
  modal.appendChild(btnEntrer);
  const btnAnnuler = el('button', 'btn btn-modal', 'PAS ENCORE…');
  btnAnnuler.addEventListener('click', fermerModal);
  modal.appendChild(btnAnnuler);
}

/** Panneau de fin de donjon : temps, dégâts, butin, rejouer/retour. */
export function ouvrirFinDonjon(
  stats: {
    nomPorte: string;
    tempsSec: number;
    degatsPris: number;
    dores: number;
    plumes: number;
    premiere: boolean;
  },
  actions: { surRejouer: () => void; surRetour: () => void }
): void {
  ouvrir();
  modal.appendChild(el('h2', '', `🏆 ${stats.nomPorte} — VICTOIRE !`));
  if (stats.premiere) {
    modal.appendChild(el('div', 'ligne-modal', '✨ PREMIÈRE COMPLÉTION — UNE NOUVELLE PORTE S’OUVRE'));
  }
  const minutes = Math.floor(stats.tempsSec / 60);
  const secondes = Math.round(stats.tempsSec % 60);
  modal.appendChild(el('div', 'ligne-modal', `TEMPS : ${minutes} MIN ${secondes} S`));
  modal.appendChild(el('div', 'ligne-modal', `DÉGÂTS SUBIS : ${formatNombre(stats.degatsPris, 0)}`));
  modal.appendChild(
    el('div', 'ligne-modal', `BUTIN : ${formatNombre(stats.dores, 0)} ${THEME.dore.pluriel}${stats.plumes > 0 ? ` + ${stats.plumes} ${THEME.prestige.nom}` : ''}`)
  );
  const btnRejouer = el('button', 'btn btn-modal', 'REJOUER CETTE PORTE');
  btnRejouer.addEventListener('click', () => {
    fermerModal();
    actions.surRejouer();
  });
  modal.appendChild(btnRejouer);
  const btnRetour = el('button', 'btn btn-modal affordable', 'RETOUR À L’ANTRE');
  btnRetour.addEventListener('click', () => {
    fermerModal();
    actions.surRetour();
  });
  modal.appendChild(btnRetour);
}

/** La boutique du ponton (touche B pendant la pêche) : cannes, appâts,
 *  pêcheurs automatiques — comme dans le Birb original. */
export function ouvrirBoutiquePeche(): void {
  ouvrir();
  const p = state.save.peche;
  modal.appendChild(el('h2', '', 'BOUTIQUE DE PÊCHE'));

  // ---- cannes
  modal.appendChild(el('div', 'ligne-modal', '— CANNES —'));
  CANNES.forEach((canne, index) => {
    const carte = el('div', 'carte');
    const haut = el('div', 'carte-haut');
    haut.append(
      el('span', 'carte-nom', canne.nom),
      el('span', 'carte-niveau', `MORSURE ×${canne.vitesse} — RARETÉ ×${canne.chance}`)
    );
    carte.appendChild(haut);
    const btn = el('button', 'btn btn-achat');
    if (p.canne === index) {
      btn.textContent = 'ÉQUIPÉE ✔';
      btn.disabled = true;
    } else if (p.canne > index) {
      btn.textContent = 'DÉPASSÉE';
      btn.disabled = true;
    } else if (index !== p.canne + 1) {
      btn.textContent = 'PLUS TARD…';
      btn.disabled = true;
    } else {
      const solde = canne.enDores ? state.save.soldeDore : state.save.soldes.popcorn;
      btn.textContent = `${formatNombre(canne.cout, 0)} ${canne.enDores ? THEME.dore.pluriel : THEME.monnaies.popcorn.nom}`;
      btn.disabled = solde < canne.cout;
      btn.classList.toggle('affordable', solde >= canne.cout);
      btn.addEventListener('click', () => {
        if (canne.enDores) state.save.soldeDore -= canne.cout;
        else state.save.soldes.popcorn -= canne.cout;
        p.canne = index;
        sons.rebirb();
        ajouterToast(`NOUVELLE CANNE : ${canne.nom} 🎣`);
        sauvegarder();
        ouvrirBoutiquePeche();
      });
    }
    carte.appendChild(btn);
    modal.appendChild(carte);
  });

  // ---- appâts
  modal.appendChild(el('div', 'ligne-modal', '— APPÂTS —'));
  for (const appat of APPATS) {
    const stock = p.appats[appat.id] ?? 0;
    const actif = p.appatActif === appat.id && stock > 0;
    const carte = el('div', 'carte');
    const haut = el('div', 'carte-haut');
    haut.append(el('span', 'carte-nom', appat.nom), el('span', 'carte-niveau', `STOCK : ${stock}`));
    carte.appendChild(haut);
    carte.appendChild(el('div', 'carte-desc', appat.desc));
    const achats = el('div', 'carte-achats');
    const solde = appat.enDores ? state.save.soldeDore : state.save.soldes.popcorn;
    const btnAcheter = el(
      'button',
      'btn btn-achat',
      `+${appat.quantite} → ${formatNombre(appat.cout, 0)} ${appat.enDores ? THEME.dore.pluriel : THEME.monnaies.popcorn.nom}`
    );
    btnAcheter.disabled = solde < appat.cout;
    btnAcheter.classList.toggle('affordable', solde >= appat.cout);
    btnAcheter.addEventListener('click', () => {
      if (appat.enDores) state.save.soldeDore -= appat.cout;
      else state.save.soldes.popcorn -= appat.cout;
      p.appats[appat.id] = (p.appats[appat.id] ?? 0) + appat.quantite;
      sons.achat();
      sauvegarder();
      ouvrirBoutiquePeche();
    });
    const btnEquiper = el('button', 'btn btn-max', actif ? 'ACTIF ✔' : 'ÉQUIPER');
    btnEquiper.disabled = stock <= 0 || actif;
    btnEquiper.addEventListener('click', () => {
      p.appatActif = appat.id;
      sons.achat();
      sauvegarder();
      ouvrirBoutiquePeche();
    });
    achats.append(btnAcheter, btnEquiper);
    carte.appendChild(achats);
    modal.appendChild(carte);
  }

  // ---- pêcheurs automatiques
  modal.appendChild(el('div', 'ligne-modal', `— PÊCHEURS AUTOMATIQUES (${p.pecheurs}/${PECHEURS_MAX}) —`));
  const cartePecheur = el('div', 'carte');
  cartePecheur.appendChild(
    el('div', 'carte-desc', 'Un doughcat pêcheur attrape des poissons tout seul, même quand tu es ailleurs.')
  );
  if (p.pecheurs < PECHEURS_MAX) {
    const cout = COUTS_PECHEURS[p.pecheurs];
    const btn = el('button', 'btn btn-achat', `EMBAUCHER : ${formatNombre(cout, 0)} ${THEME.monnaies.popcorn.nom}`);
    btn.disabled = state.save.soldes.popcorn < cout;
    btn.classList.toggle('affordable', state.save.soldes.popcorn >= cout);
    btn.addEventListener('click', () => {
      state.save.soldes.popcorn -= cout;
      p.pecheurs += 1;
      sons.rebirb();
      ajouterToast(`UN DOUGHCAT PÊCHEUR REJOINT LE PONTON ! 🎣 (${p.pecheurs}/${PECHEURS_MAX})`);
      sauvegarder();
      ouvrirBoutiquePeche();
    });
    cartePecheur.appendChild(btn);
  } else {
    cartePecheur.appendChild(el('div', 'carte-desc', 'LE PONTON EST AU COMPLET !'));
  }
  modal.appendChild(cartePecheur);

  const fermer = el('button', 'btn btn-modal', 'FERMER (B)');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function basculerBoutiquePeche(): void {
  if (modalOuvert()) fermerModal();
  else ouvrirBoutiquePeche();
}

/** Dessine un petit poisson stylisé (pour le Mikudex). */
function iconePoisson(couleurs: [string, string], connu: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 36;
  c.height = 20;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = connu ? couleurs[0] : '#3a3a45';
  ctx.beginPath();
  ctx.ellipse(15, 10, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(25, 10);
  ctx.lineTo(33, 4);
  ctx.lineTo(33, 16);
  ctx.closePath();
  ctx.fill();
  if (connu) {
    ctx.fillStyle = couleurs[1];
    ctx.fillRect(10, 8, 6, 3);
    ctx.fillStyle = '#2c2337';
    ctx.fillRect(7, 8, 2, 2);
  }
  return c;
}

export function ouvrirMikudex(): void {
  ouvrir();
  const progression = progressionDex();
  modal.appendChild(el('h2', '', `MIKUDEX — ${progression.decouvertes}/${progression.total}`));
  for (const p of POISSONS) {
    const entree = state.save.peche.dex[p.id];
    const connu = (entree?.captures ?? 0) > 0;
    const ligne = el('div', 'ligne-dex');
    ligne.appendChild(iconePoisson(p.couleurs, connu));
    const infos = el('div', 'dex-infos');
    const nom = el('div', 'dex-nom', connu ? p.nom : '? ? ?');
    nom.style.color = RARETES[p.rarete].couleur;
    infos.appendChild(nom);
    infos.appendChild(
      el(
        'div',
        'dex-detail',
        connu
          ? `${p.rarete.toUpperCase()} — ${entree!.captures} PRISE${entree!.captures > 1 ? 'S' : ''}${entree!.shiny > 0 ? ` DONT ${entree!.shiny} ✨` : ''}`
          : p.rarete.toUpperCase()
      )
    );
    ligne.appendChild(infos);
    modal.appendChild(ligne);
  }
  const fermer = el('button', 'btn btn-modal', 'FERMER (F)');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function basculerMikudex(): void {
  if (modalOuvert()) fermerModal();
  else ouvrirMikudex();
}

// ------------------------------------------- le Mercier (plan 11)

const ACCUEILS_MERCIER = [
  '« Du fil doré, tout juste arrivé ! »',
  '« Ces ciseaux ? Forgés dans un rêve. »',
  '« Reviens me voir après la porte suivante… »',
  '« Une couturière sans parchemins, c’est une aiguille sans fil. »',
  '« Psst. Les bobines orbitales. Crois-moi. »',
];

let ongletMercier: 'patrons' | 'sortileges' = 'patrons';

function niveauSortSave(id: string): number {
  return state.save.sorts[id] ?? 0;
}

function carteParchemin(defRefresh: () => void): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const def of PARCHEMINS) {
    const niv = state.save.parchemins[def.id] ?? 0;
    const carte = el('div', 'carte');
    const haut = el('div', 'carte-haut');
    haut.append(
      el('span', 'carte-nom', `${def.icone} ${def.nom}`),
      el('span', 'carte-niveau', `NIV. ${niv}/${def.max}`)
    );
    carte.appendChild(haut);
    carte.appendChild(el('div', 'carte-desc', def.description(niv)));
    // barre de progression fine (satisfaction visuelle : c'est un idle game)
    const barre = el('div', 'barre-parchemin');
    const rempli = el('div', 'barre-parchemin-remplie');
    rempli.style.width = `${(niv / def.max) * 100}%`;
    barre.appendChild(rempli);
    carte.appendChild(barre);
    const btn = el('button', 'btn btn-achat');
    if (niv >= def.max) {
      btn.textContent = 'COUSU AU MAX ✔';
      btn.disabled = true;
    } else {
      const cout = coutParchemin(def.coutBase, niv);
      const solde = state.save.soldes.popcorn;
      btn.textContent = `${formatNombre(cout, 0)} ${THEME.monnaies.popcorn.nom}`;
      btn.disabled = solde < cout;
      btn.classList.toggle('affordable', solde >= cout);
      btn.addEventListener('click', () => {
        if (state.save.soldes.popcorn < cout) return;
        state.save.soldes.popcorn -= cout;
        state.save.parchemins[def.id] = niv + 1;
        recalculerStats();
        sons.achat();
        sauvegarder();
        defRefresh();
      });
    }
    carte.appendChild(btn);
    frag.appendChild(carte);
  }
  return frag;
}

function pipsNiveau(niv: number): string {
  return '●'.repeat(niv) + '○'.repeat(NIVEAU_MAX_SORT - niv);
}

function carteSort(def: SortDef, defRefresh: () => void): HTMLElement {
  const niv = niveauSortSave(def.id);
  const carte = el('div', 'carte');
  const haut = el('div', 'carte-haut');
  haut.append(
    el('span', 'carte-nom', def.nom),
    el('span', 'carte-niveau', niv > 0 ? pipsNiveau(niv) : 'VERROUILLÉ')
  );
  carte.appendChild(haut);
  carte.appendChild(el('div', 'carte-desc', `${def.description} (${def.clin})`));

  if (niv === 0) {
    const cout = def.coutDeblocage;
    const btn = el('button', 'btn btn-achat');
    if (cout === 0) {
      btn.textContent = 'OFFERT PAR LE MERCIER 🎁';
      btn.classList.add('affordable');
      btn.addEventListener('click', () => {
        state.save.sorts[def.id] = 1;
        sons.rebirb();
        ajouterToast(`${def.nom} APPRIS !`);
        sauvegarder();
        defRefresh();
      });
    } else {
      btn.textContent = `DÉBLOQUER : ${formatNombre(cout, 0)} ${THEME.monnaies.popcorn.nom}`;
      btn.disabled = state.save.soldes.popcorn < cout;
      btn.classList.toggle('affordable', state.save.soldes.popcorn >= cout);
      btn.addEventListener('click', () => {
        if (state.save.soldes.popcorn < cout) return;
        state.save.soldes.popcorn -= cout;
        state.save.sorts[def.id] = 1;
        sons.rebirb();
        ajouterToast(`${def.nom} APPRIS ! ✂`);
        sauvegarder();
        defRefresh();
      });
    }
    carte.appendChild(btn);
    return carte;
  }

  // montée de niveau (2..6)
  if (niv < NIVEAU_MAX_SORT) {
    const cout = coutNiveauSort(def.coutDeblocage || 400, niv + 1);
    carte.appendChild(
      el('div', 'carte-desc', `NIV. ${niv + 1} : ${def.effets[niv - 1].texte}`)
    );
    const btn = el(
      'button',
      'btn btn-achat',
      `AMÉLIORER : ${formatNombre(cout, 0)} ${THEME.monnaies.popcorn.nom}`
    );
    btn.disabled = state.save.soldes.popcorn < cout;
    btn.classList.toggle('affordable', state.save.soldes.popcorn >= cout);
    btn.addEventListener('click', () => {
      if (state.save.soldes.popcorn < cout) return;
      state.save.soldes.popcorn -= cout;
      state.save.sorts[def.id] = niv + 1;
      sons.achat();
      sauvegarder();
      defRefresh();
    });
    carte.appendChild(btn);
  } else {
    carte.appendChild(
      el('div', 'carte-desc', `×${multNiveauSort(def, niv).toFixed(1)} dégâts — niveau maximal.`)
    );
  }

  // évolution : sort niv. 6 ET parchemin lié ≥ 5 → payée en dorés
  const evoluee = state.save.evolutions[def.id] === true;
  const parcheminLie = PARCHEMINS.find((p) => p.id === def.evolution.parcheminLie);
  const nivParchemin = state.save.parchemins[def.evolution.parcheminLie] ?? 0;
  if (evoluee) {
    carte.appendChild(el('div', 'carte-desc', `★ ${def.evolution.nom} — ${def.evolution.effet}`));
  } else if (niv >= NIVEAU_MAX_SORT && nivParchemin >= 5) {
    const cout = SWARM.coutEvolutionDores;
    const btn = el(
      'button',
      'btn btn-achat affordable btn-evolution',
      `★ ÉVOLUER : ${def.evolution.nom} — ${formatNombre(cout, 0)} ${THEME.dore.pluriel}`
    );
    btn.disabled = state.save.soldeDore < cout;
    btn.addEventListener('click', () => {
      if (state.save.soldeDore < cout) return;
      state.save.soldeDore -= cout;
      state.save.evolutions[def.id] = true;
      sons.rebirb();
      ajouterToast(`★ ${def.evolution.nom} ! ${def.evolution.effet}`);
      sauvegarder();
      defRefresh();
    });
    carte.appendChild(btn);
  } else {
    carte.appendChild(
      el(
        'div',
        'carte-desc carte-verrou',
        `ÉVOLUTION « ${def.evolution.nom} » : NIV. 6 + ${parcheminLie?.nom ?? ''} 5 requis (act. ${nivParchemin}/5)`
      )
    );
  }
  return carte;
}

export function ouvrirMercier(): void {
  ouvrir();
  modal.appendChild(el('h2', '', '🧵 LE MERCIER'));
  modal.appendChild(
    el('p', 'rebirb-explication', ACCUEILS_MERCIER[Math.floor(Math.random() * ACCUEILS_MERCIER.length)])
  );
  modal.appendChild(
    el(
      'div',
      'ligne-modal',
      `${THEME.monnaies.popcorn.nom} : ${formatNombre(state.save.soldes.popcorn, 0)} — ${THEME.dore.pluriel} : ${formatNombre(state.save.soldeDore, 0)}`
    )
  );

  const onglets = el('div', 'ligne-modal');
  const btnPatrons = el(
    'button',
    `btn btn-modal${ongletMercier === 'patrons' ? ' affordable' : ''}`,
    'PATRONS DE COUTURE'
  );
  const btnSorts = el(
    'button',
    `btn btn-modal${ongletMercier === 'sortileges' ? ' affordable' : ''}`,
    'SORTILÈGES COUSUS'
  );
  btnPatrons.addEventListener('click', () => {
    ongletMercier = 'patrons';
    ouvrirMercier();
  });
  btnSorts.addEventListener('click', () => {
    ongletMercier = 'sortileges';
    ouvrirMercier();
  });
  onglets.append(btnPatrons, btnSorts);
  modal.appendChild(onglets);

  if (ongletMercier === 'patrons') {
    modal.appendChild(carteParchemin(ouvrirMercier));
  } else {
    for (const def of SORTS) modal.appendChild(carteSort(def, ouvrirMercier));
  }

  const fermer = el('button', 'btn btn-modal', 'FERMER (M)');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function basculerMercier(): void {
  if (modalOuvert()) fermerModal();
  else ouvrirMercier();
}

// --------------------------------- l'adoption de compagnons (plan 13)

export function ouvrirAdoption(def: CompagnonBiomeDef): void {
  ouvrir();
  const u = state.save.compagnons[def.id] ?? 0;
  modal.appendChild(el('h2', '', `${def.nomPluriel} — ${u}/${UNITES_MAX}`));
  modal.appendChild(
    el(
      'p',
      'rebirb-explication',
      `${def.nomPluriel} récoltent dans ${ZONES[def.zone].nom} — même quand tu es ailleurs (jeu ouvert). Les achats survivent à la ${THEME.prestige.verbe.toLowerCase()}.`
    )
  );
  modal.appendChild(el('div', 'ligne-modal', `RÔLE À 4/4 : ${def.combat.descRole}`));

  if (u >= UNITES_MAX) {
    modal.appendChild(el('div', 'ligne-modal', '★ COPIE DE COMBAT DÉBLOQUÉE — choisis ton escouade sur une porte de l’Antre !'));
  } else {
    const cout = def.couts[u];
    const monnaie = def.monnaieAchat === 'dore' ? null : def.monnaieAchat;
    const nomMonnaie = monnaie === null ? THEME.dore.pluriel : THEME.monnaies[monnaie].nom;
    const solde = monnaie === null ? state.save.soldeDore : state.save.soldes[monnaie];
    const btn = el(
      'button',
      'btn btn-achat',
      `ADOPTER (${u + 1}/${UNITES_MAX}) : ${formatNombre(cout, 0)} ${nomMonnaie}`
    );
    btn.disabled = solde < cout;
    btn.classList.toggle('affordable', solde >= cout);
    btn.addEventListener('click', () => {
      if (monnaie === null) {
        if (state.save.soldeDore < cout) return;
        state.save.soldeDore -= cout;
      } else {
        if (state.save.soldes[monnaie] < cout) return;
        state.save.soldes[monnaie] -= cout;
      }
      state.save.compagnons[def.id] = u + 1;
      sons.niveau();
      ajouterToast(
        u + 1 >= UNITES_MAX
          ? `★ ${def.nom} 4/4 — COPIE DE COMBAT DÉBLOQUÉE !`
          : `UN ${def.nom} REJOINT LE BIOME ! (${u + 1}/${UNITES_MAX})`
      );
      sauvegarder();
      ouvrirAdoption(def);
    });
    modal.appendChild(btn);
  }

  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function ouvrirProfil(): void {
  ouvrir();
  modal.appendChild(el('h2', '', profilActif()?.nom ?? 'PROFIL'));

  const minutes = Math.floor(state.save.tempsJeu / 60);
  const heures = Math.floor(minutes / 60);
  const temps = heures > 0 ? `${heures} H ${minutes % 60} MIN` : `${minutes} MIN`;

  const dex = progressionDex();
  const lignes = [
    `TEMPS DE JEU : ${temps}`,
    `NIVEAU : ${state.save.heros.niveau}`,
    `PORTES DE L'ANTRE : ${Math.min(state.save.swarm.porteMax, 12)}/12${state.save.swarm.sansFinRecord > 0 ? ` — SANS-FIN : V.${state.save.swarm.sansFinRecord}` : ''}`,
    `${THEME.prestige.verbe} : ${state.save.rebirbs}`,
    `${THEME.prestige.nom} : ${formatNombre(state.save.plumes, 0)} (CUMUL ${formatNombre(state.save.cumulPlumes, 0)})`,
    `${THEME.dore.pluriel} : ${formatNombre(state.save.soldeDore, 0)}`,
    `PÊCHE : NIV. ${state.save.peche.niveau} — MIKUDEX ${dex.decouvertes}/${dex.total}`,
    `SACRIFICES : ${state.save.sacrifices} — NID : ${state.save.nid} — QUÊTES : ${state.save.quetes.terminees}`,
  ];
  const nbZones = zonesDebloquees(state.save.rebirbs);
  for (const m of MONNAIES) {
    if (MONNAIES.indexOf(m) >= nbZones) continue;
    lignes.push(`${THEME.monnaies[m].nom} CUMULÉS : ${formatNombre(state.save.cumulsGlobaux[m], 0)}`);
  }
  for (const ligne of lignes) modal.appendChild(el('div', 'ligne-modal', ligne));

  const btnFermer = el('button', 'btn btn-modal', 'FERMER');
  btnFermer.addEventListener('click', fermerModal);
  modal.appendChild(btnFermer);
}
