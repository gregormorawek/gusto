-- BEREITS AUSGEFUEHRT (Stand: 2026-09-26, 90 Rezepte in der DB bestaetigt).
--
-- Migration: Neue Rezepte, Paket 6 von 7 (Rezepte 81-90)
--   81-85 Abend, 86-90 Snack
--
-- Quelle: docs/gusto-70-neue-rezepte.md
-- Bilder liegen bereits im Bucket (rezept-81.png bis rezept-90.png).
--
-- Konventionen (siehe CLAUDE.md Abschnitt 9):
--   - rezepte.id ist GENERATED ALWAYS AS IDENTITY -> "overriding system
--     value", danach setval
--   - Abend: eigenschaft null; Snack: 'suess' / 'deftig'
--   - diaeten: vegan steht allein; ohne Diaet leeres Array
--   - Getreide mit Werten fuer gekochten Zustand: menge_g gekocht,
--     Anmerkung mit Rohgewicht
--
-- Neue Zutat: Lasagneblaetter - bewusst mit Naehrwerten fuer den
-- TROCKENEN Zustand, weil sie ungekocht in die Form kommen. Deshalb
-- gehoeren sie NICHT in die Faktor-Liste von korrektur-getreide-gekocht.sql.
--
-- Abgrenzung zu Bestandsrezepten:
--   89 vs. 27 (Kichererbsen-Snack): 27 ist Hummus mit Vollkornbrot,
--      89 nur mit Gemuesesticks und glutenfrei
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
  ('Lasagneblätter', 'carbs', true, 350, 12, 71, 1.5, 60,
   'fruehstueck,mittag,abend,snack', null, null, 'getreide', false);


-- ------------------------------------------------------------
-- 2) Rezepte anlegen
-- ------------------------------------------------------------
insert into rezepte
  (id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten,
   zubereitungszeit_min, portionen)
overriding system value
values
  (81, 'Rindfleisch-Wok mit Paprika und Reis',
   'Rindfleischstreifen aus dem Wok mit bunter Paprika auf Reis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-81.png'),
   'abend', null, array[]::text[], 25, 1),

  (82, 'Gemüselasagne mit Ricotta',
   'Lasagne mit Zucchini, Paprika und einer cremigen Spinat-Ricotta-Schicht.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-82.png'),
   'abend', null, array['vegetarisch'], 60, 1),

  (83, 'Putencurry mit Naturreis',
   'Mildes Curry mit Putenstreifen und Erbsen auf Naturreis.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-83.png'),
   'abend', null, array['glutenfrei'], 35, 1),

  (84, 'Gefüllte Süßkartoffel mit Kichererbsen',
   'Im Ofen gebackene Süßkartoffel, gefüllt mit würzigen Kichererbsen und Tahinisauce.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-84.png'),
   'abend', null, array['vegan','glutenfrei'], 55, 1),

  (85, 'Nudelauflauf mit Pute und Paradeiser',
   'Überbackener Nudelauflauf mit Putenfaschiertem, Paprika und Mozzarella.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-85.png'),
   'abend', null, array[]::text[], 45, 1),

  (86, 'Protein-Shake mit Banane und Erdnussbutter',
   'Cremiger Shake aus Magerquark, Milch, Banane und Erdnussbutter.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-86.png'),
   'snack', 'suess', array['vegetarisch','glutenfrei'], 5, 1),

  (87, 'Hüttenkäse mit Paradeiser und Schnittlauch',
   'Hüttenkäse mit Paradeisern, Schnittlauch und einem Schuss Kürbiskernöl.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-87.png'),
   'snack', 'deftig', array['vegetarisch','glutenfrei'], 5, 1),

  (88, 'Skyr mit Kirschen und Mandeln',
   'Cremiger Skyr mit frischen Kirschen und gerösteten Mandeln.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-88.png'),
   'snack', 'suess', array['vegetarisch','glutenfrei'], 5, 1),

  (89, 'Hummus mit Gemüsesticks',
   'Cremiger Hummus mit knackigen Karotten-, Gurken- und Paprikasticks.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-89.png'),
   'snack', 'deftig', array['vegan','glutenfrei'], 10, 1),

  (90, 'Protein-Energy-Balls',
   'Vier kleine Kugeln aus Haferflocken, Datteln, Erdnussbutter und Proteinpulver.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-90.png'),
   'snack', 'suess', array['vegetarisch'], 15, 1);

select setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from rezepte));


-- ------------------------------------------------------------
-- 3) Zutaten der Rezepte
-- ------------------------------------------------------------
insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 81 Rindfleisch-Wok mit Paprika und Reis
  (81, 44,  130, 130, 'g',     'in dünnen Streifen', false, 0),
  (81, 5,   130, 130, 'g',     'gekocht, ca. 50 g roh', false, 1),
  (81, 13,  100,   1, 'Stück', 'in Streifen',      false, 2),
  (81, 163,  80, 0.5, 'Stück', 'in Streifen',      false, 3),
  (81, 90,   40, 0.5, 'Stück', 'in Spalten',       false, 4),
  (81, 140,  10,   1, 'EL',    null,               false, 5),
  (81, 199,  15,   1, 'EL',    null,               false, 6),
  (81, 29,    5,   1, 'TL',    null,               false, 7),
  (81, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 8),
  (81, 189,   5,   1, 'Stück', 'daumennagelgroß',  false, 9),
  (81, 194,  15,   1, 'Stück', 'in Ringen',        true,  10),
  (81, 195,  10,   1, 'Stück', 'in Ringen',        true,  11),

  -- 82 Gemueselasagne mit Ricotta
  (82, (select id from zutaten where name = 'Lasagneblätter'), 50, 3, 'Blätter', 'ungekocht', false, 0),
  (82, 115,  80,  80, 'g',     null,               false, 1),
  (82, 87,  150, 0.75, 'Stück', 'gewürfelt',       false, 2),
  (82, 13,  100,   1, 'Stück', 'gewürfelt',        false, 3),
  (82, 12,   80,  80, 'g',     'grob gehackt',     false, 4),
  (82, 213, 250, 250, 'ml',    null,               false, 5),
  (82, 53,   25,  25, 'g',     'in Scheiben',      false, 6),
  (82, 116,  10,   1, 'EL',    'gerieben',         false, 7),
  (82, 90,   40, 0.5, 'Stück', 'fein gewürfelt',   false, 8),
  (82, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 9),
  (82, 9,     5,   1, 'TL',    null,               false, 10),
  (82, 183,   1,   1, 'TL',    null,               false, 11),
  (82, 175,   1,   1, 'Prise', null,               false, 12),
  (82, 176, 0.5,   1, 'Prise', null,               false, 13),
  (82, 191,   5,   4, 'Blätter', null,             true,  14),

  -- 83 Putencurry mit Naturreis
  (83, 43,  160, 160, 'g',     'gewürfelt',        false, 0),
  (83, 119, 120, 120, 'g',     'gekocht, ca. 40 g roh', false, 1),
  (83, 213, 100, 100, 'ml',    null,               false, 2),
  (83, 143,  40,  40, 'ml',    null,               false, 3),
  (83, 112,  50,  50, 'g',     'tiefgekühlt',      false, 4),
  (83, 35,   40,  40, 'g',     null,               false, 5),
  (83, 90,   55, 0.5, 'Stück', 'fein gewürfelt',   false, 6),
  (83, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 7),
  (83, 189,  10,   1, 'Stück', 'daumengroß',       false, 8),
  (83, 140,  10,   1, 'EL',    null,               false, 9),
  (83, 181,   3,   1, 'TL',    null,               false, 10),
  (83, 175,   1,   1, 'Prise', null,               false, 11),
  (83, 193,   5,   1, 'EL',    'gehackt',          true,  12),

  -- 84 Gefuellte Suesskartoffel mit Kichererbsen
  (84, 6,   250,   1, 'Stück', 'groß',             false, 0),
  (84, 48,  150, 150, 'g',     'abgetropft',       false, 1),
  (84, 86,   20,   1, 'EL',    null,               false, 2),
  (84, 9,    10,   2, 'TL',    null,               false, 3),
  (84, 203,  10,   2, 'TL',    null,               false, 4),
  (84, 91,    2, 0.5, 'Zehe',  'fein gerieben',    false, 5),
  (84, 180,   1, 0.5, 'TL',    null,               false, 6),
  (84, 177,   2,   1, 'TL',    null,               false, 7),
  (84, 175,   1,   1, 'Prise', null,               false, 8),
  (84, 190,  10,   2, 'EL',    'gehackt',          false, 9),
  (84, 182, 0.5,   1, 'Prise', null,               true,  10),

  -- 85 Nudelauflauf mit Pute und Paradeiser
  (85, 64,  150, 150, 'g',     'gekocht, ca. 55 g roh', false, 0),
  (85, (select id from zutaten where name = 'Putenfaschiertes'), 120, 120, 'g', null, false, 1),
  (85, 213, 200, 200, 'ml',    null,               false, 2),
  (85, 53,   40,  40, 'g',     'in Stücken',       false, 3),
  (85, 13,   80, 0.5, 'Stück', 'gewürfelt',        false, 4),
  (85, 90,   40, 0.5, 'Stück', 'fein gewürfelt',   false, 5),
  (85, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 6),
  (85, 9,     5,   1, 'TL',    null,               false, 7),
  (85, 183,   1,   1, 'TL',    null,               false, 8),
  (85, 175,   1,   1, 'Prise', null,               false, 9),
  (85, 176, 0.5,   1, 'Prise', null,               false, 10),
  (85, 191,   5,   4, 'Blätter', null,             true,  11),

  -- 86 Protein-Shake mit Banane und Erdnussbutter
  (86, 173, 100, 100, 'g',     null,               false, 0),
  (86, (select id from zutaten where name = 'Milch (1,5 %)'), 200, 200, 'ml', null, false, 1),
  (86, 30,  100,   1, 'Stück', 'gern tiefgekühlt', false, 2),
  (86, 40,   15,   1, 'EL',    null,               false, 3),
  (86, 185,   1, 0.5, 'TL',    null,               true,  4),

  -- 87 Huettenkaese mit Paradeiser und Schnittlauch
  (87, 50,  200, 200, 'g',     null,               false, 0),
  (87, 25,  150, 150, 'g',     'gewürfelt',        false, 1),
  (87, 81,   10,   1, 'EL',    null,               false, 2),
  (87, 21,    5,   1, 'TL',    null,               false, 3),
  (87, 192,   5,   1, 'EL',    'geschnitten',      false, 4),
  (87, 175,   1,   1, 'Prise', null,               false, 5),
  (87, 176, 0.5,   1, 'Prise', null,               false, 6),

  -- 88 Skyr mit Kirschen und Mandeln
  (88, 51,  200, 200, 'g',     null,               false, 0),
  (88, 130, 120, 120, 'g',     'entsteint',        false, 1),
  (88, 10,   20,  20, 'g',     'gehobelt',         false, 2),
  (88, 185,   1, 0.5, 'TL',    null,               false, 3),
  (88, 29,    5,   1, 'TL',    null,               true,  4),

  -- 89 Hummus mit Gemuesesticks
  (89, 48,  100, 100, 'g',     'abgetropft',       false, 0),
  (89, 27,  100,   2, 'Stück', 'in Sticks',        false, 1),
  (89, 41,  100, 0.5, 'Stück', 'in Sticks',        false, 2),
  (89, 13,   80, 0.5, 'Stück', 'in Sticks',        false, 3),
  (89, 86,   15,   1, 'EL',    null,               false, 4),
  (89, 9,     5,   1, 'TL',    null,               false, 5),
  (89, 203,  15,   1, 'EL',    null,               false, 6),
  (89, 91,    4,   1, 'Zehe',  null,               false, 7),
  (89, 180,   1, 0.5, 'TL',    null,               false, 8),
  (89, 177,   1, 0.5, 'TL',    'zum Bestreuen',    false, 9),
  (89, 175,   1,   1, 'Prise', null,               false, 10),

  -- 90 Protein-Energy-Balls
  (90, 33,   30,   3, 'Stück', 'entsteint',        false, 0),
  (90, 7,    25,  25, 'g',     null,               false, 1),
  (90, 40,   15,   1, 'EL',    null,               false, 2),
  (90, 171,  15,   1, 'EL',    'Vanille oder neutral', false, 3),
  (90, 38,    5,   1, 'EL',    'zum Wälzen',       false, 4);


