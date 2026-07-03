# Copie les PNG valides vers public/assets/monstres/ et ecrit manifest.json
import json
import os
import shutil
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from PIL import Image

DIR = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(DIR, "sortie")
DEST = r"c:\Users\dglco\Documents\birb\birb-like\public\assets\monstres"

POSES = ["idle", "marche1", "marche2", "attaque1", "attaque2"]
VUES = ["face", "profil"]

with open(os.path.join(DIR, "resultats.json"), encoding="utf-8") as f:
    res = json.load(f)

os.makedirs(DEST, exist_ok=True)
ok_final = []
echecs = list(res["echecs"])
for prefixe in res["ok"]:
    fichiers = [f"{prefixe}_{v}_{p}.png" for v in VUES for p in POSES]
    vides = []
    for f_ in fichiers:
        chemin = os.path.join(SORTIE, f_)
        if not os.path.exists(chemin) or Image.open(chemin).getbbox() is None:
            vides.append(f_)
    if vides:
        echecs.append({"prefixe": prefixe, "raison": f"frames vides: {vides}"})
        continue
    for f_ in fichiers:
        shutil.copy2(os.path.join(SORTIE, f_), os.path.join(DEST, f_))
    ok_final.append(prefixe)

manifest = {
    "ok": ok_final,
    "echecs": echecs,
    "clips": {p: res["clips"][p] for p in ok_final},
}
with open(os.path.join(DEST, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
print(f"copies: {len(ok_final)} modeles ({len(ok_final)*10} PNG), echecs: {len(echecs)}")
print("manifest:", os.path.join(DEST, "manifest.json"))
