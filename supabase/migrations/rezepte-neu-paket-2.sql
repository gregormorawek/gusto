-- BEREITS AUSGEFUEHRT (Stand: 2026-09-25, 50 Rezepte in der DB bestaetigt).
-- Nur noch als Dokumentation im Repo, nicht erneut ausfuehren.
--
-- Migration: Neue Rezepte, Paket 2 von 7 (Rezepte 41-50)
--   41-45 Fruehstueck, 46-50 Mittag
--
-- Quelle: docs/gusto-70-neue-rezepte.md
-- Bilder liegen bereits im Bucket (rezept-41.png bis rezept-50.png).
--
-- Konventionen (von Claude Code an Paket 1 gegen den Bestand geprueft):
--   - mahlzeit: 'fruehstueck' / 'mittag' / 'abend' / 'snack'
--   - eigenschaft: 'suess' / 'deftig' nur bei Fruehstueck und Snack,
--     bei Mittag und Abend null (wie im Bestand)
--   - diaeten: text-Array; vegane Rezepte tragen NUR 'vegan', nicht
--     zusaetzlich 'vegetarisch' (wie im Bestand). Rezepte ohne Diaet
--     bekommen ein leeres Array (Spalte ist NOT NULL).
--   - id ist eine Identity-Spalte (GENERATED ALWAYS) - explizite IDs
--     brauchen "overriding system value", danach wird die Sequenz
--     nachgestellt. (Korrektur: in der ersten Fassung fehlte beides.)
--   - bild_url aus Rezept 1 abgeleitet
--
-- Portionsgroessen: Anders als beim Bestand sind die Mengen hier von
-- Anfang an auf realistische Einzelportionen ausgelegt (z. B. 150 g
-- gekochter Reis statt 80 g).
--
-- Rezept 46 ist Gregors Huehnergulasch, von 4 Portionen auf 1 Portion
-- umgerechnet (portionen bleibt 1, wie bei allen Rezepten, bis die
-- Personenzahl-Einstellung gebaut ist).
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).

begin;

-- ------------------------------------------------------------
-- 1) Fehlende Zutaten ergaenzen
-- ------------------------------------------------------------
insert into zutaten
  (name, kategorie, aktiv, kalorien, protein_g, carbs_g, fett_g, portion_g,
   mahlzeiten, diaeten, eigenschaft, supermarkt_kategorie, ist_grundzutat)
values
  ('Haferdrink',       'carbs',   true, 46,  1.0,  6.7, 1.5, 250,
   'fruehstueck,mittag,abend,snack', null, null, 'milch_eier', false),
  ('Putenfaschiertes', 'protein', true, 148, 19.7, 0,   7.7, 150,
   'fruehstueck,mittag,abend,snack', null, null, 'fleisch_fisch', false);


-- ------------------------------------------------------------
-- 2) Rezepte anlegen
-- ------------------------------------------------------------
insert into rezepte
  (id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten,
   zubereitungszeit_min, portionen)
