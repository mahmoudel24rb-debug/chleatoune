// HUD en DOM par-dessus le canvas (plan 04, étape 5) : capsules de
// monnaies avec taux « /s », bouton AUTO, indicateur et flèches de zone,
// barre de progression du rebirb, boutons du bas.

import { INDEX_DONJON, MONNAIES, THEME, ZONES, type MonnaieId } from '../data/config';
import { autoDebloque, ordinal, seuilRebirb, zonesDebloquees } from '../data/progression';
import { xpPourNiveau } from '../data/combat';
import { jeu } from '../core/mode';
import { state } from '../core/state';
import { el, formatNombre } from '../core/utils';
import { SPRITES_MONNAIES, SPRITE_PLUME, SPRITE_SMISKI_DORE } from '../core/sprites';
import { taux } from '../systems/economy';
import { getMaledictionsActives, getPorte, getPv, getVague, pvMaxCourant } from '../systems/donjon';
import { defiCourant } from '../systems/defis';
import { indiceCourant } from '../systems/chasses';
import { ligneFilRouge } from '../systems/filrouge';
import { sons } from '../systems/audio';
import { sauvegarder } from '../systems/save';
import { ajouterToast } from './toasts';
import { basculerParametres, ouvrirProfil } from './overlays';

type CleCapsule = MonnaieId | 'plume' | 'dore';

interface Capsule {
  racine: HTMLElement;
  valeurEl: HTMLElement;
  tauxEl: HTMLElement;
}

const capsules = new Map<CleCapsule, Capsule>();
let btnAuto: HTMLButtonElement;
let zoneIndicateur: HTMLElement;
let suivi: HTMLElement;
let flecheGauche: HTMLButtonElement;
let flecheDroite: HTMLButtonElement;
let barreTexte: HTMLElement;
let barreFill: HTMLElement;
let xpNiveau: HTMLElement;
let xpFill: HTMLElement;
let pvTexte: HTMLElement;
let pvFill: HTMLElement;
let barreXp: HTMLElement;
let barrePv: HTMLElement;

function setTexte(e: HTMLElement, texte: string): void {
  if (e.textContent !== texte) e.textContent = texte;
}

function creerCapsule(cle: CleCapsule): Capsule {
  const racine = el('div', 'capsule');
  const icone =
    cle === 'plume' ? SPRITE_PLUME : cle === 'dore' ? SPRITE_SMISKI_DORE : SPRITES_MONNAIES[cle];
  racine.appendChild(icone);
  const valeurEl = el('span', 'valeur', '0');
  const tauxEl = el('span', 'taux', '(+0/s)');
  racine.append(valeurEl, tauxEl);
  return { racine, valeurEl, tauxEl };
}

export function initHud(): void {
  const hud = document.getElementById('hud')!;
  const ordre: CleCapsule[] = ['popcorn', 'plume', 'dore', 'graine', 'brindille', 'minerai'];
  for (const cle of ordre) {
    const capsule = creerCapsule(cle);
    capsules.set(cle, capsule);
    hud.appendChild(capsule.racine);
  }

  // Pulse de la capsule quand la monnaie gagne (plan 07, juice).
  window.addEventListener('birb-gain', (e) => {
    const monnaie = (e as CustomEvent<MonnaieId>).detail;
    const capsule = capsules.get(monnaie);
    if (!capsule) return;
    capsule.racine.classList.remove('pulse');
    void capsule.racine.offsetWidth; // relance l'animation CSS
    capsule.racine.classList.add('pulse');
  });

  btnAuto = document.getElementById('btn-auto') as HTMLButtonElement;
  btnAuto.addEventListener('click', basculerAuto);

  zoneIndicateur = document.getElementById('zone-indicateur')!;

  // ligne de suivi (plan 15/16) : Fil Rouge + indice de chasse, en haut
  // à gauche, modes monde/antre seulement
  suivi = el('div', 'suivi cache');
  document.getElementById('game-area')!.appendChild(suivi);
  flecheGauche = document.getElementById('fleche-gauche') as HTMLButtonElement;
  flecheDroite = document.getElementById('fleche-droite') as HTMLButtonElement;
  flecheGauche.addEventListener('click', () => changerZone(-1));
  flecheDroite.addEventListener('click', () => changerZone(1));

  barreTexte = document.getElementById('barre-rebirb-texte')!;
  barreFill = document.getElementById('barre-rebirb-fill')!;
  xpNiveau = document.getElementById('barre-xp-niveau')!;
  xpFill = document.getElementById('barre-xp-fill')!;
  pvTexte = document.getElementById('barre-pv-texte')!;
  pvFill = document.getElementById('barre-pv-fill')!;
  barreXp = document.getElementById('barre-xp')!;
  barrePv = document.getElementById('barre-pv')!;

  const bas = document.getElementById('boutons-bas')!;
  const btn = (texte: string, action: () => void) => {
    const b = el('button', 'btn btn-bas', texte);
    b.addEventListener('click', action);
    bas.appendChild(b);
  };
  btn('CHAT (T)', () => ajouterToast('LE CHAT ARRIVERA AVEC LE MULTIJOUEUR !'));
  btn('CLASSEMENT', () => ajouterToast('LE CLASSEMENT ARRIVERA AVEC LE MULTIJOUEUR !'));
  btn('PROFIL (P)', ouvrirProfil);
  btn('MENU (ÉCHAP)', basculerParametres);
}

