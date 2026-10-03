// Browser-Test der "Noch X kcal"-Zeile im Tag-Tab (Karte "Tag gesamt").
// Setzt Ziel, aktive Mahlzeiten und Tagesauswahl per localStorage, oeffnet den
// Tag-Tab und prueft den Text aller Zustaende gegen eine UNABHAENGIGE
// Rechnung (nicht gegen budgetFilter.js) - Engines: Chromium + WebKit,
// Viewports 375x812, 375x700, 393x852, 430x932. Prueft ausserdem, dass
// nichts ueberlaeuft/abgeschnitten wird. Screenshots des laengsten Texts
// landen in $SCREENSHOT_DIR (falls gesetzt).
//
// Voraussetzung: Dev-Server laeuft (npm run dev -- --port 5199) und der
// Schnappschuss passt zur Live-DB (npm run schnappschuss).
// Aufruf: node scripts/teste-tagesrest-app.mjs [http://localhost:5199]
import { readFileSync } from 'node:fs'
import { chromium, webkit } from 'playwright'
import { supabaseOfflineEinrichten } from './hilfen/offline-supabase.mjs'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
const SHOTS = process.env.SCREENSHOT_DIR
const rezepte = JSON.parse(readFileSync(new URL('./testdaten/rezepte-schnappschuss.json', import.meta.url)))
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 375, height: 700 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
]
const ALLE = ['fruehstueck', 'mittag', 'abend', 'snack']
const LABEL = { fruehstueck: 'Frühstück', mittag: 'Mittag', abend: 'Abend', snack: 'Snack' }
const proTag = (min, max) => ({ typ: 'proTag', kalorien: { min: String(min), max: String(max) }, makro: { protein: '', carbs: '', fett: '' } })

// Rezept einer Mahlzeit mit kcal nahe wunsch (deterministisch).
const rezeptNahe = (slug, wunsch) =>
  rezepte.filter((r) => r.mahlzeit === slug).sort((a, b) => Math.abs(a.kcal_pro_portion - wunsch) - Math.abs(b.kcal_pro_portion - wunsch))[0]

// --- unabhaengiges Orakel (bewusst NICHT aus budgetFilter.js) ---
const r10 = (x) => Math.round(x / 10) * 10
const namen = (offene) => (offene.length >= 3 ? `${offene.length} Mahlzeiten` : offene.map((s) => LABEL[s]).join(' und '))
function erwartet(min, max, aktive, picks) {
  const kcal = (slug) => rezepte.find((r) => r.id === picks[slug]).kcal_pro_portion
  const gegessen = aktive.filter((s) => picks[s] != null).reduce((a, s) => a + kcal(s), 0)
  const offene = aktive.filter((s) => picks[s] == null)
  if (offene.length) {
    const rest = r10((min + max) / 2 - gegessen)
    return rest > 0
      ? `Noch ${rest} kcal für ${namen(offene)}`
      : `Tagesziel bereits erreicht — für ${namen(offene)} kommen die leichtesten Vorschläge.`
  }
  const abstand = gegessen < min ? r10(min - gegessen) : gegessen > max ? r10(gegessen - max) : 0
  if (abstand === 0) return 'Tagesziel erreicht'
  return gegessen < min ? `${abstand} kcal unter dem Ziel` : `${abstand} kcal über dem Ziel`
}

// Kombination Fruehstueck+Mittag+Abend+Snack, deren Summe in [min,max] liegt.
function kombiIm(min, max) {
  const [f, m, a, s] = ALLE.map((slug) => rezepte.filter((r) => r.mahlzeit === slug))
  for (const rf of f) for (const rm of m) for (const ra of a) for (const rs of s) {
    const summe = rf.kcal_pro_portion + rm.kcal_pro_portion + ra.kcal_pro_portion + rs.kcal_pro_portion
    if (summe >= min && summe <= max) return { fruehstueck: rf.id, mittag: rm.id, abend: ra.id, snack: rs.id }
  }
  throw new Error(`keine Kombination in ${min}-${max}`)
}
const kombiMit = (picks, slugs) => Object.fromEntries(slugs.map((s) => [s, picks[s]]))
const id = (slug, wunsch) => rezeptNahe(slug, wunsch).id

