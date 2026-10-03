# CLAUDE.md — Gusto

Diese Datei ist verbindlich. Bei Widersprüchen zwischen dieser Datei und
einer einzelnen Anweisung im Chat gilt die Anweisung im Chat — sag aber
dazu, dass sie von hier abweicht.

---

## 1. Qualitätslatte (wichtigster Abschnitt)

Gusto ist ein Konsumprodukt, das sich gegen App-Store-Konkurrenz behaupten
muss. Technisch korrekt reicht nicht. Jede Änderung wird daran gemessen, ob
sie die App schöner, einfacher und begehrenswerter macht.

- Wenn eine Umsetzung funktioniert, sich aber billig oder generisch anfühlt,
  ist sie nicht fertig. Sag das aktiv, statt sie abzuliefern.
- Die App soll sich anfühlen wie eine native iOS-App, nicht wie eine Website
  in einem Rahmen. Orientierung: Apples Human Interface Guidelines — Gesten,
  Physik, Timing, Haptik, sichere Bereiche, Übergänge. Kein Web-Standard-
  verhalten dort, wo iOS eine eigene Erwartung hat.
- Jede Interaktion braucht eine Antwort: Berührung, Bewegung, Zustands-
  wechsel. Nichts darf sich tot anfühlen.
- Jeder Screen ist potenzielles Screenshot- und Videomaterial für TikTok und
  Instagram. Im Zweifel: würde man das herzeigen wollen?
- Wenn dir eine deutlich bessere Lösung einfällt als die beauftragte: sag es,
  bevor du meine Variante umsetzt.

---

## 2. Zusammenarbeit

- Gregor programmiert nicht und lernt es nicht. Er baut per Vibe-Coding und
  entscheidet auf Produkt-, Marken- und Designebene.
- Antworten auf Deutsch. Keine Erklärungen von Fachbegriffen, kein Tutor-
  Modus, keine Verständnisfragen — es sei denn, er fragt danach.
- Überschaubare Änderungen direkt umsetzen. Bei größeren oder riskanten
  Aufgaben erst den Plan zeigen.
- Supabase-Migrationen: SQL vorbereiten, Gregor führt sie selbst im SQL
  Editor aus.
- Xcode-Aufgaben mit Account-Authentifizierung (z. B. Signing-Team) macht
  Gregor selbst in der GUI.
- Nach jedem getesteten und bestätigten Feature committen, bevor das nächste
  beginnt.
- Screenshot-Regel: Screenshots kommen nur, wenn in der Eingabezeile nichts
  steht, was Gregor abgeschickt hat. Sichtbarer Text in der Eingabezeile ist
  immer eine Auto-Vervollständigung, nie etwas Abgeschicktes — daraus nie
  ableiten, ein Schritt laufe bereits oder sei bestätigt.

---

## 3. Verifikation

- Änderungen an Gesten, Scroll, Overlays, Tastatur oder allem Touch-Nahen
  gelten erst als fertig, wenn sie auf Gregors echtem iPhone bestätigt sind.
  Chromium/Playwright reichen dort nicht — WebKit verhält sich anders.
- Nach jeder Änderung `npm run build && npx cap sync ios`, dann in Xcode neu
  installieren. Ohne das testet Gregor unbemerkt einen alten Bundle-Stand.
  `npx cap sync ios` kompiliert **kein** Swift — nativer Code braucht einen
  echten Xcode-Rebuild.
- Jede Meldung "bereit für den Gerätetest" enthält ausdrücklich den Nachweis,
  dass `npm run build` und `npx cap sync ios` gelaufen sind UND dass der neue
  Stand tatsächlich in `ios/App/App/public` liegt (z. B. Zeitstempel- oder
  Byte-Vergleich zwischen `dist/` und `ios/App/App/public/`, oder ein
  eindeutiges Code-Merkmal der Änderung im dortigen Bundle suchen). Ohne
  diesen Nachweis ist ein Gerätetest nicht aussagekräftig — einmal fehlte der
  Sync, Gregor hat unbemerkt einen alten Stand getestet.
- Playwright-Tests immer bei 375×812 **und** 375×700 laufen lassen. Overlay-
  und Wizard-Bugs sind nur bei schmalen Viewports reproduzierbar.
- Gregors Testgerät ist 430 pt breit (iPhone Pro Max, Screenshot-Auflösung
  1290 px bei 3x). Layout-/Zentrierungs-Änderungen zusätzlich bei 430 pt
  Breite prüfen (z. B. 430×932), nicht nur bei 375/393 — auf breiten Geräten
  können sich Aspect-Ratio- plus max-height-Kombinationen anders verhalten
  als auf schmalen (siehe Bugfix-Historie RezeptSchwipKarte.jsx: Karte war
  bei 430 pt Breite 11 pt nach links versetzt, bei 375/393 unauffällig).
- Lokal ist neben Chromium auch WebKit installiert (devDependency). Für alles,
  was Flex, aspect-ratio, backdrop-filter oder Scroll betrifft: dort
  gegenprüfen, nicht nur in Chromium.
- **Kein automatisierter Test greift live auf Supabase zu** (Regel, ab
  03.10.2026 — auch mit Pro-Plan und Ausgabenbremse). Das Egress-Kontingent
  wurde schon zweimal gesprengt (zuletzt 70 GB bei 5 GB Limit, davon 47,9 GB
  am Tag der Dark-Mode-Pixelvergleiche: jeder frische Browser lud alle
  Rezeptbilder). Daten kommen aus dem Schnappschuss
  (`scripts/testdaten/app-rezepte-schnappschuss.json`), Bilder sind
  Platzhalter. Jedes Browser-Skript ruft direkt nach `newContext()` und vor
  dem ersten `goto()` `supabaseOfflineEinrichten(kontext)` aus
  `scripts/hilfen/offline-supabase.mjs` auf (REST → Schnappschuss, Storage →
  1×1-PNG, alles andere leer). Neue Skripte folgen derselben Regel;
  Logik-Skripte (`pruefe:stueck`, `test:budget`) lesen nur die
  Schnappschuss-Dateien. **Einzige Ausnahme:** `npm run schnappschuss`
  (erzeugt die Schnappschüsse, genau zwei Daten-Anfragen, keine Bilder) —
  nach jedem Rezepte-Paket oder jeder Mengenänderung von Hand laufen lassen.
  Hinweis: Pixelvergleiche (`screens-erfassen`/`-vergleichen`) laufen jetzt
  mit Platzhalterbildern — die Referenz muss einmalig mit demselben Stand neu
  erfasst werden, alte Referenzen mit echten Fotos sind nicht vergleichbar.
- Bereits behobene und bestätigte Bugs sind ein Vertrag. Wenn eine Änderung
  ein altes Verhalten brechen könnte — besonders bei nativen oder Touch-
  Eingriffen — vorher nennen und danach gegenprüfen.

---

## 4. Arbeitsweise bei hartnäckigen Bugs

- Ursache beweisen, nicht vermuten: messen (`getBoundingClientRect`, Logs),
  bevor gefixt wird.
- Wenn zwei Fix-Runden am selben Symptom scheitern, ist die Hypothese falsch,
  nicht die Umsetzung. Dann die Ebene wechseln (CSS → nativ) statt weiter zu
  variieren.
