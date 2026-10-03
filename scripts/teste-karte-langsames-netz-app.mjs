// Regressionstest "leere Karte bei langsamem Netz" (Geraetetest 03.10.2026:
// nach fast jedem Wuerfeln/Wischen war die Karte 1-4 s komplett leer).
// Ohne Supabase: 100 Mock-Rezepte, Bilder auf eine Platzhalter-Domain, jedes
// Bild ~400 KB (echtes Rauschen-PNG, nicht komprimierbar) und kuenstlich
// verzoegert (Standard 2,5 s, ungefaehr langsames 4G). Die Verzoegerung
// laeuft ueber route() und gilt damit in Chromium UND WebKit (CDP-Drosselung
// gaebe es nur in Chromium).
// Misst beim wiederholten Wuerfeln die Zeit vom Klick bis die NEUE Karte (anderer
// Titel) sichtbar steht. Erlaubt: Austrittsanimation der alten Karte, aber
// nie auf das Bild warten.
// Dev-Server noetig (npm run dev -- --port 5199).
// Aufruf: node scripts/teste-karte-langsames-netz-app.mjs [url] [verzoegerungMs] [maxLueckeMs]
import { chromium, webkit } from 'playwright'
import sharp from 'sharp'
import { supabaseOfflineEinrichten } from './hilfen/offline-supabase.mjs'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
const VERZOEGERUNG_MS = Number(process.argv[3] ?? 2500)
const MAX_LUECKE_MS = Number(process.argv[4] ?? 900)
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 375, height: 700 },
  { width: 430, height: 932 },
]
const WUERFE = 8
const SCHNELLE_TIPPS = 6
const SCHNELLE_TIPPS_ABSTAND_MS = 330 // 6 Tipps in ~2 s
const MAX_LEER_MS = 100 // hoechstens ein paar Frames, nie spuerbar leer
const PAUSE_ZWISCHEN_WUERFEN_MS = 900

// ~400 KB nicht komprimierbares PNG (realistische Uebertragungsgroesse)
const rauschen = Buffer.alloc(360 * 370 * 3)
for (let i = 0; i < rauschen.length; i++) rauschen[i] = Math.floor(Math.random() * 256)
const BILD = await sharp(rauschen, { raw: { width: 360, height: 370, channels: 3 } }).png({ compressionLevel: 1 }).toBuffer()

const MAHLZEITEN = ['fruehstueck', 'mittag', 'abend', 'snack']
const REZEPTE = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1, titel: `Rezept ${i + 1}`, beschreibung: '', bild_url: `https://bilder.test/rezept-${i + 1}.png`,
  mahlzeit: MAHLZEITEN[i % 4], eigenschaft: 'deftig', diaeten: [], anleitung: [], zubereitungszeit_min: 10, portionen: 1, tipps: [],
  kcal_pro_portion: 500, protein_pro_portion: 30, carbs_pro_portion: 50, fett_pro_portion: 15,
  rezept_zutaten: [{ zutat_id: 1, menge_g: 50, anzeige_menge: null, anzeige_einheit: null, anmerkung: null, optional: false, sortierung: 1,
    zutaten: { id: 1, name: 'Hafer', kategorie: 'carbs', supermarkt_kategorie: 'getreide', ist_grundzutat: false, roh_faktor: null, einkaufseinheit: 'g', einheitengewicht_g: null } }],
}))

