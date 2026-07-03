// Le « compte » cloud, façon Dofus : chaque personnage a un CODE DE
// CONNEXION secret. La partie ENTIÈRE (nom + skin + sauvegarde) est
// poussée vers /api/sauvegarde toutes les ~20 s et à la fermeture de
// l'onglet ; se connecter avec le code sur n'importe quel appareil
// restaure le personnage à l'identique et reprend la synchro.
// Sans API (jeu local), tout se dégrade silencieusement en local-only.

import { state } from '../core/state';
import { SKINS } from '../data/skins';
import { profilActif } from './profils';
import { importerJSON, sauvegardeVerrouillee } from './save';
import { construirePanneau } from '../ui/panel';
import { ajouterToast } from '../ui/toasts';

const URL_API = 'api/sauvegarde';
const CADENCE_MS = 20_000;
let disponible: boolean | null = null;
let dernierPassage = 0;

// La dernière version cloud que CET appareil connaît (a poussée ou
// adoptée). Si le cloud porte un `maj` plus récent, c'est qu'un autre
// appareil a joué : on adopte sa version au lieu de l'écraser.
function cleMaj(): string | null {
  const profil = profilActif();
  return profil ? `birblike_cloudmaj_${profil.id}` : null;
}
function majConnue(): number {
  const cle = cleMaj();
  return cle ? Number(localStorage.getItem(cle) ?? 0) : 0;
}
function retenirMaj(maj: number): void {
  const cle = cleMaj();
  if (cle) localStorage.setItem(cle, String(maj));
}

/** Ce qui voyage dans le cloud : le personnage complet. */
interface Enveloppe {
  v: 1;
  nom: string;
  skin: string;
  maj: number;
  donnees: string; // le JSON de la sauvegarde
}

export function cloudDisponible(): boolean {
  return disponible === true;
}

/** Le code de connexion du personnage actif (stocké dans son profil). */
export function codeSync(): string | null {
  const profil = profilActif();
  if (!profil) return null;
  return (
    profil.codeSync ?? `CHLEA-${profil.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}`
  );
}

function construireEnveloppe(): string | null {
  const profil = profilActif();
  if (!profil) return null;
  const enveloppe: Enveloppe = {
    v: 1,
    nom: profil.nom,
    skin: profil.skin,
    maj: Date.now(),
    donnees: JSON.stringify(state.save),
  };
  return JSON.stringify(enveloppe);
}

export async function pousserCloud(): Promise<boolean> {
  const code = codeSync();
  if (!code || disponible === false || sauvegardeVerrouillee()) return false;
  const donnees = construireEnveloppe();
  if (!donnees) return false;
  try {
    const reponse = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, donnees }),
    });
    if (reponse.ok) retenirMaj(JSON.parse(donnees).maj);
    return reponse.ok;
  } catch {
    return false;
  }
}

async function tirerBrut(code: string): Promise<string | null> {
  try {
    const reponse = await fetch(`${URL_API}?code=${encodeURIComponent(code)}`);
    if (!reponse.ok) return null;
    return (await reponse.json()).donnees ?? null;
  } catch {
    return null;
  }
}

/** Se connecter avec un code : retourne le personnage complet, ou null.
 *  (Tolère l'ancien format où le cloud ne stockait que la sauvegarde.) */
export async function connexionCloud(
  code: string
): Promise<{ nom: string; skin: string; donnees: string } | null> {
  const brut = await tirerBrut(code);
  if (!brut) return null;
  try {
    const objet = JSON.parse(brut);
    if (objet && typeof objet.donnees === 'string') {
      return {
        nom: typeof objet.nom === 'string' ? objet.nom : 'AVENTURIÈRE',
        skin: SKINS.some((s) => s.id === objet.skin) ? objet.skin : SKINS[0].id,
        donnees: objet.donnees,
      };
    }
    // ancien format : la sauvegarde brute, sans nom ni skin
    return { nom: 'AVENTURIÈRE', skin: SKINS[0].id, donnees: brut };
  } catch {
    return null;
  }
}

/** Adopte la version cloud si un AUTRE appareil a poussé depuis notre
 *  dernier passage. Retourne true si le cloud était plus récent. */
async function adopterSiPlusRecente(): Promise<boolean> {
  const code = codeSync();
  if (!code || sauvegardeVerrouillee()) return false;
  const brut = await tirerBrut(code);
  if (!brut) return false;
  try {
    const enveloppe = JSON.parse(brut);
    const estEnveloppe = enveloppe && typeof enveloppe.donnees === 'string';
    const donnees: string = estEnveloppe ? enveloppe.donnees : brut;
    // ancien format sans `maj` : on se rabat sur l'horodatage interne
    const maj: number = estEnveloppe
      ? (enveloppe.maj ?? 0)
      : (JSON.parse(donnees).derniereVisite ?? 0);
    if (maj <= majConnue()) return false;

    retenirMaj(maj);
    if (donnees === JSON.stringify(state.save)) return true; // identique : rien à faire
    if (importerJSON(donnees)) {
      construirePanneau();
      ajouterToast('PARTIE SYNCHRONISÉE DEPUIS LE CLOUD ☁');
    }
    return true;
  } catch {
    return false; // version cloud illisible : on garde la locale
  }
}

/** Au démarrage : sonde l'API puis rattrape la version la plus récente. */
export async function initCloud(): Promise<void> {
  try {
    const reponse = await fetch(`${URL_API}?ping=1`);
    disponible = reponse.ok;
  } catch {
    disponible = false;
  }
  if (!disponible) return;
  await adopterSiPlusRecente();
}

/** Cycle de synchro (throttlé à ~20 s) : on TIRE d'abord — si un autre
 *  appareil a joué, on adopte sa version ; sinon on pousse la nôtre.
 *  C'est ce qui permet de laisser un onglet ouvert sans qu'il écrase
 *  la progression faite ailleurs. */
export function majCloud(): void {
  if (!cloudDisponible() || sauvegardeVerrouillee()) return;
  const maintenant = performance.now();
  if (maintenant - dernierPassage < CADENCE_MS) return;
  dernierPassage = maintenant;
  void (async () => {
    const cloudPlusRecent = await adopterSiPlusRecente();
    if (!cloudPlusRecent) void pousserCloud();
  })();
}

/** Dernière poussée garantie à la fermeture (sendBeacon survit à la
 *  fermeture de l'onglet) + rattrapage quand l'onglet redevient visible
 *  (si on a joué ailleurs entre-temps). */
function pousserALaFermeture(): void {
  const code = codeSync();
  if (!code || !cloudDisponible() || sauvegardeVerrouillee()) return;
  const donnees = construireEnveloppe();
  if (!donnees) return;
  const corps = new Blob([JSON.stringify({ code, donnees })], { type: 'application/json' });
  navigator.sendBeacon(URL_API, corps);
}

export function initBeaconCloud(): void {
  window.addEventListener('beforeunload', pousserALaFermeture);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pousserALaFermeture();
    else if (cloudDisponible()) void adopterSiPlusRecente();
  });
}