- Beim Testen echte Nutzungsbedingungen nachstellen, nicht die schonendste
  Variante. Ein kurzer Tap beweist nichts über eine kräftige Wischgeste.

**Bekannter erster Verdächtiger bei falsch positionierten `fixed`-Elementen:**
der `app-inhalt`-Wrapper (`motion.div` in `App.jsx`, umschließt die gesamte
Hauptansicht inkl. TabLeiste) bekommt beim Start-Einblenden ein `transform`
(y-Drift) und setzt es per `onAnimationComplete` bewusst wieder zurück, um
keinen Containing Block für `position: fixed`-Nachfahren zu erzeugen. Per
Messung (`getComputedStyle`) bestätigt: in **Chromium** bleibt danach ein
winziger Rest-Transform zurück (`matrix(1,0,0,1,0,~0.001)` statt `none`) —
in **WebKit-Desktop** nicht reproduzierbar. Das erzeugt potenziell trotzdem
einen Containing Block für alle `fixed`-Nachfahren (TabLeiste, `inset-0`-
Overlays wie KochModus/Kalorienrechner) — aktuell ohne sichtbare Auswirkung,
weil der Wrapper selbst nahezu die volle Viewport-Fläche einnimmt, aber ein
Verdächtiger, falls künftig irgendwo ein `fixed`-Element an falscher Stelle
landet. Nicht angefasst — Teil derselben rücksprachepflichtigen
Übergangs-Choreografie wie der Onboarding-Wizard (siehe Abschnitt 7,
"Bewusst nicht anfassen").

---

## 5. Design-Vertrag "Warm & natürlich"

Verbindliche Farb-Tokens (definiert in `src/index.css` via `@theme`):

| Token | Wert | Verwendung |
|---|---|---|
| `--color-bg` | `#F7F1E6` | Hintergrund (Cream) |
| `--color-card` | `#FFFDF8` | Karten |
| `--color-primary` | `#C9754A` | Terrakotta, primär |
| `--color-primary-dark` | `#A15E3B` | Terrakotta, abgedunkelt — für weißen Text/Badges auf Terrakotta-Fläche (reines `--color-primary` hat mit weißer Schrift zu wenig Kontrast, ~5:1 gegen Weiß) |
| `--color-secondary` | `#6B7A4A` | Olive, sekundär |
| `--color-text` | `#3E2E22` | Espresso, Text |
| `--color-text-muted` | `#8A6B4A` | Tan, Nebentext |

Schriften: `font-display` = Fraunces (500/600, Headlines), `font-sans` =
Inter (400/500, UI und Fließtext).

- Bei jeder visuellen Änderung ausschließlich diese Tokens und Fonts
  verwenden (`bg-primary`, `text-text-muted`, `font-display`), nie Tailwinds
  Standardpalette (`gray-*`, `blue-*`).
- Keine neuen Farben, Farbtöne oder Fonts ohne Rücksprache.
- Zentrales Auswahl-Element app-weit ist `AuswahlChip.jsx` (Keramik-Design:
  Einsink-Effekt statt Farbfüllung, durchgezogene Ränder). Neue Auswahl-
  Elemente nutzen ihn, statt eigene Varianten zu bauen.
- **Farb-Tokens statt Farbwerte (Regel, ab sofort):** Neue und umgebaute
  Screens verwenden ausschließlich Farb-Tokens — keine hart gesetzten
  Farbwerte (kein Hex, `rgb()`/`rgba()`, kein `white`/`black`, keine
  Tailwind-Standardpalette) — und werden in hellem UND dunklem Modus
  getestet. Der Neubau des Onboarding-Wizards folgt dieser Regel von
  Anfang an.
  Prüfung: `npm run pruefe:farben` (statisch, findet Hex/`rgb()`/`white`/
  Standardpalette sowie Token-Muster, die im Dunkeln kippen, z. B. `text-card`
  als Weiß, `bg-text/NN` als Abdunklung); Pixelvergleich des hellen Modus:
  `scripts/screens-erfassen.mjs` + `scripts/screens-vergleichen.mjs`.

### Dark Mode ("Terrakotta bleibt") — umgesetzt und am Gerät bestätigt (Schritte 1–4)

Aktivierung: folgt standardmäßig der iPhone-Einstellung, zusätzlich in den
Einstellungen ein Schalter "Darstellung: System / Hell / Dunkel" (eigener
localStorage-Key). **Der Onboarding-Wizard ist ausgeklammert** — er wird
später komplett neu gebaut und bleibt bis dahin im hellen Modus, auch wenn
das iPhone dunkel eingestellt ist.

**Umgesetzt (Schritt 2, Mechanik):** `src/theme.js` — `useDarstellung()`
liest/speichert `gusto-darstellung` (`system`/`hell`/`dunkel`), hört bei
`system` live auf `prefers-color-scheme` und setzt `data-theme` am
`<html>`. `index.html` enthält ein Inline-Skript mit **derselber** Logik,
damit `data-theme` vor dem ersten Paint steht (beide Stellen müssen
übereinstimmen, sonst blitzt beim Start kurz der falsche Modus auf).
`index.css` hat zusätzlich einen `[data-theme='light']`-Scope, der die
hellen Token-Werte erneut deklariert — `App.jsx` umschließt
`<OnboardingWizard>` damit in `<div data-theme="light" className="contents">`
(`display: contents`: keine Box, kein Transform, kein Layout-Einfluss,
Wizard-Choreografie unangetastet). Schalter "System/Hell/Dunkel" in
`EinstellungenAnsicht.jsx` über `SegmentSchalter`. `npm run
pruefe:farben` gleicht `@theme static`, `[data-theme='light']` und
`:root[data-theme='dark']` gegeneinander ab (jeder Token muss in allen
drei Sätzen vorkommen, hell und `[data-theme='light']` müssen exakt
übereinstimmen). Browser-Test: `npm run test:darstellung`.

Verbindliche dunkle Tokens (gleiche Token-Namen wie oben, andere Werte im
dunklen Modus):

| Token | Dunkel | Verwendung |
|---|---|---|
| Hintergrund (`--color-bg`) | `#1D1714` | warmes Dunkelbraun, bewusst kein Schwarz |
| Karte (`--color-card`) | `#2A211C` | Karten |
| Fläche | `#382D26` | Segment-Leiste, Tag-gesamt-Karte, Tabs |
| Fläche erhöht | `#45382F` | aktives Segment, aktiver Tab |
| Text (`--color-text`) | `#F3E9DA` | |
| Nebentext (`--color-text-muted`) | `#B7A188` | |
| Primär (`--color-primary`) | `#E0875A` | Terrakotta hell, bleibt Hauptfarbe |
| Sekundär (`--color-secondary`) | `#A4B27C` | Moosgrün hell |
| Rand | `rgba(243,233,218,0.10)` | |

