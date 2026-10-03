// Browser-Test: "Liste leeren" setzt die hinzugefuegt-Markierungen der
// Tagesauswahl zurueck (Bug 03.10.2026: Mahlzeit hinzufuegen -> Liste leeren ->
// erneut hinzufuegen ueberspringt die Mahlzeit). Zweiter Fall: "Abgehakte
// entfernen" laesst die Markierungen bewusst stehen. Chromium + WebKit,
// 375x812/375x700/430x932. Dev-Server noetig (npm run dev -- --port 5199).
// Aufruf: node scripts/teste-einkaufsliste-leeren-app.mjs [http://localhost:5199]
import { chromium, webkit } from 'playwright'
import { supabaseOfflineEinrichten } from './hilfen/offline-supabase.mjs'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 375, height: 700 },
  { width: 430, height: 932 },
]
// Supabase wird bewusst NICHT live angefragt (Egress-Kontingent, siehe
// CLAUDE.md Abschnitt 9) - die Rezept-Antwort kommt als Mock mit zwei
// Rezepten, darunter Spaghetti (roh_faktor) als Abendessen.
const zutatZeile = (id, name, menge, zutatExtra = {}) => ({
  zutat_id: id, menge_g: menge, anzeige_menge: null, anzeige_einheit: null, anmerkung: null, optional: false, sortierung: id,
  zutaten: { id, name, kategorie: 'carbs', supermarkt_kategorie: 'getreide', ist_grundzutat: false, roh_faktor: null, einkaufseinheit: 'g', einheitengewicht_g: null, ...zutatExtra },
})
const rezept = (id, mahlzeit, titel, zutaten) => ({
  id, titel, beschreibung: '', bild_url: null, mahlzeit, eigenschaft: 'deftig', diaeten: [], anleitung: [], zubereitungszeit_min: 10,
  portionen: 1, tipps: [], kcal_pro_portion: 500, protein_pro_portion: 30, carbs_pro_portion: 50, fett_pro_portion: 15, rezept_zutaten: zutaten,
})
const MOCK_REZEPTE = [
  rezept(1, 'fruehstueck', 'Testmüsli', [zutatZeile(1, 'Haferflocken', 60)]),
  rezept(17, 'abend', 'Testspaghetti', [zutatZeile(2, 'Spaghetti', 222, { roh_faktor: 2.5 }), zutatZeile(3, 'Tomaten', 100)]),
]

const fehler = []
let faelle = 0
const pruefe = (bed, text) => {
  faelle++
  if (!bed) fehler.push(text)
}

async function listeLesen(seite) {
  return seite.evaluate(() => JSON.parse(localStorage.getItem('gusto-einkaufsliste') ?? '[]'))
}

async function testeEngine(browserTyp, engineName) {
  for (const viewport of VIEWPORTS) {
    const label = `${engineName} ${viewport.width}x${viewport.height}`
    const browser = await browserTyp.launch()
    const kontext = await browser.newContext({ viewport })
    await kontext.addInitScript(() => {
      // Nur beim allerersten Laden setzen, sonst ueberschreibt der Init-Script
      // bei jedem Reload den Stand.
      if (sessionStorage.getItem('test-init')) return
      sessionStorage.setItem('test-init', '1')
      const heute = new Date()
      const datum = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, '0')}-${String(heute.getDate()).padStart(2, '0')}`
      localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
      localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
      localStorage.setItem('gusto-darstellung', 'hell')
      localStorage.setItem('gusto-tagesauswahl', JSON.stringify({ datum, mahlzeiten: { fruehstueck: 1, abend: 17 }, hinzugefuegt: {} }))
    })
    await supabaseOfflineEinrichten(kontext, MOCK_REZEPTE)
    const seite = await kontext.newPage()
    await seite.goto(URL_APP)
    await seite.waitForTimeout(2000)

    const nav = (name) => seite.getByRole('button', { name }).first()
    const hinzufuegen = async () => {
      await nav('Tag').click()
      await seite.waitForTimeout(600)
      await seite.getByRole('button', { name: 'Zur Einkaufsliste hinzufügen' }).click()
      await seite.waitForTimeout(600)
    }

    // 1) Erstes Hinzufuegen: beide Mahlzeiten
    await hinzufuegen()
    const erste = await listeLesen(seite)
    pruefe(erste.length > 0, `${label} | erstes Hinzufuegen: Liste leer`)

    // 2) Leeren -> erneut hinzufuegen: identische Liste
    await nav('Einkaufsliste').click()
    await seite.waitForTimeout(600)
    await seite.getByRole('button', { name: 'Liste leeren' }).click()
    await seite.getByRole('button', { name: 'Leeren', exact: true }).click()
    await seite.waitForTimeout(600)
    pruefe((await listeLesen(seite)).length === 0, `${label} | nach Leeren nicht leer`)
    await hinzufuegen()
    const zweite = await listeLesen(seite)
    pruefe(
      JSON.stringify(zweite.map((p) => [p.zutatId, p.mengeG]).sort()) === JSON.stringify(erste.map((p) => [p.zutatId, p.mengeG]).sort()),
      `${label} | nach Leeren + erneutem Hinzufuegen fehlen Posten (${zweite.length} statt ${erste.length})`
    )

    // 3) Abgehakte entfernen: Markierungen bleiben (Tag zeigt "Bereits hinzugefügt")
    await nav('Einkaufsliste').click()
    await seite.waitForTimeout(600)
    await seite.getByRole('button', { name: /abhaken/ }).first().click()
    await seite.getByRole('button', { name: 'Abgehakte entfernen' }).click()
    await seite.waitForTimeout(600)
    await nav('Tag').click()
    await seite.waitForTimeout(600)
    const body = await seite.locator('body').innerText()
    pruefe(body.includes('Bereits hinzugefügt'), `${label} | nach Abgehakte entfernen sollte "Bereits hinzugefügt" stehen`)

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
