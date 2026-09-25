-- ZULETZT AUSGEFUEHRT: 2026-09-25 (nach Rezepte-Paket 4, Stand 70 Rezepte).
-- Wiederholbar - siehe CLAUDE.md Abschnitt 9: nach jedem neuen
-- Rezepte-Paket erneut ausfuehren, nicht als einmalig erledigt markieren.
--
-- Korrektur: Getreide und Huelsenfruechte - gekocht vs. roh
--
-- Problem: Diese Zutaten haben in der Tabelle zutaten Naehrwerte fuer den
-- GEKOCHTEN Zustand (z. B. Reis 130 kcal/100 g). In vielen Rezepten stand
-- aber nur "Reis · 80 g". Wer das liest, wiegt rohen Reis ab und hat
-- gekocht die rund dreifache Menge auf dem Teller - die angezeigten
-- Naehrwerte stimmen dann nicht mehr.
--
-- Loesung: Bei jeder dieser Zeilen steht die Menge als gekochtes Gewicht,
-- und die Anmerkung nennt das zugehoerige Rohgewicht, z. B.
-- "Reis · 150 g · gekocht, ca. 55 g roh".
--
-- Das Rohgewicht wird aus dem Energieverhaeltnis abgeleitet:
--   Faktor = kcal roh / kcal gekocht (DB-Wert)
--   Beispiel Reis: ~350 / 130 = 2,7  ->  150 g gekocht = ca. 55 g roh
-- Nur so passt die Anmerkung exakt zu den berechneten Naehrwerten.
-- Gerundet auf 5 g.
--
-- Die Naehrwerte der Rezepte aendern sich NICHT - menge_g bleibt, es
-- aendert sich nur die Anzeige. Keine Neuberechnung noetig.
--
-- Das Skript ist wiederholbar: Es kann nach jedem neuen Rezept-Paket
-- erneut laufen und bringt alle betroffenen Zeilen auf denselben Stand.
--
-- Zusaetzlich (Teil 2): Fertigkomponenten wie Spaetzle oder Gnocchi
-- waren als "Grundzutat" markiert und erschienen im Kochmodus deshalb als
-- kleiner Chip unter "Aus dem Vorrat". Das sind aber Hauptbestandteile,
-- die man einkauft - sie werden auf normale Zutaten zurueckgestellt.
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).

begin;

-- ------------------------------------------------------------
-- Teil 1: Anmerkungen fuer gekochte Getreide und Huelsenfruechte
-- ------------------------------------------------------------
update rezept_zutaten rz
set anzeige_menge   = rz.menge_g,
    anzeige_einheit = 'g',
    anmerkung       = 'gekocht, ca. '
                      || greatest(5, round(rz.menge_g / f.faktor / 5) * 5)::int
                      || ' g ' || f.rohwort
from (values
  (5,   2.7,  'roh'),            -- Reis
  (18,  2.8,  'roh'),            -- Vollkornnudeln
  (20,  3.0,  'roh'),            -- Hirse
  (28,  2.9,  'getrocknet'),     -- Linsen
  (58,  3.15, 'roh'),            -- Vollkornreis
  (59,  3.05, 'roh'),            -- Quinoa
  (60,  3.7,  'roh'),            -- Buchweizen
  (63,  3.35, 'roh'),            -- Couscous
  (64,  2.8,  'roh'),            -- Vollkornpenne
  (108, 2.9,  'getrocknet'),     -- Rote Linsen
  (119, 2.85, 'roh'),            -- Naturreis
  (120, 2.9,  'roh'),            -- Basmatireis
  (121, 3.5,  'roh'),            -- Wildreis
  (123, 4.2,  'Polentagrieß'),   -- Polenta
  (220, 2.25, 'roh')             -- Spaghetti (gekocht)
) as f(zutat_id, faktor, rohwort)
where rz.zutat_id = f.zutat_id;


-- ------------------------------------------------------------
-- Teil 2: Fertigkomponenten sind keine Vorrats-Zutaten
-- ------------------------------------------------------------
update zutaten
set ist_grundzutat = false
where id in (
  217,  -- Semmelknoedel (gekocht)
  218,  -- Spaetzle (gekocht)
  219,  -- Gnocchi (Fertigpackung)
  220,  -- Spaghetti (gekocht)
  221,  -- Weizentortilla / Wrap
  222   -- Blaetterteig
);

commit;


-- ------------------------------------------------------------
-- Kontrolle
-- ------------------------------------------------------------
select r.id, r.titel, z.name, rz.menge_g, rz.anmerkung
from rezept_zutaten rz
join zutaten z on z.id = rz.zutat_id
join rezepte r on r.id = rz.rezept_id
where rz.zutat_id in (5,18,20,28,58,59,60,63,64,108,119,120,121,123,220)
order by r.id;

select id, name, ist_grundzutat
from zutaten
where id between 217 and 222
order by id;
