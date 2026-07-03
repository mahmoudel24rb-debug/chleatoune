// Point d'entrée : câblage de tous les modules + update/render.
// Trois modes de jeu : le monde (zones), l'expédition (combat à biomes)
// et la pêche (vue de côté).

import './style.css';
import { CONFIG, INDEX_DONJON } from './data/config';
import { autoDebloque } from './data/progression';
import { RARETES } from './data/poissons';
import { initCanvas } from './core/canvas';
import { demarrerBoucle } from './core/loop';
import { camera, centrerCamera, suivreCamera } from './core/camera';
import { initInput, surTouche } from './core/input';
import { jeu } from './core/mode';
import { state } from './core/state';
import { dist } from './core/utils';
import { decorBiome, decorZone } from './core/decor';
import {
  SPRITES_DOUGHCAT,
  SPRITES_HEROINE,
  SPRITES_MONNAIES,
  SPRITES_MONSTRES,
  frameGlb,
  framesCompagnon,
  SPRITE_SMISKI_DORE,
  TAILLE_OBJET,
  type PoseMonstre,
} from './core/sprites';
import { SPRITES_COFFRES } from './core/structures';
import { birb, centreBirb, majBirb } from './entities/birb';
import type { Compagnon } from './systems/compagnons';
import { getEscouade, getRamasseurs, getYuumi, majCompagnons } from './systems/compagnons';
import { PROJECTILES, nbProjectilesActifs } from './entities/projectile';
import { dessinerTelegraphes, getTelegraphes } from './systems/telegraphes';
import { dessinerSorts } from './systems/sorts';
import { entitesZoneActive, majSpawner } from './systems/spawner';
import { crediter, encaisserCollectible } from './systems/economy';
import {
  enDonjon,
  getBoss,
  getBosses,
  getCoffres,
  getMonstres,
  getPorte,
  getVague,
  graceHeroine,
  majDonjon,
  _debugDegats,
  _debugVagueSansFin,
} from './systems/donjon';
import { nomBossParId } from './data/portes';
import { restaurerScene } from './systems/antre';
import {
  actionPeche,
  appatEquipe,
  canneEquipee,
  creneauActuel,
  getOmbres,
  getPeche,
  getPrisesAuto,
  majPeche,
  majPecheurs,
  sortirPeche,
  sousLeBanc,
} from './systems/peche';
import { PECHE } from './data/peche-config';
import { spritePoisson } from './core/sprites-poissons';
import { appliquerGainsHorsLigne } from './systems/nid';
import { amenagerCartes } from './systems/carte';
import {
  activerInteraction,
  dessinerInteractifs,
  initInteractions,
  majInteractions,
} from './systems/interactions';
import { garantirQuetes } from './systems/quetes';
import { initSucces, majSucces } from './systems/succes';
import { cibleAideChasse, majChasse } from './systems/chasses';
import { cercleScene, initFilRouge, majFilRouge } from './systems/filrouge';
import { tickMatieres } from './systems/matieres';
import { avancerDialogue, couperDialogue, dialogueEnCours, majDialogue } from './ui/dialogue';
import { ajouterParticules, dessinerFx, majFx } from './systems/fx';
import { nomArchimonstre } from './data/archimonstres';
import { SWARM } from './data/swarm';
import { initAudio } from './systems/audio';
import { charger, initAutosave, sauvegarder } from './systems/save';
import { basculerAuto, initHud, majHud } from './ui/hud';
import { construirePanneau, majPanneau } from './ui/panel';
import {
  basculerBesace,
  basculerBoutiquePeche,
  basculerJournal,
  basculerMercier,
  basculerMikudex,
  basculerParametres,
  fermerModal,
  initOverlays,
  modalOuvert,
  ouvrirAquarium,
  ouvrirProfil,
} from './ui/overlays';
import { utiliserSlot } from './systems/consommables';
import { ajouterToast } from './ui/toasts';
import { initCreation } from './ui/creation';
import { basculerModeDev } from './ui/dev';
import { migrerVersProfils } from './systems/profils';
import { faireRebirb } from './systems/rebirb';
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
initFilRouge();
amenagerCartes();
restaurerScene(); // recharger en plein donjon ramène dans l'Antre
construirePanneau();
centrerCamera(birb.x, birb.y, ecran.largeur, ecran.hauteur);
initCreation(); // premier lancement : écran d'accueil (créer / se connecter)
// Les gains hors-ligne s'appliquent APRÈS la synchro cloud : si la partie
// a avancé sur un autre appareil, c'est la version adoptée qui les reçoit
// (sinon ils seraient calculés puis écrasés silencieusement).
void initCloud().then(() => {
  appliquerGainsHorsLigne();
  // succès : le balayage de rattrapage tourne APRÈS la migration et la
  // synchro (plan 16, pièges) — sinon faux négatifs
  initSucces();
});
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
  if (dialogueEnCours()) couperDialogue();
  else if (modalOuvert()) fermerModal();
  else if (jeu.mode === 'peche') sortirPeche();
  else basculerParametres();
});
surTouche('KeyP', () => (modalOuvert() ? fermerModal() : ouvrirProfil()));
surTouche('KeyT', () => ajouterToast('LE CHAT ARRIVERA AVEC LE MULTIJOUEUR !'));
surTouche('KeyC', basculerAuto);
surTouche('KeyF', () => {
  // en mode pêche, F ouvre la vitrine du Grand Aquarium (plan 18 §5)
  if (jeu.mode === 'peche' && !modalOuvert()) ouvrirAquarium();
  else basculerMikudex();
});
surTouche('KeyI', () => {
  if (!dialogueEnCours()) basculerBesace();
});
surTouche('KeyJ', () => {
  if (!dialogueEnCours() && jeu.mode !== 'donjon' && jeu.mode !== 'peche') basculerJournal();
});
surTouche('Digit1', () => utiliserSlot(0));
surTouche('Digit2', () => utiliserSlot(1));
surTouche('Digit3', () => utiliserSlot(2));
surTouche('KeyE', () => {
  if (dialogueEnCours()) avancerDialogue();
  else if (jeu.mode === 'peche') sortirPeche();
  else activerInteraction();
});
surTouche('Space', () => {
  if (dialogueEnCours()) avancerDialogue();
  else if (jeu.mode === 'peche') actionPeche();
});
surTouche('KeyB', () => {
  if (jeu.mode === 'peche') basculerBoutiquePeche();
});
surTouche('KeyM', () => {
  // le Mercier ne reçoit que dans son Antre (plan 11 §6)
  if (jeu.mode === 'antre') basculerMercier();
});
surTouche('F1', () => {
  debugEl.classList.toggle('cache');
  basculerModeDev(!debugEl.classList.contains('cache'));
});