-- ------------------------------------------------------------
-- 4) Anleitungen und Tipps
-- ------------------------------------------------------------
update rezepte set
  anleitung = $j$[
    {"text":"Reis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Steak quer zur Faser in dünne Streifen schneiden. Paprika in Streifen, Zwiebel in Spalten schneiden, Knoblauch und Ingwer fein hacken.","aktion":"schneiden"},
    {"text":"Sojasauce und Honig mit zwei Esslöffeln Wasser verrühren.","aktion":"ruehren"},
    {"text":"Wok oder große Pfanne sehr stark erhitzen, die Hälfte des Öls hineingeben und das Rindfleisch ein bis zwei Minuten scharf anbraten. Herausnehmen.","aktion":"braten"},
    {"text":"Restliches Öl in den Wok, Zwiebel und Paprika drei Minuten braten, dann Knoblauch und Ingwer eine halbe Minute mitbraten.","aktion":"braten"},
    {"text":"Rindfleisch und Sauce zurück in den Wok geben, eine Minute durchschwenken und auf dem Reis anrichten. Mit Frühlingszwiebel und Chili bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Quer zur Faser","text":"Rindfleisch quer zur Faser in Streifen schneiden - so bleibt es zart statt zäh."},
    {"titel":"Kurz und heiß","text":"Das Fleisch nur kurz anbraten und dann herausnehmen. Zu lange in der Pfanne wird es grau und trocken."}
  ]$t$::jsonb
