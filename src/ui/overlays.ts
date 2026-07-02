// Overlays modaux : menu Échap (volume, sauvegarde, export/import, reset)
// et profil (plan 07, étape 4 ; plan 08, étape 6 pour la fiche de stats).

import { MONNAIES, THEME } from '../data/config';
import { zonesDebloquees } from '../data/progression';
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

  // Code de synchro cloud (une fois le jeu déployé sur Vercel)
  const code = codeSync();
  if (code) {
    modal.appendChild(
      el(
        'div',
        'ligne-modal',
        `CODE CLOUD : ${code}${cloudDisponible() ? ' ☁' : ' (hors-ligne)'}`
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
    `MEILLEUR ÉTAGE D'EXPÉDITION : ${state.save.meilleurEtage}`,
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
