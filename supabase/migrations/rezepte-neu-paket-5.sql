-- BEREITS AUSGEFUEHRT (Stand: 2026-09-26, 80 Rezepte in der DB bestaetigt).
--
-- Migration: Neue Rezepte, Paket 5 von 7 (Rezepte 71-80, Abend)
--
-- Quelle: docs/gusto-70-neue-rezepte.md
-- Bilder liegen bereits im Bucket (rezept-71.png bis rezept-80.png).
--
-- Konventionen (siehe CLAUDE.md Abschnitt 9):
--   - rezepte.id ist GENERATED ALWAYS AS IDENTITY -> "overriding system
--     value", danach setval
--   - Abend: eigenschaft null
--   - diaeten: vegan steht allein; ohne Diaet leeres Array
--   - Getreide mit Werten fuer gekochten Zustand: menge_g gekocht,
--     Anmerkung mit Rohgewicht (Faktoren wie korrektur-getreide-gekocht.sql)
--
-- Keine neuen Zutaten noetig.
--
-- Abgrenzung zu Bestandsrezepten mit aehnlichem Titel:
--   73 vs. 21 (Lachs mit Spargel): hier Blechgericht mit Erdaepfeln und
--      Kraeuter-Joghurt-Dip statt Pfanne mit Vollkornreis
--   78 vs. 56 (Spaetzle mit Champignonrahm): hier mit Haehnchen und
--      Weisswein-Senf-Sauce
--   72 vs. 20 (Tofu-Pfanne mit Brokkoli): hier Tempeh mit suess-scharfer
--      Ahornsirup-Chili-Glasur auf Naturreis
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).
-- Danach korrektur-getreide-gekocht.sql erneut laufen lassen (laut
-- CLAUDE.md nach jedem Paket) - hier nur zur Sicherheit, die
-- Anmerkungen sind bereits korrekt gesetzt.

begin;

-- ------------------------------------------------------------
-- 1) Rezepte anlegen
-- ------------------------------------------------------------
insert into rezepte
  (id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten,
   zubereitungszeit_min, portionen)
overriding system value
values
  (71, 'Steak mit Ofenkarotten und Kräuterbutter',
   'Saftiges Steak mit glasierten Ofenkarotten und schmelzender Kräuterbutter.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-71.png'),
   'abend', null, array['glutenfrei'], 40, 1),

  (72, 'Tempeh-Pfanne mit Brokkoli',
   'Knusprig gebratener Tempeh mit Brokkoli in süß-scharfer Glasur auf Naturreis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-72.png'),
   'abend', null, array['vegan'], 30, 1),

  (73, 'Ofenlachs mit Spargel und Erdäpfeln',
   'Lachs, Spargel und Erdäpfel gemeinsam vom Blech, dazu ein Kräuter-Joghurt-Dip.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-73.png'),
   'abend', null, array['glutenfrei'], 40, 1),

  (74, 'Putenrouladen mit Gemüsereis',
   'Mit Spinat und Feta gefüllte Putenroulade auf buntem Gemüsereis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-74.png'),
   'abend', null, array['glutenfrei'], 45, 1),

  (75, 'Auberginen-Auflauf mit Feta',
   'Überbackene Auberginenscheiben mit Paradeisersauce, Kichererbsen und Feta.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-75.png'),
   'abend', null, array['vegetarisch','glutenfrei'], 50, 1),

  (76, 'Garnelenpfanne mit Knoblauch und Zucchini',
   'Garnelen in Knoblauchöl mit Zucchinibändern und Paradeisern.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-76.png'),
   'abend', null, array['glutenfrei'], 20, 1),

  (77, 'Chili sin Carne mit roten Linsen',
   'Würziges Chili mit roten Linsen, Kidneybohnen und Mais.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-77.png'),
   'abend', null, array['vegan','glutenfrei'], 40, 1),

  (78, 'Hähnchenbrust mit Champignonrahm und Spätzle',
   'Gebratene Hähnchenbrust in Weißwein-Senf-Rahmsauce mit Champignons und Spätzle.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-78.png'),
   'abend', null, array[]::text[], 35, 1),

  (79, 'Fischfilet mit Kräuterkruste und Erdäpfeln',
   'Kabeljau mit knuspriger Kräuterkruste, dazu Erdäpfel und Fisolen.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-79.png'),
   'abend', null, array[]::text[], 35, 1),

  (80, 'Quinoa-Pfanne mit Gemüse und Ei',
   'Quinoa mit buntem Pfannengemüse und Spiegeleiern.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-80.png'),
   'abend', null, array['vegetarisch','glutenfrei'], 25, 1);

select setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from rezepte));


-- ------------------------------------------------------------
-- 2) Zutaten der Rezepte
-- ------------------------------------------------------------
insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 71 Steak mit Ofenkarotten und Kraeuterbutter
  (71, 44,  160, 160, 'g',     null,               false, 0),
  (71, 27,  200,   4, 'Stück', 'längs halbiert',   false, 1),
  (71, 23,   10,   1, 'EL',    'weich, für die Kräuterbutter', false, 2),
  (71, 9,     5,   1, 'TL',    null,               false, 3),
  (71, 140,   5,   1, 'TL',    null,               false, 4),
  (71, 135,   5,   1, 'TL',    null,               false, 5),
  (71, 190,   5,   1, 'EL',    'fein gehackt',     false, 6),
  (71, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 7),
  (71, 203,   2, 0.5, 'TL',    null,               false, 8),
  (71, 184,   1,   1, 'TL',    null,               false, 9),
  (71, 175,   1,   1, 'Prise', null,               false, 10),
  (71, 176, 0.5,   1, 'Prise', null,               false, 11),

  -- 72 Tempeh-Pfanne mit Brokkoli
  (72, 49,  150, 150, 'g',     'in Scheiben',      false, 0),
  (72, 11,  150, 150, 'g',     'in Röschen',       false, 1),
  (72, 119, 120, 120, 'g',     'gekocht, ca. 40 g roh', false, 2),
  (72, 140,  10,   1, 'EL',    null,               false, 3),
  (72, 199,  15,   1, 'EL',    null,               false, 4),
  (72, 135,  10,   2, 'TL',    null,               false, 5),
  (72, 204,   5,   1, 'TL',    null,               false, 6),
  (72, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 7),
  (72, 182, 0.5,   1, 'Prise', null,               false, 8),
  (72, 194,  15,   1, 'Stück', 'in Ringen',        false, 9),
  (72, 151,   5,   1, 'TL',    null,               false, 10),

  -- 73 Ofenlachs mit Spargel und Erdaepfeln
  (73, 2,   140, 140, 'g',     null,               false, 0),
  (73, 17,  200, 200, 'g',     'klein, halbiert',  false, 1),
  (73, 162, 150, 150, 'g',     'holzige Enden entfernt', false, 2),
  (73, 35,   60,  60, 'g',     'für den Dip',      false, 3),
  (73, 9,    10,   2, 'TL',    null,               false, 4),
  (73, 203,  10,   2, 'TL',    null,               false, 5),
  (73, 91,    4,   1, 'Zehe',  'angedrückt',       false, 6),
  (73, 192,   5,   1, 'EL',    'geschnitten',      false, 7),
  (73, 175,   1,   1, 'Prise', null,               false, 8),
  (73, 176, 0.5,   1, 'Prise', null,               false, 9),

  -- 74 Putenrouladen mit Gemueseareis
  (74, 43,  170, 170, 'g',     'als ein Stück',    false, 0),
  (74, 119, 150, 150, 'g',     'gekocht, ca. 55 g roh', false, 1),
  (74, 12,   40,  40, 'g',     null,               false, 2),
  (74, 82,   30,  30, 'g',     'zerbröselt',       false, 3),
  (74, 27,   50, 0.5, 'Stück', 'fein gewürfelt',   false, 4),
  (74, 112,  50,  50, 'g',     'tiefgekühlt',      false, 5),
  (74, 90,   30, 0.25, 'Stück', 'fein gewürfelt',  false, 6),
  (74, 208,  80,  80, 'ml',    null,               false, 7),
  (74, 140,  10,   1, 'EL',    null,               false, 8),
  (74, 91,    2, 0.5, 'Zehe',  'fein gehackt',     false, 9),
  (74, 177,   1, 0.5, 'TL',    null,               false, 10),
  (74, 175,   1,   1, 'Prise', null,               false, 11),
  (74, 176, 0.5,   1, 'Prise', null,               false, 12),

  -- 75 Auberginen-Auflauf mit Feta
  (75, 88,  300,   1, 'Stück', 'groß',             false, 0),
  (75, 48,  120, 120, 'g',     'abgetropft',       false, 1),
  (75, 82,   60,  60, 'g',     'zerbröselt',       false, 2),
  (75, 213, 250, 250, 'ml',    null,               false, 3),
  (75, 9,    10,   2, 'TL',    null,               false, 4),
  (75, 90,   40, 0.5, 'Stück', 'fein gewürfelt',   false, 5),
  (75, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 6),
  (75, 183,   1,   1, 'TL',    null,               false, 7),
  (75, 175,   1,   1, 'Prise', null,               false, 8),
  (75, 176, 0.5,   1, 'Prise', null,               false, 9),
  (75, 191,   5,   4, 'Blätter', null,             true,  10),

  -- 76 Garnelenpfanne mit Knoblauch und Zucchini
  (76, 46,  200, 200, 'g',     'geschält',         false, 0),
  (76, 87,  250,   1, 'Stück', 'in Bändern',       false, 1),
  (76, 25,  100, 100, 'g',     'Cocktailparadeiser, halbiert', false, 2),
  (76, 9,    15,   1, 'EL',    null,               false, 3),
  (76, 91,    8,   2, 'Zehen', 'in Scheiben',      false, 4),
  (76, 203,  10,   2, 'TL',    null,               false, 5),
  (76, 182, 0.5,   1, 'Prise', null,               false, 6),
  (76, 190,  10,   2, 'EL',    'gehackt',          false, 7),
  (76, 175,   1,   1, 'Prise', null,               false, 8),
  (76, 176, 0.5,   1, 'Prise', null,               false, 9),

  -- 77 Chili sin Carne mit roten Linsen
  (77, 108, 150, 150, 'g',     'gekocht, ca. 50 g getrocknet', false, 0),
  (77, 109, 120, 120, 'g',     'abgetropft',       false, 1),
  (77, 100,  60,  60, 'g',     'abgetropft',       false, 2),
  (77, 13,  100,   1, 'Stück', 'gewürfelt',        false, 3),
  (77, 214, 200, 0.5, 'Dose',  null,               false, 4),
  (77, 206, 150, 150, 'ml',    null,               false, 5),
  (77, 90,   55, 0.5, 'Stück', 'fein gewürfelt',   false, 6),
  (77, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 7),
  (77, 198,  15,   1, 'EL',    null,               false, 8),
  (77, 140,  10,   1, 'EL',    null,               false, 9),
  (77, 180,   2,   1, 'TL',    null,               false, 10),
  (77, 177,   3,   1, 'TL',    null,               false, 11),
  (77, 182,   1,   2, 'Prisen', null,              false, 12),
  (77, 204,   5,   1, 'TL',    null,               false, 13),
  (77, 175,   1,   1, 'Prise', null,               false, 14),
  (77, 193,   5,   1, 'EL',    'gehackt',          true,  15),

  -- 78 Haehnchenbrust mit Champignonrahm und Spaetzle
  (78, 1,   160, 160, 'g',     null,               false, 0),
  (78, 218, 150, 150, 'g',     'aus dem Kühlregal', false, 1),
  (78, 92,  120, 120, 'g',     'in Scheiben',      false, 2),
  (78, 212,  50,  50, 'ml',    null,               false, 3),
  (78, 210,  40,  40, 'ml',    null,               false, 4),
  (78, 208,  60,  60, 'ml',    null,               false, 5),
  (78, 197,   5,   1, 'TL',    null,               false, 6),
  (78, 90,   40, 0.5, 'Stück', 'fein gewürfelt',   false, 7),
  (78, 140,  10,   1, 'EL',    null,               false, 8),
  (78, 184,   1,   1, 'TL',    null,               false, 9),
  (78, 175,   1,   1, 'Prise', null,               false, 10),
  (78, 176, 0.5,   1, 'Prise', null,               false, 11),
  (78, 190,   5,   1, 'EL',    'gehackt',          true,  12),

  -- 79 Fischfilet mit Kraeuterkruste und Erdaepfeln
  (79, 56,  180, 180, 'g',     'Filet',            false, 0),
  (79, 17,  200, 200, 'g',     'geschält',         false, 1),
  (79, 94,  100, 100, 'g',     null,               false, 2),
  (79, 216,  15,   2, 'EL',    null,               false, 3),
  (79, 116,  10,   1, 'EL',    'gerieben',         false, 4),
  (79, 23,   10,   1, 'EL',    'weich',            false, 5),
  (79, 190,  10,   2, 'EL',    'fein gehackt',     false, 6),
  (79, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 7),
  (79, 203,  10,   2, 'TL',    null,               false, 8),
  (79, 175,   1,   1, 'Prise', null,               false, 9),
  (79, 176, 0.5,   1, 'Prise', null,               false, 10),

  -- 80 Quinoa-Pfanne mit Gemuese und Ei
  (80, 59,  150, 150, 'g',     'gekocht, ca. 50 g roh', false, 0),
  (80, 4,   120,   2, 'Stück', null,               false, 1),
  (80, 13,  100,   1, 'Stück', 'gewürfelt',        false, 2),
  (80, 87,  100, 0.5, 'Stück', 'gewürfelt',        false, 3),
  (80, 12,   40,  40, 'g',     null,               false, 4),
  (80, 188,  40, 0.5, 'Stück', 'in Streifen',      false, 5),
  (80, 9,    10,   2, 'TL',    null,               false, 6),
  (80, 180,   1, 0.5, 'TL',    null,               false, 7),
  (80, 177,   2,   1, 'TL',    null,               false, 8),
  (80, 175,   1,   1, 'Prise', null,               false, 9),
  (80, 176, 0.5,   1, 'Prise', null,               false, 10),
  (80, 190,   5,   1, 'EL',    'gehackt',          true,  11),
  (80, 182, 0.5,   1, 'Prise', null,               true,  12);