where id = 81;

update rezepte set
  anleitung = $j$[
    {"text":"Zucchini und Paprika würfeln, Zwiebel und Knoblauch fein hacken.","aktion":"schneiden"},
    {"text":"Olivenöl erhitzen, Zwiebel und Knoblauch glasig dünsten, Zucchini und Paprika fünf Minuten mitbraten. Passierte Tomaten und Oregano dazugeben, salzen, pfeffern und zehn Minuten köcheln lassen.","aktion":"kochen"},
    {"text":"Ricotta mit dem gehackten Spinat verrühren und mit Salz und Pfeffer würzen.","aktion":"ruehren"},
    {"text":"Backrohr auf 190 Grad vorheizen. In einer kleinen Form abwechselnd Gemüsesauce, Lasagneblätter und Ricotta schichten. Mit Sauce abschließen und mit Mozzarella und Parmesan belegen.","aktion":"mischen"},
    {"text":"Mit Alufolie abgedeckt 25 Minuten backen, dann offen weitere 15 Minuten, bis der Käse goldbraun ist. Zehn Minuten ruhen lassen.","aktion":"roesten"},
    {"text":"Mit Basilikum belegt servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Blätter ungekocht","text":"Die Lasagneblätter kommen trocken in die Form und garen in der Sauce. Die Sauce deshalb eher zu flüssig als zu dick lassen."},
    {"titel":"Ruhen lassen","text":"Nach dem Backen zehn Minuten warten - dann zerfällt die Lasagne beim Schneiden nicht."}
  ]$t$::jsonb
where id = 82;

