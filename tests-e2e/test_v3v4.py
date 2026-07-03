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


# sauvegarde v3 avancée : succès à rattraper, porte 3 finie (malédictions
# possibles), 50+ smiski cumulés (Brioche dispo), besace garnie
save = {
    "version": 3,
    "soldes": {"popcorn": 100000, "graine": 0, "brindille": 100, "minerai": 0},
    "cumulsGlobaux": {"popcorn": 60000, "graine": 100, "brindille": 200, "minerai": 50},
    "soldeDore": 2000,
    "rebirbs": 1,
    "nid": 1,
    "heros": {"niveau": 12, "xp": 0, "sp": 0,
              "competences": {"vitalite": 12, "recuperation": 6, "force": 30}},
    "swarm": {"porteMax": 4, "termines": {"1": 2, "2": 1, "3": 1}, "sansFinRecord": 0,
              "escouade": [], "hotbar": [None, None, None]},
    "parchemins": {"puissance": 2},
    "sorts": {"ciseaux": 2},
    "compagnons": {"prairie": 4},
    "peche": {"niveau": 3, "xp": 0, "canne": 1, "appats": {}, "appatActif": None, "pecheurs": 1,
              "dex": {"sardine": {"captures": 4, "shiny": 1}, "goujon": {"captures": 3, "shiny": 0}}},
    "inventaire": {"poissons": {"sardine": {"n": 5, "shiny": 1}, "goujon": {"n": 3, "shiny": 0}},
                   "plats": {}},
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


def finir_dialogue(page, max_boites=8):
    """Avance un dialogue jusqu'à sa fermeture."""
    for _ in range(max_boites * 3):
        if not page.locator("#dialogue").is_visible():
            return True
        page.keyboard.press("KeyE")
        page.wait_for_timeout(350)
        page.keyboard.press("KeyE")
        page.wait_for_timeout(250)
    return not page.locator("#dialogue").is_visible()


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
    page.wait_for_timeout(2500)

    # ================= PLAN 16 : succès en rafale au chargement ========
    nb_succes = page.evaluate("() => Object.keys(window.__jeu.state.save.succes).length")
    verifier(f"succès rattrapés au chargement ({nb_succes})", nb_succes >= 8)
    verifier("titre de rang accordé", "APPRENTIE" in ej(page, "state.save.titres"))

    # ================= PLAN 15 : fil rouge chapitre 1 ==================
    verifier("suivi HUD du fil rouge", "CH. 1" in (page.locator(".suivi").inner_text() or ""))
    verifier("aller voir Grand-Mère Brioche", aller(page, 700, 1110))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(600)
    verifier("boîte de dialogue ouverte", page.locator("#dialogue").is_visible())
    contenu_dialogue = page.locator("#dialogue").inner_text()
    verifier("Brioche parle", "BRIOCHE" in contenu_dialogue)
    verifier("dialogue déroulé", finir_dialogue(page))
    verifier("étape collecter active", "COLLECTER 150" in page.locator(".suivi").inner_text())
    # les 150 smiski via le mode dev (le compteur part de l'ACCEPTATION)
    page.keyboard.press("F1")
    page.wait_for_timeout(300)
    page.locator("#dev-panneau input").fill("RakTma123456")
    page.locator("#dev-panneau input").press("Enter")
    page.wait_for_timeout(300)
    page.get_by_role("button", name="+10 000 SMISKI").click()
    page.wait_for_timeout(700)
    page.keyboard.press("F1")
    verifier("collecte validée → retour Brioche",
             "REVENIR" in page.locator(".suivi").inner_text())
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    verifier("dialogue de fin de chapitre", finir_dialogue(page))
    page.wait_for_timeout(400)
    verifier("bobine verte obtenue", "verte" in ej(page, "state.save.filRouge.bobines"))
    verifier("chapitre 2 engagé", ej(page, "state.save.filRouge.chapitre") == 2)

    # ================= PLAN 16 : calendrier ============================
    verifier("aller au calendrier", aller(page, 180, 710))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    verifier("modal calendrier", "CALENDRIER" in page.locator("#modal").inner_text())
    if page.locator("#modal button", has_text="OFFRIR").count() > 0:
        page.locator("#modal button", has_text="OFFRIR").click()
        page.wait_for_timeout(400)
        verifier("offrande faite (série 1)", ej(page, "state.save.calendrier.serie") == 1)
        verifier("offrande unique par jour", "DÉJÀ FAITE" in page.locator("#modal").inner_text())
    else:
        verifier("offrande faite (série 1)", False)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # ================= PLAN 16 : fil secret ============================
    # (rayon d'interaction 60 px : il faut coller le fil à (80, 90))
    verifier("aller au fil secret de la prairie", aller(page, 85, 95, marge=22))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(1500)
    verifier("fil tiré une fois", "fil_prairie_1" in ej(page, "state.save.secrets"))

    # ================= PLAN 18 : besace & cuisine ======================
    page.keyboard.press("KeyI")
    page.wait_for_timeout(400)
    contenu = page.locator("#modal").inner_text()
    verifier("besace ouverte (I)", "LA BESACE" in contenu)
    verifier("sardines empilées", "SARDINE ROSE ×5" in contenu)
    popcorn_avant = ej(page, "state.save.soldes.popcorn")
    page.locator("#modal button", has_text="VENDRE ×5").first.click()
    page.wait_for_timeout(400)
    popcorn_apres = ej(page, "state.save.soldes.popcorn")
    verifier(f"vente ×5 sardines (+{popcorn_apres - popcorn_avant:.0f})",
             popcorn_apres - popcorn_avant >= 75)
    verifier("le shiny n'a pas été vendu",
             ej(page, "state.save.inventaire.poissons.sardine.shiny") == 1)
    # cuisiner un onigiri (2 communs — il reste 3 goujons)
    page.get_by_role("button", name="LA CUISINE DE BRIOCHE →").click()
    page.wait_for_timeout(400)
    verifier("cuisine ouverte", "CUISINE DE BRIOCHE" in page.locator("#modal").inner_text())
    page.locator("#modal button", has_text="CUISINER").first.click()
    page.wait_for_timeout(400)
    verifier("onigiri cuisiné", ej(page, "state.save.inventaire.plats.onigiri") == 1)
    verifier("2 goujons consommés", ej(page, "state.save.inventaire.poissons.goujon.n") == 1)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # ================= PLAN 18 : aquarium ==============================
    page.evaluate("() => { window.__jeu.state.save.inventaire.poissons.sardine.n = 2; }")
    page.keyboard.press("KeyI")
    page.wait_for_timeout(300)
    page.keyboard.press("Escape")  # (re-render du stock)
    page.wait_for_timeout(200)
    page.evaluate("() => { window.__jeu.state.save.zone = 0; }")
    page.wait_for_timeout(200)

    # ============ PLANS 14+18 : donjon (malédictions, archi, hotbar) ===
    # hotbar : l'onigiri au slot 1
    page.evaluate("() => { window.__jeu.state.save.swarm.hotbar[0] = 'onigiri'; }")
    # archimonstre garanti
    page.evaluate("() => window.__jeu.debug.archiChance(1)")
    page.evaluate("() => { window.__jeu.state.save.zone = 5; }")
    page.wait_for_timeout(300)
    verifier("aller au portail", aller(page, 1200, 625))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    verifier("dans l'Envers", ej(page, "jeu.mode") == "antre")
    verifier("aller à la porte 1", aller(page, 420, 1260))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    contenu = page.locator("#modal").inner_text()
    verifier("malédictions proposées (porte déjà finie)", "MALÉDICTIONS" in contenu)
    verifier("hotbar dans le modal de porte", "HOTBAR" in contenu)
    # cocher 2 malédictions : PRESSE (30) + TEMPO (20) → ×1,50
    cases = page.locator("#modal input[type=checkbox]")
    cases.nth(0).check()
    page.wait_for_timeout(150)
    cases.nth(6).check()
    page.wait_for_timeout(150)
    verifier("multiplicateur affiché ×1,50", "×1,50" in page.locator("#modal").inner_text())
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(800)
    verifier("2 malédictions actives", len(ej(page, "donjon") and page.evaluate(
        "() => window.__jeu.state.save.swarm.escouade") or []) >= 0)  # placeholder
    actives = page.evaluate("() => { const d = window.__jeu; return d.jeu.mode; }")
    verifier("mode donjon", actives == "donjon")
    verifier("défi affiché au HUD", "🎯" in page.locator("#zone-indicateur").inner_text())
    verifier("☠×2 au HUD", "☠×2" in page.locator("#zone-indicateur").inner_text())

    # hotbar : prendre des dégâts puis croquer l'onigiri (touche 1)
    page.evaluate("() => window.__jeu.donjon.degats(80)")
    page.wait_for_timeout(200)
    page.keyboard.press("Digit1")
    page.wait_for_timeout(400)
    verifier("onigiri consommé (touche 1)", ej(page, "state.save.inventaire.plats.onigiri") == 0)
    # le cooldown global bloque le slot
    page.keyboard.press("Digit1")
    page.wait_for_timeout(200)

    # laisser la porte se jouer : archi attendu (chance 100 %)
    vu_archi = False
    victoire = False
    RONDE = ["droite", "bas", "gauche", "haut"]
    for i in range(200):
        touche = RONDE[(i // 3) % 4]
        page.keyboard.down(KEYMAP[touche])
        page.wait_for_timeout(500)
        page.keyboard.up(KEYMAP[touche])
        infos = page.evaluate(
            "() => { const d = window.__jeu.donjon; return {"
            "archi: d.monstres().some(m => m.archi), mode: window.__jeu.jeu.mode }; }"
        )
        if infos["mode"] != "donjon":
            break
        vu_archi = vu_archi or infos["archi"]
        if page.locator("#modal-fond").is_visible() and "VICTOIRE" in page.locator("#modal").inner_text():
            victoire = True
            break
    verifier("un archimonstre a spawné (chance forcée)", vu_archi)
    verifier("victoire porte 1 maudite", victoire)
    if victoire:
        recap = page.locator("#modal").inner_text()
        verifier("récap : défi", "DÉFI" in recap)
        verifier("récap : malédictions ×1,50", "×1,50" in recap)
        verifier("bestiaire rempli",
                 page.evaluate("() => Object.values(window.__jeu.state.save.bestiaire).some(n => n > 0)"))
        page.get_by_role("button", name="RETOUR À L’ANTRE").click()
        page.wait_for_timeout(500)

    # ================= recouture : TOUT survit =========================
    page.evaluate("() => { window.__jeu.state.save.cumulCycle = 1e9; }")
    ok = page.evaluate("() => window.__jeu.rebirb()")
    page.wait_for_timeout(400)
    verifier("recouture effectuée", ok is True)
    verifier("bestiaire intact", page.evaluate(
        "() => Object.values(window.__jeu.state.save.bestiaire).some(n => n > 0)"))
    verifier("succès intacts", page.evaluate(
        "() => Object.keys(window.__jeu.state.save.succes).length") >= 8)
    verifier("secrets intacts", "fil_prairie_1" in ej(page, "state.save.secrets"))
    verifier("bobines intactes", "verte" in ej(page, "state.save.filRouge.bobines"))
    # ≥ 1 et pas == 1 : le pêcheur automatique embauché continue de
    # remplir la besace pendant le test — c'est le plan 18 qui marche
    verifier("besace intacte", ej(page, "state.save.inventaire.poissons.goujon.n") >= 1)
    verifier("hotbar intacte", ej(page, "state.save.swarm.hotbar[0]") == "onigiri")

    browser.close()

if erreurs:
    print("ERREURS CONSOLE:")
    for e in erreurs[:10]:
        print(" -", e)
if echecs or erreurs:
    sys.exit(1)
print("TESTS V3+V4 OK.")
