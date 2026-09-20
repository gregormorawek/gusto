-- Migration: Rezepte 11-20 aufwerten (Paket 2 von 3)
--
-- Gleiches Vorgehen wie Paket 1 (rezepte-paket-1.sql):
--   1. Platzhalter-Zutaten ersetzt durch echte Zutatenlisten.
--   2. anzeige_einheit auf echte Einheiten umgestellt, menge_g bleibt
--      die Rechengrundlage.
--   3. anleitung neu geschrieben, tipps befuellt,
--      zubereitungszeit_min auf realistische Werte gesetzt.
--
-- BEWUSST UNVERAENDERT: Die Mengen der vier urspruenglichen Kernzutaten.
-- Die Portionsgroessen-Frage (z. B. 80 g gekochter Reis) bleibt eine
-- eigene Entscheidung fuer spaeter.
--
-- Projekt: wruiyvttftiyskyjjuio.
-- BEREITS AUSGEFUEHRT (2026-09-20).

begin;

delete from rezept_zutaten where rezept_id between 11 and 20;

insert into rezept_zutaten
  (rezept_id, zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung)
values
  -- 11 Bolognese-Style mit Zucchini
  (11, 14,  150, 150, 'g',      null,               false, 0),
  (11, 18,   80,  80, 'g',      null,               false, 1),
  (11, 87,  150,   1, 'Stück',  'gewürfelt',        false, 2),
  (11, 214, 200, 0.5, 'Dose',   null,               false, 3),
  (11, 9,    15,   1, 'EL',     null,               false, 4),
  (11, 90,   55, 0.5, 'Stück',  'fein gewürfelt',   false, 5),
  (11, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 6),
  (11, 198,  15,   1, 'EL',     null,               false, 7),
  (11, 183,   1,   1, 'TL',     null,               false, 8),
  (11, 175,   1,   1, 'Prise',  null,               false, 9),
  (11, 176, 0.5,   1, 'Prise',  null,               false, 10),
  (11, 116,  15,   1, 'EL',     'gerieben',         true,  11),
  (11, 191,   5,   4, 'Blätter', null,              true,  12),

  -- 12 Orientalische Couscous-Bowl
  (12, 48,  150, 150, 'g',      'abgetropft',       false, 0),
  (12, 63,  180, 180, 'g',      null,               false, 1),
  (12, 27,  100,   2, 'Stück',  'fein geraspelt',   false, 2),
  (12, 86,   20,   1, 'EL',     null,               false, 3),
  (12, 206, 200, 200, 'ml',     null,               false, 4),
  (12, 203,  10,   2, 'TL',     null,               false, 5),
  (12, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 6),
  (12, 180,   2,   1, 'TL',     null,               false, 7),
  (12, 177,   2,   1, 'TL',     null,               false, 8),
  (12, 175,   1,   1, 'Prise',  null,               false, 9),
  (12, 176, 0.5,   1, 'Prise',  null,               false, 10),
  (12, 190,  10,   2, 'EL',     'gehackt',          true,  11),

  -- 13 Putenbrust nach Hausmannsart
  (13, 43,  150, 150, 'g',      null,               false, 0),
  (13, 17,  200, 200, 'g',      'geschält',         false, 1),
  (13, 94,  120, 120, 'g',      null,               false, 2),
  (13, 23,   10,   1, 'EL',     null,               false, 3),
  (13, 208, 100, 100, 'ml',     null,               false, 4),
  (13, 90,   55, 0.5, 'Stück',  'fein gewürfelt',   false, 5),
  (13, 175,   1,   1, 'Prise',  null,               false, 6),
  (13, 176, 0.5,   1, 'Prise',  null,               false, 7),
  (13, 186, 0.5,   1, 'Prise',  null,               false, 8),
  (13, 190,  10,   2, 'EL',     'gehackt',          true,  9),

  -- 14 Linsen-Reis-Teller
  (14, 28,  150, 150, 'g',      null,               false, 0),
  (14, 5,    80,  80, 'g',      null,               false, 1),
  (14, 25,  100,   1, 'Stück',  'gewürfelt',        false, 2),
  (14, 9,    15,   1, 'EL',     null,               false, 3),
  (14, 206, 150, 150, 'ml',     null,               false, 4),
  (14, 90,   55, 0.5, 'Stück',  'fein gewürfelt',   false, 5),
  (14, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 6),
  (14, 180,   2,   1, 'TL',     null,               false, 7),
  (14, 177,   2,   1, 'TL',     null,               false, 8),
  (14, 175,   1,   1, 'Prise',  null,               false, 9),
  (14, 176, 0.5,   1, 'Prise',  null,               false, 10),
  (14, 190,   5,   1, 'EL',     'gehackt',          true,  11),

  -- 15 Garnelen asiatisch
  (15, 46,  120, 120, 'g',      'geschält',         false, 0),
  (15, 119, 180, 180, 'g',      null,               false, 1),
  (15, 27,  100,   2, 'Stück',  'in Streifen',      false, 2),
  (15, 40,   20,   1, 'EL',     null,               false, 3),
  (15, 199,  15,   1, 'EL',     null,               false, 4),
  (15, 204,  10,   2, 'TL',     null,               false, 5),
  (15, 189,  10,   1, 'Stück',  'daumengroß',       false, 6),
  (15, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 7),
  (15, 194,  15,   1, 'Stück',  'in Ringen',        false, 8),
  (15, 195,  10,   1, 'Stück',  'in Ringen',        true,  9),
  (15, 193,   5,   1, 'EL',     'gehackt',          true,  10),

  -- 16 Tempeh-Buchweizen-Bowl
  (16, 49,  120, 120, 'g',      'in Scheiben',      false, 0),
  (16, 60,  150, 150, 'g',      null,               false, 1),
  (16, 88,  150,   1, 'Stück',  'gewürfelt',        false, 2),
  (16, 74,   10,   1, 'EL',     null,               false, 3),
  (16, 199,  15,   1, 'EL',     null,               false, 4),
  (16, 189,  10,   1, 'Stück',  'daumengroß',       false, 5),
  (16, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 6),
  (16, 194,  15,   1, 'Stück',  'in Ringen',        false, 7),
  (16, 175,   1,   1, 'Prise',  null,               false, 8),
  (16, 176, 0.5,   1, 'Prise',  null,               false, 9),
  (16, 151,   5,   1, 'TL',     null,               true,  10),

  -- 17 Haehnchen mit Kohlsprossen
  (17, 1,   150, 150, 'g',      null,               false, 0),
  (17, 6,   150, 150, 'g',      'in Würfeln',       false, 1),
  (17, 26,  120, 120, 'g',      'halbiert',         false, 2),
  (17, 9,    15,   1, 'EL',     null,               false, 3),
  (17, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 4),
  (17, 203,   5,   1, 'TL',     null,               false, 5),
  (17, 184,   1,   1, 'TL',     null,               false, 6),
  (17, 177,   2,   1, 'TL',     null,               false, 7),
  (17, 175,   1,   1, 'Prise',  null,               false, 8),
  (17, 176, 0.5,   1, 'Prise',  null,               false, 9),

  -- 18 Griechische Quinoa-Bowl
  (18, 48,  150, 150, 'g',      'abgetropft',       false, 0),
  (18, 59,  180, 180, 'g',      null,               false, 1),
  (18, 163, 100,   1, 'Stück',  'gewürfelt',        false, 2),
  (18, 82,   50,  50, 'g',      'zerbröselt',       false, 3),
  (18, 41,   80, 0.3, 'Stück',  'gewürfelt',        false, 4),
  (18, 188,  30, 0.25, 'Stück', 'fein gewürfelt',   false, 5),
  (18, 9,    15,   1, 'EL',     null,               false, 6),
  (18, 203,  10,   2, 'TL',     null,               false, 7),
  (18, 183,   1,   1, 'TL',     null,               false, 8),
  (18, 175,   1,   1, 'Prise',  null,               false, 9),
  (18, 176, 0.5,   1, 'Prise',  null,               false, 10),

  -- 19 Steak mit Erdaepfeln
  (19, 44,  150, 150, 'g',      null,               false, 0),
  (19, 17,  200, 200, 'g',      'geschält',         false, 1),
  (19, 27,  100,   2, 'Stück',  'in Stiften',       false, 2),
  (19, 23,   10,   1, 'EL',     null,               false, 3),
  (19, 91,    4,   1, 'Zehe',   'angedrückt',       false, 4),
  (19, 184,   1,   1, 'TL',     null,               false, 5),
  (19, 175,   1,   1, 'Prise',  null,               false, 6),
  (19, 176, 0.5,   1, 'Prise',  null,               false, 7),
  (19, 190,   5,   1, 'EL',     'gehackt',          true,  8),

  -- 20 Tofu-Pfanne mit Brokkoli
  (20, 3,   150, 150, 'g',      'gewürfelt',        false, 0),
  (20, 5,    80,  80, 'g',      null,               false, 1),
  (20, 11,  150, 150, 'g',      'in Röschen',       false, 2),
  (20, 74,   10,   1, 'EL',     null,               false, 3),
  (20, 199,  15,   1, 'EL',     null,               false, 4),
  (20, 189,  10,   1, 'Stück',  'daumengroß',       false, 5),
  (20, 91,    4,   1, 'Zehe',   'fein gehackt',     false, 6),
  (20, 194,  15,   1, 'Stück',  'in Ringen',        false, 7),
  (20, 182, 0.5,   1, 'Prise',  null,               true,  8),
  (20, 151,   5,   1, 'TL',     null,               true,  9);