-- ------------------------------------------------------------
-- 3) Anleitungen und Tipps
-- ------------------------------------------------------------
update rezepte set
  anleitung = $j$[
    {"text":"Steak eine halbe Stunde vor dem Braten aus dem Kühlschrank nehmen. Backrohr auf 200 Grad vorheizen.","aktion":"warten"},
    {"text":"Karotten längs halbieren, mit Olivenöl, Ahornsirup, Thymian und einer Prise Salz mischen und 25 Minuten rösten, bis sie weich und an den Rändern karamellisiert sind.","aktion":"roesten"},
    {"text":"Für die Kräuterbutter die weiche Butter mit Petersilie, Knoblauch, Zitronensaft und einer Prise Salz verkneten und kühl stellen.","aktion":"mischen"},
    {"text":"Steak trocken tupfen, kräftig salzen und pfeffern. Eine Pfanne sehr heiß werden lassen, Rapsöl hineingeben und das Steak pro Seite zwei bis drei Minuten braten.","aktion":"braten"},
    {"text":"Das Steak fünf Minuten ruhen lassen, damit sich der Saft verteilt.","aktion":"warten"},
    {"text":"Aufschneiden, mit den Karotten anrichten und die Kräuterbutter obenauf schmelzen lassen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Kräuterbutter auf Vorrat","text":"Gleich eine größere Menge machen, in Frischhaltefolie zu einer Rolle formen und einfrieren. Scheiben lassen sich gefroren abschneiden."},
    {"titel":"Junge Karotten","text":"Junge Karotten müssen nicht geschält werden - gründlich waschen reicht, und sie behalten mehr Geschmack."}
  ]$t$::jsonb
