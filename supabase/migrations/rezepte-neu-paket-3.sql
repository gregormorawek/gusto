-- BEREITS AUSGEFUEHRT (Stand: 2026-09-25, 70 Rezepte in der DB bestaetigt).
-- Nur noch als Dokumentation im Repo, nicht erneut ausfuehren.
--
-- Migration: Neue Rezepte, Paket 3 von 7 (Rezepte 51-60, Mittag)
--
-- Quelle: docs/gusto-70-neue-rezepte.md
-- Bilder liegen bereits im Bucket (rezept-51.png bis rezept-60.png).
--
-- Konventionen (siehe CLAUDE.md Abschnitt 9):
--   - rezepte.id ist GENERATED ALWAYS AS IDENTITY -> explizite IDs mit
--     "overriding system value", danach setval auf die Sequenz
--   - mahlzeit 'mittag', eigenschaft null (wie im Bestand)
--   - diaeten: vegane Rezepte tragen nur 'vegan'; ohne Diaet: leeres Array
--   - bild_url aus Rezept 1 abgeleitet
--
-- NEU in diesem Paket - Getreide und Huelsenfruechte:
--   Die Naehrwerte dieser Zutaten sind in der Datenbank fuer den
--   GEKOCHTEN Zustand gespeichert (z. B. Reis 130 kcal/100 g). menge_g
--   ist daher das Gewicht nach dem Kochen. Damit niemand 150 g
--   ungekochten Reis abwiegt (das waere die dreifache Menge), steht in
--   der Anmerkung jeweils das ungefaehre Rohgewicht.
--
-- In Supabase SQL Editor ausfuehren (Projekt: wruiyvttftiyskyjjuio).

begin;

-- ------------------------------------------------------------
-- 1) Fehlende Zutat ergaenzen
-- ------------------------------------------------------------
insert into zutaten
  (name, kategorie, aktiv, kalorien, protein_g, carbs_g, fett_g, portion_g,
   mahlzeiten, diaeten, eigenschaft, supermarkt_kategorie, ist_grundzutat)
values
  ('Rindfleisch (Wadschinken)', 'protein', true, 125, 21, 0, 4.5, 180,
   'fruehstueck,mittag,abend,snack', null, null, 'fleisch_fisch', false);


-- ------------------------------------------------------------
-- 2) Rezepte anlegen
-- ------------------------------------------------------------
insert into rezepte
  (id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten,
   zubereitungszeit_min, portionen)
overriding system value
values
  (51, 'Linsensuppe mit Wurzelgemüse',
   'Herzhafte Linsensuppe mit Karotten, Sellerie und Pastinaken.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-51.png'),
   'mittag', null, array['vegan','glutenfrei'], 45, 1),

  (52, 'Hähnchen-Wrap mit Joghurtsauce',
   'Wrap mit gebratenem Hähnchen, Salat und frischer Joghurtsauce.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-52.png'),
   'mittag', null, array[]::text[], 20, 1),

  (53, 'Ofengemüse mit Feta und Couscous',
   'Geröstetes Gemüse mit Kichererbsen auf Couscous, darüber zerbröselter Feta.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-53.png'),
   'mittag', null, array['vegetarisch'], 40, 1),

  (54, 'Rindsgulasch mit Polenta',
   'Langsam geschmortes Rindsgulasch auf cremiger Polenta.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-54.png'),
   'mittag', null, array['glutenfrei'], 150, 1),

  (55, 'Lachs-Bowl mit Avocado und Reis',
   'Reis-Bowl mit gebratenem Lachs, Avocado, Gurke und Edamame.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-55.png'),
   'mittag', null, array['glutenfrei'], 25, 1),

  (56, 'Spätzle mit Champignonrahm',
   'Spätzle in cremiger Champignonsauce mit frischer Petersilie.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-56.png'),
   'mittag', null, array['vegetarisch'], 25, 1),

  (57, 'Kichererbsen-Curry mit Reis',
   'Würziges Kichererbsen-Curry mit Kokosmilch und Spinat auf Basmatireis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-57.png'),
   'mittag', null, array['vegan','glutenfrei'], 30, 1),

  (58, 'Putenstreifen mit Paprikagemüse',
   'Gebratene Putenstreifen mit buntem Paprikagemüse und Naturreis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-58.png'),
   'mittag', null, array['glutenfrei'], 25, 1),

  (59, 'Nudelsalat mit Pute und Paradeisern',
   'Vollkornnudelsalat mit Putenbrust, Paradeisern und leichtem Joghurtdressing.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-59.png'),
   'mittag', null, array[]::text[], 25, 1),

  (60, 'Cremige Paradeisersuppe mit Hüttenkäse',
   'Samtige Paradeisersuppe mit einem großen Löffel Hüttenkäse.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-60.png'),
   'mittag', null, array['vegetarisch','glutenfrei'], 30, 1);

select setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from rezepte));


-- ------------------------------------------------------------
-- 3) Zutaten der Rezepte
-- ------------------------------------------------------------
insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 51 Linsensuppe mit Wurzelgemuese
  (51, 28,  180,  70, 'g',     'getrocknet',       false, 0),
  (51, 17,  100, 100, 'g',     'gewürfelt',        false, 1),
  (51, 27,   80,   1, 'Stück', 'gewürfelt',        false, 2),
  (51, 158,  50,  50, 'g',     'gewürfelt',        false, 3),
  (51, 95,   50,  50, 'g',     'gewürfelt',        false, 4),
  (51, 206, 400, 400, 'ml',    null,               false, 5),
  (51, 90,   55, 0.5, 'Stück', 'fein gewürfelt',   false, 6),
  (51, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 7),
  (51, 9,    10,   2, 'TL',    null,               false, 8),
  (51, 198,  15,   1, 'EL',    null,               false, 9),
  (51, 202,   5,   1, 'TL',    null,               false, 10),
  (51, 187, 0.2,   1, 'Stück', null,               false, 11),
  (51, 184, 0.5, 0.5, 'TL',    null,               false, 12),
  (51, 175,   1,   1, 'Prise', null,               false, 13),
  (51, 176, 0.5,   1, 'Prise', null,               false, 14),
  (51, 190,   5,   1, 'EL',    'gehackt',          true,  15),

  -- 52 Haehnchen-Wrap mit Joghurtsauce
  (52, 1,   130, 130, 'g',     'in Streifen',      false, 0),
  (52, 221,  60,   1, 'Stück', null,               false, 1),
  (52, 35,   60,  60, 'g',     null,               false, 2),
  (52, 98,   30,  30, 'g',     null,               false, 3),
  (52, 41,   40,  40, 'g',     'in Stiften',       false, 4),
  (52, 25,   50, 0.5, 'Stück', 'in Scheiben',      false, 5),
  (52, 188,  15, 0.25, 'Stück', 'in Ringen',       false, 6),
  (52, 140,   5,   1, 'TL',    null,               false, 7),
  (52, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 8),
  (52, 203,   5,   1, 'TL',    null,               false, 9),
  (52, 177,   2,   1, 'TL',    null,               false, 10),
  (52, 175,   1,   1, 'Prise', null,               false, 11),
  (52, 176, 0.5,   1, 'Prise', null,               false, 12),

  -- 53 Ofengemuese mit Feta und Couscous
  (53, 63,  150, 150, 'g',     'gekocht, ca. 60 g roh', false, 0),
  (53, 48,   80,  80, 'g',     'abgetropft',       false, 1),
  (53, 82,   50,  50, 'g',     'zerbröselt',       false, 2),
  (53, 87,  100, 0.5, 'Stück', 'gewürfelt',        false, 3),
  (53, 13,  100,   1, 'Stück', 'gewürfelt',        false, 4),
  (53, 6,    80,  80, 'g',     'gewürfelt',        false, 5),
  (53, 188,  50, 0.5, 'Stück', 'in Spalten',       false, 6),
  (53, 206, 120, 120, 'ml',    'für den Couscous', false, 7),
  (53, 9,    10,   2, 'TL',    null,               false, 8),
  (53, 203,   5,   1, 'TL',    null,               false, 9),
  (53, 180,   1, 0.5, 'TL',    null,               false, 10),
  (53, 183,   1,   1, 'TL',    null,               false, 11),
  (53, 175,   1,   1, 'Prise', null,               false, 12),
  (53, 176, 0.5,   1, 'Prise', null,               false, 13),
  (53, 190,   5,   1, 'EL',    'gehackt',          true,  14),

  -- 54 Rindsgulasch mit Polenta
  (54, (select id from zutaten where name = 'Rindfleisch (Wadschinken)'), 180, 180, 'g', 'in großen Würfeln', false, 0),
  (54, 123, 200, 200, 'g',     'gekocht, ca. 50 g Polentagrieß', false, 1),
  (54, 90,  150,   2, 'Stück', 'fein geschnitten', false, 2),
  (54, 207, 250, 250, 'ml',    null,               false, 3),
  (54, 205,  10,   1, 'EL',    null,               false, 4),
  (54, 177,   6,   2, 'TL',    null,               false, 5),
  (54, 198,  10,   2, 'TL',    null,               false, 6),
  (54, 91,    4,   1, 'Zehe',  'zerdrückt',        false, 7),
  (54, 179,   1, 0.5, 'TL',    null,               false, 8),
  (54, 202,   5,   1, 'TL',    null,               false, 9),
  (54, 23,    5,   1, 'TL',    'für die Polenta',  false, 10),
  (54, 175,   1,   1, 'Prise', null,               false, 11),
  (54, 176, 0.5,   1, 'Prise', null,               false, 12),
  (54, 190,   5,   1, 'EL',    'gehackt',          true,  13),

  -- 55 Lachs-Bowl mit Avocado und Reis
  (55, 2,   120, 120, 'g',     null,               false, 0),
  (55, 5,   150, 150, 'g',     'gekocht, ca. 50 g roh', false, 1),
  (55, 8,    60, 0.5, 'Stück', 'in Scheiben',      false, 2),
  (55, 41,   60,  60, 'g',     'gewürfelt',        false, 3),
  (55, 107,  50,  50, 'g',     null,               false, 4),
  (55, 74,    5,   1, 'TL',    null,               false, 5),
  (55, 204,  10,   2, 'TL',    null,               false, 6),
  (55, 151,   5,   1, 'TL',    null,               false, 7),
  (55, 194,  15,   1, 'Stück', 'in Ringen',        false, 8),
  (55, 175,   1,   1, 'Prise', null,               false, 9),
  (55, 182, 0.5,   1, 'Prise', null,               true,  10),

  -- 56 Spaetzle mit Champignonrahm
  (56, 218, 250, 250, 'g',     'aus dem Kühlregal', false, 0),
  (56, 92,  150, 150, 'g',     'in Scheiben',      false, 1),
  (56, 212,  60,  60, 'ml',    null,               false, 2),
  (56, 206,  50,  50, 'ml',    null,               false, 3),
  (56, 90,   55, 0.5, 'Stück', 'fein gewürfelt',   false, 4),
  (56, 23,   10,   1, 'EL',    null,               false, 5),
  (56, 186, 0.5,   1, 'Prise', null,               false, 6),
  (56, 175,   1,   1, 'Prise', null,               false, 7),
  (56, 176, 0.5,   1, 'Prise', null,               false, 8),
  (56, 190,  10,   2, 'EL',    'gehackt',          false, 9),
  (56, 116,  10,   1, 'EL',    'gerieben',         true,  10),

  -- 57 Kichererbsen-Curry mit Reis
  (57, 48,  150, 150, 'g',     'abgetropft',       false, 0),
  (57, 120, 120, 120, 'g',     'gekocht, ca. 40 g roh', false, 1),
  (57, 214, 150, 150, 'g',     null,               false, 2),
  (57, 143,  60,  60, 'ml',    null,               false, 3),
  (57, 12,   60,  60, 'g',     null,               false, 4),
  (57, 90,   55, 0.5, 'Stück', 'fein gewürfelt',   false, 5),
  (57, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 6),
  (57, 189,  10,   1, 'Stück', 'daumengroß',       false, 7),
  (57, 140,   5,   1, 'TL',    null,               false, 8),
  (57, 181,   3,   1, 'TL',    null,               false, 9),
  (57, 180,   1, 0.5, 'TL',    null,               false, 10),
  (57, 204,   5,   1, 'TL',    null,               false, 11),
  (57, 175,   1,   1, 'Prise', null,               false, 12),
  (57, 193,   5,   1, 'EL',    'gehackt',          true,  13),

  -- 58 Putenstreifen mit Paprikagemuese
  (58, 43,  170, 170, 'g',     'in Streifen',      false, 0),
  (58, 119, 120, 120, 'g',     'gekocht, ca. 40 g roh', false, 1),
  (58, 13,  100,   1, 'Stück', 'in Streifen',      false, 2),
  (58, 163, 100,   1, 'Stück', 'in Streifen',      false, 3),
  (58, 87,  100, 0.5, 'Stück', 'in Halbmonden',    false, 4),
  (58, 188,  40, 0.5, 'Stück', 'in Spalten',       false, 5),
  (58, 140,  10,   1, 'EL',    null,               false, 6),
  (58, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 7),
  (58, 177,   2,   1, 'TL',    null,               false, 8),
  (58, 184,   1,   1, 'TL',    null,               false, 9),
  (58, 175,   1,   1, 'Prise', null,               false, 10),
  (58, 176, 0.5,   1, 'Prise', null,               false, 11),

  -- 59 Nudelsalat mit Pute und Paradeisern
  (59, 18,  150, 150, 'g',     'gekocht, ca. 60 g roh', false, 0),
  (59, 43,  120, 120, 'g',     'gegart, gewürfelt', false, 1),
  (59, 25,  120, 120, 'g',     'Cocktailparadeiser, halbiert', false, 2),
  (59, 41,   60,  60, 'g',     'gewürfelt',        false, 3),
  (59, 97,   20,  20, 'g',     null,               false, 4),
  (59, 188,  20, 0.25, 'Stück', 'fein gewürfelt',  false, 5),
  (59, 35,   50,  50, 'g',     null,               false, 6),
  (59, 9,    10,   2, 'TL',    null,               false, 7),
  (59, 201,  10,   2, 'TL',    null,               false, 8),
  (59, 196,   5,   1, 'TL',    null,               false, 9),
  (59, 175,   1,   1, 'Prise', null,               false, 10),
  (59, 176, 0.5,   1, 'Prise', null,               false, 11),
  (59, 191,   5,   4, 'Blätter', null,             true,  12),

  -- 60 Cremige Paradeisersuppe mit Huettenkaese
  (60, 214, 300, 0.75, 'Dose', null,               false, 0),
  (60, 50,  150, 150, 'g',     null,               false, 1),
  (60, 206, 150, 150, 'ml',    null,               false, 2),
  (60, 27,   50, 0.5, 'Stück', 'gewürfelt',        false, 3),
  (60, 212,  30,  30, 'ml',    null,               false, 4),
  (60, 90,   55, 0.5, 'Stück', 'fein gewürfelt',   false, 5),
  (60, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 6),
  (60, 9,    10,   2, 'TL',    null,               false, 7),
  (60, 175,   1,   1, 'Prise', null,               false, 8),
  (60, 176, 0.5,   1, 'Prise', null,               false, 9),
  (60, 191,   5,   4, 'Blätter', null,             true,  10);


