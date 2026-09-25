-- BEREITS AUSGEFUEHRT (Stand: 2026-09-25, 40 Rezepte in der App geprueft,
-- Bilder und Filter funktionieren). Nur noch als Dokumentation im Repo,
-- nicht erneut ausfuehren.
--
-- Migration: Neue Rezepte, Paket 1 von 7 (Rezepte 31-40, Fruehstueck)
--
-- Quelle: docs/gusto-70-neue-rezepte.md
-- Bilder liegen bereits im Bucket (rezept-31.png bis rezept-40.png).
--
-- ============================================================
-- ANNAHMEN, DIE VOR DEM AUSFUEHREN GEPRUEFT WERDEN MUESSEN
-- (Claude Code prueft gegen das echte Schema und die Bestandsdaten)
--
--  1. rezepte.mahlzeit nutzt 'fruehstueck'
--  2. rezepte.eigenschaft nutzt 'suess' / 'deftig'
--  3. rezepte.diaeten ist ein text-Array mit den Werten
--     'vegetarisch', 'vegan', 'glutenfrei'
--  4. rezepte.id: explizite IDs 31-40 werden gesetzt, damit sie zu den
--     Bilddateien passen. "overriding system value" ist fuer den Fall
--     einer Identity-Spalte enthalten. Danach wird die Sequenz auf den
--     neuen Hoechstwert gesetzt.
--  5. bild_url wird aus dem Bestand abgeleitet (Format von Rezept 1,
--     Dateiname ausgetauscht) - funktioniert unabhaengig davon, ob dort
--     eine volle URL oder nur ein Pfad steht.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Fehlende Zutaten ergaenzen
-- ------------------------------------------------------------
insert into zutaten
  (name, kategorie, aktiv, kalorien, protein_g, carbs_g, fett_g, portion_g,
   mahlzeiten, diaeten, eigenschaft, supermarkt_kategorie, ist_grundzutat)
values
  ('Milch (1,5 %)', 'protein', true, 47,  3.4, 4.9, 1.5, 200,
   'fruehstueck,mittag,abend,snack', null, null, 'milch_eier', false),
  ('Himbeeren',     'obst',    true, 52,  1.2, 12,  0.7, 100,
   'fruehstueck,mittag,abend,snack', null, null, 'obst_gemuese', false),
  ('Backpulver',    'carbs',   true, 53,  0,   28,  0,   4,
   'fruehstueck,mittag,abend,snack', null, null, 'sonstiges', true);


-- ------------------------------------------------------------
-- 2) Rezepte anlegen
-- ------------------------------------------------------------
insert into rezepte
  (id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten,
   zubereitungszeit_min, portionen)