overriding system value
values
  (41, 'Avocado-Brot mit pochiertem Ei',
   'Roggenbrot mit Hüttenkäse, Avocadocreme und zwei pochierten Eiern.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-41.png'),
   'fruehstueck', 'deftig', array['vegetarisch'], 15, 1),

  (42, 'Protein-French-Toast',
   'Vollkornbrot in Eimasse gebacken, mit Skyr, Beeren und Ahornsirup.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-42.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 15, 1),

  (43, 'Haferflocken-Waffeln mit Skyr',
   'Knusprige Waffeln aus Haferflocken, dazu Skyr und Heidelbeeren.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-43.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 20, 1),

  (44, 'Frühstücks-Burrito mit Rührei',
   'Warmer Wrap mit Rührei, Kidneybohnen, Paprika und Gouda.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-44.png'),
   'fruehstueck', 'deftig', array['vegetarisch'], 15, 1),

  (45, 'Bananen-Haferbrei mit Walnüssen',
   'Cremiger Haferbrei mit zerdrückter Banane und gerösteten Walnüssen.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-45.png'),
   'fruehstueck', 'suess', array['vegan'], 10, 1),

  (46, 'Hühnergulasch mit Semmelknödeln',
   'Saftiges Wiener Gulasch mit Hühnerbrust, cremiger Sauce und Semmelknödeln.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-46.png'),
   'mittag', null, array[]::text[], 50, 1),

  (47, 'Putenfleischbällchen in Tomatensauce',
   'Fleischbällchen aus Putenfaschiertem in würziger Paradeisersauce.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-47.png'),
   'mittag', null, array[]::text[], 35, 1),

  (48, 'Hähnchen-Reispfanne süßsauer',
   'Hähnchenstreifen mit Paprika und Ananas auf Reis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-48.png'),
   'mittag', null, array[]::text[], 30, 1),

  (49, 'Gnocchi-Pfanne mit Spinat und Parmesan',
   'Goldbraun gebratene Gnocchi mit Blattspinat und Parmesan.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-49.png'),
   'mittag', null, array['vegetarisch'], 20, 1),

  (50, 'Thunfisch-Quinoa-Salat',
   'Frischer Quinoa-Salat mit Thunfisch, Gurke, Mais und Paradeisern.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-50.png'),
   'mittag', null, array['glutenfrei'], 25, 1);

-- Sequenz auf den neuen Hoechstwert setzen, damit kuenftige Inserts
-- ohne explizite ID nicht mit 41-50 kollidieren.
select setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from rezepte));


