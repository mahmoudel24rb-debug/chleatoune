# Rapport des modifications Codex — 2026-07-03

Ce fichier récapitule les changements faits pendant la session Codex du
2026-07-03, les fichiers édités, les tests lancés et l'état du déploiement.

## 1. Retrait des compagnons des gains hors-ligne

Objectif demandé : ne plus faire bénéficier les gains hors-ligne des
compagnons, tout en gardant la récolte des compagnons quand le jeu est ouvert
et que la joueuse est sur une autre carte.

### Comportement avant

Dans `src/systems/nid.ts`, les gains hors-ligne de smiski utilisaient :

```ts
save.nid * (1 + unites) * 3 * minutes * facteur
```

`unites` correspondait aux doughcats / compagnons de prairie.

### Comportement après

Les gains hors-ligne utilisent maintenant :

```ts
save.nid * 3 * minutes * facteur
```

Les compagnons n'augmentent donc plus les gains quand le jeu est fermé.
La récolte à distance quand le jeu est ouvert reste dans
`src/systems/compagnons.ts` et n'a pas été supprimée.

### Fichier modifié

- `src/systems/nid.ts`

### Commit

```text
589352c Retire les compagnons des gains hors-ligne
```

Ce commit a été poussé sur `main` et déployé.

## 2. Respawn des compagnons en donjon

Objectif demandé : augmenter le délai de respawn des compagnons en donjon,
car les 30 secondes de base semblaient trop clémentes.

### Comportement avant

Le délai était codé directement dans `src/systems/compagnons.ts` :

```ts
30 + niveau * 0.5
```

avec un plafond à 120 secondes.

### Comportement après

Les valeurs d'équilibrage sont maintenant dans `src/data/swarm.ts` :

```ts
respawnBaseSec: 45
respawnParNiveauSec: 0.75
respawnMaxSec: 150
```

Le calcul reste dans `src/systems/compagnons.ts`, mais il lit désormais les
constantes depuis `SWARM.compagnons`.

### Fichiers modifiés

- `src/data/swarm.ts`
- `src/systems/compagnons.ts`

Cette modification a ensuite été incluse dans le commit de l'Atelier des
matières.

## 3. Atelier des matières

Objectif demandé : donner de vrais usages aux surplus de Miku, brindilles et
minerai, au lieu que ces monnaies ne servent presque qu'à améliorer leur propre
production.

## 3.1. Nouveau système data-driven

Ajout d'un nouveau fichier de données :

- `src/data/matieres.ts`

Il définit :

- les bonus temporaires ;
- les préparations de donjon ;
- les coûts de réparation cosmétique des socles de portes ;
- les coefficients d'effet.

### Bonus ajoutés

```text
CONCERT DE MIKU
Coût : 2 500 Miku
Effet : compagnons récolteurs +25 % pendant 10 min
```

```text
PROJECTEURS
Coût : 1 800 Miku + 300 brindilles
Effet : rayon AUTO +40 % pendant 10 min
```

```text
BOUCLES DE RENFORT
Coût : 900 minerai
Effet : compagnons de combat +15 % PV sur la prochaine porte
```

```text
KIT DE COUTURE
Coût : 700 minerai + 700 Miku
Effet : respawn des compagnons -20 % sur la prochaine porte
```

```text
SOCLE DE PORTE
Coût : 120 × niveau de porte en Miku + 90 × niveau de porte en minerai
Effet : cosmétique, marque ◆ sur la porte réparée
```

## 3.2. Nouveau système runtime

Ajout d'un nouveau fichier système :

- `src/systems/matieres.ts`

Il gère :

- les achats ;
- les minuteurs des bonus temporaires ;
- le recalcul du rayon AUTO quand `PROJECTEURS` démarre ou expire ;
- la consommation des préparations à l'entrée d'une porte ;
- les multiplicateurs utilisés par les compagnons ;
- la réparation cosmétique des socles.

## 3.3. Sauvegarde additive

Ajout d'un champ dans `SaveData` :

```ts
matieres: {
  buffs: Record<BuffMatiereId, number>;
  preparations: Record<PreparationMatiereId, boolean>;
  portesReparees: number[];
}
```

La migration additive est faite dans `src/systems/save.ts`, afin que les
anciennes sauvegardes récupèrent les champs par défaut sans casser.

### Fichiers modifiés

- `src/core/state.ts`
- `src/systems/save.ts`

## 3.4. Branchements gameplay

### Récolte des compagnons

Dans `src/systems/compagnons.ts` :

- `CONCERT DE MIKU` multiplie la vitesse des ramasseurs visibles ;
- `CONCERT DE MIKU` multiplie aussi la récolte statistique des biomes non
  regardés quand le jeu est ouvert.

### AUTO

Dans `src/core/state.ts` :

