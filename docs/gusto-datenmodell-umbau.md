# Gusto — Datenmodell-Umbau: von 4 Zutaten zu echten Rezepten

Stand: September 2026 · Entscheidung: Weg A (Rezepte sind fest, Ziele steuern die Auswahl)

---

## 1. Die Leitentscheidung

**Vorher:** Ein Rezept ist eine Formel. Vier Zutaten werden in ihrer Menge so
gelöst, dass ein Makroziel exakt getroffen wird (Gaußsche Elimination in
`portionenRechner.js`).

**Nachher:** Ein Rezept ist ein Gericht. Feste Zutaten, feste Mengen, feste
Nährwerte. Das Ziel des Nutzers steuert nicht mehr die Mengen, sondern
**welche Rezepte überhaupt gezeigt werden**.

### Was "genau" ab jetzt bedeutet

| | vorher | nachher |
|---|---|---|
| Versprechen | "Deine Portion trifft dein Ziel exakt" | "Was du kochst, ist exakt das, was angezeigt wird" |
| Stellschraube | Menge jeder einzelnen Zutat | Portionenzahl (0,5 / 1 / 1,5 / 2) + Rezeptauswahl |
| Fehlerquelle | keine (mathematisch exakt) | Qualität der Zutaten-Nährwerte |

Für fitnessbewusste Nutzer ist die neue Zusage wertvoller: Ein getracktes
Gericht stimmt wirklich, statt dass eine rechnerisch perfekte, aber in der
Küche unrealistische Menge ausgegeben wird.

**Konsequenz:** Die Genauigkeit hängt jetzt vollständig an der Datenqualität
in `zutaten`. Öl, Butter und Nüsse sind dabei die kritischen Posten — 1 EL Öl
sind ~90 kcal. Ein falsch gepflegter Wert dort verzerrt ein ganzes Rezept.

---

## 2. Das neue Schema

### 2.1 Neue Tabelle: `rezept_zutaten`

Das Verbindungsglied. Ein Rezept hat beliebig viele Zeilen hier.

```sql
create table rezept_zutaten (
  id              bigint generated always as identity primary key,
  rezept_id       bigint not null references rezepte(id) on delete cascade,
  zutat_id        bigint not null references zutaten(id) on restrict,

  -- Für die Berechnung: immer in Gramm, immer für die Basis-Portionenzahl
  menge_g         numeric not null,

  -- Für die Anzeige: was der Mensch liest
  anzeige_menge   numeric not null,
  anzeige_einheit text    not null,   -- 'g','ml','EL','TL','Stück','Prise','Zehe'
  anmerkung       text,               -- 'mittelscharf', 'gehackt', 'optional'

  optional        boolean not null default false,
  sortierung      smallint not null default 0,

  created_at      timestamptz not null default now()
);

create index on rezept_zutaten (rezept_id);
create unique index on rezept_zutaten (rezept_id, zutat_id);
```

#### Der wichtigste Trick: `menge_g` und `anzeige_*` getrennt

Eine Einheiten-Umrechnung zur Laufzeit (aus "2 EL Tomatenmark" Nährwerte
ableiten) ist fehleranfällig und braucht eine Umrechnungstabelle pro Zutat.

Stattdessen wird **einmal beim Anlegen des Rezepts** umgerechnet:

| Anzeige | `anzeige_menge` | `anzeige_einheit` | `menge_g` |
|---|---|---|---|
| 800 g Hühnerbrust | 800 | `g` | 800 |
| 3 Zwiebeln | 3 | `Stück` | 330 |
| 2 EL Tomatenmark | 2 | `EL` | 30 |
| 1 Prise Kümmel | 1 | `Prise` | 0.5 |

Die App rechnet **ausschließlich** mit `menge_g` und zeigt **ausschließlich**
`anzeige_menge` + `anzeige_einheit`. Keine Umrechnungslogik im Code, keine
Rundungsfehler, volle Freiheit bei der Darstellung.

### 2.2 Änderungen an `rezepte`

