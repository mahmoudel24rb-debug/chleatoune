# Journal d'équilibrage (plan 12 §7)

Protocole : sauvegardes jalons dans `saves-test/` (à charger via
EXPORTER/IMPORTER du menu Échap), pilote automatisé qui KITE en cercle
(`chronos` mesurés par Playwright). Fourchettes cibles du plan 12 §2 :
vague normale **15–35 s** · boss **45–90 s** · porte complète **4–8 min**.

## 2026-07-03 — première passe (livraison plans 10+11+13)

| Jalon | Porte | Résultat | Vague 1 | Boss | Total | Morts |
|-------|-------|----------|---------|------|-------|-------|
| `debut.json` (Force 2, ciseaux 1) | 1 | VICTOIRE | 13 s | 49 s | 1 min 25 | 0 |
| `milieu.json` (table §2 porte 6) | 6 | VICTOIRE | 28 s | 27 s | 2 min 30 | 0 |
| `avance.json` (porte 10) | 10 | à chronométrer à la main | — | — | — | — |
| `fin.json` (porte 12 + évolutions) | 12 | à chronométrer à la main | — | — | — | — |

### Constantes changées pendant la passe

1. **Dégâts de contact des boss** : le boss utilisait le gabarit du golem
   (10 de base) ×2 → un ×4 déguisé par rapport à la table §2. Corrigé :
   `contact boss = glouton × Dg(n) × multDegatsBoss(2)`.
   Avant/après (porte 1) : charge 40 → 20, contact 20 → 10.
2. **`SWARM.graceContactSec = 0,4`** (nouveau bouton) : fenêtre
   d'invulnérabilité après chaque coup reçu (clignotement), la clémence
   standard des bullet heavens. Sans elle, être encerclée par 6 gloutons
   = ~30 dégâts/s cumulés → mort en 4 s même porte 1. Avec elle, la
   pression max ≈ dégâts/0,4 s : la foule fait peur, ne one-burst jamais.
   Avant/après (pilote identique) : K.O. porte 1 à 42 s → victoire sans mort.

## 2026-07-03 — chantiers v3/v4 (plans 14-18)

- Plan 14 : défi ×1,4 et malédictions ×2,5 max, cloisonnés aux dorés/XP
  de la porte — vérifié E2E (récap ×1,50 exact avec PRESSE+TEMPO, smiski
  non multipliés). L'Étoile de Cristal n'interagit avec rien de neuf.
- Plan 18 : `SWARM.consommables.cdGlobal = 8 s` (partagé). Rappel du
  garde-fou : A(n) suppose ZÉRO consommable ; la porte n+1 tentée en
  avance avec hotbar pleine doit rester « difficile mais possible » —
  **à chronométrer à la main au prochain playtest** ; si gratuite,
  monter cdGlobal à 12 s AVANT de toucher aux effets des plats.
- Pêche v3 : lutte 3-6 s (capture 26 %/s), fenêtre 0,75 s, tolérances
  de cannes ×1/1,15/1,35/1,6 — ressenti à valider manette en main.

### Notes pour la prochaine passe

- Porte 1 totale = 1 min 25 : SOUS la fourchette 4-8 min, assumé (porte
  tuto, très clémente — la fourchette vise les portes de croisière).
- Boss porte 6 = 27 s : un peu court (cible 45-90). Si ça se confirme au
  playtest réel, monter `pvBossBase` 25 → 30 (PAS `multBoss` et PAS
  `croissancePV` en même temps, règle du plan 12 §2).
- Le test « mains dans les poches » (sorts seuls, sans mêlée) n'est pas
  encore automatisé — à faire à la main au prochain jalon.
- Étoile de cristal : `multGlobal` ne touche que `crediter*` (économie),
  jamais `state.stats.degats` — vérifié par lecture de code, TTK inchangé.

## 2026-07-03 — session Codex (hors-ligne, respawn, Atelier des matières)

Constantes changées (commits `589352c` + `5aa8836`, corrections Claude
ensuite) :

1. **Gains hors-ligne sans compagnons** (`systems/nid.ts`) : la formule
   passe de `nid × (1 + unités) × 3/min` à `nid × 3/min`. Avec 4
   compagnons de prairie c'était un ×5 silencieux — GROS nerf effectif
   du hors-ligne, demandé (les compagnons ne travaillent que jeu
   ouvert). **À surveiller au prochain retour de session de la
   joueuse** : si le message des gains paraît trop maigre, remonter le
   `× 3` de base plutôt que de réintroduire les unités.
2. **Respawn des copies de combat** (`SWARM.compagnons`) :
   base 30 → **45 s**, +0,5 → **+0,75 s/niveau**, plafond 120 → **150 s**
   (30 s jugées trop clémentes en jeu réel). Les constantes vivaient en
   dur dans `systems/compagnons.ts`, désormais dans `data/swarm.ts`.