where id = 71;

update rezepte set
  anleitung = $j$[
    {"text":"Naturreis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Tempeh in dünne Scheiben schneiden, Brokkoli in Röschen teilen, Knoblauch fein hacken, Frühlingszwiebel in Ringe schneiden.","aktion":"schneiden"},
    {"text":"Sojasauce, Ahornsirup, Limettensaft und Chiliflocken mit zwei Esslöffeln Wasser zu einer Glasur verrühren.","aktion":"ruehren"},
    {"text":"Die Hälfte des Rapsöls erhitzen und den Tempeh von beiden Seiten goldbraun braten. Herausnehmen.","aktion":"braten"},
    {"text":"Restliches Öl in die Pfanne, Brokkoli drei Minuten anbraten, zwei Esslöffel Wasser dazugeben und zugedeckt zwei Minuten dämpfen. Knoblauch kurz mitbraten.","aktion":"braten"},
    {"text":"Tempeh und Glasur zurück in die Pfanne geben und einköcheln lassen, bis alles glänzt. Auf dem Reis anrichten, mit Sesam und Frühlingszwiebel bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Glasur im Auge behalten","text":"Der Ahornsirup karamellisiert schnell und brennt dann an. Sobald die Glasur glänzt und dicklich wird, vom Herd nehmen."},
    {"titel":"Schärfe nach Geschmack","text":"Eine Prise Chili gibt eine leichte Wärme. Wer es schärfer mag, nimmt die doppelte Menge oder eine frische Chili."}
  ]$t$::jsonb
