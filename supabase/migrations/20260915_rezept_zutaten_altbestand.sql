-- Migration: Altbestand ueberfuehren (Etappe 2 von 4, siehe
-- gusto-datenmodell-umbau.md). Fuer alle 30 bestehenden Rezepte werden die
-- bisherigen 4 fest referenzierten Zutaten (protein_/carbs_/fett_/
-- gemuese_obst_zutat_id) 1:1 als Zeilen in rezept_zutaten uebernommen.
-- menge_g = anzeige_menge = portion_g der jeweiligen Zutat (unveraendert
-- aus dem alten Modell), anzeige_einheit vorlaeufig 'g' als Platzhalter -
-- huebschere Einheiten ("2 EL", "1 Zehe" etc.) sind spaetere Content-Arbeit,
-- kein Teil dieser Etappe.
--
-- Rein additiv/lesend fuer die App: rezepte.protein_zutat_id etc. bleiben
-- unveraendert stehen, die select()-Klausel in App.jsx liest weiterhin nur
-- diese Spalten. Die App merkt von dieser Migration nichts.
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).
-- Noch NICHT ausgefuehrt - Gregor fuehrt sie manuell aus.

-- 1) Fuer jedes Rezept die 4 alten Zutaten als rezept_zutaten-Zeilen
--    anlegen. Reihenfolge/sortierung: 0=Protein, 1=Carbs, 2=Fett,
--    3=Gemuese/Obst - entspricht der bisherigen festen Slot-Reihenfolge.
insert into rezept_zutaten (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, sortierung) values
  (1, 173, 150, 150, 'g', 0),
  (1, 7, 60, 60, 'g', 1),
  (1, 10, 30, 30, 'g', 2),
  (1, 31, 100, 100, 'g', 3),
  (2, 35, 150, 150, 'g', 0),
  (2, 66, 60, 60, 'g', 1),
  (2, 22, 30, 30, 'g', 2),
  (2, 30, 120, 120, 'g', 3),
  (3, 51, 150, 150, 'g', 0),
  (3, 7, 60, 60, 'g', 1),
  (3, 38, 15, 15, 'g', 2),
  (3, 69, 150, 150, 'g', 3),
  (4, 174, 150, 150, 'g', 0),
  (4, 7, 60, 60, 'g', 1),
  (4, 38, 15, 15, 'g', 2),
  (4, 130, 120, 120, 'g', 3),
  (5, 4, 120, 120, 'g', 0),
  (5, 61, 60, 60, 'g', 1),
  (5, 8, 80, 80, 'g', 2),
  (5, 25, 100, 100, 'g', 3),
  (6, 2, 150, 150, 'g', 0),
  (6, 34, 60, 60, 'g', 1),
  (6, 85, 40, 40, 'g', 2),
  (6, 41, 100, 100, 'g', 3),
  (7, 50, 150, 150, 'g', 0),
  (7, 61, 60, 60, 'g', 1),
  (7, 9, 15, 15, 'g', 2),
  (7, 13, 100, 100, 'g', 3),
  (8, 1, 150, 150, 'g', 0),
  (8, 5, 80, 80, 'g', 1),
  (8, 9, 15, 15, 'g', 2),
  (8, 11, 150, 150, 'g', 3),
  (9, 3, 150, 150, 'g', 0),
  (9, 59, 180, 180, 'g', 1),
  (9, 74, 10, 10, 'g', 2),
  (9, 154, 100, 100, 'g', 3),
  (10, 2, 150, 150, 'g', 0),
  (10, 6, 150, 150, 'g', 1),
  (10, 9, 15, 15, 'g', 2),
  (10, 12, 80, 80, 'g', 3),
  (11, 14, 150, 150, 'g', 0),
  (11, 18, 80, 80, 'g', 1),
  (11, 9, 15, 15, 'g', 2),
  (11, 87, 150, 150, 'g', 3),
  (12, 48, 150, 150, 'g', 0),
  (12, 63, 180, 180, 'g', 1),
  (12, 86, 20, 20, 'g', 2),
  (12, 27, 100, 100, 'g', 3),
  (13, 43, 150, 150, 'g', 0),
  (13, 17, 200, 200, 'g', 1),
  (13, 23, 10, 10, 'g', 2),
  (13, 94, 120, 120, 'g', 3),
  (14, 28, 150, 150, 'g', 0),
  (14, 5, 80, 80, 'g', 1),
  (14, 9, 15, 15, 'g', 2),
  (14, 25, 100, 100, 'g', 3),
  (15, 46, 120, 120, 'g', 0),
  (15, 119, 180, 180, 'g', 1),
  (15, 40, 20, 20, 'g', 2),
  (15, 27, 100, 100, 'g', 3),
  (16, 49, 120, 120, 'g', 0),
  (16, 60, 150, 150, 'g', 1),
  (16, 74, 10, 10, 'g', 2),
  (16, 88, 150, 150, 'g', 3),
  (17, 1, 150, 150, 'g', 0),
  (17, 6, 150, 150, 'g', 1),
  (17, 9, 15, 15, 'g', 2),
  (17, 26, 120, 120, 'g', 3),
  (18, 48, 150, 150, 'g', 0),
  (18, 59, 180, 180, 'g', 1),
  (18, 82, 50, 50, 'g', 2),
  (18, 163, 100, 100, 'g', 3),
  (19, 44, 150, 150, 'g', 0),
  (19, 17, 200, 200, 'g', 1),
  (19, 23, 10, 10, 'g', 2),
  (19, 27, 100, 100, 'g', 3),
  (20, 3, 150, 150, 'g', 0),
  (20, 5, 80, 80, 'g', 1),
  (20, 74, 10, 10, 'g', 2),
  (20, 11, 150, 150, 'g', 3),
  (21, 2, 150, 150, 'g', 0),
  (21, 58, 180, 180, 'g', 1),
  (21, 9, 15, 15, 'g', 2),
  (21, 162, 150, 150, 'g', 3),
  (22, 108, 150, 150, 'g', 0),
  (22, 6, 150, 150, 'g', 1),
  (22, 9, 15, 15, 'g', 2),
  (22, 12, 80, 80, 'g', 3),
  (23, 43, 150, 150, 'g', 0),
  (23, 18, 80, 80, 'g', 1),
  (23, 9, 15, 15, 'g', 2),
  (23, 92, 100, 100, 'g', 3),
  (24, 4, 120, 120, 'g', 0),
  (24, 17, 200, 200, 'g', 1),
  (24, 23, 10, 10, 'g', 2),
  (24, 94, 120, 120, 'g', 3),
  (25, 51, 150, 150, 'g', 0),
  (25, 7, 60, 60, 'g', 1),
  (25, 10, 30, 30, 'g', 2),
  (25, 31, 100, 100, 'g', 3),
  (26, 50, 150, 150, 'g', 0),
  (26, 126, 20, 20, 'g', 1),
  (26, 22, 30, 30, 'g', 2),
  (26, 32, 150, 150, 'g', 3),
  (27, 48, 150, 150, 'g', 0),
  (27, 61, 60, 60, 'g', 1),
  (27, 9, 15, 15, 'g', 2),
  (27, 41, 100, 100, 'g', 3),
  (28, 47, 100, 100, 'g', 0),
  (28, 126, 20, 20, 'g', 1),
  (28, 8, 80, 80, 'g', 2),
  (28, 25, 100, 100, 'g', 3),
  (29, 107, 100, 100, 'g', 0),
  (29, 126, 20, 20, 'g', 1),
  (29, 74, 10, 10, 'g', 2),
  (29, 27, 100, 100, 'g', 3),
  (30, 115, 100, 100, 'g', 0),
  (30, 61, 60, 60, 'g', 1),
  (30, 9, 15, 15, 'g', 2),
  (30, 97, 50, 50, 'g', 3);

-- 2) Fuer alle 30 Rezepte die zwischengespeicherten Naehrwerte berechnen
--    lassen (Funktion aus Etappe 1, Pro-100g-Formel).
select rezept_naehrwerte_neu_berechnen(id) from rezepte;

-- 3) Kontrolle: die berechneten Werte ansehen. Diese Zeilen sollten (bis auf
--    Rundung) exakt der bisherigen Standard-Anzeige entsprechen - siehe
--    Vergleichstabelle im Chat.
select id, titel, kcal_pro_portion, protein_pro_portion, carbs_pro_portion, fett_pro_portion
from rezepte
order by id;
