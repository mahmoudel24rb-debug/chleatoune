// Le panneau droit (plan 05) : onglets de monnaies, sous-onglets
// AMÉLIORATIONS / REBIRB, cartes d'achat avec bouton MAX.
// Le DOM est construit une fois ; seuls les textes et classes changent.

import { MONNAIES, THEME, type MonnaieId } from '../data/config';
import { AMELIORATIONS, coutAmelioration, type Amelioration } from '../data/upgrades';
import {
  ordinal,
  plumesGagnees,
  prochainDeblocage,
  seuilRebirb,
  zonesDebloquees,
} from '../data/progression';
import { niveau, recalculerStats, state } from '../core/state';
import { el, formatNombre } from '../core/utils';
import { sons } from '../systems/audio';
import { sauvegarder } from '../systems/save';
import { faireRebirb, rebirbDisponible } from '../systems/rebirb';
import { COMPETENCES, xpPourNiveau } from '../data/combat';
import { COMPAGNONS_BIOMES, UNITES_MAX } from '../data/compagnons-biomes';
import { ZONES } from '../data/config';
import { jeu } from '../core/mode';
import { acheterCompetence, reinitialiserCompetences, resumeCombat } from '../systems/donjon';
import { biomesEnRecolte } from '../systems/compagnons';

let ongletActif: MonnaieId = 'popcorn';
let sousOnglet: 'ameliorations' | 'rebirb' | 'competences' = 'ameliorations';
let rebirbArme = false;
let timerDesarmement = 0;

interface RefsCarte {
  a: Amelioration;
  niveauEl: HTMLElement;
  valeursEl: HTMLElement;
  btnAchat: HTMLButtonElement;
  btnMax: HTMLButtonElement;
}

interface RefsOnglet {
  btn: HTMLButtonElement;
  badge: HTMLElement;
}

let cartes: RefsCarte[] = [];
const onglets = new Map<MonnaieId, RefsOnglet>();
let sousBtnAmeliorations: HTMLButtonElement;
let sousBtnRebirb: HTMLButtonElement;
let sousBtnCompetences: HTMLButtonElement;
let badgeRebirb: HTMLElement;
let badgeCompetences: HTMLElement;
let refsCompetences: {
  spEl: HTMLElement;
  statsEl: HTMLElement;
  niveauEl: HTMLElement;
  lignes: { id: (typeof COMPETENCES)[number]['id']; niveauEl: HTMLElement; btn: HTMLButtonElement }[];
} | null = null;
let refsRebirb: {
  cycleEl: HTMLElement;
  gainEl: HTMLElement;
  bonusEl: HTMLElement;
  deblocageEl: HTMLElement;
  btn: HTMLButtonElement;
} | null = null;
let refsCompagnons: { entete: HTMLElement; lignes: HTMLElement[] } | null = null;

function arbreDebloque(m: MonnaieId): boolean {
  return MONNAIES.indexOf(m) < zonesDebloquees(state.save.rebirbs);
}

function arbreAbordable(m: MonnaieId): boolean {
  return AMELIORATIONS.some((a) => {
    if (a.arbre !== m) return false;
    const niv = niveau(a.id);
    return niv < a.niveauMax && state.save.soldes[m] >= coutAmelioration(a, niv);
  });
}

function acheter(a: Amelioration, max: boolean): void {
  let niv = niveau(a.id);
  let solde = state.save.soldes[a.arbre];
  let achats = 0;
  do {
    if (niv >= a.niveauMax) break;
    const cout = coutAmelioration(a, niv);
    if (solde < cout) break;
    solde -= cout;
    niv += 1;
    achats += 1;
  } while (max);

  if (achats === 0) {
    sons.refus();
    return;
  }
  state.save.soldes[a.arbre] = solde;
  state.save.niveaux[a.id] = niv;
  // Ré-application immédiate des effets : spawner, vitesse… (plan 05, étape 6)
  recalculerStats();
  sons.achat();
  sauvegarder();
  majPanneau();
}

function construireCarte(a: Amelioration): HTMLElement {
  const carte = el('div', 'carte');
  const haut = el('div', 'carte-haut');
  const niveauEl = el('span', 'carte-niveau');
  haut.append(el('span', 'carte-nom', a.nom), niveauEl);
  const valeursEl = el('div', 'carte-valeurs');
  const achats = el('div', 'carte-achats');
  const btnAchat = el('button', 'btn btn-achat');
  const btnMax = el('button', 'btn btn-max', 'MAX');
  btnAchat.addEventListener('click', () => acheter(a, false));
  btnMax.addEventListener('click', () => acheter(a, true));
  achats.append(btnAchat, btnMax);
  carte.append(haut, el('div', 'carte-desc', a.desc), valeursEl, achats);
  cartes.push({ a, niveauEl, valeursEl, btnAchat, btnMax });
  return carte;
}

