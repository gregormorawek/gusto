-- BEREITS AUSGEFUEHRT (Stand: 2026-09-26, 100 Rezepte in der DB bestaetigt).
--
-- Migration: Neue Rezepte, Paket 7 von 7 (Rezepte 91-100, Snack)
--   Letztes Paket - danach stehen 100 Rezepte in der Datenbank.
--
-- Quelle: docs/gusto-70-neue-rezepte.md
-- Bilder liegen bereits im Bucket (rezept-91.png bis rezept-100.png).
--
-- Konventionen (siehe CLAUDE.md Abschnitt 9):
--   - rezepte.id ist GENERATED ALWAYS AS IDENTITY -> "overriding system
--     value", danach setval
--   - Snack: eigenschaft 'suess' / 'deftig'
--   - diaeten: vegan steht allein; ohne Diaet leeres Array
--
-- Neue Zutaten:
--   - Raeucherlachs: bisher gab es nur frischen Lachs (id 2)
--   - Kakaopulver (ungesuesst): Naehrwerte stichprobenartig pruefen,
--     Herstellerangaben schwanken je nach Entoelungsgrad
--   - Kaffee (Espresso): praktisch kalorienfrei, der Vollstaendigkeit halber
--
-- Abgrenzung zu Bestandsrezepten:
--   91 vs. 5 und 41 (Avocado-Brot mit Ei): hier als kleiner Snack mit
--      einer Scheibe Brot, einem Viertel Avocado und hartem Ei
--
-- Edamame (94): menge_g ist das Gewicht der Bohnen ohne Schote (daran
-- haengen die Naehrwerte), angezeigt wird die Einkaufsmenge in der Schote.
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
  ('Räucherlachs',            'protein', true, 180, 23,  0,  10,  50,
   'fruehstueck,mittag,abend,snack', null, null, 'fleisch_fisch', false),
  ('Kakaopulver (ungesüßt)',  'carbs',   true, 330, 20,  11, 11,  8,
   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Kaffee (Espresso)',       'carbs',   true, 2,   0.1, 0,  0.2, 60,
   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true);


-- ------------------------------------------------------------
-- 2) Rezepte anlegen
-- ------------------------------------------------------------
insert into rezepte
  (id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten,
   zubereitungszeit_min, portionen)
overriding system value
values
  (91, 'Vollkornbrot mit Avocado und Ei',
   'Eine Scheibe Vollkornbrot mit Avocado und einem harten Ei - der kleine Snack für zwischendurch.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-91.png'),
   'snack', 'deftig', array['vegetarisch'], 15, 1),

  (92, 'Quark-Dip mit Karottensticks',
   'Würziger Kräuterdip aus Magerquark mit knackigen Karottensticks.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-92.png'),
   'snack', 'deftig', array['vegetarisch','glutenfrei'], 10, 1),

  (93, 'Joghurt mit Apfel und Zimt',
   'Griechisches Joghurt mit Apfelwürfeln, Zimt und Walnüssen.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-93.png'),
   'snack', 'suess', array['vegetarisch','glutenfrei'], 5, 1),

  (94, 'Edamame mit Meersalz',
   'Gedämpfte Edamame in der Schote mit grobem Meersalz.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-94.png'),
   'snack', 'deftig', array['vegan','glutenfrei'], 10, 1),

  (95, 'Reiswaffeln mit Frischkäse und Lachs',
   'Reiswaffeln mit Frischkäse, Räucherlachs und Schnittlauch.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-95.png'),
   'snack', 'deftig', array['glutenfrei'], 5, 1),

  (96, 'Protein-Mug-Cake',
   'Warmer Schoko-Tassenkuchen aus der Mikrowelle mit frischen Beeren.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-96.png'),
   'snack', 'suess', array['vegetarisch'], 5, 1),

  (97, 'Thunfisch-Gurken-Boote',
   'Ausgehöhlte Gurkenhälften, gefüllt mit leichter Thunfischcreme.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-97.png'),
   'snack', 'deftig', array['glutenfrei'], 10, 1),

  (98, 'Beeren-Quark mit Walnüssen',
   'Cremiger Magerquark mit gemischten Beeren und Walnüssen.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-98.png'),
   'snack', 'suess', array['vegetarisch','glutenfrei'], 5, 1),

  (99, 'Gebackene Kichererbsen',
   'Knusprig geröstete Kichererbsen mit Paprika und Kreuzkümmel.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-99.png'),
   'snack', 'deftig', array['vegan','glutenfrei'], 35, 1),

  (100, 'Protein-Eiskaffee mit Banane',
   'Eiskalter Kaffee mit Milch, Banane und Proteinpulver, cremig aufgemixt.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-100.png'),
   'snack', 'suess', array['vegetarisch','glutenfrei'], 5, 1);

select setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from rezepte));


-- ------------------------------------------------------------
-- 3) Zutaten der Rezepte
-- ------------------------------------------------------------
insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 91 Vollkornbrot mit Avocado und Ei
  (91, 61,   30,   1, 'Scheibe', null,             false, 0),
  (91, 8,    40, 0.25, 'Stück', null,              false, 1),
  (91, 4,    60,   1, 'Stück', 'hart gekocht',     false, 2),
  (91, 203,   3, 0.5, 'TL',    null,               false, 3),
  (91, 175,   1,   1, 'Prise', null,               false, 4),
  (91, 176, 0.5,   1, 'Prise', null,               false, 5),
  (91, 182, 0.5,   1, 'Prise', null,               true,  6),
  (91, 192,   3,   1, 'TL',    'geschnitten',      true,  7),

  -- 92 Quark-Dip mit Karottensticks
  (92, 173, 150, 150, 'g',     null,               false, 0),
  (92, 27,  150,   3, 'Stück', 'in Sticks',        false, 1),
  (92, 9,     5,   1, 'TL',    null,               false, 2),
  (92, 192,   5,   1, 'EL',    'geschnitten',      false, 3),
  (92, 190,   5,   1, 'EL',    'fein gehackt',     false, 4),
  (92, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 5),
  (92, 203,   5,   1, 'TL',    null,               false, 6),
  (92, 175,   1,   1, 'Prise', null,               false, 7),
  (92, 176, 0.5,   1, 'Prise', null,               false, 8),

  -- 93 Joghurt mit Apfel und Zimt
  (93, 35,  150, 150, 'g',     null,               false, 0),
  (93, 32,  120,   1, 'Stück', 'gewürfelt',        false, 1),
  (93, 22,   15,  15, 'g',     'grob gehackt',     false, 2),
  (93, 185,   1, 0.5, 'TL',    null,               false, 3),
  (93, 29,    5,   1, 'TL',    null,               true,  4),

  -- 94 Edamame mit Meersalz
  (94, 107, 100, 200, 'g',     'in der Schote, ergibt ca. 100 g Bohnen', false, 0),
  (94, 175,   2,   2, 'Prisen', 'grobes Meersalz', false, 1),
  (94, 182, 0.5,   1, 'Prise', null,               true,  2),
  (94, 204,   5,   1, 'TL',    null,               true,  3),

  -- 95 Reiswaffeln mit Frischkaese und Lachs
  (95, 126,  20,   2, 'Stück', null,               false, 0),
  (95, (select id from zutaten where name = 'Räucherlachs'), 50, 50, 'g', null, false, 1),
  (95, 85,   30,   2, 'EL',    null,               false, 2),
  (95, 41,   30,  30, 'g',     'in dünnen Scheiben', false, 3),
  (95, 203,   3, 0.5, 'TL',    null,               false, 4),
  (95, 176, 0.5,   1, 'Prise', null,               false, 5),
  (95, 192,   3,   1, 'TL',    'geschnitten',      false, 6),

  -- 96 Protein-Mug-Cake
  (96, 7,    30,  30, 'g',     'fein gemahlen',    false, 0),
  (96, 171,  20,   1, 'EL',    'Schoko oder neutral', false, 1),
  (96, 4,    60,   1, 'Stück', null,               false, 2),
  (96, (select id from zutaten where name = 'Milch (1,5 %)'), 40, 40, 'ml', null, false, 3),
  (96, (select id from zutaten where name = 'Kakaopulver (ungesüßt)'), 8, 1, 'EL', null, false, 4),
  (96, (select id from zutaten where name = 'Backpulver'), 2, 0.5, 'TL', null, false, 5),
  (96, (select id from zutaten where name = 'Himbeeren'), 40, 40, 'g', null, false, 6),
  (96, 31,   30,  30, 'g',     null,               false, 7),
  (96, 135,   5,   1, 'TL',    null,               false, 8),

  -- 97 Thunfisch-Gurken-Boote
  (97, 41,  250,   1, 'Stück', 'längs halbiert',   false, 0),
  (97, 47,  100, 100, 'g',     'abgetropft',       false, 1),
  (97, 35,   40,  40, 'g',     null,               false, 2),
  (97, 188,  15, 0.25, 'Stück', 'sehr fein gewürfelt', false, 3),
  (97, 196,   5,   1, 'TL',    null,               false, 4),
  (97, 203,   5,   1, 'TL',    null,               false, 5),
  (97, 175,   1,   1, 'Prise', null,               false, 6),
  (97, 176, 0.5,   1, 'Prise', null,               false, 7),
  (97, 177, 0.5,   1, 'Prise', 'zum Bestreuen',    true,  8),
  (97, 192,   3,   1, 'TL',    'geschnitten',      true,  9),

  -- 98 Beeren-Quark mit Walnuessen
  (98, 173, 200, 200, 'g',     null,               false, 0),
  (98, (select id from zutaten where name = 'Himbeeren'), 60, 60, 'g', null, false, 1),
  (98, 31,   60,  60, 'g',     null,               false, 2),
  (98, 69,   60,  60, 'g',     'geviertelt',       false, 3),
  (98, 22,   15,  15, 'g',     'grob gehackt',     false, 4),
  (98, (select id from zutaten where name = 'Milch (1,5 %)'), 30, 2, 'EL', null, false, 5),
  (98, 29,    5,   1, 'TL',    null,               true,  6),

  -- 99 Gebackene Kichererbsen
  (99, 48,  150, 150, 'g',     'abgetropft',       false, 0),
  (99, 9,    10,   2, 'TL',    null,               false, 1),
  (99, 177,   3,   1, 'TL',    null,               false, 2),
  (99, 180,   1, 0.5, 'TL',    null,               false, 3),
  (99, 175,   1,   1, 'Prise', null,               false, 4),
  (99, 182, 0.5,   1, 'Prise', null,               true,  5),

  -- 100 Protein-Eiskaffee mit Banane
  (100, (select id from zutaten where name = 'Kaffee (Espresso)'), 60, 60, 'ml', 'abgekühlt', false, 0),
  (100, (select id from zutaten where name = 'Milch (1,5 %)'), 200, 200, 'ml', 'kalt', false, 1),
  (100, 30,  80, 0.75, 'Stück', 'tiefgekühlt',     false, 2),
  (100, 171, 15,   1, 'EL',    'Vanille oder neutral', false, 3),
  (100, 185,  1, 0.5, 'TL',    null,               true,  4);