export function basculerAuto(): void {
  if (!autoDebloque(state.save.rebirbs)) {
    sons.refus();
    ajouterToast(`LE MODE AUTO SE DÉBLOQUE AU 1ER ${THEME.prestige.verbe} !`);
    return;
  }
  state.save.auto = !state.save.auto;
  sauvegarder();
}

/** Zones navigables : celles dont le seuil de rebirbs est atteint,
 *  plus le donjon (toujours accessible, en dernier). */
function zonesAccessibles(): number[] {
  const liste: number[] = [];
  ZONES.forEach((z, i) => {
    if (z.donjon) return;
    if (state.save.rebirbs >= (z.rebirbsRequis ?? 0)) liste.push(i);
  });
  liste.push(INDEX_DONJON);
  return liste;
}

export function changerZone(delta: number): void {
  const acces = zonesAccessibles();
  const index = acces.indexOf(state.save.zone);
  const nouvel = index + delta;
  if (index < 0 || nouvel < 0 || nouvel >= acces.length) return;
  state.save.zone = acces[nouvel];
  sauvegarder();
  // Petite transition visuelle (plan 06, étape 7).
  const wrap = document.getElementById('game-wrap')!;
  wrap.classList.remove('flash');
  void wrap.offsetWidth;
  wrap.classList.add('flash');
}