-- ------------------------------------------------------------
-- 3) Zutaten der Rezepte
--    Neue bzw. in Paket 1 angelegte Zutaten per exaktem Namen aufgeloest.
-- ------------------------------------------------------------
insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 41 Avocado-Brot mit pochiertem Ei
  (41, 34,   60,   2, 'Scheiben', null,            false, 0),
  (41, 4,   120,   2, 'Stück', null,               false, 1),
  (41, 8,    80, 0.5, 'Stück', null,               false, 2),
  (41, 50,   80,  80, 'g',     null,               false, 3),
  (41, 42,   40,   3, 'Stück', 'in dünnen Scheiben', false, 4),
  (41, 203,   5,   1, 'TL',    null,               false, 5),
  (41, 175,   1,   1, 'Prise', null,               false, 6),
  (41, 176, 0.5,   1, 'Prise', null,               false, 7),
  (41, 170,   5,   1, 'EL',    null,               true,  8),
  (41, 182, 0.5,   1, 'Prise', null,               true,  9),

  -- 42 Protein-French-Toast
  (42, 61,   60,   2, 'Scheiben', null,            false, 0),
  (42, 4,    60,   1, 'Stück', null,               false, 1),
  (42, 172,  60,   2, 'Stück', null,               false, 2),
  (42, (select id from zutaten where name = 'Milch (1,5 %)'), 50, 50, 'ml', null, false, 3),
  (42, 51,  100, 100, 'g',     null,               false, 4),
  (42, 69,   60,  60, 'g',     'geviertelt',       false, 5),
  (42, 31,   40,  40, 'g',     null,               false, 6),
  (42, 23,    5,   1, 'TL',    null,               false, 7),
  (42, 135,  10,   2, 'TL',    null,               false, 8),
  (42, 185,   1, 0.5, 'TL',    null,               false, 9),

  -- 43 Haferflocken-Waffeln mit Skyr
  (43, 7,    50,  50, 'g',     null,               false, 0),
  (43, 4,    60,   1, 'Stück', null,               false, 1),
  (43, 173,  60,  60, 'g',     null,               false, 2),
  (43, 51,  100, 100, 'g',     null,               false, 3),
  (43, 31,   80,  80, 'g',     null,               false, 4),
  (43, (select id from zutaten where name = 'Backpulver'), 4, 1, 'TL', null, false, 5),
  (43, 185,   1, 0.5, 'TL',    null,               false, 6),
  (43, 140,   3, 0.5, 'TL',    'fürs Waffeleisen', false, 7),
  (43, 135,  10,   2, 'TL',    null,               false, 8),

  -- 44 Fruehstuecks-Burrito mit Ruehrei
  (44, 221,  60,   1, 'Stück', null,               false, 0),
  (44, 4,   120,   2, 'Stück', null,               false, 1),
  (44, 109,  60,  60, 'g',     'abgetropft',       false, 2),
  (44, 13,   60, 0.5, 'Stück', 'gewürfelt',        false, 3),
  (44, 25,   50, 0.5, 'Stück', 'gewürfelt',        false, 4),
  (44, 146,  20,  20, 'g',     'gerieben',         false, 5),
  (44, 140,   5,   1, 'TL',    null,               false, 6),
  (44, 175,   1,   1, 'Prise', null,               false, 7),
  (44, 176, 0.5,   1, 'Prise', null,               false, 8),
  (44, 182, 0.5,   1, 'Prise', null,               true,  9),
  (44, 193,   5,   1, 'EL',    'gehackt',          true,  10),

  -- 45 Bananen-Haferbrei mit Walnuessen
  (45, 7,    60,  60, 'g',     null,               false, 0),
  (45, (select id from zutaten where name = 'Haferdrink'), 250, 250, 'ml', null, false, 1),
  (45, 30,  120,   1, 'Stück', 'reif',             false, 2),
  (45, 22,   15,  15, 'g',     'grob gehackt',     false, 3),
  (45, 78,   10,   1, 'EL',    null,               false, 4),
  (45, 185,   1, 0.5, 'TL',    null,               false, 5),
  (45, 135,  10,   2, 'TL',    null,               true,  6),

  -- 46 Huehnergulasch mit Semmelknoedeln (Gregors Rezept, 1 Portion)
  (46, 1,   200, 200, 'g',     'in Würfeln',       false, 0),
  (46, 217, 100,   1, 'Stück', 'Fertigpackung',    false, 1),
  (46, 90,   80, 0.75, 'Stück', 'fein gewürfelt',  false, 2),
  (46, 212,  40,  40, 'ml',    null,               false, 3),
  (46, 207, 100, 100, 'ml',    null,               false, 4),
  (46, 209,  40,  40, 'ml',    null,               false, 5),
  (46, 140,  10,   1, 'EL',    null,               false, 6),
  (46, 198,   8, 0.5, 'EL',    null,               false, 7),
  (46, 196,   5,   1, 'TL',    null,               false, 8),
  (46, 177,   3, 1.5, 'TL',    null,               false, 9),
  (46, 215,   4,   1, 'TL',    null,               false, 10),
  (46, 179, 0.3,   1, 'Prise', null,               false, 11),
  (46, 175,   1,   1, 'Prise', null,               false, 12),
  (46, 176, 0.5,   1, 'Prise', null,               false, 13),
  (46, 178, 0.3,   1, 'Prise', null,               true,  14),
  (46, 190,   5,   1, 'EL',    'gehackt',          true,  15),

  -- 47 Putenfleischbaellchen in Tomatensauce
  (47, (select id from zutaten where name = 'Putenfaschiertes'), 150, 150, 'g', null, false, 0),
  (47, 213, 250, 250, 'ml',    null,               false, 1),
  (47, 172,  30,   1, 'Stück', null,               false, 2),
  (47, 216,  15,   2, 'EL',    null,               false, 3),
  (47, 90,   30, 0.25, 'Stück', 'sehr fein gehackt', false, 4),
  (47, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 5),
  (47, 9,    10,   2, 'TL',    null,               false, 6),
  (47, 183,   1,   1, 'TL',    null,               false, 7),
  (47, 175,   1,   1, 'Prise', null,               false, 8),
  (47, 176, 0.5,   1, 'Prise', null,               false, 9),
  (47, 116,  10,   1, 'EL',    'gerieben',         true,  10),
  (47, 191,   5,   4, 'Blätter', null,             true,  11),

  -- 48 Haehnchen-Reispfanne suesssauer
  (48, 1,   150, 150, 'g',     'in Streifen',      false, 0),
  (48, 5,   150, 150, 'g',     null,               false, 1),
  (48, 13,  100,   1, 'Stück', 'in Stücken',       false, 2),
  (48, 71,   80,  80, 'g',     'in Stücken',       false, 3),
  (48, 90,   40, 0.5, 'Stück', 'in Spalten',       false, 4),
  (48, 140,  10,   1, 'EL',    null,               false, 5),
  (48, 199,  15,   1, 'EL',    null,               false, 6),
  (48, 198,  10,   2, 'TL',    null,               false, 7),
  (48, 29,   10,   2, 'TL',    null,               false, 8),
  (48, 202,  10,   2, 'TL',    null,               false, 9),
  (48, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 10),
  (48, 189,   5,   1, 'Stück', 'daumennagelgroß',  false, 11),
  (48, 194,  15,   1, 'Stück', 'in Ringen',        true,  12),

  -- 49 Gnocchi-Pfanne mit Spinat und Parmesan
  (49, 219, 250, 250, 'g',     null,               false, 0),
  (49, 12,  100, 100, 'g',     null,               false, 1),
  (49, 25,   80,  80, 'g',     'halbiert',         false, 2),
  (49, 116,  25,  25, 'g',     'gerieben',         false, 3),
  (49, 23,   10,   1, 'EL',    null,               false, 4),
  (49, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 5),
  (49, 186, 0.5,   1, 'Prise', null,               false, 6),
  (49, 175,   1,   1, 'Prise', null,               false, 7),
  (49, 176, 0.5,   1, 'Prise', null,               false, 8),

  -- 50 Thunfisch-Quinoa-Salat
  (50, 47,  120, 120, 'g',     'abgetropft',       false, 0),
  (50, 59,  150, 150, 'g',     null,               false, 1),
  (50, 41,   80, 0.3, 'Stück', 'gewürfelt',        false, 2),
  (50, 25,  100, 100, 'g',     'gewürfelt',        false, 3),
  (50, 100,  40,  40, 'g',     null,               false, 4),
  (50, 188,  20, 0.25, 'Stück', 'fein gewürfelt',  false, 5),
  (50, 9,    10,   2, 'TL',    null,               false, 6),
  (50, 203,  10,   2, 'TL',    null,               false, 7),
  (50, 175,   1,   1, 'Prise', null,               false, 8),
  (50, 176, 0.5,   1, 'Prise', null,               false, 9),
  (50, 190,   5,   1, 'EL',    'gehackt',          true,  10);


