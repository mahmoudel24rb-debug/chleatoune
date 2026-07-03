// Le donjon à vagues (plan 09) — remplace l'expédition à étages.
// Une porte = 3 à 6 vagues + un boss. La vague suivante se déclenche
// quand TOUT est mort ; pause de respiration entre deux vagues ; boss
// en dernière vague avec sa garde ; victoire = coffre garanti +
// déblocage de la porte suivante. K.O. = retour à l'Antre sans perte
// de butin (mais la porte se recommence : c'est la tension du mode).
//
// Ce fichier garde aussi les compétences (SP) et les PV de l'héroïne —
// l'ancien systems/combat.ts vit ici, réusiné.

import { CONFIG, THEME } from '../data/config';
import { COMBAT, MONSTRES, typeMonstre, xpPourNiveau, type CompetenceId } from '../data/combat';
import { SWARM, budgetVague, multDegats, multPV } from '../data/swarm';
import { PORTE_SANS_FIN, type CompositionEntree, type PorteDef } from '../data/portes';
import { jeu } from '../core/mode';
import { recalculerStats, state } from '../core/state';
import { clamp, dist, formatNombre } from '../core/utils';
import { birb, centreBirb } from '../entities/birb';
import type { Monstre } from '../entities/monstre';
import { crediterDore } from './economy';
import { delaiRespawnChat, getChats, PART_STATS_CHAT, type Compagnon } from './compagnons';
import { progresserQuete, signalerDonjonTermine } from './quetes';
import { ajouterParticules, ajouterTexteFlottant } from './fx';
import { sons } from './audio';
import { sauvegarder } from './save';
import { ajouterToast } from '../ui/toasts';
import { ouvrirFinDonjon } from '../ui/overlays';
import { entrerAntre } from './antre';

export type RareteCoffre = 'commun' | 'rare' | 'epique' | 'legendaire';
export type PhaseDonjon = 'combat' | 'pause' | 'boss' | 'victoire';

export interface Coffre {
  x: number;
  y: number;
  rarete: RareteCoffre;
  age: number;
}

// ----------------------------------------------------------- état
const monstres: Monstre[] = [];
const coffres: Coffre[] = [];
let porte: PorteDef | null = null;
let vagueIndex = 0;
let phase: PhaseDonjon = 'combat';
let tPause = 0;
let vagueSansFin = 0; // compteur de vagues de la porte sans fin
let fileAttente: { type: string; elite: boolean }[] = [];
let tSpawn = 0;
let pv = COMBAT.pvBase;
let tAttaqueHeros = 0;
// stats du panneau de fin
let chrono = 0;
let degatsPris = 0;
let doresRamasses = 0;

export function enDonjon(): boolean {
  return jeu.mode === 'donjon';
}

export function getMonstres(): Monstre[] {
  return monstres;
}

export function getCoffres(): Coffre[] {
  return coffres;
}

export function getPv(): number {
  return pv;
}

export function getPorte(): PorteDef | null {
  return porte;
}

export function getVague(): { index: number; total: number; phase: PhaseDonjon } {
  return {
    index: porte?.sansFin ? vagueSansFin : vagueIndex,
    total: porte?.nbVagues ?? 0,
    phase,
  };
}

export function getBoss(): Monstre | null {
  return monstres.find((m) => m.boss) ?? null;
}

// -------------------------------------------------- niveau effectif
// La sans-fin scale à l'infini : stats = H(12) × sansFin.stats^vague.
function multPVCourant(): number {
  if (!porte) return 1;
  if (!porte.sansFin) return multPV(porte.niveau);
  return multPV(12) * Math.pow(SWARM.sansFin.stats, vagueSansFin);
}

function multDegatsCourant(): number {
  if (!porte) return 1;
  if (!porte.sansFin) return multDegats(porte.niveau);
  return multDegats(12) * Math.pow(SWARM.sansFin.stats, vagueSansFin);
}

// ----------------------------------------------------------- compos

/** Génère une composition au budget (plan 12 §3). Bestiaire v1 :
 *  uniquement des mêlées — golem pondéré vers les vagues paires. */
