// Erfasst deterministische Screenshots aller Screens/Zustaende der App - die
// Grundlage fuer den Pixelvergleich (scripts/screens-vergleichen.mjs) beim
// Dark-Mode-Umbau: Schritt 1 (Token-Fundament) muss im HELLEN Modus null
// Pixel Unterschied gegenueber der Basislinie liefern, spaeter dient
// derselbe Lauf mit --modus dunkel als Review-Material.
//
// Aufruf (Dev-Server laeuft, z. B. npm run dev -- --port 5199):
//   node scripts/screens-erfassen.mjs --out <ordner> [--modus hell|dunkel]
//        [--url http://localhost:5199] [--engine chromium|webkit] [--nur name1,name2]
//
// Determinismus: Math.random ist geseedet (gleiche Rezept-Ziehungen),
// reduzierte Bewegung ist aktiv (kurze Fades statt Springs), Ziel/Auswahl/
// Einkaufsliste kommen per localStorage. Der Startbildschirm laeuft
// endlos animiert - er ist im Vergleich als "instabil" markiert, wenn zwei
// Basislinien-Laeufe voneinander abweichen (siehe screens-vergleichen.mjs).
//
// Screenshots: <out>/<engine>-<breite>x<hoehe>/<name>.png
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium, webkit } from 'playwright'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a, i, alle) => (a.startsWith('--') ? [a.slice(2), alle[i + 1]?.startsWith('--') || alle[i + 1] === undefined ? true : alle[i + 1]] : null))
    .filter(Boolean)
)
const OUT = args.out
if (!OUT) {
  console.error('Aufruf: node scripts/screens-erfassen.mjs --out <ordner> [--modus hell|dunkel] [--darstellung system|hell|dunkel]')
  process.exit(1)
}
const URL_APP = args.url ?? 'http://localhost:5199'
const MODUS = args.modus ?? 'hell'
const DARSTELLUNG = args.darstellung ?? null // localStorage-Wert des Darstellung-Schalters (ab Schritt 2)
const NUR = args.nur ? String(args.nur).split(',') : null
const ENGINES = { chromium, webkit }
const engineNamen = args.engine ? [args.engine] : ['chromium', 'webkit']
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 375, height: 700 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
]

const rezepte = JSON.parse(readFileSync(new URL('./testdaten/rezepte-schnappschuss.json', import.meta.url)))
const rezeptNahe = (slug, wunsch) =>
  rezepte.filter((r) => r.mahlzeit === slug).sort((a, b) => Math.abs(a.kcal_pro_portion - wunsch) - Math.abs(b.kcal_pro_portion - wunsch))[0]
const R = {
  fruehstueck: rezeptNahe('fruehstueck', 500),
  mittag: rezeptNahe('mittag', 600),
  abend: rezeptNahe('abend', 650),
  snack: rezeptNahe('snack', 330),
}
const ZIEL = { typ: 'proTag', kalorien: { min: '2150', max: '2250' }, makro: { protein: '', carbs: '', fett: '' } }

const EINKAUF = [
  { zutatId: 1, name: 'Hähnchenbrust', kategorie: 'protein', supermarktKategorie: 'fleisch_fisch', mengeG: 300, abgehakt: false },
  { zutatId: 2, name: 'Lachsfilet', kategorie: 'protein', supermarktKategorie: 'fleisch_fisch', mengeG: 150, abgehakt: true },
  { zutatId: 3, name: 'Skyr', kategorie: 'protein', supermarktKategorie: 'milch_eier', mengeG: 250, abgehakt: false },
  { zutatId: 4, name: 'Haferflocken', kategorie: 'carbs', supermarktKategorie: 'getreide', mengeG: 80, abgehakt: false },
  { zutatId: 5, name: 'Vollkornreis', kategorie: 'carbs', supermarktKategorie: 'getreide', mengeG: 120, abgehakt: true },
  { zutatId: 6, name: 'Brokkoli', kategorie: 'gemuese', supermarktKategorie: 'obst_gemuese', mengeG: 200, abgehakt: false },
  { zutatId: 7, name: 'Olivenöl', kategorie: 'fett', supermarktKategorie: 'sonstiges', mengeG: 20, abgehakt: false },
]

function auswahl(...slugs) {
  return Object.fromEntries(slugs.map((s) => [s, R[s].id]))
}

