// Le créateur / sélecteur de personnage : au premier lancement on crée
// son personnage (nom + skin), ensuite on peut en changer ou en créer
// d'autres — chacun garde sa propre progression.

import { SKINS } from '../data/skins';
import { el } from '../core/utils';
import {
  creerProfil,
  definirActif,
  listeProfils,
  profilActif,
  resumeProfil,
  supprimerProfil,
} from '../systems/profils';
import { cloudDisponible, tirerCloud } from '../systems/cloud';
import { verrouillerSauvegarde } from '../systems/save';

let ecran: HTMLElement;

export function initCreation(): void {
  ecran = document.getElementById('ecran-perso')!;
  if (!profilActif()) {
    if (listeProfils().length > 0) ouvrirSelection(false);
    else ouvrirCreation(false);
  }
}

function afficher(): void {
  ecran.classList.remove('cache');
}

function fermer(): void {
  ecran.classList.add('cache');
}

function jouer(id: string): void {
  verrouillerSauvegarde(); // l'état en mémoire ne doit pas fuiter vers ce profil
  definirActif(id);
  location.reload(); // reboot propre avec le bon skin et la bonne sauvegarde
}

export function ouvrirSelection(fermable = true): void {
  ecran.textContent = '';
  afficher();
  ecran.appendChild(el('h1', '', 'QUI JOUE ?'));

  const listeEl = el('div', 'liste-persos');
  for (const profil of listeProfils()) {
    const carte = el('div', 'carte-perso');
    const image = new Image();
    const skin = SKINS.find((s) => s.id === profil.skin) ?? SKINS[0];
    image.src = `assets/${skin.prefixe}_face_idle.png`;
    image.className = 'perso-image';
    carte.appendChild(image);
    carte.appendChild(el('div', 'perso-nom', profil.nom));
    carte.appendChild(el('div', 'perso-resume', resumeProfil(profil.id)));
    const boutons = el('div', 'carte-achats');
    const btnJouer = el('button', 'btn btn-achat affordable', 'JOUER');
    btnJouer.addEventListener('click', () => jouer(profil.id));
    const btnSuppr = el('button', 'btn btn-max btn-danger', '✕');
    let arme = false;
    btnSuppr.addEventListener('click', () => {
      if (!arme) {
        arme = true;
        btnSuppr.textContent = 'SÛR·E ?';
        window.setTimeout(() => {
          arme = false;
          btnSuppr.textContent = '✕';
        }, 3000);
        return;
      }
      supprimerProfil(profil.id);
      ouvrirSelection(fermable);
    });
    boutons.append(btnJouer, btnSuppr);
    carte.appendChild(boutons);
    listeEl.appendChild(carte);
  }
  ecran.appendChild(listeEl);

  const btnNouveau = el('button', 'btn btn-modal', '+ NOUVEAU PERSONNAGE');
  btnNouveau.addEventListener('click', () => ouvrirCreation(true));
  ecran.appendChild(btnNouveau);

  // Récupération d'un personnage via son code cloud (autre appareil)
  if (cloudDisponible()) {
    const ligne = el('div', 'carte-achats');
    const champCode = el('input') as HTMLInputElement;
    champCode.className = 'champ-nom';
    champCode.placeholder = 'CODE CLOUD (CHLEA-…)';
    champCode.maxLength = 24;
    const btnCloud = el('button', 'btn btn-modal', 'RÉCUPÉRER ☁');
    btnCloud.addEventListener('click', async () => {
      const code = champCode.value.trim().toUpperCase();
      if (!code) return;
      btnCloud.textContent = '…';
      const donnees = await tirerCloud(code);
      if (!donnees) {
        btnCloud.textContent = 'INTROUVABLE…';
        window.setTimeout(() => (btnCloud.textContent = 'RÉCUPÉRER ☁'), 2500);
        return;
      }
      const profil = creerProfil('RÉCUPÉRÉ', SKINS[0].id, code);
      localStorage.setItem(`birblike_save_${profil.id}`, donnees);
      jouer(profil.id);
    });
    ligne.append(champCode, btnCloud);
    ecran.appendChild(ligne);
  }

  if (fermable && profilActif()) {
    const btnRetour = el('button', 'btn btn-modal', 'RETOUR AU JEU');
    btnRetour.addEventListener('click', fermer);
    ecran.appendChild(btnRetour);
  }
}

export function ouvrirCreation(retourPossible: boolean): void {
  ecran.textContent = '';
  afficher();
  ecran.appendChild(el('h1', '', 'CRÉE TON PERSONNAGE'));

  const champNom = el('input') as HTMLInputElement;
  champNom.className = 'champ-nom';
  champNom.maxLength = 16;
  champNom.placeholder = 'TON NOM…';
  ecran.appendChild(champNom);

  ecran.appendChild(el('div', 'perso-resume', 'CHOISIS TON APPARENCE :'));
  let skinChoisi = SKINS[0].id;
  const listeSkins = el('div', 'liste-persos');
  const cartes: HTMLElement[] = [];
  for (const skin of SKINS) {
    const carte = el('div', 'carte-perso selectionnable');
    const image = new Image();
    image.src = `assets/${skin.prefixe}_face_idle.png`;
    image.className = 'perso-image';
    carte.appendChild(image);
    carte.appendChild(el('div', 'perso-nom', skin.nom));
    carte.addEventListener('click', () => {
      skinChoisi = skin.id;
      cartes.forEach((c) => c.classList.remove('choisi'));
      carte.classList.add('choisi');
    });
    if (skin.id === skinChoisi) carte.classList.add('choisi');
    cartes.push(carte);
    listeSkins.appendChild(carte);
  }
  ecran.appendChild(listeSkins);

  const btnCreer = el('button', 'btn btn-modal affordable', 'C’EST PARTI !');
  btnCreer.addEventListener('click', () => {
    const profil = creerProfil(champNom.value, skinChoisi);
    jouer(profil.id);
  });
  ecran.appendChild(btnCreer);

  if (retourPossible && listeProfils().length > 0) {
    const btnRetour = el('button', 'btn btn-modal', 'RETOUR');
    btnRetour.addEventListener('click', () => ouvrirSelection());
    ecran.appendChild(btnRetour);
  }
  champNom.focus();
}
