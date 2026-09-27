-- Migration: Rezept 6 (Lachs-Frischkaese-Brot) auf Raeucherlachs umstellen
--
-- Bisher: Zutat "Lachs" (id 2, frischer Lachs: 208 kcal, 13 g Fett / 100 g)
-- mit Anmerkung "geraeuchert", 150 g. Seit Paket 7 gibt es Raeucherlachs
-- als eigene Zutat mit eigenen Naehrwerten (180 kcal, 10 g Fett / 100 g).
--
-- Gleichzeitig Menge 150 g -> 100 g: Fuer zwei Scheiben Brot ist das eine
-- realistische Fruehstuecksportion Raeucherlachs.
--
-- Raeucherlachs wird per exaktem Namen aufgeloest statt per ID.
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).

create temp table rezept6_vorher as
select round(kcal_pro_portion) as kcal_vorher,
       round(protein_pro_portion) as protein_vorher,
       round(fett_pro_portion) as fett_vorher
from rezepte where id = 6;

begin;

update rezept_zutaten
set zutat_id      = (select id from zutaten where name = 'Räucherlachs'),
    menge_g       = 100,
    anzeige_menge = 100,
    anmerkung     = null
where rezept_id = 6 and zutat_id = 2;

commit;

select rezept_naehrwerte_neu_berechnen(6);

-- Vorher-Nachher
select v.kcal_vorher,    round(r.kcal_pro_portion)    as kcal_nachher,
       v.protein_vorher, round(r.protein_pro_portion) as protein_nachher,
       v.fett_vorher,    round(r.fett_pro_portion)    as fett_nachher
from rezepte r, rezept6_vorher v
where r.id = 6;

drop table rezept6_vorher;

-- Kontrolle: Verwendet noch irgendein Rezept frischen Lachs mit dem
-- Hinweis "geraeuchert"? Erwartung: 0 Zeilen.
select rezept_id, anmerkung
from rezept_zutaten
where zutat_id = 2 and anmerkung ilike '%räucher%';
