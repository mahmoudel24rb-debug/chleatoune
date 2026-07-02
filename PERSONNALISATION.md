# Personnaliser le jeu 🎁

Tout le « thème » du jeu vit dans **deux fichiers**. Tu peux transformer
le pigeon-qui-ramasse-du-popcorn en n'importe quoi (un chat qui ramasse
des croissants, une loutre qui ramasse des coquillages…) sans toucher au
reste du code.

## 1. `src/data/config.ts` — noms, couleurs, zones

### Le titre et le héros
```ts
export const THEME = {
  titre: 'BIRB-LIKE',        // ← titre en haut du panneau
  heros: 'BIRB',             // ← nom du personnage
  prestige: { nom: 'PLUMES', verbe: 'REBIRB', couleur: '#a8d8ff' },
  ...
```
`prestige` est la monnaie gagnée au prestige : pour un chat, ce serait
par exemple `{ nom: 'MOUSTACHES', verbe: 'REMIAOU', couleur: '#f2b8d0' }`.
Le `verbe` apparaît partout (« NEXT … = 1ER REMIAOU », bouton, onglet).

### Les 4 monnaies
```ts
monnaies: {
  popcorn: { nom: 'POPCORN', couleur: '#ffd94a' },
  graine: { nom: 'GRAINES', couleur: '#cf9c5a' },
  ...
```
Change uniquement `nom` et `couleur` (la couleur sert aux textes
flottants et aux particules). Les identifiants (`popcorn`, `graine`…)
sont internes : ne les renomme pas, sinon les sauvegardes existantes et
les ids d'améliorations ne correspondent plus. Seul le `nom` est visible.

### Les 4 zones
```ts
export const ZONES: ZoneDef[] = [
  { monnaie: 'popcorn', nom: 'PRAIRIE', fond: '#4a9e46', fonce: ..., clair: ..., fleurs: [...] },
  ...
```
`nom` s'affiche en haut à droite (« PRAIRIE 1/2 »), `fond`/`fonce`/`clair`
sont les verts de l'herbe, `fleurs` les couleurs des fleurs du décor.
Une plage ? `fond: '#e8d59a'` et des fleurs turquoise. Un ciel étoilé ?
Fond sombre et « fleurs » blanches.

### L'équilibrage
Dans `CONFIG` (même fichier) : vitesse du héros, délais d'apparition,
rayon de l'aimant AUTO… Et dans `src/data/progression.ts` : seuils de
rebirb, plumes gagnées, bonus par plume.

## 2. Les dessins

### L'héroïne : rendue depuis un modèle 3D, avec 3 vues

Les frames de Chléatoune (`public/assets/chleatoune_{vue}_{pose}.png`,
9 fichiers : vues `face`/`dos`/`profil` × poses `idle`/`marche1`/`marche2`)
sont pré-rendues depuis le modèle `perso/chibi_crystal_rose_gwen.glb`
avec l'outil `outils/rendu-glb/` (voir son README) : repos issu du clip
`Idle_Base`, course issue de `Run_Base`, contour sombre ajouté pour
coller au pixel art. En jeu : descendre → face, monter → dos,
gauche/droite → profil (retourné pour la gauche). Pour changer de
personnage 3D, remplace le `.glb` et relance `python generer.py`.

Tu peux aussi remplacer directement les PNG par n'importe quels dessins
(74×60 px, fond transparent) : le jeu les affiche ×2, ancrés aux pieds
(réglage `FACTEUR_PNG` dans `src/core/sprites.ts`). Si les PNG manquent,
un petit sprite pixel art de secours prend le relais (grilles de
lettres dans `sprites.ts`).

### Les objets ramassés et les monstres : grilles de pixels

Dans `src/core/sprites.ts`, chaque sprite est une grille de caractères :
**une lettre = un pixel**, `.` = transparent, et une palette associe
chaque lettre à une couleur. Redessine les grilles 10×10 (le Smiski est
la constante `POPCORN` — l'id interne n'a pas changé — plus `GRAINE`,
`BRINDILLE`, `MINERAI`), `SPRITE_PLUME` (icône du HUD) et les monstres
du donjon (`GLOUTON`, `SPECTRE`, `GOLEM`, grilles 12×12).

### Le donjon

Tout l'équilibrage du combat est dans `src/data/combat.ts` : stats et
noms des monstres, PV/dégâts/régénération de l'héroïne, courbe d'XP,
multiplicateur par étage, fréquence des boss. Les couleurs du décor du
donjon sont dans la dernière entrée de `ZONES` (`config.ts`).

Astuce : dessine d'abord dans [Piskel](https://www.piskelapp.com/) (gratuit,
dans le navigateur) en 16×16, puis recopie pixel par pixel en lettres.

## 3. Les textes de la boutique

Les noms des améliorations (« ENTRAÎNEMENT DES AILES »…) sont générés
dans `src/data/upgrades.ts` à partir des noms de monnaies — ils suivent
donc automatiquement. Seule l'amélioration de vitesse a un nom en dur
(`p_ailes`) : adapte `nom` et `desc` à ton personnage.

## 3 bis. Le nouveau contenu (v2)

- **Le message du château** (hall du donjon, porte à droite) :
  `THEME.messageChateau` dans `src/data/config.ts` — l'endroit parfait
  pour une lettre cachée qu'elle découvrira en jouant.
- **Les talents** : `src/data/talents.ts` (noms, effets, coûts).
- **Le désert et les quêtes** : `src/data/desert.ts`.
- **Les poissons du Mikudex** : `src/data/poissons.ts` — 12 espèces à
  renommer librement (private jokes bienvenues).
- **Yuumi** : rendue depuis `perso/chibi_yuumi.glb` via le même outil
  `outils/rendu-glb/` (frames `yuumi_*.png` dans `public/assets/`).
- **Les skins du créateur de personnage** : `src/data/skins.ts`. Pour
  en ajouter un : glb dans `perso/`, entrée `modele_heroine(...)` dans
  `outils/rendu-glb/generer.py`, copie des 15 PNG dans
  `public/assets/`, et une ligne dans `SKINS`.
- **Le message de la salle du château** et le nom de chaque personnage
  se complètent : le prénom choisi à la création s'affiche dans le
  profil (P).
- **Les structures** (portail, autel, arbre géant, marchand, coffres,
  panneaux) : grilles de pixels dans `src/core/structures.ts`.
- **Les positions** de tout ce qui est posé sur les cartes :
  `src/systems/carte.ts`.

## 4. Petites touches cadeau 💝

- Un message d'accueil : dans `src/main.ts`, après le setup, ajoute
  `ajouterToast('JOYEUX ANNIVERSAIRE MON AMOUR !');`
- Le footer du panneau (`src/ui/panel.ts`, fonction `construirePanneau`)
  est l'endroit parfait pour une dédicace.
- L'onglet du navigateur : `<title>` dans `index.html`.

## 5. Vérifier

`npm run dev` recharge à chaud : tu vois chaque changement en direct.
Avant d'offrir : `npm run build` puis envoie/héberge le dossier `dist/`.
Le menu Échap permet d'exporter/importer la sauvegarde — pratique pour
tester l'équilibrage sans refarmer.
