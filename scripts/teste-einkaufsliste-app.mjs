// Browser-Smoke-Test des Einkaufslisten-Umbaus (Roh-Faktor, Einkaufseinheit,
// Einheitengewicht - siehe CLAUDE.md Abschnitt 12) - prueft die tatsaechlich
// GERENDERTE Anzeige, nicht nur die reine Logik (die deckt
// scripts/teste-einkaufsliste.mjs ab). Setzt die Einkaufsliste per
// context.addInitScript VOR dem ersten goto() (Muster aus
// teste-darstellung-app.mjs) statt per evaluate()+reload() NACH dem Laden -
// letzteres lief unter WebKit bei mehreren Browser-Starts im selben Prozess
// wiederholt in einen Timeout, obwohl der Inhalt laut body.innerText()
// bereits korrekt da war (vermutlich eine Race zwischen reload() und dem
// naechsten Paint). addInitScript umgeht das, weil localStorage schon vor
// der allerersten Navigation steht. Chromium + WebKit, 375x812/375x700/
// 430x932.
//
// Voraussetzung: Dev-Server laeuft (npm run dev -- --port 5199).
// Aufruf: node scripts/teste-einkaufsliste-app.mjs [http://localhost:5199]
import { chromium, webkit } from 'playwright'
import { supabaseOfflineEinrichten } from './hilfen/offline-supabase.mjs'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 375, height: 700 },
  { width: 430, height: 932 },
]

const POSTEN = [
  // 2x60g + 1x60g aus zwei "Rezepten" zusammengefuehrt gedacht -> 3 Stueck
  { zutatId: 4, name: 'Eier', kategorie: 'protein', supermarktKategorie: 'milch_eier', mengeG: 180, einkaufseinheit: 'stueck', einheitengewichtG: 60, abgehakt: false },
  { zutatId: 91, name: 'Knoblauch', kategorie: 'gemuese', supermarktKategorie: 'obst_gemuese', mengeG: 8, einkaufseinheit: 'zehe', einheitengewichtG: 4, abgehakt: false },
  { zutatId: 60, name: 'Buchweizen', kategorie: 'carbs', supermarktKategorie: 'getreide', mengeG: 150, rohFaktor: 3.7, einkaufseinheit: 'g', abgehakt: false },
  { zutatId: 223, name: 'Milch (1,5 %)', kategorie: 'protein', supermarktKategorie: 'milch_eier', mengeG: 200, einkaufseinheit: 'ml', abgehakt: false },
]
const ERWARTET = { Eier: '3 Stück', Knoblauch: '2 Zehen', Buchweizen: '40 g', 'Milch (1,5 %)': '200 ml' }

const fehler = []
let faelle = 0
const pruefe = (bed, text) => {
  faelle++
  if (!bed) fehler.push(text)
}

async function testeEngine(browserTyp, engineName) {
  for (const viewport of VIEWPORTS) {
    const browser = await browserTyp.launch()
    const kontext = await browser.newContext({ viewport })
    await kontext.addInitScript((posten) => {
      localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
      localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
      localStorage.setItem('gusto-darstellung', 'hell')
      localStorage.setItem('gusto-einkaufsliste', JSON.stringify(posten))
    }, POSTEN)
    await supabaseOfflineEinrichten(kontext)
    const seite = await kontext.newPage()
    await seite.goto(URL_APP)
    await seite.waitForTimeout(2000)
    await seite.getByRole('button', { name: 'Einkaufsliste' }).click()
    await seite.waitForTimeout(1000)

    const label = `${engineName} ${viewport.width}x${viewport.height}`
    const body = await seite.locator('body').innerText()
    for (const [name, erwartet] of Object.entries(ERWARTET)) {
      pruefe(body.includes(erwartet), `${label} | ${name} -> erwartet "${erwartet}" im Text, nicht gefunden`)
    }
    await browser.close()
  }
}

await testeEngine(chromium, 'chromium')
await testeEngine(webkit, 'webkit')

console.log(`\n${faelle} Faelle geprueft`)
if (fehler.length) {
  console.log(`${fehler.length} Fehler:`)
  fehler.forEach((f) => console.log(`  ${f}`))
  process.exit(1)
}
console.log('Alle Pruefungen bestanden.')
