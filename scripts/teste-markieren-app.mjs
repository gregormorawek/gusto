// Prueft, dass Oberflaechentext nicht markierbar ist (kein Auswahl-Menue am
// iPhone) und Eingabefelder weiter bedienbar bleiben. Ohne Supabase
// (Schnappschuss). Dev-Server noetig (npm run dev -- --port 5199).
// Aufruf: node scripts/teste-markieren-app.mjs [url]
import { chromium, webkit } from 'playwright'
import { supabaseOfflineEinrichten } from './hilfen/offline-supabase.mjs'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
let fehler = 0
const pruefe = (bed, text) => { if (!bed) { fehler++; console.log('FEHLER:', text) } }

for (const [name, typ] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await typ.launch()
  const kontext = await browser.newContext({ viewport: { width: 430, height: 932 } })
  await kontext.addInitScript(() => {
    localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
    localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
  })
  await supabaseOfflineEinrichten(kontext)
  const seite = await kontext.newPage()
  await seite.goto(URL_APP)
  await seite.waitForSelector('h2.text-on-photo', { timeout: 15000 })
  const stil = (sel) => seite.evaluate((s) => {
    const e = document.querySelector(s)
    const c = getComputedStyle(e)
    return { auswahl: c.userSelect || c.webkitUserSelect, callout: c.webkitTouchCallout }
  }, sel)
  // Alles markieren (Strg/Cmd+A bzw. selectAll) darf bei Oberflaechentext nichts ergeben
  await seite.evaluate(() => { document.execCommand('selectAll') })
  const markiert = await seite.evaluate(() => window.getSelection().toString())
  pruefe(markiert === '', `${name}: Text wurde markiert: "${markiert}"`)
  pruefe((await stil('body')).auswahl === 'none', `${name}: body user-select ist nicht none`)
  // Eingabefelder: Einstellungen -> Kalorienrechner hat number-Inputs; hier genuegt der Stil-Test
  const feldStil = await seite.evaluate(() => {
    const i = document.createElement('input'); document.body.appendChild(i)
    const c = getComputedStyle(i); const r = c.userSelect || c.webkitUserSelect; i.remove(); return r
  })
  pruefe(feldStil === 'text', `${name}: Eingabefeld user-select ist "${feldStil}" statt text`)
  // touch-action: manipulation app-weit, die Karte behaelt ihr inline 'pan-y'
  const ta = await seite.evaluate(() => ({
    knopf: getComputedStyle(document.querySelector('button[aria-label="Neu würfeln"]')).touchAction,
    karte: getComputedStyle(document.querySelector('h2.text-on-photo').closest('[style*="touch-action"]')).touchAction,
  }))
  pruefe(ta.knopf === 'manipulation', `${name}: Knopf touch-action ist "${ta.knopf}"`)
  pruefe(ta.karte === 'pan-y', `${name}: Karte touch-action ist "${ta.karte}" statt pan-y`)
  console.log(`${name}: ${markiert === '' ? 'OK' : 'FEHLER'} (body=${(await stil('body')).auswahl}, input=${feldStil}, knopf=${ta.knopf}, karte=${ta.karte})`)
  await browser.close()
}
process.exit(fehler ? 1 : 0)