where id = 72;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Erdäpfel halbieren, mit der Hälfte des Olivenöls und etwas Salz mischen und 20 Minuten rösten.","aktion":"roesten"},
    {"text":"Beim Spargel die holzigen Enden abschneiden. Weißen Spargel im unteren Drittel dünn schälen.","aktion":"schneiden"},
    {"text":"Spargel und Knoblauch zu den Erdäpfeln geben und mit dem restlichen Öl beträufeln. Lachs dazulegen, salzen, pfeffern und mit der Hälfte des Zitronensafts beträufeln. Weitere 12 bis 15 Minuten garen.","aktion":"roesten"},
    {"text":"Inzwischen griechisches Joghurt mit Schnittlauch, dem restlichen Zitronensaft und einer Prise Salz verrühren.","aktion":"ruehren"},
    {"text":"Alles vom Blech anrichten und den Dip dazu servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Grüner oder weißer Spargel","text":"Grüner Spargel muss nicht geschält werden und gart etwas schneller. Weißer braucht die vollen 15 Minuten."},
    {"titel":"Alles auf einem Blech","text":"Das Geheimnis ist die Reihenfolge: Erst was am längsten braucht, zum Schluss der Lachs. So wird alles gleichzeitig fertig."}
  ]$t$::jsonb
where id = 73;

update rezepte set
  anleitung = $j$[
    {"text":"Putenbrust zwischen Frischhaltefolie etwa einen Zentimeter dünn klopfen, salzen, pfeffern und mit Paprikapulver würzen.","aktion":"schneiden"},
    {"text":"Mit Spinat belegen, den Feta darüberbröseln, fest einrollen und mit Zahnstochern fixieren.","aktion":"mischen"},
    {"text":"Die Hälfte des Rapsöls erhitzen, die Roulade rundum anbraten, Hühnerbrühe angießen und zugedeckt 15 bis 20 Minuten schmoren.","aktion":"braten"},
    {"text":"Für den Gemüsereis Zwiebel und Karotte im restlichen Öl drei Minuten dünsten, Knoblauch, Erbsen und den gekochten Reis unterheben, erwärmen und salzen.","aktion":"braten"},
    {"text":"Roulade in Scheiben schneiden, auf dem Gemüsereis anrichten und den Schmorsaft darüberträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Gleichmäßig dünn klopfen","text":"Ist das Fleisch überall gleich dick, gart die Roulade gleichmäßig und bleibt überall saftig."},
    {"titel":"Feta salzt mit","text":"Beim Würzen des Fleisches sparsam mit Salz sein - der Feta in der Füllung bringt genug mit."}
  ]$t$::jsonb
