# CLAUDE.md — brief opérationnel (Chléatoune)

Jeu incrémental **cadeau pour la copine de l'auteur** (héroïne chibi Gwen,
thème couture — le prestige = « RECOUTURE »). Vite + TS vanilla + Canvas 2D,
zéro dépendance runtime, TOUT en français (code, commentaires, textes).

**Lis [DOCUMENTATION.md](DOCUMENTATION.md) avant de modifier un système.**
Première session sur cette machine ? Suis l'entête de
[MEMOIRE-CLAUDE.md](MEMOIRE-CLAUDE.md) pour ré-importer la mémoire projet.
Les spécifications d'origine sont les plans dans `../plan refonte/`,
`../v3/`, `../v4/`, `../plan-0X-*.md` — les respecter.

## Commandes

```bash
npm run dev     # port 5199 STRICT — ne JAMAIS changer (localStorage lié à l'origine)
npm run build   # tsc && vite build — doit être vert avant tout commit
python tests-e2e/test_plan09.py        # régressions (dev server requis)
python tests-e2e/test_plans10-13.py
python tests-e2e/test_v3v4.py
git push        # = DÉPLOIEMENT Vercel (https://chleatoune.vercel.app) — jamais sans demande explicite
```

## Règles non négociables

1. Équilibrage UNIQUEMENT dans `src/data/` (surtout `data/swarm.ts`) —
   jamais un chiffre en dur dans un système.
2. Un seul chemin de dégâts : `infligerAuMonstre` / `blesserHeroine`
   (les défis, buffs et quêtes s'y branchent).
3. Multiplicateurs d'ÉCONOMIE (plumes/sacrifices/étoile) ≠ COMBAT :
   jamais de contamination croisée.
4. La recouture ne touche jamais : parchemins, sorts, évolutions,
   compagnons, bestiaire, succès, secrets, fil rouge, besace, aquarium, swarm.
5. Sauvegarde : champs ADDITIFS + défauts dans `save.ts → fusionner()` ;
   ne jamais supprimer un ancien champ ni « corriger » les clés historiques
   (`birblike_save_v1`, id `popcorn`).
6. C'est un cadeau : en cas de doute d'équilibrage → version la plus clémente.
7. Textes joueur en MAJUSCULES, dialogues 3 boîtes max, humour Dofus/Genshin.

## Pièges qui ont déjà mordu (ne pas « corriger »)

- `#game-area` est le **canvas** → tout DOM va dans `#game-wrap`.
- Cycles d'import `overlays↔donjon`, `sorts↔donjon` : VOULUS (usage runtime
  seulement) ; `consommables↔donjon` passe par `cablerConsommables()`.
- `birb.x/y` est aux PIEDS ; hitbox depuis `centreBirb()`.
- Interactifs : rayon ≥ 80 px (sinon le pilote de test les rate).
- Cloud : `verrouillerSauvegarde()` avant tout changement de profil ;
  gains hors-ligne APRÈS `initCloud()` ; le SW n'intercepte jamais `/api/`.
- Sprites GLB : incrémenter `VERSION_SPRITES` (core/sprites.ts) à chaque
  régénération ; pipeline et pièges dans `outils/rendu-glb/bestiaire/LISEZMOI.md`.
- Les 404 `api/sauvegarde` en local sont normaux (pas de cloud en dev).
- Éditions en masse : petit script Python plutôt que `sed` (Git Bash Windows).

## Checklist avant push

build vert → les 3 suites E2E vertes → guides à jour si nouvelle feature
(`public/guide.html` sans spoilers + `../GUIDE-COMPLET-SPOILERS.html`) →
`EQUILIBRAGE-JOURNAL.md` si constante changée → commit en français qui
explique le POURQUOI.