function genererComposition(budget: number, vague: number): CompositionEntree[] {
  const poids: Record<string, number> = {
    glouton: 0.55,
    spectre: 0.3,
    golem: vague % 2 === 1 ? 0.3 : 0.15,
  };
  const compo: CompositionEntree[] = [];
  let restant = budget;

  // portes ≥ 4, vague ≥ 3 (index ≥ 2) : une élite, déduite du budget
  if (porte && !porte.sansFin && porte.niveau >= 4 && vague >= 2) {
    const elite = typeMonstre(vague % 2 === 1 ? 'golem' : 'spectre');
    if (restant >= elite.cout * 4) {
      compo.push({ type: elite.id, nombre: 1, elite: true });
      restant -= elite.cout * 4;
    }
  }

  const total = Object.values(poids).reduce((a, b) => a + b, 0);
  let garde = 200;
  while (restant >= 1 && garde-- > 0) {
    let tirage = Math.random() * total;
    let choisi = MONSTRES[0];
    for (const m of MONSTRES) {
      tirage -= poids[m.id] ?? 0;
      if (tirage <= 0) {
        choisi = m;
        break;
      }
    }
    if (choisi.cout > restant) {
      choisi = MONSTRES[0]; // le glouton bouche toujours le budget
      if (choisi.cout > restant) break;
    }
    const existant = compo.find((c) => c.type === choisi.id && !c.elite);
    if (existant) existant.nombre += 1;
    else compo.push({ type: choisi.id, nombre: 1 });
    restant -= choisi.cout;
  }
  return compo;
}

function compositionVague(index: number): CompositionEntree[] {
  if (!porte) return [];
  const scenarisee = porte.vaguesScenarisees?.[index];
  if (scenarisee) return scenarisee;
  const budget = porte.sansFin
    ? budgetVague(12, Math.min(index, 3), 99) * Math.pow(SWARM.sansFin.budget, vagueSansFin)
    : budgetVague(porte.niveau, index, porte.nbVagues);
  return genererComposition(budget, index);
}

// ----------------------------------------------------------- spawn

function creerMonstre(typeId: string, elite: boolean, boss = false): Monstre {
  const type = typeMonstre(typeId);
  const mPV = multPVCourant() * (elite ? SWARM.multElitePV : 1);
  const mDeg = multDegatsCourant() * (elite ? SWARM.multEliteDegats : 1);
  const marge = 60;
  const angle = Math.random() * Math.PI * 2;
  const rayon =
    SWARM.spawn.rayonMin + Math.random() * (SWARM.spawn.rayonMax - SWARM.spawn.rayonMin);
  const x = clamp(birb.x + Math.cos(angle) * rayon, marge, CONFIG.monde.largeur - marge);
  const y = clamp(birb.y + Math.sin(angle) * rayon, marge, CONFIG.monde.hauteur - marge);

  const pvMax = Math.ceil(
    boss ? SWARM.pvBossBase * SWARM.multBoss * multPVCourant() : type.pv * mPV
  );
  return {
    type,
    x,
    y,
    pv: pvMax,
    pvMax,
    degats: Math.ceil(type.degats * mDeg * (boss ? SWARM.multDegatsBoss : 1)),
    xp: Math.ceil(
      type.xp * multPVCourant() * (elite ? SWARM.multEliteButin : 1) * (boss ? 8 : 1)
    ),
    butin: Math.ceil(type.butin * multPVCourant() * (elite ? SWARM.multEliteButin : 1)),
    boss,
    elite,
    tAttaque: 0,
    tErrance: 0,
    dirX: 0,
    dirY: 0,
    echelle: boss ? 2.5 : elite ? 1.3 : 1,
  };
}

function lancerVague(index: number): void {
  if (!porte) return;
  const compo = compositionVague(index);
  fileAttente = [];
  for (const entree of compo) {
    for (let i = 0; i < entree.nombre; i++) {
      fileAttente.push({ type: entree.type, elite: entree.elite === true });
    }
  }
  tSpawn = 0;
  const derniere = !porte.sansFin && index === porte.nbVagues - 1;
  const bossSansFin =
    porte.sansFin && vagueSansFin > 0 && vagueSansFin % SWARM.sansFin.bossToutesLes === 0;
  if (derniere || bossSansFin) {
    phase = 'boss';
    // placeholder plan 09 : golem géant — les vrais boss GLB au plan 10
    monstres.push(creerMonstre('golem', false, true));
    sons.boss();
    ajouterToast(`☠ ${porte.nomBoss} !`);
  } else {
    phase = 'combat';
  }
}