3. **Atelier des matières** (`data/matieres.ts`) — sinks de surplus,
   AUCUN effet sur les dégâts de l'héroïne (les 4 effets ne touchent
   que les compagnons et le rayon AUTO — le cloisonnement éco/combat
   tient) :
   - CONCERT DE MIKU : 2 500 Miku → récolte compagnons ×1,25, 10 min ;
   - PROJECTEURS : 1 800 Miku + 300 brindilles → rayon AUTO ×1,4, 10 min ;
   - BOUCLES DE RENFORT : 900 minerai → PV copies ×1,15, une porte ;
   - KIT DE COUTURE : 700 minerai + 700 Miku → respawn copies ×0,8, une porte ;
   - SOCLE : 120×n Miku + 90×n minerai, 100 % cosmétique.
   Garde-fous de clémence ajoutés après revue : un bonus actif ne se
   relance pas (pas de rachat pour rien), et les préparations sont
   consommées à la FIN du run (victoire/K.O./sortie), pas à l'entrée —
   un rechargement en plein donjon ne les perd plus.
   Suite E2E dédiée : `tests-e2e/test_matieres.py`.

## 2026-07-03 — la Teinturerie (sink brindilles)

5 teintures PERMANENTES de la tenue (100 % cosmétique, zéro impact
combat/économie) : ROSE THÉ 800🪵+600 Miku · BLEU NUIT 1 200🪵+900 Miku ·
MENTHE GIVRÉE 1 600🪵+600⛏ · LAVANDE 2 200🪵+1 500 Miku · FIL D'OR
3 000🪵+1 500⛏. Total : 8 800 brindilles — les brindilles étaient le
parent pauvre (un seul usage : 300 pour PROJECTEURS). Coûts pensés
« milieu de partie » : Yuumi + hérissons récoltent ~large en forêt ;
si le playtest montre que c'est trop cher avant la porte 6, baisser
ROSE THÉ (la porte d'entrée du système) avant les autres.

## 2026-07-04 — renchérissement des améliorations par recouture

Constat du joueur (6e recouture, bonus passif +170 %) : les coûts de la
boutique étaient FIXES → re-maxer toutes les pistes plafonnées
(vitesse 12 + capacité 40 + chaussures 20 ≈ 97 500 smiski au total)
prenait quelques secondes. Le rebuild post-recouture n'existait plus.

Correctif : `coût = base × croissance^niveau × 1,6^recoutures`
(`CROISSANCE_COUT_RECOUTURE` dans `data/upgrades.ts`, non-permanentes
uniquement). Table :

| Recouture | Mult. | Rebuild capé | Seuil cycle | Part du cycle |
|---|---|---|---|---|
| 2 | ×2,6 | 250 k | 25 k | chasse longue |
| 4 | ×6,6 | 644 k | 625 k | ≈ le cycle |
| 6 | ×16,8 | 1,63 M | 15,6 M | ~10 % (~10 min actives) |
| 8 | ×43 | 4,2 M | 391 M | ~1 % |

Pourquoi 1,6 < 5 : le ratio rebuild/cycle fond en (1,6/5)^r — chaque
recouture reste de plus en plus rentable, la reconstruction redevient
juste un jeu. GARDE-FOU CLÉMENCE : le seuil de recouture compte les
gains BRUTS (`cumulCycle`), jamais les dépenses — ce changement ne peut
pas ralentir l'accès à la recouture suivante. Effet sur VALEUR (999
niv.) : recul de ~3,4 niveaux par recouture, négligeable.

Manette après playtest : rebuild trop long → 1,5 ; encore expéditif →
1,7. NE PAS toucher coutBase/croissance en même temps.

## 2026-07-04 — courbe de PV des boss (retour de playtest de la joueuse)

Retour réel : « les boss sont trop faciles, je les tue plus facilement
que les monstres de base ». Diagnostic — elle a raison À LA LETTRE :

- Golem ÉLITE : 65 × 5 = **325 × H(n)** de PV.
- Boss (pv 1,0 pour 8 des 13) : 25 × 8 = **200 × H(n)** — le trash
  tanky avait 60 % de PV de plus que le boss.
- Et la puissance joueuse (parchemins ×1,35, évolutions, hotbar,
  talents) croît plus vite que H(n) : boss porte 6 mesuré à 27 s
  (cible 45-90 s), les suivants fondaient encore plus vite. Le journal
  du 2026-07-03 prévoyait déjà « si confirmé au playtest, agir » —
  confirmé.

Correctif : `croissancePVBoss = 1,12` — PV boss ×1,12^(porte-1),
constante dans `data/swarm.ts`, appliquée dans creerMonstre. Table :

| Porte | Mult. | PV boss (pv 1,0) | vs élite golem (325×H) | Attendu |
|---|---|---|---|---|
| 1 | ×1,00 | 200×H | sous l'élite (assumé, tuto) | 49 s ✔ inchangé |
| 3 | ×1,25 | 251×H | sous l'élite (élites scriptées rares) | — |
| 6 | ×1,76 | 352×H | AU-DESSUS ✔ | 27 s → ~48 s |
| 9 | ×2,48 | 497×H | ✔ | — |
| 12 | ×3,47 | 694×H | vrai mur final ✔ | — |
| Déchirure (13) | ×3,90 | continuité avec p12, + ×1,06/vague | ✔ | — |

Choix : les DÉGÂTS des boss ne bougent pas (clémence — la difficulté
passe par la durée du combat et ses patterns, pas par la punition).
XP/butin boss inchangés (le coffre de victoire reste la vraie paie) —
à surveiller : si les longs combats semblent « pas assez payés »,
monter le ×8 d'XP boss, pas les PV.
Manette après playtest : trop dur → 1,10 ; encore trop court → 1,15
(JAMAIS en même temps que pvBossBase).