-- Anleitungen, Tipps und Zubereitungszeiten

update rezepte set
  zubereitungszeit_min = 35,
  anleitung = $j$[
    {"text":"Zwiebel und Knoblauch fein würfeln, Zucchini in kleine Würfel schneiden.","aktion":"schneiden"},
    {"text":"Olivenöl in einer Pfanne erhitzen und das Faschierte darin krümelig anbraten, bis es Farbe bekommt.","aktion":"braten"},
    {"text":"Zwiebel und Knoblauch dazugeben, kurz mitbraten, dann das Tomatenmark einrühren und eine Minute mitrösten.","aktion":"braten"},
    {"text":"Mit den gehackten Tomaten ablöschen, Zucchini und Oregano zugeben, mit Salz und Pfeffer würzen.","aktion":"ruehren"},
    {"text":"Bei kleiner Hitze 20 Minuten offen einköcheln lassen. In der Zwischenzeit die Nudeln nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Nudeln mit der Sauce anrichten, mit Parmesan und Basilikum bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Je länger, desto besser","text":"Die Sauce wird mit 40 Minuten Köchelzeit deutlich runder. Wer Zeit hat, lässt sie einfach länger ziehen."},
    {"titel":"Sauce zu dünn","text":"Deckel weglassen und die Hitze leicht erhöhen, dann verdampft die überschüssige Flüssigkeit."}
  ]$t$::jsonb