// ------------------------------------------------- entrer / sortir

export function entrerDonjon(p: PorteDef): void {
  porte = p;
  jeu.mode = 'donjon';
  pv = state.stats.pvMax;
  birb.x = CONFIG.monde.largeur / 2;
  birb.y = CONFIG.monde.hauteur / 2;
  monstres.length = 0;
  coffres.length = 0;
  vagueIndex = 0;
  vagueSansFin = 0;
  chrono = 0;
  degatsPris = 0;
  doresRamasses = 0;
  lancerVague(0);
  ajouterToast(`⚔ ${p.nom} — VAGUE 1/${p.sansFin ? '∞' : p.nbVagues}`);
}

export function sortirDonjon(): void {
  monstres.length = 0;
  coffres.length = 0;
  fileAttente = [];
  porte = null;
  entrerAntre();
}

/** Sortie volontaire (tapis) : seulement pendant une pause/victoire. */
export function essayerSortirDonjon(): void {
  if (phase === 'pause' || phase === 'victoire') sortirDonjon();
  else ajouterToast('TERMINE LA VAGUE D’ABORD !');
}

// ----------------------------------------------------------- coffres

const MULT_RARETE: Record<RareteCoffre, number> = {
  commun: 1,
  rare: 2.5,
  epique: 6,
  legendaire: 15,
};

function rareteCoffrePorte(niveau: number): RareteCoffre {
  let index = niveau <= 3 ? 0 : niveau <= 6 ? 1 : niveau <= 9 ? 2 : 3;
  if (state.save.desert['d_fortune']) index += 1; // FORTUNE : +1 rang
  return (['commun', 'rare', 'epique', 'legendaire'] as RareteCoffre[])[Math.min(index, 3)];
}

function ouvrirCoffre(c: Coffre): void {
  const niveau = porte?.niveau ?? 1;
  const dores = Math.round((3 + niveau * 4) * MULT_RARETE[c.rarete] * state.stats.multCoffres);
  crediterDore(dores, c.x, c.y);
  doresRamasses += dores;
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

// ----------------------------------------------------------- XP / SP

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
    pv = state.stats.pvMax;
    sons.niveau();
    ajouterToast(`NIVEAU ${heros.niveau} ! +${COMBAT.spParNiveau} SP 🎉`);
    sauvegarder();
  }
}

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
  const total =
    heros.competences.vitalite + heros.competences.recuperation + heros.competences.force;
  heros.sp += total;
  heros.competences = { vitalite: 0, recuperation: 0, force: 0 };
  recalculerStats();
  pv = clamp(pv, 0, state.stats.pvMax);
  sons.achat();
  sauvegarder();
}

// ------------------------------------------------- victoire / K.O.

function victoire(): void {
  if (!porte) return;
  phase = 'victoire';
  const premiere = !porte.sansFin && (state.save.swarm.termines[porte.niveau] ?? 0) === 0;

  // coffre garanti, ouvert avec panache au niveau de l'héroïne
  ouvrirCoffre({ x: birb.x, y: birb.y - 40, rarete: rareteCoffrePorte(porte.niveau), age: 0 });

  state.save.swarm.termines[porte.niveau] = (state.save.swarm.termines[porte.niveau] ?? 0) + 1;
  signalerDonjonTermine();

  if (premiere) {
    state.save.swarm.porteMax = Math.max(state.save.swarm.porteMax, porte.niveau + 1);
    state.save.plumes += porte.recompensePremiere.plumes;
    state.save.cumulPlumes += porte.recompensePremiere.plumes;
    crediterDore(porte.recompensePremiere.dores, birb.x, birb.y - 70);
    doresRamasses += porte.recompensePremiere.dores;
    recalculerStats();
    ajouterToast(
      porte.niveau === 12 ? '🚪 LE FIL SANS FIN SE DÉVOILE…' : '🚪 UNE NOUVELLE PORTE S’OUVRE…'
    );
  }
  sons.rebirb();
  sauvegarder();

  const porteFinie = porte;
  const stats = {
    nomPorte: porteFinie.nom,
    tempsSec: chrono,
    degatsPris,
    dores: doresRamasses,
    plumes: premiere ? porteFinie.recompensePremiere.plumes : 0,
    premiere,
  };
  window.setTimeout(() => {
    if (jeu.mode !== 'donjon' || porte !== porteFinie) return;
    ouvrirFinDonjon(stats, {
      surRejouer: () => entrerDonjon(porteFinie),
      surRetour: () => sortirDonjon(),
    });
  }, 1400);
}