-- ------------------------------------------------------------
-- 4) Anleitungen und Tipps
-- ------------------------------------------------------------
update rezepte set
  anleitung = $j$[
    {"text":"Radieschen in dünne Scheiben schneiden. Avocado halbieren, das Fruchtfleisch herauslösen und mit Zitronensaft, Salz und Pfeffer zerdrücken.","aktion":"schneiden"},
    {"text":"Wasser in einem Topf zum Sieden bringen, es soll nur leicht simmern, nicht sprudeln. Die Eier einzeln in eine Tasse schlagen.","aktion":"kochen"},
    {"text":"Mit einem Löffel einen Strudel ins Wasser rühren und die Eier nacheinander hineingleiten lassen. Drei bis vier Minuten ziehen lassen, dann mit einem Schaumlöffel herausheben.","aktion":"kochen"},
    {"text":"Roggenbrot rösten, zuerst den Hüttenkäse, dann die Avocadocreme daraufstreichen.","aktion":"roesten"},
    {"text":"Radieschen und die pochierten Eier daraufsetzen, mit Kresse und Chiliflocken bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Frische Eier pochieren besser","text":"Je frischer das Ei, desto fester hält das Eiweiß zusammen. Ältere Eier zerfasern im Wasser."},
    {"titel":"Warum Hüttenkäse","text":"Die Schicht unter der Avocado bringt zusätzliches Protein und hält das Brot länger knusprig."}
  ]$t$::jsonb