const Z = [2150, 2250]
const im = kombiIm(...Z)
const szenarien = [
  { name: 'offen: 1 gewaehlt -> "3 Mahlzeiten"', ziel: Z, picks: { fruehstueck: id('fruehstueck', 500) } },
  { name: 'offen: 2 gewaehlt -> "Abend und Snack"', ziel: Z, picks: { fruehstueck: id('fruehstueck', 500), mittag: id('mittag', 600) } },
  { name: 'offen: 3 gewaehlt -> "Snack"', ziel: Z, picks: { fruehstueck: id('fruehstueck', 500), mittag: id('mittag', 600), abend: id('abend', 650) } },
  { name: 'alle gewaehlt, im Korridor', ziel: Z, picks: im },
  { name: 'alle gewaehlt, unter dem Ziel', ziel: Z, picks: { fruehstueck: id('fruehstueck', 300), mittag: id('mittag', 430), abend: id('abend', 410), snack: id('snack', 120) } },
  { name: 'alle gewaehlt, ueber dem Ziel', ziel: Z, picks: { fruehstueck: id('fruehstueck', 620), mittag: id('mittag', 720), abend: id('abend', 790), snack: id('snack', 420) } },
  { name: 'aufgebraucht: 1 offen (Snack)', ziel: [1550, 1650], picks: { fruehstueck: id('fruehstueck', 600), mittag: id('mittag', 720), abend: id('abend', 780) } },
  { name: 'aufgebraucht: 2 offen (Abend und Snack)', ziel: [1000, 1100], picks: { fruehstueck: id('fruehstueck', 600), mittag: id('mittag', 720) }, langerText: true },
  { name: 'aufgebraucht: 3 offen (3 Mahlzeiten)', ziel: [500, 600], picks: { fruehstueck: id('fruehstueck', 600) } },
  { name: 'Snack deaktiviert (Auswahl ignoriert)', ziel: Z, aktive: ['fruehstueck', 'mittag', 'abend'], picks: { ...kombiMit(im, ['fruehstueck', 'mittag']), snack: id('snack', 400) } },
  { name: 'Snack deaktiviert, alle uebrigen gewaehlt', ziel: Z, aktive: ['fruehstueck', 'mittag', 'abend'], picks: { fruehstueck: id('fruehstueck', 600), mittag: id('mittag', 700), abend: id('abend', 780), snack: id('snack', 100) } },
  { name: 'proMahlzeit: keine Zeile', ziel: null, zielTyp: 'proMahlzeit', picks: { fruehstueck: id('fruehstueck', 500) } },
  { name: 'kein Ziel: keine Zeile', ziel: null, zielTyp: 'kein', picks: { fruehstueck: id('fruehstueck', 500) } },
]

const fehler = []
let geprueft = 0

