#!/usr/bin/env python3
"""Erzeugt die Motive der XDAB-Bildsprache ueber OpenAIs Bildmodell.

Gegenstueck zu bilder-erzeugen.sh (Gemini/nano-banana). Nur Standardbibliothek.
Der gemeinsame Stil-Prompt steht in stil.txt und wird jedem Motiv vorangestellt --
siehe BILDSPRACHE.md fuer die Begruendung.

    python3 bilder_openai.py            # alle Motive
    python3 bilder_openai.py souveraenitaet   # nur eines
"""
import base64, json, os, pathlib, sys, urllib.request, urllib.error

WURZEL = pathlib.Path(__file__).resolve().parent
ZIEL = WURZEL / "assets" / "roh"
MODELLE = ("gpt-image-2", "gpt-image-1.5", "gpt-image-1")

# Motiv -> (Groesse, Beschreibung). Quer = 1536x1024, hoch/quadratisch = 1024x1024.
MOTIVE = {
    "karte-01-plattform": ("1536x1024",
        "brushed dark steel, a single hairline seam of petrol-teal light running "
        "diagonally across the grain."),
    "karte-02-web": ("1536x1024",
        "the stacked edges of many sheets of dark paper, one thin brass filament "
        "laid across them, everything else falling into shadow."),
    "karte-03-betrieb": ("1536x1024",
        "a dark perforated metal mesh in extreme close-up, exactly one aperture "
        "lit from behind in petrol-teal."),
    "souveraenitaet": ("1536x1024",
        "the machined joint where two heavy dark metal plates meet, a thin line of "
        "petrol-teal light escaping the seam between them."),
    "ueber-uns": ("1536x1024",
        "dark woven linen at grazing light, a single brass fibre catching the "
        "light among the weave."),
    "aktenwerk": ("1536x1024",
        "the cut edges of densely stacked dark card stock, raking light picking out "
        "the layers, one edge faintly teal."),
}


def schluessel() -> str:
    if k := os.environ.get("OPENAI_API_KEY"):
        return k
    for ort in (WURZEL / ".env", pathlib.Path.home() / ".env"):
        if not ort.exists():
            continue
        for zeile in ort.read_text(encoding="utf-8").splitlines():
            if zeile.startswith("OPENAI_API_KEY") and "=" in zeile:
                return zeile.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("Fehler: OPENAI_API_KEY weder in der Umgebung noch in ./.env oder ~/.env")


def anfragen(modell: str, prompt: str, groesse: str, key: str) -> bytes:
    last: Exception | None = None
    nutzlast = json.dumps({
        "model": modell, "prompt": prompt, "n": 1,
        "size": groesse, "quality": "high",
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations", data=nutzlast,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as antwort:
        daten = json.load(antwort)
    eintrag = daten["data"][0]
    if "b64_json" in eintrag:
        return base64.b64decode(eintrag["b64_json"])
    with urllib.request.urlopen(eintrag["url"], timeout=120) as bild:   # aeltere Modelle
        return bild.read()


def main() -> None:
    key = schluessel()
    stil = (WURZEL / "stil.txt").read_text(encoding="utf-8").strip()
    ZIEL.mkdir(parents=True, exist_ok=True)
    gewuenscht = sys.argv[1:] or list(MOTIVE)
    modell = None

    for name in gewuenscht:
        if name not in MOTIVE:
            print(f"  ? unbekanntes Motiv: {name}", file=sys.stderr)
            continue
        groesse, beschreibung = MOTIVE[name]
        prompt = f"{stil}\n\nSUBJECT: {beschreibung}"
        for kandidat in ([modell] if modell else MODELLE):
            try:
                rohdaten = anfragen(kandidat, prompt, groesse, key)
            except urllib.error.HTTPError as fehler:
                text = fehler.read().decode("utf-8", "replace")[:400]
                if fehler.code in (400, 404) and modell is None:
                    print(f"  – {kandidat} nicht nutzbar, naechstes Modell")
                    continue
                sys.exit(f"Fehler HTTP {fehler.code} bei {name}:\n{text}")
            modell = kandidat
            pfad = ZIEL / f"{name}.png"
            pfad.write_bytes(rohdaten)
            print(f"  ✓ {name:22} {groesse:9} {len(rohdaten)/1024:6.0f} KB  ({kandidat})")
            break
        else:
            sys.exit(f"Fehler: kein nutzbares Bildmodell für {name}")

    print(f"\nfertig in {ZIEL.relative_to(WURZEL)}. Nächster Schritt laut BILDSPRACHE.md: "
          "nach AVIF/WebP wandeln (640/1280/1920) und mit srcset einbinden.")


if __name__ == "__main__":
    main()
