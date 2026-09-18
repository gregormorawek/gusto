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
- Playwright-Tests immer bei 375×812 **und** 375×700 laufen lassen. Overlay-
  und Wizard-Bugs sind nur bei schmalen Viewports reproduzierbar.
- Lokal ist neben Chromium auch WebKit installiert (devDependency). Für alles,
  was Flex, aspect-ratio, backdrop-filter oder Scroll betrifft: dort
  gegenprüfen, nicht nur in Chromium.
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
- Dark Mode ist geplant, aber nicht gebaut. Vorgesehene Palette: "Abendküche"
  (dunkel mit Gold und Salbeigrün). Dafür muss die aktuelle native Fixierung
  auf Light Mode wieder dynamisch werden (`Info.plist`
  `UIUserInterfaceStyle=Light` plus hartcodierte Cream-Hintergründe auf
  `UIWindow`/`WKWebView`).

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
- `tagesauswahl` (State in `App.jsx`, localStorage `gusto-tagesauswahl`) —
  tagesaktuelle Merkliste pro Mahlzeit, Mitternachts-Reset über Datums-
  vergleich beim Laden. Bewusst **kein** dauerhafter Speiseplan: der
  Wochenplaner braucht später eigene mehrtägige Logik.
- `TagAnsicht.jsx` — eine Zeile pro aktiver Mahlzeit, Tap springt zurück in
  den Swipe-Modus für genau diese Mahlzeit. Tages-Summe nur bei
  `ziel.typ === 'proTag'`. "Zur Einkaufsliste" über
  `zutatenUndStatusAusTagesauswahl()` (pro Mahlzeit, siehe Abschnitt 10).
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

---

## 9. Daten (Supabase)

**Tabelle `zutaten`** — 174 Einträge. Spalten: `id`, `name`, `kategorie`
(`protein`/`carbs`/`fett`/`gemuese`/`obst`), `aktiv`, `kalorien`,
`protein_g`, `carbs_g`, `fett_g`, `portion_g`, `mahlzeiten`, `diaeten`,
`eigenschaft` (süß/deftig), `supermarkt_kategorie`.

Bekannte Fallen: Käse ist uneinheitlich kategorisiert, die Schreibweise von
`name` ist uneinheitlich (echte Umlaute vs. ASCII). **Bei Referenzen immer
`id` verwenden, nie Namen abtippen.**

**Tabelle `rezepte`** — 30 kuratierte Einträge: `titel`, `beschreibung`,
`bild_url`, `mahlzeit`, `eigenschaft`, `diaeten` (echtes Array), `anleitung`,
`zubereitungszeit_min`, `portionen` (wie viele Portionen die Mengen unten
ergeben — noch ungenutzt, siehe Personenzahl-Einstellung in Abschnitt 7),
`tipps`, sowie die zwischengespeicherten Nährwerte pro Portion:
`kcal_/protein_/carbs_/fett_pro_portion`. RLS aktiv mit Public-Read-Policy,
Schreiben nur manuell über den Table Editor.

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

**Storage-Bucket `rezept-bilder`** (public) — `rezept-1.png` bis
`rezept-30.png`, Dateiname = `id`. Alle Bilder sind komprimiert (max. 1200 px
Breite, PNG-Palette-Quantisierung) über `scripts/komprimiere-rezeptbilder.js`.
Neue Bilder vor dem Upload durch dasselbe Skript schicken — unkomprimierte
Midjourney-Rohexporte haben schon einmal das Egress-Kontingent gesprengt.
Vor Bulk-Aktionen, die im Bucket überschreiben, immer erst lokal sichern.

30 Rezepte sind für den Swipe-Loop deutlich zu wenig. Die Erweiterung ist
Content-Arbeit von Gregor, kein Claude-Code-Thema.

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

Wochenplaner nach demselben Swipe-Prinzip · Einkaufsliste nach Supermarkt
(Billa/Spar/Hofer) · Budget-Tracking · Zieldatum für Gewichtsänderung ·
Premium-Paywall (RevenueCat) · Account-System (Supabase Auth) · Dark Mode ·
Onboarding-Wizard-Überarbeitung · mehr Rezepte · App-Store-Einreichung.