Zusätzliche Tokens (freigegeben 28.09.2026; im Hellen sind die Werte so
gewählt, dass sich am bisherigen Aussehen nichts ändert). Werte mit "(Start)"
sind Startwerte, die in Schritt 4 am Gerät kalibriert werden:

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--color-on-primary` | `#FFFDF8` | `#1D1714` | Schrift/Icons auf Terrakotta-Flächen (`bg-primary`, `bg-primary-dark`) |
| `--color-on-secondary` | `#FFFDF8` | `#1D1714` | Schrift/Icons auf Olivflächen (`bg-secondary`) |
| `--color-surface` | Tan 15 % (`text-muted` transparent gemischt) | `#382D26` | Segment-Leiste, Tag-gesamt-Karte, Tabs |
| `--color-surface-raised` | `#FFFDF8` (= Karte) | `#45382F` | aktives Segment, aktiver Tab |
| `--color-border` | Tan 30 % | `rgba(243,233,218,0.10)` | feine Ränder |
| `--color-scrim` | `#3E2E22` | `#1D1714` (Start) | Abdunklungen: Foto-Balken, Sheet-/Dialog-Backdrops — nie `text` dafür nehmen (wird im Dunkeln hell) |
| `--color-on-photo` | `#FFFDF8` | `#FFFDF8` | konstant helle Schrift/Glanzlichter auf Fotos und Akzent-Glanzstreifen |
| `--color-shadow-base` | `#3E2E22` | `#0D0907` (Start) | Farbe aller Schatten — nie `text` dafür nehmen |
| `--color-shadow-einsink` | Espresso 35 % | `shadow-base` 60 % (Start) | Innenschatten des Keramik-Einsink-Effekts (`AuswahlChip`, Kalorienrechner) |

Im Dunkeln gilt außerdem `--color-primary-dark` = `#E0875A` (Akzentfläche mit
Beschriftung nutzt dort das normale Primär, Schrift `on-primary`).
Mode-Ausnahmen einzelner Klassen laufen über die Tailwind-Variante `dark:`
(Selektor `data-theme=dark`, im hell gezwungenen Wizard-Teilbaum wirkungslos).

Weitere Vorgaben:

- **Schrift auf Akzentflächen:** im hellen Modus weiße Zeichen auf
  Terrakotta-/Olivflächen, im dunklen Modus dunkle Zeichen (`#1D1714`) auf
  `#E0875A` bzw. `#A4B27C`. Dafür eigene, je Modus
  wechselnde Tokens (z. B. `--color-on-primary`, `--color-on-secondary`)
  statt hart gesetztem Weiß. Betrifft Übernehmen-Knopf, Badges, Primärknopf
  im Filter-Sheet u. a.
- Rezeptfotos bleiben unverändert; der dunkle Balken unter dem Titel wird
  im Dark Mode etwas kräftiger. Am Gerät bestätigt (29.09.2026): die Fotos
  blenden im Dunkeln nicht, keine zusätzliche Abdunklung nötig.
- Schatten im Dunkeln dunkler und weicher, nicht einfach invertiert.
- Alle Texte mindestens 4,5:1 Kontrast (Nachweis im Umsetzungsplan, wird
  beim Bau per Skript geprüft).
- Umsetzungsreihenfolge, Native-Anteil (Swift/Xcode-Rebuild) und Testplan
  standen im Chat-Plan vom 28.09.2026, seither freigegeben und umgesetzt
  (Schritte 1–4, siehe Abschnitt 8 für den nativen Teil). **Schritt 4
  (Feinschliff: Tab-Label/Toast im Dunkeln, Rezeptfotos am Gerät
  begutachten) ist damit abgeschlossen** — am Gerät bestätigt (29.09.2026):
  Wechsel auf "System" greift ohne Neustart, Tab-Label und Toast passen im
  Dunkeln, Rezeptfotos brauchen keine zusätzliche Abdunklung. Dabei
  gefunden und gefixt: der Ring um das Tag-Tab-Hinweis-Badge stand im
  Dunkeln in `--color-card` (dort fast Schwarz) und wirkte auf der
  helleren, transluzenten Tab-Leiste wie ein schwarzer Umriss statt wie
  ein "ausgestanztes" Badge — Fix nutzt im Dunkeln `--color-surface`
  (siehe `TabLeiste.jsx`, laut Tokentabelle oben ohnehin für „Tabs“
  vorgesehen). **Schritt 5 (Kontrastanhebung im Hellen) ist ebenfalls
  abgeschlossen und am Gerät bestätigt (29.09.2026, hell und dunkel).**
  Befund (28.09.2026) und Umsetzung:

  | Fall | Vorher | Nachher | Fix |
  |---|---|---|---|
  | Nebentext auf `--color-bg` | 4,36 | 4,50 | `--color-text-muted` `#8A6B4A` → `#876949` (nur hell) |
  | Terrakotta-Text (`text-primary`) auf Cream | 3,05 | 4,71 | echte Text-Stellen auf `text-primary-dark` umgestellt, Symbole bleiben `text-primary` (brauchen nur 3:1) |
  | Weiße Schrift auf `bg-primary` | 3,37 | 5,20 | Primärbuttons mit Text auf `bg-primary-dark` umgestellt (`--color-primary-dark` zugleich `#A15E3B` → `#9C5B39`, nur hell), Icon-Badges bleiben `bg-primary` |
  | Nebentext auf Segment-Leiste (`bg-surface`) | 3,65 | 4,58 | inaktives Segment-Label auf `text-text/75` (gedimmtes Espresso statt gedimmtes Tan — dieselbe Tönung liefert rechnerisch KEINEN Ausweg, siehe `SegmentSchalter.jsx`); im Dunkeln bewusst bei `text-text-muted` belassen (`dark:`-Override, war dort mit 5,39 bereits ok) |
  | Zusatzfund: inaktive Tab-Labels/-Symbole (`TabLeiste.jsx`) | hell 2,80 / dunkel 3,57–3,86 | hell 4,70 / dunkel 5,28–5,99 | `text-text/55` → `text-text/77`, EIN Wert für beide Modi (Gregor, 29.09.2026: meistgesehener Text der App, in beiden Modi nachziehen) |

  `--color-primary` selbst (Terrakotta als Fläche/Symbol) blieb
  unverändert, wie gefordert. Per Pixelvergleich (`screens-erfassen.mjs`
  --modus dunkel, vorher/nachher) nachgewiesen: im Dunkeln weicht NUR die
  Tab-Leiste ab (der bewusst mitgezogene Zusatzfund), alles andere ist
  pixelidentisch. Kein neuer Farbwert außerhalb der bestehenden Token
  (`primary-dark`, `text-muted`, `text`) — Aktiv-Icon in der TabLeiste
  lief ebenfalls auf `primary-dark` mit, weil Icon (hell) und Label
  (dunkler) direkt übereinander sonst zwei sichtbar verschiedene
  Terracotta-Töne zeigten (Gregor, 29.09.2026).

---

## 6. Stack und Code

- Vite + React (**JavaScript, kein TypeScript**), Tailwind, Supabase, Vercel,
  Capacitor (iOS).
- Repo `gregormorawek/gusto`, lokal `~/code/gusto`.
- Komplexität ist erlaubt und erwünscht, wenn sie echte Präzision liefert
  (z. B. Gleichungssysteme statt Näherung). Einfachheit ist kein Selbstzweck.
  Der Code muss aber über mehrere Sessions hinweg nachvollziehbar bleiben —
  bei komplexeren Berechnungen sind Kommentare und klare Struktur deshalb
  wichtiger, nicht weniger.

---

## 7. App-Architektur (Stand: Rezepte-Swipe-Pivot)

Der frühere Zutaten-Würfel mit Slot-Architektur wurde vollständig ersetzt.
Rezepte sind das alleinige Kernfeature.