where id = 41;

update rezepte set
  anleitung = $j$[
    {"text":"Ei, Eiklar, Milch und Zimt in einem tiefen Teller verquirlen.","aktion":"ruehren"},
    {"text":"Die Brotscheiben darin von beiden Seiten einweichen, bis sie sich vollgesogen haben.","aktion":"mischen"},
    {"text":"Butter in einer Pfanne bei mittlerer Hitze schmelzen und das Brot pro Seite zwei bis drei Minuten goldbraun backen.","aktion":"braten"},
    {"text":"Inzwischen die Erdbeeren vierteln und den Skyr glattrühren.","aktion":"schneiden"},
    {"text":"French Toast mit Skyr, Beeren und Ahornsirup servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Brot vom Vortag","text":"Leicht altbackenes Brot saugt die Eimasse besser auf und zerfällt beim Braten nicht."},
    {"titel":"Warum Eiklar","text":"Das zusätzliche Eiklar bringt Protein, ohne dass der French Toast schwer oder fettig wird."}
  ]$t$::jsonb
where id = 42;

update rezepte set
  anleitung = $j$[
    {"text":"Haferflocken im Mixer fein mahlen und mit Ei, Magerquark, Backpulver und Zimt zu einem glatten Teig verrühren. Fünf Minuten quellen lassen.","aktion":"mischen"},
    {"text":"Das Waffeleisen vorheizen und dünn mit Rapsöl einpinseln.","aktion":"braten"},
    {"text":"Den Teig portionsweise einfüllen und jede Waffel drei bis vier Minuten goldbraun backen.","aktion":"braten"},
    {"text":"Mit Skyr, Heidelbeeren und Ahornsirup servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Ohne Waffeleisen","text":"Der Teig funktioniert genauso als kleine Pancakes in der Pfanne."},
    {"titel":"Knusprig bleiben","text":"Fertige Waffeln nicht stapeln, sondern kurz auf einem Gitter auskühlen lassen, sonst werden sie weich."}
  ]$t$::jsonb
where id = 43;

update rezepte set
  anleitung = $j$[
    {"text":"Paprika und Paradeiser würfeln, Kidneybohnen abspülen und abtropfen lassen.","aktion":"schneiden"},
    {"text":"Rapsöl in einer Pfanne erhitzen, Paprika drei Minuten anbraten, dann die Bohnen dazugeben und kurz mitwärmen.","aktion":"braten"},
    {"text":"Eier mit Salz und Pfeffer verquirlen, in die Pfanne gießen und bei kleiner Hitze cremig stocken lassen.","aktion":"braten"},
    {"text":"Die Tortilla ohne Fett kurz in einer zweiten Pfanne erwärmen, damit sie geschmeidig wird und beim Rollen nicht reißt.","aktion":"roesten"},
    {"text":"Rührei-Mischung, Paradeiser und Gouda in die Mitte geben, die Seiten einschlagen, fest aufrollen und halbieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Knusprige Außenseite","text":"Den gerollten Burrito mit der Naht nach unten kurz in die heiße Pfanne legen, dann bleibt er geschlossen und wird außen knusprig."},
    {"titel":"Auf Vorrat","text":"In Alufolie gewickelt lassen sich Burritos einfrieren und im Backrohr aufwärmen."}
  ]$t$::jsonb
where id = 44;

update rezepte set
  anleitung = $j$[
    {"text":"Die Hälfte der Banane mit einer Gabel zerdrücken, den Rest in Scheiben schneiden.","aktion":"schneiden"},
    {"text":"Haferflocken mit Haferdrink, zerdrückter Banane, Chiasamen und Zimt aufkochen und drei bis vier Minuten unter Rühren köcheln lassen.","aktion":"kochen"},
    {"text":"Walnüsse grob hacken und in einer trockenen Pfanne kurz anrösten.","aktion":"roesten"},
    {"text":"Den Haferbrei in eine Schüssel füllen, mit Bananenscheiben und Walnüssen belegen und nach Belieben mit Ahornsirup süßen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Reife Banane nehmen","text":"Je brauner die Schale, desto süßer die Banane - dann braucht der Brei keinen Sirup mehr."},
    {"titel":"Eine Prise Salz","text":"Klingt seltsam, aber eine Prise Salz im Topf macht den Brei runder und hebt die Süße."}
  ]$t$::jsonb