where id = 74;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Aubergine in einen Zentimeter dicke Scheiben schneiden, dünn mit der Hälfte des Olivenöls bepinseln und auf einem Blech 15 Minuten vorbacken.","aktion":"roesten"},
    {"text":"Zwiebel und Knoblauch im restlichen Öl glasig dünsten. Passierte Tomaten, Kichererbsen und Oregano dazugeben, salzen, pfeffern und zehn Minuten köcheln lassen.","aktion":"kochen"},
    {"text":"In einer Auflaufform abwechselnd Sauce und Auberginenscheiben schichten, mit Sauce abschließen und den Feta darüberbröseln.","aktion":"mischen"},
    {"text":"25 Minuten backen, bis der Feta leicht gebräunt ist.","aktion":"roesten"},
    {"text":"Mit Basilikum belegen und servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Vorbacken statt Braten","text":"In der Pfanne saugt die Aubergine Unmengen Öl auf. Im Rohr vorgebacken braucht sie nur einen Bruchteil davon."},
    {"titel":"Aufgewärmt noch besser","text":"Der Auflauf lässt sich gut vorbereiten und schmeckt am nächsten Tag durchgezogen sogar besser."}
  ]$t$::jsonb
where id = 75;

update rezepte set
  anleitung = $j$[
    {"text":"Zucchini mit einem Sparschäler in lange Bänder schneiden, Paradeiser halbieren, Knoblauch in dünne Scheiben schneiden.","aktion":"schneiden"},
    {"text":"Olivenöl bei mittlerer Hitze erwärmen, Knoblauch und Chiliflocken eine Minute darin ziehen lassen, ohne dass der Knoblauch braun wird.","aktion":"braten"},
    {"text":"Garnelen dazugeben und pro Seite etwa zwei Minuten braten, bis sie rundum rosa sind. Herausnehmen.","aktion":"braten"},
    {"text":"Zucchinibänder und Paradeiser zwei bis drei Minuten in der Pfanne schwenken, bis die Zucchini gerade weich ist.","aktion":"braten"},
    {"text":"Garnelen zurückgeben, mit Zitronensaft, Salz und Pfeffer abschmecken und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Tiefgekühlte Garnelen","text":"Über Nacht im Kühlschrank auftauen und gut trocken tupfen - nasse Garnelen spritzen und braten nicht richtig."},
    {"titel":"Als ganze Mahlzeit","text":"Leicht und proteinreich wie es ist. Wer mehr möchte, gibt ein Stück Brot oder etwas Pasta dazu."}
  ]$t$::jsonb
where id = 76;

update rezepte set
  anleitung = $j$[
    {"text":"Zwiebel und Knoblauch fein hacken, Paprika würfeln.","aktion":"schneiden"},
    {"text":"Rapsöl in einem Topf erhitzen, die Zwiebel glasig dünsten. Knoblauch, Tomatenmark, Kreuzkümmel, Paprikapulver und Chiliflocken eine Minute mitrösten.","aktion":"roesten"},
    {"text":"Die getrockneten roten Linsen, gehackten Tomaten und die Gemüsebrühe dazugeben und 15 Minuten unter gelegentlichem Rühren köcheln lassen.","aktion":"kochen"},
    {"text":"Kidneybohnen, Mais und Paprika zugeben und weitere zehn Minuten köcheln lassen.","aktion":"kochen"},
    {"text":"Mit Limettensaft und Salz abschmecken und mit Koriander bestreut servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Warum rote Linsen","text":"Sie zerfallen beim Kochen und geben dem Chili die sämige Konsistenz, die sonst das Faschierte bringt."},
    {"titel":"Am nächsten Tag besser","text":"Chili zieht über Nacht durch. Gleich eine größere Menge kochen lohnt sich."}
  ]$t$::jsonb
where id = 77;