console.log(`Bildgroesse: ${(BILD.length / 1024).toFixed(0)} KB, Verzoegerung ${VERZOEGERUNG_MS} ms, erlaubt ${MAX_LUECKE_MS} ms`)
let fehler = 0
for (const [name, typ] of [['chromium', chromium], ['webkit', webkit]]) {
  for (const viewport of VIEWPORTS) {
    const browser = await typ.launch()
    const kontext = await browser.newContext({ viewport })
    await kontext.addInitScript(() => {
      localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
      localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
      localStorage.setItem('gusto-darstellung', 'hell')
    })
    await supabaseOfflineEinrichten(kontext, REZEPTE)
    await kontext.route('https://bilder.test/**', async (route) => {
      await new Promise((r) => setTimeout(r, VERZOEGERUNG_MS))
      await route.fulfill({ status: 200, contentType: 'image/png', body: BILD, headers: { 'access-control-allow-origin': '*' } }).catch(() => {})
    })
    const seite = await kontext.newPage()
    await seite.goto(URL_APP)
    await seite.waitForSelector('h2.text-on-photo', { timeout: 15000 })
    await seite.waitForTimeout(VERZOEGERUNG_MS + 500) // erste Karte inkl. Bild eingeschwungen

    // Misst pro Wurf die Zeit vom Klick bis ein ANDERER Kartentitel als zuvor
    // sichtbar im Viewport steht (deckend). Dazwischen ist die Karte leer bzw.
    // zeigt nur noch die ausfliegende alte - genau das, was am Geraet als
    // "leere Karte" auffiel. Ein reiner "irgendein Titel sichtbar"-Sampler
    // taeuscht hier (alte Karte setzt sich nach dem Austritt kurz zurueck).
    const titelSichtbar = () =>
      [...document.querySelectorAll('h2.text-on-photo')]
        .filter((h) => {
          const r = h.getBoundingClientRect()
          if (r.width === 0 || r.left < 0 || r.right > window.innerWidth) return false
          let deckkraft = 1
          for (let e = h; e; e = e.parentElement) deckkraft *= parseFloat(getComputedStyle(e).opacity)
          return deckkraft > 0.5
        })
        .map((h) => h.textContent)
    const dauern = []
    for (let i = 0; i < WUERFE; i++) {
      const vorher = (await seite.evaluate(titelSichtbar))[0]
      const t0 = Date.now()
      await seite.getByRole('button', { name: 'Neu würfeln' }).click()
      let dauer = null
      while (Date.now() - t0 < 8000) {
        const titel = await seite.evaluate(titelSichtbar)
        if (titel.length > 0 && !titel.includes(vorher)) {
          dauer = Date.now() - t0
          break
        }
        await seite.waitForTimeout(30)
      }
      dauern.push(dauer ?? 8000)
      await seite.waitForTimeout(PAUSE_ZWISCHEN_WUERFEN_MS)
    }
    const laengste = Math.max(...dauern)

    // --- Schnelles Druecken (Geraetetest 03.10.2026, Aufnahme): 6 Tipps in ~2 s
    // auf den Wuerfel, KEIN Cooldown erlaubt. rAF-Sampler zaehlt Frames, in
    // denen KEIN Kartentitel sichtbar steht (im Viewport, deckend > 0.5) - die
    // Karte darf ab dem ersten Frame nie leer sein. Die kurze Luecke, in der
    // die alte Karte ausgeflogen und die neue noch nicht eingeblendet ist,
    // wird so ebenfalls erfasst (erlaubt: MAX_LEER_MS).
    await seite.waitForTimeout(VERZOEGERUNG_MS + 500)
    await seite.evaluate(() => {
      window.__leer = { laengste: 0, summe: 0, frames: 0 }
      let seit = null
      const sichtbar = () =>
        [...document.querySelectorAll('h2.text-on-photo')].some((h) => {
          const r = h.getBoundingClientRect()
          if (r.width === 0 || r.right < 0 || r.left > window.innerWidth) return false
          let deckkraft = 1
          for (let e = h; e; e = e.parentElement) deckkraft *= parseFloat(getComputedStyle(e).opacity)
          return deckkraft > 0.3 && h.textContent.trim().length > 0
        })
      const schritt = (t) => {
        window.__leer.frames++
        if (!sichtbar()) {
          if (seit === null) seit = t
          window.__leer.laengste = Math.max(window.__leer.laengste, t - seit)
        } else seit = null
        requestAnimationFrame(schritt)
      }
      requestAnimationFrame(schritt)
    })
    for (let i = 0; i < SCHNELLE_TIPPS; i++) {
      await seite.getByRole('button', { name: 'Neu würfeln' }).click({ noWaitAfter: true, force: true })
      await seite.waitForTimeout(SCHNELLE_TIPPS_ABSTAND_MS)
    }
    await seite.waitForTimeout(VERZOEGERUNG_MS + 1500)
    const leer = Math.round(await seite.evaluate(() => window.__leer.laengste))
    const leerOk = leer <= MAX_LEER_MS
    console.log(`${name} ${viewport.width}x${viewport.height}: schnelles Druecken - laengste Zeit OHNE Titel ${leer} ms ${leerOk ? 'OK' : 'FEHLER'}`)
    if (!leerOk) fehler++
    const ok = laengste <= MAX_LUECKE_MS
    console.log(`${name} ${viewport.width}x${viewport.height}: Wurf bis neue Karte: laengster ${laengste} ms (alle: ${dauern.join(', ')}) ${ok ? 'OK' : 'FEHLER'}`)
    if (!ok) fehler++
    await browser.close()
  }
}
process.exit(fehler ? 1 : 0)
