-- Migration: Rezepte 1-10 aufwerten (Paket 1 von 3)
--
-- Was passiert hier:
--   1. Die bisherigen 4 Platzhalter-Zutaten je Rezept werden ersetzt durch
--      echte Zutatenlisten mit Gewuerzen, Aromaten und sinnvollen Einheiten.
--   2. anzeige_einheit wird von 'g' auf echte Einheiten umgestellt
--      ("2 Scheiben", "1 Zehe", "1 EL"), menge_g bleibt die Rechengrundlage.
--   3. anleitung wird neu geschrieben - die alte kannte nur 4 Zutaten.
--   4. tipps werden erstmals befuellt.
--   5. zubereitungszeit_min wird auf realistische Werte gesetzt.
--
-- BEWUSST UNVERAENDERT: Die Mengen der vier urspruenglichen Kernzutaten.
-- Dadurch verschieben sich die Naehrwerte nur um das, was neu dazukommt -
-- meist wenige kcal, ausser wo Honig oder Sirup ergaenzt wurde. Ob die
-- Portionsgroessen selbst realistisch sind (80 g gekochter Reis ist knapp),
-- ist eine eigene Entscheidung und nicht Teil dieses Pakets.
--
-- Projekt: wruiyvttftiyskyjjuio.
-- BEREITS AUSGEFUEHRT (2026-09-19).

begin;

-- Alte Zutaten-Zeilen der Rezepte 1-10 entfernen (der Unique-Index auf
-- rezept_id+zutat_id verhindert sonst das Neueinfuegen).
delete from rezept_zutaten where rezept_id between 1 and 10;

insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 1 Beeriges Bircher-Fruehstueck
  (1, 173, 150, 150, 'g',     null,            false, 0),
  (1, 7,    60,  60, 'g',     null,            false, 1),
  (1, 31,  100, 100, 'g',     null,            false, 2),
  (1, 10,   30,  30, 'g',     'grob gehackt',  false, 3),
  (1, 29,   15,   1, 'EL',    null,            false, 4),
  (1, 185,   2,   1, 'TL',    null,            false, 5),
  (1, 203,   5,   1, 'TL',    null,            false, 6),

  -- 2 Griechisches Joghurt-Mueesli
  (2, 35,  150, 150, 'g',     null,            false, 0),
  (2, 66,   60,  60, 'g',     null,            false, 1),
  (2, 30,  120,   1, 'Stück', null,            false, 2),
  (2, 22,   30,  30, 'g',     'grob gehackt',  false, 3),
  (2, 29,   15,   1, 'EL',    null,            false, 4),
  (2, 185,   2,   1, 'TL',    null,            false, 5),

  -- 3 Skyr-Bowl mit Erdbeeren
  (3, 51,  150, 150, 'g',     null,            false, 0),
  (3, 7,    60,  60, 'g',     null,            false, 1),
  (3, 69,  150, 150, 'g',     null,            false, 2),
  (3, 38,   15,   2, 'EL',    null,            false, 3),
  (3, 135,  15,   1, 'EL',    null,            false, 4),
  (3, 203,   5,   1, 'TL',    null,            false, 5),

  -- 4 Kirsch-Kokos-Joghurt
  (4, 174, 150, 150, 'g',     null,            false, 0),
  (4, 7,    60,  60, 'g',     null,            false, 1),
  (4, 130, 120, 120, 'g',     'entsteint',     false, 2),
  (4, 38,   15,   2, 'EL',    null,            false, 3),
  (4, 29,   10,   2, 'TL',    null,            false, 4),
  (4, 185,   2,   1, 'TL',    null,            false, 5),

  -- 5 Avocado-Toast mit Ei
  (5, 4,   120,   2, 'Stück', null,            false, 0),
  (5, 61,   60,   2, 'Scheiben', null,         false, 1),
  (5, 8,    80, 0.5, 'Stück', null,            false, 2),
  (5, 25,  100,   1, 'Stück', null,            false, 3),
  (5, 203,   5,   1, 'TL',    null,            false, 4),
  (5, 175,   1,   1, 'Prise', null,            false, 5),
  (5, 176, 0.5,   1, 'Prise', null,            false, 6),
  (5, 182, 0.5,   1, 'Prise', null,            true,  7),
  (5, 192,   5,   1, 'EL',    'geschnitten',   true,  8),

  -- 6 Lachs-Frischkaese-Brot
  (6, 2,   150, 150, 'g',     'geräuchert',    false, 0),
  (6, 34,   60,   2, 'Scheiben', null,         false, 1),
  (6, 85,   40,   2, 'EL',    null,            false, 2),
  (6, 41,  100, 0.5, 'Stück', null,            false, 3),
  (6, 188,  20, 0.25, 'Stück', 'in Ringen',    false, 4),
  (6, 203,   5,   1, 'TL',    null,            false, 5),
  (6, 176, 0.5,   1, 'Prise', null,            false, 6),
  (6, 192,   5,   1, 'EL',    'geschnitten',   true,  7),

  -- 7 Huettenkaese-Brot mediterran
  (7, 50,  150, 150, 'g',     null,            false, 0),
  (7, 61,   60,   2, 'Scheiben', null,         false, 1),
  (7, 13,  100,   1, 'Stück', 'gewürfelt',     false, 2),
  (7, 9,    15,   1, 'EL',    null,            false, 3),
  (7, 91,    4,   1, 'Zehe',  'fein gehackt',  false, 4),
  (7, 183,   1,   1, 'TL',    null,            false, 5),
  (7, 175,   1,   1, 'Prise', null,            false, 6),
  (7, 176, 0.5,   1, 'Prise', null,            false, 7),
  (7, 191,   5,   4, 'Blätter', null,          true,  8),

  -- 8 Klassiker: Haehnchen, Reis, Brokkoli
  (8, 1,   150, 150, 'g',     null,            false, 0),
  (8, 5,    80,  80, 'g',     null,            false, 1),
  (8, 11,  150, 150, 'g',     'in Röschen',    false, 2),
  (8, 9,    15,   1, 'EL',    null,            false, 3),
  (8, 91,    4,   1, 'Zehe',  'fein gehackt',  false, 4),
  (8, 203,   5,   1, 'TL',    null,            false, 5),
  (8, 175,   1,   1, 'Prise', null,            false, 6),
  (8, 176, 0.5,   1, 'Prise', null,            false, 7),
  (8, 190,   5,   1, 'EL',    'gehackt',       true,  8),

  -- 9 Asiatische Tofu-Bowl
  (9, 3,   150, 150, 'g',     'gewürfelt',     false, 0),
  (9, 59,  180, 180, 'g',     null,            false, 1),
  (9, 154, 100, 100, 'g',     'in Streifen',   false, 2),
  (9, 74,   10,   1, 'EL',    null,            false, 3),
  (9, 199,  15,   1, 'EL',    null,            false, 4),
  (9, 189,  10,   1, 'Stück', 'daumengroß',    false, 5),
  (9, 91,    4,   1, 'Zehe',  'fein gehackt',  false, 6),
  (9, 194,  15,   1, 'Stück', 'in Ringen',     false, 7),
  (9, 151,   5,   1, 'TL',    null,            true,  8),

  -- 10 Lachs mit Suesskartoffel
  (10, 2,  150, 150, 'g',     null,            false, 0),
  (10, 6,  150, 150, 'g',     'in Spalten',    false, 1),
  (10, 12,  80,  80, 'g',     null,            false, 2),
  (10, 9,   15,   1, 'EL',    null,            false, 3),
  (10, 91,   4,   1, 'Zehe',  'fein gehackt',  false, 4),
  (10, 203, 10,   2, 'TL',    null,            false, 5),
  (10, 184,  1,   1, 'TL',    null,            false, 6),
  (10, 175,  1,   1, 'Prise', null,            false, 7),
  (10, 176, 0.5,  1, 'Prise', null,            false, 8);


-- Anleitungen, Tipps und Zubereitungszeiten

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Haferflocken mit Magerquark und einem guten Schuss Wasser verrühren, bis eine cremige Masse entsteht.","aktion":"ruehren"},
    {"text":"Zitronensaft und Zimt unterrühren, dann mindestens 15 Minuten quellen lassen. Über Nacht im Kühlschrank wird es noch cremiger.","aktion":"warten"},
    {"text":"Mandeln grob hacken und in einer trockenen Pfanne kurz anrösten, bis sie zu duften beginnen.","aktion":"roesten"},
    {"text":"Heidelbeeren unterheben, mit Honig süßen und die gerösteten Mandeln darüberstreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Am Vorabend ansetzen","text":"Die Quarkmasse hält sich zugedeckt zwei Tage im Kühlschrank. Morgens nur noch Obst und Nüsse darauf."},
    {"titel":"Andere Beeren","text":"Himbeeren oder Brombeeren passen genauso. Gefrorene Beeren einfach über Nacht mit einweichen."}
  ]$t$::jsonb
where id = 1;