```sql
alter table rezepte
  add column portionen smallint not null default 2,
  add column tipps jsonb,
  -- Zwischengespeicherte Nährwerte PRO PORTION:
  add column kcal_pro_portion    numeric,
  add column protein_pro_portion numeric,
  add column carbs_pro_portion   numeric,
  add column fett_pro_portion    numeric;
```

**Warum zwischengespeichert statt bei jedem Aufruf berechnet:**
Der Swipe-Screen muss nach Kalorienbudget filtern und sortieren. Das über
einen Join mit Summenbildung bei jedem Wisch zu machen ist unnötig teuer.
Da Rezepte manuell und selten geschrieben werden, reicht eine Neuberechnung
nach jeder Änderung.

```sql
create or replace function rezept_naehrwerte_neu_berechnen(p_rezept_id bigint)
returns void language plpgsql as $$
begin
  update rezepte r set
    kcal_pro_portion = sub.kcal / r.portionen,
    protein_pro_portion = sub.protein / r.portionen,
    carbs_pro_portion = sub.carbs / r.portionen,
    fett_pro_portion = sub.fett / r.portionen
  from (
    select rz.rezept_id,
           sum(z.kalorien  * rz.menge_g / 100) as kcal,
           sum(z.protein_g * rz.menge_g / 100) as protein,
           sum(z.carbs_g   * rz.menge_g / 100) as carbs,
           sum(z.fett_g    * rz.menge_g / 100) as fett
    from rezept_zutaten rz
    join zutaten z on z.id = rz.zutat_id
    where rz.rezept_id = p_rezept_id and rz.optional = false
    group by rz.rezept_id
  ) sub
  where r.id = p_rezept_id and sub.rezept_id = r.id;
end $$;
```

> **Vor der Umsetzung zu prüfen:** Diese Funktion nimmt an, dass die
> Nährwerte in `zutaten` **pro 100 g** gespeichert sind und `portion_g` nur
> eine Standard-Portionsgröße ist. Falls die Werte stattdessen *pro
> `portion_g`* gelten, muss die Formel `* rz.menge_g / z.portion_g` lauten.
> Das muss an echten Daten verifiziert werden, bevor irgendetwas gerechnet
> wird — ein Fehler hier verfälscht jedes Rezept in der App.
>
> **Erledigt (September 2026):** An echten Zeilen nachgerechnet (Olivenöl,
> Butter, Mandeln, Hähnchenbrust, Reis) — die Pro-100g-Annahme stimmt,
> eindeutig und ohne Ausnahme über alle geprüften Kategorien. Die Formel
> oben ist korrekt so wie sie steht. Details siehe Chatverlauf der Session,
> in der Etappe 1 umgesetzt wurde.

`optional = true`-Zutaten zählen bewusst nicht in die Nährwerte, erscheinen
aber in der Zutatenliste.

### 2.3 Neu: `tipps`

```json
[
  { "titel": "Sauce zu dünn?",
    "text": "1 TL Mehl mit etwas kaltem Wasser verrühren, einrühren, kurz aufkochen." },
  { "titel": "Ohne Wein",
    "text": "Rotwein durch Brühe plus 1 TL Worcestersauce ersetzen." }
]
```

Freie Tipps ohne Schrittbezug. Falls ein Tipp zu einem bestimmten Schritt
gehört, kann später ein optionales Feld `schritt` ergänzt werden.

### 2.4 Was wegfällt

- `rezepte.protein_zutat_id`, `carbs_zutat_id`, `fett_zutat_id`,
  `gemuese_obst_zutat_id` — ersetzt durch `rezept_zutaten`.
- Der Gleichungslöser in `portionenRechner.js` verliert seine Aufgabe.
  Skalierung ist jetzt eine Multiplikation mit dem Portionsfaktor.
  **Datei nicht löschen, sondern stilllegen** — falls Weg A sich im
  Alltag doch als zu unflexibel erweist, ist der Kern dort dokumentiert.