async function lauf(browserTyp, viewport, sz) {
  const label = `${sz.name} | ${browserTyp.name()} ${viewport.width}x${viewport.height}`
  const aktive = sz.aktive ?? ALLE
  const zielWert = sz.ziel
    ? proTag(...sz.ziel)
    : { typ: sz.zielTyp, kalorien: { min: '500', max: '700' }, makro: { protein: '', carbs: '', fett: '' } }
  const browser = await browserTyp.launch()
  try {
    const kontext = await browser.newContext({ viewport, deviceScaleFactor: 2 })
    await kontext.addInitScript(
      ({ zielWert, aktive, picks }) => {
        const d = new Date()
        const datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
        localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
        localStorage.setItem('gusto-ziel', JSON.stringify(zielWert))
        localStorage.setItem('gusto-aktive-mahlzeiten', JSON.stringify(aktive))
        localStorage.setItem('gusto-tagesauswahl', JSON.stringify({ datum, mahlzeiten: picks, hinzugefuegt: {} }))
      },
      { zielWert, aktive, picks: sz.picks }
    )
    await supabaseOfflineEinrichten(kontext)
    const seite = await kontext.newPage()
    await seite.goto(URL_APP)
    await seite.locator('[aria-label="Neu würfeln"]').waitFor({ timeout: 15000 })
    await seite.getByRole('button', { name: 'Tag', exact: true }).click()
    const karte = seite.locator('section', { hasText: 'Tag gesamt' })
    await karte.waitFor({ timeout: 5000 })
    await seite.waitForTimeout(500)

    const zeilen = await karte.locator('p').allTextContents()
    const zeile = zeilen.find((t) => /^(Noch \d+ kcal|Tagesziel|\d+ kcal (unter|über))/.test(t.trim()))
    geprueft++
    if (sz.ziel) {
      const soll = erwartet(sz.ziel[0], sz.ziel[1], aktive, sz.picks)
      if (zeile?.trim() !== soll) fehler.push(`${label}: erwartet "${soll}", gezeigt "${zeile?.trim()}"`)
    } else if (zeile) {
      fehler.push(`${label}: Zeile sollte fehlen, gezeigt "${zeile.trim()}"`)
    }

    // Layout: nichts ragt ueber Karte oder Viewport hinaus, kein horizontales Scrollen.
    const geo = await seite.evaluate(() => {
      const sec = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Tag gesamt'))
      const sr = sec.getBoundingClientRect()
      const ps = [...sec.querySelectorAll('p')].map((p) => p.getBoundingClientRect())
      return {
        secLinks: sr.left, secRechts: sr.right, secOben: sr.top, secUnten: sr.bottom,
        pRechts: Math.max(...ps.map((r) => r.right)), pUnten: Math.max(...ps.map((r) => r.bottom)),
        ueberlauf: document.documentElement.scrollWidth - window.innerWidth,
        breite: window.innerWidth,
      }
    })
    if (geo.pRechts > geo.secRechts + 0.5) fehler.push(`${label}: Text ragt rechts aus der Karte (${geo.pRechts} > ${geo.secRechts})`)
    if (geo.pUnten > geo.secUnten + 0.5) fehler.push(`${label}: Text ragt unten aus der Karte`)
    if (geo.ueberlauf > 0) fehler.push(`${label}: horizontaler Ueberlauf ${geo.ueberlauf}px`)
    if (geo.secRechts > geo.breite || geo.secLinks < 0) fehler.push(`${label}: Karte ausserhalb des Viewports`)

    // Keine Warnfarbe: die Zeile hat dieselbe Farbe wie die Ziel-Zeile darueber.
    if (zeile) {
      const farben = await karte.locator('p').evaluateAll((ps) =>
        ps.filter((p) => /^(Ziel |Noch \d+ kcal|Tagesziel|\d+ kcal (unter|über))/.test(p.textContent.trim())).map((p) => getComputedStyle(p).color)
      )
      if (new Set(farben).size !== 1) fehler.push(`${label}: Zeile weicht farblich von der Ziel-Zeile ab (${farben.join(' / ')})`)
    }

    if (SHOTS && sz.langerText) {
      await karte.screenshot({ path: `${SHOTS}/tagesrest-${browserTyp.name()}-${viewport.width}x${viewport.height}.png` })
    }
    console.log(`  ok  ${label} -> ${zeile?.trim() ?? '(keine Zeile)'}`)
  } catch (e) {
    fehler.push(`${label}: ${e.message.split('\n')[0]}`)
  } finally {
    await browser.close()
  }
}

const aufgaben = []
for (const browserTyp of [chromium, webkit]) for (const viewport of VIEWPORTS) for (const sz of szenarien) aufgaben.push(() => lauf(browserTyp, viewport, sz))
await Promise.all([0, 1, 2, 3].map(async () => { while (aufgaben.length) await aufgaben.shift()() }))

console.log(`\n${geprueft} Faelle geprueft`)
if (fehler.length) {
  console.error(`\n${fehler.length} FEHLER:\n- ` + [...new Set(fehler)].join('\n- '))
  process.exit(1)
}
console.log('Alle Pruefungen bestanden.')
