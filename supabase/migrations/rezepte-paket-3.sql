-- Migration: Rezepte 21-30 aufwerten (Paket 3 von 3)
--
-- Gleiches Vorgehen wie Paket 1 und 2. Mit diesem Paket sind alle 30
-- bestehenden Rezepte auf echte Zutatenlisten umgestellt.
--
-- Die Snacks (25-30) bleiben bewusst schlanker als die Hauptgerichte -
-- ein Snack mit zwölf Zutaten waere kein Snack mehr.
--
-- BEWUSST UNVERAENDERT: Die Mengen der vier urspruenglichen Kernzutaten.
--
-- Projekt: wruiyvttftiyskyjjuio.
-- BEREITS AUSGEFUEHRT (2026-09-20).

begin;

delete from rezept_zutaten where rezept_id between 21 and 30;

insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 21 Lachs mit Spargel
  (21, 2,   150, 150, 'g',      null,               false, 0),
  (21, 58,  180, 180, 'g',      null,               false, 1),
  (21, 162, 150, 150, 'g',      'holzige Enden entfernt', false, 2),
  (21, 9,    15,   1, 'EL',     null,               false, 3),
  (21, 203,  10,   2, 'TL',     null,               false, 4),
  (21, 91,    4,   1, 'Zehe',   'angedrückt',       false, 5),
  (21, 175,   1,   1, 'Prise',  null,               false, 6),
  (21, 176, 0.5,   1, 'Prise',  null,               false, 7),
  (21, 192,   5,   1, 'EL',     'geschnitten',      true,  8),

  -- 22 Rote-Linsen-Curry-Bowl
  (22, 108, 150, 150, 'g',      null,               false, 0),
  (22, 6,   150, 150, 'g',      'gewürfelt',        false, 1),
  (22, 12,   80,  80, 'g',      null,               false, 2),
  (22, 143, 100, 100, 'ml',     null,               false, 3),
  (22, 206, 200, 200, 'ml',     null,               false, 4),
  (22, 9,    15,   1, 'EL',     null,               false, 5),
  (22, 90,   55, 0.5, 'Stück',  'fein gewürfelt',   false, 6),
  (22, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 7),
  (22, 189,  10,   1, 'Stück',  'daumengroß',       false, 8),
  (22, 181,   3,   1, 'TL',     null,               false, 9),
  (22, 204,  10,   2, 'TL',     null,               false, 10),
  (22, 175,   1,   1, 'Prise',  null,               false, 11),
  (22, 176, 0.5,   1, 'Prise',  null,               false, 12),
  (22, 193,   5,   1, 'EL',     'gehackt',          true,  13),

  -- 23 Pute mit Champignons
  (23, 43,  150, 150, 'g',      'in Streifen',      false, 0),
  (23, 18,   80,  80, 'g',      null,               false, 1),
  (23, 92,  100, 100, 'g',      'in Scheiben',      false, 2),
  (23, 212,  50,  50, 'ml',     null,               false, 3),
  (23, 9,    15,   1, 'EL',     null,               false, 4),
  (23, 90,   55, 0.5, 'Stück',  'fein gewürfelt',   false, 5),
  (23, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 6),
  (23, 175,   1,   1, 'Prise',  null,               false, 7),
  (23, 176, 0.5,   1, 'Prise',  null,               false, 8),
  (23, 190,  10,   2, 'EL',     'gehackt',          true,  9),

  -- 24 Eier-Erdaepfel-Pfanne
  (24, 4,   120,   2, 'Stück',  null,               false, 0),
  (24, 17,  200, 200, 'g',      'gekocht, geschält', false, 1),
  (24, 94,  120, 120, 'g',      null,               false, 2),
  (24, 23,   10,   1, 'EL',     null,               false, 3),
  (24, 90,   55, 0.5, 'Stück',  'in Ringen',        false, 4),
  (24, 177,   2,   1, 'TL',     null,               false, 5),
  (24, 175,   1,   1, 'Prise',  null,               false, 6),
  (24, 176, 0.5,   1, 'Prise',  null,               false, 7),
  (24, 192,   5,   1, 'EL',     'geschnitten',      true,  8),

  -- 25 Skyr-Snack mit Beeren
  (25, 51,  150, 150, 'g',      null,               false, 0),
  (25, 7,    60,  60, 'g',      null,               false, 1),
  (25, 31,  100, 100, 'g',      null,               false, 2),
  (25, 10,   30,  30, 'g',      'grob gehackt',     false, 3),
  (25, 135,  10,   2, 'TL',     null,               false, 4),
  (25, 185,   2,   1, 'TL',     null,               false, 5),

  -- 26 Huettenkaese-Snack
  (26, 50,  150, 150, 'g',      null,               false, 0),
  (26, 126,  20,   2, 'Stück',  null,               false, 1),
  (26, 32,  150,   1, 'Stück',  'gewürfelt',        false, 2),
  (26, 22,   30,  30, 'g',      'grob gehackt',     false, 3),
  (26, 29,   10,   2, 'TL',     null,               false, 4),
  (26, 185,   2,   1, 'TL',     null,               false, 5),

  -- 27 Kichererbsen-Snack
  (27, 48,  150, 150, 'g',      'abgetropft',       false, 0),
  (27, 61,   60,   2, 'Scheiben', null,             false, 1),
  (27, 41,  100, 0.5, 'Stück',  'in Stiften',       false, 2),
  (27, 9,    15,   1, 'EL',     null,               false, 3),
  (27, 86,   15,   1, 'EL',     null,               false, 4),
  (27, 203,  10,   2, 'TL',     null,               false, 5),
  (27, 91,    4,   1, 'Zehe',   null,               false, 6),
  (27, 180,   2,   1, 'TL',     null,               false, 7),
  (27, 177,   1, 0.5, 'TL',     null,               false, 8),
  (27, 175,   1,   1, 'Prise',  null,               false, 9),
  (27, 176, 0.5,   1, 'Prise',  null,               false, 10),

  -- 28 Thunfisch-Snack
  (28, 47,  100, 100, 'g',      'abgetropft',       false, 0),
  (28, 126,  20,   2, 'Stück',  null,               false, 1),
  (28, 8,    80, 0.5, 'Stück',  null,               false, 2),
  (28, 25,  100,   1, 'Stück',  'gewürfelt',        false, 3),
  (28, 203,   5,   1, 'TL',     null,               false, 4),
  (28, 175,   1,   1, 'Prise',  null,               false, 5),
  (28, 176, 0.5,   1, 'Prise',  null,               false, 6),
  (28, 188,  20, 0.25, 'Stück', 'fein gewürfelt',   true,  7),

  -- 29 Edamame-Snack asiatisch
  (29, 107, 100, 100, 'g',      null,               false, 0),
  (29, 126,  20,   2, 'Stück',  null,               false, 1),
  (29, 27,  100,   2, 'Stück',  'in Stiften',       false, 2),
  (29, 74,   10,   1, 'EL',     null,               false, 3),
  (29, 199,  10,   2, 'TL',     null,               false, 4),
  (29, 151,   5,   1, 'TL',     null,               false, 5),
  (29, 204,   5,   1, 'TL',     null,               true,  6),
  (29, 182, 0.5,   1, 'Prise',  null,               true,  7),

  -- 30 Ricotta-Rucola-Brot
  (30, 115, 100, 100, 'g',      null,               false, 0),
  (30, 61,   60,   2, 'Scheiben', null,             false, 1),
  (30, 97,   50,  50, 'g',      null,               false, 2),
  (30, 9,    15,   1, 'EL',     null,               false, 3),
  (30, 203,   5,   1, 'TL',     null,               false, 4),
  (30, 175,   1,   1, 'Prise',  null,               false, 5),
  (30, 176, 0.5,   1, 'Prise',  null,               false, 6),
  (30, 91,    4,   1, 'Zehe',   'zum Einreiben',    true,  7),
  (30, 29,   10,   2, 'TL',     null,               true,  8);