-- ------------------------------------------------------------
-- 4) Anleitungen und Tipps
-- ------------------------------------------------------------
update rezepte set
  anleitung = $j$[
    {"text":"Zwiebel und Knoblauch fein würfeln. Karotte, Sellerie, Pastinake und Erdäpfel schälen und in kleine Würfel schneiden.","aktion":"schneiden"},
    {"text":"Olivenöl in einem Topf erhitzen, die Zwiebel glasig dünsten, dann Knoblauch und Tomatenmark eine Minute mitrösten.","aktion":"braten"},
    {"text":"Wurzelgemüse, Erdäpfel, Linsen, Lorbeerblatt und Thymian dazugeben und mit der Gemüsebrühe aufgießen.","aktion":"ruehren"},
    {"text":"Zugedeckt 25 bis 30 Minuten köcheln lassen, bis Linsen und Gemüse weich sind.","aktion":"kochen"},
    {"text":"Lorbeerblatt entfernen, mit Salz, Pfeffer und einem Schuss Essig abschmecken.","aktion":"ruehren"},
    {"text":"In eine Schüssel füllen und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Essig zum Schluss","text":"Der Schuss Essig ganz am Ende macht den Unterschied - er hebt den erdigen Geschmack der Linsen und macht die Suppe frischer."},
    {"titel":"Auf Vorrat","text":"Linsensuppe lässt sich gut in größerer Menge kochen und portionsweise einfrieren."}
  ]$t$::jsonb
