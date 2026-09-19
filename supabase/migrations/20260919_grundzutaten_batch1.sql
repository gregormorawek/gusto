-- Migration: 48 neue Grundzutaten (Gewuerze, frische Aromaten, Wuerzsaucen,
-- Bratfette, Fluessigkeiten, Fertigkomponenten) fuer die naechste
-- Rezepte-Runde. Quelle: gusto-neue-grundzutaten.md.
-- Projekt: wruiyvttftiyskyjjuio.
-- BEREITS AUSGEFUEHRT (2026-09-19) - neue Zeilen haben die ids 175-222.

-- Gegen den Bestand (174 Zeilen) abgeglichen, siehe Chatverlauf. Folgende
-- Eintraege aus der Liste existierten bereits und wurden bewusst NICHT
-- erneut eingefuegt: Zwiebel (id 90), Knoblauch (id 91), Honig (id 29),
-- Ahornsirup (id 135), Erdnussbutter (id 40), Tahini (id 86), Rapsoel
-- (id 140), Kokosoel (id 84), Sonnenblumenoel (id 142), Schlagobers
-- (id 83), Polenta (id 123). Vollkornnudeln (id 18) und Kokosmilch
-- (id 143) weichen in den Naehrwerten von der neuen Liste ab, bleiben aber
-- auf Wunsch unveraendert (bereits in Rezepten verknuepft, Unterschied
-- Garzustand bzw. bewusst andere Produktvariante). "Tomatensauce (Fertig,
-- passiert)" aus der urspruenglichen Liste wurde gestrichen (Dopplung mit
-- Passierte Tomaten).

-- mahlzeiten/eigenschaft/diaeten sind fuer Grundzutaten inhaltlich
-- bedeutungslos (siehe ist_grundzutat - sie tauchen in der Auswahl-UI gar
-- nicht auf). eigenschaft und diaeten sind im Bestand nachweislich
-- nullable (z. B. Haehnchenbrust hat diaeten = null) -> hier ebenfalls
-- NULL. mahlzeiten hat im Bestand nie NULL (vermutlich NOT NULL) -> auf
-- den maximal permissiven, bereits vorkommenden Wert gesetzt.

insert into zutaten
  (name, kategorie, aktiv, kalorien, protein_g, carbs_g, fett_g, portion_g,
   mahlzeiten, diaeten, eigenschaft, supermarkt_kategorie, ist_grundzutat)
