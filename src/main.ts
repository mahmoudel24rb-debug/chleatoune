// Point d'entrée : câblage de tous les modules + update/render.
// Trois modes de jeu : le monde (zones), l'expédition (combat à biomes)
// et la pêche (vue de côté).

import './style.css';
import { CONFIG } from './data/config';
import { autoDebloque } from './data/progression';
import { RARETES } from './data/poissons';
import { initCanvas } from './core/canvas';
import { demarrerBoucle } from './core/loop';
import { camera, centrerCamera, suivreCamera } from './core/camera';
import { initInput, surTouche } from './core/input';
import { jeu } from './core/mode';
import { state } from './core/state';
import { dist } from './core/utils';
import { decorExpedition, decorZone } from './core/decor';
import {
  SPRITES_DOUGHCAT,
  SPRITES_HEROINE,
  SPRITES_MONNAIES,
  SPRITES_MONSTRES,
  SPRITES_YUUMI,
  SPRITE_SMISKI_DORE,
  TAILLE_OBJET,
} from './core/sprites';
import { SPRITES_COFFRES } from './core/structures';
import { birb, centreBirb, majBirb } from './entities/birb';
import type { Compagnon } from './systems/compagnons';
import { getChats, getYuumi, majCompagnons } from './systems/compagnons';
import { entitesZoneActive, majSpawner } from './systems/spawner';
import { crediter, encaisserCollectible } from './systems/economy';
import { enExpedition, getCoffres, getEtage, getMonstres, majCombat } from './systems/combat';
import {
  actionPeche,
  appatEquipe,
  canneEquipee,
  getPeche,
  majPeche,
  majPecheurs,
  positionBouchon,
  sortirPeche,
  surLeSpot,
} from './systems/peche';
import { appliquerGainsHorsLigne } from './systems/nid';
import { amenagerCartes } from './systems/carte';
import {
  activerInteraction,
  dessinerInteractifs,
  initInteractions,
  majInteractions,
} from './systems/interactions';
import { garantirQuetes } from './systems/quetes';
import { dessinerFx, majFx } from './systems/fx';
import { initAudio } from './systems/audio';
import { charger, initAutosave, sauvegarder } from './systems/save';
import { basculerAuto, initHud, majHud } from './ui/hud';
import { construirePanneau, majPanneau } from './ui/panel';
import {
  basculerBoutiquePeche,
  basculerMikudex,
  basculerParametres,
  fermerModal,
  initOverlays,
  modalOuvert,
  ouvrirProfil,
} from './ui/overlays';
import { ajouterToast } from './ui/toasts';
import { initCreation } from './ui/creation';
import { migrerVersProfils } from './systems/profils';
import { cloudDisponible, initBeaconCloud, initCloud, majCloud, pousserCloud } from './systems/cloud';

// ---------------------------------------------------------------- setup
migrerVersProfils(); // l'ancienne sauvegarde unique devient un personnage
charger();
garantirQuetes();
initInput();
initAudio();
initAutosave();

const ecran = initCanvas(document.querySelector<HTMLCanvasElement>('#game-area')!);
initOverlays();
initHud();
initInteractions();
amenagerCartes();
construirePanneau();
centrerCamera(birb.x, birb.y, ecran.largeur, ecran.hauteur);
initCreation(); // premier lancement : écran d'accueil (créer / se connecter)
// Les gains hors-ligne s'appliquent APRÈS la synchro cloud : si la partie
// a avancé sur un autre appareil, c'est la version adoptée qui les reçoit
// (sinon ils seraient calculés puis écrasés silencieusement).
void initCloud().then(() => appliquerGainsHorsLigne());
initBeaconCloud(); // dernière synchro garantie à la fermeture de l'onglet

// PWA : le service worker rend le jeu installable et jouable hors-ligne
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  navigator.serviceWorker.register('sw.js').catch(() => undefined);
}