update rezepte set
  anleitung = $j$[
    {"text":"Naturreis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Pute würfeln, Zwiebel, Knoblauch und Ingwer fein hacken.","aktion":"schneiden"},
    {"text":"Rapsöl erhitzen und die Putenwürfel rundum anbraten. Herausnehmen.","aktion":"braten"},
    {"text":"Zwiebel, Knoblauch, Ingwer und Currypulver in der Pfanne eine Minute anrösten, bis es duftet.","aktion":"braten"},
    {"text":"Passierte Tomaten, Kokosmilch und Erbsen dazugeben und fünf Minuten köcheln lassen. Die Pute zurückgeben und drei bis vier Minuten fertig garen.","aktion":"kochen"},
    {"text":"Pfanne vom Herd nehmen, das griechische Joghurt einrühren, salzen und mit Reis und Koriander servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Joghurt vom Herd","text":"Joghurt flockt bei Kochhitze aus. Erst einrühren, wenn die Pfanne vom Herd ist."},
    {"titel":"Mild und cremig","text":"Das Joghurt nimmt dem Curry die Schärfe und macht es cremig - dafür reicht wenig Kokosmilch."}
  ]$t$::jsonb
where id = 83;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Süßkartoffel längs halbieren, die Schnittfläche mit etwas Olivenöl bepinseln und mit der Schnittfläche nach unten 40 bis 45 Minuten backen, bis sie weich ist.","aktion":"roesten"},
    {"text":"Kichererbsen trocken tupfen, mit dem restlichen Öl, Kreuzkümmel, Paprikapulver und Salz mischen und die letzten 20 Minuten mit aufs Blech geben.","aktion":"roesten"},
    {"text":"Tahini mit Zitronensaft, Knoblauch und zwei bis drei Esslöffeln Wasser glattrühren.","aktion":"ruehren"},
    {"text":"Das Fruchtfleisch der Süßkartoffel mit einer Gabel auflockern, leicht salzen und die knusprigen Kichererbsen darauf verteilen.","aktion":"mischen"},
    {"text":"Mit Tahinisauce beträufeln und mit Petersilie und Chiliflocken bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Schnittfläche nach unten","text":"So karamellisiert die Süßkartoffel auf dem Blech und wird besonders süß und saftig."},
    {"titel":"Schneller","text":"In Eile die Süßkartoffel acht bis zehn Minuten in der Mikrowelle vorgaren und nur noch kurz ins Rohr geben."}
  ]$t$::jsonb
where id = 84;

update rezepte set
  anleitung = $j$[
    {"text":"Penne eine Minute kürzer als auf der Packung angegeben kochen und abgießen.","aktion":"kochen"},
    {"text":"Zwiebel, Knoblauch und Paprika klein würfeln. Olivenöl erhitzen, Zwiebel glasig dünsten, Putenfaschiertes krümelig anbraten, dann Paprika und Knoblauch zwei Minuten mitbraten.","aktion":"braten"},
    {"text":"Passierte Tomaten und Oregano dazugeben, salzen, pfeffern und fünf Minuten köcheln lassen.","aktion":"kochen"},
    {"text":"Backrohr auf 200 Grad vorheizen. Die Nudeln mit der Sauce vermengen, in eine Auflaufform füllen und den Mozzarella darauf verteilen.","aktion":"mischen"},
    {"text":"15 bis 20 Minuten backen, bis der Käse goldbraun ist.","aktion":"roesten"},
    {"text":"Mit Basilikum bestreut servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nudeln nicht zu weich","text":"Die Nudeln garen im Rohr nach. Wer sie vorher ganz fertig kocht, hat am Ende einen weichen Auflauf."},
    {"titel":"Gut vorzubereiten","text":"Den Auflauf am Vorabend fertig schichten und im Kühlschrank lagern - am nächsten Tag etwas länger backen."}
  ]$t$::jsonb
where id = 85;

update rezepte set
  anleitung = $j$[
    {"text":"Die Banane in Stücke brechen.","aktion":"schneiden"},
    {"text":"Magerquark, Milch, Banane und Erdnussbutter im Mixer etwa 30 Sekunden cremig pürieren.","aktion":"mischen"},
    {"text":"In ein Glas füllen und nach Belieben mit Zimt bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Wie ein Milchshake","text":"Mit einer tiefgekühlten Banane wird der Shake dick und eiskalt - ganz ohne Eiswürfel."},
    {"titel":"Nach dem Training","text":"Mit über 20 g Protein ein guter Snack nach dem Sport."}
  ]$t$::jsonb
