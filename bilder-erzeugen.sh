#!/usr/bin/env bash
# Erzeugt alle Motive der XDAB-Bildsprache in einem Durchlauf.
# Voraussetzung: GEMINI_API_KEY in ~/.env und Guthaben auf dem Konto.
# Siehe BILDSPRACHE.md fuer die Begruendung der Motive.
set -euo pipefail
cd "$(dirname "$0")"
STIL="$(cat stil.txt)"
ZIEL="assets/roh"; mkdir -p "$ZIEL"
export SSL_CERT_FILE="${SSL_CERT_FILE:-$(python3 -c 'import certifi;print(certifi.where())' 2>/dev/null || echo /etc/ssl/cert.pem)}"
GEN=~/.claude/skills/nano-banana/scripts/generate.py

erzeuge(){ # $1 Dateiname  $2 Format  $3 Motiv
  echo "→ $1"
  python3 "$GEN" "$STIL SUBJECT: $3" --aspect "$2" --resolution 2K --output "$ZIEL/$1.png"
}

erzeuge karte-01-plattform 4:3 "a matte dark server rack door standing slightly ajar, a thin blade of petrol-teal light escaping from the gap. Nothing else in frame."
erzeuge karte-02-web       4:3 "an architect's drafting table seen from directly overhead, blank technical drawing sheets neatly squared, a single brass ruler resting across them."
erzeuge karte-03-betrieb   4:3 "a row of identical dark server units seated in a rack, exactly one small petrol-teal status light lit among them."
erzeuge souveraenitaet    16:9 "a single heavy steel vault door, closed, set flush into a dark wall, a thin seam of petrol-teal light tracing its edge. Nothing else in frame."
erzeuge ueber-uns         16:9 "a disused control desk with rows of toggle switches and brass detailing, seen straight on, unlit and quiet."
erzeuge aktenwerk          4:3 "a dark steel archive cabinet with one drawer half open, suspension files inside, brass handle catching the light."

echo
echo "fertig. Naechster Schritt laut BILDSPRACHE.md: nach AVIF/WebP wandeln (640/1280/1920) und mit srcset einbinden."
