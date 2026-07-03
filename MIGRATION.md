# MIGRATION — travailler sur le projet depuis un autre PC

## 1. Ce qu'il faut copier

**Copie le dossier `birb/` EN ENTIER** (pas seulement `birb-like/`).
Des pièces essentielles vivent HORS du repo git :

| Chemin | Quoi | Dans git ? |
|---|---|---|
| `birb/birb-like/` | le jeu (repo git) | ✔ |
| `birb/GUIDE-COMPLET-SPOILERS.html` | le guide complet pour TOI (spoilers) | ✘ volontairement |
| `birb/plan-00…08.md`, `birb/plan refonte/`, `birb/v3/`, `birb/v4/` | LES SPÉCIFICATIONS (tous les plans de conception) | ✘ |
| `birb/perso/` | GLB de l'héroïne, des skins, doughcat, yuumi | ✘ (lourds) |
| `birb/export/` | GLB du bestiaire (+ `export/glb/v2`, `export/glb/compagnons`) | ✘ (lourds) |
| `birb/donjons/` | captures de référence du vrai Birb | ✘ |

Alternative si tu ne copies que le repo : `git clone
https://github.com/mahmoudel24rb-debug/chleatoune` — mais tu perds les plans
et les GLB sources (le jeu tourne sans eux ; ils ne servent qu'à générer de
NOUVEAUX sprites).

## 2. Installation sur le nouveau PC

```bash
# prérequis : Node 20+, Python 3.10+, git (+ gh CLI conseillé)
cd birb/birb-like
npm install
npm run dev                      # → http://localhost:5199 (port STRICT)

# pour les tests E2E :
pip install playwright
playwright install chromium
python tests-e2e/test_plan09.py  # avec le dev server lancé
```

## 3. Accès à remettre en place

1. **GitHub** : authentifie git/gh sur le compte `mahmoudel24rb-debug`
   (`gh auth login`). `git push` sur `main` = déploiement.
2. **Vercel/Upstash** : RIEN à faire — le déploiement passe par
   l'intégration GitHub de Vercel, et les clés Upstash sont des variables
   d'environnement du projet Vercel (jamais en local).
3. **Sauvegardes de jeu** : elles sont dans le CLOUD par code `CHLEA-…`
   (et/ou dans le localStorage de l'ancien navigateur). Pour récupérer une
   partie locale de l'ancien PC : menu Échap → EXPORTER (JSON) → IMPORTER
   sur le nouveau. Les personnages avec code cloud se reconnectent via
   « SE CONNECTER » au premier écran.

## 4. Reprendre avec Claude Code (VS Code)

1. Ouvre le dossier `birb/` (le parent, pour que les plans soient dans
   l'espace de travail) — le repo git est `birb/birb-like/`.
2. `CLAUDE.md` (à la racine du repo) sera lu automatiquement : il pointe
   vers [DOCUMENTATION.md](DOCUMENTATION.md) et les règles.
3. **Première session** : demande à Claude d'exécuter les instructions en
   tête de [MEMOIRE-CLAUDE.md](MEMOIRE-CLAUDE.md) — il ré-importera dans sa
   mémoire persistante tout le vécu du projet (leçons, pièges, décisions).
4. Vérification de santé : `npm run build` (doit être vert) puis
   `python tests-e2e/test_plan09.py` (23 OK attendus).

## 5. État au moment de la migration (2026-07-03)

- Tous les plans 01→18 sont implémentés et déployés (multijoueur plan 08 :
  non fait, volontairement). Tests verts : plan09, plans10-13, v3v4, dev.
- Tous les textes (dialogues, lettre de l'Atelier, blagues) sont écrits en
  version « fiction » — la lettre reste REMPLAÇABLE par une vraie lettre
  personnelle avant d'offrir (`config.ts → THEME.lettreAtelier`).
- À faire un jour : chronométrer « porte n+1 avec hotbar pleine »
  (EQUILIBRAGE-JOURNAL.md), jalons avancé/fin, et le playtest final.
- Electron : interrompu exprès, ne pas empaqueter sans demande.