where id = 11;

update rezepte set
  zubereitungszeit_min = 20,
  anleitung = $j$[
    {"text":"Gemüsebrühe aufkochen, über den Couscous gießen, zudecken und zehn Minuten quellen lassen.","aktion":"warten"},
    {"text":"Karotten fein raspeln, Knoblauch hacken, Petersilie grob schneiden.","aktion":"schneiden"},
    {"text":"Tahini mit Zitronensaft, Knoblauch und zwei Esslöffeln Wasser glattrühren, bis eine cremige Sauce entsteht.","aktion":"ruehren"},
    {"text":"Couscous mit einer Gabel auflockern, Kichererbsen, Karotten, Kreuzkümmel und Paprikapulver untermischen.","aktion":"mischen"},
    {"text":"Mit Salz und Pfeffer abschmecken, Tahinisauce darüberziehen und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Sauce zu dick","text":"Tahini zieht beim Stehen nach. Einfach löffelweise Wasser einrühren, bis sie wieder fließt."},
    {"titel":"Warm oder kalt","text":"Schmeckt am nächsten Tag kalt als Salat genauso gut, dann etwas Zitronensaft nachgeben."}
  ]$t$::jsonb
where id = 12;

update rezepte set
  zubereitungszeit_min = 30,
  anleitung = $j$[
    {"text":"Erdäpfel schälen, in gleich große Stücke schneiden und in Salzwasser 20 Minuten weich kochen.","aktion":"kochen"},
    {"text":"Fisolen putzen und in den letzten acht Minuten mitkochen oder getrennt bissfest garen.","aktion":"kochen"},
    {"text":"Putenbrust mit Salz und Pfeffer würzen. Butter in einer Pfanne aufschäumen lassen und das Fleisch bei mittlerer Hitze von beiden Seiten goldbraun braten.","aktion":"braten"},
    {"text":"Fleisch herausnehmen und warm stellen. Zwiebel im Bratrückstand glasig dünsten, mit Hühnerbrühe ablöschen und kurz einkochen lassen.","aktion":"braten"},
    {"text":"Erdäpfel und Fisolen abgießen, mit Muskatnuss würzen.","aktion":"mischen"},
    {"text":"Alles anrichten, die Sauce darübergeben und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Nicht trocken werden lassen","text":"Putenbrust gart schnell. Sobald sie sich fest anfühlt, ist sie fertig - lieber eine Minute zu früh vom Herd."},
    {"titel":"Mehr Sauce","text":"Die Brühemenge verdoppeln und mit einem Teelöffel kalter Butter binden."}
  ]$t$::jsonb
