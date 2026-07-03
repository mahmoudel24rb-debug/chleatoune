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
