#!/usr/bin/env python3
"""Prueft, ob jede in index.html referenzierte Bilddatei wirklich existiert.

Noetig, weil ein Test ueber file:// keine HTTP-Fehlercodes liefert: ein fehlendes
Bild faellt dort still auf den Alt-Text zurueck statt einen 404 zu melden.
"""
import pathlib, re, sys

WURZEL = pathlib.Path(__file__).resolve().parent
html = (WURZEL / "index.html").read_text(encoding="utf-8")

pfade: set[str] = set()
for treffer in re.findall(r'\bsrc="([^"]+\.(?:webp|png|jpe?g|avif|svg))"', html):
    pfade.add(treffer)
for satz in re.findall(r'\bsrcset="([^"]+)"', html):
    for teil in satz.split(","):
        if kandidat := teil.strip().split(" ")[0]:
            pfade.add(kandidat)
for treffer in re.findall(r'\bhref="([^"]+\.(?:svg|png|ico))"', html):
    pfade.add(treffer)

fehlend = sorted(p for p in pfade if not (WURZEL / p.lstrip("/")).exists())
for p in sorted(pfade):
    if p not in fehlend:
        print(f"  ✓ {p}")
if fehlend:
    print("\nFEHLEND:", file=sys.stderr)
    for p in fehlend:
        print(f"  ✗ {p}", file=sys.stderr)
    sys.exit(1)
print(f"\n{len(pfade)} referenzierte Dateien, alle vorhanden.")