-- Anleitungen, Tipps und Zubereitungszeiten

update rezepte set
  zubereitungszeit_min = 30,
  anleitung = $j$[
    {"text":"Vollkornreis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Spargel waschen, die holzigen Enden abschneiden, das untere Drittel dünn schälen.","aktion":"schneiden"},
    {"text":"Spargel in Salzwasser sechs bis acht Minuten bissfest garen, dann abgießen.","aktion":"kochen"},
    {"text":"Lachs mit Salz, Pfeffer und der Hälfte des Zitronensafts würzen.","aktion":"mischen"},
    {"text":"Olivenöl erhitzen, Knoblauch kurz anbraten und wieder herausnehmen. Lachs auf der Hautseite vier Minuten braten, wenden und zwei Minuten fertig garen.","aktion":"braten"},
    {"text":"Alles anrichten, mit dem restlichen Zitronensaft beträufeln und mit Schnittlauch bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Spargel nicht überkochen","text":"Ein Spargelstück mit dem Messer anstechen - lässt es sich leicht durchstechen, ist er fertig. Danach wird er schnell weich."},
    {"titel":"Grüner Spargel","text":"Der muss nicht geschält werden und ist in vier Minuten gar."}
  ]$t$::jsonb
where id = 21;

update rezepte set
  zubereitungszeit_min = 30,
  anleitung = $j$[
    {"text":"Zwiebel, Knoblauch und Ingwer fein hacken, Süßkartoffel in kleine Würfel schneiden.","aktion":"schneiden"},
    {"text":"Olivenöl in einem Topf erhitzen, Zwiebel glasig dünsten, dann Knoblauch, Ingwer und Currypulver eine Minute mitrösten, bis es duftet.","aktion":"braten"},
    {"text":"Rote Linsen und Süßkartoffelwürfel zugeben, mit Gemüsebrühe und Kokosmilch aufgießen.","aktion":"ruehren"},
    {"text":"Zugedeckt 20 Minuten köcheln lassen, gelegentlich umrühren, bis die Linsen zerfallen und die Süßkartoffel weich ist.","aktion":"kochen"},
    {"text":"Spinat unterheben und zusammenfallen lassen, mit Limettensaft, Salz und Pfeffer abschmecken.","aktion":"ruehren"},
    {"text":"In eine Schüssel geben und mit Koriander bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Zu dick geworden","text":"Rote Linsen binden stark nach. Einfach heißes Wasser oder Brühe löffelweise einrühren."},
    {"titel":"Schmeckt aufgewärmt besser","text":"Hält im Kühlschrank drei Tage und wird dabei runder im Geschmack."}
  ]$t$::jsonb