overriding system value
values
  (31, 'Protein-Pancakes mit Beeren',
   'Fluffige Pancakes aus Magerquark und Haferflocken mit frischen Beeren.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-31.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 20, 1),

  (32, 'Hüttenkäse-Fladenbrot mit Ei',
   'Knuspriges Fladenbrot aus Hüttenkäse, belegt mit Spiegelei und Schnittlauch.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-32.png'),
   'fruehstueck', 'deftig', array['vegetarisch','glutenfrei'], 40, 1),

  (33, 'Overnight Oats mit Erdnussbutter',
   'Über Nacht gequollene Haferflocken mit Erdnussbutter und Banane.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-33.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 5, 1),

  (34, 'Rührei mit Spinat und Feta',
   'Cremiges Rührei mit jungem Spinat und zerbröseltem Feta.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-34.png'),
   'fruehstueck', 'deftig', array['vegetarisch','glutenfrei'], 10, 1),

  (35, 'Beeren-Smoothie-Bowl mit Skyr',
   'Dicke Smoothie-Bowl aus Skyr und Beeren mit Mandeln obenauf.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-35.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 10, 1),

  (36, 'Vollkorntoast mit Ricotta und Banane',
   'Geröstetes Vollkornbrot mit cremigem Ricotta, Bananenscheiben und Honig.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-36.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 5, 1),

  (37, 'Quark-Porridge mit Apfel und Zimt',
   'Warmer Porridge mit Magerquark, geriebenem Apfel und Zimt.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-37.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 10, 1),

  (38, 'Shakshuka mit Kichererbsen',
   'Pochierte Eier in würziger Paradeisersauce mit Kichererbsen.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-38.png'),
   'fruehstueck', 'deftig', array['vegetarisch','glutenfrei'], 25, 1),

  (39, 'Eiklar-Wrap mit Putenbrust',
   'Dünner Wrap aus Eiklar, gefüllt mit Putenbrust und Spinat.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-39.png'),
   'fruehstueck', 'deftig', array['glutenfrei'], 10, 1),

  (40, 'Joghurt-Parfait mit Granola',
   'Geschichtetes griechisches Joghurt mit Müsli, Beeren und Honig.',
   replace((select bild_url from rezepte where id = 1), 'rezept-1.png', 'rezept-40.png'),
   'fruehstueck', 'suess', array['vegetarisch'], 5, 1);

-- Sequenz auf den neuen Hoechstwert setzen, damit kuenftige Inserts
-- ohne explizite ID nicht mit 31-40 kollidieren.
select setval(pg_get_serial_sequence('rezepte', 'id'), (select max(id) from rezepte));


-- ------------------------------------------------------------
-- 3) Zutaten der Rezepte
--    Neue Zutaten per exaktem Namen aufgeloest - sicher, weil sie in
--    derselben Transaktion mit genau diesem Namen angelegt wurden.
-- ------------------------------------------------------------
insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 31 Protein-Pancakes mit Beeren
  (31, 173, 125, 125, 'g',     null,               false, 0),
  (31, 7,    50,  50, 'g',     null,               false, 1),
  (31, 4,    60,   1, 'Stück', null,               false, 2),
  (31, (select id from zutaten where name = 'Himbeeren'), 60, 60, 'g', null, false, 3),
  (31, 31,   60,  60, 'g',     null,               false, 4),
  (31, (select id from zutaten where name = 'Backpulver'), 4, 1, 'TL', null, false, 5),
  (31, 185,   1, 0.5, 'TL',    null,               false, 6),
  (31, 140,   5,   1, 'TL',    'zum Ausbacken',    false, 7),
  (31, 135,  15,   1, 'EL',    null,               false, 8),

  -- 32 Huettenkaese-Fladenbrot mit Ei
  (32, 50,  150, 150, 'g',     null,               false, 0),
  (32, 4,   120,   2, 'Stück', '1 für den Teig, 1 zum Belegen', false, 1),
  (32, 25,  100,   1, 'Stück', 'in Scheiben',      false, 2),
  (32, 140,   5,   1, 'TL',    null,               false, 3),
  (32, 183,   1,   1, 'TL',    null,               false, 4),
  (32, 175,   1,   1, 'Prise', null,               false, 5),
  (32, 176, 0.5,   1, 'Prise', null,               false, 6),
  (32, 192,   5,   1, 'EL',    'geschnitten',      true,  7),

  -- 33 Overnight Oats mit Erdnussbutter
  (33, 7,    60,  60, 'g',     null,               false, 0),
  (33, (select id from zutaten where name = 'Milch (1,5 %)'), 150, 150, 'ml', null, false, 1),
  (33, 35,  100, 100, 'g',     null,               false, 2),
  (33, 40,   15,   1, 'EL',    null,               false, 3),
  (33, 30,  100,   1, 'Stück', 'in Scheiben',      false, 4),
  (33, 78,   10,   1, 'EL',    null,               false, 5),
  (33, 185,   1, 0.5, 'TL',    null,               true,  6),

  -- 34 Ruehrei mit Spinat und Feta
  (34, 4,   180,   3, 'Stück', null,               false, 0),
  (34, 12,   80,  80, 'g',     null,               false, 1),
  (34, 82,   40,  40, 'g',     'zerbröselt',       false, 2),
  (34, 23,    5,   1, 'TL',    null,               false, 3),
  (34, 175,   1,   1, 'Prise', null,               false, 4),
  (34, 176, 0.5,   1, 'Prise', null,               false, 5),
  (34, 182, 0.5,   1, 'Prise', null,               true,  6),
  (34, 192,   5,   1, 'EL',    'geschnitten',      true,  7),

  -- 35 Beeren-Smoothie-Bowl mit Skyr
  (35, 51,  200, 200, 'g',     null,               false, 0),
  (35, (select id from zutaten where name = 'Himbeeren'), 80, 80, 'g', 'tiefgekühlt', false, 1),
  (35, 31,   80,  80, 'g',     'tiefgekühlt',      false, 2),
  (35, 30,   60, 0.5, 'Stück', null,               false, 3),
  (35, 7,    20,   2, 'EL',    null,               false, 4),
  (35, 10,   15,   1, 'EL',    'gehobelt',         false, 5),
  (35, 29,   10,   2, 'TL',    null,               true,  6),

  -- 36 Vollkorntoast mit Ricotta und Banane
  (36, 61,   60,   2, 'Scheiben', null,            false, 0),
  (36, 115,  60,  60, 'g',     null,               false, 1),
  (36, 173,  60,  60, 'g',     null,               false, 2),
  (36, 30,  100,   1, 'Stück', 'in Scheiben',      false, 3),
  (36, 22,   15,  15, 'g',     'grob gehackt',     false, 4),
  (36, 29,   10,   2, 'TL',    null,               false, 5),
  (36, 185,   1,   1, 'Prise', null,               false, 6),

  -- 37 Quark-Porridge mit Apfel und Zimt
  (37, 7,    50,  50, 'g',     null,               false, 0),
  (37, (select id from zutaten where name = 'Milch (1,5 %)'), 200, 200, 'ml', null, false, 1),
  (37, 173, 100, 100, 'g',     null,               false, 2),
  (37, 32,  120,   1, 'Stück', null,               false, 3),
  (37, 22,   15,  15, 'g',     'grob gehackt',     false, 4),
  (37, 185,   2,   1, 'TL',    null,               false, 5),
  (37, 135,  10,   2, 'TL',    null,               true,  6),

  -- 38 Shakshuka mit Kichererbsen
  (38, 4,   120,   2, 'Stück', null,               false, 0),
  (38, 48,  100, 100, 'g',     'abgetropft',       false, 1),
  (38, 214, 200, 0.5, 'Dose',  null,               false, 2),
  (38, 13,  100,   1, 'Stück', 'gewürfelt',        false, 3),
  (38, 90,   55, 0.5, 'Stück', 'fein gewürfelt',   false, 4),
  (38, 91,    4,   1, 'Zehe',  'fein gehackt',     false, 5),
  (38, 9,    10,   2, 'TL',    null,               false, 6),
  (38, 180,   2,   1, 'TL',    null,               false, 7),
  (38, 177,   2,   1, 'TL',    null,               false, 8),
  (38, 175,   1,   1, 'Prise', null,               false, 9),
  (38, 176, 0.5,   1, 'Prise', null,               false, 10),
  (38, 182, 0.5,   1, 'Prise', null,               true,  11),
  (38, 190,   5,   1, 'EL',    'gehackt',          true,  12),

  -- 39 Eiklar-Wrap mit Putenbrust
  (39, 172, 120,   4, 'Stück', null,               false, 0),
  (39, 43,   80,  80, 'g',     'gegart, in Scheiben', false, 1),
  (39, 85,   30,   2, 'EL',    null,               false, 2),
  (39, 12,   30,  30, 'g',     null,               false, 3),
  (39, 25,   50, 0.5, 'Stück', 'in Scheiben',      false, 4),
  (39, 140,   5,   1, 'TL',    null,               false, 5),
  (39, 175,   1,   1, 'Prise', null,               false, 6),
  (39, 176, 0.5,   1, 'Prise', null,               false, 7),
  (39, 192,   5,   1, 'EL',    'geschnitten',      true,  8),

  -- 40 Joghurt-Parfait mit Granola
  (40, 35,  200, 200, 'g',     null,               false, 0),
  (40, 66,   40,  40, 'g',     'knusprig',         false, 1),
  (40, 69,   80,  80, 'g',     'geviertelt',       false, 2),
  (40, 31,   50,  50, 'g',     null,               false, 3),
  (40, 29,   10,   2, 'TL',    null,               false, 4),
  (40, 10,   10,  10, 'g',     'gehobelt',         true,  5);


