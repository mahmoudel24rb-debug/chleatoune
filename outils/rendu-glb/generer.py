# Genere les sprites du jeu depuis les modeles 3D (.glb) poses a cote.
# Chaque modele definit ses frames (clip + instant), ses vues (yaw) et sa
# hauteur de rendu. Le cadrage est l'union des boites de toutes les poses,
# projetee dans chaque vue : rien n'est coupe, echelle identique partout.
import base64
import io
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from PIL import Image
from playwright.sync_api import sync_playwright

DIR = os.path.dirname(os.path.abspath(__file__))

def modele_heroine(glb, prefixe, clip_course="Run_Base",
                   clip_attaque="Cast_Cycle", temps_attaque=(0.15, 0.55)):
    """Config commune aux skins jouables. Les noms de clips varient selon
    les exports (Run vs Run_Base) et le style d'attaque selon le
    personnage (Gwen : Cast_Cycle à l'épée ; Sett : Cast_Animation aux
    poings)."""
    return {
        "glb": glb,
        "prefixe": prefixe,
        "hauteur": 130,
        "recadrer": "vertical",
        "frames": [
            ("idle", "Idle_Base", 0.53),
            ("marche1", clip_course, 0.18),
            ("marche2", clip_course, 0.55),
            ("attaque1", clip_attaque, temps_attaque[0]),
            ("attaque2", clip_attaque, temps_attaque[1]),
        ],
        "yaws": {"face": 0, "dos": 180, "profil": 270},
    }


MODELES = [
    modele_heroine("chibi_gwen.glb", "gwen", "Run"),
    modele_heroine("chibi_soul_fighter_gwen.glb", "soulfighter", "Run"),
    modele_heroine("prestige_chibi_cafe_cuties_gwen.glb", "cafecuties", "Run"),
    modele_heroine("chibi_sett.glb", "sett", "Run_Base", "Cast_Animation", (0.4, 0.9)),
    modele_heroine("chibi_heartsteel_sett.glb", "heartsteel", "Run_Base", "Cast_Animation", (0.4, 0.9)),
    modele_heroine("chibi_spirit_blossom_sett.glb", "spiritblossom", "Run_Base", "Cast_Animation", (0.4, 0.9)),
    {
        "glb": "chibi_crystal_rose_gwen.glb",
        "prefixe": "chleatoune",
        # L'union des poses (saut d'attaque + marche basse) est ~2,2x plus
        # haute que le corps : on rend a 130 pour un corps ~56 px comme avant.
        "hauteur": 130,
        # recadrage VERTICAL ancre au sol : plus de flottement au-dessus de
        # l'ombre, mais l'elan horizontal de l'estoc est conserve
        "recadrer": "vertical",
        "frames": [
            ("idle", "Idle_Base", 0.53),
            ("marche1", "Run_Base", 0.18),
            ("marche2", "Run_Base", 0.55),
            ("attaque1", "Cast_Cycle", 0.15),
            ("attaque2", "Cast_Cycle", 0.55),
        ],
        "yaws": {"face": 0, "dos": 180, "profil": 270},
    },
    {
        "glb": "doughcat.glb",
        "prefixe": "doughcat",
        "hauteur": 56,
        "frames": [
            ("idle", "Idle_Base", 0.5),
            ("marche1", "Run_Base", 0.1),
            ("marche2", "Run_Base", 0.32),
        ],
        "yaws": {"face": 0, "profil": 270},
        # les clips du chat n'ont pas la même hauteur de racine : on
        # recadre chaque frame sur son contenu, alignée au sol
        "recadrer": "complet",
    },
    {
        "glb": "chibi_yuumi.glb",
        "prefixe": "yuumi",
        "hauteur": 64,
        "frames": [
            ("idle", "Idle_Base", 0.5),
            ("marche1", "Run_Base", 0.1),
            ("marche2", "Run_Base", 0.32),
        ],
        "yaws": {"face": 0, "profil": 270},
        "recadrer": "complet",
    },
]


