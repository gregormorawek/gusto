# Gusto — Neue Grundzutaten

Alle Werte **pro 100 g** (wie in der bestehenden `zutaten`-Tabelle, verifiziert).
Bei allem, was gekocht gegessen wird, sind die Werte **im zubereiteten Zustand**
angegeben — konsistent zum Altbestand (dort z. B. "Reis, gekocht" mit 130 kcal).

`ist_grundzutat = true` für alles in dieser Liste: Gewürze, Öle, Flüssigkeiten
und Fertigkomponenten sollen nicht als eigenständige Auswahl auftauchen.

---

## Wichtig vor dem Einfügen

**Auf Doppelte prüfen.** Von den 174 bestehenden Zeilen kenne ich nur einen
Bruchteil. Sicher bekannt ist, dass es **Olivenöl**, **Butter** und **Sesamöl**
schon gibt — bei allem anderen muss vor dem Insert geprüft werden, ob es unter
einer anderen Schreibweise (ASCII statt Umlaut!) bereits existiert. Eine zweite
"Zwiebel" wäre ein echtes Problem, weil dann Rezepte auf unterschiedliche IDs
zeigen.

**Werte stichprobenartig gegenprüfen.** Die Zahlen unten sind
Standard-Referenzwerte. Bei Öl, Butter und Nüssen wirken Fehler am stärksten
(1 EL Öl ≈ 90 kcal), dort lohnt der Blick am meisten.

---

## Gewürze und Aromaten

| Name | kcal | P | K | F |
|---|---|---|---|---|
| Salz | 0 | 0 | 0 | 0 |
| Pfeffer, schwarz gemahlen | 251 | 10,4 | 64,0 | 3,3 |
| Paprikapulver, edelsüß | 282 | 14,1 | 54,0 | 13,0 |
| Paprikapulver, scharf | 282 | 14,1 | 54,0 | 13,0 |
| Kümmel, gemahlen | 375 | 18,0 | 44,0 | 22,0 |
| Kreuzkümmel, gemahlen | 375 | 18,0 | 44,0 | 22,0 |
| Currypulver | 325 | 14,0 | 56,0 | 14,0 |
| Chiliflocken | 318 | 12,0 | 57,0 | 17,0 |
| Oregano, getrocknet | 265 | 9,0 | 69,0 | 4,3 |
| Thymian, getrocknet | 276 | 9,1 | 64,0 | 7,4 |
| Zimt, gemahlen | 247 | 4,0 | 81,0 | 1,2 |
| Muskatnuss, gemahlen | 525 | 5,8 | 49,0 | 36,0 |
| Lorbeerblatt | 313 | 7,6 | 75,0 | 8,4 |

## Frische Aromaten

| Name | kcal | P | K | F |
|---|---|---|---|---|
| Zwiebel | 40 | 1,1 | 9,3 | 0,1 |
| Rote Zwiebel | 40 | 1,1 | 9,3 | 0,1 |
| Knoblauch | 149 | 6,4 | 33,0 | 0,5 |
| Ingwer, frisch | 80 | 1,8 | 18,0 | 0,8 |
| Petersilie, frisch | 36 | 3,0 | 6,3 | 0,8 |
| Basilikum, frisch | 23 | 3,2 | 2,7 | 0,6 |
| Schnittlauch, frisch | 30 | 3,3 | 4,4 | 0,7 |
| Koriander, frisch | 23 | 2,1 | 3,7 | 0,5 |
| Frühlingszwiebel | 32 | 1,8 | 7,3 | 0,2 |
| Chili, frisch | 40 | 1,9 | 9,0 | 0,4 |

## Würzsaucen und Säuren