where id = 45;

update rezepte set
  anleitung = $j$[
    {"text":"Hühnerbrust in etwa drei Zentimeter große Würfel schneiden, salzen, pfeffern und gleichmäßig im Mehl wenden. Die Zwiebel fein würfeln.","aktion":"schneiden"},
    {"text":"Öl in einem Topf bei mittlerer Hitze erhitzen und die Zwiebel langsam goldbraun anschwitzen. Das dauert acht bis zehn Minuten und ist der Geschmacksträger des Gulaschs.","aktion":"braten"},
    {"text":"Tomatenmark und Senf ein bis zwei Minuten mitrösten, dann das Paprikapulver einrühren und nur kurz anschwitzen - es darf nicht verbrennen, sonst wird es bitter.","aktion":"roesten"},
    {"text":"Die Hühnerwürfel dazugeben und bei etwas höherer Hitze rundum anbraten, bis sie leicht Farbe bekommen. Mit Rotwein ablöschen und kurz einkochen lassen.","aktion":"braten"},
    {"text":"Rinderbrühe und Kümmel einrühren, zudecken und bei kleiner Hitze 25 bis 30 Minuten sanft köcheln lassen. Parallel den Semmelknödel laut Packung in gesalzenem Wasser ziehen lassen - nicht kochen.","aktion":"kochen"},
    {"text":"Cremefine einrühren, fünf Minuten offen köcheln lassen, bis die Sauce sämig ist, und abschmecken. Mit dem Semmelknödel anrichten und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Für mehrere Personen","text":"Gulasch lohnt sich in größeren Mengen - alle Zutaten einfach vervielfachen. Aufgewärmt am nächsten Tag schmeckt es noch besser."},
    {"titel":"Noch saftiger","text":"Ausgelöste Hühnerschenkel statt Brust vertragen längeres Schmoren und werden noch zarter."},
    {"titel":"Ohne Wein","text":"Den Rotwein durch mehr Rinderbrühe und einen Teelöffel Worcestersauce ersetzen."},
    {"titel":"Sauce zu dünn","text":"Einen Teelöffel Mehl mit etwas kaltem Wasser glattrühren, einrühren und kurz aufkochen lassen."}
  ]$t$::jsonb
where id = 46;

update rezepte set
  anleitung = $j$[
    {"text":"Zwiebel und Knoblauch sehr fein hacken.","aktion":"schneiden"},
    {"text":"Putenfaschiertes mit Eiklar, Semmelbröseln, der Hälfte der Zwiebel, Salz und Pfeffer verkneten und mit nassen Händen zu kleinen Bällchen formen.","aktion":"mischen"},
    {"text":"Olivenöl in einer Pfanne erhitzen, die Bällchen rundum braun anbraten und herausnehmen.","aktion":"braten"},
    {"text":"Restliche Zwiebel und Knoblauch im Bratfett glasig dünsten, passierte Tomaten und Oregano dazugeben, salzen und pfeffern.","aktion":"ruehren"},
    {"text":"Die Bällchen zurück in die Sauce legen und zugedeckt 15 Minuten köcheln lassen, bis sie durchgegart sind.","aktion":"kochen"},
    {"text":"Mit Parmesan und Basilikum servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nasse Hände","text":"Das Faschierte klebt nicht an feuchten Händen, und die Bällchen werden gleichmäßig rund."},
    {"titel":"Als ganze Mahlzeit","text":"Passt zu Nudeln, Polenta oder einem Stück Brot zum Auftunken der Sauce."}
  ]$t$::jsonb
where id = 47;