where id = 86;

update rezepte set
  anleitung = $j$[
    {"text":"Paradeiser würfeln und Schnittlauch fein schneiden.","aktion":"schneiden"},
    {"text":"Kürbiskerne in einer trockenen Pfanne kurz rösten, bis sie zu knacken beginnen.","aktion":"roesten"},
    {"text":"Hüttenkäse in eine Schüssel geben, Paradeiser darauf verteilen, salzen und pfeffern.","aktion":"mischen"},
    {"text":"Mit Kürbiskernöl beträufeln und mit Schnittlauch und Kürbiskernen bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Steirisch verfeinert","text":"Das Kürbiskernöl macht aus dem einfachen Snack etwas Besonderes. Sparsam dosieren - es ist sehr intensiv."},
    {"titel":"Reife Paradeiser","text":"Im Sommer mit richtig reifen Paradeisern schmeckt der Snack am besten. Im Winter lieber Cocktailparadeiser nehmen."}
  ]$t$::jsonb
where id = 87;

update rezepte set
  anleitung = $j$[
    {"text":"Kirschen entsteinen und halbieren.","aktion":"schneiden"},
    {"text":"Gehobelte Mandeln in einer trockenen Pfanne kurz goldbraun rösten.","aktion":"roesten"},
    {"text":"Skyr mit Zimt glattrühren, Kirschen daraufgeben, mit Mandeln bestreuen und nach Belieben mit Honig beträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Außerhalb der Saison","text":"Tiefgekühlte Kirschen auftauen lassen und den Saft mit unter den Skyr rühren."},
    {"titel":"Mandeln nicht vergessen","text":"Gehobelte Mandeln werden in Sekunden von golden zu schwarz. Beim Rösten nicht weggehen."}
  ]$t$::jsonb
where id = 88;

update rezepte set
  anleitung = $j$[
    {"text":"Kichererbsen mit Tahini, Zitronensaft, Knoblauch, Kreuzkümmel, einer Prise Salz und drei Esslöffeln eiskaltem Wasser im Mixer sehr fein pürieren.","aktion":"mischen"},
    {"text":"Karotten, Gurke und Paprika in Sticks schneiden.","aktion":"schneiden"},
    {"text":"Hummus in eine Schale geben, mit Olivenöl beträufeln, mit Paprikapulver bestreuen und mit den Gemüsesticks servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Eiskaltes Wasser","text":"Mit eiskaltem Wasser und etwas längerem Pürieren wird der Hummus deutlich luftiger und heller."},
    {"titel":"Auf Vorrat","text":"Hummus hält sich im Kühlschrank vier Tage. Gemüsesticks in einer Dose mit etwas Wasser bleiben knackig."}
  ]$t$::jsonb
where id = 89;

update rezepte set
  anleitung = $j$[
    {"text":"Datteln entsteinen. Sind sie sehr fest, zehn Minuten in warmem Wasser einweichen und gut abtropfen lassen.","aktion":"warten"},
    {"text":"Haferflocken, Datteln, Erdnussbutter und Proteinpulver im Mixer zu einer klebrigen Masse verarbeiten.","aktion":"mischen"},
    {"text":"Mit feuchten Händen vier Kugeln formen.","aktion":"mischen"},
    {"text":"Die Kugeln in Kokosflocken wälzen und 15 Minuten im Kühlschrank fest werden lassen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Gleich auf Vorrat","text":"Die doppelte oder dreifache Menge machen - die Kugeln halten sich im Kühlschrank eine Woche."},
    {"titel":"Masse zu trocken","text":"Je nach Proteinpulver braucht die Masse einen Teelöffel Wasser mehr, damit sie zusammenhält."}
  ]$t$::jsonb
where id = 90;

commit;


-- ------------------------------------------------------------
-- 5) Naehrwerte berechnen und kontrollieren
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 81 and 90;

select id, titel, mahlzeit, eigenschaft, diaeten, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 81 and 90
order by id;

-- Gesamtzahl Rezepte (erwartet 90)
select count(*) as rezepte_gesamt from rezepte;