where id = 13;

update rezepte set
  zubereitungszeit_min = 30,
  anleitung = $j$[
    {"text":"Zwiebel und Knoblauch fein würfeln, Paradeiser grob würfeln.","aktion":"schneiden"},
    {"text":"Olivenöl erhitzen, Zwiebel glasig dünsten, Knoblauch, Kreuzkümmel und Paprikapulver kurz mitrösten.","aktion":"braten"},
    {"text":"Linsen zugeben, mit Gemüsebrühe aufgießen und zugedeckt 20 Minuten weich köcheln lassen.","aktion":"kochen"},
    {"text":"Parallel den Reis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Paradeiser in den letzten fünf Minuten zu den Linsen geben, mit Salz und Pfeffer abschmecken.","aktion":"ruehren"},
    {"text":"Linsen über dem Reis anrichten und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Rote Linsen gehen schneller","text":"Wer weniger Zeit hat, nimmt rote statt brauner Linsen - die sind in zehn Minuten weich, zerfallen aber zu einer Art Püree."},
    {"titel":"Mehr Frische","text":"Ein Spritzer Zitronensaft zum Schluss hebt das ganze Gericht."}
  ]$t$::jsonb
where id = 14;

update rezepte set
  zubereitungszeit_min = 25,
  anleitung = $j$[
    {"text":"Naturreis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Ingwer und Knoblauch fein hacken, Karotten in Streifen schneiden, Frühlingszwiebel in Ringe.","aktion":"schneiden"},
    {"text":"Erdnussbutter mit Sojasauce, Limettensaft und drei Esslöffeln warmem Wasser zu einer glatten Sauce rühren.","aktion":"ruehren"},
    {"text":"Eine Pfanne stark erhitzen, Ingwer und Knoblauch kurz anbraten, Karotten zugeben und zwei Minuten mitschwenken.","aktion":"braten"},
    {"text":"Garnelen zugeben und zwei bis drei Minuten braten, bis sie rundum rosa sind - nicht länger, sonst werden sie zäh.","aktion":"braten"},
    {"text":"Erdnusssauce einrühren, alles auf dem Reis anrichten und mit Frühlingszwiebel, Chili und Koriander bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Garnelen richtig braten","text":"Die Pfanne muss heiß sein, bevor die Garnelen hineinkommen. Sobald sie sich C-förmig krümmen, sind sie fertig."},
    {"titel":"Sauce vorbereiten","text":"Die Erdnusssauce lässt sich am Vortag anrühren und hält im Kühlschrank drei Tage."}
  ]$t$::jsonb
