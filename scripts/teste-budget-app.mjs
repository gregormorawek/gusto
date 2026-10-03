// End-to-End-Test der budget-gewichteten Rezeptauswahl im echten Browser
// (Chromium UND WebKit, drei Viewports laut CLAUDE.md Abschnitt 3). Stellt
// Ziel und Tagesauswahl per localStorage ein - kein Umstellen am Geraet
// noetig - und prueft, dass die gezeigten Rezepte zum Budget passen.
//
// Voraussetzung: Dev-Server laeuft, z. B. `npm run dev -- --port 5199`.
// Aufruf: node scripts/teste-budget-app.mjs [http://localhost:5199]
// Der Schnappschuss (npm run schnappschuss) muss zur Live-DB passen, weil
// die App die kcal aus der Live-DB zeigt und hier dagegen geprueft wird.
import { readFileSync } from 'node:fs'
import { chromium, webkit } from 'playwright'
import { korridorFuerMahlzeit, passendeRezeptIds } from '../src/budgetFilter.js'
import { gefiltertePoolFuerRezepte } from '../src/rezepteFilter.js'
import { supabaseOfflineEinrichten } from './hilfen/offline-supabase.mjs'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
const rezepte = JSON.parse(readFileSync(new URL('./testdaten/rezepte-schnappschuss.json', import.meta.url)))
const ALLE = ['fruehstueck', 'mittag', 'abend', 'snack']
const LABEL = { fruehstueck: 'Frühstück', mittag: 'Mittag', abend: 'Abend', snack: 'Snack' }
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 375, height: 700 },
  { width: 430, height: 932 },
]
const ziel = (min, max) => ({ typ: 'proTag', kalorien: { min: String(min), max: String(max) }, makro: { protein: '', carbs: '', fett: '' } })
const KEIN_ZIEL = { typ: 'kein', kalorien: { min: '', max: '' }, makro: { protein: '', carbs: '', fett: '' } }

const fehler = []
const pruefe = (bedingung, text) => {
  if (!bedingung) fehler.push(text)
}

async function neueSeite(browserTyp, viewport, zielWert) {
  const browser = await browserTyp.launch()
  const kontext = await browser.newContext({ viewport, deviceScaleFactor: 2 })
  await kontext.addInitScript((z) => {
    localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
    localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
    localStorage.setItem('gusto-ziel', JSON.stringify(z))
  }, zielWert)
  await supabaseOfflineEinrichten(kontext)
  const seite = await kontext.newPage()
  await seite.goto(URL_APP)
  // Flag 'gusto-app-bereits-geoeffnet' = Folgebesuch: der Startbildschirm
  // laeuft ohne Button von selbst weiter (PFAD B in Startbildschirm.jsx).
  await seite.locator('[aria-label="Neu würfeln"]').waitFor({ timeout: 15000 })
  return { browser, seite }
}

// Text-Zeilen ("572 kcal · 25 min") aller gerade im DOM stehenden Karten.
// Beim Wechsel stehen kurz ZWEI Karten im DOM (alte blendet aus, neue ein) -
// deshalb liest aktuelleKarte erst, wenn genau eine da ist.
const KARTENZEILE = { hasText: /^\s*\d+ kcal/ }
const alleKartenzeilen = (seite) => seite.locator('p', KARTENZEILE).evaluateAll((els) => els.map((e) => e.textContent.trim()))

// kcal der gerade gezeigten Karte. vorher: Zeile der zuvor gezeigten Karte -
// es wird gewartet, bis eine ANDERE Zeile als einzige Karte steht (das Budget
// garantiert >= 2 passende Rezepte, ein echter Wiederholer kommt also nur an
// der Rundengrenze mit anderer Minutenzahl/kcal vor; scheitert das Warten,
// wird die stehende Zeile gelesen).
async function aktuelleKarte(seite, vorher = null) {
  await seite
    .waitForFunction(
      (v) => {
        const zeilen = [...document.querySelectorAll('p')].map((e) => e.textContent.trim()).filter((t) => /^\d+ kcal/i.test(t))
        return zeilen.length === 1 && zeilen[0] !== v
      },
      vorher,
      { timeout: 4000 }
    )
    .catch(() => {})
  const zeilen = await alleKartenzeilen(seite)
  if (zeilen.length === 0) {
    // Keine Karte im DOM = genau der Fehlerfall, den das Budget nie ausloesen
    // darf ("kein Rezept"-Hinweis statt Karte). Seitentext zur Diagnose.
    const text = await seite.locator('body').innerText()
    throw new Error(`Keine Karte sichtbar. Seitentext: ${text.replace(/\s+/g, ' ').slice(0, 300)}`)
  }
  return { zeile: zeilen[0], kcal: Number(zeilen[0].match(/(\d+) kcal/i)[1]) }
}