where id = 22;

update rezepte set
  zubereitungszeit_min = 25,
  anleitung = $j$[
    {"text":"Nudeln nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Putenbrust in Streifen schneiden, Champignons in Scheiben, Zwiebel und Knoblauch fein würfeln.","aktion":"schneiden"},
    {"text":"Olivenöl in einer Pfanne stark erhitzen und die Putenstreifen zwei bis drei Minuten scharf anbraten, dann herausnehmen.","aktion":"braten"},
    {"text":"Champignons in derselben Pfanne braten, bis die Flüssigkeit verdampft ist und sie Farbe bekommen. Zwiebel und Knoblauch zugeben.","aktion":"braten"},
    {"text":"Mit Cremefine ablöschen, kurz einköcheln lassen, die Pute zurückgeben und mit Salz und Pfeffer abschmecken.","aktion":"ruehren"},
    {"text":"Mit den Nudeln anrichten und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Champignons brauchen Platz","text":"Zu viele auf einmal in der Pfanne ziehen Wasser und kochen statt zu braten. Lieber in zwei Runden."},
    {"titel":"Pute bleibt zart","text":"Scharf anbraten und früh herausnehmen - sie gart in der Sauce fertig."}
  ]$t$::jsonb
where id = 23;

update rezepte set
  zubereitungszeit_min = 25,
  anleitung = $j$[
    {"text":"Erdäpfel kochen, auskühlen lassen, schälen und in Scheiben schneiden. Am besten schon am Vortag.","aktion":"schneiden"},
    {"text":"Fisolen putzen und in Salzwasser acht Minuten bissfest garen, dann abgießen.","aktion":"kochen"},
    {"text":"Butter in einer Pfanne erhitzen, Erdäpfelscheiben hineingeben und ohne Rühren goldbraun anbraten, dann wenden.","aktion":"braten"},
    {"text":"Zwiebelringe und Fisolen zugeben, mit Paprikapulver, Salz und Pfeffer würzen und kurz mitbraten.","aktion":"braten"},
    {"text":"Eier verquirlen, über die Pfanne gießen und bei kleiner Hitze stocken lassen.","aktion":"kochen"},
    {"text":"Mit Schnittlauch bestreuen und direkt aus der Pfanne servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Erdäpfel vom Vortag","text":"Gekochte, kalte Erdäpfel bleiben beim Braten in Form. Frisch gekochte zerfallen leicht."},
    {"titel":"Nicht zu viel rühren","text":"Die Scheiben liegen lassen, bis sie sich von selbst lösen - dann werden sie knusprig statt matschig."}
  ]$t$::jsonb
