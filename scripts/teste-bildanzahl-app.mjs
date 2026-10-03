// Zaehlt, wie viele Rezeptbilder die App beim Start tatsaechlich anfordert -
// ohne Supabase: 100 Mock-Rezepte, Bilder auf eine Platzhalter-Domain, die
// per route() mit einem 1x1-PNG beantwortet wird (kein Netzwerkverkehr).
// Schutz gegen die Egress-Regression vom 03.10.2026 (alle Bilder vorladen).
// Dev-Server noetig (npm run dev -- --port 5199).
// Aufruf: node scripts/teste-bildanzahl-app.mjs [http://localhost:5199] [maxBilder]
import { chromium, webkit } from 'playwright'
import { supabaseOfflineEinrichten } from './hilfen/offline-supabase.mjs'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
const MAX_BILDER = Number(process.argv[3] ?? 20)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const MAHLZEITEN = ['fruehstueck', 'mittag', 'abend', 'snack']
const REZEPTE = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1, titel: `Rezept ${i + 1}`, beschreibung: '', bild_url: `https://bilder.test/rezept-${i + 1}.png`,
  mahlzeit: MAHLZEITEN[i % 4], eigenschaft: 'deftig', diaeten: [], anleitung: [], zubereitungszeit_min: 10, portionen: 1, tipps: [],
  kcal_pro_portion: 500, protein_pro_portion: 30, carbs_pro_portion: 50, fett_pro_portion: 15,
  rezept_zutaten: [{ zutat_id: 1, menge_g: 50, anzeige_menge: null, anzeige_einheit: null, anmerkung: null, optional: false, sortierung: 1,
    zutaten: { id: 1, name: 'Hafer', kategorie: 'carbs', supermarkt_kategorie: 'getreide', ist_grundzutat: false, roh_faktor: null, einkaufseinheit: 'g', einheitengewicht_g: null } }],
}))

let fehler = 0
for (const [name, typ] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await typ.launch()
  const kontext = await browser.newContext({ viewport: { width: 430, height: 932 } })
  await kontext.addInitScript(() => {
    localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
    localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
  })
  const angefordert = new Set()
  await supabaseOfflineEinrichten(kontext, REZEPTE)
  await kontext.route('https://bilder.test/**', (r) => {
    angefordert.add(r.request().url())
    return r.fulfill({ status: 200, contentType: 'image/png', body: PNG })
  })
  const seite = await kontext.newPage()
  await seite.goto(URL_APP)
  await seite.waitForTimeout(6000)
  const ok = angefordert.size <= MAX_BILDER && angefordert.size > 0
  console.log(`${name}: ${angefordert.size} von 100 Bildern angefordert (Limit ${MAX_BILDER}) ${ok ? 'OK' : 'FEHLER'}`)
  if (!ok) fehler++
  await browser.close()
}
process.exit(fehler ? 1 : 0)