// ---------------------------------------------------------------- update
let accPanneau = 0;
let accSave = 0;
let accGenerateur = 0;
let fps = 60;
let msFrame = 16;

function update(dt: number): void {
  state.save.tempsJeu += dt;

  // dialogue en cours (plan 15 §2) : monde en pause douce — texte au
  // fil, fx et HUD continuent, déplacements et combat gelés
  if (dialogueEnCours()) {
    majDialogue(dt);
    majFx(dt);
    majHud();
    return;
  }

  majPecheurs(dt); // les doughcats pêcheurs travaillent partout

  if (jeu.mode === 'peche') {
    majPeche(dt);
    majInteractions(); // vide l'infobulle pendant la pêche
  } else {
    majBirb(dt);

    // Le ramassage n'existe que dans le monde (l'Antre et le donjon
    // n'ont pas de collectibles au sol).
    if (jeu.mode === 'monde') {
      majSpawner(dt);
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

      // Générateur auto (talent) : smiski passifs
      if (state.stats.generateur > 0) {
        accGenerateur += dt;
        if (accGenerateur >= 1) {
          accGenerateur -= 1;
          crediter('popcorn', state.stats.generateur, 0, 0, true);
        }
      }
    }

    majCompagnons(dt);
    majDonjon(dt);
    majInteractions();

    suivreCamera(birb.x, birb.y, ecran.largeur, ecran.hauteur, dt);
  }

  majFx(dt);
  tickMatieres(dt);
  majSucces(dt);
  majChasse(dt);
  majFilRouge(dt);
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
    } — ${creneauActuel().toUpperCase()} — ◀▶ : SE PLACER — ESPACE (MAINTENIR) : LANCER — B : BOUTIQUE — E : PARTIR`;
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
  msFrame = msFrame * 0.9 + dt * 1000 * 0.1;
  if (!debugEl.classList.contains('cache')) {
    // overlay F1 du plan 10 §7 : entités / projectiles / ms de frame
    debugEl.textContent = `FPS ${Math.round(fps)} | ${msFrame.toFixed(1)} MS | MODE ${jeu.mode} | ENTITÉS ${
      entitesZoneActive().length + getMonstres().length + getEscouade().length
    } | PROJ ${nbProjectilesActifs()} | TÉLÉG ${getTelegraphes().length}`;
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
  const decor = enDonjon()
    ? decorBiome(getPorte()?.biome ?? 0)
    : jeu.mode === 'antre'
      ? decorZone(INDEX_DONJON)
      : decorZone(state.save.zone);
  ctx.drawImage(decor, -camX, -camY);

  // le cercle de scène du Fil Rouge (ch. 2) : notes et compte à rebours
  const cercle = cercleScene();
  if (cercle.actif) {
    const cx = Math.round(cercle.x - camX);
    const cy = Math.round(cercle.y - camY);
    ctx.strokeStyle = `rgba(57, 197, 187, ${0.5 + Math.sin(performance.now() / 300) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, cercle.rayon, 0, Math.PI * 2);
    ctx.stroke();
    if (cercle.progres > 0) {
      ctx.strokeStyle = '#39c5bb';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, cercle.rayon, -Math.PI / 2, -Math.PI / 2 + cercle.progres * Math.PI * 2);
      ctx.stroke();
    }
  }

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

  // Coffres et monstres du donjon
  if (enDonjon()) {
    // télégraphes et flaques : AU SOL, sous tout le monde (plan 10 §3)
    dessinerTelegraphes(ctx, camX, camY);

    for (const coffre of getCoffres()) {
      const sprite = SPRITES_COFFRES[coffre.rarete];
      const x = Math.round(coffre.x - camX);
      const y = Math.round(coffre.y - camY);
      const flottement = Math.round(Math.sin(coffre.age * 3) * 2);
      ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height / 2 + flottement);
    }
    for (const m of getMonstres()) {
      // sprite GLB (m_{id} / b_{bossId}), secours pixel art en attendant
      const prefixe = m.boss ? `b_${m.bossId ?? 'maokai'}` : `m_${m.type.id}`;
      const enMarche = m.viseT <= 0 && (m.etourdiT ?? 0) <= 0 && (m.boss || true);
      const pose: PoseMonstre =
        m.attaqueT > 0 || m.viseT > 0
          ? (Math.floor(performance.now() / 160) % 2 === 0 ? 'attaque1' : 'attaque2')
          : enMarche
            ? (Math.floor(performance.now() / 180 + m.x) % 2 === 0 ? 'marche1' : 'marche2')
            : 'idle';
      const vue = Math.abs(m.dirX) >= Math.abs(m.dirY) ? 'profil' : 'face';
      const glb = frameGlb(prefixe, vue, pose);
      const sprite = glb ?? SPRITES_MONSTRES[m.type.id] ?? SPRITES_MONSTRES.glouton;
      const zoom = glb ? m.echelle : m.boss ? 2.5 : m.echelle;
      const w = sprite.width * zoom;
      const h = sprite.height * zoom;
      const mx = Math.round(m.x - camX);
      const my = Math.round(m.y - camY);
      // culling simple : hors caméra = pas de dessin (plan 10 §7)
      if (mx < -140 || mx > ecran.largeur + 140 || my < -160 || my > ecran.hauteur + 160) continue;
      m.attaqueT = Math.max(0, m.attaqueT - 0.016);
      // halo pulsant des élites (plan 10 §1)
      if (m.elite) {
        const phase = (Math.sin(performance.now() / 250) + 1) / 2;
        ctx.fillStyle = `rgba(255, 217, 74, ${0.18 + phase * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(mx, my + 12, w / 2 + 8, 10 + phase * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(mx, my + 12, w / 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // kamikaze qui clignote : blanc/rouge (plan 10 §2)
      const clignote = m.clignoteT > 0 && Math.floor(performance.now() / 70) % 2 === 0;
      ctx.save();
      ctx.translate(mx, my + 14);
      if (glb && m.dirX < 0 && vue === 'profil') ctx.scale(-1, 1);
      if (clignote) ctx.filter = 'brightness(2.4) saturate(0.4)';
      // archimonstre : teinte dorée (plan 14 §3)
      else if (m.archi) ctx.filter = 'sepia(1) saturate(2.4) hue-rotate(-8deg) brightness(1.2)';
      // étourdi (fin de charge) : le boss vacille — la fenêtre de punition
      if ((m.etourdiT ?? 0) > 0) ctx.rotate(Math.sin(performance.now() / 90) * 0.08);
      ctx.drawImage(sprite, Math.round(-w / 2), Math.round(-h), w, h);
      ctx.restore();
      // l'archimonstre : particules dorées continues + nom permanent
      if (m.archi) {
        if (Math.random() < 0.15) ajouterParticules(m.x, m.y - h / 2, '#f2d16b', 1);
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        const nom = nomArchimonstre(m.type.id);
        const lm = ctx.measureText(nom).width;
        ctx.fillStyle = 'rgba(10,10,14,0.75)';
        ctx.fillRect(mx - lm / 2 - 4, my - h - 4, lm + 8, 12);
        ctx.fillStyle = '#f2d16b';
        ctx.fillText(nom, mx, my - h + 5);
      }
      // défi DANS L'ORDRE : la couronne numérotée ① ② ③ (plan 14 §1)
      if (m.couronne) {
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f2d16b';
        ctx.fillText(['①', '②', '③'][m.couronne - 1] ?? '', mx, my - h - 8);
      }
      const largeurBarre = m.boss ? 56 : 30;
      const yBarre = my + 8 - h;
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(mx - largeurBarre / 2 - 1, yBarre - 1, largeurBarre + 2, 6);
      ctx.fillStyle = m.boss ? '#f2d16b' : m.elite ? '#ffd94a' : '#e5533f';
      ctx.fillRect(mx - largeurBarre / 2, yBarre, Math.max(0, (m.pv / m.pvMax) * largeurBarre), 4);
    }

    // projectiles (pool) : carrés ennemis, aiguilles des sorts
    for (const p of PROJECTILES) {
      if (!p.actif) continue;
      const px = Math.round(p.x - camX);
      const py = Math.round(p.y - camY);
      if (px < -20 || px > ecran.largeur + 20 || py < -20 || py > ecran.hauteur + 20) continue;
      ctx.fillStyle = p.couleur;
      if (p.camp === 'sort') {
        // aiguille : trait fin orienté
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-6, -1, 12, 2);
        ctx.restore();
      } else {
        ctx.fillRect(px - p.taille, py - p.taille, p.taille * 2, p.taille * 2);
      }
    }

    // les sorts du Mercier (bobines, ciseaux, pelotes, tourelles, foudre)
    dessinerSorts(ctx, camX, camY);
  }

  // Les compagnons, derrière l'héroïne (barre de PV en donjon)
  if (enDonjon()) {
    for (const copie of getEscouade()) {
      dessinerCompagnon(ctx, copie, framesCompagnon(copie.espece), camX, camY, true);
    }
  } else {
    for (const c of getRamasseurs()) {
      dessinerCompagnon(ctx, c, framesCompagnon(c.espece), camX, camY);
    }
  }
  const yuumi = getYuumi();
  if (yuumi) dessinerCompagnon(ctx, yuumi, framesCompagnon('yuumi'), camX, camY);

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
  // fenêtre de grâce après un coup : l'héroïne clignote
  if (enDonjon() && graceHeroine() > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }
  ctx.drawImage(frame, -Math.round(frame.width / 2), -frame.height + 6);
  ctx.restore();
  ctx.globalAlpha = 1;

  dessinerFx(ctx, camX, camY);

  // clémence des chasses (plan 16 §4) : après 90 s sans progrès, une
  // flèche discrète pulse au bord de l'écran vers le repère
  const aide = cibleAideChasse();
  if (aide && Math.sin(performance.now() / 250) > 0) {
    const dx = aide.x - birb.x;
    const dy = aide.y - birb.y;
    const angle = Math.atan2(dy, dx);
    const px = ecran.largeur / 2 + Math.cos(angle) * (Math.min(ecran.largeur, ecran.hauteur) / 2 - 46);
    const py = ecran.hauteur / 2 + Math.sin(angle) * (Math.min(ecran.largeur, ecran.hauteur) / 2 - 46);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(242, 209, 107, 0.75)';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Habillage du donjon : barre de boss, textes de phase
  if (enDonjon()) {
    const bosses = getBosses();
    const vague = getVague();
    if (bosses.length > 0) {
      // barre de PV du/des boss en haut, segmentée (plan 09 §5.3) — la
      // Déchirure en aligne plusieurs : la barre cumule leurs PV
      const largeur = Math.min(520, ecran.largeur - 80);
      const x = Math.round((ecran.largeur - largeur) / 2);
      const y = 104;
      const pvTotal = bosses.reduce((s, b) => s + Math.max(0, b.pv), 0);
      const pvMaxTotal = bosses.reduce((s, b) => s + b.pvMax, 0);
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(x - 3, y - 3, largeur + 6, 20);
      ctx.fillStyle = '#e5533f';
      ctx.fillRect(x, y, Math.max(0, (pvTotal / pvMaxTotal) * largeur), 14);
      ctx.strokeStyle = '#1a1420';
      ctx.lineWidth = 2;
      for (let s = 1; s < 10; s++) {
        const sx = x + (largeur / 10) * s;
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(sx, y + 14);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd94a';
      const titre =
        bosses.length === 1
          ? (getPorte()?.sansFin ? nomBossParId(bosses[0].bossId ?? '') : (getPorte()?.nomBoss ?? 'BOSS'))
          : bosses.map((b) => nomBossParId(b.bossId ?? '').split(',')[0]).join(' & ');
      ctx.fillText(titre, ecran.largeur / 2, y - 8);
    }
    if (vague.phase === 'pause' || vague.phase === 'victoire') {
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const texte = vague.phase === 'victoire' ? '🏆 VICTOIRE !' : 'VAGUE SUIVANTE…';
      ctx.fillStyle = 'rgba(10,10,14,0.6)';
      const lm = ctx.measureText(texte).width;
      ctx.fillRect(ecran.largeur / 2 - lm / 2 - 14, ecran.hauteur / 2 - 90, lm + 28, 34);
      ctx.fillStyle = '#ffd94a';
      ctx.fillText(texte, ecran.largeur / 2, ecran.hauteur / 2 - 66);
    }
  }
}

// les palettes de ciel par créneau (plan 17 §5) : aube rosée, jour,
// crépuscule orangé, nuit étoilée + lucioles
const CIELS: Record<string, { ciel: string; nuage: string; eauHaut: string; eauBas: string }> = {
  matin: { ciel: '#f2c8d0', nuage: '#ffe6ec', eauHaut: '#7ec4d8', eauBas: '#3a7a9e' },
  jour: { ciel: '#9fd8e0', nuage: '#c8ecf2', eauHaut: '#5ab4d4', eauBas: '#2e6a94' },
  soir: { ciel: '#f2a06b', nuage: '#ffc89a', eauHaut: '#5a92b8', eauBas: '#2c4a70' },
  nuit: { ciel: '#2b3a5e', nuage: '#3e5078', eauHaut: '#31597a', eauBas: '#152a44' },
};

function dessinerPeche(): void {
  const { ctx, largeur, hauteur } = ecran;
  const p = getPeche();
  const creneau = creneauActuel();
  const teinte = CIELS[creneau];
  const yPonton = Math.round(hauteur * 0.4);
  const hPonton = 90;
  const yEau = yPonton + hPonton;
  const hEau = hauteur - yEau;
  // conversion profondeur (px de simulation 0..260) → écran
  const yProf = (prof: number) => yEau + 24 + (prof / PECHE.profMax) * (hEau - 60);

  ctx.save();
  if (p.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

  // ---- ciel du créneau + nuages (+ étoiles la nuit)
  ctx.fillStyle = teinte.ciel;
  ctx.fillRect(-8, -8, largeur + 16, yPonton + 8);
  if (creneau === 'nuit') {
    ctx.fillStyle = '#fff6c9';
    for (let i = 0; i < 24; i++) {
      const sx = (i * 151) % largeur;
      const sy = 12 + ((i * 83) % (yPonton - 30));
      if (Math.sin(performance.now() / 600 + i * 2) > -0.6) ctx.fillRect(sx, sy, 2, 2);
    }
  }
  ctx.fillStyle = teinte.nuage;
  for (let i = 0; i < 6; i++) {
    const nx = ((i * 233 + Math.floor(performance.now() / 120) * 0.5) % (largeur + 160)) - 80;
    const ny = 40 + (i % 3) * 46;
    ctx.fillRect(Math.round(nx), ny, 90, 16);
    ctx.fillRect(Math.round(nx) + 16, ny - 10, 56, 12);
  }

  // ---- l'eau : 3 bandes en dégradé de profondeur (plan 17 §7)
  const degrade = ctx.createLinearGradient(0, yEau, 0, hauteur);
  degrade.addColorStop(0, teinte.eauHaut);
  degrade.addColorStop(1, teinte.eauBas);
  ctx.fillStyle = degrade;
  ctx.fillRect(-8, yEau, largeur + 16, hEau + 8);
  // les 3 bandes, marquées par un liseré subtil
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (const bande of ['bord', 'milieu', 'large'] as const) {
    ctx.fillRect(0, Math.round(yProf(PECHE.bandes[bande][0])), largeur, 2);
  }
  // deux couches de vagues sinusoïdales à vitesses différentes
  for (const [vitesse, alpha, ecart] of [[900, 0.22, 46], [1500, 0.14, 64]] as const) {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (let i = 0; i < 30; i++) {
      const wx = (i * 173) % largeur;
      const wy = yEau + 14 + ((i * 97) % (hEau - 30));
      const osc = Math.round(Math.sin(performance.now() / vitesse + i * (ecart / 10)) * 8);
      ctx.fillRect(wx + osc, wy, 24, 3);
    }
  }
  // scintillements 1 px
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 16; i++) {
    if (Math.sin(performance.now() / 300 + i * 7) > 0.7) {
      ctx.fillRect((i * 199) % largeur, yEau + 10 + ((i * 131) % (hEau - 20)), 2, 2);
    }
  }

  // ---- les ombres : elles existent AVANT d'être pêchées (plan 17 §1)
  for (const o of getOmbres()) {
    const ox = Math.round(o.x * largeur);
    const oy = Math.round(yProf(o.prof) + Math.sin(o.phase) * 3);
    if (ox < -40 || ox > largeur + 40) continue;
    const demi = PECHE.taillesOmbre[o.espece.ombre];
    ctx.fillStyle = 'rgba(10, 20, 30, 0.3)';
    if (o.espece.ombre === 'AILERON') {
      // LA LÉGENDE DORÉE : l'aileron qui dépasse — un événement
      ctx.beginPath();
      ctx.ellipse(ox, oy, demi * 1.6, demi * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 30, 40, 0.55)';
      ctx.beginPath();
      ctx.moveTo(ox - 6, oy - 4);
      ctx.lineTo(ox + 2, oy - 16 - Math.abs(Math.sin(o.phase * 2)) * 3);
      ctx.lineTo(ox + 8, oy - 4);
      ctx.closePath();
      ctx.fill();
      // sillage
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ox - demi * 2, oy + 2);
      ctx.lineTo(ox - demi * 3.4, oy + 5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(ox, oy, demi * (1 + Math.sin(o.phase) * 0.06), demi * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- les oiseaux du banc (le signal AC) : ils tournent au-dessus
  const spotX = Math.round(largeur * p.spot);
  const spotY = yEau - 26;
  ctx.strokeStyle = creneau === 'nuit' ? '#c8d8f2' : '#4a4a52';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = p.animT * 1.4 + (i * Math.PI * 2) / 3;
    const bx = spotX + Math.cos(a) * 30;
    const by = spotY + Math.sin(a) * 9 - 14;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by);
    ctx.quadraticCurveTo(bx - 2, by - 5, bx, by);
    ctx.quadraticCurveTo(bx + 2, by - 5, bx + 6, by);
    ctx.stroke();
  }

  // ---- le ponton + roseaux + lanternes
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(0, yPonton, largeur, hPonton);
  ctx.fillStyle = '#6e4a2c';
  for (let x = 0; x < largeur; x += 42) ctx.fillRect(x, yPonton, 4, hPonton);
  ctx.fillRect(0, yPonton, largeur, 6);
  for (let x = 60; x < largeur; x += 300) {
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(x, yEau, 18, 26);
  }
  // roseaux et nénuphars au bord
  for (let i = 0; i < 8; i++) {
    const rx = (i * 157 + 40) % largeur;
    ctx.strokeStyle = '#3c7a44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, yEau + 12);
    ctx.quadraticCurveTo(rx + Math.sin(performance.now() / 900 + i) * 4, yEau - 2, rx + 2, yEau - 12);
    ctx.stroke();
    if (i % 3 === 0) {
      ctx.fillStyle = '#57b053';
      ctx.beginPath();
      ctx.ellipse((rx + 60) % largeur, yEau + 20, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // les lanternes s'allument au soir et à la nuit
  for (let x = 150; x < largeur; x += 420) {
    ctx.fillStyle = '#4a3524';
    ctx.fillRect(x, yPonton - 44, 4, 44);
    ctx.fillRect(x - 5, yPonton - 50, 14, 8);
    const allumee = creneau === 'soir' || creneau === 'nuit';
    if (allumee) {
      ctx.fillStyle = 'rgba(255, 214, 120, 0.25)';
      ctx.beginPath();
      ctx.arc(x + 2, yPonton - 40, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = allumee ? '#ffd678' : '#8a8296';
    ctx.fillRect(x - 2, yPonton - 42, 8, 10);
  }
  // lucioles la nuit
  if (creneau === 'nuit') {
    ctx.fillStyle = '#d9edb2';
    for (let i = 0; i < 7; i++) {
      const lx = (i * 241 + Math.sin(performance.now() / 800 + i) * 30) % largeur;
      const ly = yPonton - 20 + Math.sin(performance.now() / 500 + i * 3) * 16;
      if (Math.sin(performance.now() / 350 + i * 5) > 0) ctx.fillRect(Math.round(lx), Math.round(ly), 2, 2);
    }
  }

  // ---- les pêcheurs automatiques, VISIBLES (plan 17 §8)
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
    ctx.quadraticCurveTo(px + 40, py - 10, px + 52, yEau + 40 + (i % 2) * 14);
    ctx.stroke();
  }
  // splash + texte quand un pêcheur attrape
  for (const prise of getPrisesAuto()) {
    const px = Math.round(largeur * (0.88 - prise.index * 0.055)) + 52;
    const py = yEau + 40;
    ctx.globalAlpha = Math.min(1, prise.t);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 8 + (1.4 - prise.t) * 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6c9';
    ctx.fillText('UNE PRISE !', px, py - 20 - (1.4 - prise.t) * 10);
    ctx.globalAlpha = 1;
  }

  // ---- le Grand Aquarium (plan 18 §5) : l'extension vitrée à droite,
  // les espèces données Y NAGENT (F pour la contemplation)
  {
    const aqW = 150;
    const aqH = 84;
    const aqX = largeur - aqW - 8;
    const aqY = yPonton - aqH;
    ctx.fillStyle = '#4a3524';
    ctx.fillRect(aqX - 6, aqY - 6, aqW + 12, aqH + 6); // le cadre
    ctx.fillStyle = 'rgba(90, 180, 212, 0.8)';
    ctx.fillRect(aqX, aqY, aqW, aqH); // l'eau du bassin
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(aqX + 6, aqY + 4, 3, aqH - 8); // le reflet de la vitre
    const donnes = Object.entries(state.save.aquarium);
    donnes.slice(0, 8).forEach(([id, info], i) => {
      const sprite = spritePoisson(id, Math.floor(performance.now() / 260 + i) % 2 === 0 ? 0 : 1, 1, info.shiny);
      if (!sprite) return;
      const fx = aqX + 12 + ((i * 47 + Math.sin(performance.now() / 1400 + i * 2) * 14 + aqW) % (aqW - 40));
      const fy = aqY + 10 + ((i * 23) % (aqH - 30)) + Math.sin(performance.now() / 900 + i) * 3;
      ctx.drawImage(sprite, Math.round(fx), Math.round(fy));
      if (info.shiny && Math.sin(performance.now() / 250 + i) > 0.6) {
        ctx.fillStyle = '#fff6c9';
        ctx.fillRect(Math.round(fx) - 3, Math.round(fy) - 2, 2, 2);
      }
    });
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText(`AQUARIUM ${donnes.length}/16 [F]`, aqX + aqW / 2, aqY - 12);
  }

  // ---- l'héroïne, de profil, à la position choisie
  const hx = Math.round(largeur * p.x);
  const hy = yPonton + hPonton - 8;
  const vue = SPRITES_HEROINE.profil;
  const frame = vue.idle;
  ctx.save();
  ctx.translate(hx, hy + Math.round(Math.sin(performance.now() / 500) * 2));
  ctx.drawImage(frame, -Math.round(frame.width / 2), -frame.height + 6);
  ctx.restore();

  // jauge du lancer chargé (plan 17 §2)
  if (p.etat === 'charge') {
    const jy = hy - frame.height - 22;
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(hx - 42, jy, 84, 12);
    ctx.fillStyle = p.jauge > 66 ? '#e5533f' : p.jauge > 33 ? '#ffd94a' : '#7dbb5c';
    ctx.fillRect(hx - 40, jy + 2, Math.round((p.jauge / 100) * 80), 8);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText(p.jauge > 66 ? 'LARGE' : p.jauge > 33 ? 'MILIEU' : 'BORD', hx, jy - 6);
  }

  // ---- ligne + bouchon
  const enLigne = ['attente', 'mordille', 'plongeon', 'lutte'].includes(p.etat);
  if (enLigne) {
    const boutX = hx + 46;
    const boutY = hy - frame.height + 30;
    const bobX = Math.round(p.bouchonX * largeur);
    const mordille = p.etat === 'mordille' && p.tEtat > 0 && p.mordillesRestants >= 0;
    const coule = p.etat === 'plongeon' || p.etat === 'lutte';
    const bobY =
      yProf(p.bouchonProf) +
      (coule ? 10 : mordille ? Math.round(Math.sin(p.animT * 26) * 4) : Math.round(Math.sin(p.animT * 3) * 3));
    ctx.strokeStyle = p.etat === 'lutte' && p.tremblement > 0 ? '#ff6b6b' : '#f2f2f2';
    ctx.lineWidth = p.etat === 'lutte' ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(boutX, boutY);
    const tremble = p.etat === 'lutte' && p.tremblement > 0 ? (Math.random() - 0.5) * 8 : 0;
    ctx.quadraticCurveTo(bobX - 40 + tremble, boutY - 30, bobX, bobY - 8);
    ctx.stroke();
    if (!coule) {
      ctx.fillStyle = '#e5533f';
      ctx.beginPath();
      ctx.arc(bobX, bobY, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // gros splash du plongeon
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bobX, bobY - 6, 10 + Math.sin(p.animT * 20) * 3, 0, Math.PI * 2);
      ctx.stroke();
      if (p.etat === 'plongeon') {
        ctx.fillStyle = '#ffd94a';
        ctx.font = '18px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', bobX, bobY - 26);
      }
    }
    // étincelles dorées : elle SAIT qu'un shiny se bat (plan 17 §4)
    if (coule && p.ombreCible?.shiny) {
      ctx.fillStyle = '#fff6c9';
      for (let i = 0; i < 4; i++) {
        const a = p.animT * 4 + (i * Math.PI) / 2;
        ctx.fillRect(bobX + Math.round(Math.cos(a) * 16), bobY - 6 + Math.round(Math.sin(a) * 10), 3, 3);
      }
    }
  }

  // ---- la lutte : jauges CAPTURE et TENSION (plan 17 §4)
  if (p.etat === 'lutte') {
    const lx = Math.round(largeur / 2) - 130;
    const ly = hauteur - 90;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(lx - 6, ly - 18, 272, 56);
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText('CAPTURE', lx, ly - 6);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(lx + 80, ly - 13, 182, 9);
    ctx.fillStyle = '#7dbb5c';
    ctx.fillRect(lx + 81, ly - 12, Math.round((p.capture / 100) * 180), 7);
    const rouge = p.tremblement > 0;
    ctx.fillStyle = rouge ? '#ff6b6b' : '#e8e8f0';
    ctx.fillText(rouge ? 'TENSION !!' : 'TENSION', lx + (rouge ? Math.round((Math.random() - 0.5) * 3) : 0), ly + 16);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(lx + 80, ly + 9, 182, 9);
    ctx.fillStyle = p.tension > 70 ? '#e5533f' : p.tension > 40 ? '#ffd94a' : '#5ab4d4';
    ctx.fillRect(lx + 81, ly + 10, Math.round((Math.min(100, p.tension) / 100) * 180), 7);
  }

  // ---- la révélation (le moment AC, plan 17 §7)
  if (p.etat === 'revele' && p.prise) {
    const prise = p.prise;
    const sprite = spritePoisson(prise.espece.id, Math.floor(p.animT * 4) % 2 === 0 ? 0 : 1, 2, prise.shiny);
    // 1. la pose fière : le poisson brandi au-dessus de la tête
    if (sprite) {
      ctx.drawImage(sprite, hx - Math.round(sprite.width / 2), hy - frame.height - sprite.height - 8);
    }
    if (prise.shiny) {
      ctx.fillStyle = '#fff6c9';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦', hx - 40, hy - frame.height - 30);
      ctx.fillText('✦', hx + 42, hy - frame.height - 44);
    }
    // 2. la carte, après la pose (1 s)
    if (prise.t > 0.8) {
      const cw = 380;
      const chh = 150;
      const cx = Math.round((largeur - cw) / 2);
      const cy = Math.round(hauteur * 0.16);
      ctx.fillStyle = 'rgba(20, 15, 28, 0.94)';
      ctx.fillRect(cx, cy, cw, chh);
      ctx.strokeStyle = RARETES[prise.espece.rarete].couleur;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx, cy, cw, chh);
      const grand = spritePoisson(prise.espece.id, 0, 3, prise.shiny);
      if (grand) ctx.drawImage(grand, cx + 18, cy + Math.round((chh - grand.height) / 2));
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e8e8f0';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`${prise.shiny ? '✨ ' : ''}${prise.espece.nom}`, cx + 130, cy + 30);
      ctx.fillStyle = RARETES[prise.espece.rarete].couleur;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(prise.espece.rarete.toUpperCase(), cx + 130, cy + 50);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillText(`${prise.taille} CM${prise.record ? '  📏 NOUVEAU RECORD !' : ''}`, cx + 130, cy + 70);
      // la blague de révélation ([À ÉCRIRE] tant que non personnalisée)
      ctx.fillStyle = '#c8ccd4';
      const blague = prise.espece.blague;
      const lignes = blague.match(/.{1,32}(\s|$)/g) ?? [blague];
      lignes.slice(0, 2).forEach((l, i) => ctx.fillText(l.trim(), cx + 130, cy + 96 + i * 16));
      ctx.fillStyle = '#f2d16b';
      ctx.fillText('ESPACE POUR CONTINUER', cx + 130, cy + chh - 12);
    }
  }

  ctx.restore();
  void sousLeBanc;
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
  donjon: {
    getPorte,
    getVague,
    getBoss,
    degats: _debugDegats,
    monstres: getMonstres,
    escouade: getEscouade,
    projectiles: nbProjectilesActifs,
    telegraphes: () => getTelegraphes().length,
    vagueSansFin: _debugVagueSansFin,
  },
  rebirb: faireRebirb,
  debug: {
    // critère plan 14 : forcer la chance d'archimonstre pour tester
    archiChance: (x: number) => {
      SWARM.archi.chance = x;
    },
  },
};
