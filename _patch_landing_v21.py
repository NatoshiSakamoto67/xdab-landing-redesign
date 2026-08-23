# -*- coding: utf-8 -*-
"""v21 — Sprachstil: Gedankenstriche raus, Saetze auf den Punkt.

Davids Vorgabe 23.08.: kein einziger Gedankenstrich im sichtbaren Text,
kuerzere Saetze, merkfaehig. Bindestriche IN Woertern (DSGVO-konform,
E-Mails) bleiben selbstverstaendlich.

Regel je Fundstelle (" &mdash; " bzw. " — "):
- naechstes Wort beginnt GROSS  -> Satzpunkt (". ")   [neuer Satz]
- naechstes Wort beginnt klein  -> Komma (", ")       [Einschub]
<style>-Bloecke werden nicht angefasst (CSS nutzt keine Gedankenstriche,
aber sicher ist sicher)."""
import io
import re
import sys

PFAD = "index.html"
GROSS = "A-ZÄÖÜ"

with io.open(PFAD, encoding="utf-8") as f:
    html = f.read()

# Handarbeit zuerst: die Marken-Zeilen.
hand = [
    ("Proaktive KI, die für Sie arbeitet &mdash; DSGVO&#8209;konform aus Deutschland.",
     "Proaktive KI, die für Sie arbeitet. DSGVO&#8209;konform. Aus Deutschland."),
    ("<title>XDAB — DSGVO-konforme KI für den Mittelstand</title>",
     "<title>XDAB · DSGVO-konforme KI für den Mittelstand</title>"),
    ('content="XDAB — KI nutzen ohne DSGVO-Risiko"',
     'content="XDAB · KI nutzen ohne DSGVO-Risiko"'),
    ('content="XDAB — DSGVO-konforme KI für den Mittelstand"',
     'content="XDAB · DSGVO-konforme KI für den Mittelstand"'),
]
for alt, neu in hand:
    if alt in html:
        html = html.replace(alt, neu)

# Mechanik: ausserhalb von <style>-Bloecken ersetzen.
teile = re.split(r"(<style[^>]*>.*?</style>)", html, flags=re.S)

def ersetze(text):
    def einer(m):
        rest = m.group("rest")
        return (". " if re.match("[%s]" % GROSS, rest) else ", ") + rest
    # &mdash; und echtes — inklusive umgebender Leerzeichen/Zeilenumbrueche
    text = re.sub(r"\s*&mdash;\s*(?P<rest>\S)", einer, text)
    text = re.sub(r"\s*—\s*(?P<rest>\S)", einer, text)
    return text

for i, teil in enumerate(teile):
    if not teil.startswith("<style"):
        teile[i] = ersetze(teil)

html = "".join(teile)

rest_md = html.count("&mdash;")
rest_em = len(re.findall("—", html))
with io.open(PFAD, "w", encoding="utf-8", newline="") as f:
    f.write(html)
print("Fertig. Verbleibende &mdash;: %d, verbleibende —: %d" % (rest_md, rest_em))
sys.exit(0)
