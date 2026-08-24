# Design-Vertrag: Markenkonzept "Warm & natürlich"

- Verbindliche Farb-Tokens (definiert in `src/index.css` via `@theme`): `--color-bg` (#F7F1E6), `--color-card` (#FFFDF8), `--color-primary` (#C9754A), `--color-secondary` (#6B7A4A), `--color-text` (#3E2E22), `--color-text-muted` (#8A6B4A).
- Verbindliche Schriften: `font-display` = "Fraunces" (Gewicht 500/600, für Headlines), `font-sans` = "Inter" (Gewicht 400/500, für UI und Fließtext).
- Bei JEDER visuellen Änderung ausschließlich diese Tokens/Fonts verwenden (z. B. `bg-primary`, `text-text-muted`, `font-display`) statt Tailwinds Standardpalette (`gray-*`, `blue-*` usw.).
- Keine neuen Farben, Farbtöne oder Fonts einführen, ohne vorher mit Gregor Rücksprache zu halten.
- Stack: Vite + React (JavaScript, KEIN TypeScript), Tailwind CSS, Supabase, Vercel.
- Sprache: Deutsch. Fachbegriffe englisch lassen, aber beim ersten Auftreten erklären.

# Code-Komplexität

Komplexität ist erlaubt und ausdrücklich gewünscht, wenn sie echte Präzision oder Qualität liefert (z. B. Gleichungssysteme statt Näherungsrechnung, wenn Genauigkeit das Ziel ist). Einfachheit ist kein Selbstzweck mehr – wichtig ist, dass die App so schön und genau wie möglich funktioniert, nicht dass der Code kurz oder simpel bleibt. Der Code muss aber weiterhin für Claude Code selbst über mehrere Sessions hinweg nachvollziehbar sein, damit künftige Änderungen keine neuen Bugs einführen – Kommentare und klare Struktur bei komplexeren Berechnungen sind entsprechend wichtiger geworden, nicht weniger.

# Neue kuratierte Rezepte

Die Tabelle `rezepte` (Supabase) hat eine `anleitung`-Spalte (`jsonb`, Array aus `{ text, aktion }`, 3–6 Schritte, siehe `supabase/migrations/20260817_rezepte_anleitung.sql` für Beispiele und Ton). `aktion` ist fürs geplante Kochmodus-Feature (Schritt-Icon), muss einer dieser festen Werte sein: `schneiden`, `kochen`, `braten`, `roesten`, `ruehren`, `mischen`, `warten`, `servieren` — kein neuer Wert ohne Rücksprache. Beim Anlegen eines NEUEN Rezepts immer auch eine Kochanleitung im selben Stil mitliefern: klar, kein Fachjargon, auf Deutsch, mit etwas Substanz pro Schritt (kein bloßer Halbsatz), basierend auf Titel/Beschreibung/den 4 Zutaten. Ohne `anleitung` bleibt der "Zubereitung anzeigen"-Abschnitt in `RezeptKarte.jsx` einfach ausgeblendet (kein Pflichtfeld, aber für ein vollständiges Rezept gewünscht).

Geplant (noch nicht umgesetzt): eigene, großzügigere Kochmodus-Seite statt des schmalen Ausklapp-Abschnitts, mit animiertem Icon pro Schritt (aus `aktion` abgeleitet) und abhakbaren Schritten. Die Abhak-Fortschritt-Speicherung ist dabei bewusst nur Session-State (kein localStorage) — ob/wie das dauerhaft gespeichert wird, soll später über einen Einstellungen-Toggle konfigurierbar werden, nicht fix einprogrammiert.

# Einkaufsliste

Datenmodell/Logik in `src/einkaufsliste.js`, Anzeige in `EinkaufslisteAnsicht.jsx`. Jeder Posten speichert `kategorie` 1:1 als rohen Supabase-Wert der Zutat (`protein`/`carbs`/`fett`/`gemuese`/`obst`) — bewusst NICHT auf eigene Anzeige-Gruppen gemappt.

Erledigt: Die Anzeige-Gruppierung nutzt jetzt `supermarktKategorie` (1:1 aus der Supabase-Spalte `supermarkt_kategorie` der Zutat: `fleisch_fisch`/`milch_eier`/`getreide`/`obst_gemuese`/`sonstiges`) statt der alten 4 Nährwert-Abschnitte. Anzeigenamen/-Reihenfolge: Fleisch & Fisch → Milchprodukte & Eier → Getreide & Backwaren → Obst & Gemüse → Sonstiges. Bestehende localStorage-Einträge ohne `supermarktKategorie` fallen in `einkaufslisteLaden()` auf `sonstiges` zurück.