-- ------------------------------------------------------------
-- 4) Anleitungen und Tipps
-- ------------------------------------------------------------
update rezepte set
  anleitung = $j$[
    {"text":"Haferflocken im Mixer fein mahlen. Mit Magerquark, Ei, Backpulver und Zimt zu einem dicken, glatten Teig verrühren.","aktion":"mischen"},
    {"text":"Den Teig fünf Minuten ruhen lassen, damit die Haferflocken quellen.","aktion":"warten"},
    {"text":"Eine beschichtete Pfanne mit etwas Rapsöl bei mittlerer Hitze erhitzen. Pro Pancake einen Esslöffel Teig hineingeben und etwa zwei Minuten backen, bis sich an der Oberfläche Bläschen bilden.","aktion":"braten"},
    {"text":"Wenden und eine weitere Minute goldbraun backen. Mit dem restlichen Teig genauso verfahren.","aktion":"braten"},
    {"text":"Pancakes stapeln, mit den Beeren belegen und mit Ahornsirup beträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Mittlere Hitze reicht","text":"Quarkteig bräunt schneller als normaler Pancake-Teig. Bei zu starker Hitze werden die Pancakes außen dunkel und bleiben innen roh."},
    {"titel":"Auf Vorrat","text":"Die Pancakes lassen sich gut einfrieren. Morgens einfach im Toaster aufbacken."}
  ]$t$::jsonb