- Die offene Funktionslücke "Per-Mahlzeit-Makroziele ohne Editier-Oberfläche"
  erledigt sich damit von selbst: Ziele steuern nur noch Auswahl und
  Reihenfolge, nicht mehr die Berechnung.

---

## 3. `zutaten` muss wachsen

Echte Rezepte brauchen, was bisher fehlt:

- **Gewürze und Aromaten:** Salz, Pfeffer, Paprikapulver, Kümmel, Senf,
  Tomatenmark, Knoblauch, Essig, Sojasauce
- **Fette zum Braten:** Butterschmalz, Olivenöl, Rapsöl (nährwertkritisch!)
- **Flüssigkeiten:** Brühe, Wein, Kokosmilch, Sahne und Ersatzprodukte
- **Fertigkomponenten:** Semmelknödel, Nudeln verschiedener Sorten, Wraps

Für diese neuen Einträge sind mehrere bestehende Spalten inhaltlich
sinnlos — `mahlzeiten` und `eigenschaft` (süß/deftig) ergeben für Salz keine
Aussage. Vorschlag: eine Spalte `ist_grundzutat boolean` ergänzen. Grundzutaten
(Gewürze, Öl, Brühe) erscheinen nicht als eigenständige Auswahl und brauchen
diese Felder nicht.

**Bekannte Falle bleibt bestehen:** Die Schreibweise in `name` ist uneinheitlich
(echte Umlaute vs. ASCII), Käse ist uneinheitlich kategorisiert. Referenzen
immer über `id`.

---

## 4. Migration in vier Etappen

Wichtig: keine Etappe darf die laufende App brechen. Die `select()`-Klausel in
`App.jsx` listet Spalten explizit auf — eine fehlende Spalte dort liefert
sofort einen 400er und einen leeren Rezepte-Tab.

**Etappe 1 — rein additiv, App läuft unverändert weiter** ✅ erledigt
`rezept_zutaten` anlegen, neue Spalten auf `rezepte` ergänzen, Funktion
anlegen, `zutaten` um Grundzutaten erweitern. Die App merkt davon nichts.
Migration: `supabase/migrations/20260915_rezept_zutaten_fundament.sql`.
Ausgeführt und am Gerät bestätigt.

**Etappe 2 — Altbestand überführen** ✅ erledigt
Für die 30 bestehenden Rezepte je vier Zeilen in `rezept_zutaten` erzeugen,
`menge_g` zunächst aus `portion_g` der jeweiligen Zutat. Danach Nährwerte
berechnen und gegen die bisherige Anzeige prüfen — Abweichungen sind hier das
wichtigste Warnsignal, dass die Per-100g-Annahme aus Abschnitt 2.2 falsch ist.
Migration: `supabase/migrations/20260915_rezept_zutaten_altbestand.sql`.
Ausgeführt, Gegenprobe für alle 30 Rezepte zeigte 0 Abweichung, am Gerät
bestätigt.

**Etappe 3 — App umstellen** ✅ erledigt
Lesepfad auf `rezept_zutaten` und die zwischengespeicherten Nährwerte
umgebaut. Betroffen: Swipe-Karte, Kochmodus, Tagesansicht, Einkaufsliste,
Zielabgleich. Umsetzungsplan (historisch): `docs/etappe-3-plan.md`.

**Etappe 4 — aufräumen** ✅ Code-Teil erledigt, DB-Teil vorbereitet
Die vier alten FK-Spalten werden entfernt — erst aus der `select()`-Klausel
in `App.jsx` (auf iOS-App und Vercel-Web bestätigt ausgeliefert), danach
erst aus der DB. Diese Reihenfolge ist bewusst umgedreht gegenüber der
ursprünglichen Planung oben — Begründung und Details: `docs/etappe-4-plan.md`.
Migration vorbereitet und committed:
`supabase/migrations/20260918_rezepte_alte_zutat_spalten_entfernen.sql`,
wird von Gregor im SQL Editor ausgeführt. `portionenRechner.js` wurde
bereits in Etappe 3 stillgelegt, nicht erst hier.