export function majHud(): void {
  const save = state.save;
  const nbZones = zonesDebloquees(save.rebirbs);

  // Capsules : valeurs, taux, visibilité
  for (const [cle, capsule] of capsules) {
    if (cle === 'plume') {
      setTexte(capsule.valeurEl, formatNombre(save.plumes, 0));
      setTexte(capsule.tauxEl, `(+${taux('plume').toFixed(1)}/s)`);
      continue;
    }
    if (cle === 'dore') {
      const visible = save.cumulDore > 0 || save.rebirbs >= 1;
      capsule.racine.style.display = visible ? '' : 'none';
      if (!visible) continue;
      setTexte(capsule.valeurEl, formatNombre(save.soldeDore, 0));
      setTexte(capsule.tauxEl, `(+${taux('dore').toFixed(1)}/s)`);
      continue;
    }
    const index = MONNAIES.indexOf(cle);
    const visible = index < nbZones;
    capsule.racine.style.display = visible ? '' : 'none';
    if (!visible) continue;
    setTexte(capsule.valeurEl, formatNombre(save.soldes[cle]));
    setTexte(capsule.tauxEl, `(+${taux(cle).toFixed(1)}/s)`);
  }

  // Bouton AUTO
  if (!autoDebloque(save.rebirbs)) {
    setTexte(btnAuto, 'AUTO : 🔒');
    btnAuto.classList.remove('on');
  } else {
    setTexte(btnAuto, save.auto ? 'AUTO : ON' : 'AUTO : OFF');
    btnAuto.classList.toggle('on', save.auto);
  }

  // Zone : indicateur + flèches (selon le mode de jeu)
  const zone = ZONES[save.zone];
  const acces = zonesAccessibles();
  const indexAcces = acces.indexOf(save.zone);
  if (jeu.mode === 'donjon') {
    const porte = getPorte();
    const vague = getVague();
    // ligne défi (plan 14 §1) : ✓ tant que tenu, ✗ dès l'échec
    const defi = defiCourant();
    const texteDefi = defi
      ? ` · 🎯 ${defi.nom} ${defi.rate ? '✗' : defi.accompli ? '✓ !' : '✓'}`
      : '';
    const maledictions = getMaledictionsActives();
    const texteMaledictions = maledictions.length > 0 ? ` · ☠×${maledictions.length}` : '';
    setTexte(
      zoneIndicateur,
      (porte
        ? porte.sansFin
          ? `∞ ${porte.nom} — VAGUE ${vague.index + 1}`
          : `⚔ ${porte.nom} — VAGUE ${Math.min(vague.index + 1, vague.total)}/${vague.total}`
        : '⚔ DONJON') +
        texteDefi +
        texteMaledictions
    );
  } else if (jeu.mode === 'antre') {
    // « L'ENVERS » (plan 15 §1) : l'envers de la tapisserie, ses 12 accrocs
    setTexte(zoneIndicateur, `🚪 L'ENVERS — ACCROCS : ${Math.min(save.swarm.porteMax, 12)}/12`);
  } else if (jeu.mode === 'peche') {
    setTexte(zoneIndicateur, `LE PONTON 🎣 NIV. ${save.peche.niveau}`);
  } else {
    setTexte(
      zoneIndicateur,
      zone.donjon ? 'HALL DU DONJON' : `${zone.nom} ${indexAcces + 1}/${acces.length}`
    );
  }
  // ligne de suivi : Fil Rouge (plan 15) + indice de chasse (plan 16)
  const lignesSuivi: string[] = [];
  if (jeu.mode === 'monde' || jeu.mode === 'antre') {
    const fil = ligneFilRouge();
    if (fil) lignesSuivi.push(fil);
    const indice = indiceCourant();
    if (indice && jeu.mode === 'monde') lignesSuivi.push(indice);
  }
  const texteSuivi = lignesSuivi.join('\n');
  if (suivi.textContent !== texteSuivi) suivi.textContent = texteSuivi;
  suivi.classList.toggle('cache', texteSuivi === '');

  const enMonde = jeu.mode === 'monde';
  flecheGauche.style.display = enMonde && indexAcces > 0 ? '' : 'none';
  flecheDroite.style.display =
    enMonde && indexAcces >= 0 && indexAcces + 1 < acces.length ? '' : 'none';
  btnAuto.style.display = enMonde ? '' : 'none';

  // Niveau + PV : seulement en expédition — les cartes paisibles
  // restent paisibles (moins d'UI).
  const enExped = jeu.mode === 'donjon';
  barreXp.style.display = enExped ? '' : 'none';
  barrePv.style.display = enExped ? '' : 'none';
  if (enExped) {
    const heros = save.heros;
    setTexte(xpNiveau, `NIV. ${heros.niveau}`);
    const pctXp = `${((heros.xp / xpPourNiveau(heros.niveau)) * 100).toFixed(1)}%`;
    if (xpFill.style.width !== pctXp) xpFill.style.width = pctXp;

    const pv = getPv();
    const pvMax = pvMaxCourant(); // VERRE FILÉ réduit le max en donjon
    setTexte(pvTexte, `${formatNombre(Math.ceil(pv), 0)}/${formatNombre(pvMax, 0)} PV`);
    const pctPv = `${((pv / pvMax) * 100).toFixed(1)}%`;
    if (pvFill.style.width !== pctPv) pvFill.style.width = pctPv;
  }

  // Barre de rebirb (plan 06, étape 2)
  const seuil = seuilRebirb(save.rebirbs);
  const pct = Math.min(100, (save.cumulCycle / seuil) * 100);
  setTexte(
    barreTexte,
    `PROCHAIN : ${formatNombre(seuil, 0)} ${THEME.monnaies.popcorn.nom} = ${ordinal(save.rebirbs + 1)} ${THEME.prestige.verbe} — ${Math.floor(pct)} %`
  );
  const largeur = `${pct.toFixed(1)}%`;
  if (barreFill.style.width !== largeur) barreFill.style.width = largeur;
}