where id = 15;

update rezepte set
  zubereitungszeit_min = 30,
  anleitung = $j$[
    {"text":"Buchweizen nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Aubergine würfeln und mit etwas Salz zehn Minuten stehen lassen, danach trocken tupfen. Tempeh in Scheiben schneiden.","aktion":"schneiden"},
    {"text":"Sesamöl in einer Pfanne erhitzen und den Tempeh von beiden Seiten goldbraun braten, dann herausnehmen.","aktion":"braten"},
    {"text":"Aubergine in derselben Pfanne bei kräftiger Hitze braten, bis sie weich und gebräunt ist.","aktion":"braten"},
    {"text":"Ingwer und Knoblauch zugeben, kurz mitbraten und mit Sojasauce ablöschen. Tempeh zurück in die Pfanne.","aktion":"ruehren"},
    {"text":"Auf dem Buchweizen anrichten, mit Frühlingszwiebel und Sesam bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Aubergine saugt Öl","text":"Lieber mit wenig Öl bei hoher Hitze braten und die Pfanne öfter schwenken, statt Öl nachzugießen."},
    {"titel":"Tempeh milder","text":"Wer den herben Geschmack nicht mag, dämpft die Scheiben vorher fünf Minuten."}
  ]$t$::jsonb
where id = 16;

update rezepte set
  zubereitungszeit_min = 35,
  anleitung = $j$[
    {"text":"Backrohr auf 200 Grad vorheizen. Süßkartoffel schälen und würfeln, Kohlsprossen halbieren.","aktion":"schneiden"},
    {"text":"Beides mit der Hälfte des Olivenöls, Paprikapulver, Thymian, Salz und Pfeffer mischen und auf ein Blech geben.","aktion":"mischen"},
    {"text":"25 Minuten rösten, nach der Hälfte einmal wenden.","aktion":"roesten"},
    {"text":"Hähnchenbrust mit Salz und Pfeffer würzen. Restliches Olivenöl erhitzen und das Fleisch von beiden Seiten goldbraun braten, etwa sechs Minuten pro Seite.","aktion":"braten"},
    {"text":"Knoblauch kurz mitbraten, mit Zitronensaft ablöschen.","aktion":"braten"},
    {"text":"Gemüse und Hähnchen anrichten und den Pfannensaft darübergeben.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Kohlsprossen ohne Bitterkeit","text":"Mit der Schnittfläche nach unten aufs Blech legen, dann karamellisieren sie und schmecken süßlich statt bitter."},
    {"titel":"Alles aufs Blech","text":"Das Hähnchen kann die letzten 15 Minuten mit ins Rohr, dann bleibt die Pfanne sauber."}
  ]$t$::jsonb
where id = 17;

update rezepte set
  zubereitungszeit_min = 20,
  anleitung = $j$[
    {"text":"Quinoa gründlich abspülen, nach Packungsanweisung garen und auskühlen lassen.","aktion":"kochen"},
    {"text":"Paprika und Gurke würfeln, rote Zwiebel fein hacken.","aktion":"schneiden"},
    {"text":"Olivenöl, Zitronensaft, Oregano, Salz und Pfeffer zu einem Dressing verrühren.","aktion":"ruehren"},
    {"text":"Quinoa mit Kichererbsen, Paprika, Gurke und Zwiebel vermengen und das Dressing untermischen.","aktion":"mischen"},
    {"text":"Feta darüberbröseln und servieren.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Zieht gut durch","text":"Mindestens zehn Minuten ziehen lassen, bevor der Feta daraufkommt - dann nimmt der Quinoa das Dressing auf."},
    {"titel":"Gut vorzubereiten","text":"Hält im Kühlschrank zwei Tage. Feta erst kurz vor dem Essen daraufgeben."}
  ]$t$::jsonb
