-- BEREITS AUSGEFUEHRT (Stand: 2026-09-26, Mengen fuer 2, 8, 11, 14, 20,
-- 23, 25, 26, 27, 30 in der DB bestaetigt).
--
-- Migration: Realistische Portionsgroessen fuer die urspruenglichen 30 Rezepte
--
-- Hintergrund: Die Mengen der vier urspruenglichen Kernzutaten stammen
-- noch aus dem alten Portionsrechner, der sie auf Makroziele skaliert hat.
-- Seit dem Datenmodell-Umbau sind Rezepte fest - und manche Mengen passen
-- nicht zu einer echten Portion. Die 70 neuen Rezepte (31-100) sind davon
-- nicht betroffen, sie wurden von Anfang an realistisch angelegt.
--
-- Zwei Richtungen:
--
--   ZU WENIG - Hauptgerichte mit 80 g gekochtem Reis bzw. gekochten
--   Nudeln (je ca. 30 g roh, rund ein Drittel einer Portion):
--     8, 14, 20 (Reis)  |  11, 23 (Vollkornnudeln)
--     Bei 11 (Bolognese) wird gleichzeitig Faschiertes und Oel leicht
--     reduziert, sonst laege das Gericht bei ueber 850 kcal.
--
--   ZU VIEL - Snacks mit Hauptmahlzeit-Mengen (450-550 kcal):
--     25, 26, 27, 30 - weniger Haferflocken, Nuesse, Brot und Oel.
--     Zusaetzlich 2 (Joghurt-Muesli, ueber 700 kcal): weniger Walnuesse.
--
-- Die Anmerkungen der Getreide-Zeilen ("gekocht, ca. X g roh") werden
-- direkt mitgesetzt, nach denselben Faktoren wie in
-- korrektur-getreide-gekocht.sql.
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).

-- Vorher-Stand festhalten, damit am Ende der Vergleich sichtbar ist
create temp table portionen_vorher as
select id, round(kcal_pro_portion) as kcal_vorher,
       round(protein_pro_portion) as protein_vorher
from rezepte
where id in (2, 8, 11, 14, 20, 23, 25, 26, 27, 30);

begin;

-- ------------------------------------------------------------
-- Zu wenig: Hauptgerichte
-- ------------------------------------------------------------

-- 8 Klassiker: Haehnchen, Reis, Brokkoli - Reis 80 -> 150
update rezept_zutaten
set menge_g = 150, anzeige_menge = 150, anmerkung = 'gekocht, ca. 55 g roh'
where rezept_id = 8 and zutat_id = 5;

-- 11 Bolognese-Style mit Zucchini - Nudeln 80 -> 160, dafuer
-- Faschiertes 150 -> 120 und Olivenoel 1 EL -> 2 TL
update rezept_zutaten
set menge_g = 160, anzeige_menge = 160, anmerkung = 'gekocht, ca. 55 g roh'
where rezept_id = 11 and zutat_id = 18;

update rezept_zutaten
set menge_g = 120, anzeige_menge = 120
where rezept_id = 11 and zutat_id = 14;

update rezept_zutaten
set menge_g = 10, anzeige_menge = 2, anzeige_einheit = 'TL'
where rezept_id = 11 and zutat_id = 9;

-- 14 Linsen-Reis-Teller - Reis 80 -> 120 (die Linsen bringen bereits
-- Kohlenhydrate mit, deshalb nicht die volle Reisportion)
update rezept_zutaten
set menge_g = 120, anzeige_menge = 120, anmerkung = 'gekocht, ca. 45 g roh'
where rezept_id = 14 and zutat_id = 5;

-- 20 Tofu-Pfanne mit Brokkoli - Reis 80 -> 150
update rezept_zutaten
set menge_g = 150, anzeige_menge = 150, anmerkung = 'gekocht, ca. 55 g roh'
where rezept_id = 20 and zutat_id = 5;

-- 23 Pute mit Champignons - Nudeln 80 -> 160
update rezept_zutaten
set menge_g = 160, anzeige_menge = 160, anmerkung = 'gekocht, ca. 55 g roh'
where rezept_id = 23 and zutat_id = 18;


-- ------------------------------------------------------------
-- Zu viel: Snacks und ein schweres Fruehstueck
-- ------------------------------------------------------------

-- 2 Griechisches Joghurt-Muesli - Walnuesse 30 -> 15
update rezept_zutaten
set menge_g = 15, anzeige_menge = 15
where rezept_id = 2 and zutat_id = 22;

-- 25 Skyr-Snack mit Beeren - Haferflocken 60 -> 30, Mandeln 30 -> 15
update rezept_zutaten
set menge_g = 30, anzeige_menge = 30
where rezept_id = 25 and zutat_id = 7;

update rezept_zutaten
set menge_g = 15, anzeige_menge = 15
where rezept_id = 25 and zutat_id = 10;

-- 26 Huettenkaese-Snack - Walnuesse 30 -> 15, Apfel 150 -> 120
update rezept_zutaten
set menge_g = 15, anzeige_menge = 15
where rezept_id = 26 and zutat_id = 22;

update rezept_zutaten
set menge_g = 120
where rezept_id = 26 and zutat_id = 32;

-- 27 Kichererbsen-Snack (Hummus mit Brot) - Kichererbsen 150 -> 100,
-- Vollkornbrot 2 Scheiben -> 1 Scheibe, Olivenoel 1 EL -> 1 TL
update rezept_zutaten
set menge_g = 100, anzeige_menge = 100
where rezept_id = 27 and zutat_id = 48;

update rezept_zutaten
set menge_g = 30, anzeige_menge = 1, anzeige_einheit = 'Scheibe'
where rezept_id = 27 and zutat_id = 61;

update rezept_zutaten
set menge_g = 5, anzeige_menge = 1, anzeige_einheit = 'TL'
where rezept_id = 27 and zutat_id = 9;

-- 30 Ricotta-Rucola-Brot - Vollkornbrot 2 Scheiben -> 1 Scheibe,
-- Olivenoel 1 EL -> 1 TL
update rezept_zutaten
set menge_g = 30, anzeige_menge = 1, anzeige_einheit = 'Scheibe'
where rezept_id = 30 and zutat_id = 61;

update rezept_zutaten
set menge_g = 5, anzeige_menge = 1, anzeige_einheit = 'TL'
where rezept_id = 30 and zutat_id = 9;

commit;


-- ------------------------------------------------------------
-- Naehrwerte neu berechnen
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id)
from rezepte
where id in (2, 8, 11, 14, 20, 23, 25, 26, 27, 30);


-- ------------------------------------------------------------
-- Vorher-Nachher-Vergleich
-- ------------------------------------------------------------
select r.id, r.titel, r.mahlzeit,
       v.kcal_vorher,
       round(r.kcal_pro_portion)    as kcal_nachher,
       v.protein_vorher,
       round(r.protein_pro_portion) as protein_nachher
from rezepte r
join portionen_vorher v on v.id = r.id
order by r.id;

drop table portionen_vorher;
