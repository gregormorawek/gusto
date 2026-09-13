-- Migration: Zubereitungszeit fuer kuratierte Rezepte (Minuten, Platzhalter-
-- Schaetzwerte, siehe unten). In Supabase SQL Editor ausfuehren (Projekt:
-- wruiyvttftiyskyjjuio). Noch NICHT ausgefuehrt - Gregor fuehrt sie manuell aus.

-- 1) Neue Spalte anlegen.
alter table rezepte add column if not exists zubereitungszeit_min integer;

-- 2) Zubereitungszeit fuer alle 30 bestehenden Rezepte.
--    Bewusst PLATZHALTER-Schaetzwerte, keine gestoppten Werte - hergeleitet
--    aus den tatsaechlichen Schritten der jeweiligen anleitung-Spalte
--    (Koch-/Brat-/Ofenzeiten daraus addiert, Parallelschritte wie "Reis
--    kocht waehrend das Fleisch brät" nicht aufsummiert, sondern als
--    gemeinsamer Zeitblock behandelt). Fruehstueck/Snack ohne Kochschritt
--    (nur Schneiden/Anrichten) einheitlich niedrig angesetzt. Gregor
--    korrigiert das spaeter nach eigenem Ermessen.
update rezepte set zubereitungszeit_min = 5  where id = 1;  -- Beeriges Bircher-Fruehstueck: nur ruehren/anrichten, kein Kochschritt
update rezepte set zubereitungszeit_min = 5  where id = 2;  -- Griechisches Joghurt-Muesli: nur anrichten
update rezepte set zubereitungszeit_min = 5  where id = 3;  -- Skyr-Bowl mit Erdbeeren: nur anrichten
update rezepte set zubereitungszeit_min = 5  where id = 4;  -- Kirsch-Kokos-Joghurt: nur anrichten
update rezepte set zubereitungszeit_min = 10 where id = 5;  -- Avocado-Toast mit Ei: Eier 6-7 Min kochen + toasten/anrichten
update rezepte set zubereitungszeit_min = 5  where id = 6;  -- Lachs-Frischkaese-Brot: nur bestreichen/belegen
update rezepte set zubereitungszeit_min = 5  where id = 7;  -- Huettenkaese-Brot mediterran: nur toasten/belegen
update rezepte set zubereitungszeit_min = 25 where id = 8;  -- Klassiker Haehnchen/Reis/Brokkoli: Reis ~15-20 Min + Haehnchen 6-8 Min/Seite parallel
update rezepte set zubereitungszeit_min = 20 where id = 9;  -- Asiatische Tofu-Bowl: Quinoa ~15 Min + Tofu/Chinakohl braten parallel
update rezepte set zubereitungszeit_min = 25 where id = 10; -- Lachs mit Suesskartoffel: Suesskartoffel 20-25 Min Ofen + Lachs braten parallel
update rezepte set zubereitungszeit_min = 20 where id = 11; -- Bolognese-Style mit Zucchini: Nudeln ~10 Min + Faschiertes/Zucchini braten parallel
update rezepte set zubereitungszeit_min = 15 where id = 12; -- Orientalische Couscous-Bowl: Couscous 5 Min quellen + kurz anrichten
update rezepte set zubereitungszeit_min = 25 where id = 13; -- Putenbrust nach Hausmannsart: Erdaepfel ~15-20 Min + Fisolen 8-10 Min parallel
update rezepte set zubereitungszeit_min = 20 where id = 14; -- Linsen-Reis-Teller: Reis ~15-20 Min + Linsen erwaermen parallel
update rezepte set zubereitungszeit_min = 25 where id = 15; -- Garnelen asiatisch: Naturreis ~20-25 Min (laenger als Weissreis) parallel zu Garnelen
update rezepte set zubereitungszeit_min = 20 where id = 16; -- Tempeh-Buchweizen-Bowl: Buchweizen ~15-20 Min parallel zu Tempeh/Aubergine
update rezepte set zubereitungszeit_min = 25 where id = 17; -- Haehnchen mit Kohlsprossen: Suesskartoffel 20-25 Min Ofen (Kohlsprossen letzte 15 Min mit drin) + Haehnchen parallel
update rezepte set zubereitungszeit_min = 20 where id = 18; -- Griechische Quinoa-Bowl: Quinoa ~15 Min + kurz anrichten
update rezepte set zubereitungszeit_min = 25 where id = 19; -- Steak mit Erdaepfeln: Erdaepfel ~15-20 Min + Steak kurz scharf braten + ruhen
update rezepte set zubereitungszeit_min = 20 where id = 20; -- Tofu-Pfanne mit Brokkoli: Reis ~15-20 Min parallel zu Tofu/Brokkoli
update rezepte set zubereitungszeit_min = 25 where id = 21; -- Lachs mit Spargel: Vollkornreis ~20-25 Min parallel zu Spargel/Lachs
update rezepte set zubereitungszeit_min = 20 where id = 22; -- Rote-Linsen-Curry-Bowl: Linsen kochen + Suesskartoffel braten parallel
update rezepte set zubereitungszeit_min = 20 where id = 23; -- Pute mit Champignons: Nudeln ~10 Min parallel zu Pute/Champignons
update rezepte set zubereitungszeit_min = 20 where id = 24; -- Eier-Erdaepfel-Pfanne: Erdaepfel-Wuerfel in der Pfanne 15-20 Min, Eier zum Schluss
update rezepte set zubereitungszeit_min = 5  where id = 25; -- Skyr-Snack mit Beeren: nur anrichten
update rezepte set zubereitungszeit_min = 5  where id = 26; -- Huettenkaese-Snack: nur anrichten
update rezepte set zubereitungszeit_min = 5  where id = 27; -- Kichererbsen-Snack: nur toasten/vermengen
update rezepte set zubereitungszeit_min = 5  where id = 28; -- Thunfisch-Snack: nur anrichten
update rezepte set zubereitungszeit_min = 8  where id = 29; -- Edamame-Snack asiatisch: Edamame 3-4 Min kochen + anrichten
update rezepte set zubereitungszeit_min = 5  where id = 30; -- Ricotta-Rucola-Brot: nur toasten/belegen