// vorher: Kartenzeile der Mahlzeit, die vor dem Wechsel zu sehen war - beim
// Tab-Wechsel steht die alte Karte kurz allein im DOM, gelesen wird erst,
// wenn eine ANDERE (die der neuen Mahlzeit) als einzige da ist.
async function mahlzeitWaehlen(seite, slug, vorher = null) {
  await seite.getByRole('tab', { name: LABEL[slug], exact: true }).first().click()
  await seite.waitForTimeout(400)
  return aktuelleKarte(seite, vorher)
}

async function wuerfeln(seite, vorher) {
  await seite.locator('[aria-label="Neu würfeln"]').click()
  return aktuelleKarte(seite, vorher.zeile)
}

// Sammelt n Karten (erste = aktuell gezeigte, danach je einmal gewuerfelt).
async function sammle(seite, n, start) {
  let karte = start ?? (await aktuelleKarte(seite))
  const werte = [karte.kcal]
  for (let i = 1; i < n; i++) {
    karte = await wuerfeln(seite, karte)
    werte.push(karte.kcal)
  }
  return { werte, karte }
}

const passendeKcal = (slug, zielWert, aktive, uebernommen) => {
  const pool = gefiltertePoolFuerRezepte(rezepte, slug, [], '')
  const korridor = korridorFuerMahlzeit(zielWert, aktive, uebernommen, rezepte, slug)
  if (!korridor) return null
  const ids = passendeRezeptIds(pool, korridor)
  return new Set(pool.filter((r) => ids.has(r.id)).map((r) => Math.round(r.kcal_pro_portion)))
}

async function szenario(name, browserTyp, viewport, zielWert, anzahl) {
  const label = `${name} | ${browserTyp.name()} ${viewport.width}x${viewport.height}`
  const { browser, seite } = await neueSeite(browserTyp, viewport, zielWert)
  try {
    let letzteZeile = null
    for (const slug of ALLE) {
      const start = await mahlzeitWaehlen(seite, slug, letzteZeile)
      const { werte, karte } = await sammle(seite, anzahl, start)
      letzteZeile = karte.zeile
      const erlaubt = passendeKcal(slug, zielWert, ALLE, {})
      const ausserhalb = erlaubt ? werte.filter((w) => !erlaubt.has(w)) : []
      pruefe(ausserhalb.length === 0, `${label} | ${slug}: ausserhalb des Budgets: ${ausserhalb.join(', ')}`)
      pruefe(werte.every((w) => w > 0), `${label} | ${slug}: leere Karte`)
      if (!erlaubt) {
        // Ohne Ziel: eine volle Runde zeigt jedes Rezept genau einmal.
        const pool = rezepte.filter((r) => r.mahlzeit === slug)
        pruefe(werte.length >= pool.length, `${label}: zu wenige Zuege`)
      }
      console.log(`  ${label} | ${slug.padEnd(11)} ${Math.min(...werte)}-${Math.max(...werte)} kcal (${new Set(werte).size} verschieden)`)
    }
  } finally {
    await browser.close()
  }
}