const debugEl = document.getElementById('debug')!;
const pecheUi = document.getElementById('peche-ui')!;
const pecheStatut = document.getElementById('peche-statut')!;
const pecheNiveau = document.getElementById('peche-niveau')!;

// Raccourcis clavier
surTouche('Escape', () => {
  if (modalOuvert()) fermerModal();
  else if (jeu.mode === 'peche') sortirPeche();
  else basculerParametres();
});
surTouche('KeyP', () => (modalOuvert() ? fermerModal() : ouvrirProfil()));
surTouche('KeyT', () => ajouterToast('LE CHAT ARRIVERA AVEC LE MULTIJOUEUR !'));
surTouche('KeyC', basculerAuto);
surTouche('KeyF', basculerMikudex);
surTouche('KeyE', () => {
  if (jeu.mode === 'peche') sortirPeche();
  else activerInteraction();
});
surTouche('Space', () => {
  if (jeu.mode === 'peche') actionPeche();
});
surTouche('KeyB', () => {
  if (jeu.mode === 'peche') basculerBoutiquePeche();
});
surTouche('F1', () => debugEl.classList.toggle('cache'));

// ---------------------------------------------------------------- update
let accPanneau = 0;
let accSave = 0;
let accGenerateur = 0;
let fps = 60;

function update(dt: number): void {
  state.save.tempsJeu += dt;
  majPecheurs(dt); // les doughcats pêcheurs travaillent partout

  if (jeu.mode === 'peche') {
    majPeche(dt);
    majInteractions(); // vide l'infobulle pendant la pêche
  } else {
    majBirb(dt);
    majSpawner(dt);

    // Aimant (mode AUTO) + collecte — boucle à l'envers car on retire.
    // Les distances partent du centre du corps, pas des pieds du sprite.
    const liste = entitesZoneActive();
    const centre = centreBirb();
    for (let i = liste.length - 1; i >= 0; i--) {
      const c = liste[i];
      c.age += dt;
      if (state.save.auto && autoDebloque(state.save.rebirbs)) {
        const d = dist(c.x, c.y, centre.x, centre.y);
        if (d < state.stats.rayonAimant && d > 1) {
          c.x += ((centre.x - c.x) / d) * CONFIG.auto.vitesseAimant * dt;
          c.y += ((centre.y - c.y) / d) * CONFIG.auto.vitesseAimant * dt;
        }
      }
      if (dist(c.x, c.y, centre.x, centre.y) < CONFIG.birb.rayonRamassage) {
        liste.splice(i, 1);
        encaisserCollectible(c);
      }
    }

    majCompagnons(dt);
    majCombat(dt);
    majInteractions();

    // Générateur auto (talent) : smiski passifs
    if (state.stats.generateur > 0) {
      accGenerateur += dt;
      if (accGenerateur >= 1) {
        accGenerateur -= 1;
        crediter('popcorn', state.stats.generateur, 0, 0, true);
      }
    }

    suivreCamera(birb.x, birb.y, ecran.largeur, ecran.hauteur, dt);
  }

  majFx(dt);
  majHud();

  // UI pêche
  const enPeche = jeu.mode === 'peche';
  pecheUi.classList.toggle('cache', !enPeche);
  if (enPeche) {
    const p = getPeche();
    if (pecheStatut.textContent !== p.message) pecheStatut.textContent = p.message;
    const appat = appatEquipe();
    const infos = `NIV. ${state.save.peche.niveau} — ${canneEquipee().nom} — APPÂT : ${
      appat ? `${appat.nom} (${state.save.peche.appats[appat.id]})` : 'AUCUN'
    } — ◀▶ : SE PLACER — B : BOUTIQUE — E : PARTIR`;
    if (pecheNiveau.textContent !== infos) pecheNiveau.textContent = infos;
  }

  // Le panneau se recalcule à ~200 ms, pas à chaque frame (plan 05)
  accPanneau += dt;
  if (accPanneau >= 0.2) {
    accPanneau = 0;
    majPanneau();
  }

  // Autosave (plan 07) + poussée cloud throttlée
  accSave += dt;
  if (accSave >= CONFIG.autosaveSec) {
    accSave = 0;
    sauvegarder();
    majCloud();
  }

  if (dt > 0) fps = fps * 0.95 + (1 / dt) * 0.05;
  if (!debugEl.classList.contains('cache')) {
    debugEl.textContent = `FPS ${Math.round(fps)} | MODE ${jeu.mode} | CAM ${Math.round(camera.x)},${Math.round(
      camera.y
    )} | ENTITÉS ${entitesZoneActive().length + getMonstres().length}`;
  }
}

