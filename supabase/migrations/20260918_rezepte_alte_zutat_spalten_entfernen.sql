-- Migration: Etappe 4 von 4 des Datenmodell-Umbaus (siehe
-- gusto-datenmodell-umbau.md, docs/etappe-4-plan.md). Entfernt die vier
-- alten FK-Spalten auf rezepte, die seit Etappe 1 durch rezept_zutaten
-- ersetzt sind.
--
-- WICHTIG - Reihenfolge: erst NACHDEM App.jsx diese Spalten nicht mehr
-- abfragt (select()-Kuerzung, Commit 6fc2e27) UND das auf BEIDEN Laufzeiten
-- (iOS-App, Vercel-Web) bestaetigt ist. Vorher ausgefuehrt wuerde die
-- rezepte-Query mit einem 400er scheitern, der in App.jsx nur geloggt
-- wird - die App zeigt dann still "Fuer diese Filterkombination gibt es
-- noch kein Rezept" statt eines erkennbaren Fehlers. Mit Gregor am
-- 2026-09-18 bestaetigt: select()-Kuerzung ist live (Vercel-Bundle
-- verifiziert per Grep, kein Treffer fuer gemuese_obst_zutat_id) UND
-- am iPhone getestet.
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).
-- Noch NICHT ausgefuehrt - Gregor fuehrt sie manuell aus.

alter table rezepte
  drop column if exists protein_zutat_id,
  drop column if exists carbs_zutat_id,
  drop column if exists fett_zutat_id,
  drop column if exists gemuese_obst_zutat_id;

-- Falls PostgREST den Schema-Cache nicht automatisch neu laedt (aeussert
-- sich als 400er auf die naechste rezepte-Query trotz erfolgreichem
-- ALTER TABLE): manuell anstossen.
notify pgrst, 'reload schema';

-- Kontrolle: rezepte sollte jetzt keine der vier Spalten mehr haben.
select column_name
from information_schema.columns
where table_name = 'rezepte'
  and column_name in ('protein_zutat_id', 'carbs_zutat_id', 'fett_zutat_id', 'gemuese_obst_zutat_id');
-- Erwartung: 0 Zeilen.
