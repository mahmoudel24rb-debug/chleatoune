// Overlays modaux : menu Échap (volume, sauvegarde, export/import, reset)
// et profil (plan 07, étape 4 ; plan 08, étape 6 pour la fiche de stats).

import { MONNAIES, THEME, ZONES } from '../data/config';
import { zonesDebloquees } from '../data/progression';
import { PARCHEMINS } from '../data/parchemins';
import { MALEDICTIONS, scoreMaledictions } from '../data/maledictions';
import { ARCHIMONSTRES } from '../data/archimonstres';
import { CATEGORIES_SUCCES, SUCCES } from '../data/succes';
import { RECOMPENSE_OFFRANDE } from '../data/calendrier';
import { frameGlb } from '../core/sprites';
import { spritePoisson } from '../core/sprites-poissons';
import { setMaledictionsPorte } from '../systems/donjon';
import { progressionSucces } from '../systems/succes';
import { acheterChasse, chasseActive, indiceFilSecret } from '../systems/chasses';
import { chapitreCourant, ligneFilRouge, progresCollecte, signalerActionFilRouge } from '../systems/filrouge';
import { indiceCourant } from '../systems/chasses';
import { PLATS, platDef } from '../data/cuisine';
import {
  cuisiner,
  donnerAquarium,
  donnerPatee,
  nbDonsAquarium,
  peutCuisiner,
  recyclerEnAppat,
  stock,
  totalToutVendre,
  toutVendre,
  valeurPoisson,
  vendrePoissons,
  vendreShiny,
} from '../systems/besace';
import { bonusDuJour, faireOffrande, offrandeDisponible, offrandeDuJour } from '../systems/calendrier';
import { NIVEAU_MAX_SORT, SORTS, multNiveauSort, type SortDef } from '../data/sorts';
import { SWARM, coutNiveauSort, coutParchemin } from '../data/swarm';
import { BUFFS_MATIERES, PREPARATIONS_MATIERES, coutReparationPorte } from '../data/matieres';
import { PORTES } from '../data/portes';
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
import {
  acheterBuffMatiere,
  acheterPreparationMatiere,
  peutPayerCout,
  reparerSoclePorte,
  tempsBuffMatiere,
  texteCout,
} from '../systems/matieres';

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

  // malédictions (plan 14 §2) : uniquement sur une porte déjà terminée,
  // jamais la sans-fin — verrouillées une fois entré, comme les idoles
  const dejaFinie = !porte.sansFin && (state.save.swarm.termines[porte.niveau] ?? 0) > 0;
  const choixMaledictions: string[] = [];
  if (dejaFinie) {
    modal.appendChild(el('div', 'ligne-modal', '— MALÉDICTIONS (0 À 3, DORÉS ET XP MULTIPLIÉS) —'));
    const ligneMult = el('div', 'ligne-modal', '☠ MULTIPLICATEUR : ×1');
    const majMult = () => {
      const mult = Math.min(SWARM.maledictions.plafond, 1 + scoreMaledictions(choixMaledictions) / 100);
      ligneMult.textContent = `☠ MULTIPLICATEUR : ×${mult.toFixed(2).replace('.', ',')} (dorés et XP de la porte uniquement)`;
    };
    for (const m of MALEDICTIONS) {
      const ligne = el('label', 'ligne-modal ligne-escouade');
      const case_ = el('input') as HTMLInputElement;
      case_.type = 'checkbox';
      case_.addEventListener('change', () => {
        const index = choixMaledictions.indexOf(m.id);
        if (index >= 0) choixMaledictions.splice(index, 1);
        if (case_.checked) {
          if (choixMaledictions.length >= 3) {
            case_.checked = false;
            ajouterToast('3 MALÉDICTIONS MAXIMUM !');
            return;
          }
          choixMaledictions.push(m.id);
        }
        setMaledictionsPorte(choixMaledictions);
        majMult();
      });
      ligne.append(case_, el('span', '', ` ${m.nom} (+${m.score}) — ${m.effet}`));
      modal.appendChild(ligne);
    }
    modal.appendChild(ligneMult);
  }
  setMaledictionsPorte([]); // repart propre à chaque ouverture du modal

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

  // la hotbar de consommables (plan 18 §4) : 3 slots, touches 1/2/3
  modal.appendChild(el('div', 'ligne-modal', '— HOTBAR (TOUCHES 1/2/3, COOLDOWN PARTAGÉ 8 S) —'));
  for (let slot = 0; slot < 3; slot++) {
    const ligne = el('div', 'ligne-modal ligne-escouade');
    const choix = el('select', 'dev-champ') as HTMLSelectElement;
    const optVide = el('option', '', '— vide —') as HTMLOptionElement;
    optVide.value = '';
    choix.appendChild(optVide);
    for (const plat of PLATS) {
      if (plat.id === 'patee') continue; // la pâtée se donne aux panneaux
      const n = state.save.inventaire.plats[plat.id] ?? 0;
      if (n <= 0) continue;
      const opt = el('option', '', `${plat.icone} ${plat.nom} ×${n}`) as HTMLOptionElement;
      opt.value = plat.id;
      choix.appendChild(opt);
    }
    for (const p of POISSONS) {
      const n = stock(p.id).n;
      if (n <= 0) continue;
      const opt = el('option', '', `🐟 ${p.nom} (cru) ×${n}`) as HTMLOptionElement;
      opt.value = `poisson:${p.id}`;
      choix.appendChild(opt);
    }
    choix.value = state.save.swarm.hotbar[slot] ?? '';
    if (choix.value !== (state.save.swarm.hotbar[slot] ?? '')) choix.value = '';
    choix.addEventListener('change', () => {
      state.save.swarm.hotbar[slot] = choix.value || null;
      sauvegarder();
    });
    ligne.append(el('span', '', `[${slot + 1}] `), choix);
    modal.appendChild(ligne);
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
    defi?: { nom: string; reussi: boolean };
    maledictions?: { n: number; mult: number };
    bonusDores?: number;
    archis?: string[];
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
  // le récap du plan 14 : défi, malédictions, archimonstres — un seul écran
  if (stats.defi) {
    modal.appendChild(
      el('div', 'ligne-modal', `🎯 DÉFI « ${stats.defi.nom} » : ${stats.defi.reussi ? 'RÉUSSI ✓' : 'RATÉ ✗ (aucun malus)'}`)
    );
  }
  if (stats.maledictions) {
    modal.appendChild(
      el('div', 'ligne-modal', `☠ MALÉDICTIONS ×${stats.maledictions.n} — MULTIPLICATEUR ×${stats.maledictions.mult.toFixed(2).replace('.', ',')}`)
    );
  }
  if ((stats.bonusDores ?? 0) > 0) {
    modal.appendChild(
      el('div', 'ligne-modal', `BONUS : +${formatNombre(stats.bonusDores!, 0)} ${THEME.dore.pluriel} (défi/malédictions)`)
    );
  }
  for (const archi of stats.archis ?? []) {
    modal.appendChild(el('div', 'ligne-modal', `👑 ARCHIMONSTRE VAINCU : ${archi}`));
  }
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

  // recyclage (plan 18 §6) : la pêche s'auto-alimente
  modal.appendChild(el('div', 'ligne-modal', '— RECYCLAGE —'));
  const carteRecycle = el('div', 'carte');
  carteRecycle.appendChild(
    el('div', 'carte-desc', '3 poissons communs de la besace → 1 MIETTES DE BRIOCHE (appât).')
  );
  const btnRecycle = el('button', 'btn btn-achat', 'RECYCLER 3 COMMUNS');
  btnRecycle.addEventListener('click', () => {
    if (recyclerEnAppat()) ouvrirBoutiquePeche();
    else {
      sons.refus();
      ajouterToast('IL FAUT 3 POISSONS COMMUNS DANS LA BESACE.');
    }
  });
  carteRecycle.appendChild(btnRecycle);
  modal.appendChild(carteRecycle);

  const versBesaceB = el('button', 'btn btn-modal', '🎒 VENDRE / BESACE (I)');
  versBesaceB.addEventListener('click', ouvrirBesace);
  modal.appendChild(versBesaceB);

  const fermer = el('button', 'btn btn-modal', 'FERMER (B)');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function basculerBoutiquePeche(): void {
  if (modalOuvert()) fermerModal();
  else ouvrirBoutiquePeche();
}

/** L'icône du Mikudex : le sprite AC-style, en silhouette si inconnu. */
function iconePoisson(id: string, connu: boolean): HTMLCanvasElement {
  const sprite = spritePoisson(id, 0, 1);
  const c = document.createElement('canvas');
  c.width = 40;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (sprite) {
    if (!connu) ctx.filter = 'brightness(0) opacity(0.55)';
    const echelle = Math.min(38 / sprite.width, 30 / sprite.height);
    const w = sprite.width * echelle;
    const h = sprite.height * echelle;
    ctx.drawImage(sprite, (40 - w) / 2, (32 - h) / 2, w, h);
  }
  return c;
}

/** Le Bestiaire des archimonstres (plan 14 §3) — silhouette tant que
 *  jamais vaincu, sprite doré + compteur ensuite. */
export function ouvrirBestiaire(): void {
  ouvrir();
  const bestiaire = state.save.bestiaire;
  const total = Object.keys(ARCHIMONSTRES).length;
  const vaincus = Object.keys(ARCHIMONSTRES).filter((id) => (bestiaire[id] ?? 0) > 0).length;
  modal.appendChild(el('h2', '', `BESTIAIRE — ${vaincus}/${total}`));
  modal.appendChild(
    el('p', 'rebirb-explication', 'Les archimonstres : rares, dorés, nommés. 1,5 % de chance par monstre — ouvre l’œil (et l’oreille).')
  );
  for (const [typeId, nom] of Object.entries(ARCHIMONSTRES)) {
    const victoires = bestiaire[typeId] ?? 0;
    const connu = victoires > 0;
    const ligne = el('div', 'ligne-dex');
    const icone = frameGlb(`m_${typeId}`, 'face', 'idle');
    if (icone) {
      const mini = document.createElement('canvas');
      mini.width = 36;
      mini.height = 36;
      const ctx = mini.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const echelle = Math.min(36 / icone.width, 36 / icone.height);
      if (!connu) ctx.filter = 'brightness(0)'; // silhouette noire
      else ctx.filter = 'sepia(1) saturate(2.4) hue-rotate(-8deg) brightness(1.2)'; // doré
      ctx.drawImage(icone, 0, 0, icone.width * echelle, icone.height * echelle);
      ligne.appendChild(mini);
    }
    const infos = el('div', 'dex-infos');
    const nomEl = el('div', 'dex-nom', connu ? nom : '? ? ?');
    nomEl.style.color = connu ? THEME.dore.couleur : '#8a8a96';
    infos.appendChild(nomEl);
    infos.appendChild(
      el('div', 'dex-detail', connu ? `VAINCU ×${victoires}` : `(archimonstre du ${typeId.toUpperCase()})`)
    );
    ligne.appendChild(infos);
    modal.appendChild(ligne);
  }
  if (state.save.bestiaireComplet) {
    modal.appendChild(el('div', 'ligne-modal', '🏆 LA GRANDE COLLECTIONNEUSE — trophée exposé dans l’Antre'));
  }
  const versDex = el('button', 'btn btn-modal', '← MIKUDEX');
  versDex.addEventListener('click', ouvrirMikudex);
  modal.appendChild(versDex);
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function ouvrirMikudex(): void {
  ouvrir();
  const progression = progressionDex();
  modal.appendChild(el('h2', '', `MIKUDEX — ${progression.decouvertes}/${progression.total}`));
  for (const p of POISSONS) {
    const entree = state.save.peche.dex[p.id];
    const connu = (entree?.captures ?? 0) > 0;
    const ligne = el('div', 'ligne-dex');
    ligne.appendChild(iconePoisson(p.id, connu));
    const infos = el('div', 'dex-infos');
    const nom = el('div', 'dex-nom', connu ? p.nom : '? ? ?');
    nom.style.color = RARETES[p.rarete].couleur;
    infos.appendChild(nom);
    // bande + créneau + record : affichés APRÈS la première capture
    // (le savoir de pêcheuse se gagne — plan 17 §2 et §5)
    const habitat = connu
      ? ` · ${p.bande.toUpperCase()} · ${p.creneau ? p.creneau.toUpperCase() : 'TOUTE HEURE'}`
      : ' · ??? · ???';
    const record = connu && (entree?.tailleRecord ?? 0) > 0 ? ` · 📏 ${entree!.tailleRecord} CM` : '';
    infos.appendChild(
      el(
        'div',
        'dex-detail',
        connu
          ? `${p.rarete.toUpperCase()}${habitat}${record} — ${entree!.captures} PRISE${entree!.captures > 1 ? 'S' : ''}${entree!.shiny > 0 ? ` DONT ${entree!.shiny} ✨` : ''}`
          : `${p.rarete.toUpperCase()}${habitat} — OMBRE ${p.ombre}`
      )
    );
    ligne.appendChild(infos);
    modal.appendChild(ligne);
  }
  const versBestiaire = el('button', 'btn btn-modal', 'BESTIAIRE DES ARCHIMONSTRES →');
  versBestiaire.addEventListener('click', ouvrirBestiaire);
  modal.appendChild(versBestiaire);
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

// --------------------------------- l'Atelier des matières

function formatDuree(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function ligneSoldesMatieres(): HTMLElement {
  return el(
    'div',
    'ligne-modal',
    `${THEME.monnaies.graine.nom} : ${formatNombre(state.save.soldes.graine, 0)} — ` +
      `${THEME.monnaies.brindille.nom} : ${formatNombre(state.save.soldes.brindille, 0)} — ` +
      `${THEME.monnaies.minerai.nom} : ${formatNombre(state.save.soldes.minerai, 0)}`
  );
}

export function ouvrirAtelierMatieres(): void {
  ouvrir();
  modal.appendChild(el('h2', '', 'ATELIER DES MATIÈRES'));
  modal.appendChild(
    el(
      'p',
      'rebirb-explication',
      'Les Miku règlent le spectacle, les minerais préparent les portes, et les surplus recousent les socles de l’Envers.'
    )
  );
  modal.appendChild(ligneSoldesMatieres());

  modal.appendChild(el('div', 'ligne-modal', '— SCÈNE : BONUS TEMPORAIRES —'));
  for (const def of BUFFS_MATIERES) {
    const carte = el('div', 'carte');
    const actif = tempsBuffMatiere(def.id);
    carte.appendChild(el('div', 'carte-nom', `${def.nom}${actif > 0 ? ` — ${formatDuree(actif)}` : ''}`));
    carte.appendChild(el('div', 'carte-desc', def.desc));
    const btn = el('button', 'btn btn-achat', `LANCER : ${texteCout(def.cout)}`);
    btn.disabled = !peutPayerCout(def.cout);
    btn.classList.toggle('affordable', peutPayerCout(def.cout));
    btn.addEventListener('click', () => {
      if (acheterBuffMatiere(def.id)) ouvrirAtelierMatieres();
    });
    carte.appendChild(btn);
    modal.appendChild(carte);
  }

  modal.appendChild(el('div', 'ligne-modal', '— FORGE : PROCHAINE PORTE —'));
  for (const def of PREPARATIONS_MATIERES) {
    const carte = el('div', 'carte');
    const prete = state.save.matieres.preparations[def.id] === true;
    carte.appendChild(el('div', 'carte-nom', `${def.nom}${prete ? ' — PRÊT' : ''}`));
    carte.appendChild(el('div', 'carte-desc', def.desc));
    const btn = el('button', 'btn btn-achat', prete ? 'DÉJÀ PRÊT' : `PRÉPARER : ${texteCout(def.cout)}`);
    btn.disabled = prete || !peutPayerCout(def.cout);
    btn.classList.toggle('affordable', !prete && peutPayerCout(def.cout));
    btn.addEventListener('click', () => {
      if (acheterPreparationMatiere(def.id)) ouvrirAtelierMatieres();
    });
    carte.appendChild(btn);
    modal.appendChild(carte);
  }

  const reparables = PORTES.filter(
    (p) => !p.sansFin && (state.save.swarm.termines[p.niveau] ?? 0) > 0 && !state.save.matieres.portesReparees.includes(p.niveau)
  );
  modal.appendChild(el('div', 'ligne-modal', '— DÉCOR : SOCLES DE PORTES —'));
  if (reparables.length === 0) {
    modal.appendChild(el('div', 'carte-desc', 'Aucun socle à recoudre pour le moment.'));
  } else {
    for (const porte of reparables) {
      const cout = coutReparationPorte(porte.niveau);
      const btn = el('button', 'btn btn-achat', `PORTE ${porte.niveau} — ${porte.nom} : ${texteCout(cout)}`);
      btn.disabled = !peutPayerCout(cout);
      btn.classList.toggle('affordable', peutPayerCout(cout));
      btn.addEventListener('click', () => {
        if (reparerSoclePorte(porte.niveau, cout)) ouvrirAtelierMatieres();
      });
      modal.appendChild(btn);
    }
  }

  const reparees = state.save.matieres.portesReparees.length;
  modal.appendChild(el('div', 'ligne-modal', `SOCLES RECOUSUS : ${reparees}/12`));
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
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

  // la pâtée du chat (plan 18 §6) : le pont pêche ↔ compagnons
  if ((state.save.inventaire.plats['patee'] ?? 0) > 0 && u > 0) {
    const btnPatee = el(
      'button',
      'btn btn-achat affordable',
      `🥫 DONNER UNE PÂTÉE (×${state.save.inventaire.plats['patee']}) — récolte +30 % / 10 min`
    );
    btnPatee.addEventListener('click', () => {
      if (donnerPatee(def.id)) ouvrirAdoption(def);
    });
    modal.appendChild(btnPatee);
  }

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

// ----------------- la Besace, la Cuisine & le Grand Aquarium (plan 18)

function ligneCasePoisson(p: (typeof POISSONS)[number], refresh: () => void): HTMLElement | null {
  const s = stock(p.id);
  if (s.n <= 0 && s.shiny <= 0) return null;
  const carte = el('div', 'carte');
  const haut = el('div', 'carte-haut');
  const icone = iconePoisson(p.id, true);
  const nomEl = el('span', 'carte-nom', ` ${p.nom} ×${s.n}${s.shiny > 0 ? ` (+${s.shiny} ✨)` : ''}`);
  nomEl.style.color = RARETES[p.rarete].couleur;
  haut.append(icone, nomEl, el('span', 'carte-niveau', `${formatNombre(valeurPoisson(p.id, false), 0)} ${THEME.monnaies.popcorn.nom}/u`));
  carte.appendChild(haut);
  const actions = el('div', 'carte-achats');
  if (s.n > 0) {
    const btn1 = el('button', 'btn btn-achat', 'VENDRE 1');
    btn1.addEventListener('click', () => {
      vendrePoissons(p.id, 1, false);
      sons.achat();
      sauvegarder();
      refresh();
    });
    const btnTout = el('button', 'btn btn-achat', `VENDRE ×${s.n}`);
    btnTout.addEventListener('click', () => {
      vendrePoissons(p.id, s.n, false);
      sons.achat();
      sauvegarder();
      refresh();
    });
    const btnHotbar = el('button', 'btn btn-max', 'HOTBAR');
    btnHotbar.addEventListener('click', () => {
      const hotbar = state.save.swarm.hotbar;
      const slot = hotbar.indexOf(null);
      if (slot === -1) {
        ajouterToast('HOTBAR PLEINE — RÉASSIGNE DEPUIS UNE PORTE.');
        return;
      }
      hotbar[slot] = `poisson:${p.id}`;
      sons.achat();
      ajouterToast(`🐟 ${p.nom} → SLOT ${slot + 1} (à croquer en donjon)`);
      sauvegarder();
    });
    actions.append(btn1, btnTout, btnHotbar);
  }
  if (s.shiny > 0) {
    // les shiny se vendent SÉPARÉMENT : jamais bradés par mégarde
    const btnShiny = el('button', 'btn btn-achat', `VENDRE ✨ (${formatNombre(valeurPoisson(p.id, true), 0)})`);
    btnShiny.addEventListener('click', () => {
      vendreShiny(p.id, 1);
      sons.achat();
      sauvegarder();
      refresh();
    });
    actions.appendChild(btnShiny);
  }
  carte.appendChild(actions);
  return carte;
}

let confirmationVente = false;

export function ouvrirBesace(): void {
  ouvrir();
  confirmationVente = false;
  modal.appendChild(el('h2', '', '🎒 LA BESACE'));
  modal.appendChild(
    el('div', 'ligne-modal', `${THEME.monnaies.popcorn.nom} : ${formatNombre(state.save.soldes.popcorn, 0)}`)
  );

  // vente auto (option de confort, plan 18 §2)
  const ligneAuto = el('div', 'ligne-modal');
  const choixAuto = el('select', 'dev-champ') as HTMLSelectElement;
  for (const [valeur, texte] of [
    ['jamais', 'JAMAIS'],
    ['communs', 'LES COMMUNS'],
    ['exposes', 'LES DOUBLONS DÉJÀ EXPOSÉS (5+)'],
  ] as const) {
    const opt = el('option', '', texte) as HTMLOptionElement;
    opt.value = valeur;
    choixAuto.appendChild(opt);
  }
  choixAuto.value = state.save.venteAuto;
  choixAuto.addEventListener('change', () => {
    state.save.venteAuto = choixAuto.value as typeof state.save.venteAuto;
    sons.achat();
    sauvegarder();
  });
  ligneAuto.append(el('span', '', 'VENTE AUTO : '), choixAuto);
  modal.appendChild(ligneAuto);
  modal.appendChild(el('div', 'ligne-modal', '(la vente auto ne touche JAMAIS un shiny)'));

  let vide = true;
  for (const p of POISSONS) {
    const carte = ligneCasePoisson(p, ouvrirBesace);
    if (carte) {
      vide = false;
      modal.appendChild(carte);
    }
  }
  if (vide) modal.appendChild(el('p', 'rebirb-explication', 'La besace est vide. Le ponton t’attend. 🎣'));

  // TOUT VENDRE : total affiché AVANT confirmation, shiny exclus
  const total = totalToutVendre();
  if (total > 0) {
    const btnTout = el('button', 'btn btn-modal btn-danger', `TOUT VENDRE (+${formatNombre(total, 0)} ${THEME.monnaies.popcorn.nom} — les ✨ restent)`);
    btnTout.addEventListener('click', () => {
      if (!confirmationVente) {
        confirmationVente = true;
        btnTout.textContent = `SÛRE ? +${formatNombre(total, 0)} ${THEME.monnaies.popcorn.nom} — CLIQUE ENCORE`;
        return;
      }
      toutVendre();
      ouvrirBesace();
    });
    modal.appendChild(btnTout);
  }

  // les plats cuisinés
  const plats = Object.entries(state.save.inventaire.plats).filter(([, n]) => n > 0);
  if (plats.length > 0) {
    modal.appendChild(el('div', 'ligne-modal', '— PLATS —'));
    for (const [id, n] of plats) {
      const plat = platDef(id);
      if (!plat) continue;
      const carte = el('div', 'carte');
      const haut = el('div', 'carte-haut');
      haut.append(el('span', 'carte-nom', `${plat.icone} ${plat.nom} ×${n}`));
      carte.appendChild(haut);
      carte.appendChild(el('div', 'carte-desc', plat.description));
      if (id !== 'patee') {
        const btn = el('button', 'btn btn-max', 'HOTBAR');
        btn.addEventListener('click', () => {
          const hotbar = state.save.swarm.hotbar;
          const slot = hotbar.indexOf(null);
          if (slot === -1) {
            ajouterToast('HOTBAR PLEINE — RÉASSIGNE DEPUIS UNE PORTE.');
            return;
          }
          hotbar[slot] = id;
          sons.achat();
          ajouterToast(`${plat.icone} ${plat.nom} → SLOT ${slot + 1}`);
          sauvegarder();
        });
        carte.appendChild(btn);
      }
      modal.appendChild(carte);
    }
  }

  const versCuisine = el('button', 'btn btn-modal', '🍳 LA CUISINE DE BRIOCHE →');
  versCuisine.addEventListener('click', ouvrirCuisine);
  modal.appendChild(versCuisine);
  const fermer = el('button', 'btn btn-modal', 'FERMER (I)');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function basculerBesace(): void {
  if (modalOuvert()) fermerModal();
  else ouvrirBesace();
}

function texteIngredients(ing: { communs?: number; rares?: number; espece?: string; shiny?: number; brindilles?: number }): string {
  const morceaux: string[] = [];
  if (ing.communs) morceaux.push(`${ing.communs} commun${ing.communs > 1 ? 's' : ''}`);
  if (ing.rares) morceaux.push(`${ing.rares} rare${ing.rares > 1 ? 's' : ''}`);
  if (ing.espece) morceaux.push(`1 ${POISSONS.find((p) => p.id === ing.espece)?.nom ?? ing.espece}`);
  if (ing.shiny) morceaux.push(`${ing.shiny} SHINY ✨ (au choix)`);
  if (ing.brindilles) morceaux.push(`${ing.brindilles} brindilles`);
  return morceaux.join(' + ');
}

export function ouvrirCuisine(): void {
  ouvrir();
  modal.appendChild(el('h2', '', '🍳 LA CUISINE DE BRIOCHE'));
  modal.appendChild(
    el('p', 'rebirb-explication', '« ON NE RECOUD RIEN LE VENTRE VIDE. » Les recettes se débloquent avec le Mikudex.')
  );
  const decouvertes = progressionDex().decouvertes;
  for (const plat of PLATS) {
    const carte = el('div', 'carte');
    const haut = el('div', 'carte-haut');
    const verrouille = decouvertes < plat.deblocageDex;
    haut.append(
      el('span', 'carte-nom', verrouille ? '🔒 ? ? ?' : `${plat.icone} ${plat.nom}`),
      el('span', 'carte-niveau', verrouille ? `MIKUDEX ${plat.deblocageDex}/16` : `×${state.save.inventaire.plats[plat.id] ?? 0}`)
    );
    carte.appendChild(haut);
    if (verrouille) {
      modal.appendChild(carte);
      continue;
    }
    carte.appendChild(el('div', 'carte-desc', plat.description));
    carte.appendChild(el('div', 'carte-desc carte-verrou', plat.commentaire));
    const faisable = peutCuisiner(plat.ingredients);
    const btn = el('button', 'btn btn-achat', `CUISINER : ${texteIngredients(plat.ingredients)}`);
    btn.disabled = !faisable;
    btn.classList.toggle('affordable', faisable);
    btn.addEventListener('click', () => {
      if (plat.ingredients.shiny) {
        // sacrifier un shiny mérite une double confirmation
        if (!btn.dataset.arme) {
          btn.dataset.arme = '1';
          btn.textContent = 'UN SHINY VA Y PASSER — CLIQUE ENCORE';
          return;
        }
      }
      if (cuisiner(plat.id)) ouvrirCuisine();
    });
    carte.appendChild(btn);
    modal.appendChild(carte);
  }
  const versBesace = el('button', 'btn btn-modal', '← LA BESACE');
  versBesace.addEventListener('click', ouvrirBesace);
  modal.appendChild(versBesace);
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function ouvrirAquarium(): void {
  ouvrir();
  const dons = nbDonsAquarium();
  modal.appendChild(el('h2', '', `🏛 LE GRAND AQUARIUM — ${dons}/${POISSONS.length}`));
  modal.appendChild(
    el(
      'p',
      'rebirb-explication',
      'Donner un spécimen le CONSOMME — pour toujours, pour la gloire. La plaque garde ton record de taille. +2 plumes tous les 4 dons.'
    )
  );
  for (const p of POISSONS) {
    const expose = state.save.aquarium[p.id];
    const s = stock(p.id);
    const ligne = el('div', 'ligne-dex');
    ligne.appendChild(iconePoisson(p.id, !!expose));
    const infos = el('div', 'dex-infos');
    const nom = el('div', 'dex-nom', expose ? `${expose.shiny ? '✨ ' : ''}${p.nom}` : '— BASSIN VIDE —');
    nom.style.color = expose ? RARETES[p.rarete].couleur : '#8a8a96';
    infos.appendChild(nom);
    const record = state.save.peche.dex[p.id]?.tailleRecord ?? 0;
    infos.appendChild(
      el('div', 'dex-detail', expose ? `PLAQUE : ${record > 0 ? `record ${record} cm` : 'sans mesure'}` : p.nom in state.save.peche.dex ? p.nom : '? ? ?')
    );
    ligne.appendChild(infos);
    const actions = el('div', 'carte-achats');
    if (!expose && s.n > 0) {
      const btn = el('button', 'btn btn-achat affordable', 'DONNER (consomme 1)');
      btn.addEventListener('click', () => {
        donnerAquarium(p.id, false);
        ouvrirAquarium();
      });
      actions.appendChild(btn);
    }
    if (s.shiny > 0 && (!expose || !expose.shiny)) {
      const btn = el('button', 'btn btn-achat', expose ? 'REMPLACER PAR UN ✨' : 'DONNER UN ✨');
      btn.addEventListener('click', () => {
        if (!btn.dataset.arme) {
          btn.dataset.arme = '1';
          btn.textContent = 'UN SHINY, POUR TOUJOURS ? CLIQUE ENCORE';
          return;
        }
        donnerAquarium(p.id, true);
        ouvrirAquarium();
      });
      actions.appendChild(btn);
    }
    ligne.appendChild(actions);
    modal.appendChild(ligne);
  }
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

// ------------------------------ l'Atelier (plan 15 §7, le moment cadeau)

/** Le fond de l'atelier : établi, mannequin, bocaux de boutons —
 *  procédural, dans le style des décors actuels. */
function fondAtelier(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 200;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2c2337';
  ctx.fillRect(0, 0, 480, 200);
  ctx.fillStyle = '#3a2d47';
  ctx.fillRect(0, 150, 480, 50); // le sol
  // l'établi
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(40, 110, 160, 12);
  ctx.fillRect(50, 122, 10, 40);
  ctx.fillRect(180, 122, 10, 40);
  // le mannequin de couture
  ctx.fillStyle = '#c8ccd4';
  ctx.fillRect(300, 70, 26, 50);
  ctx.fillStyle = '#8a8296';
  ctx.fillRect(310, 120, 6, 36);
  ctx.fillRect(298, 156, 30, 6);
  // les bocaux de boutons
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#5ab4d4';
    ctx.fillRect(70 + i * 34, 88, 20, 22);
    ctx.fillStyle = ['#f2d16b', '#ff8ac2', '#7dbb5c'][i];
    ctx.fillRect(74 + i * 34, 96, 12, 12);
  }
  // les fils qui pendent du plafond
  ctx.strokeStyle = '#f2d16b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(60 + i * 70, 0);
    ctx.lineTo(60 + i * 70 + 8, 40 + (i % 3) * 14);
    ctx.stroke();
  }
  return c;
}

const CROQUIS = [
  { titre: 'LE PREMIER CROQUIS', texte: 'Une tapisserie immense : prairies, scène, forêt, mine, désert.\nLE MONDE. Tout était donc… cousu.' },
  { titre: 'LE DEUXIÈME CROQUIS', texte: 'Une poupée aux cheveux roux, des ciseaux à la main.\nLes patrons de CHLÉATOUNE. C’était donc elle, depuis le début.' },
  { titre: 'LE TROISIÈME CROQUIS', texte: 'Un garde du corps aux poings d’acier, jamais cousu.\n« Pour veiller sur elle, un jour. » — note en marge.' },
];

let etapeAtelier = 0;

export function ouvrirAtelier(premiere: boolean): void {
  ouvrir();
  modal.appendChild(el('h2', '', '🧵 L’ATELIER'));
  const fond = fondAtelier();
  fond.style.maxWidth = '100%';
  modal.appendChild(fond);

  if (premiere && etapeAtelier < CROQUIS.length) {
    // les trois croquis épinglés, dans l'ordre
    const croquis = CROQUIS[etapeAtelier];
    modal.appendChild(el('div', 'ligne-modal', `${croquis.titre} (${etapeAtelier + 1}/3)`));
    modal.appendChild(el('p', 'rebirb-explication', croquis.texte));
    const btn = el('button', 'btn btn-modal affordable', etapeAtelier < 2 ? 'CROQUIS SUIVANT →' : 'LA LETTRE, SUR L’ÉTABLI…');
    btn.addEventListener('click', () => {
      etapeAtelier += 1;
      ouvrirAtelier(true);
    });
    modal.appendChild(btn);
    return;
  }

  // la lettre, page par page (⚠ THEME.lettreAtelier : placeholder à
  // écrire à la main — jamais générée)
  const pages = THEME.lettreAtelier;
  const page = Math.max(0, Math.min(etapeAtelier - CROQUIS.length, pages.length - 1));
  modal.appendChild(el('div', 'ligne-modal', `LA LETTRE — PAGE ${page + 1}/${pages.length}`));
  const lettre = el('div', 'lettre-atelier');
  for (const ligne of pages[page]) lettre.appendChild(el('div', 'ligne-chateau', ligne || ' '));
  modal.appendChild(lettre);

  if (page + 1 < pages.length) {
    const btn = el('button', 'btn btn-modal affordable', 'TOURNER LA PAGE →');
    btn.addEventListener('click', () => {
      etapeAtelier = CROQUIS.length + page + 1;
      ouvrirAtelier(premiere);
    });
    modal.appendChild(btn);
  } else {
    const btn = el('button', 'btn btn-modal affordable', premiere ? 'REPLIER LA LETTRE, DOUCEMENT.' : 'FERMER');
    btn.addEventListener('click', () => {
      etapeAtelier = 0;
      fermerModal();
      if (premiere) {
        signalerActionFilRouge('atelier');
        ajouterToast('🧵 L’ATELIER RESTERA OUVERT. POUR LA RELIRE.');
      }
    });
    modal.appendChild(btn);
  }
}

// --------------------- le Livre de quêtes (bouton 📖 en bas à gauche)

export function ouvrirJournal(): void {
  ouvrir();
  modal.appendChild(el('h2', '', '📖 LE LIVRE DE QUÊTES'));

  // le Fil Rouge (plan 15)
  modal.appendChild(el('div', 'ligne-modal', '— 🧵 LE FIL ROUGE —'));
  const chapitre = chapitreCourant();
  const ligne = ligneFilRouge();
  if (ligne && chapitre) {
    modal.appendChild(el('div', 'ligne-modal', `CHAPITRE ${chapitre.numero} : ${chapitre.titre}`));
    modal.appendChild(el('div', 'ligne-modal', `➤ ${ligne.replace('🧵 ', '').replace(/^CH\. \d+ — /, '')}`));
    const progres = progresCollecte();
    if (progres > 0 && progres < 1) {
      const barre = el('div', 'barre-parchemin');
      const rempli = el('div', 'barre-parchemin-remplie');
      rempli.style.width = `${Math.round(progres * 100)}%`;
      barre.appendChild(rempli);
      modal.appendChild(barre);
    }
    if (state.save.filRouge.bobines.length > 0) {
      modal.appendChild(
        el('div', 'ligne-modal', `BOBINES : ${state.save.filRouge.bobines.length}/6 sur la porte du château`)
      );
    }
  } else if (state.save.filRouge.chapitre > 7) {
    modal.appendChild(el('div', 'ligne-modal', 'L’ATELIER EST OUVERT. LA TAPISSERIE TIENT. ✔'));
  } else {
    modal.appendChild(el('div', 'ligne-modal', 'Rien pour l’instant… le monde murmurera quand il sera prêt.'));
  }

  // la chasse au trésor (plan 16 §4)
  modal.appendChild(el('div', 'ligne-modal', '— 🗺 CHASSE AU TRÉSOR —'));
  const indice = indiceCourant();
  if (indice) {
    const active = chasseActive();
    modal.appendChild(el('div', 'ligne-modal', `ÉTAPE ${(active?.etape ?? 0) + 1}/3`));
    modal.appendChild(el('div', 'ligne-modal', indice.replace('🗺 ', '')));
  } else {
    modal.appendChild(
      el('div', 'ligne-modal', 'Aucune carte en cours. La Sphinge des Sables en vend, au désert doré.')
    );
  }

  // les quêtes du marchand (désert)
  if (state.save.quetes.actives.length > 0 && state.save.desert['d_marchand']) {
    modal.appendChild(el('div', 'ligne-modal', '— ✦ QUÊTES DU MARCHAND —'));
    for (const q of state.save.quetes.actives) {
      const fini = q.progres >= q.objectif;
      modal.appendChild(
        el(
          'div',
          'ligne-modal',
          `${fini ? '✔' : '•'} ${queteTexte(q)} — ${formatNombre(Math.min(q.progres, q.objectif), 0)}/${formatNombre(q.objectif, 0)}${fini ? ' (à récupérer !)' : ''}`
        )
      );
    }
  }

  const fermer = el('button', 'btn btn-modal', 'FERMER (J)');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function basculerJournal(): void {
  if (modalOuvert()) fermerModal();
  else ouvrirJournal();
}

// ------------------------- Calendrier, Sphinge & Succès (plan 16)

export function ouvrirCalendrier(): void {
  ouvrir();
  modal.appendChild(el('h2', '', '🗓 LE CALENDRIER DE L’ATELIER'));
  const bonus = bonusDuJour();
  modal.appendChild(el('div', 'ligne-modal', `AUJOURD'HUI : ${bonus.nom} — ${bonus.description}`));
  if (state.save.calendrier.serie > 0) {
    modal.appendChild(el('div', 'ligne-modal', `SÉRIE D'OFFRANDES : ${state.save.calendrier.serie} 🕯`));
  }
  const offrande = offrandeDuJour();
  const nomMonnaie =
    offrande.monnaie === 'dore'
      ? THEME.dore.pluriel
      : offrande.monnaie === 'poissons'
        ? 'POISSONS COMMUNS (besace)'
        : THEME.monnaies[offrande.monnaie].nom;
  if (offrandeDisponible()) {
    const btn = el(
      'button',
      'btn btn-modal affordable',
      `OFFRIR ${formatNombre(offrande.quantite, 0)} ${nomMonnaie} → +${RECOMPENSE_OFFRANDE} ${THEME.dore.pluriel}`
    );
    btn.addEventListener('click', () => {
      if (faireOffrande()) ouvrirCalendrier();
      else {
        sons.refus();
        ajouterToast('PAS ASSEZ POUR L’OFFRANDE… REVIENS PLUS RICHE !');
      }
    });
    modal.appendChild(btn);
  } else {
    modal.appendChild(el('div', 'ligne-modal', 'OFFRANDE DU JOUR DÉJÀ FAITE ✔ — À DEMAIN !'));
  }
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

const COUT_CARTE = 120;
const COUT_INDICE = 60;

export function ouvrirSphinge(): void {
  ouvrir();
  modal.appendChild(el('h2', '', '🐈 LA SPHINGE DES SABLES'));
  modal.appendChild(
    el('p', 'rebirb-explication', '« Des trésors dorment sous le sable, petite poupée. Je vends les questions ; à toi les réponses. »')
  );
  const active = chasseActive();
  if (active) {
    modal.appendChild(el('div', 'ligne-modal', `CHASSE EN COURS — ÉTAPE ${active.etape + 1}/3`));
    modal.appendChild(el('div', 'ligne-modal', active.def.etapes[active.etape].indice));
  } else {
    const btnCarte = el('button', 'btn btn-modal', `CARTE AU TRÉSOR — ${COUT_CARTE} ${THEME.dore.pluriel}`);
    btnCarte.disabled = state.save.soldeDore < COUT_CARTE;
    btnCarte.classList.toggle('affordable', state.save.soldeDore >= COUT_CARTE);
    btnCarte.addEventListener('click', () => {
      if (state.save.soldeDore < COUT_CARTE) return;
      state.save.soldeDore -= COUT_CARTE;
      const def = acheterChasse();
      sons.achat();
      ajouterToast(`🗺 ${def.etapes[0].indice}`);
      fermerModal();
    });
    modal.appendChild(btnCarte);
    modal.appendChild(
      el('div', 'ligne-modal', '(une seule chasse à la fois — en racheter une remplace la carte)')
    );
  }
  const btnIndice = el('button', 'btn btn-modal', `INDICE DE FIL SECRET — ${COUT_INDICE} ${THEME.dore.pluriel}`);
  btnIndice.disabled = state.save.soldeDore < COUT_INDICE;
  btnIndice.classList.toggle('affordable', state.save.soldeDore >= COUT_INDICE);
  btnIndice.addEventListener('click', () => {
    if (state.save.soldeDore < COUT_INDICE) return;
    const zone = indiceFilSecret();
    if (!zone) {
      ajouterToast('« TU AS DÉJÀ TIRÉ TOUS LES FILS, PETITE POUPÉE. »');
      return;
    }
    state.save.soldeDore -= COUT_INDICE;
    sons.achat();
    ajouterToast(`🐈 « UN FIL DÉPASSE ENCORE DU CÔTÉ DE ${zone}… »`);
    sauvegarder();
    fermerModal();
  });
  modal.appendChild(btnIndice);
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function ouvrirSucces(): void {
  ouvrir();
  const progression = progressionSucces();
  modal.appendChild(
    el('h2', '', `🏆 SUCCÈS — ${progression.faits}/${progression.total} (${Math.round(progression.pct * 100)} %)`)
  );
  for (const categorie of CATEGORIES_SUCCES) {
    const liste = SUCCES.filter((s) => s.categorie === categorie.id);
    modal.appendChild(el('div', 'ligne-modal', `— ${categorie.nom} —`));
    for (const def of liste) {
      const fait = state.save.succes[def.id] === true;
      if (def.cache && !fait) continue; // masqué : spoiler ou plan absent
      const ligne = el('div', 'ligne-dex');
      const infos = el('div', 'dex-infos');
      const nom = el('div', 'dex-nom', `${fait ? '★' : '☆'} ${def.nom}`);
      nom.style.color = fait ? '#f2d16b' : '#8a8a96';
      infos.appendChild(nom);
      let detail = def.description;
      if (!fait) {
        const progres = def.condition(state.save);
        if (typeof progres === 'number' && progres > 0) {
          detail += ` (${Math.round(progres * 100)} %)`;
        }
      }
      if (def.recompense?.titre && fait) detail += ` → titre « ${def.recompense.titre} »`;
      infos.appendChild(el('div', 'dex-detail', detail));
      ligne.appendChild(infos);
      modal.appendChild(ligne);
    }
  }
  const fermer = el('button', 'btn btn-modal', 'FERMER');
  fermer.addEventListener('click', fermerModal);
  modal.appendChild(fermer);
}

export function ouvrirProfil(): void {
  ouvrir();
  modal.appendChild(el('h2', '', profilActif()?.nom ?? 'PROFIL'));
  // le titre actif (plan 16 §2), sélectionnable parmi les débloqués
  if (state.save.titres.length > 0) {
    const ligne = el('div', 'ligne-modal');
    const choix = el('select', 'dev-champ') as HTMLSelectElement;
    for (const titre of state.save.titres) {
      const opt = el('option', '', `« ${titre} »`) as HTMLOptionElement;
      opt.value = titre;
      choix.appendChild(opt);
    }
    choix.value = state.save.titreActif ?? state.save.titres[0];
    choix.addEventListener('change', () => {
      state.save.titreActif = choix.value;
      sons.achat();
      sauvegarder();
    });
    ligne.append(el('span', '', 'TITRE : '), choix);
    modal.appendChild(ligne);
  }
  const btnSucces = el('button', 'btn btn-modal', '🏆 VOIR LES SUCCÈS');
  btnSucces.addEventListener('click', ouvrirSucces);
  modal.appendChild(btnSucces);

  const minutes = Math.floor(state.save.tempsJeu / 60);
  const heures = Math.floor(minutes / 60);
  const temps = heures > 0 ? `${heures} H ${minutes % 60} MIN` : `${minutes} MIN`;

  const dex = progressionDex();
  const succes = progressionSucces();
  const lignes = [
    `TEMPS DE JEU : ${temps}`,
    `NIVEAU : ${state.save.heros.niveau}`,
    `SUCCÈS : ${succes.faits}/${succes.total}`,
    ...(state.save.filRouge.bobines.length > 0
      ? [`🧵 FIL ROUGE : CH. ${Math.min(state.save.filRouge.chapitre, 7)} — BOBINES ${state.save.filRouge.bobines.length}/6`]
      : []),
    ...(state.save.drapeaux.aiguilleCouturier ? ['🪡 L’AIGUILLE DU COUTURIER (objet d’histoire)'] : []),
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
