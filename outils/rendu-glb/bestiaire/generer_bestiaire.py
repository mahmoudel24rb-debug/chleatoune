# Rend les sprites du bestiaire (refonte) depuis les .glb copies ici.
# 10 PNG par modele : 2 vues (face yaw 0, profil yaw 270) x 5 poses.
# Inspire de outils/rendu-glb/generer.py.
import base64
import io
import json
import math
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from PIL import Image
from playwright.sync_api import sync_playwright

DIR = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(DIR, "sortie")
PORT = 8126
PITCH = 12
YAWS = {"face": 0, "profil": 270}

# Fractions de la duree du clip pour chaque pose
FRACTIONS = [
    ("idle", "idle", 0.40),
    ("marche1", "course", 0.20),
    ("marche2", "course", 0.65),
    ("attaque1", "attaque", 0.30),
    ("attaque2", "attaque", 0.60),
]

# Corrections manuelles des choix automatiques (choix.json)
# Facteur du rayon-limite (mediane x N) du cadrage : Kog'Maw a une forme
# "bombe posthume" garee a +700/-670 en Y dans le MEME mesh skinne, que le
# facteur 8 par defaut n'exclut pas.
FACTEURS_LIMITE = {"m_bombix": 2.5}

OVERRIDES = {
    "b_morgana": {"idle": "Idle1", "course": "morgana_run.anm"},
    "m_spectre": {"course": "Khazix_run.anm"},
    "b_belveth": {"idle": "Idle1_Base"},
    "b_skarner": {"course": "RunBase"},
    "b_aurelionsol": {"attaque": "AurelionSol_Attack1.anm"},
    "m_glouton": {"idle": "Idle1"},
}

MONSTRES = ["m_glouton", "m_epingleur", "m_cracheur", "m_golem", "m_spectre", "m_bombix"]
BOSS = ["b_maokai", "b_morgana", "b_skarner", "b_fizz", "b_belveth", "b_nunubot",
        "b_ornn", "b_fiddlesticks", "b_malphite", "b_leona", "b_nautilus",
        "b_velkoz", "b_aurelionsol"]
PNJ = ["pnj_mercier", "c_scene", "c_foret", "c_mine", "c_desert"]

def hauteur_de(prefixe):
    if prefixe.startswith("m_"):
        return 48
    if prefixe.startswith("b_"):
        return 110
    return 56

with open(os.path.join(DIR, "clips.json"), encoding="utf-8") as f:
    CLIPS = json.load(f)
with open(os.path.join(DIR, "choix.json"), encoding="utf-8") as f:
    CHOIX = json.load(f)


def clips_du(prefixe):
    """Retourne {role: (nomClip, duree)} pour idle/course/attaque."""
    glb = prefixe + ".glb"
    choix = dict(CHOIX[glb])
    choix.update(OVERRIDES.get(prefixe, {}))
    durees = {c["name"]: c["duration"] for c in CLIPS[glb]}
    out = {}
    for role in ("idle", "course", "attaque"):
        nom = choix[role]
        out[role] = (nom, durees[nom])
    return out


def recadrer_au_sol(chemins):
    """Mode 'complet' : recadre sur le contenu, centre horizontalement,
    ancre au sol dans un canvas commun."""
    imgs = [Image.open(c).convert("RGBA") for c in chemins]
    boites = [i.getbbox() for i in imgs]
    for chemin, boite in zip(chemins, boites):
        if boite is None:
            raise RuntimeError(f"frame entierement vide : {os.path.basename(chemin)}")
    h = max(b[3] - b[1] for b in boites)
    w = max(b[2] - b[0] for b in boites)
    for img, boite, chemin in zip(imgs, boites, chemins):
        contenu = img.crop(boite)
        x = (w - contenu.width) // 2
        sortie = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sortie.paste(contenu, (x, h - contenu.height), contenu)
        sortie.save(chemin)


