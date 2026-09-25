-- BEREITS AUSGEFUEHRT (Stand: 2026-09-25, 70 Rezepte in der DB bestaetigt).
-- Nur noch als Dokumentation im Repo, nicht erneut ausfuehren.
--
-- Migration: Neue Rezepte, Paket 4 von 7 (Rezepte 61-70)
--   61-65 Mittag, 66-70 Abend
--
-- Quelle: docs/gusto-70-neue-rezepte.md
-- Bilder liegen bereits im Bucket (rezept-61.png bis rezept-70.png).
--
-- Konventionen (siehe CLAUDE.md Abschnitt 9):
--   - rezepte.id ist GENERATED ALWAYS AS IDENTITY -> explizite IDs mit
--     "overriding system value", danach setval
--   - Mittag und Abend: eigenschaft null
--   - diaeten: vegan steht allein; ohne Diaet leeres Array
--   - Getreide mit Naehrwerten fuer den gekochten Zustand: menge_g ist
--     das Gekocht-Gewicht, Anmerkung nennt das Rohgewicht (Faktoren wie
--     in korrektur-getreide-gekocht.sql)
--
-- Keine neuen Zutaten noetig - alles ist bereits in der Datenbank.
--
-- VORAUSSETZUNG: korrektur-getreide-gekocht.sql wurde vorher ausgefuehrt
-- (dort werden Spaghetti als normale Zutat statt Vorrat markiert, was
-- Rezept 70 betrifft).
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).

begin;

-- ------------------------------------------------------------
-- 1) Rezepte anlegen
-- ------------------------------------------------------------
insert into rezepte
  (id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten,
   zubereitungszeit_min, portionen)
overriding system value
values
  (61, 'Reispfanne mit Edamame und Ei',
   'Gebratener Reis mit Edamame, Ei und Frühlingszwiebel.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-61.png'),
   'mittag', null, array['vegetarisch'], 20, 1),

  (62, 'Erdäpfel-Paprika-Gulasch',
   'Deftiges Erdäpfelgulasch mit Paprika, weißen Bohnen und Kümmel.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-62.png'),
   'mittag', null, array['vegan','glutenfrei'], 45, 1),

  (63, 'Hähnchen-Caesar-Bowl',
   'Knackiger Salat mit gebratenem Hähnchen, Croûtons und leichtem Joghurt-Dressing.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-63.png'),
   'mittag', null, array[]::text[], 25, 1),

  (64, 'Buchweizen-Bowl mit Ofenkarotten',
   'Buchweizen mit karamellisierten Ofenkarotten, Kichererbsen und Tahinisauce.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-64.png'),
   'mittag', null, array['vegan','glutenfrei'], 35, 1),

  (65, 'Tofu-Curry mit Kokosmilch',
   'Cremiges Curry mit knusprigem Tofu und Gemüse auf Basmatireis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-65.png'),
   'mittag', null, array['vegan','glutenfrei'], 30, 1),

  (66, 'Lachsfilet mit Ofengemüse',
   'Lachsfilet mit buntem Röstgemüse und Erdäpfeln vom Blech.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-66.png'),
   'abend', null, array['glutenfrei'], 40, 1),

  (67, 'Zucchini-Lasagne mit Faschiertem',
   'Lasagne mit Zucchinischeiben statt Nudelblättern.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-67.png'),
   'abend', null, array['glutenfrei'], 60, 1),

  (68, 'Gefüllte Paprika mit Reis und Pute',
   'Im Ofen gebackene Paprika, gefüllt mit Reis und Putenfaschiertem, in Paradeisersauce.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-68.png'),
   'abend', null, array['glutenfrei'], 55, 1),

  (69, 'Hähnchen-Spieße mit Erdnusssauce',
   'Gebratene Hähnchenspieße mit cremiger Erdnusssauce, Reis und Gurke.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-69.png'),
   'abend', null, array[]::text[], 35, 1),

  (70, 'Cremige Nudeln mit Hüttenkäse',
   'Nudeln in samtiger Hüttenkäsesauce mit gebratenen Paradeisern.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-70.png'),
   'abend', null, array['vegetarisch'], 20, 1);

select setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from rezepte));


-- ------------------------------------------------------------
-- 2) Zutaten der Rezepte
-- ------------------------------------------------------------
insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 61 Reispfanne mit Edamame und Ei
  (61, 5,   150, 150, 'g',     'gekocht, ca. 55 g roh', false, 0),
  (61, 4,   120,   2, 'Stück', null,               false, 1),
  (61, 107,  80,  80, 'g',     null,               false, 2),
  (61, 27,   50, 0.5, 'Stück', 'klein gewürfelt',  false, 3),
  (61, 194,  15,   1, 'Stück', 'in Ringen',        false, 4),
  (61, 140,  10,   1, 'EL',    null,               false, 5),
  (61, 199,  15,   1, 'EL',    null,               false, 6),
  (61, 74,    5,   1, 'TL',    null,               false, 7),
  (61, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 8),
  (61, 189,   5,   1, 'Stück', 'daumennagelgroß',  false, 9),

  -- 62 Erdaepfel-Paprika-Gulasch
  (62, 17,  300, 300, 'g',     'mehligkochend, gewürfelt', false, 0),
  (62, 110, 100, 100, 'g',     'abgetropft',       false, 1),
  (62, 13,  150, 1.5, 'Stück', 'gewürfelt',        false, 2),
  (62, 90,  110,   1, 'Stück', 'fein geschnitten', false, 3),
  (62, 206, 300, 300, 'ml',    null,               false, 4),
  (62, 140,  10,   1, 'EL',    null,               false, 5),
  (62, 198,  15,   1, 'EL',    null,               false, 6),
  (62, 177,   6,   2, 'TL',    null,               false, 7),
  (62, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 8),
  (62, 179,   1, 0.5, 'TL',    null,               false, 9),
  (62, 202,   5,   1, 'TL',    null,               false, 10),
  (62, 187, 0.2,   1, 'Stück', null,               false, 11),
  (62, 175,   1,   1, 'Prise', null,               false, 12),
  (62, 176, 0.5,   1, 'Prise', null,               false, 13),

  -- 63 Haehnchen-Caesar-Bowl
  (63, 1,   150, 150, 'g',     null,               false, 0),
  (63, 98,  120, 120, 'g',     'Romanasalat',      false, 1),
  (63, 61,   30,   1, 'Scheibe', 'gewürfelt',      false, 2),
  (63, 116,  15,  15, 'g',     'gerieben',         false, 3),
  (63, 35,   50,  50, 'g',     null,               false, 4),
  (63, 9,    10,   2, 'TL',    null,               false, 5),
  (63, 203,  10,   2, 'TL',    null,               false, 6),
  (63, 197,   5,   1, 'TL',    null,               false, 7),
  (63, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 8),
  (63, 200,   3, 0.5, 'TL',    null,               false, 9),
  (63, 175,   1,   1, 'Prise', null,               false, 10),
  (63, 176, 0.5,   1, 'Prise', null,               false, 11),

  -- 64 Buchweizen-Bowl mit Ofenkarotten
  (64, 60,  150, 150, 'g',     'gekocht, ca. 40 g roh', false, 0),
  (64, 27,  200,   4, 'Stück', 'längs geviertelt', false, 1),
  (64, 48,  100, 100, 'g',     'abgetropft',       false, 2),
  (64, 86,   20,   1, 'EL',    null,               false, 3),
  (64, 9,    10,   2, 'TL',    null,               false, 4),
  (64, 203,  10,   2, 'TL',    null,               false, 5),
  (64, 135,   5,   1, 'TL',    null,               false, 6),
  (64, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 7),
  (64, 180,   1, 0.5, 'TL',    null,               false, 8),
  (64, 175,   1,   1, 'Prise', null,               false, 9),
  (64, 190,  10,   2, 'EL',    'gehackt',          false, 10),
  (64, 151,   5,   1, 'TL',    null,               true,  11),

  -- 65 Tofu-Curry mit Kokosmilch
  (65, 3,   180, 180, 'g',     'gewürfelt',        false, 0),
  (65, 120, 120, 120, 'g',     'gekocht, ca. 40 g roh', false, 1),
  (65, 143,  80,  80, 'ml',    null,               false, 2),
  (65, 11,  100, 100, 'g',     'in Röschen',       false, 3),
  (65, 13,   80, 0.5, 'Stück', 'in Streifen',      false, 4),
  (65, 94,   60,  60, 'g',     'halbiert',         false, 5),
  (65, 90,   40, 0.5, 'Stück', 'fein gewürfelt',   false, 6),
  (65, 140,  10,   1, 'EL',    null,               false, 7),
  (65, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 8),
  (65, 189,  10,   1, 'Stück', 'daumengroß',       false, 9),
  (65, 181,   3,   1, 'TL',    null,               false, 10),
  (65, 204,   5,   1, 'TL',    null,               false, 11),
  (65, 175,   1,   1, 'Prise', null,               false, 12),
  (65, 193,   5,   1, 'EL',    'gehackt',          true,  13),

  -- 66 Lachsfilet mit Ofengemuese
  (66, 2,   150, 150, 'g',     null,               false, 0),
  (66, 17,  150, 150, 'g',     'klein, halbiert',  false, 1),
  (66, 87,  100, 0.5, 'Stück', 'gewürfelt',        false, 2),
  (66, 13,  100,   1, 'Stück', 'gewürfelt',        false, 3),
  (66, 25,   80,  80, 'g',     'Cocktailparadeiser', false, 4),
  (66, 188,  50, 0.5, 'Stück', 'in Spalten',       false, 5),
  (66, 9,    10,   2, 'TL',    null,               false, 6),
  (66, 203,  10,   2, 'TL',    null,               false, 7),
  (66, 91,    4,   1, 'Zehe',  'angedrückt',       false, 8),
  (66, 184,   1,   1, 'TL',    null,               false, 9),
  (66, 175,   1,   1, 'Prise', null,               false, 10),
  (66, 176, 0.5,   1, 'Prise', null,               false, 11),
  (66, 190,   5,   1, 'EL',    'gehackt',          true,  12),

  -- 67 Zucchini-Lasagne mit Faschiertem
  (67, 14,  120, 120, 'g',     null,               false, 0),
  (67, 87,  250,   1, 'Stück', 'längs in dünnen Scheiben', false, 1),
  (67, 213, 200, 200, 'ml',    null,               false, 2),
  (67, 115,  50,  50, 'g',     null,               false, 3),
  (67, 53,   40,  40, 'g',     'in Scheiben',      false, 4),
  (67, 90,   40, 0.5, 'Stück', 'fein gewürfelt',   false, 5),
  (67, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 6),
  (67, 198,  10,   2, 'TL',    null,               false, 7),
  (67, 9,     5,   1, 'TL',    null,               false, 8),
  (67, 183,   1,   1, 'TL',    null,               false, 9),
  (67, 175,   1,   1, 'Prise', null,               false, 10),
  (67, 176, 0.5,   1, 'Prise', null,               false, 11),
  (67, 191,   5,   4, 'Blätter', null,             true,  12),

  -- 68 Gefuellte Paprika mit Reis und Pute
  (68, 13,  300,   2, 'Stück', 'groß',             false, 0),
  (68, (select id from zutaten where name = 'Putenfaschiertes'), 130, 130, 'g', null, false, 1),
  (68, 5,    80,  80, 'g',     'gekocht, ca. 30 g roh', false, 2),
  (68, 213, 200, 200, 'ml',    null,               false, 3),
  (68, 146,  20,  20, 'g',     'gerieben',         false, 4),
  (68, 90,   40, 0.5, 'Stück', 'fein gewürfelt',   false, 5),
  (68, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 6),
  (68, 9,     5,   1, 'TL',    null,               false, 7),
  (68, 177,   2,   1, 'TL',    null,               false, 8),
  (68, 175,   1,   1, 'Prise', null,               false, 9),
  (68, 176, 0.5,   1, 'Prise', null,               false, 10),
  (68, 190,   5,   1, 'EL',    'gehackt',          true,  11),

  -- 69 Haehnchen-Spiesse mit Erdnusssauce
  (69, 1,   170, 170, 'g',     'in Würfeln',       false, 0),
  (69, 120, 120, 120, 'g',     'gekocht, ca. 40 g roh', false, 1),
  (69, 40,   25, 1.5, 'EL',    null,               false, 2),
  (69, 143,  40,  40, 'ml',    null,               false, 3),
  (69, 41,   80,  80, 'g',     'in Scheiben',      false, 4),
  (69, 199,  15,   1, 'EL',    null,               false, 5),
  (69, 204,  10,   2, 'TL',    null,               false, 6),
  (69, 29,    5,   1, 'TL',    null,               false, 7),
  (69, 140,   5,   1, 'TL',    null,               false, 8),
  (69, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 9),
  (69, 189,   5,   1, 'Stück', 'daumennagelgroß',  false, 10),
  (69, 181,   1, 0.5, 'TL',    null,               false, 11),
  (69, 193,   5,   1, 'EL',    'gehackt',          true,  12),
  (69, 195,  10,   1, 'Stück', 'in Ringen',        true,  13),

  -- 70 Cremige Nudeln mit Huettenkaese
  (70, 220, 200, 200, 'g',     'gekocht, ca. 90 g roh', false, 0),
  (70, 50,  150, 150, 'g',     null,               false, 1),
  (70, 25,  120, 120, 'g',     'Cocktailparadeiser, halbiert', false, 2),
  (70, 116,  15,  15, 'g',     'gerieben',         false, 3),
  (70, 9,     5,   1, 'TL',    null,               false, 4),
  (70, 91,    4,   1, 'Zehe',  null,               false, 5),
  (70, 175,   1,   1, 'Prise', null,               false, 6),
  (70, 176, 0.5,   1, 'Prise', null,               false, 7),
  (70, 191,   5,   4, 'Blätter', null,             true,  8),
  (70, 182, 0.5,   1, 'Prise', null,               true,  9);