// Jedes Szenario: name, ls (localStorage-Eintraege ausser den Grundwerten),
// ohneOnboarding (Wizard statt App), start (erster Tab), lauf(seite, foto)
// fuehrt Aktionen aus und ruft foto('name') fuer jeden Screenshot.
const szenarien = [
  {
    name: 'rezepte',
    start: 'rezepte',
    async lauf(s, foto) {
      // Die vorgewaehlte Mahlzeit haengt von der UHRZEIT ab (standardMahlzeit)
      // - fuer reproduzierbare Bilder immer explizit Mittag waehlen.
      await s.getByRole('tab', { name: 'Mittag', exact: true }).first().click()
      await s.waitForTimeout(900)
      await foto('rezepte-karte')
      await s.getByRole('tab', { name: 'Frühstück', exact: true }).first().click()
      await s.waitForTimeout(900)
      await foto('rezepte-karte-fruehstueck')
      await s.locator('[aria-label="Filter öffnen"]').click()
      await s.waitForTimeout(900)
      await foto('rezepte-filtersheet')
    },
  },
  { name: 'tag-leer', start: 'tag', async lauf(s, foto) { await foto('tag-leer') } },
  {
    name: 'tag-teil',
    start: 'tag',
    ls: { 'gusto-ziel': ZIEL, 'gusto-tagesauswahl': { mahlzeiten: auswahl('fruehstueck', 'mittag') } },
    async lauf(s, foto) {
      await foto('tag-teil')
      await s.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach((e) => (e.scrollTop = e.scrollHeight)))
      await s.waitForTimeout(400)
      await foto('tag-teil-unten')
    },
  },
  {
    name: 'tag-alle',
    start: 'tag',
    ls: { 'gusto-ziel': ZIEL, 'gusto-tagesauswahl': { mahlzeiten: auswahl('fruehstueck', 'mittag', 'abend', 'snack') } },
    async lauf(s, foto) {
      await foto('tag-alle')
      await s.getByRole('button', { name: 'Zur Einkaufsliste hinzufügen' }).click()
      await s.waitForTimeout(350)
      await foto('tag-alle-toast')
      await s.waitForTimeout(2600)
      await foto('tag-alle-hinzugefuegt')
      await s.getByRole('button', { name: 'Bereits hinzugefügt' }).click()
      await s.waitForTimeout(700)
      await foto('tag-alle-dialog')
    },
  },
  {
    name: 'tag-pro-mahlzeit',
    start: 'tag',
    ls: {
      'gusto-ziel': { typ: 'proMahlzeit', kalorien: { min: '500', max: '700' }, makro: { protein: '', carbs: '', fett: '' } },
      'gusto-tagesauswahl': { mahlzeiten: auswahl('fruehstueck', 'abend') },
    },
    async lauf(s, foto) { await foto('tag-pro-mahlzeit') },
  },
  {
    name: 'kochmodus',
    start: 'tag',
    ls: { 'gusto-ziel': ZIEL, 'gusto-tagesauswahl': { mahlzeiten: auswahl('fruehstueck', 'mittag') } },
    async lauf(s, foto) {
      await s.getByText(R.mittag.titel, { exact: false }).first().click()
      await s.waitForTimeout(1200)
      await foto('kochmodus')
      await s.locator('button[aria-pressed]').first().scrollIntoViewIfNeeded()
      await s.locator('button[aria-pressed]').nth(0).click()
      await s.locator('button[aria-pressed]').nth(1).click()
      await s.waitForTimeout(700)
      await foto('kochmodus-schritt-erledigt')
      await s.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach((e) => (e.scrollTop = e.scrollHeight)))
      await s.waitForTimeout(500)
      await foto('kochmodus-unten')
    },
  },
  { name: 'einkauf-leer', start: 'einkaufsliste', async lauf(s, foto) { await foto('einkauf-leer') } },
  {
    name: 'einkauf',
    start: 'einkaufsliste',
    ls: { 'gusto-einkaufsliste': EINKAUF },
    async lauf(s, foto) {
      await foto('einkauf')
      await s.getByRole('button', { name: 'Liste leeren' }).click()
      await s.waitForTimeout(700)
      await foto('einkauf-dialog')
    },
  },
  {
    name: 'einstellungen',
    start: 'einstellungen',
    async lauf(s, foto) {
      await foto('einstellungen')
      await s.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach((e) => (e.scrollTop = e.scrollHeight)))
      await s.waitForTimeout(400)
      await foto('einstellungen-unten')
      await s.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach((e) => (e.scrollTop = 0)))
      await s.getByText('Ziel berechnen').first().click()
      await s.waitForTimeout(1000)
      await foto('einstellungen-kalorienrechner')
    },
  },
  {
    name: 'wizard',
    ohneOnboarding: true,
    async lauf(s, foto) {
      await s.waitForTimeout(1500)
      await foto('wizard-1')
      await s.getByText('Pro Tag', { exact: true }).first().click()
      await s.waitForTimeout(900)
      await foto('wizard-1-pro-tag')
      await s.getByText('Ziel berechnen').first().click()
      await s.waitForTimeout(1000)
      await foto('wizard-kalorienrechner')
      await s.locator('button').filter({ hasText: /^$/ }).first().click().catch(() => {})
    },
  },
  {
    name: 'wizard-schritte',
    ohneOnboarding: true,
    ls: { 'gusto-ziel': { typ: 'kein', kalorien: { min: '', max: '' }, makro: { protein: '', carbs: '', fett: '' } } },
    async lauf(s, foto) {
      await s.waitForTimeout(1500)
      await s.getByText('Kein Ziel', { exact: true }).first().click()
      await s.waitForTimeout(500)
      await s.getByRole('button', { name: 'Weiter' }).click()
      await s.waitForTimeout(1600)
      await foto('wizard-2')
      await s.getByRole('button', { name: 'Weiter' }).click()
      await s.waitForTimeout(1600)
      await foto('wizard-3')
    },
  },
  {
    name: 'startbildschirm',
    startbildschirmStehenLassen: true,
    async lauf(s, foto) {
      await s.waitForTimeout(4500)
      await foto('startbildschirm')
    },
  },
]

