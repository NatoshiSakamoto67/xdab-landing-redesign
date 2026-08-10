# Bildsprache XDAB

**Stand 10.08.2026** · Umsetzung von Punkt 4 des Redesign-Konzepts vom 05.08.

Das Konzept nennt die Festlegung der Bildsprache den „wichtigsten Punkt" — wichtiger als
die Wahl des Generators. Genau die steht hier. Die Motive selbst sind **noch nicht erzeugt**:
Gemini meldet `prepayment credits are depleted`, Higgsfield antwortet nicht. Sobald eines der
beiden Konten wieder Guthaben hat, erzeugt `bilder-erzeugen.sh` alle Motive in einem Durchlauf.

## Der gemeinsame Stil-Prompt

Er steht in `stil.txt` und wird **jedem** Motiv vorangestellt. Nur so sieht die Serie nach
einer Handschrift aus statt nach Stock-Material:

> Dark, meticulously ordered still life photograph. Near-black ink background (#0f0f11).
> Only muted petrol-teal and desaturated brass accents — no other colours whatsoever.
> Strictly frontal, centred composition. Subject is technical hardware and objects —
> never people, never faces, never hands.
> One soft directional light from the left, deep falling shadows, fine film grain, subtle vignette.
> Photographic realism, medium-format look, shallow depth of field.
> Absolutely no text, no lettering, no logos, no screens, no user interface, no cartoon,
> no 3D-render or CGI look. Editorial, serious, restrained, expensive.

Die Regeln dahinter, damit auch spätere Motive passen:

| Regel | Warum |
|---|---|
| Tinte als Grund, Petrol + Messing als einzige Akzente | Bindet an `--bg`, `--mint` und die Messing-Note der Marke |
| Keine Gesichter, keine Hände | Menschenbilder kippen sofort ins Stock-Hafte |
| Keine Bildschirme, keine Oberflächen | Echte Screenshots übernehmen diese Aufgabe — die Bilder sind Atmosphäre, kein Beweis |
| Kein Text im Bild | Generatoren setzen Schrift unzuverlässig; Text kommt aus dem HTML |
| Streng frontal oder sauber isometrisch | Ruhe statt Dynamik — passt zur Operations-Ästhetik |
| Feines Filmkorn | Nimmt den digitalen Plastik-Look |

## Die Motive

| # | Slot | Motiv | Format | Status |
|---|---|---|---|---|
| 1 | Angebots-Karte 01 · KI-Plattform | Matte Serverschrank-Tür, einen Spalt offen, dünnes Petrol-Licht dringt heraus | 4:3 | offen |
| 2 | Angebots-Karte 02 · Webseiten | Zeichentisch von direkt oben, leere technische Blätter, Messing-Lineal | 4:3 | offen |
| 3 | Angebots-Karte 03 · Betrieb | Reihe identischer dunkler Server-Einschübe, eine Statusleuchte in Petrol | 4:3 | offen |
| 4 | Souveränität / EU | Schwere Stahl-Tresortür, geschlossen, Petrol-Lichtnaht entlang der Kante | 16:9 | offen |
| 5 | Über uns | Verlassenes Schaltpult mit Kippschaltern, Messing-Details | 16:9 | offen |
| 6 | Aktenwerk (Reserve) | Archivschrank mit halb geöffneter Schublade, Hängeregistratur | 4:3 | offen |
| 7 | **og:image** | — | 1200×630 | **fertig** |

Motiv 7 ist bewusst **nicht** KI-erzeugt: Ein Vorschaubild lebt von scharfer Typografie, und
genau die setzen Bildgeneratoren unzuverlässig. Es wird stattdessen aus dem eigenen
Design-System gerendert (`assets/og-image.png`), inklusive der Netzgraph-Formensprache aus
den Sektions-Hintergründen. Dadurch stimmt es garantiert mit der Marke überein.

## Einbau nach der Erzeugung

1. `bilder-erzeugen.sh` laufen lassen → PNGs in `assets/roh/`
2. Nach AVIF **und** WebP wandeln, je in 640 / 1280 / 1920 px Breite
3. Mit `srcset` einbinden, `width`/`height` immer setzen (sonst Layoutsprung)
4. Nur das Hero-Motiv `fetchpriority="high"`, alle anderen `loading="lazy"`

Die Bilder sind Atmosphäre. Die Beweislast trägt weiterhin der echte Screenshot.
