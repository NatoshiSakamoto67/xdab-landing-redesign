#!/usr/bin/env python3
"""Wandelt die Rohbilder aus assets/roh in ausspielfertige WebP-Groessen.

Erzeugt je Motiv 640/1280/1920 px Breite als WebP. AVIF bleibt aussen vor,
solange avifenc auf dem Rechner fehlt -- WebP deckt alle Zielbrowser ab.

    python3 bilder_aufbereiten.py
"""
import pathlib, subprocess, sys

WURZEL = pathlib.Path(__file__).resolve().parent
ROH = WURZEL / "assets" / "roh"
ZIEL = WURZEL / "assets" / "bild"
BREITEN = (640, 1280, 1920)
GUETE = "82"


def main() -> None:
    if not ROH.exists():
        sys.exit(f"Fehler: {ROH} fehlt -- erst bilder_openai.py laufen lassen")
    if not subprocess.run(["which", "cwebp"], capture_output=True).stdout:
        sys.exit("Fehler: cwebp nicht gefunden (brew install webp)")
    ZIEL.mkdir(parents=True, exist_ok=True)

    from PIL import Image
    gesamt = 0
    for quelle in sorted(ROH.glob("*.png")):
        with Image.open(quelle) as bild:
            ob, oh = bild.size
        for breite in BREITEN:
            if breite > ob:                     # nie hochrechnen
                continue
            ausgabe = ZIEL / f"{quelle.stem}-{breite}.webp"
            subprocess.run(
                ["cwebp", "-quiet", "-q", GUETE, "-resize", str(breite), "0",
                 str(quelle), "-o", str(ausgabe)], check=True)
            gesamt += 1
            print(f"  ✓ {ausgabe.name:34} {ausgabe.stat().st_size/1024:6.0f} KB")
        print(f"    ({quelle.name}: Original {ob}x{oh}, {quelle.stat().st_size/1024:.0f} KB)")
    print(f"\n{gesamt} Dateien in {ZIEL.relative_to(WURZEL)}.")


if __name__ == "__main__":
    main()