-- ------------------------------------------------------------
-- 3) Anleitungen und Tipps
-- ------------------------------------------------------------
update rezepte set
  anleitung = $j$[
    {"text":"Karotte klein würfeln, Frühlingszwiebel in Ringe schneiden, Knoblauch und Ingwer fein hacken.","aktion":"schneiden"},
    {"text":"Edamame nach Packungsanweisung garen und abgießen.","aktion":"kochen"},
    {"text":"Rapsöl in einer großen Pfanne stark erhitzen, Karotte zwei Minuten braten, dann Knoblauch und Ingwer kurz mitbraten.","aktion":"braten"},
    {"text":"Den kalten Reis dazugeben und unter Wenden drei bis vier Minuten braten, bis er leicht knusprig wird.","aktion":"braten"},
    {"text":"Den Reis zur Seite schieben, die Eier in die freie Stelle schlagen, verrühren und stocken lassen, dann alles vermischen.","aktion":"braten"},
    {"text":"Edamame, Sojasauce und Sesamöl unterheben und mit Frühlingszwiebel bestreut servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Reis vom Vortag","text":"Frisch gekochter Reis klebt in der Pfanne zusammen. Kalter Reis vom Vortag ist trockener und wird beim Braten schön körnig."},
    {"titel":"Richtig heiß","text":"Die Pfanne muss sehr heiß sein - nur dann röstet der Reis, statt zu dämpfen."}
  ]$t$::jsonb
