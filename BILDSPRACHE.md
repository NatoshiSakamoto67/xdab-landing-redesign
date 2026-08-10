# Bildsprache XDAB

**Stand 11.08.2026** · ersetzt die Fassung vom 10.08.

## Die Entscheidung: keine dekorativen Bilder

Der erste Versuch waren sechs erzeugte Motive — Tresortür für Souveränität,
Zeichentisch für Webentwicklung, Serverschrank für die Plattform. Das war
Metaphern-Denken von der Stange. Der zweite Versuch ersetzte sie durch abstrakte
Materialstudien (gebürsteter Stahl, Schnittkanten, Gewebe). Besser, aber die
eigentliche Frage blieb unbeantwortet: **Wozu?**

Ein Bild, das weder etwas belegt noch etwas bedient, ist Füllmaterial. Damit
fällt es unter dieselbe Hausregel wie ein Kasten ohne Funktion. Deshalb tragen
jetzt drei Dinge die Bildebene — und sonst nichts:

| Ebene | Was | Warum sie bleibt |
|---|---|---|
| **Produkt-Screenshots** | echte Bildschirmaufnahmen des Workspace | Sie sind der Beweis. Ohne sie ist die Seite Behauptung. |
| **Höhenlinienfeld** | ein großes Hintergrundbild, 3840×2160 | Trägt den Hero, ohne mit Inhalt zu konkurrieren. |
| **Sektions-Animationen** | vier Canvas-Varianten | Atmosphäre in Bewegung, kein Standbild. |

## Das Höhenlinienfeld

Echt in **3840×2160 gerendert**, nicht hochgerechnet — deshalb auch auf 5K-Bildschirmen
scharf. Erzeugt durch `verify/hintergrund-rendern.cjs`: gesätes Gitterrauschen mit weicher
Interpolation, daraus Iso-Linien in 21 Bändern. Jede Linie hat einen scharfen Kern und
eine weite Glut — nur diese Kombination wirkt bei 4K scharf statt bloß weich leuchtend.

Dateigrößen: **244 KB** für 4K, **79 KB** für 1920. Dunkle Flächen komprimieren
außerordentlich gut. `image-set()` liefert die kleine Fassung an einfache Bildschirme.

Warum Topografie: Sie ist die geospatiale Handschrift, aus der die Operations-Ästhetik
kommt — und sie ist gegenstandslos. Kein Symbol, das man falsch verstehen kann.

## Screenshots: lesbar, weil vergrößerbar

Vorher wurden Aufnahmen mit 2880×1800 in Kacheln von 348–477 px gepresst — eine
6- bis 8-fache Verkleinerung, in der nichts zu entziffern war, ohne jede Möglichkeit
zu vergrößern. Jetzt:

1. Im Fluss liegt eine **720-px-Vorschau** (259 KB für alle 13 statt 1,0 MB).
2. Ein Klick öffnet die **volle Auflösung** im Vollbild, mit Bildunterschrift.
3. Bedienbar mit Maus, Tastatur (Enter/Escape) und Screenreader.

Damit folgt das Bild zugleich der Design-Regel: Was wie ein Bedienelement aussieht,
ist eines.

## Falls doch wieder erzeugte Bilder gebraucht werden

`bilder_openai.py` (gpt-image-2) und `bilder-erzeugen.sh` (Gemini) bleiben im Repo,
samt Stil-Prompt in `stil.txt`. Die Regel dazu: Ein erzeugtes Bild kommt nur auf die
Seite, wenn es eine Frage beantwortet, die Text nicht beantworten kann.
