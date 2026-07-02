// Sauvegarde cloud : chaque personnage a un CODE DE SYNCHRO secret.
// La partie est poussée vers /api/sauvegarde (Vercel + Redis) après
// chaque autosave (throttlé), et récupérée au démarrage si le cloud a
// une version plus récente. Sans API (jeu local, pas de base
// configurée), tout se dégrade silencieusement en local-only.

import { state } from '../core/state';
import { profilActif } from './profils';
import { importerJSON } from './save';
import { construirePanneau } from '../ui/panel';
import { ajouterToast } from '../ui/toasts';

const URL_API = 'api/sauvegarde';
let disponible: boolean | null = null;
let dernierePoussee = 0;

export function cloudDisponible(): boolean {
  return disponible === true;
}

/** Le code de synchro du personnage actif (stocké dans son profil). */
export function codeSync(): string | null {
  const profil = profilActif();
  if (!profil) return null;
  return (
    profil.codeSync ?? `CHLEA-${profil.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}`
  );
}

export async function pousserCloud(): Promise<boolean> {
  const code = codeSync();
  if (!code || disponible === false) return false;
  try {
    const reponse = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, donnees: JSON.stringify(state.save) }),
    });
    return reponse.ok;
  } catch {
    return false;
  }
}

export async function tirerCloud(code: string): Promise<string | null> {
  try {
    const reponse = await fetch(`${URL_API}?code=${encodeURIComponent(code)}`);
    if (!reponse.ok) return null;
    return (await reponse.json()).donnees ?? null;
  } catch {
    return null;
  }
}

/** Au démarrage : sonde l'API puis adopte la version cloud si plus récente. */
export async function initCloud(): Promise<void> {
  try {
    const reponse = await fetch(`${URL_API}?ping=1`);
    disponible = reponse.ok;
  } catch {
    disponible = false;
  }
  if (!disponible) return;

  const code = codeSync();
  if (!code) return;
  const distant = await tirerCloud(code);
  if (!distant) return;
  try {
    const donnees = JSON.parse(distant);
    if ((donnees.derniereVisite ?? 0) > (state.save.derniereVisite ?? 0) && importerJSON(distant)) {
      construirePanneau();
      ajouterToast('SAUVEGARDE CLOUD RÉCUPÉRÉE ! ☁');
    }
  } catch {
    // sauvegarde cloud illisible : on garde la locale
  }
}

/** À appeler régulièrement : pousse vers le cloud au plus 1×/minute. */
export function majCloud(): void {
  if (!cloudDisponible()) return;
  const maintenant = performance.now();
  if (maintenant - dernierePoussee < 60_000) return;
  dernierePoussee = maintenant;
  void pousserCloud();
}

/** À la fermeture de l'onglet : dernière poussée garantie (sendBeacon
 *  survit à la fermeture, contrairement à un fetch classique) — pour
 *  pouvoir reprendre immédiatement sur un autre appareil. */
function pousserALaFermeture(): void {
  const code = codeSync();
  if (!code || !cloudDisponible()) return;
  const corps = new Blob([JSON.stringify({ code, donnees: JSON.stringify(state.save) })], {
    type: 'application/json',
  });
  navigator.sendBeacon(URL_API, corps);
}

export function initBeaconCloud(): void {
  window.addEventListener('beforeunload', pousserALaFermeture);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pousserALaFermeture();
  });
}