where id = 61;

update rezepte set
  anleitung = $j$[
    {"text":"Zwiebel fein schneiden, Erdäpfel schälen und würfeln, Paprika würfeln, Knoblauch hacken.","aktion":"schneiden"},
    {"text":"Rapsöl in einem Topf erhitzen und die Zwiebel acht bis zehn Minuten goldbraun rösten.","aktion":"roesten"},
    {"text":"Tomatenmark kurz mitrösten. Topf vom Herd nehmen, Paprikapulver einrühren und sofort mit Essig und einem Schuss Brühe ablöschen.","aktion":"ruehren"},
    {"text":"Erdäpfel, Paprika, Knoblauch, Kümmel, Lorbeerblatt und die restliche Brühe dazugeben und 25 Minuten köcheln lassen, bis die Erdäpfel weich sind.","aktion":"kochen"},
    {"text":"Die weißen Bohnen die letzten fünf Minuten mitwärmen. Ein paar Erdäpfelwürfel am Topfrand zerdrücken, das bindet die Sauce. Lorbeerblatt entfernen und abschmecken.","aktion":"ruehren"},
    {"text":"In tiefen Tellern servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Mehligkochende Erdäpfel","text":"Sie zerfallen am Rand leicht und machen das Gulasch sämig. Festkochende bleiben in Form, die Sauce wird dann dünner."},
    {"titel":"Paprikapulver nie in heißes Fett","text":"Den Topf vor dem Einrühren vom Herd nehmen. Verbranntes Paprikapulver macht das ganze Gulasch bitter."}
  ]$t$::jsonb
