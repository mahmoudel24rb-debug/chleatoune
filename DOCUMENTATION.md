# CHLÉATOUNE — Documentation complète du projet

> Jeu incrémental type Birb.io, **cadeau personnalisé** construit sur mesure.
> Héroïne : Chibi Crystal Rose Gwen (thème couturière — le prestige s'appelle
> la **RECOUTURE**). Déployé sur **https://chleatoune.vercel.app** (web + PWA
> installable, la destinataire joue sur MacBook).
>
> Ce fichier est la référence. Voir aussi : [MIGRATION.md](MIGRATION.md)
> (changer de PC), [CLAUDE.md](CLAUDE.md) (brief pour Claude Code),
> [PERSONNALISATION.md](PERSONNALISATION.md), [DEPLOIEMENT.md](DEPLOIEMENT.md),
> [EQUILIBRAGE-JOURNAL.md](EQUILIBRAGE-JOURNAL.md).

---

## 1. Stack & principes

| Quoi | Choix |
|---|---|
| Build | **Vite + TypeScript vanilla** (`tsc && vite build`), zéro framework |
| Rendu | **Canvas 2D** unique (`#game-area`), pixel art échelle ×3, `image-rendering: pixelated` |
| UI | DOM par-dessus le canvas (panneau droit, HUD, modals) — dans `#game-wrap` |
| Dépendances runtime | **AUCUNE** (three.js/Playwright uniquement en outillage hors build) |
| Backend | 1 seule fonction Vercel : `api/sauvegarde.js` + **Upstash Redis** (sauvegarde cloud) |
| Hébergement | Vercel, auto-déployé à chaque `git push` sur `main` (repo GitHub `mahmoudel24rb-debug/chleatoune`) |
| Tests | Playwright (Python) dans `tests-e2e/`, pilotent le jeu via `window.__jeu` |
| Langue | **TOUT en français** : code, commentaires, textes |

**Règles de la maison** (à respecter dans toute contribution) :
1. Données dans `src/data/*.ts`, systèmes dans `src/systems/*.ts`, entités dans
   `src/entities/*.ts`, cœur dans `src/core/*.ts`, UI dans `src/ui/*.ts`.
2. **Aucune valeur d'équilibrage en dur dans un système** — tout vit dans les
   fichiers de données (surtout `data/swarm.ts`).
3. Un seul chemin de dégâts vers les monstres (`infligerAuMonstre`) et un seul
   vers l'héroïne (`blesserHeroine`) — tout s'y branche (défis, buffs, quêtes).
4. C'est un cadeau : **en cas de doute d'équilibrage, la version la plus clémente**.
5. Les plans de conception (dossiers `../plan refonte/`, `../v3/`, `../v4/` et
   `../plan-0X-*.md`) sont la spécification d'origine — les lire avant de
   toucher un système qu'ils décrivent.

## 2. Lancer le projet

```bash
npm install
npm run dev          # port 5199 STRICT (vite.config.ts) — ne pas changer :
                     # le localStorage est lié à l'origine, changer de port
                     # « perd » les sauvegardes locales
npm run build        # tsc && vite build → dist/
```

Le cloud est absent en local : `systems/cloud.ts` se dégrade silencieusement
(les 404 de `/api/sauvegarde` en console locale sont NORMAUX).

## 3. Arborescence commentée

