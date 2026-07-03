# Suite E2E — l'Atelier des matières (session Codex 2026-07-03 + revue).
# Couvre : ouverture du modal, achat des 2 bonus (CONCERT/PROJECTEURS),
# bonus actif NON relançable, effet PROJECTEURS sur rayonAimant, les 2
# préparations de forge, réparation d'un socle, et la sémantique de
# consommation des préparations : armées à l'entrée d'une porte, elles
# SURVIVENT à un rechargement en plein donjon et ne sont consommées
# qu'à la conclusion du run (victoire).
# Prérequis : dev server sur http://localhost:5199 (port STRICT).
import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

import os
SCRATCH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captures")
os.makedirs(SCRATCH, exist_ok=True)
erreurs = []
echecs = []


def verifier(nom, condition):
    print(("OK  " if condition else "FAIL") + " " + nom)
    if not condition:
        echecs.append(nom)


# sauvegarde v3 : porte 1 déjà finie (socle réparable), gros soldes de
# matières, héroïne costaude pour boucler la porte 1 rapidement
save = {
    "version": 3,
    "soldes": {"popcorn": 50000, "graine": 20000, "brindille": 5000, "minerai": 5000},
    "cumulsGlobaux": {"popcorn": 60000, "graine": 30000, "brindille": 6000, "minerai": 6000},
    "soldeDore": 500,
    "rebirbs": 1,
    "heros": {"niveau": 12, "xp": 0, "sp": 0,
              "competences": {"vitalite": 12, "recuperation": 6, "force": 30}},
    "swarm": {"porteMax": 2, "termines": {"1": 1}, "sansFinRecord": 0,
              "escouade": [], "hotbar": [None, None, None]},
    "sorts": {"ciseaux": 2},
    "compagnons": {"prairie": 4},
}

KEYMAP = {"gauche": "ArrowLeft", "droite": "ArrowRight", "haut": "ArrowUp", "bas": "ArrowDown"}


def pos(page):
    return page.evaluate("() => ({x: window.__jeu.birb.x, y: window.__jeu.birb.y})")


def aller(page, cx, cy, marge=32, timeout_iter=160):
    for _ in range(timeout_iter):
        p = pos(page)
        dx, dy = cx - p["x"], cy - p["y"]
        if abs(dx) < marge and abs(dy) < marge:
            return True
        touche = ("droite" if dx > 0 else "gauche") if abs(dx) >= abs(dy) else ("bas" if dy > 0 else "haut")
        page.keyboard.down(KEYMAP[touche])
        page.wait_for_timeout(200)
        page.keyboard.up(KEYMAP[touche])
    return False


def ej(page, expr):
    return page.evaluate(f"() => window.__jeu.{expr}")