where id = 62;

update rezepte set
  anleitung = $j$[
    {"text":"Griechisches Joghurt mit der Hälfte des Parmesans, Senf, Zitronensaft, Knoblauch, Worcestersauce und einem Teelöffel Olivenöl zu einem Dressing verrühren. Mit Salz und Pfeffer abschmecken.","aktion":"ruehren"},
    {"text":"Das Brot würfeln und im restlichen Olivenöl in einer Pfanne goldbraun rösten. Herausnehmen.","aktion":"roesten"},
    {"text":"Hähnchen salzen und pfeffern und in derselben Pfanne pro Seite etwa sechs Minuten braten. Zwei Minuten ruhen lassen, dann in Scheiben schneiden.","aktion":"braten"},
    {"text":"Salat waschen, gut trocken schleudern, in mundgerechte Stücke zupfen und mit dem Dressing mischen.","aktion":"mischen"},
    {"text":"Hähnchen und Croûtons auf dem Salat anrichten und mit dem restlichen Parmesan bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Trockener Salat","text":"Nasser Salat verwässert das Dressing und es haftet nicht. Gründlich trocken schleudern lohnt sich."},
    {"titel":"Glutenfrei","text":"Ohne Croûtons ist die Bowl glutenfrei - das Dressing selbst enthält kein Gluten."}
  ]$t$::jsonb
where id = 63;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Karotten längs vierteln, Kichererbsen abtropfen und trocken tupfen.","aktion":"schneiden"},
    {"text":"Karotten und Kichererbsen mit Olivenöl, Ahornsirup, Kreuzkümmel und Salz mischen und auf einem Blech verteilen.","aktion":"mischen"},
    {"text":"25 Minuten rösten, bis die Karotten weich und an den Rändern karamellisiert sind.","aktion":"roesten"},
    {"text":"Inzwischen den Buchweizen abspülen und nach Packungsanweisung garen. Tahini mit Zitronensaft, Knoblauch und zwei bis drei Esslöffeln Wasser glattrühren.","aktion":"kochen"},
    {"text":"Buchweizen in eine Schüssel geben, Karotten und Kichererbsen daraufsetzen, mit Tahinisauce beträufeln und mit Petersilie und Sesam bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nussiger Buchweizen","text":"Den trockenen Buchweizen vor dem Kochen zwei Minuten in einer Pfanne ohne Fett rösten - er schmeckt dann deutlich nussiger."},
    {"titel":"Sauce zu dick","text":"Tahini zieht beim Stehen nach. Einfach löffelweise Wasser einrühren."}
  ]$t$::jsonb
where id = 64;