-- ------------------------------------------------------------
-- 4) Anleitungen und Tipps
-- ------------------------------------------------------------
update rezepte set
  anleitung = $j$[
    {"text":"Das Ei in kochendes Wasser geben, neun Minuten hart kochen, kalt abschrecken, schälen und in Scheiben schneiden.","aktion":"kochen"},
    {"text":"Das Brot rösten.","aktion":"roesten"},
    {"text":"Avocado mit Zitronensaft, Salz und Pfeffer zerdrücken und auf das Brot streichen.","aktion":"mischen"},
    {"text":"Mit den Eischeiben belegen und mit Chiliflocken und Schnittlauch bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Eier auf Vorrat","text":"Gleich mehrere Eier hart kochen - ungeschält halten sie sich im Kühlschrank eine Woche und machen den Snack in zwei Minuten fertig."},
    {"titel":"Rest der Avocado","text":"Die übrige Avocado mit Kern und etwas Zitronensaft in Frischhaltefolie wickeln, dann wird sie nicht braun."}
  ]$t$::jsonb
where id = 91;

update rezepte set
  anleitung = $j$[
    {"text":"Schnittlauch und Petersilie fein schneiden, Knoblauch fein reiben.","aktion":"schneiden"},
    {"text":"Magerquark mit Kräutern, Knoblauch, Olivenöl und Zitronensaft glattrühren, mit Salz und Pfeffer abschmecken.","aktion":"ruehren"},
    {"text":"Karotten schälen und in Sticks schneiden.","aktion":"schneiden"},
    {"text":"Den Dip in eine Schale füllen und mit den Karottensticks servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Zieht besser durch","text":"Den Dip zehn Minuten stehen lassen, dann verbinden sich Kräuter und Knoblauch mit dem Quark."},
    {"titel":"Cremiger","text":"Ist der Quark zu fest, einen Esslöffel Milch oder Mineralwasser einrühren."}
  ]$t$::jsonb
