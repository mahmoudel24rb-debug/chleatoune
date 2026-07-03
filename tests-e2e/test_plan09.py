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


# sauvegarde v2 : étage 20 (→ porte 7 attendue), héroïne costaude pour
# nettoyer la porte 1 vite (Force 60 = 130 dégâts, ~195 en mêlée)
save = {
    "version": 2,
    "soldes": {"popcorn": 5000, "graine": 0, "brindille": 0, "minerai": 0},
    "rebirbs": 0,
    "meilleurEtage": 20,
    "niveaux": {"p_doughcat": 2},
    "heros": {"niveau": 12, "xp": 0, "sp": 0,
              "competences": {"vitalite": 20, "recuperation": 10, "force": 60}},
}

KEYMAP = {"gauche": "ArrowLeft", "droite": "ArrowRight", "haut": "ArrowUp", "bas": "ArrowDown"}


def pos(page):
    return page.evaluate("() => ({x: window.__jeu.birb.x, y: window.__jeu.birb.y})")


def aller(page, cx, cy, marge=30, timeout_iter=140):
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


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    # (les 404 de api/sauvegarde sont normaux en local : pas de cloud)
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

    # ---- migration v3 : étage 20 → porte 7 (table du plan 12 §6)
    verifier("save version 3", ej(page, "state.save.version") == 3)
    verifier(f"étage 20 → porteMax 7 ({ej(page, 'state.save.swarm.porteMax')})",
             ej(page, "state.save.swarm.porteMax") == 7)
    verifier("ciseaux offerts (sorts.ciseaux=1)", ej(page, "state.save.sorts.ciseaux") == 1)
    verifier("doughcats migrés vers compagnons.prairie", ej(page, "state.save.compagnons.prairie") == 2)

    # ---- hall → Antre
    page.evaluate("() => { window.__jeu.state.save.zone = 5; }")
    page.wait_for_timeout(300)
    verifier("aller au portail du hall", aller(page, 1200, 625))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    verifier("mode antre", ej(page, "jeu.mode") == "antre")
    page.screenshot(path=SCRATCH + "/p09_antre.png")

    # ---- porte verrouillée (la 8, hors de portée avec porteMax=7)
    verifier("aller à la porte 8 (verrouillée)", aller(page, 420, 810))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    verifier("toujours dans l'antre (porte fermée)", ej(page, "jeu.mode") == "antre")
    toast = page.locator("#toasts").inner_text()
    verifier("message de porte verrouillée : " + toast[:40], "PRÉCÉDENTE" in toast)

    # ---- porte 1 : confirmation → donjon
    verifier("aller à la porte 1", aller(page, 420, 1260))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    contenu = page.locator("#modal").inner_text()
    verifier("modal de confirmation : " + contenu.split("\n")[0][:30], "LA CLAIRIÈRE" in contenu)
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(600)
    verifier("mode donjon", ej(page, "jeu.mode") == "donjon")
    verifier("vague 1 affichée", "VAGUE" in page.locator("#zone-indicateur").inner_text())
    page.wait_for_timeout(2500)
    page.screenshot(path=SCRATCH + "/p09_vague1.png")

    # ---- laisser la porte se dérouler (les monstres viennent à nous)
    victoire = False
    for _ in range(120):  # max ~2 min
        page.wait_for_timeout(1000)
        if page.locator("#modal-fond").is_visible() and "VICTOIRE" in page.locator("#modal").inner_text():
            victoire = True
            break
    page.screenshot(path=SCRATCH + "/p09_fin.png")
    verifier("victoire de la porte 1 (3 vagues + boss)", victoire)
    verifier("porte 1 comptée", ej(page, "state.save.swarm.termines[1]") == 1)
    verifier("porteMax inchangé (7 > 2)", ej(page, "state.save.swarm.porteMax") == 7)

    # ---- retour à l'Antre depuis le panneau de fin
    page.get_by_role("button", name="RETOUR À L’ANTRE").click()
    page.wait_for_timeout(500)
    verifier("retour à l'antre", ej(page, "jeu.mode") == "antre")

    # ---- reload en plein donjon → retour propre dans l'Antre
    verifier("re-aller à la porte 1", aller(page, 420, 1260))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(300)
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(800)
    verifier("re-dans le donjon", ej(page, "jeu.mode") == "donjon")
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    verifier("reload en plein donjon → antre", ej(page, "jeu.mode") == "antre")

    # ---- K.O. : entrer porte 1 et s'infliger des dégâts fatals
    verifier("aller à la porte 1 (3e fois)", aller(page, 420, 1260))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(300)
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(1200)
    dores_avant = ej(page, "state.save.soldeDore")
    page.evaluate("() => window.__jeu.donjon.degats(99999)")
    page.wait_for_timeout(600)
    verifier("K.O. → retour à l'antre", ej(page, "jeu.mode") == "antre")
    dores_apres = ej(page, "state.save.soldeDore")
    verifier(f"butin conservé après K.O. ({dores_avant} → {dores_apres})", dores_apres >= dores_avant)
    toast = page.locator("#toasts").inner_text()
    print("dernier toast :", toast[:60])

    browser.close()

if erreurs:
    print("ERREURS CONSOLE:")
    for e in erreurs[:10]:
        print(" -", e)
if echecs or erreurs:
    sys.exit(1)
print("TESTS PLAN 09 OK.")