def post_traiter(img):
    """Alpha net + contour sombre 1px (#4a3548)."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255 if a >= 128 else 0)
    contour = (74, 53, 72, 255)
    a_tracer = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 255:
                        a_tracer.append((x, y))
                        break
    for x, y in a_tracer:
        px[x, y] = contour
    return img


def rendre_modele(browser, prefixe):
    """Rend les 10 PNG d'un modele. Retourne (fichiers, clips_utilises)."""
    roles = clips_du(prefixe)
    frames = [(pose, roles[role][0], round(frac * roles[role][1], 4))
              for pose, role, frac in FRACTIONS]
    page = browser.new_page()
    page.on("pageerror", lambda e: print(f"  PAGEERROR {prefixe}:", e))
    try:
        page.goto(f"http://localhost:{PORT}/render.html?glb={prefixe}.glb")
        page.wait_for_function("window.pret === true", timeout=90000)
        if prefixe in FACTEURS_LIMITE:
            page.evaluate(f"window.facteurLimite = {FACTEURS_LIMITE[prefixe]}")
        ratio = page.evaluate(
            "a => window.calibrerUnion(a.frames, a.yaws, a.pitch)",
            {"frames": [{"clip": c, "temps": t} for _, c, t in frames],
             "yaws": list(YAWS.values()), "pitch": PITCH},
        )
        hauteur = hauteur_de(prefixe)
        largeur = math.ceil(hauteur * ratio)
        print(f"{prefixe}: ratio {ratio:.3f} -> {largeur}x{hauteur} | "
              + ", ".join(f"{r}={roles[r][0]}" for r in roles))
        fichiers = []
        for nom_vue, yaw in YAWS.items():
            for pose, clip, t in frames:
                data = page.evaluate(
                    "o => window.rendre(o)",
                    {"largeur": largeur, "hauteur": hauteur, "yaw": yaw,
                     "pitch": PITCH, "clip": clip, "temps": t},
                )
                img = Image.open(io.BytesIO(base64.b64decode(data.split(",")[1])))
                chemin = os.path.join(SORTIE, f"{prefixe}_{nom_vue}_{pose}.png")
                post_traiter(img).save(chemin)
                fichiers.append(chemin)
    finally:
        page.close()
    recadrer_au_sol(fichiers)
    return fichiers, {r: roles[r][0] for r in roles}


def planche(nom, prefixes, echelle):
    """Planche contact : une ligne de 10 frames par modele."""
    lignes = []
    for prefixe in prefixes:
        fichiers = [os.path.join(SORTIE, f"{prefixe}_{v}_{p}.png")
                    for v in YAWS for p, _, _ in FRACTIONS]
        if not all(os.path.exists(f) for f in fichiers):
            continue
        imgs = [Image.open(f) for f in fichiers]
        imgs = [i.resize((i.width * echelle, i.height * echelle), Image.NEAREST) for i in imgs]
        lignes.append((prefixe, imgs))
    if not lignes:
        return
    cw = max(i.width for _, imgs in lignes for i in imgs) + 8
    ch = max(i.height for _, imgs in lignes for i in imgs) + 8
    pl = Image.new("RGBA", (10 * cw + 16, len(lignes) * (ch + 4) + 16), (60, 90, 60, 255))
    for li, (prefixe, imgs) in enumerate(lignes):
        for ci, img in enumerate(imgs):
            x = 8 + ci * cw + (cw - img.width) // 2
            y = 8 + li * (ch + 4) + (ch - img.height)
            pl.paste(img, (x, y), img)
    chemin = os.path.join(DIR, f"planche_{nom}.png")
    pl.save(chemin)
    print("planche :", chemin, pl.size)


def main(prefixes):
    os.makedirs(SORTIE, exist_ok=True)
    serveur = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)], cwd=DIR,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1.5)
    chemin_res = os.path.join(DIR, "resultats.json")
    if os.path.exists(chemin_res):
        with open(chemin_res, encoding="utf-8") as f:
            resultats = json.load(f)
        # purge les entrees des modeles qu'on re-rend
        resultats["ok"] = [p for p in resultats["ok"] if p not in prefixes]
        resultats["echecs"] = [e for e in resultats["echecs"] if e["prefixe"] not in prefixes]
        for p in prefixes:
            resultats["clips"].pop(p, None)
    else:
        resultats = {"ok": [], "echecs": [], "clips": {}}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for prefixe in prefixes:
                try:
                    _, clips = rendre_modele(browser, prefixe)
                    resultats["ok"].append(prefixe)
                    resultats["clips"][prefixe] = clips
                except Exception as e:
                    print(f"ECHEC {prefixe}: {e}")
                    resultats["echecs"].append({"prefixe": prefixe, "raison": str(e)})
            browser.close()
    finally:
        serveur.terminate()
    planche("monstres", MONSTRES, 2)
    planche("boss", BOSS, 1)
    planche("pnj", PNJ, 2)
    with open(os.path.join(DIR, "resultats.json"), "w", encoding="utf-8") as f:
        json.dump(resultats, f, ensure_ascii=False, indent=1)
    print("FIN", json.dumps(resultats["echecs"], ensure_ascii=False))


if __name__ == "__main__":
    cibles = sys.argv[1:] or (MONSTRES + BOSS + PNJ)
    main(cibles)
