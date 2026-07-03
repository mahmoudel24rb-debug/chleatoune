# Chronomètre un jalon du plan 12 §7 : charge une sauvegarde de
# saves-test/, entre dans la porte cible, danse pour esquiver, note
# le temps par vague, le boss et les morts.
import json
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

jalon_fichier = sys.argv[1]
porte_x, porte_y = int(sys.argv[2]), int(sys.argv[3])
nom = sys.argv[4]

with open(jalon_fichier, encoding="utf-8") as f:
    save = json.load(f)

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


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.add_init_script(
        "if (!window.localStorage.getItem('birblike_profils_v1')) "
        f"window.localStorage.setItem('birblike_save_v1', {json.dumps(json.dumps(save))});"
    )
    page.goto("http://localhost:5199")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.evaluate("() => { window.__jeu.state.save.zone = 5; }")
    page.wait_for_timeout(300)
    aller(page, 1200, 625)
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    assert page.evaluate("() => window.__jeu.jeu.mode") == "antre", "pas dans l'antre"
    assert aller(page, porte_x, porte_y + 10), "porte introuvable"
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(600)

    debut = time.time()
    vagues = {}
    vague_debut = time.time()
    derniere_vague = 0
    boss_debut = None
    morts = 0
    resultat = "?"
    # pilote « humain plausible » : il KITE en tournant en large cercle
    # (un vrai joueur ne reste jamais planté au milieu de la meute)
    RONDE = ["droite", "bas", "gauche", "haut"]
    for i in range(600):
        touche = RONDE[(i // 3) % 4]
        page.keyboard.down(KEYMAP[touche])
        page.wait_for_timeout(700)
        page.keyboard.up(KEYMAP[touche])
        page.wait_for_timeout(120)
        infos = page.evaluate(
            "() => { const d = window.__jeu.donjon; return {"
            "mode: window.__jeu.jeu.mode, vague: d.getVague().index,"
            "phase: d.getVague().phase, boss: !!d.getBoss() }; }"
        )
        if infos["mode"] != "donjon":
            resultat = "K.O."
            morts += 1
            break
        if infos["boss"] and boss_debut is None:
            boss_debut = time.time()
        if infos["vague"] != derniere_vague:
            vagues[derniere_vague] = time.time() - vague_debut
            vague_debut = time.time()
            derniere_vague = infos["vague"]
        if page.locator("#modal-fond").is_visible() and "VICTOIRE" in page.locator("#modal").inner_text():
            resultat = "VICTOIRE"
            break
    total = time.time() - debut
    boss_duree = (time.time() - boss_debut) if boss_debut else 0
    print(f"JALON {nom} : {resultat} en {total:.0f}s — vague 1 : {vagues.get(0, 0):.0f}s — boss : {boss_duree:.0f}s — morts : {morts}")
    browser.close()