| Name | kcal | P | K | F |
|---|---|---|---|---|
| Senf, mittelscharf | 66 | 4,0 | 5,0 | 4,0 |
| Dijon-Senf | 66 | 4,0 | 5,0 | 4,0 |
| Tomatenmark | 82 | 4,3 | 19,0 | 0,5 |
| Sojasauce | 53 | 8,0 | 5,0 | 0,1 |
| Worcestersauce | 78 | 0,0 | 19,0 | 0,0 |
| Balsamico-Essig | 88 | 0,5 | 17,0 | 0,0 |
| Weißweinessig | 19 | 0,0 | 0,4 | 0,0 |
| Zitronensaft | 22 | 0,4 | 6,9 | 0,2 |
| Limettensaft | 25 | 0,4 | 8,4 | 0,1 |
| Honig | 304 | 0,3 | 82,0 | 0,0 |
| Ahornsirup | 260 | 0,0 | 67,0 | 0,1 |
| Erdnussbutter | 588 | 25,0 | 20,0 | 50,0 |
| Tahini (Sesampaste) | 595 | 17,0 | 21,0 | 54,0 |

## Fette zum Braten

Nährwertkritisch — hier wirken Fehler am stärksten.

| Name | kcal | P | K | F |
|---|---|---|---|---|
| Rapsöl | 884 | 0,0 | 0,0 | 100,0 |
| Butterschmalz | 900 | 0,2 | 0,0 | 99,8 |
| Kokosöl | 862 | 0,0 | 0,0 | 100,0 |
| Sonnenblumenöl | 884 | 0,0 | 0,0 | 100,0 |

## Flüssigkeiten

Brühen als **zubereitete** Flüssigkeit, nicht als Pulver.

| Name | kcal | P | K | F |
|---|---|---|---|---|
| Gemüsebrühe | 4 | 0,2 | 0,6 | 0,1 |
| Rinderbrühe | 6 | 0,8 | 0,4 | 0,1 |
| Hühnerbrühe | 6 | 0,8 | 0,4 | 0,1 |
| Rotwein | 85 | 0,1 | 2,6 | 0,0 |
| Weißwein | 82 | 0,1 | 2,6 | 0,0 |
| Kokosmilch (Dose) | 197 | 2,0 | 3,0 | 20,0 |
| Schlagobers (36 %) | 337 | 2,1 | 3,1 | 36,0 |
| Sauerrahm (15 %) | 162 | 3,0 | 3,6 | 15,0 |
| Cremefine zum Kochen (15 %) | 152 | 2,4 | 3,5 | 15,0 |
| Passierte Tomaten | 35 | 1,5 | 6,0 | 0,3 |
| Gehackte Tomaten (Dose) | 32 | 1,3 | 5,4 | 0,3 |

## Fertigkomponenten und Basics

| Name | kcal | P | K | F |
|---|---|---|---|---|
| Weizenmehl (Typ 700) | 348 | 10,0 | 72,0 | 1,0 |
| Semmelbrösel | 350 | 11,0 | 68,0 | 4,0 |
| Semmelknödel (gekocht) | 180 | 5,0 | 33,0 | 3,0 |
| Spätzle (gekocht) | 160 | 5,5 | 29,0 | 2,0 |
| Gnocchi (Fertigpackung) | 160 | 3,6 | 33,0 | 0,6 |
| Spaghetti (gekocht) | 158 | 5,8 | 31,0 | 0,9 |
| Vollkornnudeln (gekocht) | 149 | 6,0 | 30,0 | 1,1 |
| Polenta (gekocht) | 85 | 2,0 | 18,0 | 0,3 |
| Weizentortilla / Wrap | 310 | 8,0 | 50,0 | 8,0 |
| Blätterteig | 380 | 6,0 | 36,0 | 24,0 |
| Tomatensauce (Fertig, passiert) | 45 | 1,6 | 7,0 | 1,0 |

---

## Übliche Gramm-Umrechnungen

Nicht in die Datenbank — Hilfstabelle für mich beim Schreiben der Rezepte,
damit `menge_g` und `anzeige_menge` konsistent zusammenpassen.

| Angabe | ≈ Gramm |
|---|---|
| 1 EL Öl | 12 |
| 1 EL Tomatenmark / Senf | 15 |
| 1 TL Gewürzpulver | 3 |
| 1 Prise | 0,5 |
| 1 Zwiebel (mittel) | 110 |
| 1 Knoblauchzehe | 4 |
| 1 EL Honig | 20 |
| 1 Zweig Petersilie | 2 |
