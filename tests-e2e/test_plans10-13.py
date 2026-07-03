import json
import sys
import time

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


# sauvegarde v3 : porte 5 ouverte, Force 20, escouade possible (doughcats 4/4)
save = {
    "version": 3,
    "soldes": {"popcorn": 100000, "graine": 10000, "brindille": 0, "minerai": 0},
    "soldeDore": 2000,
    "rebirbs": 1,
    "heros": {"niveau": 10, "xp": 0, "sp": 0,
              "competences": {"vitalite": 10, "recuperation": 5, "force": 20}},
    "swarm": {"porteMax": 5, "termines": {"1": 1, "2": 1}, "sansFinRecord": 0, "escouade": []},
    "parchemins": {},
    "sorts": {"ciseaux": 1},
    "evolutions": {},
    "compagnons": {"prairie": 4, "scene": 1},
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

    # ---- boot & hall → Antre
    page.evaluate("() => { window.__jeu.state.save.zone = 5; }")
    page.wait_for_timeout(300)
    verifier("aller au portail du hall", aller(page, 1200, 625))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    verifier("mode antre", ej(page, "jeu.mode") == "antre")

    # ============================== PLAN 11 : le Mercier ==============
    degats_avant = ej(page, "state.stats.degats")
    page.keyboard.press("KeyM")
    page.wait_for_timeout(400)
    contenu = page.locator("#modal").inner_text()
    verifier("touche M → LE MERCIER", "LE MERCIER" in contenu)
    verifier("onglet PATRONS DE COUTURE", "PATRONS DE COUTURE" in contenu)

    # acheter FIL DE FORCE ×3 (critère plan 11 : les dégâts bougent)
    for _ in range(3):
        page.locator("#modal .carte").first.locator("button").click()
        page.wait_for_timeout(250)
    verifier("FIL DE FORCE ×3 acheté", ej(page, "state.save.parchemins.puissance") == 3)
    degats_apres = ej(page, "state.stats.degats")
    verifier(f"les dégâts bougent ({degats_avant} → {degats_apres})", degats_apres > degats_avant)

    # onglet sorts : débloquer les aiguilles
    page.get_by_role("button", name="SORTILÈGES COUSUS").click()
    page.wait_for_timeout(300)
    contenu = page.locator("#modal").inner_text()
    verifier("6 sorts affichés (CISO-RANG…)", "CISO-RANG" in contenu and "MIKU-TOURELLE" in contenu)
    verifier("évolutions annoncées", "CISEAUX FRACTALS" in contenu)
    page.locator("#modal button", has_text="DÉBLOQUER").first.click()
    page.wait_for_timeout(300)
    verifier("MITRAILLE D’AIGUILLES débloquée", ej(page, "state.save.sorts.aiguilles") == 1)
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    # ============================== PLAN 13 : escouade ================
    verifier("aller à la porte 3", aller(page, 1460, 1260))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    contenu = page.locator("#modal").inner_text()
    verifier("modal porte 3 avec section ESCOUADE", "ESCOUADE" in contenu and "DOUGHCAT" in contenu)
    page.locator("#modal input[type=checkbox]").first.check()
    page.wait_for_timeout(200)
    verifier("doughcat coché → escouade mémorisée",
             ej(page, "state.save.swarm.escouade").count("prairie") == 1)
    page.get_by_role("button", name="ENTRER ⚔").click()
    page.wait_for_timeout(800)
    verifier("mode donjon", ej(page, "jeu.mode") == "donjon")
    verifier("copie de combat apparue", ej(page, "donjon.escouade().length") == 1)

    # ================= PLAN 10 : tireurs, télégraphes, boss ===========
    vu_tireur = vu_telegraphe = vu_projectile = vu_boss = False
    tireur_immobile = False
    victoire = False
    debut = time.time()
    capture_vague = False
    for _ in range(280):
        page.wait_for_timeout(700)
        # petite danse : le pilote esquive (et prouve que c'est possible)
        page.keyboard.down(KEYMAP["droite"] if _ % 4 < 2 else KEYMAP["gauche"])
        page.wait_for_timeout(240)
        page.keyboard.up(KEYMAP["droite"] if _ % 4 < 2 else KEYMAP["gauche"])
        infos = page.evaluate(
            "() => { const d = window.__jeu.donjon; const ms = d.monstres();"
            "return { tireurs: ms.filter(m => m.type.comportement === 'tireur').length,"
            "vise: ms.some(m => m.viseT > 0),"
            "teleg: d.telegraphes(), proj: d.projectiles(),"
            "boss: d.getBoss() ? d.getBoss().bossId : null,"
            "phase: d.getVague().phase, mode: window.__jeu.jeu.mode }; }"
        )
        if infos["mode"] != "donjon":
            break
        vu_tireur = vu_tireur or infos["tireurs"] > 0
        vu_telegraphe = vu_telegraphe or infos["teleg"] > 0
        vu_projectile = vu_projectile or infos["proj"] > 0
        if infos["vise"]:
            tireur_immobile = True
        if infos["boss"]:
            vu_boss = True
            if not capture_vague:
                capture_vague = True
                page.wait_for_timeout(600)
                page.screenshot(path=SCRATCH + "/p10_boss.png")
        if not capture_vague and vu_telegraphe and infos["teleg"] > 0:
            page.screenshot(path=SCRATCH + "/p10_telegraphes.png")
        if page.locator("#modal-fond").is_visible() and "VICTOIRE" in page.locator("#modal").inner_text():
            victoire = True
            break
    duree = time.time() - debut
    verifier("des tireurs ont spawné (porte 3 = 70/30)", vu_tireur)
    verifier("des télégraphes sont apparus", vu_telegraphe)
    verifier("un tireur a visé (immobile, punissable)", tireur_immobile)
    verifier("des projectiles ont volé", vu_projectile)
    verifier("le boss SKARNER est arrivé", vu_boss)
    verifier(f"victoire de la porte 3 en {duree:.0f}s", victoire)
    page.screenshot(path=SCRATCH + "/p10_fin.png")
    print(f"    (chrono porte 3 : {duree:.0f} s — cible 4-8 min pour une porte complète)")
    page.get_by_role("button", name="RETOUR À L’ANTRE").click()
    page.wait_for_timeout(500)

    # ================= PLAN 13 : récolte à distance ===================
    # retour au monde, zone prairie : les MIKU-BOTS (zone SCÈNE) doivent
    # continuer à récolter « à distance »
    verifier("tapis de sortie de l'antre", aller(page, 1200, 1510))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(500)
    verifier("retour au monde", ej(page, "jeu.mode") == "monde")
    page.evaluate("() => { window.__jeu.state.save.zone = 0; }")
    page.wait_for_timeout(300)
    graine_avant = ej(page, "state.save.soldes.graine")
    page.wait_for_timeout(12000)
    graine_apres = ej(page, "state.save.soldes.graine")
    verifier(f"récolte MIKU à distance ({graine_avant:.1f} → {graine_apres:.1f})",
             graine_apres > graine_avant)

    # adoption diégétique : acheter un 2e MIKU-BOT sur place
    page.evaluate("() => { window.__jeu.state.save.zone = 1; }")
    page.wait_for_timeout(300)
    verifier("aller au panneau d'adoption de la scène", aller(page, 1200, 430))
    page.keyboard.press("KeyE")
    page.wait_for_timeout(400)
    contenu = page.locator("#modal").inner_text()
    verifier("modal MIKU-BOTS 1/4", "MIKU-BOTS" in contenu and "1/4" in contenu)
    page.locator("#modal button", has_text="ADOPTER").click()
    page.wait_for_timeout(300)
    verifier("2e MIKU-BOT adopté", ej(page, "state.save.compagnons.scene") == 2)
    page.keyboard.press("Escape")

    # ================= PLAN 11 : la recouture épargne tout ============
    page.evaluate("() => { window.__jeu.state.save.cumulCycle = 1e9; }")
    ok = page.evaluate("() => window.__jeu.rebirb()")
    page.wait_for_timeout(400)
    verifier("recouture effectuée", ok is True)
    verifier("parchemins intacts après recouture", ej(page, "state.save.parchemins.puissance") == 3)
    verifier("sorts intacts", ej(page, "state.save.sorts.aiguilles") == 1)
    verifier("compagnons intacts", ej(page, "state.save.compagnons.scene") == 2)
    verifier("porteMax intact", ej(page, "state.save.swarm.porteMax") >= 4)
    # (< 100 et pas == 0 : les doughcats récoltent DÉJÀ à distance après
    # la recouture — c'est le plan 13 qui fonctionne, pas un bug)
    verifier("smiski remis à zéro", ej(page, "state.save.soldes.popcorn") < 100)

    browser.close()

if erreurs:
    print("ERREURS CONSOLE:")
    for e in erreurs[:10]:
        print(" -", e)
if echecs or erreurs:
    sys.exit(1)
print("TESTS PLANS 10+11+13 OK.")