// ---------------------------------------------------------------- render

function dessinerCompagnon(
  ctx: CanvasRenderingContext2D,
  compagnon: Compagnon,
  frames: { idle: HTMLCanvasElement; marche: HTMLCanvasElement[] },
  camX: number,
  camY: number,
  barrePv = false
): void {
  if (compagnon.mortT > 0) return; // K.O. : en attente de respawn
  const cx = Math.round(compagnon.x - camX);
  const cy = Math.round(compagnon.y - camY);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 1, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const frame = compagnon.enMouvement
    ? frames.marche[Math.floor(compagnon.animT * 10) % 2]
    : frames.idle;
  ctx.save();
  ctx.translate(cx, cy + Math.round(Math.sin(performance.now() / 300 + compagnon.x) * 1.5));
  if (compagnon.flip) ctx.scale(-1, 1);
  ctx.drawImage(frame, -Math.round(frame.width / 2), -frame.height + 4);
  ctx.restore();
  if (barrePv && compagnon.pvMax > 0) {
    const yBarre = cy - frame.height - 4;
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(cx - 13, yBarre - 1, 26, 5);
    ctx.fillStyle = '#7dbb5c';
    ctx.fillRect(cx - 12, yBarre, Math.max(0, (compagnon.pv / compagnon.pvMax) * 24), 3);
  }
}

function dessinerMonde(): void {
  const { ctx } = ecran;
  const camX = Math.round(camera.x);
  const camY = Math.round(camera.y);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, ecran.largeur, ecran.hauteur);
  const decor = enExpedition() ? decorExpedition(getEtage()) : decorZone(state.save.zone);
  ctx.drawImage(decor, -camX, -camY);

  // Structures et objets interactifs (portail, panneaux, marchand…)
  dessinerInteractifs(ctx, camX, camY);

  // Collectibles (avec « pop » à l'apparition et petite ombre)
  for (const c of entitesZoneActive()) {
    const echelle = Math.min(1, c.age / 0.15);
    const taille = Math.round(TAILLE_OBJET * echelle);
    if (taille <= 0) continue;
    const x = Math.round(c.x - camX);
    const y = Math.round(c.y - camY);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    const sprite = c.dore ? SPRITE_SMISKI_DORE : SPRITES_MONNAIES[c.monnaie];
    ctx.drawImage(sprite, x - taille / 2, y - taille / 2, taille, taille);
  }

  // Coffres et monstres de l'expédition
  if (enExpedition()) {
    for (const coffre of getCoffres()) {
      const sprite = SPRITES_COFFRES[coffre.rarete];
      const x = Math.round(coffre.x - camX);
      const y = Math.round(coffre.y - camY);
      const flottement = Math.round(Math.sin(coffre.age * 3) * 2);
      ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height / 2 + flottement);
    }
    for (const m of getMonstres()) {
      const sprite = SPRITES_MONSTRES[m.type.id];
      const taille = sprite.width * m.echelle;
      const mx = Math.round(m.x - camX);
      const my = Math.round(m.y - camY);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(mx, my + taille / 2 - 2, taille / 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(sprite, mx - taille / 2, my - taille / 2, taille, taille);
      const largeurBarre = m.boss ? 56 : 30;
      const yBarre = my - taille / 2 - 8;
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(mx - largeurBarre / 2 - 1, yBarre - 1, largeurBarre + 2, 6);
      ctx.fillStyle = m.boss ? '#f2d16b' : '#e5533f';
      ctx.fillRect(mx - largeurBarre / 2, yBarre, Math.max(0, (m.pv / m.pvMax) * largeurBarre), 4);
    }
  }

  // Les compagnons, derrière l'héroïne (barre de PV en expédition)
  for (const chat of getChats()) {
    dessinerCompagnon(ctx, chat, SPRITES_DOUGHCAT, camX, camY, enExpedition());
  }
  const yuumi = getYuumi();
  if (yuumi) dessinerCompagnon(ctx, yuumi, SPRITES_YUUMI, camX, camY);

  // L'héroïne : ombre + frame animée + flip horizontal
  const bx = Math.round(birb.x - camX);
  const by = Math.round(birb.y - camY);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(bx, by + 2, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const vue = SPRITES_HEROINE[birb.direction];
  const frame =
    birb.attaqueT > 0
      ? vue.attaque[Math.floor(performance.now() / 130) % 2]
      : birb.enMouvement
        ? vue.marche[Math.floor(birb.animT * 8) % 2]
        : vue.idle;
  const bob = birb.enMouvement ? 0 : Math.round(Math.sin(performance.now() / 400) * 2);
  ctx.save();
  ctx.translate(bx, by + bob);
  if (birb.flip) ctx.scale(-1, 1);
  ctx.drawImage(frame, -Math.round(frame.width / 2), -frame.height + 6);
  ctx.restore();

  dessinerFx(ctx, camX, camY);
}

