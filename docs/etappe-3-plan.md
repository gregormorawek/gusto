# Etappe 3 — App auf das neue Datenmodell umstellen

> Kopie des Plans aus `~/.claude/plans/magical-meandering-puzzle.md`, damit er
> im Repo gesichert ist und nicht nur lokal in einem Plan-Ordner liegt. Noch
> NICHT umgesetzt — nächster Schritt der nächsten Session.

## Kontext

Etappe 1 (Schema) und Etappe 2 (Altbestand, 120 Zeilen in `rezept_zutaten`, Nährwerte
zwischengespeichert) sind ausgeführt und am Gerät bestätigt. Die App liest davon bisher
nichts — sie rechnet Nährwerte und Mengen weiterhin live über den Gaußschen Löser in
`portionenRechner.js` aus den vier alten `*_zutat_id`-Spalten.

Etappe 3 dreht den Lesepfad um: Nährwerte kommen fertig aus `rezepte.*_pro_portion`,
Zutaten und Mengen aus `rezept_zutaten`. Danach hat der Löser keine Aufgabe mehr.

**Etappe 3 ist bewusst ein reiner Umzug.** Gleiches sichtbares Verhalten, andere
Datenquelle. Nicht enthalten (jeweils eigener Schritt danach): budget-gewichtete
Rezeptauswahl, Personenzahl-Einstellung, Kochmodus-/Einkaufslisten-Redesign, Entfernen
der vier alten Spalten (das ist Etappe 4).

Eine Verhaltensänderung ist unvermeidlich und gewollt: Mit gesetztem Kalorienziel zeigte
die App bisher zielskalierte Zahlen (Faktor 0,5–2,0, `portionenRechner.js:282`). Ab jetzt
sind Rezepte fest. Ohne gesetztes Ziel ändert sich nichts — das ist genau der Stand, den
die Vergleichstabelle aus Etappe 2 abgesichert hat.

## Ausgangslage im Code

Die 4-Zutaten-Annahme sitzt an genau zwei Datenstellen — `App.jsx:583` (select) und
`rezeptKarteBerechnen.js:27-30` (Join). Alles andere hängt an der Rückgabe von
`rezeptKarteBerechnen`:

```
portionenRechner.js
  └── rezeptKarteBerechnen.js        (einziger Importeur im Baum)
        ├── components/RezeptSchwipKarte.jsx:195   Anzeige + Kochmodus-Snapshot
        ├── components/TagAnsicht.jsx:389          Anzeige + Tagessumme + Snapshot
        └── einkaufsliste.js:132                   Mengen → localStorage
```

`rezeptKarteBerechnen` ist damit der einzige Engpass. Wer ihn umbaut, hat alle fünf
Konsumenten erwischt.

## Reihenfolge (jeder Schritt einzeln lauffähig)

### Schritt 1 — select() erweitern, ohne einen einzigen Leser

`src/App.jsx:580-584`. Neue Skalarspalten plus zweistufiger Embed über die
Fremdschlüssel:

```js
supabase
  .from('rezepte')
  .select(
    'id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten, ' +
    'protein_zutat_id, carbs_zutat_id, fett_zutat_id, gemuese_obst_zutat_id, ' +
    'anleitung, zubereitungszeit_min, ' +
    'portionen, tipps, kcal_pro_portion, protein_pro_portion, carbs_pro_portion, fett_pro_portion, ' +
    'rezept_zutaten(zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung, ' +
      'zutaten(id, name, kategorie, supermarkt_kategorie))'
  )
  .order('sortierung', { referencedTable: 'rezept_zutaten' })
```

Die vier alten Spalten bleiben drin (bis Etappe 4). Kein anderer Code wird angefasst,
niemand liest die neuen Felder — die App muss sich exakt gleich verhalten.

**Warum Embed statt zweiter Query:** Das Rezept-Objekt bleibt in sich geschlossen. Damit
funktionieren `rezepte.find(...)`, die nur IDs speichernde `tagesauswahl` und der
eingefrorene `kochModusEintrag`-Snapshot unverändert, und es muss keine zweite Map durch
den Komponentenbaum gereicht werden. Der zweite Embed (`zutaten(...)`) umgeht zusätzlich
eine Falle: die Zutaten-Query filtert auf `aktiv = true` (`App.jsx:579`). Eine im Rezept
referenzierte, inaktiv gestellte Zutat wäre über `zutatenNachId` `undefined` und würde
mitten im Render einen TypeError werfen — es gibt keine Error Boundary in der App.