def recadrer_au_sol(chemins, mode):
    """Aligne les frames au sol dans un canvas commun.
    - 'complet' : recadre sur le contenu, centre horizontalement
      (supprime tout mouvement de racine — pour le doughcat).
    - 'vertical' : ne recadre qu'en hauteur, garde la position
      horizontale du cadrage commun (préserve l'élan de l'attaque)."""
    imgs = [Image.open(c).convert("RGBA") for c in chemins]
    boites = [i.getbbox() for i in imgs]
    for chemin, boite in zip(chemins, boites):
        if boite is None:
            raise RuntimeError(f"frame entièrement vide : {chemin}")
    h = max(b[3] - b[1] for b in boites)
    if mode == 'complet':
        w = max(b[2] - b[0] for b in boites)
    else:
        w = imgs[0].width
    for img, boite, chemin in zip(imgs, boites, chemins):
        if mode == 'complet':
            contenu = img.crop(boite)
            x = (w - contenu.width) // 2
        else:
            contenu = img.crop((0, boite[1], img.width, boite[3]))
            x = 0
        sortie = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sortie.paste(contenu, (x, h - contenu.height), contenu)
        sortie.save(chemin)


def post_traiter(img):
    """Alpha net + contour sombre 1px, pour coller au style pixel art."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255 if a >= 128 else 0)
    contour = (74, 53, 72, 255)  # #4a3548 comme le reste du jeu
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


serveur = subprocess.Popen(
    [sys.executable, "-m", "http.server", "8123"], cwd=DIR,
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
time.sleep(1.5)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for modele in MODELES:
            page = browser.new_page()
            page.on("pageerror", lambda e: print("PAGEERROR:", e))
            page.goto(f"http://localhost:8123/render.html?glb={modele['glb']}")
            page.wait_for_function("window.pret === true", timeout=60000)

            ratio = page.evaluate(
                "a => window.calibrerUnion(a.frames, a.yaws, 12)",
                {
                    "frames": [{"clip": c, "temps": t} for _, c, t in modele["frames"]],
                    "yaws": list(modele["yaws"].values()),
                },
            )
            hauteur = modele["hauteur"]
            largeur = int(hauteur * ratio + 0.999)
            print(f"{modele['prefixe']}: ratio {ratio:.3f} -> rendu {largeur}x{hauteur}")

            fichiers = []
            for nom_yaw, yaw in modele["yaws"].items():
                for nom, clip, t in modele["frames"]:
                    data = page.evaluate(
                        "o => window.rendre(o)",
                        {"largeur": largeur, "hauteur": hauteur, "yaw": yaw, "pitch": 12,
                         "clip": clip, "temps": t},
                    )
                    img = Image.open(io.BytesIO(base64.b64decode(data.split(",")[1])))
                    chemin = os.path.join(DIR, f"{modele['prefixe']}_{nom_yaw}_{nom}.png")
                    post_traiter(img).save(chemin)
                    fichiers.append(chemin)
            page.close()

            if modele.get("recadrer"):
                recadrer_au_sol(fichiers, modele["recadrer"])

            # planche de controle en x2
            images = [Image.open(f) for f in fichiers]
            images = [i.resize((i.width * 2, i.height * 2), Image.NEAREST) for i in images]
            lignes = len(modele["yaws"])
            par_ligne = len(modele["frames"])
            cw, ch = images[0].width + 10, images[0].height + 10
            planche = Image.new("RGBA", (par_ligne * cw + 10, lignes * ch + 10), (60, 90, 60, 255))
            for i, img in enumerate(images):
                planche.paste(img, (10 + (i % par_ligne) * cw, 10 + (i // par_ligne) * ch), img)
            planche.save(os.path.join(DIR, f"planche_{modele['prefixe']}.png"))
        browser.close()
    print("OK")
finally:
    serveur.terminate()