**Tabs:** Rezepte → Tag → Einkaufsliste → Einstellungen.

- `RezepteSwipeAnsicht.jsx` + `RezeptSchwipKarte.jsx` — Vollbild-Foto-Karte
  mit Scrim, Kicker, Titel, Makro-Pillen, Wischgeste (links = neu würfeln,
  rechts = übernehmen), zwei runde Buttons mit identischer Logik, Deck-
  Illusion, Filter-Pille.
- `rezeptAusStapelZiehen()` + `alleAktivenMahlzeitenWuerfeln()` (beide in
  `rezepteFilter.js`) — Wiederholungsschutz-Stapel ("Shuffle-Bag") fürs
  Wischen: statt rein zufällig wird pro Mahlzeit UND Filterkombination
  (Diät + Süß/Deftig, Schlüssel via `filterSchluesselFuer()`) einmal die
  komplette Pool-Reihenfolge gemischt, jedes Rezept kommt genau einmal
  dran, erst danach wird neu gemischt (mit Garantie: erste Karte der
  neuen Runde ≠ letzte der alten). State `swipeStapel` in `App.jsx`,
  persistiert unter localStorage `gusto-swipe-stapel`, überlebt App-
  Neustarts bewusst OHNE Mitternachts-Reset (anders als `tagesauswahl`).
  Ändert sich der gefilterte Pool (z. B. neues Rezepte-Paket), wird der
  Stapel NICHT verworfen, sondern inkrementell abgeglichen: entfernte IDs
  fallen raus, neue IDs landen an zufälliger Position im noch ungesehenen
  Teil — die laufende Runde bleibt intakt. Das Budget (siehe
  Absatz unten) dockt über den optionalen `passtZuBudget`-Parameter beim
  ZIEHEN an (nicht passende Rezepte werden übersprungen, bleiben aber
  ungesehen im Stapel) — bekommt **keinen eigenen Stapel**, weil sich
  das Restbudget bei jedem übernommenen Rezept ändert und ein eigener
  Budget-Stapel sich dadurch ständig neu mischen müsste. Passt im noch
  ungesehenen Teil nichts mehr zum Budget, wird eine neue Runde gemischt
  (statt einer leeren Karte; das zuletzt gezogene Rezept kommt dabei nur
  dran, wenn es das einzig passende ist). Übernommene Rezepte zählen
  automatisch als gesehen (Ziehen passiert bereits beim Anzeigen, nicht
  erst beim Übernehmen).
- **Budget-gewichtete Auswahl** (`budgetFilter.js`, reine Funktionen, plus
  Anbindung in `App.jsx`): Das Kalorienziel (Korridor Min/Max) beeinflusst,
  welche Rezepte gezogen werden. Ernährungsform und Süß/Deftig bleiben
  harte Filter, das Budget ist ein weicher Filter obendrauf.
  `ziel.typ === 'kein'` oder ungültiger Korridor → alles wie ohne Budget.
  `proMahlzeit`: Korridor gilt direkt pro Mahlzeit. `proTag`: Korridor ×
  Anteil (`BUDGET_ANTEIL` 25/30/30/15 %, datenbasiert aus den Rezept-
  Medianen, NICHT die alten 25/35/30/10 aus `portionenRechner.js`),
  auf die aktiven Mahlzeiten umverteilt. Dynamisch: übernommene Rezepte
  anderer Mahlzeiten werden vom Korridor abgezogen, der Rest verteilt sich
  anteilig auf die offenen; die letzte offene Mahlzeit bekommt den ganzen
  Rest. Die eigene Auswahl einer Mahlzeit zählt für ihr Budget als offen.
  Ein Rezept "passt", wenn es höchstens `max(15 %, 75 kcal)` vom Korridor
  entfernt liegt; passen weniger als `MINDEST_TREFFER` (6, oder der ganze
  Pool, falls kleiner), kommen die 6 nächstliegenden (Rang statt
  aufgeweitetem Spielraum, sonst filtert es bei extremen Zielen nichts
  mehr). Der Bildschirm ist wegen des Budgets nie leer. **Stilles
  Neuziehen** (Effekt in `App.jsx`, bewusst nicht in
  `RezepteSwipeAnsicht`, sonst kommt das Tab-Flackern zurück): ändert
  sich das Budget einer Mahlzeit (Ziel geändert, anderswo übernommen/
  entfernt, Mahlzeit umgeschaltet), wird ihr bereits gezogener Kandidat
  nur ersetzt, wenn er nicht mehr passt. Die sichtbare Karte ändert sich
  dabei nie unter den Fingern (ihr Budget hängt nur von den anderen
  Mahlzeiten und vom Ziel ab). Sichtbar wird das Budget nur über die Restzeile im Tag-Tab
  (siehe unten), nicht an der Swipe-Karte. Tests: `npm run test:budget`
  (Logik, `node:test`, gegen den Schnappschuss) und
  `node scripts/teste-budget-app.mjs` (Browser, Chromium + WebKit,
  375×812 / 375×700 / 430×932; Dev-Server muss laufen, z. B.
  `npm run dev -- --port 5199`).
- `tagesauswahl` (State in `App.jsx`, localStorage `gusto-tagesauswahl`) —
  tagesaktuelle Merkliste pro Mahlzeit, Mitternachts-Reset über Datums-
  vergleich beim Laden. Bewusst **kein** dauerhafter Speiseplan: der
  Wochenplaner braucht später eigene mehrtägige Logik.
- `TagAnsicht.jsx` — eine Zeile pro aktiver Mahlzeit, Tap springt zurück in
  den Swipe-Modus für genau diese Mahlzeit. Tages-Summe nur bei
  `ziel.typ === 'proTag'`. "Zur Einkaufsliste" über
  `zutatenUndStatusAusTagesauswahl()` (pro Mahlzeit, siehe Abschnitt 10).
  Unter "Ziel … kcal" in der Karte "Tag gesamt" steht (nur bei `proTag`)
  eine sachliche Restzeile: "Noch 780 kcal für Abend und Snack" (ab drei
  offenen "für 3 Mahlzeiten"), "Tagesziel erreicht", "90 kcal unter dem
  Ziel" / "60 kcal über dem Ziel" (Abstand zur nächsten Korridorgrenze,
  auf 10 gerundet) oder — Mahlzeiten offen, Rest aufgebraucht — "Tagesziel
  bereits erreicht — für Snack kommen die leichtesten Vorschläge." Keine
  Warnfarbe, kein Ausrufezeichen: Information, keine Bewertung. Zahlen
  und Text kommen aus `tagesRestStatus()`/`tagesRestText()` in
  `budgetFilter.js`, die dieselben Bausteine wie `mahlzeitBudget()` nutzen
  (Summe der gewählten Rezepte nur über aktive Mahlzeiten) — die Zeile
  darf nie etwas anderes zeigen als die Auswahl tut, deshalb nicht in
  `TagAnsicht` neu rechnen. Browser-Test: `scripts/teste-tagesrest-app.mjs`.
- `aktiveMahlzeiten` steuert app-weit Tag-Zeilen und Mahlzeit-Switcher.
- `portionenRechner.js` — **stillgelegt** mit dem Datenmodell-Umbau (Etappe 3,
  siehe Abschnitt 9): kein Import mehr im Baum, Nährwerte und Mengen kommen
  seither fertig aus der DB statt live aus vier fest vorgegebenen Zutaten
  berechnet. Datei bleibt bewusst liegen (Gaußsche Elimination als
  Dokumentation aufbewahrt), nicht löschen.