update rezepte set
  zubereitungszeit_min = 5,
  anleitung = $j$[
    {"text":"Banane in Scheiben schneiden, Walnüsse grob hacken.","aktion":"schneiden"},
    {"text":"Griechisches Joghurt mit Honig und Zimt glattrühren.","aktion":"ruehren"},
    {"text":"Müsli in eine Schüssel geben und das Joghurt darauf verteilen.","aktion":"mischen"},
    {"text":"Mit Bananenscheiben und Walnüssen belegen und gleich servieren, solange das Müsli noch knusprig ist.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Knusprig halten","text":"Müsli erst unmittelbar vor dem Essen dazugeben. Wer es vorbereiten will, füllt es in ein zweites Glas und schüttet es später darüber."},
    {"titel":"Weniger süß","text":"Bei einer sehr reifen Banane kann der Honig komplett wegbleiben."}
  ]$t$::jsonb
where id = 2;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Erdbeeren waschen, das Grün entfernen und vierteln.","aktion":"schneiden"},
    {"text":"Skyr mit Ahornsirup und Zitronensaft cremig rühren.","aktion":"ruehren"},
    {"text":"Kokosflocken in einer trockenen Pfanne bei mittlerer Hitze goldbraun rösten. Dabei nicht weggehen, sie verbrennen schnell.","aktion":"roesten"},
    {"text":"Haferflocken unter den Skyr heben, Erdbeeren darauf verteilen und mit den Kokosflocken bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Kokosflocken auf Vorrat","text":"Gleich eine größere Menge rösten und luftdicht aufbewahren, dann geht es beim nächsten Mal schneller."},
    {"titel":"Cremiger","text":"Ein Esslöffel Wasser oder Milch macht den Skyr geschmeidiger, ohne ihn zu verwässern."}
  ]$t$::jsonb
where id = 3;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Kirschen entsteinen und halbieren.","aktion":"schneiden"},
    {"text":"Proteinjoghurt mit Zimt und Honig glattrühren.","aktion":"ruehren"},
    {"text":"Haferflocken und Kokosflocken untermischen und fünf Minuten ziehen lassen.","aktion":"warten"},
    {"text":"Kirschen daraufgeben und servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Ohne Entsteiner","text":"Kirschen mit einem Trinkhalm vom Stielansatz her durchstoßen, der Kern springt heraus."},
    {"titel":"Winterversion","text":"Tiefgekühlte Kirschen funktionieren genauso. Auftauen lassen und den austretenden Saft mit unterrühren."}
  ]$t$::jsonb
where id = 4;

update rezepte set
  zubereitungszeit_min = 15,
  anleitung = $j$[
    {"text":"Eier in kochendes Wasser geben und sieben Minuten wachsweich kochen, danach kalt abschrecken und schälen.","aktion":"kochen"},
    {"text":"Vollkornbrot im Toaster oder in einer trockenen Pfanne goldbraun rösten.","aktion":"roesten"},
    {"text":"Avocado mit einer Gabel zerdrücken und mit Zitronensaft, Salz und Pfeffer abschmecken.","aktion":"mischen"},
    {"text":"Paradeiser in Scheiben schneiden, Eier halbieren.","aktion":"schneiden"},
    {"text":"Avocadocreme auf das Brot streichen, Paradeiser und Eier darauf verteilen, mit Chiliflocken und Schnittlauch bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Eier auf den Punkt","text":"Sieben Minuten ergeben einen noch leicht flüssigen Kern. Wer es fester mag, nimmt neun Minuten."},
    {"titel":"Avocado hält länger","text":"Der Zitronensaft ist nicht nur Geschmack, er verhindert auch, dass die Creme braun wird."}
  ]$t$::jsonb
where id = 5;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Gurke und rote Zwiebel in dünne Scheiben schneiden.","aktion":"schneiden"},
    {"text":"Frischkäse mit Zitronensaft und Pfeffer verrühren.","aktion":"ruehren"},
    {"text":"Roggenbrot mit der Frischkäsecreme bestreichen.","aktion":"mischen"},
    {"text":"Lachs auflegen, Gurke und Zwiebelringe daraufgeben und mit Schnittlauch bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Zwiebel milder machen","text":"Die Ringe fünf Minuten in kaltes Wasser legen, dann verlieren sie ihre Schärfe."},
    {"titel":"Mit frischem Lachs","text":"Funktioniert auch mit gebratenem Lachs vom Vortag, dann etwas mehr Zitronensaft verwenden."}
  ]$t$::jsonb