where id = 51;

update rezepte set
  anleitung = $j$[
    {"text":"Griechisches Joghurt mit dem Knoblauch, Zitronensaft und einer Prise Salz zu einer Sauce verrühren.","aktion":"ruehren"},
    {"text":"Hähnchen in Streifen schneiden, mit Paprikapulver, Salz und Pfeffer würzen. Gurke in Stifte, Paradeiser in Scheiben, rote Zwiebel in Ringe schneiden.","aktion":"schneiden"},
    {"text":"Rapsöl in einer Pfanne erhitzen und die Hähnchenstreifen rundum vier bis fünf Minuten goldbraun braten.","aktion":"braten"},
    {"text":"Die Tortilla ohne Fett kurz erwärmen, damit sie geschmeidig wird.","aktion":"roesten"},
    {"text":"Tortilla mit Joghurtsauce bestreichen, mit Salat, Gemüse und Hähnchen belegen, fest einrollen und schräg halbieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Sauce zieht durch","text":"Die Joghurtsauce zehn Minuten stehen lassen, dann verbindet sich der Knoblauch mit dem Joghurt."},
    {"titel":"Zum Mitnehmen","text":"Salat und Sauce getrennt transportieren und erst vor dem Essen einrollen, sonst weicht die Tortilla durch."}
  ]$t$::jsonb
