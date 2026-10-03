-- ZULETZT AUSGEFUEHRT: 2026-09-30 (Einkaufslisten-Umbau, Stand 100 Rezepte).
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
-- Seit dem Einkaufslisten-Umbau (30.09.2026, CLAUDE.md Abschnitt 12) steht
-- der Faktor selbst in zutaten.roh_faktor (EINE Quelle statt zwei) - dieses
-- Skript und die Einkaufsliste (einkaufsMengeFormatieren in
-- einkaufsliste.js) lesen beide von dort, statt den Faktor je einmal
-- hartcodiert zu halten. Nur das WORT nach der Zahl ("roh"/"getrocknet"/
-- "Polentagrieß") ist reine Beschriftung ohne eigenen Rechenwert und bleibt
-- deshalb als kleine Ausnahmeliste hier stehen.
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
-- Teil 1: Anmerkungen fuer gekochte Getreide und Huelsenfruechte -
-- Faktor kommt aus zutaten.roh_faktor, nur das "rohwort" bleibt als
-- Ausnahmeliste (Standard 'roh', siehe COALESCE unten).
-- ------------------------------------------------------------
update rezept_zutaten rz
set anzeige_menge   = rz.menge_g,
    anzeige_einheit = 'g',
    anmerkung       = 'gekocht, ca. '
                      || greatest(5, round(rz.menge_g / z.roh_faktor / 5) * 5)::int
                      || ' g ' || coalesce(w.rohwort, 'roh')
from zutaten z
left join (values
  (28,  'getrocknet'),     -- Linsen
  (108, 'getrocknet'),     -- Rote Linsen
  (123, 'Polentagrieß')    -- Polenta
) as w(zutat_id, rohwort) on w.zutat_id = z.id
where rz.zutat_id = z.id
  and z.roh_faktor is not null;


-- ------------------------------------------------------------
-- Teil 2: Fertigkomponenten sind keine Vorrats-Zutaten
-- ------------------------------------------------------------
update zutaten
set ist_grundzutat = false
where id in (
  217,  -- Semmelknoedel (gekocht)
  218,  -- Spaetzle (gekocht)
  219,  -- Gnocchi (Fertigpackung)
  220,  -- Spaghetti (fertig gekocht verkauft, siehe Fertigkomponenten oben)
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
where z.roh_faktor is not null
order by r.id;

select id, name, ist_grundzutat
from zutaten
where id between 217 and 222
order by id;