**Prüfen, nicht hinsehen:** Ein Tippfehler im Embed liefert einen 400er, und der ist in
der Oberfläche nicht von "zu streng gefiltert" zu unterscheiden — die App zeigt dann
still "Für diese Filterkombination gibt es noch kein Rezept" (`RezeptSchwipKarte.jsx:448`),
weil `rezepteErgebnis.error` nur geloggt wird (`App.jsx:592-598`). Also die
Netzwerkantwort selbst kontrollieren: enthält jedes Rezept ein `rezept_zutaten`-Array mit
4 Einträgen und je einem `zutaten`-Objekt darin?

### Schritt 2 — `rezeptKarteBerechnen.js` → `rezeptKarteDaten.js`

Datei umbenennen (der Name "berechnen" stimmt nicht mehr, es wird nur noch gelesen und
sortiert), neue Signatur `rezeptKarteDaten(rezept)` — `zutatenNachId`, `ziel` und
`makroZiele` entfallen. Rückgabe:

```js
{
  zutaten: [{ zutatId, name, kategorie, supermarktKategorie,
              mengeG, anzeigeMenge, anzeigeEinheit, anmerkung, optional }],
  summeKalorien, summeProtein, summeCarbs, summeFett
}
```

- `null` bei fehlendem Rezept — die Render-Guards (`TagAnsicht.jsx:390/393`,
  `RezeptSchwipKarte.jsx:348`) bleiben damit gültig.
- Summen direkt aus `rezept.kcal_pro_portion` etc., `?? 0` als Absicherung gegen ein
  Rezept ohne gepflegte Zutaten (zeigt dann 0 statt `NaN`).
- `zutaten` aus `rezept.rezept_zutaten`, nach `sortierung` sortiert (zusätzlich zum
  `.order()` aus Schritt 1 — vier bis zwölf Elemente, kostet nichts).
- Die Feldnamen `summeKalorien/summeProtein/summeCarbs/summeFett` bleiben **absichtlich
  gleich**, damit Schritt 3 nur die Aufrufzeile anfasst und nicht die Anzeige.
- Der Import aus `./portionenRechner` fällt weg.

**Namensfalle, die im Kommentar festgehalten wird:** Das alte `karte.portionen`
(Slot-Gramm) verschwindet. Das neue `rezept.portionen` ist etwas völlig anderes (wie viele
Portionen die Mengen ergeben) und wird in Etappe 3 **nicht** benutzt — die Multiplikation
kommt erst mit der Personenzahl-Einstellung.

### Schritt 3 — Anzeige umstellen (kleinster Diff)

- `src/components/RezeptSchwipKarte.jsx:195` und `src/components/TagAnsicht.jsx:389`:
  nur der Aufruf wird zu `rezeptKarteDaten(rezept)`.
- Die Anzeigezeilen bleiben unverändert: kcal + Makro-Pillen
  (`RezeptSchwipKarte.jsx:412-424`), Tageszeile (`TagAnsicht.jsx:152`), Tagessumme
  (`TagAnsicht.jsx:399-410`).
- Die Tagessumme addiert damit automatisch `kcal_pro_portion` je gewähltem Rezept. Ring
  (`TagAnsicht.jsx:288-337`, gerendert :459) und `tagesZielKalorien` aus `ziel`
  (:422-425) werden nicht angefasst — `ziel` bleibt also erhalten, nur `makroZiele` fällt.

### Schritt 4 — Kochmodus auf beliebig viele Zutaten

`src/components/KochModus.jsx:413-422` (vier fest verdrahtete Slots mit den Labels
Protein/Kohlenhydrate/Fett/Gemüse) wird zu einem `map` über `karte.zutaten`. Anzeige:
`name · anzeigeMenge anzeigeEinheit` statt hart kodiertem "g" (`KochModus.jsx:449-458`),
`anmerkung` als Zusatz, `optional` gekennzeichnet. Die Slot-Labels entfallen — im neuen
Modell gibt es keine Slots mehr.

Das `grid-cols-2` ist auf genau vier Kacheln ausgelegt und trägt bei zwölf Zutaten nicht
mehr → einspaltige Liste, die mit beliebiger Länge funktioniert.

Bewusst ein **funktionaler Port, kein Redesign**: Der Zutatenteil des Kochmodus bekommt
seinen eigenen Design-Durchgang, wenn echte Rezepte mit 8–12 Zutaten da sind (dann
zusammen mit der Personenzahl).

### Schritt 5 — Einkaufsliste auf echte Mengen

- `src/einkaufsliste.js:86-117` (`zutatenAusRezeptKarte`, heute vier fest ausgeschriebene
  Objekte): `map` über `karte.zutaten`, `mengeG` kommt aus `rezept_zutaten.menge_g`.
- `src/einkaufsliste.js:129-135` (`zutatenAusTagesauswahl`): Parameter `zutatenNachId`,
  `ziel`, `makroZiele` entfallen, entsprechend `App.jsx:436`.