where id = 31;

update rezepte set
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad Ober- und Unterhitze vorheizen. Hüttenkäse mit einem Ei, Oregano, Salz und Pfeffer im Mixer glatt pürieren.","aktion":"mischen"},
    {"text":"Die Masse auf einem mit Backpapier belegten Blech zu einem dünnen, runden Fladen verstreichen, etwa einen halben Zentimeter dick.","aktion":"mischen"},
    {"text":"30 bis 35 Minuten backen, bis der Fladen goldbraun und fest ist und sich vom Papier lösen lässt.","aktion":"roesten"},
    {"text":"Kurz vor Ende der Backzeit das zweite Ei in wenig Rapsöl als Spiegelei braten.","aktion":"braten"},
    {"text":"Den Fladen mit dem Spiegelei, den Paradeiserscheiben und Schnittlauch belegen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Dünn verstreichen","text":"Je dünner der Fladen, desto knuspriger wird er. Ist er zu dick, bleibt die Mitte weich."},
    {"titel":"Als Wrap","text":"Noch warm lässt sich der Fladen einrollen und mit beliebiger Füllung als Wrap essen."}
  ]$t$::jsonb
where id = 32;

update rezepte set
  anleitung = $j$[
    {"text":"Haferflocken, Chiasamen und Zimt in ein Schraubglas geben.","aktion":"mischen"},
    {"text":"Milch und griechisches Joghurt dazugeben und gründlich verrühren, bis keine trockenen Flocken mehr zu sehen sind.","aktion":"ruehren"},
    {"text":"Das Glas verschließen und über Nacht, mindestens aber vier Stunden, im Kühlschrank quellen lassen.","aktion":"warten"},
    {"text":"Morgens kurz umrühren, Bananenscheiben darauflegen und die Erdnussbutter darüberziehen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Zu fest geworden","text":"Chiasamen binden stark nach. Einfach einen Schuss Milch unterrühren."},
    {"titel":"Erdnussbutter zum Träufeln","text":"Das Glas kurz in warmes Wasser stellen, dann wird die Erdnussbutter flüssig und lässt sich schön darüberziehen."}
  ]$t$::jsonb
where id = 33;

