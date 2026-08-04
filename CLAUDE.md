# Design-Vertrag: Markenkonzept "Warm & natürlich"

- Verbindliche Farb-Tokens (definiert in `src/index.css` via `@theme`): `--color-bg` (#F7F1E6), `--color-card` (#FFFDF8), `--color-primary` (#C9754A), `--color-secondary` (#6B7A4A), `--color-text` (#3E2E22), `--color-text-muted` (#8A6B4A).
- Verbindliche Schriften: `font-display` = "Fraunces" (Gewicht 500/600, für Headlines), `font-sans` = "Inter" (Gewicht 400/500, für UI und Fließtext).
- Bei JEDER visuellen Änderung ausschließlich diese Tokens/Fonts verwenden (z. B. `bg-primary`, `text-text-muted`, `font-display`) statt Tailwinds Standardpalette (`gray-*`, `blue-*` usw.).
- Keine neuen Farben, Farbtöne oder Fonts einführen, ohne vorher mit Gregor Rücksprache zu halten.
- Stack: Vite + React (JavaScript, KEIN TypeScript), Tailwind CSS, Supabase, Vercel.
- Sprache: Deutsch. Fachbegriffe englisch lassen, aber beim ersten Auftreten erklären.

# Code-Komplexität

Komplexität ist erlaubt und ausdrücklich gewünscht, wenn sie echte Präzision oder Qualität liefert (z. B. Gleichungssysteme statt Näherungsrechnung, wenn Genauigkeit das Ziel ist). Einfachheit ist kein Selbstzweck mehr – wichtig ist, dass die App so schön und genau wie möglich funktioniert, nicht dass der Code kurz oder simpel bleibt. Der Code muss aber weiterhin für Claude Code selbst über mehrere Sessions hinweg nachvollziehbar sein, damit künftige Änderungen keine neuen Bugs einführen – Kommentare und klare Struktur bei komplexeren Berechnungen sind entsprechend wichtiger geworden, nicht weniger.