- **Unverändert bleibt bewusst alles andere:** Posten-Modell
  `{ zutatId, name, kategorie, supermarktKategorie, mengeG, abgehakt }`, das
  localStorage-Format, der Merge über `zutatId` (`einkaufsliste.js:56-70`), die
  Gruppierung und die "X g"-Anzeige (`EinkaufslisteAnsicht.jsx:74-76`). Bereits
  gespeicherte Listen bleiben gültig.
- Der Einheiten-Mix aus Konzept §5 ist heute noch kein Thema: alle 120 Zeilen aus Etappe 2
  haben `anzeige_einheit = 'g'`, und die Liste rechnet weiterhin ausschließlich in
  `mengeG`. Sobald echte EL-/Stück-Angaben dazukommen, ist die Rückrechnung in eine
  sinnvolle Anzeigeeinheit ein eigener Schritt.
- `optional = true`-Zutaten kommen mit auf die Liste (sie fehlen sonst beim Einkauf);
  heute ohne Wirkung, da alle Altzeilen `optional = false` sind.

### Schritt 6 — Stilllegen und aufräumen

- **makroZiele raus** (mit Gregor abgestimmt): Loader und Key `App.jsx:81-94`, State
  `App.jsx:564`, Props an `RezepteSwipeAnsicht`/`TagAnsicht` (`App.jsx:956-984`) und die
  Parameter an den drei Aufrufstellen. Der localStorage-Eintrag `gusto-makro-ziele` bleibt
  unangetastet liegen, wird nur nicht mehr gelesen.
- **`portionenRechner.js` bleibt liegen** (Konzept §2.4), bekommt aber einen
  Kopfkommentar: stillgelegt mit dem Datenmodell-Umbau, kein Import mehr im Baum, der
  Kern der Gleichungssystem-Logik bewusst als Dokumentation aufbewahrt.
- **CLAUDE.md nachziehen**: §7 (`portionenRechner` "unverändert gültig" wird falsch; die
  Funktionslücke "Per-Mahlzeit-Makroziele" ist erledigt), §9 (Rezept-Datenmodell), §10
  (Einkaufsliste-Mengen).
- Die vier alten `*_zutat_id`-Spalten bleiben in der select()-Liste stehen, bis Etappe 4
  sie in der DB entfernt. Reihenfolge dort: erst App ohne Leser am Gerät bestätigt, dann
  DB-Spalten weg, dann select() kürzen.

## Verifikation

Nach jedem Schritt `npm run build && npx cap sync ios`, dann in Xcode neu installieren —
sonst wird ein alter Bundle-Stand getestet.

Playwright bei **375×812 und 375×700**, in Chromium **und** WebKit:

1. **Schritt 1:** Netzwerkantwort der Rezepte-Query prüfen (verschachtelte Arrays da?),
   App sonst unverändert. Kein 400er.
2. **Nährwerte gegen Etappe 2:** Bei Ziel "kein" muss die Swipe-Karte exakt die Werte der
   Vergleichstabelle zeigen, z. B. Rezept 8 "Klassiker: Hähnchen, Reis, Brokkoli" =
   453 kcal, P 41 g, K 33 g, F 18 g. Mit gesetztem Kalorienziel zeigt sie jetzt dieselben
   festen Werte statt zielskalierter — das ist der gewollte Effekt, kein Fehler.
3. **Tag-Tab:** Summe = Summe der `kcal_pro_portion` der gewählten Rezepte; Ring nur bei
   `ziel.typ === 'proTag'`; Zeile antippen springt weiterhin in den Swipe-Modus.
4. **Einkaufsliste:** Aus der Tagesauswahl hinzufügen → Mengen entsprechen `menge_g`,
   Merge über `zutatId` addiert korrekt, Gruppierung nach Supermarkt-Abschnitten
   unverändert, alte gespeicherte Liste lädt weiter.
5. **Kochmodus:** Zutatenliste zeigt alle Zutaten des Rezepts, Schritte und Abhaken
   unverändert.

**Am echten iPhone gegenprüfen (Regressionsvertrag, CLAUDE.md §3):** Der einzige Punkt,
an dem diese Etappe Touch-Nahes berührt, ist die längere Zutatenliste im Kochmodus. Sie
ändert die Scrollhöhe im Drag-Sheet, und der Scroll-Lockdown in `MainViewController.swift`
entscheidet pro Frame anhand `contentSize` vs. `bounds`, ob eine `UIScrollView` scrollen
darf (CLAUDE.md §8 — nicht angefasst, aber betroffen). Mit den heutigen vier Zutaten
sollte sich nichts ändern; trotzdem Drag-Sheet, Scrollen und Abhaken am Gerät testen.
Swipe-Gesten, Tab-Leiste und Overlays werden nicht angefasst.

Nach bestätigtem Test committen, bevor der nächste Schritt beginnt.