where id = 6;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Paprika in kleine Würfel schneiden, Knoblauch fein hacken.","aktion":"schneiden"},
    {"text":"Hüttenkäse mit Knoblauch, Oregano, Salz und Pfeffer verrühren.","aktion":"ruehren"},
    {"text":"Vollkornbrot rösten und mit dem Olivenöl beträufeln.","aktion":"roesten"},
    {"text":"Hüttenkäse aufstreichen, Paprikawürfel daraufgeben und mit frischem Basilikum belegen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Zieht besser durch","text":"Den gewürzten Hüttenkäse zehn Minuten stehen lassen, bevor er aufs Brot kommt."},
    {"titel":"Deftiger","text":"Ein paar Oliven oder getrocknete Paradeiser passen gut dazu."}
  ]$t$::jsonb
where id = 7;

update rezepte set
  zubereitungszeit_min = 25,
  anleitung = $j$[
    {"text":"Reis nach Packungsanweisung in Salzwasser garen.","aktion":"kochen"},
    {"text":"Hähnchenbrust trocken tupfen und mit Salz und Pfeffer würzen.","aktion":"mischen"},
    {"text":"Olivenöl in einer Pfanne erhitzen und das Hähnchen bei mittlerer Hitze von beiden Seiten goldbraun braten, etwa sechs Minuten pro Seite.","aktion":"braten"},
    {"text":"Brokkoli in Röschen teilen und fünf Minuten in Salzwasser bissfest garen, dann abgießen.","aktion":"kochen"},
    {"text":"Knoblauch fein hacken, kurz im Bratfett mitschwenken und mit Zitronensaft ablöschen.","aktion":"braten"},
    {"text":"Alles anrichten und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Saftig bleiben","text":"Das Hähnchen nach dem Braten zwei Minuten ruhen lassen, bevor es angeschnitten wird."},
    {"titel":"Brokkoli mit Biss","text":"Nach dem Abgießen kurz kalt abschrecken, dann bleibt er grün und gart nicht nach."}
  ]$t$::jsonb
where id = 8;

update rezepte set
  zubereitungszeit_min = 25,
  anleitung = $j$[
    {"text":"Quinoa gründlich abspülen und nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Tofu trocken tupfen und würfeln, Ingwer und Knoblauch fein hacken.","aktion":"schneiden"},
    {"text":"Sesamöl in einer Pfanne erhitzen und den Tofu darin rundum knusprig braten.","aktion":"braten"},
    {"text":"Ingwer und Knoblauch kurz mitbraten, dann mit Sojasauce ablöschen.","aktion":"braten"},
    {"text":"Chinakohl in Streifen schneiden und ein bis zwei Minuten mitschwenken, er soll Biss behalten.","aktion":"braten"},
    {"text":"Auf dem Quinoa anrichten und mit Frühlingszwiebel und Sesam bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Knuspriger Tofu","text":"Den Tofu vorher gut ausdrücken und in der Pfanne liegen lassen, statt ständig zu wenden."},
    {"titel":"Schärfe","text":"Eine frische Chili mitbraten oder zum Schluss Chiliflocken darüber."}
  ]$t$::jsonb
where id = 9;

update rezepte set
  zubereitungszeit_min = 30,
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Süßkartoffel schälen und in Spalten schneiden.","aktion":"schneiden"},
    {"text":"Spalten mit der Hälfte des Olivenöls, Salz, Pfeffer und Thymian mischen und 25 Minuten im Rohr rösten.","aktion":"roesten"},
    {"text":"Lachs mit Salz, Pfeffer und Zitronensaft würzen.","aktion":"mischen"},
    {"text":"Restliches Olivenöl erhitzen, Lachs auf der Hautseite vier Minuten braten, wenden und zwei Minuten fertig garen.","aktion":"braten"},
    {"text":"Knoblauch hacken und mit dem Spinat kurz in der Pfanne zusammenfallen lassen.","aktion":"braten"},
    {"text":"Süßkartoffelspalten, Spinat und Lachs anrichten.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Knusprige Haut","text":"Die Pfanne richtig heiß werden lassen und den Lachs nicht bewegen, solange er auf der Haut brät."},
    {"titel":"Alles aus dem Rohr","text":"Der Lachs kann auch die letzten zehn Minuten zu den Süßkartoffeln ins Rohr, dann bleibt nur eine Form zum Abwaschen."}
  ]$t$::jsonb
where id = 10;

commit;


-- Naehrwerte neu berechnen (Cache, siehe CLAUDE.md Abschnitt 9)
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 1 and 10;

-- Kontrolle: neue Werte ansehen
select id, titel, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 1 and 10
order by id;

-- Kontrolle: Zutatenzahl je Rezept (erwartet 6 bis 9)
select rezept_id, count(*) as zutaten
from rezept_zutaten
where rezept_id between 1 and 10
group by rezept_id
order by rezept_id;