function mortHeroine(): void {
  sons.degat();
  ajouterToast('K.O. ! LE BUTIN EST GARDÉ — RETOUR À L’ANTRE…');
  pv = state.stats.pvMax;
  sortirDonjon();
  sauvegarder();
}

function mortMonstre(index: number): void {
  const m = monstres[index];
  monstres.splice(index, 1);
  gagnerXp(m.xp);
  progresserQuete('chasser', 1);
  ajouterParticules(
    m.x,
    m.y,
    m.boss ? '#f2d16b' : m.elite ? '#ffd94a' : '#b48ae0',
    m.boss ? 18 : 8
  );
  sons.mortMonstre();

  // butin : les élites lâchent un coffre, les autres des dorés
  if (m.elite) {
    coffres.push({ x: m.x, y: m.y, rarete: rareteCoffrePorte(porte?.niveau ?? 1), age: 0 });
  } else {
    const dores = Math.max(1, Math.round(m.butin / 3));
    crediterDore(dores, m.x, m.y);
    doresRamasses += dores;
  }

  // fin de vague ? (plateau vide ET file de spawn vide)
  if (monstres.length === 0 && fileAttente.length === 0 && porte) {
    if (porte.sansFin) {
      vagueSansFin += 1;
      state.save.swarm.sansFinRecord = Math.max(state.save.swarm.sansFinRecord, vagueSansFin);
      phase = 'pause';
      tPause = SWARM.pauseVagueSec;
      ajouterToast(`VAGUE ${vagueSansFin} TENUE — RECORD : ${state.save.swarm.sansFinRecord}`);
      sauvegarder();
    } else if (vagueIndex === porte.nbVagues - 1) {
      victoire();
    } else {
      phase = 'pause';
      tPause = SWARM.pauseVagueSec;
    }
  }
}

/** Un seul chemin pour blesser un monstre (mêlée, chats, sorts futurs). */
export function infligerAuMonstre(m: Monstre, degats: number, couleur = '#ffd94a'): void {
  m.pv -= degats;
  ajouterTexteFlottant(m.x, m.y - 20, `-${formatNombre(degats, 0)}`, couleur);
  if (m.pv <= 0) {
    const index = monstres.indexOf(m);
    if (index >= 0) mortMonstre(index);
  }
}

// ----------------------------------------------------------- boucle