function construireVueCompetences(): HTMLElement {
  const vue = el('div', 'vue-rebirb');
  vue.appendChild(el('h2', '', 'COMPÉTENCES'));
  vue.appendChild(
    el(
      'p',
      'rebirb-explication',
      'Gagne de l’XP en combattant au donjon (dernière zone, flèche droite). Chaque niveau donne des points (SP) à répartir.'
    )
  );
  const niveauEl = el('div', 'rebirb-ligne');
  const spEl = el('div', 'rebirb-ligne');
  const statsEl = el('div', 'rebirb-ligne');
  vue.append(niveauEl, spEl, statsEl);

  const lignes: NonNullable<typeof refsCompetences>['lignes'] = [];
  for (const c of COMPETENCES) {
    const carte = el('div', 'carte');
    const haut = el('div', 'carte-haut');
    const niveauCompEl = el('span', 'carte-niveau');
    haut.append(el('span', 'carte-nom', c.nom), niveauCompEl);
    const achats = el('div', 'carte-achats');
    const btn = el('button', 'btn btn-achat', '+1 (1 SP)');
    btn.addEventListener('click', () => {
      if (!acheterCompetence(c.id)) sons.refus();
      majPanneau();
    });
    achats.appendChild(btn);
    carte.append(haut, el('div', 'carte-desc', c.desc), achats);
    vue.appendChild(carte);
    lignes.push({ id: c.id, niveauEl: niveauCompEl, btn });
  }

  const btnReset = el('button', 'btn btn-rebirb', 'RÉINITIALISER LES COMPÉTENCES');
  btnReset.addEventListener('click', () => {
    reinitialiserCompetences();
    sons.achat();
    majPanneau();
  });
  vue.appendChild(btnReset);

  // section COMPAGNONS (plan 13 §6) : espèces, unités, rôle, état
  vue.appendChild(el('h2', '', 'COMPAGNONS'));
  const enteteCompagnons = el('div', 'rebirb-ligne');
  vue.appendChild(enteteCompagnons);
  const lignesCompagnons = COMPAGNONS_BIOMES.map(() => {
    const ligne = el('div', 'rebirb-ligne');
    vue.appendChild(ligne);
    return ligne;
  });
  refsCompagnons = { entete: enteteCompagnons, lignes: lignesCompagnons };

  refsCompetences = { spEl, statsEl, niveauEl, lignes };
  return vue;
}

function construireVueRebirb(): HTMLElement {
  const vue = el('div', 'vue-rebirb');
  vue.appendChild(el('h2', '', THEME.prestige.verbe));
  vue.appendChild(
    el(
      'p',
      'rebirb-explication',
      `Recouds le fil de ton aventure : ${THEME.monnaies.popcorn.nom.toLowerCase()} et améliorations repartent à zéro, mais tu gagnes des ${THEME.prestige.nom.toLowerCase()} permanentes.`
    )
  );
  const cycleEl = el('div', 'rebirb-ligne');
  const gainEl = el('div', 'rebirb-ligne');
  const bonusEl = el('div', 'rebirb-ligne');
  const deblocageEl = el('div', 'rebirb-ligne');
  const btn = el('button', 'btn btn-rebirb');
  btn.addEventListener('click', () => {
    if (!rebirbDisponible()) {
      sons.refus();
      return;
    }
    if (!rebirbArme) {
      // Confirmation en deux temps (plan 06, étape 3).
      rebirbArme = true;
      timerDesarmement = window.setTimeout(() => {
        rebirbArme = false;
        majPanneau();
      }, 3000);
      majPanneau();
      return;
    }
    window.clearTimeout(timerDesarmement);
    rebirbArme = false;
    if (faireRebirb()) construirePanneau(); // de nouveaux onglets peuvent apparaître
  });
  vue.append(cycleEl, gainEl, bonusEl, deblocageEl, btn);
  refsRebirb = { cycleEl, gainEl, bonusEl, deblocageEl, btn };
  return vue;
}

