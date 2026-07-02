# Déployer Chléatoune sur Vercel 🚀

Le jeu est prêt pour Vercel : site statique + fonction serverless de
sauvegarde cloud (`api/sauvegarde.js`) + PWA installable.

## 1. Mettre en ligne (5 minutes)

Option A — depuis le terminal :

```bash
cd birb-like
npx vercel login        # connexion (e-mail ou GitHub)
npx vercel --prod       # déploie ; accepte les réponses par défaut
```

Vercel détecte Vite automatiquement (build `npm run build`, sortie
`dist/`). À la fin il affiche l'URL, du genre `https://birb-like.vercel.app`
— tu peux la renommer dans le dashboard (Settings → Domains), par
exemple `chleatoune.vercel.app`.

Option B — via GitHub : pousse le dossier sur un repo, puis « Import
Project » sur vercel.com ; chaque `git push` redéploiera tout seul.

## 2. Activer la sauvegarde cloud (optionnel mais recommandé)

Sans cette étape le jeu marche parfaitement, mais les sauvegardes ne
vivent que dans le navigateur de chaque joueur. Avec elle, chaque
personnage a un **code cloud** (`CHLEA-…`, visible dans le menu Échap)
et sa partie est à l'abri / récupérable sur n'importe quel appareil.

1. Dashboard Vercel → ton projet → onglet **Storage**.
2. **Create Database** → Marketplace → **Upstash** (Redis) → plan
   gratuit → **Connect** au projet.
3. C'est tout : les variables `UPSTASH_REDIS_REST_URL` / `…_TOKEN`
   sont injectées automatiquement et l'API `api/sauvegarde` devient
   active au prochain déploiement. En jeu, le menu Échap affichera
   « CODE CLOUD : … ☁ » au lieu de « (hors-ligne) ».

La synchro est automatique (~1×/minute pendant qu'on joue) ; l'écran
« QUI JOUE ? » propose « RÉCUPÉRER ☁ » avec un code pour rapatrier un
personnage sur un autre appareil.

## 3. L'installer comme une app sur son Mac

1. Ouvrir l'URL dans **Safari** → menu **Fichier → Ajouter au Dock**
   (ou dans Chrome : icône « Installer » dans la barre d'adresse).
2. L'icône Chléatoune apparaît dans le Dock ; le jeu s'ouvre dans sa
   propre fenêtre, sans navigateur visible, et marche même hors-ligne.

## Notes

- Les sauvegardes locales restent dans le navigateur (localStorage),
  le cloud est une copie de sécurité ; l'export/import JSON du menu
  Échap fonctionne toujours.
- Chaque personnage (écran « QUI JOUE ? ») a sa propre progression.
- Coût total : 0 € (plans gratuits Vercel + Upstash, largement
  suffisants pour un jeu à deux).