```
birb-like/
├── api/sauvegarde.js        # fonction Vercel : GET/POST enveloppe {v, nom, skin, maj, donnees}
├── public/
│   ├── assets/              # PNG des skins héroïne, doughcat, yuumi (pipeline GLB)
│   ├── assets/monstres/     # 240 PNG du bestiaire GLB (m_*, b_*, c_*, pnj_*) + manifest.json
│   ├── guide.html           # guide SANS spoilers (accessible en jeu)
│   ├── manifest.webmanifest + sw.js   # PWA (le SW n'intercepte JAMAIS /api/)
├── src/
│   ├── core/    canvas, loop, camera, input, mode, state (SaveData), utils,
│   │            sprites (pixel-maps + chargeur GLB), sprites-poissons, structures,
│   │            decor, grille (hash spatial)
│   ├── data/    config (THEME/ZONES/lettre), swarm (ÉQUILIBRAGE), combat, monstres,
│   │            boss, portes, parchemins, sorts, compagnons-biomes, defis,
│   │            maledictions, archimonstres, succes, secrets, chasses, calendrier,
│   │            pnj, dialogues, filrouge, poissons, poissons-sprites, peche-config,
│   │            peche-boutique, cuisine, upgrades, talents, desert, progression, skins
│   ├── entities/ birb, monstre, collectible, projectile (pool)
│   ├── systems/ spawner, economy, donjon, antre, sorts, defis, compagnons,
│   │            telegraphes, peche, besace, consommables, succes, chasses,
│   │            calendrier, filrouge, quetes, nid, carte (aménagement des zones),
│   │            interactions, rebirb, save, profils, cloud, fx, audio
│   ├── ui/      hud, panel, overlays (TOUS les modals), dialogue, toasts,
│   │            creation (écran QUI JOUE ?), dev (mode dev F1)
│   └── main.ts  câblage + update/render + poignée de test window.__jeu
├── tests-e2e/               # suites Playwright (voir §10)
├── saves-test/              # 4 sauvegardes jalons d'équilibrage (plan 12 §7)
├── outils/rendu-glb/        # pipeline GLB → sprites (voir §9)
└── electron/                # plomberie bureau INERTE (empaquetage interrompu exprès)
```

## 4. Les modes de jeu & la boucle

`core/mode.ts` : `'monde' | 'antre' | 'donjon' | 'peche'`.

- **monde** : 6 zones (`data/config.ts → ZONES`) : PRAIRIE, SCÈNE (1 recouture),
  FORÊT (2), MINE (3), DÉSERT DORÉ (1, smiski dorés), DONJON (hall, toujours
  accessible). Ramassage de collectibles → `systems/economy.ts` (`crediter`,
  multiplicateurs plumes × sacrifices/étoile), boutique data-driven
  (`data/upgrades.ts`), talents en plumes, quêtes du désert, arbre géant
  (« LE MÉTIER ») = gains hors-ligne (plafonné 12 h).