where id = 52;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 220 Grad vorheizen. Zucchini, Paprika und Süßkartoffel würfeln, rote Zwiebel in Spalten schneiden.","aktion":"schneiden"},
    {"text":"Gemüse und abgetropfte Kichererbsen mit Olivenöl, Kreuzkümmel, Oregano, Salz und Pfeffer mischen und auf einem Blech verteilen.","aktion":"mischen"},
    {"text":"25 Minuten rösten, nach der Hälfte einmal wenden.","aktion":"roesten"},
    {"text":"Inzwischen die Gemüsebrühe aufkochen, über den Couscous gießen und zugedeckt zehn Minuten quellen lassen. Mit einer Gabel auflockern und den Zitronensaft untermischen.","aktion":"warten"},
    {"text":"Ofengemüse auf dem Couscous anrichten, Feta darüberbröseln und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nicht zu voll aufs Blech","text":"Das Gemüse braucht Platz, sonst dämpft es statt zu rösten. Lieber auf zwei Bleche verteilen."},
    {"titel":"Knusprige Kichererbsen","text":"Die Kichererbsen vorher gut trocken tupfen, dann werden sie im Rohr außen knusprig."}
  ]$t$::jsonb
where id = 53;

update rezepte set
  anleitung = $j$[
    {"text":"Fleisch in große Würfel schneiden, Zwiebeln fein schneiden. Beim Gulasch gilt: etwa gleich viel Zwiebel wie Fleisch.","aktion":"schneiden"},
    {"text":"Butterschmalz in einem Topf erhitzen und die Zwiebeln bei mittlerer Hitze 15 Minuten langsam dunkelgoldbraun rösten. Das ist die Grundlage für Farbe und Geschmack.","aktion":"roesten"},
    {"text":"Tomatenmark kurz mitrösten, Topf vom Herd nehmen, Paprikapulver einrühren und sofort mit Essig und einem Schuss Brühe ablöschen - Paprika verbrennt in Sekunden.","aktion":"ruehren"},
    {"text":"Fleisch, Knoblauch, Kümmel, Salz und restliche Brühe dazugeben. Zugedeckt bei kleinster Hitze zwei Stunden schmoren, bis das Fleisch zart ist.","aktion":"kochen"},
    {"text":"Für die Polenta Wasser mit einer Prise Salz aufkochen, Polentagrieß einrieseln lassen und unter Rühren fünf Minuten köcheln. Butter unterrühren.","aktion":"kochen"},
    {"text":"Polenta auf einen Teller geben, Gulasch daraufsetzen und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Keine Abkürzung beim Zwiebelrösten","text":"Die Zwiebeln geben dem Gulasch Bindung und Tiefe. Wer sie nur glasig dünstet, bekommt eine dünne, blasse Sauce."},
    {"titel":"Am Vortag kochen","text":"Gulasch schmeckt aufgewärmt deutlich besser. Das Schmoren am Vortag erledigen und nur die Polenta frisch kochen."}
  ]$t$::jsonb