def ouvrir_atelier(page):
    """Depuis l'Antre : marche jusqu'au panneau et ouvre le modal."""
    if not aller(page, 1200, 1270):
        return False
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    return "ATELIER DES MATIÈRES" in page.locator("#modal").inner_text()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.on("console", lambda m: erreurs.append(m.text)
            if m.type == "error" and "Failed to load resource" not in m.text else None)
    page.on("pageerror", lambda e: erreurs.append(str(e)))
    page.add_init_script(
        "if (!window.localStorage.getItem('birblike_profils_v1')) "
        f"window.localStorage.setItem('birblike_save_v1', {json.dumps(json.dumps(save))});"
    )
    page.goto("http://localhost:5199")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    # ---- hall → Antre
    page.evaluate("() => { window.__jeu.state.save.zone = 5; }")
    page.wait_for_timeout(300)
    verifier("aller au portail du hall", aller(page, 1200, 625))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    verifier("mode antre", ej(page, "jeu.mode") == "antre")

    # ---- ouverture de l'Atelier
    verifier("modal ATELIER DES MATIÈRES ouvert", ouvrir_atelier(page))
    page.screenshot(path=SCRATCH + "/mat_atelier.png")

    # ---- CONCERT DE MIKU : achat, solde débité, minuteur armé
    graine_avant = ej(page, "state.save.soldes.graine")
    page.locator("#modal button", has_text="LANCER").first.click()
    page.wait_for_timeout(400)
    verifier("CONCERT actif (minuteur ~600 s)", 590 < ej(page, "state.save.matieres.buffs.concert") <= 600)
    verifier("2 500 Miku débités", ej(page, "state.save.soldes.graine") == graine_avant - 2500)

    # ---- bonus actif NON relançable (bouton EN COURS désactivé)
    bouton_en_cours = page.locator("#modal button", has_text="EN COURS").first
    verifier("bouton CONCERT verrouillé (EN COURS)", bouton_en_cours.is_disabled())
    graine_verrou = ej(page, "state.save.soldes.graine")
    page.evaluate("() => {}")  # no-op, le clic sur bouton disabled ne part pas
    verifier("aucun re-débit pendant le buff", ej(page, "state.save.soldes.graine") == graine_verrou)

    # ---- PROJECTEURS : rayon AUTO ×1,4 tant que le buff est actif
    rayon_avant = ej(page, "state.stats.rayonAimant")
    page.locator("#modal button", has_text="LANCER").first.click()
    page.wait_for_timeout(400)
    rayon_apres = ej(page, "state.stats.rayonAimant")
    verifier(f"PROJECTEURS : rayon ×1,4 ({rayon_avant:.0f} → {rayon_apres:.0f})",
             abs(rayon_apres / rayon_avant - 1.4) < 0.01)

    # ---- les minuteurs descendent (tickMatieres)
    t1 = ej(page, "state.save.matieres.buffs.concert")
    page.wait_for_timeout(1500)
    verifier("le minuteur du CONCERT descend", ej(page, "state.save.matieres.buffs.concert") < t1)

    # ---- préparations de forge
    page.locator("#modal button", has_text="PRÉPARER").first.click()
    page.wait_for_timeout(400)
    page.locator("#modal button", has_text="PRÉPARER").first.click()
    page.wait_for_timeout(400)
    verifier("BOUCLES DE RENFORT prêt", ej(page, "state.save.matieres.preparations.renfort") is True)
    verifier("KIT DE COUTURE prêt", ej(page, "state.save.matieres.preparations.kit") is True)

    # ---- socle de la porte 1 (120 Miku + 90 minerai)
    minerai_avant = ej(page, "state.save.soldes.minerai")
    page.locator("#modal button", has_text="PORTE 1 —").first.click()
    page.wait_for_timeout(400)
    verifier("socle porte 1 recousu", ej(page, "state.save.matieres.portesReparees.includes(1)"))
    verifier("90 minerai débités", ej(page, "state.save.soldes.minerai") == minerai_avant - 90)
    verifier("compteur SOCLES RECOUSUS : 1/12",
             "SOCLES RECOUSUS : 1/12" in page.locator("#modal").inner_text())
    # ---- Teinturerie : achat = porté aussitôt, PORTER/retour d'origine
    brindille_avant = ej(page, "state.save.soldes.brindille")
    page.locator("#modal button", has_text="COUDRE").first.click()  # ROSE THÉ
    page.wait_for_timeout(400)
    verifier("teinture ROSE THÉ possédée", ej(page, "state.save.matieres.teintures.includes('rose_the')"))
    verifier("teinture portée à l'achat", ej(page, "state.save.matieres.teintureActive") == "rose_the")
    verifier("800 brindilles débitées", ej(page, "state.save.soldes.brindille") == brindille_avant - 800)
    page.get_by_role("button", name="REPRENDRE LA TENUE D’ORIGINE").click()
    page.wait_for_timeout(400)
    verifier("tenue d'origine reprise", ej(page, "state.save.matieres.teintureActive") is None)
    page.locator("#modal button", has_text="PORTER").first.click()
    page.wait_for_timeout(400)
    verifier("teinture reportée sans repayer",
             ej(page, "state.save.matieres.teintureActive") == "rose_the"
             and ej(page, "state.save.soldes.brindille") == brindille_avant - 800)

    page.get_by_role("button", name="FERMER").click()
    page.wait_for_timeout(300)

    # ---- entrer porte 1 : préparations ARMÉES mais PAS consommées
    verifier("aller à la porte 1", aller(page, 420, 1260))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(600)
    verifier("mode donjon", ej(page, "jeu.mode") == "donjon")
    verifier("préparations non consommées à l'entrée",
             ej(page, "state.save.matieres.preparations.renfort") is True
             and ej(page, "state.save.matieres.preparations.kit") is True)

    # ---- reload en plein donjon → retour Antre, préparations INTACTES
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    verifier("reload → retour à l'Antre", ej(page, "jeu.mode") == "antre")
    verifier("préparations intactes après reload",
             ej(page, "state.save.matieres.preparations.renfort") is True
             and ej(page, "state.save.matieres.preparations.kit") is True)

    # ---- refaire la porte 1 jusqu'à la victoire → préparations consommées
    verifier("aller à la porte 1 (bis)", aller(page, 420, 1260))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(600)
    verifier("mode donjon (bis)", ej(page, "jeu.mode") == "donjon")

    victoire = False
    for _ in range(120):  # max ~2 min, l'héroïne Force 30 déblaie vite
        page.wait_for_timeout(1000)
        if page.locator("#modal-fond").is_visible() and "VICTOIRE" in page.locator("#modal").inner_text():
            victoire = True
            break
    page.screenshot(path=SCRATCH + "/mat_victoire.png")
    verifier("victoire de la porte 1", victoire)
    verifier("préparations consommées à la victoire",
             ej(page, "state.save.matieres.preparations.renfort") is False
             and ej(page, "state.save.matieres.preparations.kit") is False)

    browser.close()

print()
if erreurs:
    print("ERREURS CONSOLE :")
    for e in erreurs:
        print("  " + e)
if echecs:
    print(f"{len(echecs)} ÉCHEC(S)")
    sys.exit(1)
print("TOUT EST VERT — l'Atelier des matières tient debout.")
