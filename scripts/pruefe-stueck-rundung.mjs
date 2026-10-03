// Datenintegritaets-Check fuer die Einkaufslisten-Einheitengewichte
// (zutaten.einkaufseinheit = 'stueck'/'zehe', siehe CLAUDE.md Abschnitt 12).
// Prueft gegen alle Rezepte im Schnappschuss: keine einzelne Rezept-Verwendung, die "1 Stück"/"1 Zehe"
// anzeigt, darf isoliert auf der Einkaufsliste mehr als 1 ergeben - sonst
// waeren die in der Migration gesetzten Einheitengewichte zu klein (siehe
// Herleitung: "mindestens so gross wie der groesste '1 Stück'-Wert aus den
// Rezepten"). Wird bei jedem neuen Rezept-Paket relevant, das eine
// 'stueck'/'zehe'-Zutat verwendet - deshalb eigenes, wiederholbares Skript
// statt einer einmaligen Pruefung im Chat.
//
// Aufruf: npm run pruefe:stueck
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { einkaufsMengeFormatieren } from '../src/einkaufsliste.js'

// Liest den Schnappschuss (scripts/testdaten/app-rezepte-schnappschuss.json,
// Erzeugung: npm run schnappschuss) statt live Supabase anzufragen - Regel
// aus CLAUDE.md Abschnitt 3. Nach jedem neuen Rezept-Paket zuerst
// `npm run schnappschuss`, dann dieses Skript.
const wurzel = fileURLToPath(new URL('..', import.meta.url))
const rezepte = JSON.parse(readFileSync(`${wurzel}scripts/testdaten/app-rezepte-schnappschuss.json`, 'utf8'))
const nachId = {}
const zeilen = []
for (const rezept of rezepte) {
  for (const rz of rezept.rezept_zutaten) {
    const z = rz.zutaten
    if (z.einkaufseinheit === 'g' || z.einkaufseinheit === 'ml') continue
    nachId[z.id] = z
    zeilen.push({ rezept_id: rezept.id, zutat_id: z.id, menge_g: rz.menge_g, anzeige_menge: rz.anzeige_menge, anzeige_einheit: rz.anzeige_einheit })
  }
}

let fehler = 0
let geprueft = 0
for (const zeile of zeilen) {
  const zutat = nachId[zeile.zutat_id]
  // Nur Zeilen pruefen, die tatsaechlich "1 <Einheit>" zeigen (anzeige_menge
  // nahe 1) - fuer Bruchteile (0,25/0,5/...) ist ein Aufrunden auf 1
  // ausdruecklich erwuenscht (siehe CLAUDE.md), keine Verletzung.
  if (Math.abs(zeile.anzeige_menge - 1) > 0.01) continue
  geprueft++
  const anzahl = einkaufsMengeFormatieren({
    mengeG: zeile.menge_g,
    einkaufseinheit: zutat.einkaufseinheit,
    einheitengewichtG: zutat.einheitengewicht_g,
  })
  const anzahlZahl = parseInt(anzahl, 10)
  if (anzahlZahl > 1) {
    console.log(`FEHLER: Rezept ${zeile.rezept_id}, ${zutat.name}: zeigt "1 ${zeile.anzeige_einheit}" (${zeile.menge_g} g), Einkaufsliste wuerde "${anzahl}" zeigen`)
    fehler++
  }
}

console.log(`${geprueft} "1 Stück/Zehe"-Verwendungen geprueft, ${fehler} Fehler`)
process.exit(fehler ? 1 : 0)