update rezepte set
  anleitung = $j$[
    {"text":"Basmatireis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Tofu trocken tupfen und würfeln. Brokkoli in Röschen teilen, Paprika in Streifen schneiden, Fisolen halbieren. Zwiebel, Knoblauch und Ingwer fein hacken.","aktion":"schneiden"},
    {"text":"Die Hälfte des Rapsöls erhitzen und den Tofu rundum knusprig braten. Herausnehmen.","aktion":"braten"},
    {"text":"Restliches Öl in die Pfanne geben, Zwiebel, Knoblauch, Ingwer und Currypulver eine Minute anrösten, bis es duftet.","aktion":"braten"},
    {"text":"Kokosmilch und 100 ml Wasser angießen, das Gemüse dazugeben und sechs bis acht Minuten köcheln lassen, bis es bissfest ist.","aktion":"kochen"},
    {"text":"Tofu unterheben, mit Limettensaft und Salz abschmecken und mit Reis und Koriander servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Tofu erst zum Schluss","text":"Kommt der Tofu erst am Ende zurück in die Sauce, bleibt er knusprig statt weich zu werden."},
    {"titel":"Gemüse nach Saison","text":"Das Curry funktioniert mit fast jedem Gemüse - im Herbst etwa mit Kürbis oder Karfiol."}
  ]$t$::jsonb
where id = 65;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Erdäpfel halbieren, Zucchini und Paprika würfeln, rote Zwiebel in Spalten schneiden.","aktion":"schneiden"},
    {"text":"Das Gemüse ohne die Paradeiser mit Olivenöl, Knoblauch, Thymian, Salz und Pfeffer mischen und 20 Minuten rösten.","aktion":"roesten"},
    {"text":"Paradeiser dazugeben, den Lachs mit der Hautseite nach unten auf das Gemüse legen, salzen und mit Zitronensaft beträufeln. Weitere 12 bis 15 Minuten garen.","aktion":"roesten"},
    {"text":"Mit Petersilie bestreuen und direkt vom Blech servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Erdäpfel klein schneiden","text":"Große Stücke werden in der Zeit nicht gar. Kleine Erdäpfel halbieren, größere vierteln."},
    {"titel":"Lachs nicht übergaren","text":"In der Mitte darf der Lachs noch leicht glasig sein - er gart auf dem heißen Blech nach."}
  ]$t$::jsonb
where id = 66;

update rezepte set
  anleitung = $j$[
    {"text":"Zucchini längs in dünne Scheiben schneiden, leicht salzen und zehn Minuten ziehen lassen. Das austretende Wasser mit Küchenpapier abtupfen.","aktion":"schneiden"},
    {"text":"Zwiebel und Knoblauch fein hacken und in Olivenöl glasig dünsten. Faschiertes zugeben und krümelig anbraten, dann das Tomatenmark kurz mitrösten.","aktion":"braten"},
    {"text":"Passierte Tomaten und Oregano dazugeben, mit Salz und Pfeffer würzen und zehn Minuten einköcheln lassen.","aktion":"kochen"},
    {"text":"Backrohr auf 190 Grad vorheizen. In einer kleinen Auflaufform abwechselnd Sauce, Zucchinischeiben und Ricotta schichten. Mit Sauce abschließen und mit Mozzarella belegen.","aktion":"mischen"},
    {"text":"30 Minuten backen, bis der Käse goldbraun ist. Fünf Minuten ruhen lassen und mit Basilikum servieren.","aktion":"roesten"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Salzen gegen Wasser","text":"Ohne das Vorsalzen geben die Zucchini im Rohr viel Wasser ab und die Lasagne schwimmt."},
    {"titel":"Ruhen lassen","text":"Nach dem Backen fünf Minuten warten - dann lässt sich die Lasagne sauber in Stücke schneiden."}
  ]$t$::jsonb
where id = 67;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 190 Grad vorheizen. Von den Paprika einen Deckel abschneiden und die Kerne entfernen. Zwiebel und Knoblauch fein hacken.","aktion":"schneiden"},
    {"text":"Putenfaschiertes mit Reis, Zwiebel, Knoblauch, Paprikapulver, Salz und Pfeffer gut vermengen.","aktion":"mischen"},
    {"text":"Die Paprika mit der Masse füllen, Deckel aufsetzen und in eine Auflaufform stellen.","aktion":"mischen"},
    {"text":"Passierte Tomaten mit Olivenöl und einer Prise Salz verrühren und rund um die Paprika in die Form gießen.","aktion":"ruehren"},
    {"text":"Zugedeckt 30 Minuten backen. Deckel abnehmen, Gouda auf die Füllung streuen und offen weitere zehn Minuten backen.","aktion":"roesten"},
    {"text":"Paprika mit der Paradeisersauce anrichten und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Reis vorgegart","text":"Der Reis muss vorher gekocht sein - roh würde er in der Paprika nicht weich. Reis vom Vortag ist ideal."},
    {"titel":"Stabil stehen","text":"Wackelt eine Paprika, unten eine hauchdünne Scheibe abschneiden, ohne ein Loch zu machen."}
  ]$t$::jsonb