function datumHeute() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function szenarioLaufen(engineName, viewport, sz) {
  const browser = await ENGINES[engineName].launch()
  try {
    const kontext = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      colorScheme: MODUS === 'dunkel' ? 'dark' : 'light',
      reducedMotion: 'reduce',
    })
    const ls = { ...(sz.ls ?? {}) }
    if (ls['gusto-tagesauswahl']) {
      ls['gusto-tagesauswahl'] = { datum: datumHeute(), hinzugefuegt: {}, ...ls['gusto-tagesauswahl'] }
    }
    await kontext.addInitScript(
      ({ ls, ohneOnboarding, startbildschirmStehenLassen, darstellung }) => {
        // Geseedeter Zufall (mulberry32) -> reproduzierbare Rezept-Ziehungen.
        let a = 0x9e3779b9
        Math.random = () => {
          a |= 0
          a = (a + 0x6d2b79f5) | 0
          let t = Math.imul(a ^ (a >>> 15), 1 | a)
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
        if (!ohneOnboarding) localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
        if (!startbildschirmStehenLassen) localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
        if (darstellung) localStorage.setItem('gusto-darstellung', darstellung)
        for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, JSON.stringify(v))
      },
      { ls, ohneOnboarding: !!sz.ohneOnboarding, startbildschirmStehenLassen: !!sz.startbildschirmStehenLassen, darstellung: DARSTELLUNG }
    )
    const seite = await kontext.newPage()
    await seite.goto(URL_APP)

    const ordner = `${OUT}/${engineName}-${viewport.width}x${viewport.height}`
    mkdirSync(ordner, { recursive: true })
    const foto = async (name) => {
      await seite.evaluate(() => document.fonts.ready)
      await seite.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r })))))
      // "Beruhigen": erst speichern, wenn zwei Aufnahmen im Abstand von 300 ms
      // bytegleich sind (Springs/Fades sind dann fertig). Endlos animierte
      // Screens (Startbildschirm) beruhigen sich nie - nach 10 Versuchen wird
      // die letzte Aufnahme genommen (im Vergleich dann "instabil").
      const aufnehmen = () => seite.screenshot({ animations: 'disabled', caret: 'hide' })
      let letztes = await aufnehmen()
      for (let versuch = 0; versuch < 10; versuch++) {
        await seite.waitForTimeout(300)
        const naechstes = await aufnehmen()
        const beruhigt = naechstes.equals(letztes)
        letztes = naechstes
        if (beruhigt) break
      }
      writeFileSync(`${ordner}/${name}.png`, letztes)
    }

    if (sz.ohneOnboarding || sz.startbildschirmStehenLassen) {
      if (sz.ohneOnboarding) await seite.getByRole('heading').first().waitFor({ timeout: 15000 }).catch(() => {})
    } else {
      await seite.locator('[aria-label="Neu würfeln"]').waitFor({ timeout: 15000 })
      const tabs = { rezepte: 'Rezepte', tag: 'Tag', einkaufsliste: 'Einkaufsliste', einstellungen: 'Einstellungen' }
      if (sz.start && sz.start !== 'rezepte') {
        await seite.getByRole('button', { name: tabs[sz.start], exact: true }).click()
      }
      await seite.waitForTimeout(1200)
    }
    await sz.lauf(seite, foto)
  } finally {
    await browser.close()
  }
}

const aufgaben = []
for (const engineName of engineNamen) {
  for (const viewport of VIEWPORTS) {
    for (const sz of szenarien) {
      if (NUR && !NUR.includes(sz.name)) continue
      aufgaben.push(async () => {
        try {
          await szenarioLaufen(engineName, viewport, sz)
        } catch (e) {
          console.error(`FEHLER ${sz.name} | ${engineName} ${viewport.width}x${viewport.height}: ${e.message.split('\n')[0]}`)
          process.exitCode = 1
        }
      })
    }
  }
}
const t0 = Date.now()
await Promise.all([0, 1, 2, 3].map(async () => { while (aufgaben.length) await aufgaben.shift()() }))
console.log(`Fertig in ${Math.round((Date.now() - t0) / 1000)} s -> ${OUT} (${MODUS}${DARSTELLUNG ? ', darstellung=' + DARSTELLUNG : ''})`)