update rezepte set
  anleitung = $j$[
    {"text":"Eier in einer Schüssel mit Salz und Pfeffer verquirlen.","aktion":"ruehren"},
    {"text":"Butter in einer Pfanne bei mittlerer Hitze schmelzen und den Spinat darin zusammenfallen lassen.","aktion":"braten"},
    {"text":"Hitze reduzieren, die Eier dazugießen und mit einem Pfannenwender langsam von außen nach innen schieben, bis sie gerade gestockt, aber noch cremig sind.","aktion":"braten"},
    {"text":"Pfanne vom Herd nehmen, Feta unterheben und mit Chiliflocken und Schnittlauch bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Cremig bleiben","text":"Die Pfanne vom Herd nehmen, solange das Ei noch leicht feucht glänzt. Es gart in der Restwärme nach."},
    {"titel":"Feta salzt mit","text":"Feta ist kräftig gesalzen. Beim Würzen der Eier lieber sparsam sein."}
  ]$t$::jsonb
where id = 34;

update rezepte set
  anleitung = $j$[
    {"text":"Tiefgekühlte Beeren, die halbe Banane und den Skyr im Mixer zu einer dicken, cremigen Masse pürieren.","aktion":"mischen"},
    {"text":"Ist die Masse zu fest für den Mixer, einen Esslöffel Wasser dazugeben - sparsam, die Bowl soll löffelfest bleiben.","aktion":"ruehren"},
    {"text":"In eine Schüssel füllen, mit Haferflocken und gehobelten Mandeln bestreuen und nach Belieben mit Honig beträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Gefrorene Früchte sind der Trick","text":"Nur mit tiefgekühlten Beeren wird die Bowl dick und löffelfest. Mit frischen wird es ein Smoothie zum Trinken."},
    {"titel":"Mandeln rösten","text":"Gehobelte Mandeln kurz ohne Fett in der Pfanne anrösten - das dauert eine Minute und macht viel Geschmack."}
  ]$t$::jsonb
where id = 35;

update rezepte set
  anleitung = $j$[
    {"text":"Vollkornbrot im Toaster goldbraun rösten.","aktion":"roesten"},
    {"text":"Ricotta und Magerquark mit einer Prise Zimt glattrühren.","aktion":"ruehren"},
    {"text":"Die Creme auf das warme Brot streichen und mit Bananenscheiben belegen.","aktion":"mischen"},
    {"text":"Mit gehackten Walnüssen bestreuen und mit Honig beträufeln.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Warum Quark dazu","text":"Der Magerquark hebt den Proteingehalt deutlich, ohne dass der milde Ricotta-Geschmack verloren geht."},
    {"titel":"Karamellisierte Banane","text":"Die Bananenscheiben kurz in einer trockenen Pfanne anbraten, bis sie leicht bräunen."}
  ]$t$::jsonb
where id = 36;

update rezepte set
  anleitung = $j$[
    {"text":"Apfel waschen, eine Hälfte grob raspeln, die andere in dünne Spalten schneiden.","aktion":"schneiden"},
    {"text":"Haferflocken mit Milch, geraspeltem Apfel und Zimt aufkochen und bei kleiner Hitze drei bis vier Minuten unter Rühren köcheln lassen.","aktion":"kochen"},
    {"text":"Topf vom Herd nehmen und den Magerquark unterrühren. Nicht mehr kochen lassen, sonst flockt er aus.","aktion":"ruehren"},
    {"text":"In eine Schüssel füllen, mit Apfelspalten und Walnüssen belegen und nach Belieben mit Ahornsirup süßen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Quark erst zum Schluss","text":"Quark verträgt keine Kochhitze. Erst unterrühren, wenn der Topf vom Herd ist."},
    {"titel":"Im Herbst","text":"Eine reife Birne statt des Apfels macht den Porridge süßer, der Ahornsirup kann dann wegbleiben."}
  ]$t$::jsonb
where id = 37;

