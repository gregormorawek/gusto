// Statische Farb-Pruefung (CLAUDE.md Abschnitt 5, Regel "Farb-Tokens statt
// Farbwerte"): findet hart gesetzte Farbwerte und Token-Muster, die im Dark
// Mode kippen wuerden. Aufruf: npm run pruefe:farben (Exit-Code 1 bei Fund).
//
// Geprueft werden src/**/*.{js,jsx,css} und index.html (Kommentare werden
// ignoriert). Regeln:
//   hex      Hex-Farbwerte (#abc, #aabbcc, #aabbccdd)
//   funktion rgb()/rgba()/hsl()/hsla()/oklch()/oklab()
//   name     white/black als Farbname
//   palette  Tailwind-Standardpalette (gray-*, blue-*, ...)
//   weiss    text-card: "Weiss" auf Akzentflaeche gehoert auf text-on-primary/
//            text-on-secondary, auf Fotos auf text-on-photo (das Token `card`
//            wird im Dunkeln selbst dunkel)
//   glanz    (from|via|to)-card: Glanzstreifen/Lichtkanten mit `card` wuerden im
//            Dunkeln dunkel - konstant helles Licht ist on-photo
//   ueberlag Espresso-Token als Abdunklung/Schatten (bg-text/NN, from-text,
//            color-mix(... var(--color-text) ...)): `text` wird im Dunkeln
//            hell - dafuer gibt es scrim (Abdunklung) und shadow-base (Schatten)
//
// Ausnahmen stehen bewusst hier, jede mit Begruendung. Der Onboarding-Wizard
// ist vom Dark Mode ausgeklammert (er bleibt hell, wird spaeter neu gebaut und
// folgt der Regel dann von Anfang an) - seine Dateien werden nur auf die
// harten Regeln geprueft, nicht auf `weiss`/`ueberlag`.
import { readFileSync, readdirSync, statSync } from 'node:fs'

const WIZARD_DATEIEN = ['src/components/OnboardingWizard.jsx', 'src/components/WizardTageskarte.jsx']
// Datei -> Regeln, die dort nicht gelten.
const AUSNAHMEN = {
  // Token-Definitionen selbst: hier stehen die Farbwerte zwangslaeufig.
  'src/index.css': ['hex', 'funktion'],
  // Maskierungsverlauf: "black" ist hier nur ein Alpha-Kanal (mask-image), keine sichtbare Farbe.
  'src/components/RadPicker.jsx': ['name'],
  // Invertierte Toast-Pille: im Hellen bewusst Espresso mit Card-Schrift; im
  // Dunkeln wird sie per dark:-Variante zu "Flaeche erhoeht" mit Rand.
  'src/components/Toast.jsx': ['weiss'],
  ...Object.fromEntries(WIZARD_DATEIEN.map((d) => [d, ['weiss', 'ueberlag']])),
}

const REGELN = [
  { id: 'hex', muster: /#[0-9a-fA-F]{3,8}\b/ },
  { id: 'funktion', muster: /(?<![A-Za-z])(rgba?|hsla?|oklch|oklab)\s*\(/ },
  { id: 'name', muster: /(?<![\w-])(white|black)(?![\w-])/ },
  {
    id: 'palette',
    muster: /\b(bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|divide|decoration|accent|caret)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d/,
  },
  { id: 'weiss', muster: /\btext-card(\/\d+)?\b/ },
  { id: 'glanz', muster: /\b(from|via|to)-card(\/\d+)?\b/ },
  { id: 'ueberlag', muster: /\b(bg-text\/\d+|(from|via|to)-text(\/\d+)?\b)|color-mix\([^)]*var\(--color-text\)/ },
]

function dateien(ordner) {
  return readdirSync(ordner).flatMap((n) => {
    const pfad = `${ordner}/${n}`
    if (statSync(pfad).isDirectory()) return dateien(pfad)
    return /\.(jsx?|css)$/.test(n) ? [pfad] : []
  })
}

// Entfernt Kommentare (/* ... */ ueber mehrere Zeilen, // bis Zeilenende).
function ohneKommentare(text) {
  let imBlock = false
  return text.split('\n').map((zeile) => {
    let aus = ''
    let i = 0
    while (i < zeile.length) {
      if (imBlock) {
        const ende = zeile.indexOf('*/', i)
        if (ende === -1) return aus
        imBlock = false
        i = ende + 2
      } else if (zeile.startsWith('/*', i)) {
        imBlock = true
        i += 2
      } else if (zeile.startsWith('//', i) && zeile[i - 1] !== ':') {
        return aus
      } else {
        aus += zeile[i++]
      }
    }
    return aus
  })
}

const funde = []
for (const datei of [...dateien('src'), 'index.html']) {
  const ausnahmen = AUSNAHMEN[datei] ?? []
  ohneKommentare(readFileSync(datei, 'utf8')).forEach((zeile, i) => {
    for (const regel of REGELN) {
      if (ausnahmen.includes(regel.id)) continue
      const treffer = zeile.match(regel.muster)
      if (treffer) funde.push(`${datei}:${i + 1}  [${regel.id}]  ${treffer[0]}`)
    }
  })
}

if (funde.length) {
  console.error(`${funde.length} Fund(e):\n` + funde.join('\n'))
  process.exit(1)
}
console.log('Keine hart gesetzten Farbwerte oder kippenden Token-Muster gefunden.')