where id = 92;

update rezepte set
  anleitung = $j$[
    {"text":"Apfel waschen und in kleine Würfel schneiden, Walnüsse grob hacken.","aktion":"schneiden"},
    {"text":"Griechisches Joghurt mit Zimt glattrühren.","aktion":"ruehren"},
    {"text":"Apfelwürfel und Walnüsse darauf verteilen und nach Belieben mit Honig beträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Warmer Apfel","text":"An kalten Tagen die Apfelwürfel mit Zimt kurz in einer Pfanne anbraten - schmeckt wie Apfelstrudel."},
    {"titel":"Apfel bleibt hell","text":"Ein paar Tropfen Zitronensaft über die Würfel, dann werden sie nicht braun."}
  ]$t$::jsonb
where id = 93;

update rezepte set
  anleitung = $j$[
    {"text":"Wasser in einem Topf zum Kochen bringen und die Edamame in der Schote drei bis vier Minuten garen.","aktion":"kochen"},
    {"text":"Abgießen und kurz abtropfen lassen.","aktion":"warten"},
    {"text":"Noch warm mit grobem Meersalz bestreuen und nach Belieben mit Chiliflocken und Limettensaft verfeinern.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Aus der Schote essen","text":"Die Bohnen mit den Zähnen aus der Schote ziehen - die Schote selbst wird nicht gegessen. Das langsame Essen macht den Snack sättigender."},
    {"titel":"Tiefgekühlt","text":"Edamame gibt es im Tiefkühlregal. Sie können direkt gefroren ins kochende Wasser."}
  ]$t$::jsonb
where id = 94;

update rezepte set
  anleitung = $j$[
    {"text":"Gurke in dünne Scheiben schneiden, Schnittlauch fein schneiden.","aktion":"schneiden"},
    {"text":"Die Reiswaffeln mit Frischkäse bestreichen.","aktion":"mischen"},
    {"text":"Mit Gurkenscheiben und Räucherlachs belegen.","aktion":"mischen"},
    {"text":"Mit Zitronensaft beträufeln, pfeffern und mit Schnittlauch bestreuen. Sofort essen, solange die Waffeln knusprig sind.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Knusprig halten","text":"Erst unmittelbar vor dem Essen belegen - der Frischkäse weicht die Waffeln sonst durch."},
    {"titel":"Kein Salz nötig","text":"Räucherlachs ist bereits gesalzen, zusätzliches Salz braucht es nicht."}
  ]$t$::jsonb
where id = 95;

update rezepte set
  anleitung = $j$[
    {"text":"Haferflocken fein mahlen. In einer großen Tasse mit Proteinpulver, Kakao und Backpulver vermischen.","aktion":"mischen"},
    {"text":"Ei, Milch und Ahornsirup dazugeben und mit einer Gabel zu einem glatten Teig verrühren. Ein paar Himbeeren in den Teig drücken.","aktion":"ruehren"},
    {"text":"In der Mikrowelle bei voller Leistung 60 bis 90 Sekunden garen, bis der Kuchen aufgegangen ist, aber in der Mitte noch leicht feucht glänzt.","aktion":"kochen"},
    {"text":"Eine Minute ruhen lassen und mit den restlichen Beeren servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nicht zu lange","text":"Proteinteig wird schnell gummiartig. Lieber zu früh herausnehmen - er gart in der heißen Tasse nach."},
    {"titel":"Große Tasse","text":"Der Teig geht stark auf. Die Tasse sollte höchstens zur Hälfte gefüllt sein."}
  ]$t$::jsonb
where id = 96;