// Dynamik (stilles Neuziehen): Bei Ziel 1.600 werden Fruehstueck und Mittag
// mit grossen Rezepten uebernommen - das Restbudget fuer Abend/Snack sinkt
// deutlich. Die fuer Abend/Snack VORAB gezogenen Karten (vor dem Uebernehmen
// notiert) passen dann oft nicht mehr; sie muessen still ersetzt worden sein.
// `provoziert` zaehlt, wie oft eine vorab gezogene Karte tatsaechlich ausser-
// halb des neuen Budgets lag (nur dann beweist der Lauf etwas).
let provoziert = 0
async function dynamik(browserTyp, viewport) {
  const zielWert = ziel(1550, 1650)
  const label = `dynamisch | ${browserTyp.name()} ${viewport.width}x${viewport.height}`
  const { browser, seite } = await neueSeite(browserTyp, viewport, zielWert)
  try {
    const vorab = {}
    let letzteZeile = null
    for (const slug of ['abend', 'snack']) {
      const k = await mahlzeitWaehlen(seite, slug, letzteZeile)
      vorab[slug] = k.kcal
      letzteZeile = k.zeile
    }

    const uebernommen = {}
    for (const [slug, mindestKcal] of [['fruehstueck', 450], ['mittag', 520]]) {
      let karte = await mahlzeitWaehlen(seite, slug, letzteZeile)
      for (let i = 0; i < 40 && karte.kcal < mindestKcal; i++) {
        karte = await wuerfeln(seite, karte)
      }
      await seite.locator('[aria-label="Übernehmen"]').click()
      await seite.waitForTimeout(900)
      letzteZeile = karte.zeile
      const rezept = rezepte.find((r) => r.mahlzeit === slug && Math.round(r.kcal_pro_portion) === karte.kcal)
      uebernommen[slug] = rezept.id
    }

    for (const slug of ['abend', 'snack']) {
      const start = await mahlzeitWaehlen(seite, slug, letzteZeile)
      const erlaubt = passendeKcal(slug, zielWert, ALLE, uebernommen)
      if (!erlaubt.has(vorab[slug])) provoziert++
      pruefe(erlaubt.has(start.kcal), `${label} | ${slug}: vorab gezogene Karte ${vorab[slug]} kcal nicht ersetzt (jetzt ${start.kcal}, erlaubt ${[...erlaubt].sort()})`)
      const { werte, karte: ende } = await sammle(seite, 10, start)
      letzteZeile = ende.zeile
      const ausserhalb = werte.filter((w) => !erlaubt.has(w))
      pruefe(ausserhalb.length === 0, `${label} | ${slug}: ausserhalb: ${ausserhalb.join(', ')}`)
      console.log(`  ${label} | ${slug.padEnd(11)} vorab ${vorab[slug]} -> ${start.kcal}; danach ${Math.min(...werte)}-${Math.max(...werte)} kcal (erlaubt ${Math.min(...erlaubt)}-${Math.max(...erlaubt)})`)
    }
  } finally {
    await browser.close()
  }
}

// Stilles Neuziehen bei Ziel-Aenderung: erst ohne Ziel Karten ziehen, dann
// Ziel per localStorage aendern + neu laden geht nicht (Neuladen zieht neu);
// deshalb: Ziel in den Einstellungen tippen waere UI-abhaengig - hier nur die
// Ladephase abgedeckt, das Neuziehen selbst deckt teste-budget-filter.mjs
// (Stapel) plus die Dynamik-Pruefung oben (Effekt auf Auswahl-Aenderung) ab.

// NUR=dynamik: nur der Dynamik-Lauf (Chromium 375x812), fuer schnelle
// Gegenproben, z. B. mit abgeschaltetem Neuzieh-Effekt in App.jsx.
const nurDynamik = process.env.NUR === 'dynamik'
const t0 = Date.now()
const laeufe = []
if (nurDynamik) {
  for (let i = 0; i < 3; i++) laeufe.push(() => dynamik(chromium, VIEWPORTS[0]))
} else for (const browserTyp of [chromium, webkit]) {
  for (const viewport of VIEWPORTS) {
    laeufe.push(async () => {
      await szenario('Ziel 1600', browserTyp, viewport, ziel(1550, 1650), 14)
      await szenario('Ziel 3000', browserTyp, viewport, ziel(2950, 3050), 14)
      await dynamik(browserTyp, viewport)
    })
  }
}
// Ohne Ziel: volle Runde (max. Pool = 29 Mittag) nur in einer Kombination je Engine.
if (!nurDynamik) for (const browserTyp of [chromium, webkit]) {
  laeufe.push(() => szenario('Kein Ziel', browserTyp, VIEWPORTS[0], KEIN_ZIEL, 29))
}

// Nur 3 Laeufe gleichzeitig - WebKit und Vite-Dev-Server sind sonst zu traege.
const warteschlange = [...laeufe]
await Promise.all(
  [0, 1, 2].map(async () => {
    while (warteschlange.length) {
      await warteschlange.shift()()
    }
  })
)

console.log(`\nStilles Neuziehen provoziert: ${provoziert}x (vorab gezogene Karte lag ausserhalb des neuen Budgets)`)
console.log(`Dauer: ${Math.round((Date.now() - t0) / 1000)} s`)
if (fehler.length) {
  console.error(`\n${fehler.length} FEHLER:\n- ` + fehler.join('\n- '))
  process.exit(1)
}
console.log('Alle Pruefungen bestanden.')