export function construirePanneau(): void {
  const panneau = document.getElementById('ui-panel')!;
  panneau.textContent = '';
  cartes = [];
  onglets.clear();
  refsRebirb = null;
  refsCompetences = null;
  refsCompagnons = null;
  if (!arbreDebloque(ongletActif)) ongletActif = 'popcorn';

  panneau.appendChild(el('h1', '', THEME.titre));

  // Onglets de monnaies (les arbres cachés le restent tant que non débloqués)
  const barreOnglets = el('div', 'onglets');
  for (const m of MONNAIES) {
    const btn = el('button', 'btn onglet', THEME.monnaies[m].nom);
    const badge = el('span', 'badge', '!');
    btn.appendChild(badge);
    btn.addEventListener('click', () => {
      ongletActif = m;
      construirePanneau();
    });
    barreOnglets.appendChild(btn);
    onglets.set(m, { btn, badge });
  }
  panneau.appendChild(barreOnglets);

  // Sous-onglets AMÉLIORATIONS / COMPÉTENCES / REBIRB
  const sous = el('div', 'sous-onglets');
  sousBtnAmeliorations = el('button', 'btn sous-onglet', 'AMÉLIORATIONS');
  sousBtnCompetences = el('button', 'btn sous-onglet', 'COMPÉTENCES');
  sousBtnRebirb = el('button', 'btn sous-onglet', THEME.prestige.verbe);
  badgeRebirb = el('span', 'badge', '!');
  badgeCompetences = el('span', 'badge', '!');
  sousBtnRebirb.appendChild(badgeRebirb);
  sousBtnCompetences.appendChild(badgeCompetences);
  sousBtnAmeliorations.addEventListener('click', () => {
    sousOnglet = 'ameliorations';
    construirePanneau();
  });
  sousBtnCompetences.addEventListener('click', () => {
    sousOnglet = 'competences';
    construirePanneau();
  });
  sousBtnRebirb.addEventListener('click', () => {
    sousOnglet = 'rebirb';
    construirePanneau();
  });
  sous.append(sousBtnAmeliorations, sousBtnCompetences, sousBtnRebirb);
  panneau.appendChild(sous);

  // Contenu : cartes de l'arbre actif, compétences ou vue rebirb
  const contenu = el('div', 'contenu-panneau');
  if (sousOnglet === 'ameliorations') {
    for (const a of AMELIORATIONS) {
      if (a.arbre === ongletActif) contenu.appendChild(construireCarte(a));
    }
  } else if (sousOnglet === 'competences') {
    contenu.appendChild(construireVueCompetences());
  } else {
    contenu.appendChild(construireVueRebirb());
  }
  panneau.appendChild(contenu);

  // Footer : rappel des contrôles (plan 05, étape 7)
  const footer = el('footer', 'footer-panneau');
  footer.append(
    el('div', '', 'ZQSD / WASD / FLÈCHES : SE DÉPLACER'),
    el('div', '', 'E : INTERAGIR — ESPACE : PÊCHER'),
    el('div', '', 'C : AUTO — F : MIKUDEX — P : PROFIL'),
    el('div', '', 'ÉCHAP : MENU — T : CHAT — F1 : DEBUG')
  );
  panneau.appendChild(footer);

  majPanneau();
}