where id = 54;

update rezepte set
  anleitung = $j$[
    {"text":"Reis nach Packungsanweisung garen und etwas abkühlen lassen.","aktion":"kochen"},
    {"text":"Edamame nach Packungsanweisung garen und abgießen. Gurke würfeln, Avocado in Scheiben schneiden, Frühlingszwiebel in Ringe.","aktion":"schneiden"},
    {"text":"Lachs salzen und in einer beschichteten Pfanne ohne Öl auf der Hautseite vier Minuten braten, wenden und zwei Minuten fertig garen.","aktion":"braten"},
    {"text":"Sesamöl mit Limettensaft und einer Prise Salz verrühren.","aktion":"ruehren"},
    {"text":"Reis in eine Schüssel geben, Lachs, Avocado, Gurke und Edamame daraufsetzen, mit dem Dressing beträufeln und mit Sesam und Frühlingszwiebel bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Ohne Öl braten","text":"Lachs bringt genug eigenes Fett mit. In einer beschichteten Pfanne braucht er kein zusätzliches Öl."},
    {"titel":"Mit Sojasauce","text":"Wer nicht glutenfrei essen muss, gibt einen Esslöffel Sojasauce ins Dressing."}
  ]$t$::jsonb
where id = 55;

update rezepte set
  anleitung = $j$[
    {"text":"Champignons in Scheiben schneiden, Zwiebel fein würfeln, Petersilie hacken.","aktion":"schneiden"},
    {"text":"Butter in einer großen Pfanne erhitzen und die Champignons bei starker Hitze braten, bis die Flüssigkeit verdampft ist und sie Farbe bekommen. Zwiebel zugeben und glasig dünsten.","aktion":"braten"},
    {"text":"Mit Gemüsebrühe ablöschen, Cremefine einrühren und kurz einköcheln lassen. Mit Salz, Pfeffer und Muskat abschmecken.","aktion":"ruehren"},
    {"text":"Spätzle nach Packungsanweisung erwärmen und in die Sauce geben.","aktion":"kochen"},
    {"text":"Mit Petersilie und nach Belieben mit Parmesan bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Champignons richtig braten","text":"Erst salzen, wenn sie schon Farbe haben. Salz zieht Wasser, und dann kochen sie statt zu braten."},
    {"titel":"Mehr Protein","text":"Ein paar Löffel Hüttenkäse unter die fertige Sauce heben - macht sie cremiger und bringt deutlich mehr Protein."}
  ]$t$::jsonb
where id = 56;

update rezepte set
  anleitung = $j$[
    {"text":"Basmatireis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Zwiebel, Knoblauch und Ingwer fein hacken.","aktion":"schneiden"},
    {"text":"Rapsöl in einem Topf erhitzen, Zwiebel glasig dünsten, dann Knoblauch, Ingwer, Currypulver und Kreuzkümmel eine Minute mitrösten, bis es duftet.","aktion":"braten"},
    {"text":"Gehackte Tomaten, Kokosmilch und Kichererbsen dazugeben und zehn Minuten köcheln lassen.","aktion":"kochen"},
    {"text":"Spinat unterheben und zusammenfallen lassen, mit Limettensaft und Salz abschmecken.","aktion":"ruehren"},
    {"text":"Auf dem Reis anrichten und mit Koriander bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Gewürze anrösten","text":"Currypulver entfaltet sein Aroma erst im heißen Öl. Direkt in die Sauce gerührt schmeckt es stumpf."},
    {"titel":"Cremiger","text":"Ein paar Kichererbsen mit der Gabel zerdrücken und unterrühren - das bindet die Sauce ohne zusätzliche Kokosmilch."}
  ]$t$::jsonb
