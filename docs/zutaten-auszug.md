# Zutaten-Auszug (222 aktive Zeilen)

**Zwischenstand vom 19.09.2026** — Arbeitsgrundlage für die IDs beim
Schreiben der Rezept-Pakete 2 und 3. Kann geloescht werden, sobald diese
Pakete abgeschlossen sind.

Quelle: `select id, name, kategorie, supermarkt_kategorie, ist_grundzutat, kalorien, protein_g, carbs_g, fett_g from zutaten where aktiv = true order by ist_grundzutat, kategorie, id;`

| id | name | kategorie | supermarkt_kategorie | ist_grundzutat | kalorien | protein_g | carbs_g | fett_g |
|---|---|---|---|---|---|---|---|---|
| 5 | Reis | carbs | getreide | nein | 130 | 2.7 | 28 | 0.3 |
| 6 | Süßkartoffel | carbs | obst_gemuese | nein | 86 | 1.6 | 20 | 0.1 |
| 7 | Haferflocken | carbs | getreide | nein | 372 | 13 | 59 | 7 |
| 17 | Erdäpfel | carbs | obst_gemuese | nein | 77 | 2 | 17 | 0.1 |
| 18 | Vollkornnudeln | carbs | getreide | nein | 124 | 5 | 25 | 1 |
| 19 | Schwarzbrot | carbs | getreide | nein | 250 | 8 | 45 | 1.5 |
| 20 | Hirse | carbs | getreide | nein | 119 | 3.5 | 23 | 1 |
| 29 | Honig | carbs | sonstiges | nein | 304 | 0.3 | 82 | 0 |
| 34 | Roggenbrot | carbs | getreide | nein | 259 | 8.5 | 48 | 1.2 |
| 58 | Vollkornreis | carbs | getreide | nein | 111 | 2.6 | 23 | 0.9 |
| 59 | Quinoa | carbs | getreide | nein | 120 | 4.4 | 21 | 1.9 |
| 60 | Buchweizen | carbs | getreide | nein | 92 | 3.4 | 20 | 0.6 |
| 61 | Vollkornbrot | carbs | getreide | nein | 247 | 9 | 41 | 3.3 |
| 62 | Weckerl | carbs | getreide | nein | 275 | 9 | 53 | 1.8 |
| 63 | Couscous | carbs | getreide | nein | 112 | 3.8 | 23 | 0.2 |
| 64 | Vollkornpenne | carbs | getreide | nein | 124 | 5 | 25 | 1 |
| 65 | Griess | carbs | getreide | nein | 360 | 12.7 | 73 | 1 |
| 66 | Muesli | carbs | getreide | nein | 362 | 10 | 60 | 8 |
| 72 | Marmelade | carbs | sonstiges | nein | 250 | 0.3 | 62 | 0.1 |
| 119 | Naturreis | carbs | getreide | nein | 123 | 2.7 | 26 | 1 |
| 120 | Basmatireis | carbs | getreide | nein | 121 | 2.7 | 26 | 0.4 |
| 121 | Wildreis | carbs | getreide | nein | 101 | 4 | 21 | 0.3 |
| 122 | Amaranth | carbs | getreide | nein | 371 | 14 | 65 | 7 |
| 123 | Polenta | carbs | getreide | nein | 85 | 2 | 18 | 0.5 |
| 124 | Kartoffelpueree | carbs | getreide | nein | 113 | 2 | 17 | 4 |
| 125 | Dinkelbrot | carbs | getreide | nein | 232 | 8.5 | 40 | 2.5 |
| 126 | Reiswaffeln | carbs | getreide | nein | 387 | 8 | 82 | 2.8 |
| 127 | Vollkorncracker | carbs | getreide | nein | 420 | 10 | 65 | 13 |
| 135 | Ahornsirup | carbs | sonstiges | nein | 260 | 0 | 67 | 0.1 |
| 136 | Agavendicksaft | carbs | sonstiges | nein | 310 | 0 | 76 | 0.5 |
| 8 | Avocado | fett | obst_gemuese | nein | 160 | 2 | 9 | 15 |
| 9 | Olivenöl | fett | sonstiges | nein | 884 | 0 | 0 | 100 |
| 10 | Mandeln | fett | sonstiges | nein | 579 | 21 | 22 | 50 |
| 21 | Kürbiskernöl | fett | sonstiges | nein | 884 | 0 | 0 | 100 |
| 22 | Walnüsse | fett | sonstiges | nein | 654 | 15 | 14 | 65 |
| 23 | Butter | fett | milch_eier | nein | 717 | 0.9 | 0.1 | 81 |
| 38 | Kokosflocken | fett | sonstiges | nein | 660 | 7 | 6 | 65 |
| 39 | Dunkle Schokolade | fett | sonstiges | nein | 546 | 7.8 | 46 | 31 |
| 40 | Erdnussbutter | fett | sonstiges | nein | 588 | 25 | 20 | 50 |
| 73 | Leinoel | fett | sonstiges | nein | 884 | 0 | 0 | 100 |
| 74 | Sesamoel | fett | sonstiges | nein | 884 | 0 | 0 | 100 |
| 75 | Cashewkerne | fett | sonstiges | nein | 553 | 18 | 30 | 44 |
| 76 | Pistazien | fett | sonstiges | nein | 560 | 20 | 28 | 45 |
| 77 | Haselnuesse | fett | sonstiges | nein | 628 | 15 | 17 | 61 |
| 78 | Chiasamen | fett | sonstiges | nein | 486 | 17 | 42 | 31 |
| 79 | Leinsamen | fett | sonstiges | nein | 534 | 18 | 29 | 42 |
| 80 | Sonnenblumenkerne | fett | sonstiges | nein | 584 | 21 | 20 | 51 |
| 81 | Kuerbiskerne | fett | sonstiges | nein | 559 | 30 | 11 | 49 |
| 82 | Feta | fett | milch_eier | nein | 264 | 14 | 4 | 21 |
| 83 | Schlagobers | fett | milch_eier | nein | 337 | 2.1 | 3 | 35 |
| 84 | Kokosoel | fett | sonstiges | nein | 862 | 0 | 0 | 99 |
| 85 | Frischkaese | fett | milch_eier | nein | 253 | 6 | 4 | 24 |
| 86 | Tahini | fett | sonstiges | nein | 595 | 17 | 21 | 54 |
| 137 | Macadamianuesse | fett | sonstiges | nein | 718 | 8 | 14 | 76 |
| 138 | Paranuesse | fett | sonstiges | nein | 656 | 14 | 12 | 66 |
| 139 | Erdnuesse | fett | sonstiges | nein | 567 | 26 | 16 | 49 |
| 140 | Rapsoel | fett | sonstiges | nein | 884 | 0 | 0 | 100 |
| 141 | Walnussoel | fett | sonstiges | nein | 884 | 0 | 0 | 100 |
| 142 | Sonnenblumenoel | fett | sonstiges | nein | 884 | 0 | 0 | 100 |
| 143 | Kokosmilch | fett | sonstiges | nein | 230 | 2.3 | 3.3 | 24 |
| 144 | Mandelmus | fett | sonstiges | nein | 614 | 21 | 19 | 56 |
| 145 | Camembert | fett | milch_eier | nein | 300 | 20 | 0.5 | 24 |
| 146 | Gouda | fett | milch_eier | nein | 356 | 25 | 2 | 27 |
| 147 | Cheddar | fett | milch_eier | nein | 403 | 25 | 1.3 | 33 |
| 148 | Mascarpone | fett | milch_eier | nein | 429 | 4.8 | 4.8 | 44 |
| 149 | Kokosjoghurt | fett | milch_eier | nein | 130 | 1.5 | 7 | 10 |
| 150 | Nussmus gemischt | fett | sonstiges | nein | 620 | 20 | 18 | 55 |
| 151 | Sesam | fett | sonstiges | nein | 573 | 18 | 23 | 50 |
| 152 | Schmelzkaese | fett | milch_eier | nein | 280 | 15 | 5 | 22 |
| 153 | Guacamole | fett | sonstiges | nein | 160 | 2 | 8 | 14 |
| 11 | Brokkoli | gemuese | obst_gemuese | nein | 34 | 2.8 | 7 | 0.4 |
| 12 | Spinat | gemuese | obst_gemuese | nein | 23 | 2.9 | 3.6 | 0.4 |
| 13 | Paprika | gemuese | obst_gemuese | nein | 31 | 1 | 6 | 0.3 |
| 24 | Karfiol | gemuese | obst_gemuese | nein | 25 | 2 | 5 | 0.3 |
| 25 | Paradeiser | gemuese | obst_gemuese | nein | 18 | 0.9 | 3.9 | 0.2 |
| 26 | Kohlsprossen | gemuese | obst_gemuese | nein | 43 | 3.4 | 9 | 0.3 |
| 27 | Karotten | gemuese | obst_gemuese | nein | 41 | 0.9 | 10 | 0.2 |
| 41 | Gurke | gemuese | obst_gemuese | nein | 15 | 0.7 | 3.6 | 0.1 |
| 42 | Radieschen | gemuese | obst_gemuese | nein | 16 | 0.7 | 3.4 | 0.1 |
| 87 | Zucchini | gemuese | obst_gemuese | nein | 17 | 1.2 | 3.1 | 0.3 |
| 88 | Aubergine | gemuese | obst_gemuese | nein | 25 | 1 | 6 | 0.2 |
| 89 | Rote Ruebe | gemuese | obst_gemuese | nein | 43 | 1.6 | 10 | 0.2 |
| 90 | Zwiebel | gemuese | obst_gemuese | nein | 40 | 1.1 | 9.3 | 0.1 |
| 91 | Knoblauch | gemuese | obst_gemuese | nein | 149 | 6.4 | 33 | 0.5 |
| 92 | Champignons | gemuese | obst_gemuese | nein | 22 | 3.1 | 3.3 | 0.3 |
| 93 | Lauch | gemuese | obst_gemuese | nein | 61 | 1.5 | 14 | 0.3 |
| 94 | Fisolen | gemuese | obst_gemuese | nein | 31 | 1.8 | 7 | 0.1 |
| 95 | Sellerie | gemuese | obst_gemuese | nein | 16 | 0.7 | 3 | 0.2 |
| 96 | Kuerbis | gemuese | obst_gemuese | nein | 26 | 1 | 6.5 | 0.1 |
| 97 | Rucola | gemuese | obst_gemuese | nein | 25 | 2.6 | 2 | 0.7 |
| 98 | Blattsalat | gemuese | obst_gemuese | nein | 15 | 1.4 | 2.9 | 0.2 |
| 99 | Kohlrabi | gemuese | obst_gemuese | nein | 27 | 1.7 | 6.2 | 0.1 |
| 100 | Mais | gemuese | obst_gemuese | nein | 86 | 3.2 | 19 | 1.2 |
| 154 | Chinakohl | gemuese | obst_gemuese | nein | 13 | 1.2 | 2.2 | 0.2 |
| 155 | Rotkraut | gemuese | obst_gemuese | nein | 30 | 1.4 | 6 | 0.2 |
| 156 | Weisskraut | gemuese | obst_gemuese | nein | 25 | 1.3 | 5.8 | 0.1 |
| 157 | Fenchel | gemuese | obst_gemuese | nein | 31 | 1.2 | 7 | 0.2 |
| 158 | Pastinaken | gemuese | obst_gemuese | nein | 75 | 1.2 | 18 | 0.3 |
| 159 | Chicoree | gemuese | obst_gemuese | nein | 17 | 0.9 | 3 | 0.1 |
| 160 | Endiviensalat | gemuese | obst_gemuese | nein | 17 | 1.3 | 2.9 | 0.2 |
| 161 | Artischocke | gemuese | obst_gemuese | nein | 47 | 3.3 | 10 | 0.2 |
| 162 | Spargel | gemuese | obst_gemuese | nein | 20 | 2.2 | 3.9 | 0.1 |
| 163 | Gelbe Paprika | gemuese | obst_gemuese | nein | 27 | 1 | 6 | 0.2 |
| 164 | Mangold | gemuese | obst_gemuese | nein | 19 | 1.8 | 3.7 | 0.2 |
| 165 | Wirsing | gemuese | obst_gemuese | nein | 27 | 2 | 4.3 | 0.2 |
| 166 | Schwarzwurzel | gemuese | obst_gemuese | nein | 82 | 2 | 15 | 0.4 |
| 167 | Topinambur | gemuese | obst_gemuese | nein | 73 | 2 | 16 | 0.1 |
| 168 | Gruenkohl | gemuese | obst_gemuese | nein | 49 | 4.3 | 6 | 0.9 |
| 169 | Feldsalat | gemuese | obst_gemuese | nein | 20 | 2 | 2 | 0.4 |
| 170 | Kresse | gemuese | obst_gemuese | nein | 32 | 2.6 | 4.4 | 0.7 |
| 30 | Banane | obst | obst_gemuese | nein | 89 | 1.1 | 23 | 0.3 |
| 31 | Heidelbeeren | obst | obst_gemuese | nein | 57 | 0.7 | 14 | 0.3 |
| 32 | Apfel | obst | obst_gemuese | nein | 52 | 0.3 | 14 | 0.2 |
| 33 | Datteln | obst | obst_gemuese | nein | 277 | 1.8 | 75 | 0.2 |
| 67 | Orange | obst | obst_gemuese | nein | 47 | 0.9 | 12 | 0.1 |
| 68 | Birne | obst | obst_gemuese | nein | 57 | 0.4 | 15 | 0.1 |
| 69 | Erdbeeren | obst | obst_gemuese | nein | 32 | 0.7 | 7.7 | 0.3 |
| 70 | Trauben | obst | obst_gemuese | nein | 69 | 0.7 | 18 | 0.2 |
| 71 | Ananas | obst | obst_gemuese | nein | 50 | 0.5 | 13 | 0.1 |
| 128 | Mango | obst | obst_gemuese | nein | 60 | 0.8 | 15 | 0.4 |
| 129 | Kiwi | obst | obst_gemuese | nein | 61 | 1.1 | 15 | 0.5 |
| 130 | Kirschen | obst | obst_gemuese | nein | 63 | 1.1 | 16 | 0.2 |
| 131 | Pfirsich | obst | obst_gemuese | nein | 39 | 0.9 | 10 | 0.3 |
| 132 | Melone | obst | obst_gemuese | nein | 34 | 0.8 | 8 | 0.2 |
| 133 | Getrocknete Aprikosen | obst | obst_gemuese | nein | 241 | 3.4 | 63 | 0.5 |
| 134 | Feigen getrocknet | obst | obst_gemuese | nein | 249 | 3.3 | 64 | 0.9 |
| 1 | Hähnchenbrust | protein | fleisch_fisch | nein | 110 | 23 | 0 | 1.5 |
| 2 | Lachs | protein | fleisch_fisch | nein | 208 | 20 | 0 | 13 |
| 3 | Tofu | protein | sonstiges | nein | 76 | 8 | 1.9 | 4.2 |
| 4 | Eier | protein | milch_eier | nein | 155 | 13 | 1.1 | 11 |
| 14 | Faschiertes (Rind) | protein | fleisch_fisch | nein | 250 | 26 | 0 | 17 |
| 15 | Topfen | protein | milch_eier | nein | 67 | 12 | 4 | 0.2 |
| 16 | Forelle | protein | fleisch_fisch | nein | 148 | 20 | 0 | 7 |
| 28 | Linsen | protein | sonstiges | nein | 116 | 9 | 20 | 0.4 |
| 35 | Griechisches Joghurt | protein | milch_eier | nein | 97 | 9 | 4 | 5 |
| 36 | Bergkaese | protein | milch_eier | nein | 356 | 27 | 0 | 28 |
| 37 | Frankfurter | protein | fleisch_fisch | nein | 260 | 12 | 2 | 23 |
| 43 | Putenbrust | protein | fleisch_fisch | nein | 135 | 30 | 0 | 1.5 |
| 44 | Rindersteak | protein | fleisch_fisch | nein | 250 | 26 | 0 | 17 |
| 45 | Schweinefilet | protein | fleisch_fisch | nein | 143 | 21 | 0 | 5 |
| 46 | Garnelen | protein | fleisch_fisch | nein | 99 | 24 | 0.2 | 0.3 |
| 47 | Thunfisch | protein | fleisch_fisch | nein | 116 | 26 | 0 | 1 |
| 48 | Kichererbsen | protein | sonstiges | nein | 164 | 9 | 27 | 2.6 |
| 49 | Tempeh | protein | sonstiges | nein | 193 | 19 | 9 | 11 |
| 50 | Huettenkaese | protein | milch_eier | nein | 98 | 11 | 3.4 | 4.3 |
| 51 | Skyr | protein | milch_eier | nein | 63 | 11 | 4 | 0.2 |
| 52 | Emmentaler | protein | milch_eier | nein | 380 | 28 | 0 | 30 |
| 53 | Mozzarella | protein | milch_eier | nein | 280 | 22 | 2 | 21 |
| 54 | Speck | protein | fleisch_fisch | nein | 541 | 12 | 1 | 55 |
| 55 | Schinken | protein | fleisch_fisch | nein | 145 | 21 | 1 | 6 |
| 56 | Kabeljau | protein | fleisch_fisch | nein | 82 | 18 | 0 | 0.7 |
| 57 | Seitan | protein | sonstiges | nein | 370 | 75 | 14 | 1.9 |
| 101 | Kalbsschnitzel | protein | fleisch_fisch | nein | 172 | 23 | 0 | 8 |
| 102 | Lammfleisch | protein | fleisch_fisch | nein | 294 | 25 | 0 | 21 |
| 103 | Leberkaese | protein | fleisch_fisch | nein | 291 | 13 | 2 | 26 |
| 104 | Bratwurst | protein | fleisch_fisch | nein | 300 | 13 | 2 | 27 |
| 105 | Blunzn | protein | fleisch_fisch | nein | 379 | 15 | 4 | 34 |
| 106 | Rinderhackfleisch | protein | fleisch_fisch | nein | 254 | 17 | 0 | 20 |
| 107 | Edamame | protein | sonstiges | nein | 122 | 11 | 8 | 5 |
| 108 | Rote Linsen | protein | sonstiges | nein | 116 | 9 | 20 | 0.4 |
| 109 | Kidneybohnen | protein | sonstiges | nein | 127 | 8.7 | 22 | 0.5 |
| 110 | Weisse Bohnen | protein | sonstiges | nein | 139 | 9.7 | 25 | 0.5 |
| 111 | Sojaschnetzel | protein | sonstiges | nein | 335 | 52 | 30 | 1 |
| 112 | Erbsen | protein | sonstiges | nein | 81 | 5.4 | 14 | 0.4 |
| 113 | Buttermilch | protein | milch_eier | nein | 40 | 3.4 | 4.8 | 1 |
| 114 | Kefir | protein | milch_eier | nein | 41 | 3.3 | 4.5 | 1 |
| 115 | Ricotta | protein | milch_eier | nein | 174 | 11 | 3 | 13 |
| 116 | Parmesan | protein | milch_eier | nein | 402 | 36 | 4 | 27 |
| 117 | Ziegenkaese | protein | milch_eier | nein | 364 | 22 | 0.5 | 30 |
| 118 | Schafkaese | protein | milch_eier | nein | 250 | 15 | 3 | 20 |
| 171 | Proteinpulver | protein | sonstiges | nein | 380 | 80 | 6 | 6 |
| 172 | Eiklar | protein | milch_eier | nein | 52 | 11 | 0.7 | 0.2 |
| 173 | Magerquark | protein | milch_eier | nein | 67 | 12 | 4 | 0.2 |
| 174 | Proteinjoghurt | protein | milch_eier | nein | 60 | 10 | 4 | 0.2 |
| 175 | Salz | carbs | sonstiges | ja | 0 | 0 | 0 | 0 |
| 176 | Pfeffer, schwarz gemahlen | carbs | sonstiges | ja | 251 | 10.4 | 64 | 3.3 |
| 177 | Paprikapulver, edelsüß | carbs | sonstiges | ja | 282 | 14.1 | 54 | 13 |
| 178 | Paprikapulver, scharf | carbs | sonstiges | ja | 282 | 14.1 | 54 | 13 |
| 179 | Kümmel, gemahlen | carbs | sonstiges | ja | 375 | 18 | 44 | 22 |
| 180 | Kreuzkümmel, gemahlen | carbs | sonstiges | ja | 375 | 18 | 44 | 22 |
| 181 | Currypulver | carbs | sonstiges | ja | 325 | 14 | 56 | 14 |
| 182 | Chiliflocken | carbs | sonstiges | ja | 318 | 12 | 57 | 17 |
| 183 | Oregano, getrocknet | carbs | sonstiges | ja | 265 | 9 | 69 | 4.3 |
| 184 | Thymian, getrocknet | carbs | sonstiges | ja | 276 | 9.1 | 64 | 7.4 |
| 185 | Zimt, gemahlen | carbs | sonstiges | ja | 247 | 4 | 81 | 1.2 |
| 186 | Muskatnuss, gemahlen | carbs | sonstiges | ja | 525 | 5.8 | 49 | 36 |
| 187 | Lorbeerblatt | carbs | sonstiges | ja | 313 | 7.6 | 75 | 8.4 |
| 196 | Senf, mittelscharf | carbs | sonstiges | ja | 66 | 4 | 5 | 4 |
| 197 | Dijon-Senf | carbs | sonstiges | ja | 66 | 4 | 5 | 4 |
| 198 | Tomatenmark | carbs | sonstiges | ja | 82 | 4.3 | 19 | 0.5 |
| 200 | Worcestersauce | carbs | sonstiges | ja | 78 | 0 | 19 | 0 |
| 201 | Balsamico-Essig | carbs | sonstiges | ja | 88 | 0.5 | 17 | 0 |
| 202 | Weißweinessig | carbs | sonstiges | ja | 19 | 0 | 0.4 | 0 |
| 203 | Zitronensaft | carbs | sonstiges | ja | 22 | 0.4 | 6.9 | 0.2 |
| 204 | Limettensaft | carbs | sonstiges | ja | 25 | 0.4 | 8.4 | 0.1 |
| 206 | Gemüsebrühe | carbs | sonstiges | ja | 4 | 0.2 | 0.6 | 0.1 |
| 209 | Rotwein | carbs | sonstiges | ja | 85 | 0.1 | 2.6 | 0 |
| 210 | Weißwein | carbs | sonstiges | ja | 82 | 0.1 | 2.6 | 0 |
| 215 | Weizenmehl (Typ 700) | carbs | getreide | ja | 348 | 10 | 72 | 1 |
| 216 | Semmelbrösel | carbs | getreide | ja | 350 | 11 | 68 | 4 |
| 217 | Semmelknödel (gekocht) | carbs | getreide | ja | 180 | 5 | 33 | 3 |
| 218 | Spätzle (gekocht) | carbs | getreide | ja | 160 | 5.5 | 29 | 2 |
| 219 | Gnocchi (Fertigpackung) | carbs | getreide | ja | 160 | 3.6 | 33 | 0.6 |
| 220 | Spaghetti (gekocht) | carbs | getreide | ja | 158 | 5.8 | 31 | 0.9 |
| 221 | Weizentortilla / Wrap | carbs | getreide | ja | 310 | 8 | 50 | 8 |
| 222 | Blätterteig | carbs | getreide | ja | 380 | 6 | 36 | 24 |
| 205 | Butterschmalz | fett | milch_eier | ja | 900 | 0.2 | 0 | 99.8 |
| 211 | Sauerrahm (15 %) | fett | milch_eier | ja | 162 | 3 | 3.6 | 15 |
| 212 | Cremefine zum Kochen (15 %) | fett | milch_eier | ja | 152 | 2.4 | 3.5 | 15 |
| 188 | Rote Zwiebel | gemuese | obst_gemuese | ja | 40 | 1.1 | 9.3 | 0.1 |
| 189 | Ingwer, frisch | gemuese | obst_gemuese | ja | 80 | 1.8 | 18 | 0.8 |
| 190 | Petersilie, frisch | gemuese | obst_gemuese | ja | 36 | 3 | 6.3 | 0.8 |
| 191 | Basilikum, frisch | gemuese | obst_gemuese | ja | 23 | 3.2 | 2.7 | 0.6 |
| 192 | Schnittlauch, frisch | gemuese | obst_gemuese | ja | 30 | 3.3 | 4.4 | 0.7 |
| 193 | Koriander, frisch | gemuese | obst_gemuese | ja | 23 | 2.1 | 3.7 | 0.5 |
| 194 | Frühlingszwiebel | gemuese | obst_gemuese | ja | 32 | 1.8 | 7.3 | 0.2 |
| 195 | Chili, frisch | gemuese | obst_gemuese | ja | 40 | 1.9 | 9 | 0.4 |
| 213 | Passierte Tomaten | gemuese | sonstiges | ja | 35 | 1.5 | 6 | 0.3 |
| 214 | Gehackte Tomaten (Dose) | gemuese | sonstiges | ja | 32 | 1.3 | 5.4 | 0.3 |
| 199 | Sojasauce | protein | sonstiges | ja | 53 | 8 | 5 | 0.1 |
| 207 | Rinderbrühe | protein | sonstiges | ja | 6 | 0.8 | 0.4 | 0.1 |
| 208 | Hühnerbrühe | protein | sonstiges | ja | 6 | 0.8 | 0.4 | 0.1 |
