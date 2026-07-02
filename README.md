# Chléatoune

Un petit jeu incrémental 2D en pixel art, inspiré de Birb : Chléatoune
se promène dans une prairie, ramasse des Smiski, achète des
améliorations, puis « rebirb » pour gagner des plumes permanentes et
débloquer de nouvelles monnaies et zones.

Construit en suivant les plans `plan-00` à `plan-07` (le plan 08,
multijoueur, n'est pas implémenté — les boutons CHAT et CLASSEMENT sont
des stubs prêts à l'accueillir).

## Lancer le jeu

```bash
npm install
npm run dev
```

Puis ouvre l'adresse affichée (http://localhost:5173 par défaut).

Pour une version finale à offrir : `npm run build`, puis sers le dossier
`dist/` (par exemple `npm run preview`, ou héberge-le n'importe où).

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches | Se déplacer |
| E | Interagir (portail, panneaux, marchand, arbre, ponton…) |
| Espace | Pêcher (lancer la ligne / ferrer) |
| C | Mode AUTO (aimant, débloqué au 1er rebirb) |
| F | Mikudex (collection de pêche) |
| P | Profil |
| T | Chat (multijoueur, non implémenté) |
| Échap | Menu : volume, export/import de sauvegarde, reset |
| F1 | Overlay debug (FPS, mode, caméra, entités) |

## Boucle de jeu

1. Ramasse des Smiski en marchant dessus.
2. Dépense-le dans le panneau de droite (valeur, vitesse d'apparition,
   capacité, vitesse de déplacement — bouton MAX pour tout acheter).
3. À 1 000 popcorn cumulés : **REBIRB** (sous-onglet à droite). Tout
   repart à zéro mais tu gagnes des plumes (+10 % de gains chacune,
   permanentes) et tu débloques l'onglet GRAINES + la zone 2 + le mode
   AUTO. Les rebirbs suivants (seuil ×5 à chaque fois) débloquent
   BRINDILLES puis MINERAI, avec leurs zones.
4. **Les doughcats** (carte DOUGHCAT dans l'onglet SMISKI, jusqu'à 4) :
   des chats-brioche qui ramassent automatiquement les collectibles de
   la zone. Amélioration **permanente** : ils survivent au rebirb.
5. **L'arbre de talents** : des panneaux physiques dans la prairie,
   payés en plumes (E pour acheter) — aimant élargi, générateur auto,
   ×2 global… Le bonus passif des plumes suit désormais le **cumul**,
   dépenser ne le fait pas reculer.
6. **Le hall du donjon** (dernière zone) : le **portail** lance
   l'**Expédition** — des étages de combat dont le biome change (forêt,
   forêt maudite, désert, plage, fond marin, neige…), boss tous les
   5 étages, **coffres** (commun → légendaire) pleins de smiski dorés,
   de SP et de plumes. L'**autel de sacrifice** convertit des SP en
   bonus permanents, et la **porte du château** cache un message.
7. **Le désert doré** (dès le 1er rebirb) : la source des **smiski
   dorés**, avec son arbre d'améliorations et le **marchand de
   quêtes** (missions contre récompenses).
8. **La pêche** (ponton au sud de la prairie) : place-toi où tu veux
   sur le ponton (◀▶) — un **banc de poissons** se déplace dans l'eau
   et booste les prises. ESPACE lance/ferre. La **boutique (B)** vend
   des **cannes** (meilleures stats), des **appâts** consommables
   (meilleurs poissons plus vite) et des **pêcheurs automatiques** qui
   pêchent même quand tu es ailleurs. **Mikudex** (F) de 16 espèces sur
   4 raretés tirées au sort — plus c'est rare, plus ça rapporte, shiny
   ×10 ✨ — les premières captures rares donnent des plumes.
9. **L'arbre géant** (forêt) : nourris-le en brindilles pour des
   **gains hors-ligne** et pour réveiller **Yuumi**, qui ramasse les
   brindilles de la forêt.
10. La sauvegarde est automatique (toutes les 10 s + à chaque achat).

## Structure du code

```
src/
├── main.ts          câblage + update/render
├── core/            loop, canvas (DPR), camera, input, sprites, décor, état
├── entities/        birb, collectible
├── systems/         spawner, économie, rebirb, sauvegarde, audio, fx
├── ui/              hud, panneau boutique, overlays, toasts
└── data/            config + THÈME, améliorations, progression
```

## Personnaliser (pour en faire un cadeau 🎁)

Voir **PERSONNALISATION.md** : personnage, objets à ramasser, noms,
couleurs et équilibrage se changent dans deux fichiers seulement.