where id = 57;

update rezepte set
  anleitung = $j$[
    {"text":"Naturreis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Pute und Paprika in Streifen schneiden, Zucchini in Halbmonde, rote Zwiebel in Spalten, Knoblauch fein hacken.","aktion":"schneiden"},
    {"text":"Die Hälfte des Rapsöls stark erhitzen, Putenstreifen mit Paprikapulver, Salz und Pfeffer würzen und zwei bis drei Minuten scharf anbraten. Herausnehmen.","aktion":"braten"},
    {"text":"Restliches Öl in die Pfanne, Paprika, Zucchini und Zwiebel vier Minuten bissfest braten. Knoblauch und Thymian kurz mitbraten.","aktion":"braten"},
    {"text":"Pute zurück in die Pfanne geben, einmal durchschwenken und mit dem Reis anrichten.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"In zwei Runden","text":"Fleisch und Gemüse getrennt braten. Zusammen in der Pfanne ziehen sie Wasser und werden grau statt braun."},
    {"titel":"Pute bleibt saftig","text":"Kurz und heiß anbraten, dann raus aus der Pfanne. Sie gart beim Zurückgeben fertig."}
  ]$t$::jsonb
where id = 58;

update rezepte set
  anleitung = $j$[
    {"text":"Nudeln nach Packungsanweisung bissfest kochen, kalt abspülen und abtropfen lassen.","aktion":"kochen"},
    {"text":"Putenbrust würfeln, Paradeiser halbieren, Gurke würfeln, rote Zwiebel fein hacken.","aktion":"schneiden"},
    {"text":"Griechisches Joghurt, Olivenöl, Balsamico, Senf, Salz und Pfeffer zu einem Dressing verrühren.","aktion":"ruehren"},
    {"text":"Nudeln mit Pute, Gemüse und Rucola vermengen und das Dressing unterheben.","aktion":"mischen"},
    {"text":"Mit Basilikum bestreuen und servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Rucola zum Schluss","text":"Wird der Salat vorbereitet, den Rucola erst kurz vor dem Essen untermischen, sonst fällt er zusammen."},
    {"titel":"Reste verwerten","text":"Gebratene Putenbrust vom Vortag eignet sich perfekt für diesen Salat."}
  ]$t$::jsonb
where id = 59;

update rezepte set
  anleitung = $j$[
    {"text":"Zwiebel, Knoblauch und Karotte fein würfeln.","aktion":"schneiden"},
    {"text":"Olivenöl in einem Topf erhitzen und Zwiebel, Knoblauch und Karotte fünf Minuten weich dünsten.","aktion":"braten"},
    {"text":"Gehackte Tomaten und Gemüsebrühe dazugeben und 15 Minuten köcheln lassen.","aktion":"kochen"},
    {"text":"Cremefine einrühren und die Suppe mit dem Stabmixer fein pürieren. Mit Salz und Pfeffer abschmecken.","aktion":"mischen"},
    {"text":"In eine Schüssel füllen, den Hüttenkäse in die Mitte setzen und mit Basilikum belegen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Die Karotte macht es rund","text":"Die Karotte bringt natürliche Süße und nimmt den Paradeisern die Säure - dafür braucht es keinen Zucker."},
    {"titel":"Dazu passt","text":"Ein Stück Brot zum Tunken passt gut - dann ist das Gericht allerdings nicht mehr glutenfrei."}
  ]$t$::jsonb
where id = 60;

commit;


-- ------------------------------------------------------------
-- 5) Naehrwerte berechnen und kontrollieren
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 51 and 60;

select id, titel, diaeten, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 51 and 60
order by id;

-- Gesamtzahl Rezepte (erwartet 60)
select count(*) as rezepte_gesamt from rezepte;
