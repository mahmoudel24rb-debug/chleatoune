// L'Expédition : étages de combat à biomes, accessibles par le portail
// du hall du donjon. Monstres, boss tous les BOSS_TOUS_LES étages,
// coffres de butin, XP → niveaux → compétences (SP).

import { CONFIG, THEME } from '../data/config';
import {
  BOSS_TOUS_LES,
  COMBAT,
  MONSTRES,
  facteurEtage,
  monstresParEtage,
  xpPourNiveau,
  type CompetenceId,
} from '../data/combat';
import { jeu } from '../core/mode';
import { recalculerStats, state } from '../core/state';
import { clamp, dist, formatNombre } from '../core/utils';
import { birb, centreBirb } from '../entities/birb';
import type { Monstre } from '../entities/monstre';
import { crediterDore } from './economy';
import { delaiRespawnChat, getChats, PART_STATS_CHAT, type Compagnon } from './compagnons';
import { progresserQuete, signalerEtageTermine } from './quetes';
import { ajouterParticules, ajouterTexteFlottant } from './fx';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';

export type RareteCoffre = 'commun' | 'rare' | 'epique' | 'legendaire';

export interface Coffre {
  x: number;
  y: number;
  rarete: RareteCoffre;
  age: number;
}

const monstres: Monstre[] = [];
const coffres: Coffre[] = [];
let etage = 1;
let pv = COMBAT.pvBase;
let tAttaqueHeros = 0;

export function enExpedition(): boolean {
  return jeu.mode === 'expedition';
}

export function getMonstres(): Monstre[] {
  return monstres;
}

export function getCoffres(): Coffre[] {
  return coffres;
}

export function getEtage(): number {
  return etage;
}

export function getPv(): number {
  return pv;
}

// ------------------------------------------------- entrer / sortir

export function entrerExpedition(): void {
  jeu.mode = 'expedition';
  etage = Math.max(1, state.save.meilleurEtage);
  birb.x = CONFIG.monde.largeur / 2;
  birb.y = CONFIG.monde.hauteur / 2;
  coffres.length = 0;
  peuplerEtage();
  ajouterToast(`EXPÉDITION — ÉTAGE ${etage} ⚔`);
}

export function sortirExpedition(): void {
  jeu.mode = 'monde';
  monstres.length = 0;
  coffres.length = 0;
  birb.x = CONFIG.monde.largeur / 2;
  birb.y = CONFIG.monde.hauteur / 2 + 120;
  sauvegarder();
}

// ----------------------------------------------------------- étages

function creerMonstre(type = MONSTRES[Math.floor(Math.random() * MONSTRES.length)], boss = false): Monstre {
  const f = facteurEtage(etage) * (boss ? 6 : 1);
  const marge = 60;
  const angle = Math.random() * Math.PI * 2;
  const rayon = 320 + Math.random() * 480;
  const x = clamp(birb.x + Math.cos(angle) * rayon, marge, CONFIG.monde.largeur - marge);
  const y = clamp(birb.y + Math.sin(angle) * rayon, marge, CONFIG.monde.hauteur - marge);
  const pvMax = Math.ceil(type.pv * f);
  return {
    type,
    x,
    y,
    pv: pvMax,
    pvMax,
    degats: Math.ceil(type.degats * facteurEtage(etage) * (boss ? 2 : 1)),
    xp: Math.ceil(type.xp * f),
    butin: Math.ceil(type.butin * f),
    boss,
    tAttaque: 0,
    tErrance: 0,
    dirX: 0,
    dirY: 0,
    echelle: boss ? 2 : 1,
  };
}

function peuplerEtage(): void {
  monstres.length = 0;
  const boss = etage % BOSS_TOUS_LES === 0;
  const nombre = boss ? Math.max(2, monstresParEtage(etage) - 3) : monstresParEtage(etage);
  for (let i = 0; i < nombre; i++) monstres.push(creerMonstre());
  if (boss) {
    monstres.push(creerMonstre(MONSTRES[Math.floor(Math.random() * MONSTRES.length)], true));
    ajouterToast(`ÉTAGE ${etage} — UN BOSS RÔDE… ⚔`);
  }
}

// ----------------------------------------------------------- coffres

function rareteCoffre(): RareteCoffre {
  let index = etage < 5 ? 0 : etage < 12 ? 1 : etage < 20 ? 2 : 3;
  if (state.save.desert['d_fortune']) index += 1; // FORTUNE : +1 rareté
  return (['commun', 'rare', 'epique', 'legendaire'] as RareteCoffre[])[Math.min(index, 3)];
}

const MULT_RARETE: Record<RareteCoffre, number> = { commun: 1, rare: 2.5, epique: 6, legendaire: 15 };