where id = 18;

update rezepte set
  zubereitungszeit_min = 30,
  anleitung = $j$[
    {"text":"Steak eine halbe Stunde vor dem Braten aus dem Kühlschrank nehmen, damit es Zimmertemperatur annimmt.","aktion":"warten"},
    {"text":"Erdäpfel schälen, in Stücke schneiden und in Salzwasser 20 Minuten weich kochen. Karotten in Stifte schneiden und die letzten acht Minuten mitkochen.","aktion":"kochen"},
    {"text":"Steak trocken tupfen und kräftig mit Salz und Pfeffer würzen.","aktion":"mischen"},
    {"text":"Eine Pfanne stark erhitzen, das Steak pro Seite zwei bis drei Minuten braten. Dann Butter, Knoblauch und Thymian zugeben und das Fleisch damit übergießen.","aktion":"braten"},
    {"text":"Steak herausnehmen und fünf Minuten ruhen lassen - das ist der Schritt, der über saftig oder trocken entscheidet.","aktion":"warten"},
    {"text":"Aufschneiden, mit Erdäpfeln und Karotten anrichten, Bratbutter darübergeben und mit Petersilie bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Garstufe erkennen","text":"Zwei Minuten pro Seite ergeben bei zwei Zentimetern Dicke medium-rare, drei Minuten medium. Dicke Steaks brauchen entsprechend länger."},
    {"titel":"Ruhezeit nicht überspringen","text":"Ohne Ruhen läuft der ganze Saft auf den Teller statt im Fleisch zu bleiben."}
  ]$t$::jsonb
where id = 19;

update rezepte set
  zubereitungszeit_min = 25,
  anleitung = $j$[
    {"text":"Reis nach Packungsanweisung garen.","aktion":"kochen"},
    {"text":"Tofu trocken tupfen und würfeln, Brokkoli in Röschen teilen, Ingwer und Knoblauch fein hacken.","aktion":"schneiden"},
    {"text":"Sesamöl in einer Pfanne erhitzen und den Tofu rundum knusprig braten, dabei nicht zu oft wenden.","aktion":"braten"},
    {"text":"Ingwer und Knoblauch zugeben, kurz mitbraten, dann Brokkoli dazu und zwei Esslöffel Wasser angießen. Zugedeckt drei Minuten dämpfen.","aktion":"kochen"},
    {"text":"Deckel abnehmen, mit Sojasauce ablöschen und alles einmal durchschwenken.","aktion":"ruehren"},
    {"text":"Auf dem Reis anrichten, mit Frühlingszwiebel, Sesam und Chiliflocken bestreuen.","aktion":"servieren"}
  ]$j$::jsonb,
  tipps = $t$[
    {"titel":"Tofu wird knuspriger","text":"Vorher zwischen zwei Tellern mit etwas Gewicht ausdrücken, dann spritzt er weniger und bräunt besser."},
    {"titel":"Brokkoli leuchtend grün","text":"Nur kurz dämpfen. Sobald er kräftig grün ist, ist er fertig - danach wird er grau und weich."}
  ]$t$::jsonb
where id = 20;

commit;


-- Naehrwerte neu berechnen (Cache, siehe CLAUDE.md Abschnitt 9)
select rezept_naehrwerte_neu_berechnen(id) from rezepte where id between 11 and 20;

-- Kontrolle: neue Werte ansehen
select id, titel, zubereitungszeit_min,
       round(kcal_pro_portion)    as kcal,
       round(protein_pro_portion) as protein,
       round(carbs_pro_portion)   as carbs,
       round(fett_pro_portion)    as fett
from rezepte
where id between 11 and 20
order by id;

-- Kontrolle: Zutatenzahl je Rezept (erwartet 10 bis 13)
select rezept_id, count(*) as zutaten
from rezept_zutaten
where rezept_id between 11 and 20
group by rezept_id
order by rezept_id;