- **antre** (« L'ENVERS ») : hub aux 13 portes + le Mercier + trophées.
- **donjon** : combat à vagues (voir §5).
- **peche** : minijeu façon Animal Crossing (voir §7).

`main.ts` orchestre : `update(dt)` (gèle tout pendant un dialogue),
`render()` (dessinerMonde / dessinerPeche). Objets interactifs touche E via
`systems/interactions.ts` (registre par contexte `zone-N`/`antre`/`donjon` ;
**rayon ≥ 80 px sinon le pilote de test rate les panneaux**).

## 5. L'Envers & les donjons (plans 09-14)

- **13 portes** (`data/portes.ts`) : 12 séquentielles + LA DÉCHIRURE (sans fin,
  scaling ×1,06/vague). Chaque porte : 3-6 vagues au **budget de menace**
  (`B(n) = 8+3n × [1 ; 1,25 ; 1,55 ; 1,9 ; 2,3 ; boss 1,6]`) + un **boss GLB
  unique** à patterns (`data/boss.ts` : charge/volée/pluie/invocation/anneau,
  + enrage sous 25 % portes 10-12).
- **Bestiaire** (`data/monstres.ts`) : glouton/spectre (mêlée), golem (tank),
  épingleur (tir ligne), cracheur (flaque), bombix (kamikaze). Règle d'or :
  contact ne rate jamais, les tirs sont TOUJOURS télégraphés au sol
  (`systems/telegraphes.ts`), **position figée à la visée** (l'esquive est juste).
- Scaling : `PV ×1,45^(n-1)`, `dégâts ×1,28^(n-1)` (voir la table dans
  `data/swarm.ts`). Élites ×5 PV (halo, coffre), archimonstres 1,5 % (dorés,
  nommés, `save.bestiaire`).
- **Clémence** : grâce 0,4 s après chaque coup reçu (`SWARM.graceContactSec`),
  K.O. = retour à l'Envers en gardant le butin.
- **Défis** (1/run, `systems/defis.ts`, ×1,4 dorés+XP) et **malédictions**
  (0-3 sur porte déjà finie, mult plafonné ×2,5 — **cloisonné aux dorés/XP
  de la porte**, jamais les smiski/plumes : la leçon des idoles de Dofus).
- Perf : grille spatiale `core/grille.ts` (hash 128 px, reconstruite chaque
  frame), pool de 128 projectiles, culling caméra, overlay **F1** (ms/frame,
  projectiles). Budget : 30 monstres + 60 projectiles à 60 fps.

## 6. La progression du personnage

- **SP** : XP de combat → niveaux → 3 SP (Vitalité/Récupération/Force).
- **Le Mercier** (Envers, touche M) : 8 **parchemins** permanents (coût ×1,35,
  `data/parchemins.ts`) et 6 **sorts automatiques** (`data/sorts.ts`,
  niveaux 1-6, **évolutions** à 600 dorés si sort 6 + parchemin lié ≥ 5).
  Modèle de puissance (plan 12 §1) : `D = (10+2F) × (1+0,08·puissance) × 1,3
  talent` ; mêlée = 1,5×D ; hâte = `cd × 100/(100+h)`. Tout sommé dans
  `core/state.ts → recalculerStats()` — UN SEUL endroit.
- **Compagnons de biome** (`data/compagnons-biomes.ts`) : 5 espèces, adoption
  aux panneaux (4 unités), récolte live dans leur zone + **statistique** à
  distance (tick 5 s, ~60 % du live), copie de combat à 4/4 (bagarreur/
  tireur/tank-taunt/chanceux/soigneur), **escouade max 3** choisie au modal
  de porte.
- **Recouture** (`systems/rebirb.ts`) : remet à zéro soldes + améliorations
  non permanentes, donne des plumes. NE TOUCHE JAMAIS : parchemins, sorts,
  évolutions, compagnons, bestiaire, succès, secrets, fil rouge, besace,
  aquarium, `swarm.*`.

## 7. La pêche & l'écosystème poisson (plans 17-18)

- **Boucle AC** (`systems/peche.ts`, constantes `data/peche-config.ts`) :
  ombres visibles (taille FIXE par espèce, AILERON = Légende Dorée) → lancer
  chargé (maintenir ESPACE, 3 bandes BORD/MILIEU/LARGE) → mordillages punitifs
  → plongeon (fenêtre 0,75 s) → **lutte** capture/tension pour les rares+
  (relâcher pendant les tremblements ; tolérance par canne). Créneaux horaires
  locaux (ciel teinté, lanternes/lucioles la nuit), tailles en cm + records
  (`dex.tailleRecord`), 16 sprites AC-style (`data/poissons-sprites.ts`,
  rendus par `core/sprites-poissons.ts`).
- **Besace** (`systems/besace.ts`, touche I) : les prises s'empilent par
  espèce (l'XP tombe à la capture, la valeur à la vente). Vente auto
  optionnelle (jamais un shiny). **Cuisine de Brioche** (`data/cuisine.ts`) :
  recettes par paliers de Mikudex. **Hotbar** 1/2/3 en donjon
  (`systems/consommables.ts`, cooldown GLOBAL 8 s, buffs branchés sur donjon
  et sorts). **Grand Aquarium** : donner CONSOMME le spécimen, vitrine rendue
  sur le ponton, F pour contempler.

## 8. Histoire, PNJ & métajeu (plans 15-16)

- **Fil Rouge** (`data/filrouge.ts` + `systems/filrouge.ts`) : 7 chapitres,
  6 bobines, l'Atelier au bout (3 croquis + la lettre `THEME.lettreAtelier`
  — actuellement version fiction signée LE GRAND COUTURIER, **remplaçable
  par une vraie lettre personnelle** : c'est le moment cadeau). Étapes
  `collecter` = delta depuis l'ACCEPTATION (`filRouge.compteur`), jamais les
  cumuls (sinon auto-complétion). Dialogues dans `data/dialogues.ts`
  (3 boîtes max, MAJUSCULES), boîte rétro `ui/dialogue.ts` (E avance, Échap
  coupe/reprend, monde gelé pendant).
- **PNJ** (`data/pnj.ts`) : Brioche (prairie, tient la Cuisine), Régisseuse
  (scène), Yuumi (forêt), Vieux Pic (mine), Sphinge (désert : chasses au
  trésor + indices), Mercier (Envers). Marqueur ❗ = étape du fil rouge.
- **Succès** (`data/succes.ts`, 40) : évalués sur événements + rattrapage au
  chargement, titres de rang (APPRENTIE → GRANDE COUTURIÈRE). **15 fils
  secrets** (`data/secrets.ts`, visibles < 180 px). **10 chasses**
  (`data/chasses.ts`, 3 indices cardinaux → repères dédiés → creuser).
  **Calendrier** (`data/calendrier.ts`) : 7 bonus du jour réellement branchés
  (économie, XP, vitesse, coffres, hors-ligne), offrande quotidienne,
  série 100 % cosmétique (zéro FOMO).

## 9. Sauvegarde, cloud & profils

- `core/state.ts → SaveData` (source de vérité, versionnée v3 + champs
  additifs). `systems/save.ts → fusionner()` = défauts + migrations
  (v1→v2→v3 : `meilleurEtage → porteMax` par équivalence de puissance,
  doughcats → `compagnons.prairie`, ciseaux offerts). **Ne jamais supprimer
  un ancien champ** : on le lit à la migration puis on l'ignore.
- **Profils multi-personnages** (`systems/profils.ts`) : clé
  `birblike_save_<id>` ; l'ancienne clé `birblike_save_v1` sert à la
  migration (NE PAS la « corriger »).
- **Cloud façon MMO** (`systems/cloud.ts` + `api/sauvegarde.js`) : code
  `CHLEA-…` par personnage, enveloppe `{v, nom, skin, maj, donnees}`, cycle
  20 s **tirer-puis-pousser** avec version `maj` (un onglet ouvert ADOPTE la
  progression distante au lieu de l'écraser). `verrouillerSauvegarde()` avant
  tout changement de profil (sinon le beacon de fermeture écrit l'état de
  l'ancien perso sous le code du nouveau — c'était LE bug historique).
  Gains hors-ligne appliqués APRÈS `initCloud()`. Jamais 2 appareils actifs
  sur le même code (dernier-poussé-gagne).

## 10. Pipeline GLB → sprites (`outils/rendu-glb/`)

three.js headless (CDN) piloté par Playwright/Python. Points durs, appris à
la sueur :
- **Matériaux unlit obligatoires** pour les modèles LoL ; `frustumCulled=false`.
- Cadrage par **médiane du nuage de sommets** (rayon = 8× la distance
  médiane) : les accessoires « garés » à 10⁴ unités cassent les bbox
  (`Box3.setFromObject` ignore le skinning). Kog'Maw a une bombe posthume
  dans son mesh → `window.facteurLimite = 2.5` (variante `bestiaire/`).
- Clips `Run` vs `Run_Base` selon l'export → matching exact-puis-inclusif.
- Héroïne : 3 vues × 5 poses, `hauteur: 130`, `recadrer: 'vertical'` ;
  **incrémenter `VERSION_SPRITES` dans `core/sprites.ts`** à chaque
  régénération (cache navigateur).
- Bestiaire : `outils/rendu-glb/bestiaire/` (LISEZMOI.md — un GLB → en jeu
  en < 5 min : sonder.py → choix.json → generer_bestiaire.py → livrer.py).
  Convention stricte `m_{id}`/`b_{id}`/`c_{id}`/`pnj_*` × face/profil ×
  5 poses, chargés PARESSEUSEMENT à l'entrée du donjon
  (`chargerSpritesGlb`). Sources GLB dans `../export/glb/` et `../perso/`.

## 11. Tests (`tests-e2e/`)

Prérequis : `pip install playwright && playwright install chromium`, et le
dev server sur le port 5199. Chaque suite seed une sauvegarde en
localStorage, pilote l'héroïne au clavier (`aller()` converge à ~30 px) et
lit l'état via `window.__jeu` (`state`, `jeu.mode`, `donjon.{monstres,
telegraphes,projectiles,escouade,degats}`, `rebirb`, `debug.archiChance`).

| Suite | Couvre |
|---|---|
| `test_plan09.py` | migration v2→v3, Envers, portes, vagues, victoire, K.O., reload |
| `test_plans10-13.py` | Mercier, parchemins/sorts, tireurs/télégraphes, boss, escouade, récolte à distance, adoption, recouture |
| `test_v3v4.py` | succès, fil rouge ch. 1, calendrier, fil secret, besace/cuisine/vente, malédictions ×1,50 exact, archi forcé, hotbar, aquarium, recouture |
| `test_dev.py` | mode dev F1 (mot de passe, crédits) |
| `chrono_jalon.py <save> <x> <y> <nom>` | chronos d'équilibrage (pilote qui kite) |

Règle : **les 3 premières suites doivent être vertes avant tout push.**
Les 404 `api/sauvegarde` sont filtrés (normaux en local). Deux assertions
sont volontairement souples : les compagnons récoltent PENDANT les tests
(soldes jamais exactement 0), le pêcheur auto remplit la besace.

## 12. Déploiement

```bash
git push   # c'est tout : Vercel rebuild et déploie main automatiquement
```
- Repo GitHub : `mahmoudel24rb-debug/chleatoune` (gh CLI authentifié requis).
- Vercel : projet lié au repo ; l'intégration **Upstash Redis** fournit les
  variables d'env de `api/sauvegarde.js` (rien à configurer à la main ;
  détail dans [DEPLOIEMENT.md](DEPLOIEMENT.md)).
- Un déploiement ne redémarre rien côté joueuses : la PWA récupère la
  nouvelle version au rechargement (le SW ne cache pas `/api/`).
- **Electron** : plomberie présente mais INERTE (`npm run dist:app` ferait
  un .exe) — interrompu volontairement, ne pas relancer sans demande.

## 13. Mode dev & personnalisation

- **F1** : overlay debug + panneau dev (se donner monnaies/dorés/plumes/SP).
  Mot de passe : `RakTma123456` (déverrouillage par session d'onglet).
- Textes personnalisables : `config.ts` (THEME, `messageChateau`,
  **`lettreAtelier`**), `data/dialogues.ts`, blagues dans `data/poissons.ts`,
  commentaires de Brioche dans `data/cuisine.ts`. Guide complet :
  [PERSONNALISATION.md](PERSONNALISATION.md).
- Guides joueurs : `public/guide.html` (sans spoilers, EN LIGNE) et
  `../GUIDE-COMPLET-SPOILERS.html` (**hors repo**, pour l'auteur —
  à maintenir à chaque grosse feature).

## 14. Pièges connus (NE PAS « corriger »)

1. `#game-area` est le **canvas** : tout élément DOM va dans `#game-wrap`
   (les enfants d'un canvas ne sont pas rendus — bug vécu).
2. Les cycles d'import `overlays ↔ donjon`, `sorts ↔ donjon`,
   `defis/filrouge → dialogue` sont **voulus** (usage runtime uniquement,
   aucun effet au chargement de module). `consommables ↔ donjon` passe par
   `cablerConsommables()` pour la même raison.
3. La position `birb.x/y` est **aux pieds** ; les hitbox partent de
   `centreBirb()` (piège récurrent).
4. Port dev **5199 strict** ; la clé localStorage historique
   `birblike_save_v1` et l'id `popcorn` (= smiski) sont conservés exprès.
5. `Date.now()`/heure : le calendrier et les créneaux lisent l'heure LOCALE
   à la volée, rien n'est persisté (les fuseaux ne cassent rien).
6. Les multiplicateurs d'ÉCONOMIE (plumes, sacrifices, étoile) ne touchent
   JAMAIS le combat, et réciproquement (plan 12 §5).
7. `sed` avec caractères spéciaux est piégeux sous Git Bash Windows :
   préférer des petits scripts Python pour les éditions en masse.