**Bewusst nicht anfassen:** die mehrfach bugreparierte Übergangs-Choreografie
des Onboarding-Wizards. Tote, aber harmlose Zweige bleiben stehen.

**Vorgemerkt, nicht gebaut:** Einstellung "Für wie viele Personen?" — eigener
localStorage-Key `gusto-personenzahl`, Standard 1. Wirkt nur auf
Zutatenmengen in Kochmodus und Einkaufsliste (Multiplikator auf
`rezept_zutaten.menge_g`/`anzeige_menge`), nicht auf die Nährwertanzeige
(bleibt `kcal_pro_portion` & Co., unabhängig von der Personenzahl).

---

## 8. Nativer iOS-Teil

`MainViewController.swift` enthält einen Scroll-Lockdown per `CADisplayLink`,
der auf jedem Frame läuft. Er erzwingt für **jede** zur Laufzeit gefundene
`UIScrollView` (auch dynamisch von WebKit angelegte `WKChildScrollView`s),
rein anhand `contentSize` vs. `bounds` und ohne Whitelist:

- `bounces` und `bouncesZoom` immer aus,
- `isScrollEnabled` nur `true` bei echtem vertikalem Overflow (schützt
  Tag-Tab, Einstellungen, Kalorienrechner-Listen, Kochmodus),
- x-Achse immer hart auf 0.

Das war die Lösung einer langen Bug-Serie, bei der sich die gesamte
Bildschirmfläche verschieben ließ. **Dieser Mechanismus wird nicht ohne
Rücksprache verändert.** Wer ihn anfasst, testet danach zwingend am echten
Gerät — sowohl den Swipe-Screen als auch alle Screens, die legitim scrollen
müssen.

Logs mit Präfix `GUSTO-SCROLL-LOCKDOWN` feuern nur, wenn tatsächlich
korrigiert wurde.

**Dark Mode, nativer Teil (Schritt 3, umgesetzt):** `Info.plist` erzwingt
`UIUserInterfaceStyle` nicht mehr (Key entfernt) — die App unterstützt seit
diesem Schritt beide Modi. `ThemeBridge.swift` (neu) kapselt die Farb-/
Style-Logik: `hell`/`dunkel` 1:1 aus `--color-bg` gespiegelt, `dynamisch`
(eine `UIColor` mit `dynamicProvider`) als Startfarbe auf `view`/`webView`/
`window`, bis JS das erste Mal postet. `anwenden(style:controller:webView:)`
setzt `overrideUserInterfaceStyle` auf dem **Fenster** (wirkt dadurch auf
Statusleiste/Tastatur/native Formularelemente, nicht nur auf eine View) und
haftet die Hintergrundfarbe auf jeder Ebene (`view`, `webView`,
`webView.scrollView`, ab iOS 15 `underPageBackgroundColor`).

`MainViewController.swift` registriert `"themeBridge"` als
`WKScriptMessageHandler` auf der WebView (`configureThemeBridge()`, nach
`super.viewDidLoad()`, weil die WebView erst dann existiert) und ruft bei
jeder Nachricht `ThemeBridge.anwenden(...)` auf. JS sendet über
`nativeThemeSetzen()` (`src/theme.js`) via
`window.webkit.messageHandlers.themeBridge.postMessage({ modus })` — der
Aufruf sitzt in `App.jsx` in einem eigenen `useEffect`. **Wichtig:**
`modus` ist die GEWAEHLTE Darstellung (`'system'`/`'hell'`/`'dunkel'`,
bzw. `'hell'` erzwungen solange der Wizard sichtbar ist) — **nie** das
bereits aufgelöste `theme` (`'light'`/`'dark'`), siehe Bugfix unten.

**Zwei bereits gefundene und gefixte Bugs, beide grundsätzlich
(Bugfix-Vertrag, siehe Abschnitt 3) — `overrideUserInterfaceStyle` auf
Fenster-Ebene wirkt nicht nur auf native UI, sondern färbt auch
`window.matchMedia('(prefers-color-scheme: dark)')` für die GESAMTE
WebView um:**

1. *Startbildschirm blieb hell trotz dunklem System.* Der native
   "Wizard erzwingt Hell"-Zwang darf erst greifen, wenn der Wizard
   *tatsächlich sichtbar* ist (`!zeigtStartbildschirm &&
   !onboardingAbgeschlossen` in `App.jsx`) — **nicht** schon bei
   `!onboardingAbgeschlossen` allein, sonst zeigt bereits der
   Startbildschirm (der laut eigenem Anspruch dem System folgen soll)
   fälschlich immer Hell.
2. *Kreisschluss bei „System“ (von Gregor selbst diagnostiziert, 28.09.2026):*
   Wurde hier zuvor das bereits AUFGELÖSTE `theme` gesendet, las
   `useDarstellung()` beim nächsten Mal den eigenen, künstlich
   erzwungenen Wert aus `matchMedia` zurück und schickte ihn erneut — ein
   sich selbst bestätigender Fehlschluss (nach dem Wizard blieb die App
   hell, Umschalten auf „System“ wechselte nicht sofort; nur ein echter
   Systemwechsel oder ein Neustart setzte ihn zurück). Fix: `ThemeBridge`
   bekommt den ROHEN Modus, nicht das Ergebnis. Bei `'system'` hebt
   `ThemeBridge.anwenden(style: nil, …)` den Zwang mit
   `overrideUserInterfaceStyle = .unspecified` komplett auf, statt ihn
   durch einen (möglicherweise falschen) festen Wert zu ersetzen — erst
   das macht `matchMedia` wieder ehrlich, `useDarstellung()`s
   `'change'`-Listener übernimmt danach zuverlässig den echten Systemwert.

Beide Male per echtem Simulator-Build + `log stream`-Instrumentierung am
`WKScriptMessageHandler` konkret nachgewiesen (nicht vermutet) — bei
künftigen Änderungen an `nativeThemeSetzen`/`ThemeBridge` diesen
Seiteneffekt im Kopf behalten und am Gerät mit allen vier Kombinationen
gegenprüfen: iPhone dunkel + Darstellung Dunkel→System (bleibt dunkel),
iPhone dunkel + Hell→System (wird sofort dunkel), iPhone hell +
Dunkel→System (wird sofort hell), Neuinstallation bei dunklem iPhone
(Start dunkel, Wizard hell, direkt danach dunkel ohne Neustart) — alle
vier jeweils OHNE App-Neustart.

Splash: `resources`/`Assets.xcassets/Splash.imageset` hat jetzt helle UND
dunkle Varianten (dunkel = flächig `#1D1714`, per Skript erzeugt) —
Auswahl übernimmt iOS automatisch über die `-dark`-Bildvarianten der
Asset-Katalog-„luminosity“-Erscheinung, kein eigener Code nötig.
`capacitor.config.json`s `SplashScreen.backgroundColor` ist entfernt
(hätte sonst immer Hell über den nativen Splash gelegt, auch im Dunkeln).