export function majDonjon(dt: number): void {
  // Régénération, partout
  pv = clamp(pv + state.stats.regen * dt, 0, state.stats.pvMax);
  if (!enDonjon() || !porte) return;
  chrono += dt;

  // pause entre deux vagues
  if (phase === 'pause') {
    tPause -= dt;
    if (tPause <= 0) {
      if (porte.sansFin) {
        lancerVague(vagueSansFin);
        ajouterToast(`⚔ VAGUE ${vagueSansFin + 1}`);
      } else {
        vagueIndex += 1;
        lancerVague(vagueIndex);
        ajouterToast(`⚔ VAGUE ${vagueIndex + 1}/${porte.nbVagues}`);
      }
    }
  }

  // file de spawn : par paquets, hors écran, en respectant le cap
  if (fileAttente.length > 0 && phase !== 'victoire' && phase !== 'pause') {
    tSpawn -= dt;
    if (tSpawn <= 0) {
      tSpawn = SWARM.spawn.cadenceSec;
      let paquet = SWARM.spawn.paquet;
      while (paquet-- > 0 && fileAttente.length > 0 && monstres.length < SWARM.capMonstres) {
        const suivant = fileAttente.shift()!;
        monstres.push(creerMonstre(suivant.type, suivant.elite));
      }
    }
  }

  const centre = centreBirb();

  // coffres au contact (aussi pendant les pauses)
  for (let i = coffres.length - 1; i >= 0; i--) {
    const c = coffres[i];
    c.age += dt;
    if (dist(c.x, c.y, centre.x, centre.y) < CONFIG.birb.rayonRamassage) {
      coffres.splice(i, 1);
      ouvrirCoffre(c);
    }
  }

  if (phase === 'victoire' || phase === 'pause') return;

  // attaque auto de l'héroïne (mêlée : coefMelee × dégâts, plan 12 §1)
  tAttaqueHeros -= dt;
  if (tAttaqueHeros <= 0) {
    let cible: Monstre | null = null;
    let meilleure = COMBAT.porteeAttaque;
    for (const m of monstres) {
      const d = dist(m.x, m.y, centre.x, centre.y);
      if (d <= meilleure + (m.boss ? 30 : 0)) {
        meilleure = d;
        cible = m;
      }
    }
    if (cible) {
      tAttaqueHeros = COMBAT.delaiAttaque;
      const dx = cible.x - centre.x;
      const dy = cible.y - centre.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        birb.direction = 'profil';
        birb.flip = dx < 0;
      } else {
        birb.direction = dy < 0 ? 'dos' : 'face';
        birb.flip = false;
      }
      birb.attaqueT = 0.28;
      ajouterParticules(cible.x, cible.y, '#ffffff', 4);
      sons.coup();
      infligerAuMonstre(cible, Math.round(state.stats.degats * SWARM.coefMelee));
    }
  }

  // les compagnons se battent (25 % des stats — revu au plan 13)
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
        infligerAuMonstre(cible, degats, '#e8c58a');
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

  // IA des monstres : poursuite de la cible la plus proche, contact
  for (const m of [...monstres]) {
    m.tAttaque -= dt;
    let cibleX = centre.x;
    let cibleY = centre.y;
    let chatCible: Compagnon | null = null;
    let d = dist(m.x, m.y, centre.x, centre.y);
    for (const chat of chatsVivants) {
      if (chat.mortT > 0) continue;
      const dc = dist(m.x, m.y, chat.x, chat.y);
      if (dc < d) {
        d = dc;
        chatCible = chat;
        cibleX = chat.x;
        cibleY = chat.y;
      }
    }
    const vitesse = m.type.vitesse * (m.boss ? 0.8 : 1);
    // en donjon, tout le monde est aggro en permanence
    if (d > 1) {
      m.dirX = (cibleX - m.x) / d;
      m.dirY = (cibleY - m.y) / d;
    }
    const contact = m.type.rayon * m.echelle + 26;
    if (d > contact) {
      m.x = clamp(m.x + m.dirX * vitesse * dt, 30, CONFIG.monde.largeur - 30);
      m.y = clamp(m.y + m.dirY * vitesse * dt, 30, CONFIG.monde.hauteur - 30);
    } else if (m.tAttaque <= 0) {
      m.tAttaque = 0.9;
      if (chatCible) {
        chatCible.pv -= m.degats;
        ajouterTexteFlottant(
          chatCible.x,
          chatCible.y - 40,
          `-${formatNombre(m.degats, 0)}`,
          '#ff6b6b'
        );
        if (chatCible.pv <= 0) {
          chatCible.pv = 0;
          chatCible.mortT = delaiRespawnChat();
          sons.degat();
        }
      } else {
        pv -= m.degats;
        degatsPris += m.degats;
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

/** Hook de test (overlay F1 / e2e) : inflige des dégâts à l'héroïne. */
export function _debugDegats(montant: number): void {
  pv -= montant;
  degatsPris += montant;
  if (pv <= 0) mortHeroine();
}

/** Ligne de stats pour le profil et le panneau. */
export function resumeCombat(): string {
  const s = state.stats;
  return `PV ${formatNombre(Math.ceil(pv), 0)}/${formatNombre(s.pvMax, 0)} — ${formatNombre(s.regen, 1)} PV/S — ${formatNombre(s.degats, 0)} DÉGÂTS`;
}

export { PORTE_SANS_FIN };