update rezepte set
  anleitung = $j$[
    {"text":"Hähnchen salzen und pfeffern. Champignons in Scheiben schneiden, Zwiebel fein würfeln.","aktion":"schneiden"},
    {"text":"Rapsöl in einer Pfanne erhitzen und das Hähnchen pro Seite fünf bis sechs Minuten goldbraun braten. Herausnehmen und warm halten.","aktion":"braten"},
    {"text":"Champignons in derselben Pfanne kräftig anbraten, bis sie Farbe bekommen. Zwiebel und Thymian dazugeben und kurz mitbraten.","aktion":"braten"},
    {"text":"Mit Weißwein ablöschen und fast vollständig einkochen lassen. Hühnerbrühe, Cremefine und Senf einrühren und drei Minuten köcheln lassen.","aktion":"ruehren"},
    {"text":"Spätzle nach Packungsanweisung erwärmen.","aktion":"kochen"},
    {"text":"Hähnchen in Scheiben schneiden, kurz in der Sauce wenden und mit den Spätzle anrichten. Mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Ohne Wein","text":"Den Weißwein durch dieselbe Menge Brühe und einen Spritzer Zitronensaft ersetzen."},
    {"titel":"Der Senf macht es","text":"Der Senf bindet die Sauce und gibt ihr eine feine Schärfe, die gut zum Hähnchen passt."}
  ]$t$::jsonb
where id = 78;

update rezepte set
  anleitung = $j$[
    {"text":"Erdäpfel in Stücke schneiden und in Salzwasser 20 Minuten weich kochen. Die Fisolen in den letzten acht Minuten mitgaren.","aktion":"kochen"},
    {"text":"Backrohr auf 200 Grad vorheizen. Petersilie mit Semmelbröseln, Parmesan, weicher Butter und Knoblauch zu einer krümeligen Masse verkneten.","aktion":"mischen"},
    {"text":"Fisch trocken tupfen, salzen und in eine kleine Form legen. Die Kräutermasse gleichmäßig daraufdrücken.","aktion":"mischen"},
    {"text":"12 bis 15 Minuten backen, bis die Kruste goldbraun und der Fisch innen gerade weiß ist.","aktion":"roesten"},
    {"text":"Mit Erdäpfeln und Fisolen anrichten und mit Zitronensaft beträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Dicke Filets","text":"Ein dickes Stück Kabeljau bleibt saftiger als dünne Filets, die unter der Kruste schnell trocken werden."},
    {"titel":"Tiefgekühlter Fisch","text":"Über Nacht im Kühlschrank auftauen und sehr gut trocken tupfen, sonst weicht die Kruste von unten durch."}
  ]$t$::jsonb
where id = 79;

update rezepte set
  anleitung = $j$[
    {"text":"Quinoa gründlich abspülen und nach Packungsanweisung garen - oder Reste vom Vortag verwenden.","aktion":"kochen"},
    {"text":"Paprika und Zucchini würfeln, rote Zwiebel in Streifen schneiden.","aktion":"schneiden"},
    {"text":"Olivenöl in einer Pfanne erhitzen und das Gemüse fünf Minuten braten. Kreuzkümmel und Paprikapulver dazugeben, dann Quinoa und Spinat unterheben und zwei Minuten mitbraten. Salzen und pfeffern.","aktion":"braten"},
    {"text":"Zwei Mulden in die Quinoa drücken, die Eier hineinschlagen und zugedeckt vier bis fünf Minuten stocken lassen.","aktion":"braten"},
    {"text":"Mit Petersilie und Chiliflocken bestreuen und direkt aus der Pfanne servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Resteverwertung","text":"Die Pfanne ist ideal für übrig gebliebene Quinoa oder Reis und fast jedes Gemüse, das noch im Kühlschrank liegt."},
    {"titel":"Eigelb flüssig","text":"Sobald das Eiweiß weiß ist, vom Herd nehmen. Das Eigelb bleibt dann flüssig und wird zur Sauce."}
  ]$t$::jsonb
where id = 80;

commit;


-- ------------------------------------------------------------
-- 4) Naehrwerte berechnen und kontrollieren
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 71 and 80;

select id, titel, diaeten, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 71 and 80
order by id;

-- Gesamtzahl Rezepte (erwartet 80)
select count(*) as rezepte_gesamt from rezepte;
