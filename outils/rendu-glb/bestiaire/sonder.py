# Sonde les clips d'animation de chaque .glb du dossier et ecrit clips.json
import json
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8126

glbs = sorted(f for f in os.listdir(DIR) if f.endswith(".glb"))

serveur = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)], cwd=DIR,
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(1.5)

resultat = {}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for glb in glbs:
            page = browser.new_page()
            erreurs = []
            page.on("pageerror", lambda e, er=erreurs: er.append(str(e)))
            try:
                page.goto(f"http://localhost:{PORT}/render.html?glb={glb}")
                page.wait_for_function("window.pret === true", timeout=90000)
                resultat[glb] = page.evaluate("window.clips")
            except Exception as e:
                resultat[glb] = {"erreur": str(e), "pageerrors": erreurs}
            page.close()
            print(glb, "->", len(resultat[glb]) if isinstance(resultat[glb], list) else resultat[glb])
        browser.close()
finally:
    serveur.terminate()

with open(os.path.join(DIR, "clips.json"), "w", encoding="utf-8") as f:
    json.dump(resultat, f, ensure_ascii=False, indent=1)
print("ecrit clips.json")