function ouvrirCoffre(c: Coffre): void {
  const dores = Math.round((3 + etage * 1.5) * MULT_RARETE[c.rarete] * state.stats.multCoffres);
  crediterDore(dores, c.x, c.y);
  if (c.rarete !== 'commun' && Math.random() < 0.25) {
    state.save.heros.sp += 1;
    ajouterTexteFlottant(c.x, c.y - 34, '+1 SP', '#a8d8ff');
  }
  if ((c.rarete === 'epique' || c.rarete === 'legendaire') && Math.random() < 0.35) {
    state.save.plumes += 1;
    state.save.cumulPlumes += 1;
    recalculerStats();
    ajouterTexteFlottant(c.x, c.y - 48, `+1 ${THEME.prestige.nom}`, THEME.prestige.couleur);
  }
  sons.achat();
  ajouterParticules(c.x, c.y, '#f2d16b', 12);
}

// ----------------------------------------------------------- XP / niveaux

function gagnerXp(montant: number): void {
  const heros = state.save.heros;
  heros.xp += Math.round(montant * state.stats.multXp);
  let monte = false;
  while (heros.xp >= xpPourNiveau(heros.niveau)) {
    heros.xp -= xpPourNiveau(heros.niveau);
    heros.niveau += 1;
    heros.sp += COMBAT.spParNiveau;
    monte = true;
  }
  if (monte) {
    pv = state.stats.pvMax; // un niveau rend toute la vie
    sons.niveau();
    ajouterToast(`NIVEAU ${heros.niveau} ! +${COMBAT.spParNiveau} SP 🎉`);
    sauvegarder();
  }
}

// ----------------------------------------------------------- compétences

export function acheterCompetence(id: CompetenceId): boolean {
  const heros = state.save.heros;
  if (heros.sp < 1) return false;
  heros.sp -= 1;
  heros.competences[id] += 1;
  recalculerStats();
  if (id === 'vitalite') pv += COMBAT.pvParPointVitalite;
  pv = clamp(pv, 0, state.stats.pvMax);
  sons.achat();
  sauvegarder();
  return true;
}

export function reinitialiserCompetences(): void {
  const heros = state.save.heros;
  const total = heros.competences.vitalite + heros.competences.recuperation + heros.competences.force;
  heros.sp += total;
  heros.competences = { vitalite: 0, recuperation: 0, force: 0 };
  recalculerStats();
  pv = clamp(pv, 0, state.stats.pvMax);
  sauvegarder();
}

// ----------------------------------------------------------- boucle

function mortHeroine(): void {
  sons.degat();
  ajouterToast('K.O. ! RETOUR À LA PRAIRIE…');
  jeu.mode = 'monde';
  state.save.zone = 0;
  pv = state.stats.pvMax;
  monstres.length = 0;
  coffres.length = 0;
  birb.x = CONFIG.monde.largeur / 2;
  birb.y = CONFIG.monde.hauteur / 2;
  sauvegarder();
}

function mortMonstre(index: number): void {
  const m = monstres[index];
  monstres.splice(index, 1);
  gagnerXp(m.xp);
  progresserQuete('chasser', 1);
  ajouterParticules(m.x, m.y, m.boss ? '#f2d16b' : '#b48ae0', m.boss ? 18 : 8);
  sons.mortMonstre();

  // Butin : les boss lâchent toujours un coffre, les autres parfois
  if (m.boss || Math.random() < 0.12) {
    coffres.push({ x: m.x, y: m.y, rarete: rareteCoffre(), age: 0 });
  } else {
    crediterDore(Math.max(1, Math.round(m.butin / 3)), m.x, m.y);
  }

  if (monstres.length === 0) {
    signalerEtageTermine(etage);
    state.save.meilleurEtage = Math.max(state.save.meilleurEtage, etage);
    etage += 1;
    ajouterToast(`ÉTAGE ${etage - 1} TERMINÉ → ÉTAGE ${etage} !`);
    pv = clamp(pv + state.stats.pvMax * 0.25, 0, state.stats.pvMax); // petit souffle
    sauvegarder();
    peuplerEtage();
  }
}