**Xcode-Rebuild nötig, `npx cap sync ios` reicht NICHT** — es wurde neuer
Swift-Code hinzugefügt (`ThemeBridge.swift`, in `project.pbxproj`
eingetragen) und `Info.plist`/`SceneDelegate.swift`/`MainViewController.swift`
geändert.

---

## 9. Daten (Supabase)

**Tabelle `zutaten`** — 174 Einträge. Spalten: `id`, `name`, `kategorie`
(`protein`/`carbs`/`fett`/`gemuese`/`obst`), `aktiv`, `kalorien`,
`protein_g`, `carbs_g`, `fett_g`, `portion_g`, `mahlzeiten`, `diaeten`,
`eigenschaft` (süß/deftig), `supermarkt_kategorie`.

Bekannte Fallen: Käse ist uneinheitlich kategorisiert, die Schreibweise von
`name` ist uneinheitlich (echte Umlaute vs. ASCII). **Bei Referenzen immer
`id` verwenden, nie Namen abtippen.**

**Tabelle `rezepte`** — 100 kuratierte Einträge: `titel`, `beschreibung`,
`bild_url`, `mahlzeit`, `eigenschaft`, `diaeten` (echtes Array), `anleitung`,
`zubereitungszeit_min`, `portionen` (wie viele Portionen die Mengen unten
ergeben — noch ungenutzt, siehe Personenzahl-Einstellung in Abschnitt 7),
`tipps`, sowie die zwischengespeicherten Nährwerte pro Portion:
`kcal_/protein_/carbs_/fett_pro_portion`. RLS aktiv mit Public-Read-Policy,
Schreiben nur manuell über den Table Editor.

**Falle bei neuen Rezepten mit expliziter ID:** `rezepte.id` ist
`GENERATED ALWAYS AS IDENTITY` (keine einfache Spalte). Inserts mit
expliziter ID (z. B. bei einem neuen Rezepte-Paket, IDs 41–50 statt
automatisch vergeben) brauchen zwingend `overriding system value` in der
`insert`-Klausel, sonst bricht Postgres mit einem Identity-Fehler ab —
danach muss die Sequenz manuell nachgezogen werden: `select
setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from
rezepte));`. Die REST-/OpenAPI-Introspektion von Supabase zeigt Identity-
Spalten nicht als solche an — bei Fragen zur Spaltenart deshalb die
Migrationsdateien oder den tatsächlichen Fehlertext der Datenbank als
Quelle nehmen, nicht die OpenAPI-Beschreibung.

**Tabelle `rezept_zutaten`** — Verbindungstabelle, beliebig viele
Zutaten-Zeilen pro Rezept (aktuell 4 je Rezept, das Datenmodell erlaubt
mehr): `rezept_id`, `zutat_id`, `menge_g` (Basis für die Berechnung),
`anzeige_menge`/`anzeige_einheit` (für die Anzeige, z. B. "1 EL"),
`anmerkung`, `optional`, `sortierung`. `kcal_/protein_/carbs_/fett_pro_portion`
auf `rezepte` werden aus diesen Zeilen serverseitig neu berechnet
(`rezept_naehrwerte_neu_berechnen()`, siehe
`supabase/migrations/20260915_rezept_zutaten_fundament.sql`), nicht mehr
clientseitig über `portionenRechner.js`.

**Falle, die man in ein paar Monaten vergessen hat:** `kcal_/protein_/
carbs_/fett_pro_portion` sind ein reiner Cache, **kein** Trigger, keine
generierte Spalte. Wer ein Rezept oder seine `rezept_zutaten`-Zeilen im
Table Editor ändert (Menge, Zutat, `portionen`, neue/gelöschte Zeile), muss
danach `select rezept_naehrwerte_neu_berechnen(<rezept_id>);` im SQL Editor
von Hand aufrufen — sonst bleiben die alten Werte stehen und die App zeigt
still falsche Nährwerte an, ohne dass irgendwo ein Fehler auftaucht.

`anleitung` ist `jsonb`: Array aus `{ text, aktion }`, 3–6 Schritte (Beispiele
und Ton in `supabase/migrations/20260817_rezepte_anleitung.sql`). `aktion`
muss einer dieser festen Werte sein — kein neuer ohne Rücksprache:
`schneiden`, `kochen`, `braten`, `roesten`, `ruehren`, `mischen`, `warten`,
`servieren`.

Bei jedem **neuen** Rezept immer eine Anleitung im selben Stil mitliefern:
klar, kein Fachjargon, Deutsch, mit Substanz pro Schritt (kein bloßer
Halbsatz), abgeleitet aus Titel, Beschreibung und den Zutaten des Rezepts.

**`supabase/migrations/korrektur-getreide-gekocht.sql` ist wiederholbar**
und soll nach jedem neuen Rezept-Paket erneut laufen: die Zutaten-Tabelle
speichert Nährwerte für Getreide/Hülsenfrüchte im GEKOCHTEN Zustand, das
Skript trägt bei jeder passenden `rezept_zutaten`-Zeile eine Anmerkung mit
dem ungefähren Rohgewicht nach (z. B. "gekocht, ca. 55 g roh"), damit
niemand rohes Gewicht abwiegt und am Ende die dreifache Menge im Topf hat.
Die Faktoren (Verhältnis kcal roh zu kcal gekocht) sind je Zutat_id fest
im Skript hinterlegt — bei neuen Getreidesorten/Hülsenfrüchten dort
ergänzen. Ändert nur die Anzeige (`anzeige_menge`/`anmerkung`), nicht
`menge_g` oder die Nährwerte selbst, keine Neuberechnung nötig.

**Storage-Bucket `rezept-bilder`** (public) — `rezept-1.png` bis
`rezept-100.png`, Dateiname = `id`. Alle Bilder sind komprimiert (max. 1200 px
Breite, PNG-Palette-Quantisierung) über `scripts/komprimiere-rezeptbilder.js`.
Neue Bilder immer über den `lokal`-Modus hochladen: lokal komprimieren,
nur das Ergebnis geht in den Bucket — die unkomprimierten Rohexporte
gehen nie über Supabase-Egress, das hat schon einmal das Kontingent
gesprengt. Beispiel:

```
node scripts/komprimiere-rezeptbilder.js lokal supabase/pictures
```

Der `alle`-Modus (lädt aus dem Bucket, komprimiert, überschreibt dort)
ist nur noch für bereits hochgeladene, unkomprimierte Bestandsbilder
gedacht — nicht für neue Uploads.
Vor Bulk-Aktionen, die im Bucket überschreiben, immer erst lokal sichern.

**Test-Schnappschuss der Rezepte** (`scripts/testdaten/rezepte-schnappschuss.json`,
Grundlage von `npm run test:budget` und `scripts/teste-budget-app.mjs`)
wird mit `npm run schnappschuss` aus der Live-DB neu erzeugt (nur Lesen
über den Anon-Key). **Wann laufen lassen:** nach jedem neuen Rezepte-Paket
und nach jeder Änderung an Mengen, Zutaten oder `portionen` (also immer
nach `rezept_naehrwerte_neu_berechnen()`), danach die Tests erneut
laufen lassen und die geänderte JSON-Datei committen. Ohne das prüfen
die Tests gegen veraltete kcal-Werte — der Browser-Test schlägt dann
mit "ausserhalb des Budgets" fehl, obwohl die App stimmt.