/** Rafraîchit textes et classes ; appelé après achat + toutes les ~200 ms. */
export function majPanneau(): void {
  const save = state.save;

  // Onglets : visibilité, actif, badge « ! » si un achat y est abordable
  for (const [m, refs] of onglets) {
    const debloque = arbreDebloque(m);
    refs.btn.style.display = debloque ? '' : 'none';
    if (!debloque) continue;
    refs.btn.classList.toggle('actif', m === ongletActif && sousOnglet === 'ameliorations');
    refs.badge.style.display =
      arbreAbordable(m) && !(m === ongletActif && sousOnglet === 'ameliorations') ? '' : 'none';
  }

  sousBtnAmeliorations.classList.toggle('actif', sousOnglet === 'ameliorations');
  sousBtnCompetences.classList.toggle('actif', sousOnglet === 'competences');
  sousBtnRebirb.classList.toggle('actif', sousOnglet === 'rebirb');
  badgeRebirb.style.display = rebirbDisponible() && sousOnglet !== 'rebirb' ? '' : 'none';
  badgeCompetences.style.display =
    save.heros.sp > 0 && sousOnglet !== 'competences' ? '' : 'none';

  // Vue compétences
  if (refsCompetences) {
    setTexte(
      refsCompetences.niveauEl,
      `NIVEAU ${save.heros.niveau} — XP : ${formatNombre(save.heros.xp, 0)} / ${formatNombre(xpPourNiveau(save.heros.niveau), 0)}`
    );
    setTexte(refsCompetences.spEl, `POINTS DISPONIBLES : ${formatNombre(save.heros.sp, 0)} SP`);
    setTexte(refsCompetences.statsEl, resumeCombat());
    for (const ligne of refsCompetences.lignes) {
      setTexte(ligne.niveauEl, `NIV. ${save.heros.competences[ligne.id]}`);
      ligne.btn.disabled = save.heros.sp < 1;
      ligne.btn.classList.toggle('affordable', save.heros.sp >= 1);
    }
  }

  // Section compagnons (plan 13 §6)
  const rc = refsCompagnons;
  if (rc) {
    const n = biomesEnRecolte();
    setTexte(
      rc.entete,
      n > 0 ? `🐾 TES COMPAGNONS RÉCOLTENT DANS ${n} BIOME${n > 1 ? 'S' : ''}` : '🐾 ADOPTE DES COMPAGNONS AUX PANNEAUX DES BIOMES'
    );
    COMPAGNONS_BIOMES.forEach((def, i) => {
      const u = save.compagnons[def.id] ?? 0;
      const auCombat = jeu.mode === 'donjon' && save.swarm.escouade.includes(def.id) && u >= UNITES_MAX;
      const etat =
        u === 0
          ? '—'
          : auCombat
            ? 'AU COMBAT ⚔'
            : jeu.mode === 'monde' && save.zone === def.zone
              ? 'RÉCOLTE ICI'
              : 'RÉCOLTE À DISTANCE';
      setTexte(
        rc.lignes[i],
        `${def.nom} (${ZONES[def.zone].nom}) : ${u}/${UNITES_MAX} — ${etat}${u >= UNITES_MAX ? ' ★' : ''}`
      );
    });
  }

  // Cartes
  const nomMonnaie = THEME.monnaies[ongletActif].nom;
  for (const c of cartes) {
    const niv = niveau(c.a.id);
    const auMax = niv >= c.a.niveauMax;
    const cout = auMax ? 0 : coutAmelioration(c.a, niv);
    const abordable = !auMax && save.soldes[c.a.arbre] >= cout;

    setTexte(c.niveauEl, `NIV. ${niv}/${c.a.niveauMax}`);
    setTexte(c.valeursEl, auMax ? c.a.affichage(niv - 1).split('→')[1].trim() + ' (MAX)' : c.a.affichage(niv));
    setTexte(c.btnAchat, auMax ? 'MAX ATTEINT' : `${formatNombre(cout, 0)} ${nomMonnaie}`);
    c.btnAchat.disabled = auMax;
    c.btnAchat.classList.toggle('affordable', abordable);
    c.btnAchat.classList.toggle('expensive', !auMax && !abordable);
    c.btnMax.disabled = !abordable;
  }

  // Vue rebirb
  if (refsRebirb) {
    const seuil = seuilRebirb(save.rebirbs);
    const gain = plumesGagnees(save.rebirbs);
    const bonus = Math.round(save.plumes * 10); // +10 % par plume
    setTexte(
      refsRebirb.cycleEl,
      `${THEME.monnaies.popcorn.nom} DU CYCLE : ${formatNombre(save.cumulCycle, 0)} / ${formatNombre(seuil, 0)}`
    );
    setTexte(refsRebirb.gainEl, `${THEME.prestige.nom} SI ${THEME.prestige.verbe} : +${gain}`);
    setTexte(refsRebirb.bonusEl, `BONUS ACTUEL : +${bonus} % (${save.plumes} ${THEME.prestige.nom.toLowerCase()})`);
    setTexte(refsRebirb.deblocageEl, `PROCHAIN DÉBLOCAGE : ${prochainDeblocage(save.rebirbs)}`);

    const dispo = rebirbDisponible();
    refsRebirb.btn.disabled = !dispo;
    refsRebirb.btn.classList.toggle('affordable', dispo);
    setTexte(
      refsRebirb.btn,
      rebirbArme
        ? 'SÛR·E ? CLIQUE ENCORE !'
        : `${ordinal(save.rebirbs + 1)} ${THEME.prestige.verbe} → +${gain} ${THEME.prestige.nom}`
    );
  }
}

function setTexte(e: HTMLElement, texte: string): void {
  if (e.textContent !== texte) e.textContent = texte;
}