export function majCombat(dt: number): void {
  // Régénération, partout
  pv = clamp(pv + state.stats.regen * dt, 0, state.stats.pvMax);
  if (!enExpedition()) return;

  tAttaqueHeros -= dt;
  const centre = centreBirb();

  // Ramassage des coffres au contact
  for (let i = coffres.length - 1; i >= 0; i--) {
    const c = coffres[i];
    c.age += dt;
    if (dist(c.x, c.y, centre.x, centre.y) < CONFIG.birb.rayonRamassage) {
      coffres.splice(i, 1);
      ouvrirCoffre(c);
    }
  }

  // Attaque automatique de l'héroïne : le monstre le plus proche à portée
  if (tAttaqueHeros <= 0) {
    let cible = -1;
    let meilleure = COMBAT.porteeAttaque;
    for (let i = 0; i < monstres.length; i++) {
      const d = dist(monstres[i].x, monstres[i].y, centre.x, centre.y);
      if (d <= meilleure + (monstres[i].boss ? 20 : 0)) {
        meilleure = d;
        cible = i;
      }
    }
    if (cible >= 0) {
      tAttaqueHeros = COMBAT.delaiAttaque;
      const m = monstres[cible];
      const dx = m.x - centre.x;
      const dy = m.y - centre.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        birb.direction = 'profil';
        birb.flip = dx < 0;
      } else {
        birb.direction = dy < 0 ? 'dos' : 'face';
        birb.flip = false;
      }
      birb.attaqueT = 0.28;
      m.pv -= state.stats.degats;
      ajouterTexteFlottant(m.x, m.y - 20, `-${formatNombre(state.stats.degats, 0)}`, '#ffd94a');
      ajouterParticules(m.x, m.y, '#ffffff', 4);
      sons.coup();
      if (m.pv <= 0) mortMonstre(cible);
    }
  }

  // Les doughcats se battent aussi : 25 % des stats de l'héroïne
  const chatsVivants = getChats().filter((c) => c.mortT <= 0);
  const vitesseChat = 170 * state.stats.vitesseChats;
  for (const chat of chatsVivants) {
    chat.enMouvement = false;
    let cible: Monstre | null = null;
    let dMin = 420;
    for (const m of monstres) {
      const d = dist(chat.x, chat.y, m.x, m.y);
      if (d < dMin) {
        dMin = d;
        cible = m;
      }
    }
    if (cible) {
      const contact = cible.type.rayon * cible.echelle + 20;
      if (dMin > contact) {
        chat.x += ((cible.x - chat.x) / dMin) * vitesseChat * dt;
        chat.y += ((cible.y - chat.y) / dMin) * vitesseChat * dt;
        chat.flip = cible.x < chat.x;
        chat.enMouvement = true;
        chat.animT += dt;
      } else if (chat.tAttaque <= 0) {
        chat.tAttaque = COMBAT.delaiAttaque * 1.3;
        const degats = Math.max(1, Math.round(state.stats.degats * PART_STATS_CHAT));
        cible.pv -= degats;
        ajouterTexteFlottant(cible.x, cible.y - 14, `-${formatNombre(degats, 0)}`, '#e8c58a');
        if (cible.pv <= 0) mortMonstre(monstres.indexOf(cible));
      }
    } else if (dist(chat.x, chat.y, birb.x, birb.y) > 120) {
      const d = dist(chat.x, chat.y, birb.x, birb.y);
      chat.x += ((birb.x - chat.x) / d) * vitesseChat * dt;
      chat.y += ((birb.y - chat.y) / d) * vitesseChat * dt;
      chat.flip = birb.x < chat.x;
      chat.enMouvement = true;
      chat.animT += dt;
    }
  }

  // IA des monstres : errance, poursuite de la cible la plus proche
  // (héroïne OU doughcat), attaque au contact
  for (const m of monstres) {
    m.tAttaque -= dt;
    let cibleX = centre.x;
    let cibleY = centre.y;
    let chatCible: Compagnon | null = null;
    let d = dist(m.x, m.y, centre.x, centre.y);
    for (const chat of chatsVivants) {
      const dc = dist(m.x, m.y, chat.x, chat.y);
      if (dc < d) {
        d = dc;
        chatCible = chat;
        cibleX = chat.x;
        cibleY = chat.y;
      }
    }
    const vitesse = m.type.vitesse * (m.boss ? 0.8 : 1);

    if (d < COMBAT.porteeAggro && d > 1) {
      m.dirX = (cibleX - m.x) / d;
      m.dirY = (cibleY - m.y) / d;
    } else {
      m.tErrance -= dt;
      if (m.tErrance <= 0) {
        m.tErrance = 1 + Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        const bouge = Math.random() < 0.7;
        m.dirX = bouge ? Math.cos(angle) : 0;
        m.dirY = bouge ? Math.sin(angle) : 0;
      }
    }
    const contact = m.type.rayon * m.echelle + 26;
    if (d > contact) {
      m.x = clamp(m.x + m.dirX * vitesse * dt, 30, CONFIG.monde.largeur - 30);
      m.y = clamp(m.y + m.dirY * vitesse * dt, 30, CONFIG.monde.hauteur - 30);
    } else if (m.tAttaque <= 0) {
      m.tAttaque = 0.9;
      if (chatCible) {
        chatCible.pv -= m.degats;
        ajouterTexteFlottant(chatCible.x, chatCible.y - 40, `-${formatNombre(m.degats, 0)}`, '#ff6b6b');
        if (chatCible.pv <= 0) {
          chatCible.pv = 0;
          chatCible.mortT = delaiRespawnChat();
          sons.degat();
          ajouterToast(`UN DOUGHCAT EST K.O. ! (RETOUR DANS ${Math.round(delaiRespawnChat())} S)`);
        }
      } else {
        pv -= m.degats;
        ajouterTexteFlottant(birb.x, birb.y - 60, `-${formatNombre(m.degats, 0)}`, '#ff6b6b');
        sons.degat();
        if (pv <= 0) {
          mortHeroine();
          return;
        }
      }
    }
  }
}

/** Ligne de stats pour le profil et le panneau. */
export function resumeCombat(): string {
  const s = state.stats;
  return `PV ${formatNombre(Math.ceil(pv), 0)}/${formatNombre(s.pvMax, 0)} — ${formatNombre(s.regen, 1)} PV/S — ${formatNombre(s.degats, 0)} DÉGÂTS`;
}