Die Rezepte-Erweiterung von 30 auf 100 (Pakete 1–7) ist abgeschlossen.
Weitere Rezepte sind Content-Arbeit von Gregor, kein Claude-Code-Thema.

---

## 10. Einkaufsliste

Logik in `src/einkaufsliste.js`, Anzeige in `EinkaufslisteAnsicht.jsx`,
localStorage unter `gusto-einkaufsliste`. Zusammenführung mit Mengen-Addition
über `zutatId`.

Mengen kommen aus `rezept_zutaten.menge_g` (`zutatenAusRezeptKarte()`), nicht
mehr aus einer Live-Berechnung — seit dem Datenmodell-Umbau (Etappe 3, siehe
Abschnitt 9) sind Rezept-Mengen fest in der DB hinterlegt statt über
`portionenRechner.js` skaliert zu werden. `optional = true`-Zutaten kommen
mit auf die Liste.

Jeder Posten speichert `kategorie` 1:1 als rohen Supabase-Wert der Zutat —
bewusst **nicht** auf Anzeige-Gruppen gemappt.

Die Anzeige-Gruppierung nutzt `supermarktKategorie` (1:1 aus
`supermarkt_kategorie`). Reihenfolge: Fleisch & Fisch → Milchprodukte & Eier
→ Getreide & Backwaren → Obst & Gemüse → Sonstiges. Alte localStorage-
Einträge ohne `supermarktKategorie` fallen in `einkaufslisteLaden()` auf
`sonstiges` zurück.

**Hinzufügen aus der Tagesauswahl läuft PRO MAHLZEIT, nicht pro Tag**
(`zutatenUndStatusAusTagesauswahl()` in `einkaufsliste.js`,
`tagesauswahl.hinzugefuegt` in `App.jsx`): jede Mahlzeit merkt sich, welche
`rezeptId` zuletzt tatsächlich hinzugefügt wurde — weicht sie von der aktuell
gesetzten `rezeptId` ab (nie hinzugefügt oder Rezept seither ausgetauscht),
gilt die Mahlzeit wieder als offen. Sind bereits alle gesetzten Mahlzeiten
hinzugefügt, zeigt `TagAnsicht.jsx` eine Rückfrage statt stillem erneutem
Addieren.

---

## 11. Kochmodus

Gebaut als eigene Seite: Drag-Sheet-Overlay mit iOS-Physik, animiertes Icon
pro Schritt (abgeleitet aus `aktion`), abhakbare Schritte.

Der Abhak-Fortschritt (`erledigteSchritte` in `App.jsx`) ist standardmäßig
reiner Session-State (In-Memory, geht beim Neuladen verloren) und wird nur
dann dauerhaft im localStorage gespeichert, wenn der Toggle "Kochassistent"
in `EinstellungenAnsicht.jsx` aktiv ist (`gusto-kochschritte-persistent`,
Default `false`). Ist der Toggle aus, wird beim Laden IMMER ein leerer
Fortschritt zurückgegeben, selbst wenn noch ein alter Stand im localStorage
liegt (`kochschritteFortschrittLaden()` in `App.jsx`) — "aus" bedeutet
garantiert dasselbe wie das ursprüngliche reine Sitzungsverhalten.

---

## 12. Backlog (bewusst zurückgestellt)

Wettbewerbsanalyse liegt in `docs/gusto-wettbewerbsanalyse.md`
(Referenzdokument, kein Bauauftrag — jede Umsetzung braucht Gregors
einzelne Freigabe). Abschnitt 8 dort enthält die priorisierte
Feature-Liste. Besonders verbindlich die Liste **"Bewusst NICHT
übernehmen"**: Werbung, Rezept-Import aus Web oder TikTok, unkuratierte
Community-Rezepte, Voll-Tracking (Barcode/Foto), KI-Chat-Assistent. Fragt
Gregor künftig eines davon an, darauf hinweisen und fragen, ob sich die
Begründung geändert hat.

Wochenplaner nach demselben Swipe-Prinzip · Einkaufsliste nach Supermarkt
(Billa/Spar/Hofer) · Budget-Tracking · Zieldatum für Gewichtsänderung ·
Premium-Paywall (RevenueCat) · Account-System (Supabase Auth) · Dark Mode
(Palette entschieden, Umsetzungsplan gezeigt, siehe Abschnitt 5) ·
Onboarding-Wizard-Überarbeitung · mehr Rezepte · App-Store-Einreichung ·
Kurzname für Vorrat-Chips: manche `zutaten.name`-Werte sind für die
Chip-Zeile zu lang ("Pfeffer, schwarz gemahlen", "Paprikapulver, edelsüß"),
in der vollen Zutatenkarte aber richtig. Braucht ein eigenes Kurzname-Feld
in `zutaten` — Datenarbeit, keine Rendering-Frage.

Tipps einem Kochschritt zuordnen — bräuchte ein optionales Feld (z. B.
`schritt`) in der `tipps`-jsonb-Struktur plus inhaltliche Neuzuordnung der
bestehenden Tipps. Content-Arbeit, keine Rendering-Frage. Nicht alle
Tipps gehören zu einem Schritt, manche betreffen das ganze Gericht.

Flug-Animation "übernommenes Rezept fliegt als Kugel in die Tab-Leiste" —
soll auf dem Hinweis-Badge am Tag-Tab aufbauen (`TabLeiste.jsx`,
`tagBadgeAnzahl`-Prop, State `tagBadgeMahlzeiten` in `App.jsx`): die Kugel
landet dort, wo das Badge sitzt, und der Pop des Badges (Scale-Spring bei
Zahländerung) ist der natürliche Zielpunkt der Flugbahn.

**Katalog-Grenze bei hohen Kalorienzielen (wichtig, Kernzielgruppe
Muskelaufbau/High-Protein)** — die Rezepte sind auf grob 1.500–2.600
kcal/Tag ausgelegt (Median-Tagessumme ≈ 2.090 kcal; größtes Rezept je
Mahlzeit: Frühstück 618, Mittag 720, Abend 784, Snack 420 kcal). Wer ein
Ziel ab ca. 2.700 kcal hat (typisch im Muskelaufbau), landet bei der
budget-gewichteten Auswahl in JEDER Mahlzeit im Fallback und sieht immer
nur dieselben 6 größten Rezepte pro Mahlzeit — die Auswahl wirkt dann
eingeschränkt, und selbst die größten Rezepte bleiben unter dem Budget
(bei 3.000 kcal wären es z. B. 900 kcal für Mittag gegen max. 720). Der
Filter kann daran nichts ändern, es fehlt ein Größenhebel.
Lösungsidee **Portionsfaktor**: zu jedem Rezept einen Faktor (z. B. ×1,25
oder ×1,5) vorschlagen, dessen skalierte kcal am besten zum Budget
passen; Mengen (`menge_g`/`anzeige_menge`) und Nährwerte werden
entsprechend skaliert (Karte, Kochmodus, Einkaufsliste, Tages-Summe).
Verwandt mit der vorgemerkten "Für wie viele Personen?"-Einstellung
(Abschnitt 7, `gusto-personenzahl`) — beide brauchen denselben
Skalierungsmechanismus, deshalb gemeinsam entwerfen. Alternative bzw.
Ergänzung: mehr kcal-starke Rezepte (Content-Arbeit). Braucht Gregors
Freigabe und einen eigenen Plan.

