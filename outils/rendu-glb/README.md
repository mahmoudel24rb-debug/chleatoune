# Rendu GLB → sprites du jeu

Cet outil transforme un modèle 3D `.glb` en frames 2D pour le jeu
(`public/assets/chleatoune_*.png`).

## Utilisation

1. Copie le `.glb` ici sous le nom `chibi_crystal_rose_gwen.glb`
   (ou adapte le nom dans `render.html`).
2. Prérequis Python : `pip install playwright pillow` puis
   `playwright install chromium`.
3. Lance :

   ```bash
   python generer.py
   ```

4. Les frames `chleatoune_{pose}_{vue}.png` sont générées à côté du
   script (poses `idle`/`marche1`/`marche2` × vues `face`, `dos`,
   `profil90`, `profil270`), avec une planche de contrôle
   `planche_frames.png`.
5. Copie-les dans `public/assets/` sous les noms attendus par le jeu
   (`chleatoune_{vue}_{pose}.png` avec `vue` ∈ face/dos/profil) :
   pour le profil, garde celui des deux (`profil90` ou `profil270`)
   qui regarde vers la **droite** — le jeu le retourne pour la gauche.

## Réglages (dans `generer.py`)

- `FRAMES` : quel clip d'animation et à quel instant échantillonner
  chaque frame (voir `window.clips` dans `render.html` pour la liste).
- `HAUTEUR` : hauteur de rendu en pixels (60 actuellement ; la largeur
  s'adapte au modèle, affiché ×2 en jeu — voir `FACTEUR_PNG` dans
  `src/core/sprites.ts`).
- `YAWS` : angles de vue rendus.
- Le cadrage est calé sur l'**union** des boîtes englobantes de toutes
  les poses : aucune frame n'est coupée et l'échelle est identique
  partout.
- `post_traiter` : contour sombre + alpha net, pour le style pixel art.
