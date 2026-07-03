// L'accueil du jeu, façon MMO : dès la première ouverture on peut SOIT
// créer un personnage, SOIT se connecter avec un code pour reprendre
// une aventure commencée ailleurs. Chaque personnage garde sa propre
// progression, et son code de connexion la suit partout.

import { SKINS } from '../data/skins';
import { el } from '../core/utils';
import {
  creerProfil,
  definirActif,
  listeProfils,
  profilActif,
  resumeProfil,
  supprimerProfil,
  type Profil,
} from '../systems/profils';
import { verrouillerSauvegarde } from '../systems/save';
import { connexionCloud } from '../systems/cloud';

let ecran: HTMLElement;

export function initCreation(): void {
  ecran = document.getElementById('ecran-perso')!;
  if (!profilActif()) {
    if (listeProfils().length > 0) ouvrirSelection(false);
    else ouvrirAccueil();
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

/** Premier écran : nouvelle aventure, ou connexion avec un code. */
export function ouvrirAccueil(): void {
  ecran.textContent = '';
  afficher();
  ecran.appendChild(el('h1', '', '✦ CHLÉATOUNE ✦'));
  ecran.appendChild(el('div', 'perso-resume', 'BIENVENUE ! QUE VEUX-TU FAIRE ?'));

  const btnNouveau = el('button', 'btn btn-modal affordable', 'CRÉER UN PERSONNAGE');
  btnNouveau.addEventListener('click', () => ouvrirCreation(true));
  ecran.appendChild(btnNouveau);

  const btnConnexion = el('button', 'btn btn-modal', 'SE CONNECTER AVEC UN CODE ☁');
  btnConnexion.addEventListener('click', () => ouvrirConnexion());
  ecran.appendChild(btnConnexion);

  ecran.appendChild(
    el('div', 'perso-resume', 'Déjà une aventure sur un autre appareil ?\nTon code de connexion (menu Échap) la ramène ici.')
  );
}

/** Connexion : le code restaure le personnage complet (nom, skin, partie). */
export function ouvrirConnexion(): void {
  ecran.textContent = '';
  afficher();
  ecran.appendChild(el('h1', '', 'SE CONNECTER'));
  ecran.appendChild(el('div', 'perso-resume', 'ENTRE LE CODE DE CONNEXION DU PERSONNAGE (MENU ÉCHAP SUR L’AUTRE APPAREIL)'));

  const champCode = el('input') as HTMLInputElement;
  champCode.className = 'champ-nom';
  champCode.placeholder = 'CHLEA-…';
  champCode.maxLength = 24;
  ecran.appendChild(champCode);

  const statut = el('div', 'perso-resume', '');
  const btnValider = el('button', 'btn btn-modal affordable', 'SE CONNECTER');
  btnValider.addEventListener('click', async () => {
    const code = champCode.value.trim().toUpperCase();
    if (!code) return;

    // déjà connecté sur cet appareil ? on reprend ce profil, tout simplement
    const existant = listeProfils().find((p) => p.codeSync === code);
    if (existant) {
      jouer(existant.id);
      return;
    }

    btnValider.textContent = 'CONNEXION…';
    btnValider.disabled = true;
    const personnage = await connexionCloud(code);
    if (!personnage) {
      btnValider.textContent = 'SE CONNECTER';
      btnValider.disabled = false;
      statut.textContent = 'CODE INTROUVABLE (OU CLOUD INJOIGNABLE). VÉRIFIE-LE ET RÉESSAIE.';
      return;
    }
    const profil = creerProfil(personnage.nom, personnage.skin, code);
    localStorage.setItem(`birblike_save_${profil.id}`, personnage.donnees);
    jouer(profil.id);
  });
  champCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnValider.click();
  });
  ecran.appendChild(btnValider);
  ecran.appendChild(statut);

  const btnRetour = el('button', 'btn btn-modal', 'RETOUR');
  btnRetour.addEventListener('click', () =>
    listeProfils().length > 0 ? ouvrirSelection(!!profilActif()) : ouvrirAccueil()
  );
  ecran.appendChild(btnRetour);
  champCode.focus();
}

/** Après la création : on affiche le code UNE FOIS, bien en évidence. */
function ecranCode(profil: Profil): void {
  ecran.textContent = '';
  afficher();
  ecran.appendChild(el('h1', '', `BIENVENUE, ${profil.nom} !`));
  const carte = el('div', 'carte-perso');
  carte.appendChild(el('div', 'perso-resume', 'TON CODE DE CONNEXION :'));
  const code = el('div', 'perso-nom', profil.codeSync ?? '');
  code.style.fontSize = '14px';
  carte.appendChild(code);
  carte.appendChild(
    el('div', 'perso-resume', 'NOTE-LE PRÉCIEUSEMENT : il permet de reprendre\nton aventure sur n’importe quel appareil.\n(Il reste visible dans le menu ÉCHAP.)')
  );
  ecran.appendChild(carte);
  const btnJouer = el('button', 'btn btn-modal affordable', 'JOUER !');
  btnJouer.addEventListener('click', () => jouer(profil.id));
  ecran.appendChild(btnJouer);
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

  const ligne = el('div', 'carte-achats');
  const btnNouveau = el('button', 'btn btn-modal', '+ NOUVEAU PERSONNAGE');
  btnNouveau.addEventListener('click', () => ouvrirCreation(true));
  const btnConnexion = el('button', 'btn btn-modal', 'SE CONNECTER ☁');
  btnConnexion.addEventListener('click', () => ouvrirConnexion());
  ligne.append(btnNouveau, btnConnexion);
  ecran.appendChild(ligne);

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
    ecranCode(profil); // on montre le code de connexion avant de jouer
  });
  ecran.appendChild(btnCreer);

  const btnRetour = el('button', 'btn btn-modal', 'RETOUR');
  btnRetour.addEventListener('click', () =>
    listeProfils().length > 0 && retourPossible ? ouvrirSelection(!!profilActif()) : ouvrirAccueil()
  );
  ecran.appendChild(btnRetour);
  champNom.focus();
}