where id = 24;

update rezepte set
  zubereitungszeit_min = 5,
  anleitung = $j$[
    {"text":"Skyr mit Ahornsirup und Zimt glattrühren.","aktion":"ruehren"},
    {"text":"Haferflocken untermischen und fünf Minuten quellen lassen.","aktion":"warten"},
    {"text":"Mandeln grob hacken.","aktion":"schneiden"},
    {"text":"Heidelbeeren daraufgeben und mit den Mandeln bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Für unterwegs","text":"In einem Schraubglas geschichtet hält der Snack im Kühlschrank bis zum nächsten Tag."},
    {"titel":"Mehr Crunch","text":"Die Mandeln kurz in einer trockenen Pfanne anrösten, das lohnt die zwei Minuten."}
  ]$t$::jsonb
where id = 25;

update rezepte set
  zubereitungszeit_min = 5,
  anleitung = $j$[
    {"text":"Apfel würfeln, Walnüsse grob hacken.","aktion":"schneiden"},
    {"text":"Hüttenkäse mit Honig und Zimt verrühren.","aktion":"ruehren"},
    {"text":"Auf den Reiswaffeln verteilen.","aktion":"mischen"},
    {"text":"Apfelwürfel und Walnüsse daraufgeben und gleich essen, solange die Waffeln knusprig sind.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Apfel bleibt hell","text":"Ein paar Tropfen Zitronensaft über die Würfel, dann werden sie nicht braun."},
    {"titel":"Als Schüssel","text":"Ohne Reiswaffeln einfach als Schüssel essen, dann lässt es sich auch gut mitnehmen."}
  ]$t$::jsonb
where id = 26;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Kichererbsen abtropfen lassen und kurz kalt abspülen.","aktion":"mischen"},
    {"text":"Kichererbsen mit Tahini, Olivenöl, Zitronensaft, Knoblauch, Kreuzkümmel und zwei Esslöffeln Wasser fein pürieren.","aktion":"mischen"},
    {"text":"Mit Salz und Pfeffer abschmecken. Ist die Masse zu fest, löffelweise Wasser nachgeben.","aktion":"ruehren"},
    {"text":"Vollkornbrot rösten und in Streifen schneiden, Gurke in Stifte.","aktion":"schneiden"},
    {"text":"Hummus in eine Schüssel geben, mit Paprikapulver bestreuen und Brot und Gurke dazu servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Cremiger wird es mit Eiswasser","text":"Statt lauwarmem Wasser eiskaltes nehmen und länger pürieren - das macht den Hummus deutlich luftiger."},
    {"titel":"Hält drei Tage","text":"Mit einer dünnen Schicht Olivenöl bedeckt bleibt er im Kühlschrank frisch."}
  ]$t$::jsonb