function dessinerPeche(): void {
  const { ctx, largeur, hauteur } = ecran;
  const p = getPeche();
  const yPonton = Math.round(hauteur * 0.45);
  const hPonton = 90;

  // Ciel + nuages
  ctx.fillStyle = '#9fd8e0';
  ctx.fillRect(0, 0, largeur, yPonton);
  ctx.fillStyle = '#c8ecf2';
  for (let i = 0; i < 6; i++) {
    const nx = ((i * 233 + Math.floor(performance.now() / 120) * 0.5) % (largeur + 160)) - 80;
    const ny = 40 + (i % 3) * 46;
    ctx.fillRect(Math.round(nx), ny, 90, 16);
    ctx.fillRect(Math.round(nx) + 16, ny - 10, 56, 12);
  }

  // Mer
  ctx.fillStyle = '#5ab4d4';
  ctx.fillRect(0, yPonton, largeur, hauteur - yPonton);
  ctx.fillStyle = '#6ec4e2';
  for (let i = 0; i < 40; i++) {
    const wx = (i * 173) % largeur;
    const wy = yPonton + hPonton + 20 + ((i * 97) % (hauteur - yPonton - hPonton - 40));
    const osc = Math.round(Math.sin(performance.now() / 700 + i) * 6);
    ctx.fillRect(wx + osc, wy, 26, 4);
  }

  // Ponton
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(0, yPonton, largeur, hPonton);
  ctx.fillStyle = '#6e4a2c';
  for (let x = 0; x < largeur; x += 42) ctx.fillRect(x, yPonton, 4, hPonton);
  ctx.fillRect(0, yPonton, largeur, 6);
  // pilotis
  for (let x = 60; x < largeur; x += 300) {
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(x, yPonton + hPonton, 18, 26);
  }

  // Le banc de poissons : des remous à sa position (bonus si on y pêche)
  const spotX = Math.round(largeur * p.spot);
  const spotY = yPonton + hPonton + 70;
  ctx.strokeStyle = surLeSpot() ? '#ffd94a' : '#c8ecf2';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const phase = (p.animT * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - phase;
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, 12 + phase * 34, 5 + phase * 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // petits poissons qui sautent au niveau du banc
  ctx.fillStyle = '#8ab8d4';
  const saut = Math.abs(Math.sin(p.animT * 2.2)) * 18;
  ctx.fillRect(spotX - 18 + Math.round(Math.sin(p.animT * 1.4) * 10), spotY - 8 - Math.round(saut), 8, 4);

  // Les doughcats pêcheurs embauchés, alignés à droite du ponton
  for (let i = 0; i < state.save.peche.pecheurs; i++) {
    const px = Math.round(largeur * (0.88 - i * 0.055));
    const py = yPonton + hPonton - 10;
    const chatFrame = SPRITES_DOUGHCAT.idle;
    ctx.save();
    ctx.translate(px, py + Math.round(Math.sin(performance.now() / 400 + i) * 2));
    ctx.scale(-1, 1); // face à l'eau
    ctx.drawImage(chatFrame, -Math.round(chatFrame.width / 2), -chatFrame.height + 4);
    ctx.restore();
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 12, py - chatFrame.height + 14);
    ctx.quadraticCurveTo(px + 40, py - 10, px + 52, yPonton + hPonton + 40 + (i % 2) * 14);
    ctx.stroke();
  }

  // L'héroïne, de profil, à la position choisie sur le ponton
  const hx = Math.round(largeur * p.x);
  const hy = yPonton + hPonton - 8;
  const vue = SPRITES_HEROINE.profil;
  const frame = vue.idle;
  ctx.save();
  ctx.translate(hx, hy + Math.round(Math.sin(performance.now() / 500) * 2));
  ctx.drawImage(frame, -Math.round(frame.width / 2), -frame.height + 6);
  ctx.restore();

  // Ligne + bouchon
  if (p.etat !== 'pret') {
    const boutX = hx + 46;
    const boutY = hy - frame.height + 30;
    const bobX = Math.round(largeur * positionBouchon());
    const agite = p.etat === 'touche';
    const bobY =
      yPonton + hPonton + 60 + Math.round(Math.sin(p.animT * (agite ? 22 : 3)) * (agite ? 6 : 3));
    ctx.strokeStyle = '#f2f2f2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boutX, boutY);
    ctx.quadraticCurveTo(bobX - 40, boutY - 30, bobX, bobY - 8);
    ctx.stroke();
    ctx.fillStyle = agite ? '#ffd94a' : '#e5533f';
    ctx.beginPath();
    ctx.arc(bobX, bobY, 6, 0, Math.PI * 2);
    ctx.fill();
    if (agite) {
      ctx.fillStyle = '#ffd94a';
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', bobX, bobY - 22);
    }
  }

  // Dernière prise : le poisson au-dessus de l'héroïne
  if (p.prise) {
    const [corps, detail] = p.prise.espece.couleurs;
    const fx = hx;
    const fy = hy - frame.height - 26;
    ctx.fillStyle = corps;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx + 20, fy);
    ctx.lineTo(fx + 36, fy - 12);
    ctx.lineTo(fx + 36, fy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = detail;
    ctx.fillRect(fx - 10, fy - 4, 12, 6);
    ctx.fillStyle = '#2c2337';
    ctx.fillRect(fx - 16, fy - 4, 4, 4);
    if (p.prise.shiny) {
      ctx.fillStyle = '#fff6c9';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦', fx - 30, fy - 10);
      ctx.fillText('✦', fx + 46, fy - 16);
    }
    ctx.strokeStyle = RARETES[p.prise.espece.rarete].couleur;
    ctx.lineWidth = 2;
    ctx.strokeRect(fx - 34, fy - 22, 78, 44);
  }
}

function render(): void {
  if (jeu.mode === 'peche') dessinerPeche();
  else dessinerMonde();
}

demarrerBoucle(update, render);

// Poignée de debug (overlay F1 + tests automatisés).
(window as unknown as Record<string, unknown>).__jeu = {
  birb,
  state,
  jeu,
  cloud: { disponible: cloudDisponible, pousser: pousserCloud },
};