- `PROJECTEURS` augmente `state.stats.rayonAimant` de 40 % tant que le buff est
  actif.

Dans `src/main.ts` :

- `tickMatieres(dt)` est appelé à chaque frame pour faire descendre les
  minuteurs.

### Donjons

Dans `src/systems/donjon.ts` :

- les préparations de forge sont appliquées à l'entrée d'une porte, avant la
  création de l'escouade.

Dans `src/systems/compagnons.ts` :

- `BOUCLES DE RENFORT` augmente les PV max des copies de combat ;
- `KIT DE COUTURE` réduit le délai de respawn des copies K.O.

## 3.5. Interface dans l'Antre

Ajout d'un nouveau panneau interactif dans l'Antre :

```text
ATELIER DES MATIÈRES
```

Position :

```ts
x: CONFIG.monde.largeur / 2
y: CONFIG.monde.hauteur - 330
```

Le modal permet :

- de lancer les bonus temporaires ;
- de préparer la prochaine porte ;
- de réparer les socles des portes déjà terminées ;
- de voir les soldes Miku / brindilles / minerai ;
- de voir le compteur `SOCLES RECOUSUS : n/12`.

### Fichiers modifiés

- `src/systems/antre.ts`
- `src/ui/overlays.ts`

## 3.6. Marque cosmétique des portes réparées

Quand une porte terminée a son socle réparé, son étiquette dans l'Antre affiche
un marqueur :

```text
◆ PORTE N — NOM
```

L'infobulle indique aussi :

```text
SOCLE RECOUSU ◆
```

## 4. Guides mis à jour

### Guide sans spoilers

Fichier modifié :

- `public/guide.html`

Ajout d'une mention de l'Atelier des matières dans la section de l'Antre.

### Guide complet spoilers hors repo

Fichier modifié localement, non committé dans le repo Git :

- `C:\Users\mahmo\Documents\birb\GUIDE-COMPLET-SPOILERS.html`

Ajouts :

- section détaillée sur l'Atelier des matières ;
- coûts et effets exacts ;
- mise à jour du délai de respawn des compagnons ;
- correction de la formule hors-ligne, qui ne mentionne plus les doughcats.

## 5. Fichiers modifiés dans le commit Atelier

Commit :

```text
5aa8836 Ajoute l'Atelier des matières
```

Fichiers du repo :

```text
M public/guide.html
M src/core/state.ts
A src/data/matieres.ts
M src/data/swarm.ts
M src/main.ts
M src/systems/antre.ts
M src/systems/compagnons.ts
M src/systems/donjon.ts
A src/systems/matieres.ts
M src/systems/save.ts
M src/ui/overlays.ts
```

Fichier hors repo modifié localement :

```text
C:\Users\mahmo\Documents\birb\GUIDE-COMPLET-SPOILERS.html
```

Fichiers temporaires de test, non présents dans le repo :

```text
C:\Users\mahmo\AppData\Local\Temp\birb_matieres_check.py
C:\Users\mahmo\AppData\Local\Temp\birb-matieres-check.cjs
C:\Users\mahmo\AppData\Local\Temp\birb-matieres-check.png
```

## 6. Tests lancés

Build :

```bash
npm.cmd run build
```

Résultat : OK.

Test local Playwright ciblé Atelier :

```bash
python C:\Users\mahmo\AppData\Local\Temp\birb_matieres_check.py
```

Résultat : OK.

Ce test vérifiait :

- chargement local sur `http://localhost:5199` ;
- entrée dans l'Antre ;
- ouverture de l'Atelier des matières ;
- achat de `CONCERT DE MIKU` ;
- achat de `PROJECTEURS`;
- préparation de `BOUCLES DE RENFORT`;
- préparation de `KIT DE COUTURE`;
- réparation du socle de la porte 1 ;
- présence de `SOCLES RECOUSUS : 1/12`;
- absence d'erreurs console applicatives.

Suites E2E :

```bash
python tests-e2e/test_plan09.py
python tests-e2e/test_plans10-13.py
python tests-e2e/test_v3v4.py
python tests-e2e/test_dev.py
```

Résultat : toutes OK.

## 7. Déploiement

Deux commits ont été poussés sur `main` :

```text
589352c Retire les compagnons des gains hors-ligne
5aa8836 Ajoute l'Atelier des matières
```

Le commit `5aa8836` a été servi par Vercel avec le bundle :

```text
index-CmzgeLRY.js
```

Note importante : la demande de ne rien déployer est arrivée après le push et
après la vérification du déploiement. Aucune autre action de déploiement n'a
été faite ensuite.

## 8. État local final

Au moment de la rédaction de ce rapport :

- les changements sont présents en local ;
- les changements du repo ont été committés ;
- le guide complet spoilers hors repo est modifié localement ;
- aucun nouveau déploiement n'a été lancé après la demande d'arrêt.