where id = 68;

update rezepte set
  anleitung = $j$[
    {"text":"Holzspieße 20 Minuten in Wasser legen. Hähnchen würfeln und mit der Hälfte der Sojasauce, Currypulver und Knoblauch 15 Minuten marinieren.","aktion":"warten"},
    {"text":"Inzwischen den Basmatireis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Erdnussbutter mit Kokosmilch, restlicher Sojasauce, Limettensaft, Honig und Ingwer glattrühren und in einem kleinen Topf kurz erwärmen.","aktion":"ruehren"},
    {"text":"Hähnchen auf die Spieße stecken und in einer Pfanne mit Rapsöl rundum acht bis zehn Minuten goldbraun braten.","aktion":"braten"},
    {"text":"Gurke in Scheiben schneiden. Spieße mit Reis und Gurke anrichten, Erdnusssauce darübergeben und mit Koriander und Chili bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Spieße wässern","text":"Eingeweichte Holzspieße brennen in der Pfanne oder am Grill nicht an."},
    {"titel":"Sauce zu dick","text":"Erdnusssauce dickt beim Abkühlen nach. Mit einem Schuss warmem Wasser wird sie wieder cremig."}
  ]$t$::jsonb
where id = 69;

update rezepte set
  anleitung = $j$[
    {"text":"Spaghetti nach Packungsanweisung kochen und vor dem Abgießen eine Tasse Nudelwasser aufheben.","aktion":"kochen"},
    {"text":"Hüttenkäse mit Parmesan, Knoblauch und zwei bis drei Esslöffeln Nudelwasser im Mixer glatt pürieren.","aktion":"mischen"},
    {"text":"Olivenöl in einer Pfanne erhitzen und die Paradeiser zwei bis drei Minuten braten, bis sie aufplatzen.","aktion":"braten"},
    {"text":"Nudeln in die Pfanne geben, die Pfanne vom Herd nehmen und die Hüttenkäsesauce unterheben. Mit Nudelwasser cremig rühren - nicht mehr kochen lassen.","aktion":"ruehren"},
    {"text":"Mit Salz und Pfeffer abschmecken, mit Basilikum und Chiliflocken servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nicht mehr kochen","text":"Hüttenkäse flockt bei zu viel Hitze aus. Die Sauce erst unterheben, wenn die Pfanne vom Herd ist."},
    {"titel":"Nudelwasser ist der Trick","text":"Die Stärke im Nudelwasser bindet die Sauce und macht sie seidig - Wasser aus der Leitung funktioniert dafür nicht."}
  ]$t$::jsonb
where id = 70;

commit;


-- ------------------------------------------------------------
-- 4) Naehrwerte berechnen und kontrollieren
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 61 and 70;

select id, titel, mahlzeit, diaeten, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 61 and 70
order by id;

-- Gesamtzahl Rezepte (erwartet 70)
select count(*) as rezepte_gesamt from rezepte;