update rezepte set
  anleitung = $j$[
    {"text":"Zwiebel, Knoblauch und Paprika klein schneiden.","aktion":"schneiden"},
    {"text":"Olivenöl in einer kleinen Pfanne erhitzen, Zwiebel und Paprika fünf Minuten weich dünsten. Knoblauch, Kreuzkümmel und Paprikapulver eine Minute mitrösten.","aktion":"braten"},
    {"text":"Gehackte Tomaten und Kichererbsen dazugeben, salzen, pfeffern und zehn Minuten einköcheln lassen, bis die Sauce dicklich ist.","aktion":"kochen"},
    {"text":"Mit einem Löffel zwei Mulden in die Sauce drücken und je ein Ei hineinschlagen.","aktion":"mischen"},
    {"text":"Zugedeckt bei kleiner Hitze fünf bis sieben Minuten stocken lassen, bis das Eiweiß fest und das Eigelb noch flüssig ist.","aktion":"warten"},
    {"text":"Mit Petersilie und Chiliflocken bestreuen und direkt aus der Pfanne servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Eigelb flüssig halten","text":"Sobald das Eiweiß rundum weiß ist, sofort vom Herd nehmen. Der Deckel sorgt dafür, dass die Oberseite gart, ohne dass der Boden anbrennt."},
    {"titel":"Zum Tunken","text":"Ein Stück Brot passt perfekt dazu - dann ist das Gericht allerdings nicht mehr glutenfrei."}
  ]$t$::jsonb
where id = 38;

update rezepte set
  anleitung = $j$[
    {"text":"Eiklar mit Salz und Pfeffer kräftig verquirlen.","aktion":"ruehren"},
    {"text":"Eine große beschichtete Pfanne dünn mit Rapsöl ausstreichen und bei mittlerer Hitze erhitzen. Eiklar hineingießen und durch Schwenken gleichmäßig verteilen.","aktion":"braten"},
    {"text":"Bei kleiner Hitze zugedeckt etwa zwei Minuten stocken lassen, bis die Oberfläche nicht mehr flüssig ist, dann vorsichtig auf einen Teller gleiten lassen.","aktion":"braten"},
    {"text":"Den Eiklar-Fladen mit Frischkäse bestreichen und mit Spinat, Putenbrust, Paradeisern und Schnittlauch belegen.","aktion":"mischen"},
    {"text":"Fest einrollen und schräg halbieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Damit nichts reißt","text":"Kleine Hitze und Deckel sind entscheidend. Bei zu viel Hitze wird das Eiklar gummiartig und bricht beim Rollen."},
    {"titel":"Zum Mitnehmen","text":"Fest in Backpapier gewickelt hält der Wrap im Kühlschrank bis zum Mittag."}
  ]$t$::jsonb
where id = 39;

update rezepte set
  anleitung = $j$[
    {"text":"Erdbeeren waschen und vierteln.","aktion":"schneiden"},
    {"text":"Griechisches Joghurt mit dem Honig glattrühren.","aktion":"ruehren"},
    {"text":"In ein Glas abwechselnd Joghurt, Müsli und Beeren schichten, mit einer Schicht Joghurt beginnen.","aktion":"mischen"},
    {"text":"Mit den restlichen Beeren und gehobelten Mandeln abschließen und sofort servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Knusprig halten","text":"Das Müsli weicht schnell durch. Für unterwegs getrennt mitnehmen und erst vor dem Essen darüberstreuen."},
    {"titel":"Mehr Protein","text":"Die Hälfte des Joghurts durch Skyr ersetzen - der Geschmack bleibt fast gleich."}
  ]$t$::jsonb
where id = 40;

commit;


-- ------------------------------------------------------------
-- 5) Naehrwerte berechnen und kontrollieren
-- ------------------------------------------------------------
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 31 and 40;

-- Neue Werte ansehen
select id, titel, mahlzeit, eigenschaft, diaeten, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 31 and 40
order by id;

-- Zutatenzahl je Rezept (erwartet 6 bis 13)
select rezept_id, count(*) as zutaten
from rezept_zutaten
where rezept_id between 31 and 40
group by rezept_id
order by rezept_id;

-- Gesamtzahl Rezepte (erwartet 40)
select count(*) as rezepte_gesamt from rezepte;