update rezepte set
  anleitung = $j$[
    {"text":"Reis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Hähnchen in Streifen schneiden, Paprika und Ananas in Stücke, Zwiebel in Spalten. Knoblauch und Ingwer fein hacken.","aktion":"schneiden"},
    {"text":"Sojasauce, Tomatenmark, Honig und Essig mit drei Esslöffeln Wasser zu einer Sauce verrühren.","aktion":"ruehren"},
    {"text":"Rapsöl in einer Pfanne stark erhitzen, das Hähnchen rundum anbraten und herausnehmen.","aktion":"braten"},
    {"text":"Zwiebel, Paprika, Knoblauch und Ingwer zwei Minuten braten, Ananas dazugeben, dann Sauce und Hähnchen zurück in die Pfanne. Einköcheln lassen, bis alles glänzt.","aktion":"braten"},
    {"text":"Auf dem Reis anrichten und mit Frühlingszwiebel bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Frische Ananas","text":"Frische Ananas karamellisiert beim Braten leicht und schmeckt deutlich besser als aus der Dose."},
    {"titel":"Heiß und schnell","text":"Die Pfanne muss richtig heiß sein, damit das Gemüse Biss behält statt im eigenen Saft zu garen."}
  ]$t$::jsonb
where id = 48;

update rezepte set
  anleitung = $j$[
    {"text":"Paradeiser halbieren, Knoblauch fein hacken.","aktion":"schneiden"},
    {"text":"Butter in einer großen Pfanne schmelzen, die Gnocchi direkt aus der Packung hineingeben und bei mittlerer Hitze acht bis zehn Minuten goldbraun braten, dabei gelegentlich wenden.","aktion":"braten"},
    {"text":"Knoblauch und Paradeiser dazugeben und zwei Minuten mitbraten.","aktion":"braten"},
    {"text":"Den Spinat unterheben und zusammenfallen lassen, mit Salz, Pfeffer und Muskat würzen.","aktion":"ruehren"},
    {"text":"Mit reichlich Parmesan bestreut servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nicht vorkochen","text":"Fertig-Gnocchi direkt in die Pfanne - ungekocht werden sie außen knusprig und bleiben innen weich."},
    {"titel":"Platz lassen","text":"Die Gnocchi sollen nebeneinander liegen, nicht übereinander. Sonst dämpfen sie statt zu braten."}
  ]$t$::jsonb
where id = 49;

update rezepte set
  anleitung = $j$[
    {"text":"Quinoa gründlich abspülen, nach Packungsanweisung garen und auskühlen lassen.","aktion":"kochen"},
    {"text":"Gurke und Paradeiser würfeln, rote Zwiebel fein hacken.","aktion":"schneiden"},
    {"text":"Olivenöl, Zitronensaft, Salz und Pfeffer zu einem Dressing verrühren.","aktion":"ruehren"},
    {"text":"Quinoa mit Gemüse, Mais und Thunfisch vermengen und das Dressing unterheben.","aktion":"mischen"},
    {"text":"Mit Petersilie bestreuen und servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Gut vorzubereiten","text":"Der Salat hält sich im Kühlschrank zwei Tage und eignet sich gut zum Mitnehmen."},
    {"titel":"Thunfisch im eigenen Saft","text":"Thunfisch im eigenen Saft statt in Öl spart deutlich Kalorien, die Nährwerte hier sind darauf ausgelegt."}
  ]$t$::jsonb
where id = 50;

commit;


-- ------------------------------------------------------------
-- 5) Naehrwerte berechnen und kontrollieren
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 41 and 50;

select id, titel, mahlzeit, eigenschaft, diaeten, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 41 and 50
order by id;

-- Zutatenzahl je Rezept (erwartet 7 bis 16)
select rezept_id, count(*) as zutaten
from rezept_zutaten
where rezept_id between 41 and 50
group by rezept_id
order by rezept_id;

-- Gesamtzahl Rezepte (erwartet 50)
select count(*) as rezepte_gesamt from rezepte;