where id = 27;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Thunfisch abtropfen lassen, Paradeiser würfeln, rote Zwiebel fein hacken.","aktion":"schneiden"},
    {"text":"Avocado mit einer Gabel zerdrücken und mit Zitronensaft, Salz und Pfeffer abschmecken.","aktion":"mischen"},
    {"text":"Thunfisch mit Paradeiser und Zwiebel vermengen.","aktion":"mischen"},
    {"text":"Avocadocreme auf die Reiswaffeln streichen, Thunfischmischung daraufgeben und sofort essen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Waffeln bleiben knusprig","text":"Erst unmittelbar vor dem Essen belegen, sonst weichen sie durch."},
    {"titel":"Mehr Würze","text":"Ein Teelöffel Senf in der Thunfischmischung macht den Snack deutlich kräftiger."}
  ]$t$::jsonb
where id = 28;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Edamame nach Packungsanweisung in Salzwasser garen, abgießen und auskühlen lassen.","aktion":"kochen"},
    {"text":"Karotten in feine Stifte schneiden.","aktion":"schneiden"},
    {"text":"Sesamöl, Sojasauce und Limettensaft verrühren und über die Edamame geben.","aktion":"ruehren"},
    {"text":"Mit Sesam und Chiliflocken bestreuen und mit Karottenstiften und Reiswaffeln servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Aus der Schote essen","text":"Edamame in der Schote sind der bessere Snack - das Auspulen macht ihn langsamer und sättigender."},
    {"titel":"Sesam rösten","text":"Kurz in einer trockenen Pfanne geschwenkt schmeckt er deutlich intensiver."}
  ]$t$::jsonb
where id = 29;

update rezepte set
  zubereitungszeit_min = 10,
  anleitung = $j$[
    {"text":"Vollkornbrot rösten und noch warm mit der angeschnittenen Knoblauchzehe einreiben.","aktion":"roesten"},
    {"text":"Ricotta mit Zitronensaft, Salz und Pfeffer cremig rühren.","aktion":"ruehren"},
    {"text":"Ricotta großzügig auf das Brot streichen.","aktion":"mischen"},
    {"text":"Rucola darauf verteilen, mit Olivenöl beträufeln und nach Belieben mit Honig abschließen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Süß trifft bitter","text":"Der Honig ist optional, aber er nimmt dem Rucola die Schärfe und macht aus dem Brot etwas Besonderes."},
    {"titel":"Ricotta cremiger","text":"Ein Esslöffel Olivenöl mit eingerührt macht ihn streichzarter."}
  ]$t$::jsonb
where id = 30;

commit;


-- Naehrwerte neu berechnen (Cache, siehe CLAUDE.md Abschnitt 9)
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 21 and 30;

-- Kontrolle: neue Werte ansehen
select id, titel, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 21 and 30
order by id;

-- Kontrolle: Zutatenzahl je Rezept (erwartet 6 bis 14)
select rezept_id, count(*) as zutaten
from rezept_zutaten
where rezept_id between 21 and 30
group by rezept_id
order by rezept_id;

-- Gesamtkontrolle: kein Rezept darf jetzt noch bei 4 Zutaten stehen
select count(*) as rezepte_mit_hoechstens_vier_zutaten
from (
  select rezept_id from rezept_zutaten group by rezept_id having count(*) <= 4
) sub;
-- Erwartung: 0
