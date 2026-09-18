# Etappe 4 — Alte FK-Spalten entfernen (Abschluss des Datenmodell-Umbaus)

> Kopie des Etappe-4-Abschnitts aus `~/.claude/plans/magical-meandering-puzzle.md`,
> damit er im Repo gesichert ist und nicht nur lokal in einem Plan-Ordner liegt.
> Schriftlich festgehalten, weil zwischen Schritt 1 und Schritt 2 eine
> Session-Grenze liegen kann und die Reihenfolge dabei kritisch ist.

## Kontext

Etappe 3 (App auf `rezept_zutaten`/`rezepte.*_pro_portion` umgestellt, inkl.
Schritt 6 "Aufräumen") ist komplett erledigt, committed und gepusht —
Commit 9a09418. Die vier alten Spalten `protein_zutat_id`, `carbs_zutat_id`,
`fett_zutat_id`, `gemuese_obst_zutat_id` auf `rezepte` stehen noch in der
`select()`-Klausel (`src/App.jsx:557`), werden aber von keinem Code mehr
gelesen. Etappe 4 entfernt sie vollständig — aus der App-Query UND aus der
DB — und schließt damit den gesamten Datenmodell-Umbau (Etappen 1–4) ab.

## Rechercheergebnis vor Beginn (Session vom 2026-09-18)

Grep über den kompletten Baum (`src/`, `supabase/migrations/`, `scripts/`)
nach `protein_zutat_id`/`carbs_zutat_id`/`fett_zutat_id`/`gemuese_obst_zutat_id`:

- Einzige Code-Referenz: `src/App.jsx:557`, nur die Spaltennamen in der
  `select()`-Zeichenkette — kein JS-Konsument liest die Werte (bestätigt
  durch Etappe 3, Schritt 6).
- Keine View, keine Funktion, keine RLS-Policy referenziert die Spalten.
  `rezept_naehrwerte_neu_berechnen()` arbeitet ausschließlich über
  `rezept_zutaten`/`zutaten`.
- Die zwei Treffer in
  `supabase/migrations/20260915_rezept_zutaten_altbestand.sql` sind
  Kommentarzeilen, keine SQL-Statements — diese Migration hat die alten
  Werte einmalig von Hand in `INSERT`-Zeilen übersetzt, nicht per Live-`SELECT`.
- `scripts/`: keine Treffer.

## Reihenfolge — bewusst abweichend von Abschnitt 4 im Konzept-Dokument

`docs/gusto-datenmodell-umbau.md` §4 und der ursprüngliche Etappe-3-Plan
(`docs/etappe-3-plan.md`, Schritt 6) sahen vor: erst DB-Spalten löschen,
dann `select()` kürzen. Diese Reihenfolge wurde nach Rücksprache mit Gregor
am 2026-09-18 UMGEDREHT: erst `select()` kürzen und auf BEIDEN Laufzeiten
(iOS-App + Vercel-Web) bestätigt ausgeliefert, danach erst die DB-Spalten
löschen.

**Warum:** Löscht man die DB-Spalten zuerst, während `select()` sie noch
abfragt, liefert Supabase/PostgREST einen 400er für die GESAMTE
`rezepte`-Query. Der Fehler wird in `App.jsx` nur geloggt (`console.error`),
nie dem Nutzer angezeigt — die App zeigt dann still "Für diese
Filterkombination gibt es noch kein Rezept" statt eines erkennbaren
Fehlers. Andersherum (`select()` zuerst) ist die Reihenfolge gefahrlos:
fragt niemand mehr die Spalten ab, kann das Droppen niemanden mehr
überraschen. Bleibt trotzdem eine unbekannte DB-seitige Abhängigkeit übrig
(View, Funktion, FK), meldet Postgres das beim `DROP COLUMN` sofort und
laut als Fehler — auch das spricht für "Code zuerst, DB zuletzt".

## Schritt 1 — `select()` kürzen (Code zuerst)

`src/App.jsx:557`: `'protein_zutat_id, carbs_zutat_id, fett_zutat_id, gemuese_obst_zutat_id, ' +`
ersatzlos streichen. Keine andere Code-Änderung nötig (siehe
Rechercheergebnis oben).

`npm run build && npx cap sync ios`, Xcode-Neuinstallation, am Gerät
bestätigen: Rezepte-Tab, Tag-Tab, Kochmodus, Einkaufsliste unverändert —
reine Verkleinerung der Netzwerk-Antwort, keine sichtbare Wirkung erwartet.
Kein Touch-/Gesten-Thema, aber wichtiger Beweis, dass wirklich niemand mehr
fragt.

Committen, pushen.

**Danach: Vercel-Deployment verifizieren, konkret, nicht nur "Status
grün".** Die ausgelieferte JS-Bundle-Datei von der Produktions-URL laden
und nach dem literalen String `gemuese_obst_zutat_id` grep-en (eindeutiger
Spaltenname, übersteht Minifizierung als String-Literal in der
`select()`-Kette). Abwesenheit = neue Version live. Anwesenheit = alter
Build noch aktiv — Schritt 2 dann NICHT freigeben.

## HARTE PAUSE zwischen Schritt 1 und Schritt 2

Schritt 2 (`DROP COLUMN`) wird erst freigegeben, wenn **beide** Bedingungen
erfüllt sind:
1. Gregor hat den iPhone-Retest bestätigt, UND
2. der Bundle-Grep auf der Vercel-Produktions-URL findet
   `gemuese_obst_zutat_id` NICHT mehr.

Liegt zwischen Schritt 1 und Schritt 2 eine neue Session: diese beiden
Bedingungen hier nachlesen, nicht annehmen, dass "Schritt 1 ist committed"
automatisch auch Schritt 2 erlaubt.

## Schritt 2 — DB-Spalten entfernen (Gregor führt im SQL Editor aus)

```sql
alter table rezepte
  drop column if exists protein_zutat_id,
  drop column if exists carbs_zutat_id,
  drop column if exists fett_zutat_id,
  drop column if exists gemuese_obst_zutat_id;
```

Danach Web + iPhone neu laden, Rezepte-Tab prüfen. Falls PostgREST den
Schema-Cache nicht automatisch neu lädt: `notify pgrst, 'reload schema';`
im SQL Editor oder "Reload schema" im Supabase-Dashboard
(API-Einstellungen).

## Schritt 3 — `portionenRechner.js`

Bereits stillgelegt (Etappe 3, Schritt 6, vorgezogen). Nichts mehr zu tun,
nur der Vollständigkeit halber gelistet.

## Schritt 4 — Dokumentation nachziehen

- CLAUDE.md §9: Absatz "Die vier alten Spalten … Übergangsstand bis Etappe 4"
  streichen (Übergang ist vorbei, Spalten existieren nicht mehr).
- `docs/gusto-datenmodell-umbau.md` §4: Etappe 4 als ✅ erledigt markieren.
- `docs/etappe-3-plan.md` bleibt unangetastet als historisches Dokument
  stehen.
- `docs/etappe-4-plan.md` (diese Datei) nach Abschluss ebenfalls als
  historisches Dokument stehen lassen, analog zu `etappe-3-plan.md` —
  nicht löschen.

**Damit ist der gesamte Datenmodell-Umbau (Etappen 1–4) abgeschlossen.**
