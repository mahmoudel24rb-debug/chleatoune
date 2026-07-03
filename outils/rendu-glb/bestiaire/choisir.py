# Applique les regles de choix de clips et ecrit choix.json
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(DIR, "clips.json"), encoding="utf-8") as f:
    donnees = json.load(f)


def choisir(clips):
    noms = [c["name"] for c in clips]
    bas = {n: n.lower() for n in noms}

    def exact(voulu):
        for n in noms:
            if bas[n] == voulu.lower():
                return n
        return None

    def contenant(frag, exclure=()):
        for n in noms:
            if frag in bas[n] and not any(e in bas[n] for e in exclure):
                return n
        return None

    idle = exact("Idle_Base") or contenant("idle", exclure=("idle_in",))
    course = exact("Run_Base") or exact("Run") or contenant("run", exclure=("haste",))
    attaque = None
    for pref in ("Attack1", "Attack01", "Spell1", "Cast_Animation", "Cast_Cycle"):
        attaque = exact(pref)
        if attaque:
            break
    if not attaque:
        attaque = contenant("attack")
    duree = {c["name"]: c["duration"] for c in clips}
    return idle, course, attaque, duree


choix = {}
for glb, clips in sorted(donnees.items()):
    if not isinstance(clips, list):
        print(glb, "ERREUR:", clips)
        continue
    idle, course, attaque, duree = choisir(clips)
    choix[glb] = {
        "idle": idle, "course": course, "attaque": attaque,
        "durees": {n: duree[n] for n in (idle, course, attaque) if n},
    }
    manque = [k for k, v in (("idle", idle), ("course", course), ("attaque", attaque)) if not v]
    print(f"{glb:22s} idle={idle!r:20} course={course!r:16} attaque={attaque!r}"
          + (f"  MANQUE={manque}" if manque else ""))

with open(os.path.join(DIR, "choix.json"), "w", encoding="utf-8") as f:
    json.dump(choix, f, ensure_ascii=False, indent=1)
