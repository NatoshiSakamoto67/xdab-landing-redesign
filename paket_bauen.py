#!/usr/bin/env python3
"""Stellt aus index.html und den wirklich referenzierten Dateien ein Ausspiel-Paket zusammen.

Nimmt bewusst nicht das ganze assets-Verzeichnis: dort liegen auch Rohdaten und
Altbestaende, die auf dem Server nichts verloren haben.
"""
import pathlib, re, shutil, sys

WURZEL = pathlib.Path(__file__).resolve().parent
ZIEL = WURZEL / "paket"
html = (WURZEL / "index.html").read_text(encoding="utf-8")

pfade: set[str] = set()
for t in re.findall(r'\bsrc="([^"]+\.(?:webp|png|jpe?g|svg))"', html): pfade.add(t)
for t in re.findall(r'\bdata-gross="([^"]+)"', html): pfade.add(t)
for satz in re.findall(r'\bsrcset="([^"]+)"', html):
    for teil in satz.split(","):
        if k := teil.strip().split(" ")[0]: pfade.add(k)
for t in re.findall(r'\bhref="([^"]+\.(?:svg|png|ico))"', html): pfade.add(t)
# Anfuehrungszeichen beider Sorten -- @font-face nutzt einfache, das Hintergrundbild doppelte.
# Ohne das fehlten drei von vier Schriftdateien im Paket und die Seite waere live
# auf Systemschriften zurueckgefallen.
for t in re.findall(r'url\([\'"]?([^\'")]+\.(?:webp|woff2|png))[\'"]?\)', html): pfade.add(t)
for t in re.findall(r'\bhref="(assets/fonts/[^"]+)"', html): pfade.add(t)

if ZIEL.exists(): shutil.rmtree(ZIEL)
ZIEL.mkdir()
shutil.copy2(WURZEL / "index.html", ZIEL / "index.html")

fehlend, kopiert, bytes_ = [], 0, 0
for p in sorted(pfade):
    quelle = WURZEL / p.lstrip("/")
    if not quelle.exists():
        fehlend.append(p); continue
    ziel = ZIEL / p.lstrip("/")
    ziel.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(quelle, ziel)
    kopiert += 1; bytes_ += quelle.stat().st_size

if fehlend:
    print("FEHLENDE DATEIEN:", *fehlend, sep="\n  ", file=sys.stderr); sys.exit(1)
gesamt = bytes_ + (WURZEL / "index.html").stat().st_size
print(f"Paket in {ZIEL.name}/ — index.html + {kopiert} Dateien, zusammen {gesamt/1024:.0f} KB")