update rezepte set
  anleitung = $j$[
    {"text":"Gurke längs halbieren und die Kerne mit einem Teelöffel herauskratzen, sodass zwei Boote entstehen.","aktion":"schneiden"},
    {"text":"Rote Zwiebel sehr fein würfeln.","aktion":"schneiden"},
    {"text":"Thunfisch mit griechischem Joghurt, Senf, Zitronensaft und der Zwiebel verrühren, mit Salz und Pfeffer abschmecken.","aktion":"mischen"},
    {"text":"Die Creme in die Gurkenboote füllen und mit Paprikapulver und Schnittlauch bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Joghurt statt Mayonnaise","text":"Griechisches Joghurt macht die Creme genauso cremig wie Mayonnaise, bei einem Bruchteil der Kalorien."},
    {"titel":"Stabil stehen","text":"Unten eine hauchdünne Scheibe abschneiden, dann kippen die Boote nicht um."}
  ]$t$::jsonb
where id = 97;

update rezepte set
  anleitung = $j$[
    {"text":"Erdbeeren vierteln, Walnüsse grob hacken.","aktion":"schneiden"},
    {"text":"Magerquark mit der Milch cremig rühren.","aktion":"ruehren"},
    {"text":"Beeren und Walnüsse darauf verteilen und nach Belieben mit Honig beträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Cremiger Quark","text":"Die Milch macht den Quark geschmeidig. Wer ihn noch luftiger mag, schlägt ihn kurz mit dem Schneebesen auf."},
    {"titel":"Tiefkühlbeeren","text":"Im Winter tiefgekühlte Beeren nehmen und kurz antauen lassen - der Saft färbt den Quark schön rosa."}
  ]$t$::jsonb
where id = 98;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Kichererbsen abtropfen lassen und mit Küchenpapier sehr gründlich trocken tupfen.","aktion":"warten"},
    {"text":"Mit Olivenöl, Paprikapulver, Kreuzkümmel und Salz mischen und auf einem Blech mit Backpapier verteilen.","aktion":"mischen"},
    {"text":"25 bis 30 Minuten rösten, nach der Hälfte einmal durchschütteln, bis sie knusprig sind.","aktion":"roesten"},
    {"text":"Auf dem Blech abkühlen lassen - dabei werden sie noch knuspriger. Nach Belieben mit Chiliflocken bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Trocken ist das Geheimnis","text":"Je trockener die Kichererbsen vor dem Rösten, desto knuspriger werden sie. Lose Häutchen dabei gleich entfernen."},
    {"titel":"Knusprig lagern","text":"Offen aufbewahren, nicht in einer geschlossenen Dose - sonst werden sie über Nacht wieder weich."}
  ]$t$::jsonb
where id = 99;

update rezepte set
  anleitung = $j$[
    {"text":"Einen Espresso zubereiten und abkühlen lassen - am besten schon vorher im Kühlschrank.","aktion":"warten"},
    {"text":"Kalten Espresso, kalte Milch, die tiefgekühlte Banane und das Proteinpulver im Mixer cremig aufschlagen.","aktion":"mischen"},
    {"text":"In ein hohes Glas füllen und nach Belieben mit Zimt bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Gefrorene Banane","text":"Die tiefgekühlte Banane macht den Kaffee eiskalt und cremig, ganz ohne Eiswürfel, die ihn verwässern."},
    {"titel":"Espresso auf Vorrat","text":"Gleich mehrere Espressi auf einmal kochen und im Kühlschrank aufbewahren - dann ist der Eiskaffee in einer Minute fertig."}
  ]$t$::jsonb
where id = 100;

commit;


-- ------------------------------------------------------------
-- 5) Naehrwerte berechnen und kontrollieren
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 91 and 100;

select id, titel, eigenschaft, diaeten, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 91 and 100
order by id;

-- Gesamtzahl Rezepte (erwartet 100)
select count(*) as rezepte_gesamt from rezepte;

-- Abschlusskontrolle ueber alle 100 Rezepte:
-- Kein Rezept ohne Zutaten, kein Rezept ohne berechnete Naehrwerte
select count(*) as rezepte_ohne_naehrwerte
from rezepte
where kcal_pro_portion is null;
-- Erwartung: 0
