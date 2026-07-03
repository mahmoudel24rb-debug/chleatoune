import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

echecs = []


def verifier(nom, condition):
    print(("OK  " if condition else "FAIL") + " " + nom)
    if not condition:
        echecs.append(nom)


save = {"version": 3, "soldes": {"popcorn": 0, "graine": 0, "brindille": 0, "minerai": 0}}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context(viewport={"width": 1280, "height": 800}).new_page()
    page.add_init_script(
        "if (!window.localStorage.getItem('birblike_profils_v1')) "
        f"window.localStorage.setItem('birblike_save_v1', {json.dumps(json.dumps(save))});"
    )
    page.goto("http://localhost:5199")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1200)

    page.keyboard.press("F1")
    page.wait_for_timeout(300)
    verifier("F1 → panneau dev visible", page.locator("#dev-panneau").is_visible())
    verifier("verrouillé par défaut", "VERROUILLÉ" in page.locator("#dev-panneau").inner_text())

    # mauvais mot de passe
    page.locator("#dev-panneau input").fill("mauvais")
    page.get_by_role("button", name="DÉVERROUILLER").click()
    page.wait_for_timeout(300)
    verifier("mauvais mdp refusé", "VERROUILLÉ" in page.locator("#dev-panneau").inner_text())
    verifier("toast d'erreur", "INCORRECT" in page.locator("#toasts").inner_text())

    # bon mot de passe
    page.locator("#dev-panneau input").fill("RakTma123456")
    page.locator("#dev-panneau input").press("Enter")
    page.wait_for_timeout(300)
    verifier("déverrouillé", "SE DONNER" in page.locator("#dev-panneau").inner_text())

    # ajout personnalisé : 12345 plumes
    page.locator("#dev-panneau select").select_option("plume")
    page.locator("#dev-panneau input[type=number]").fill("12345")
    page.get_by_role("button", name="AJOUTER", exact=True).click()
    page.wait_for_timeout(300)
    verifier("plumes +12345", page.evaluate("() => window.__jeu.state.save.plumes") == 12345)
    verifier("cumulPlumes suit", page.evaluate("() => window.__jeu.state.save.cumulPlumes") == 12345)

    # raccourci +10 000 smiski
    page.get_by_role("button", name="+10 000 SMISKI").click()
    page.wait_for_timeout(300)
    verifier("smiski +10000", page.evaluate("() => window.__jeu.state.save.soldes.popcorn") == 10000)

    # F1 masque ; reload de session : reste déverrouillé
    page.keyboard.press("F1")
    page.wait_for_timeout(200)
    verifier("F1 masque le panneau", not page.locator("#dev-panneau").is_visible())
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1200)
    page.keyboard.press("F1")
    page.wait_for_timeout(300)
    verifier("session : reste déverrouillé", "SE DONNER" in page.locator("#dev-panneau").inner_text())
    verifier("les gains ont été sauvegardés", page.evaluate("() => window.__jeu.state.save.plumes") == 12345)

    browser.close()

sys.exit(1 if echecs else 0)