values
  -- Gewuerze und Aromaten
  ('Salz',                       'carbs',   true, 0,   0,    0,    0,    1,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Pfeffer, schwarz gemahlen',  'carbs',   true, 251, 10.4, 64.0, 3.3,  3,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Paprikapulver, edelsüß',     'carbs',   true, 282, 14.1, 54.0, 13.0, 3,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Paprikapulver, scharf',      'carbs',   true, 282, 14.1, 54.0, 13.0, 3,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Kümmel, gemahlen',           'carbs',   true, 375, 18.0, 44.0, 22.0, 3,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Kreuzkümmel, gemahlen',      'carbs',   true, 375, 18.0, 44.0, 22.0, 3,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Currypulver',                'carbs',   true, 325, 14.0, 56.0, 14.0, 3,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Chiliflocken',               'carbs',   true, 318, 12.0, 57.0, 17.0, 2,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Oregano, getrocknet',        'carbs',   true, 265, 9.0,  69.0, 4.3,  1,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Thymian, getrocknet',        'carbs',   true, 276, 9.1,  64.0, 7.4,  1,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Zimt, gemahlen',             'carbs',   true, 247, 4.0,  81.0, 1.2,  3,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Muskatnuss, gemahlen',       'carbs',   true, 525, 5.8,  49.0, 36.0, 2,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Lorbeerblatt',               'carbs',   true, 313, 7.6,  75.0, 8.4,  1,   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),

  -- Frische Aromaten
  ('Rote Zwiebel',               'gemuese', true, 40, 1.1, 9.3,  0.1, 60, 'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),
  ('Ingwer, frisch',             'gemuese', true, 80, 1.8, 18.0, 0.8, 10, 'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),
  ('Petersilie, frisch',         'gemuese', true, 36, 3.0, 6.3,  0.8, 5,  'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),
  ('Basilikum, frisch',          'gemuese', true, 23, 3.2, 2.7,  0.6, 5,  'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),
  ('Schnittlauch, frisch',       'gemuese', true, 30, 3.3, 4.4,  0.7, 5,  'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),
  ('Koriander, frisch',          'gemuese', true, 23, 2.1, 3.7,  0.5, 5,  'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),
  ('Frühlingszwiebel',           'gemuese', true, 32, 1.8, 7.3,  0.2, 15, 'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),
  ('Chili, frisch',              'gemuese', true, 40, 1.9, 9.0,  0.4, 10, 'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', true),

  -- Wuerzsaucen und Saeuren
  ('Senf, mittelscharf',         'carbs',   true, 66, 4.0, 5.0,  4.0, 10, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Dijon-Senf',                 'carbs',   true, 66, 4.0, 5.0,  4.0, 10, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Tomatenmark',                'carbs',   true, 82, 4.3, 19.0, 0.5, 15, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Sojasauce',                  'protein', true, 53, 8.0, 5.0,  0.1, 15, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Worcestersauce',             'carbs',   true, 78, 0.0, 19.0, 0.0, 10, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Balsamico-Essig',            'carbs',   true, 88, 0.5, 17.0, 0.0, 15, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Weißweinessig',              'carbs',   true, 19, 0.0, 0.4,  0.0, 15, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Zitronensaft',               'carbs',   true, 22, 0.4, 6.9,  0.2, 15, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Limettensaft',               'carbs',   true, 25, 0.4, 8.4,  0.1, 15, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),

  -- Fette zum Braten
  ('Butterschmalz',              'fett',    true, 900, 0.2, 0.0, 99.8, 10, 'fruehstueck,mittag,abend,snack', null, null, 'milch_eier', true),

  -- Fluessigkeiten
  ('Gemüsebrühe',                'carbs',   true, 4,  0.2, 0.6, 0.1,  250, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Rinderbrühe',                'protein', true, 6,  0.8, 0.4, 0.1,  250, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Hühnerbrühe',                'protein', true, 6,  0.8, 0.4, 0.1,  250, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Rotwein',                    'carbs',   true, 85, 0.1, 2.6, 0.0,  100, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Weißwein',                   'carbs',   true, 82, 0.1, 2.6, 0.0,  100, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Sauerrahm (15 %)',           'fett',    true, 162, 3.0, 3.6, 15.0, 30, 'fruehstueck,mittag,abend,snack', null, null, 'milch_eier', true),
  ('Cremefine zum Kochen (15 %)','fett',    true, 152, 2.4, 3.5, 15.0, 50, 'fruehstueck,mittag,abend,snack', null, null, 'milch_eier', true),
  ('Passierte Tomaten',          'gemuese', true, 35, 1.5, 6.0, 0.3,  200, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),
  ('Gehackte Tomaten (Dose)',    'gemuese', true, 32, 1.3, 5.4, 0.3,  200, 'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true),

  -- Fertigkomponenten und Basics
  ('Weizenmehl (Typ 700)',       'carbs', true, 348, 10.0, 72.0, 1.0,  30,  'fruehstueck,mittag,abend,snack', null, null, 'getreide', true),
  ('Semmelbrösel',               'carbs', true, 350, 11.0, 68.0, 4.0,  30,  'fruehstueck,mittag,abend,snack', null, null, 'getreide', true),
  ('Semmelknödel (gekocht)',     'carbs', true, 180, 5.0,  33.0, 3.0,  150, 'fruehstueck,mittag,abend,snack', null, null, 'getreide', true),
  ('Spätzle (gekocht)',          'carbs', true, 160, 5.5,  29.0, 2.0,  200, 'fruehstueck,mittag,abend,snack', null, null, 'getreide', true),
  ('Gnocchi (Fertigpackung)',    'carbs', true, 160, 3.6,  33.0, 0.6,  200, 'fruehstueck,mittag,abend,snack', null, null, 'getreide', true),
  ('Spaghetti (gekocht)',        'carbs', true, 158, 5.8,  31.0, 0.9,  200, 'fruehstueck,mittag,abend,snack', null, null, 'getreide', true),
  ('Weizentortilla / Wrap',      'carbs', true, 310, 8.0,  50.0, 8.0,  50,  'fruehstueck,mittag,abend,snack', null, null, 'getreide', true),
  ('Blätterteig',                'carbs', true, 380, 6.0,  36.0, 24.0, 50,  'fruehstueck,mittag,abend,snack', null, null, 'getreide', true);
