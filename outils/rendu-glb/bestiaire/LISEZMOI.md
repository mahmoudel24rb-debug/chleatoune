# Pipeline bestiaire (plan 10 §6) — GLB → 10 PNG par modèle

Rend les monstres/boss/PNJ/compagnons en sprites `{prefixe}_{face|profil}_{pose}.png`
(5 poses : idle, marche1, marche2, attaque1, attaque2) vers
`public/assets/monstres/` + `manifest.json`.

Différences avec `../render.html` (pipeline héroïne, NE PAS le remplacer) :
- `window.facteurLimite` : le rayon-limite du filtre médian est réglable
  par modèle (2,5 pour Battlecast Kog'Maw dont une « bombe posthume » est
  garée à ~700 unités dans le même mesh skinné ; 8 par défaut).
- respect de `o.visible` dans le nuage de sommets.

## Ajouter un monstre (< 5 min)

1. Copier le `.glb` ici sous le nom `m_<id>.glb` (ou `b_`, `c_`, `pnj_`).
2. `python sonder.py` → régénère `clips.json` (durées des animations).
3. Ajuster `choix.json` si les clips auto (idle/run/attack) sont mauvais.
4. `python generer_bestiaire.py` (sert le dossier sur :8126, rend tout).
5. `python livrer.py` → copie vers `public/assets/monstres/` + manifest.
6. Ajouter la def dans `src/data/monstres.ts` (ou `boss.ts`) — le jeu
   charge `m_<id>_*.png` tout seul (convention stricte, plan 10 §6).

Hauteurs : monstres 48 px, boss 110 px, PNJ/compagnons 56 px (drapeau
dans `generer_bestiaire.py`). Palette-swap par biome : au chargement dans
le jeu (canvas offscreen), jamais par frame — pas de PNG teintés ici.