Content-Lücken (Stand 28.09.2026, Abfrage über den Rezepte-Schnappschuss,
100 Rezepte) — **belegt durch den Gerätetest der Budget-Auswahl:** zwei
ganze Tage mit je dem ersten übernommenen Rezept ergaben bei Ziel
1.500–1.700 → 1.759 kcal und bei 2.400–2.600 → 2.293 kcal (beide etwa
4 % daneben). Die Abweichung entstand beide Male beim **Snack als letzter
Mahlzeit**: er muss den ganzen Rest auffangen, der Katalog deckt dort nur
122–420 kcal ab. Für die nächste Rezeptrunde gezielt die Ränder füllen
(Zielwerte von Gregor, Ist-Stand daneben):

| Mahlzeit | Bereich heute | Ziel für neue Rezepte | Ist heute |
|---|---|---|---|
| Snack | 122–420 | unter 150 **und** über 450 kcal | 1 Rezept unter 150 (122), keins über 420; **kein** Rezept zwischen 123 und 199 |
| Abendessen | 412–784 | unter 500 kcal | nur 4 Rezepte (412, 475, 478, 495) |
| Frühstück | 308–618 | unter 400 **und** über 650 kcal | 2 Rezepte unter 400 (308, 399), keins über 618 |
| Mittag | 433–720 | (kein Auftrag) | Ränder dünn: nur 1 Rezept unter 450, 1 über 700 |

Verteilung je 50-kcal-Band (Anzahl Rezepte): Frühstück 300:1 350:1 400:3
450:5 500:5 550:4 600:3 · Mittag 400:1 450:6 500:5 550:3 600:7 650:6 700:1 ·
Abend 400:1 450:3 500:2 550:1 600:6 650:12 700:2 750:1 · Snack 100:1
200:4 250:1 300:8 350:5 400:2 (alle anderen Bänder 0). Dazu die kleinen
Pools bei Ernährungsform Vegan (dort filtert das Budget praktisch
nichts): Frühstück 1 Rezept (594 kcal), Abend 5 (475–741), Snack 5 (122
und 347–406, also nichts dazwischen), Mittag 9 (458–686). Neue Rezepte
möglichst auch vegan an den Rändern (vegane Snacks 150–330, vegane
Frühstücke unter 550). Nach jedem neuen Paket `npm run schnappschuss` und
diese Tabelle prüfen (siehe Abschnitt 9).

Kontrast im hellen Modus: umgesetzt und am Gerät bestätigt, siehe
Abschnitt 5 (nicht mehr Backlog).

Einkaufsliste zeigt teils falsche Mengen/Einheiten (Befund 29.09.2026,
nicht angefasst — Punkte 1+2 sind EIN zusammenhängender Umbau (Roh-
Faktor, Einkaufseinheit und Stückgewicht kommen aus derselben neuen
Spaltengruppe in `zutaten`), braucht ein neues Datenmodell-Feld und
Rücksprache. **Priorität: aktuell nächster Schritt** (Gregor,
29.09.2026 — direkt nach der jetzt abgeschlossenen Kontrastanhebung):

1. **Gekocht- statt Roh-Gewicht.** `rezept_zutaten.menge_g` steht bei
   Getreide/Hülsenfrüchten im GEKOCHTEN Zustand (siehe Abschnitt 9,
   `korrektur-getreide-gekocht.sql`) — die Einkaufsliste zeigt deshalb
   z. B. Buchweizen mit 150 g oder Spaghetti mit 200 g, obwohl im
   Geschäft die rohe Ware gekauft wird. Die Roh-Umrechnungsfaktoren
   stecken heute nur im Korrektur-Skript (je `zutat_id` fest hinterlegt)
   und wirken dort nur auf `anzeige_menge`/`anmerkung` (Kochmodus-Text),
   nicht auf die tatsächliche Einkaufsmenge. **Lösungsidee:** den Faktor
   als eigene Spalte (z. B. `roh_faktor`) in `zutaten` speichern statt
   nur im Skript, damit Kochmodus-Anmerkung UND Einkaufsliste
   (`zutatenAusRezeptKarte()` in `einkaufsliste.js`) aus derselben Quelle
   rechnen statt auseinanderzulaufen.
2. **Einkaufseinheit je Zutat statt pauschal Gramm.** Flüssigkeiten
   stehen in Gramm statt Millilitern (z. B. Milch mit 200 g), und Stück-
   Zutaten (z. B. Eier) müssten eigentlich als "2 Stück" statt in Gramm
   erscheinen — **nicht pauschal umrechnen** (Gregor, 29.09.2026: je
   Zutat einzeln, nicht global per Dichte-Annahme). **Lösungsidee:**
   zwei neue Spalten in `zutaten`: `einkaufseinheit` (`g` / `ml` /
   `stueck`) und `stueckgewicht_g` (nur bei `stueck` befüllt, z. B. Ei
   ≈ 60 g) — die Einkaufsliste rechnet `menge_g ÷ stueckgewicht_g`
   (gerundet) und zeigt z. B. "2 Eier" statt "120 g". Gehört mit Punkt 1
   zusammen entworfen (`roh_faktor`, `einkaufseinheit`, `stueckgewicht_g`
   als eine zusammenhängende Erweiterung von `zutaten`, ein gemeinsamer
   Umsetzungsplan statt getrennter Einzel-Migrationen).
3. **Alte ASCII-Namen im Zutatenbestand** (per Abfrage gefunden,
   29.09.2026, 232 Zutaten insgesamt durchsucht): 26 Einträge ohne
   Umlaut/scharfes S, obwohl an anderer Stelle im selben Bestand korrekt
   geschrieben wird (`Weißwein`, `Weißweinessig`, `Süßkartoffel`,
   `Kürbiskernöl`, `Walnüsse` — also kein bewusstes Muster, sondern
   Inkonsistenz):

   | id | Name (aktuell) | id | Name (aktuell) |
   |---|---|---|---|
   | 36 | Bergkaese | 118 | Schafkaese |
   | 139 | Erdnuesse | 152 | Schmelzkaese |
   | 85 | Frischkaese | 74 | Sesamoel |
   | 65 | Griess | 142 | Sonnenblumenoel |
   | 168 | Gruenkohl | 141 | Walnussoel |
   | 77 | Haselnuesse | 117 | Ziegenkaese |
   | 50 | Huettenkaese | 110 | Weisse Bohnen |
   | 124 | Kartoffelpueree | 156 | Weisskraut |
   | 84 | Kokosoel | 89 | Rote Ruebe |
   | 96 | Kuerbis | 140 | Rapsoel |
   | 81 | Kuerbiskerne | 138 | Paranuesse |
   | 103 | Leberkaese | 66 | Muesli |
   | 73 | Leinoel | 137 | Macadamianuesse |

   Reine Content-Korrektur (`update zutaten set name = ... where id =
   ...`, `id` bleibt als Referenz unverändert) — keine Logik-Änderung.

Punkt 3 ist reine Content-Korrektur, Punkte 1+2 ein kleiner, gemeinsamer
Datenmodell-Zusatz (drei neue Spalten in `zutaten`) — keine
Architekturänderung, aber ein zusammenhängender Umbau statt Einzel-
Fixes. Umsetzung erst nach Gregors Freigabe und einem eigenen Plan.