Damit ist der gesamte Datenmodell-Umbau (Etappen 1–4) inhaltlich
abgeschlossen, sobald diese Migration ausgeführt ist.

---

## 5. Was der Umbau sonst noch berührt

| Bereich | Auswirkung |
|---|---|
| **Einkaufsliste** | Wird deutlich besser: echte Mengen statt Portionsgrößen. Zusammenführung muss künftig nach `zutat_id` **und** Einheit gruppieren — "2 EL Öl" und "50 ml Öl" dürfen nicht stumpf addiert werden. Lösung: intern über `menge_g` summieren, für die Anzeige in die sinnvollste Einheit zurückrechnen. |
| **Swipe-Auswahl** | Neue Logik: Rezepte nach Restbudget des Tages gewichten statt rein zufällig ziehen. Das ist die eigentliche Produktverbesserung des Umbaus — eigener Schritt NACH Etappe 3, nicht Teil des reinen Umzugs. |
| **Tagesansicht** | Summe addiert `kcal_pro_portion × Portionsfaktor`. Der Ring funktioniert unverändert. |
| **Kochmodus** | Braucht eine echte Zutatenliste (bisher gab es nur vier). Eigenes Design-Thema. |
| **Kalorienrechner** | Ziele bleiben, ihre Rolle ändert sich von Berechnung zu Filterung. |
| **Onboarding** | Unverändert. |

---

## 6. Offene Punkte

1. ~~**Per-100g-Annahme verifizieren** (Abschnitt 2.2) — blockiert alles andere.~~
   Erledigt, siehe Hinweis bei 2.2.
2. **Portionsfaktor-Stufen:** 0,5 / 1 / 1,5 / 2 oder feiner? Feiner heißt
   genauere Zielannäherung, aber unrealistischere Mengen beim Kochen.
3. **Reicht "optional"?** Oder braucht es echte Alternativen
   ("Rotwein *oder* Brühe")?
4. **Zutatenpflege skaliert nicht ewig:** 30 Rezepte à 12 Zutaten sind 360
   Zeilen. Ab einem gewissen Punkt braucht es eine Eingabemaske statt
   handgeschriebenem SQL.
5. **Bildbedarf bleibt:** Jedes neue Rezept braucht ein Foto — der eigentliche
   Engpass beim Wachstum des Rezeptbestands.
6. **Einstellung "Für wie viele Personen?"** — steuert den Hochrechnungs-
   faktor für Zutatenmengen im Kochmodus und auf der Einkaufsliste. Standard 1.

   Bewusst **nicht** `rezepte.portionen` — das bleibt eine Eigenschaft des
   Rezepts ("diese Mengen ergeben X Portionen"), die neue Einstellung ist
   eine Nutzerpräferenz. Beide multiplizieren sich: Zutatenmenge, die
   Kochmodus/Einkaufsliste zeigen, ist `menge_g × (Personen-Einstellung /
   portionen)`. Die Nährwertanzeige bleibt davon unberührt — sie zeigt immer
   `kcal_pro_portion` etc., unabhängig von der Personen-Einstellung.

   **Technisch:** eigener Wert, kein Teil des bestehenden `ziel`-Objekts
   (`gusto-ziel` in `App.jsx`). Der Codebase-Stil trennt bereits sauber nach
   Bedeutung — `ziel` (Kalorien-/Makroziel), `makroZiele` (pro Mahlzeit),
   `aktiveMahlzeiten`, `diaeten` — jeweils eigener localStorage-Key, eigene
   Lade-Funktion mit demselben Fallback-Muster. `ziel` ist inhaltlich eng an
   Kalorien-/Makro-Zielwerte gebunden; die Personen-Zahl ist eine reine
   Mengen-Einstellung ohne Bezug dazu. Klarer Fall für einen neuen, eigenen
   Key (Vorschlag: `gusto-personenzahl`), nicht für ein Aufweichen des
   bestehenden Objekts. Betrifft eine spätere Etappe (Kochmodus/Einkaufsliste-
   Redesign), NICHT Etappe 3 selbst — siehe `docs/etappe-3-plan.md`.
