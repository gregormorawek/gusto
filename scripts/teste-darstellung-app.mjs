// Browser-Test der Darstellungs-Umschaltung (Hell / Dunkel / System) - siehe
// src/theme.js, index.html (Inline-Skript) und CLAUDE.md Abschnitt 5.
// Emuliert das iPhone-Erscheinungsbild per colorScheme und prueft data-theme
// sowie die tatsaechlich berechneten Farben. Chromium + WebKit, drei Groessen.
//
// Voraussetzung: Dev-Server laeuft (npm run dev -- --port 5199).
// Aufruf: node scripts/teste-darstellung-app.mjs [http://localhost:5199]
import { chromium, webkit } from 'playwright'

const URL_APP = process.argv[2] ?? 'http://localhost:5199'
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 375, height: 700 },
  { width: 430, height: 932 },
]
const CREAM = 'rgb(247, 241, 230)'
const DUNKEL = 'rgb(29, 23, 20)'
const ESPRESSO = 'rgb(62, 46, 34)'
const HELLTEXT = 'rgb(243, 233, 218)'

const fehler = []
let faelle = 0
const pruefe = (bed, text) => {
  faelle++
  if (!bed) fehler.push(text)
}

async function neueSeite(browserTyp, viewport, { os, darstellung = null, onboarding = true }) {
  const browser = await browserTyp.launch()
  const kontext = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: os, reducedMotion: 'reduce' })
  await kontext.addInitScript(
    ({ darstellung, onboarding }) => {
      if (onboarding) localStorage.setItem('gusto-onboarding-abgeschlossen', 'true')
      localStorage.setItem('gusto-app-bereits-geoeffnet', 'true')
      if (darstellung && !sessionStorage.getItem('__init')) localStorage.setItem('gusto-darstellung', darstellung)
      sessionStorage.setItem('__init', '1')

    },
    { darstellung, onboarding }
  )
  const seite = await kontext.newPage()
  await seite.goto(URL_APP)
  return { browser, seite }
}

const theme = (s) => s.evaluate(() => document.documentElement.dataset.theme)
const bodyBg = (s) => s.evaluate(() => getComputedStyle(document.body).backgroundColor)

async function lauf(browserTyp, viewport) {
  const label = `${browserTyp.name()} ${viewport.width}x${viewport.height}`

  // 1. Matrix Darstellung x iPhone-Modus
  const matrix = [
    [null, 'light', 'light'], [null, 'dark', 'dark'],
    ['system', 'light', 'light'], ['system', 'dark', 'dark'],
    ['hell', 'light', 'light'], ['hell', 'dark', 'light'],
    ['dunkel', 'light', 'dark'], ['dunkel', 'dark', 'dark'],
  ]
  for (const [darstellung, os, soll] of matrix) {
    const { browser, seite } = await neueSeite(browserTyp, viewport, { os, darstellung })
    try {
      await seite.locator('[aria-label="Neu würfeln"]').waitFor({ timeout: 15000 })
      const t = await theme(seite)
      pruefe(t === soll, `${label} | Darstellung=${darstellung} iPhone=${os}: data-theme=${t}, erwartet ${soll}`)
      const bg = await bodyBg(seite)
      pruefe(bg === (soll === 'dark' ? DUNKEL : CREAM), `${label} | Darstellung=${darstellung} iPhone=${os}: Body-Hintergrund ${bg}`)
    } finally {
      await browser.close()
    }
  }

  // 2. Live-Wechsel des iPhone-Modus: nur "System" folgt
  for (const [darstellung, folgt] of [['system', true], ['hell', false], ['dunkel', false]]) {
    const { browser, seite } = await neueSeite(browserTyp, viewport, { os: 'light', darstellung })
    try {
      await seite.locator('[aria-label="Neu würfeln"]').waitFor({ timeout: 15000 })
      const vorher = await theme(seite)
      await seite.emulateMedia({ colorScheme: 'dark' })
      await seite.waitForTimeout(300)
      const nachDunkel = await theme(seite)
      await seite.emulateMedia({ colorScheme: 'light' })
      await seite.waitForTimeout(300)
      const nachHell = await theme(seite)
      if (folgt) {
        pruefe(vorher === 'light' && nachDunkel === 'dark' && nachHell === 'light', `${label} | System folgt live nicht (${vorher}/${nachDunkel}/${nachHell})`)
      } else {
        pruefe(nachDunkel === vorher && nachHell === vorher, `${label} | ${darstellung} darf dem iPhone nicht folgen (${vorher}/${nachDunkel}/${nachHell})`)
      }
    } finally {
      await browser.close()
    }
  }

  // 3. Schalter in den Einstellungen: bedienen, persistieren, Neuladen
  {
    const { browser, seite } = await neueSeite(browserTyp, viewport, { os: 'light' })
    try {
      await seite.locator('[aria-label="Neu würfeln"]').waitFor({ timeout: 15000 })
      await seite.getByRole('button', { name: 'Einstellungen', exact: true }).click()
      await seite.getByText('Darstellung', { exact: true }).waitFor()
      const tab = (name) => seite.getByRole('tab', { name, exact: true })
      pruefe((await tab('System').getAttribute('aria-selected')) === 'true', `${label} | Schalter startet nicht auf "System"`)
      await tab('Dunkel').click()
      await seite.waitForTimeout(300)
      pruefe((await theme(seite)) === 'dark', `${label} | Klick auf "Dunkel" setzt data-theme nicht`)
      pruefe((await bodyBg(seite)) === DUNKEL, `${label} | Body nach "Dunkel" nicht dunkel`)
      pruefe((await seite.evaluate(() => localStorage.getItem('gusto-darstellung'))) === 'dunkel', `${label} | "dunkel" nicht gespeichert`)
      await seite.reload()
      await seite.getByText('Darstellung', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {})
      pruefe((await theme(seite)) === 'dark', `${label} | Wahl "Dunkel" ueberlebt Neuladen nicht`)
      await seite.getByRole('button', { name: 'Einstellungen', exact: true }).click()
      await seite.getByText('Darstellung', { exact: true }).waitFor()
      pruefe((await tab('Dunkel').getAttribute('aria-selected')) === 'true', `${label} | Schalter zeigt nach Neuladen nicht "Dunkel"`)
      await tab('Hell').click()
      await seite.waitForTimeout(300)
      pruefe((await theme(seite)) === 'light' && (await bodyBg(seite)) === CREAM, `${label} | "Hell" wirkt nicht`)
      await tab('System').click()
      await seite.emulateMedia({ colorScheme: 'dark' })
      await seite.waitForTimeout(300)
      pruefe((await theme(seite)) === 'dark', `${label} | "System" folgt dem iPhone (dunkel) nicht`)
    } finally {
      await browser.close()
    }
  }

  // 4. Wizard bleibt bei dunklem iPhone hell, danach ist die App dunkel
  {
    const { browser, seite } = await neueSeite(browserTyp, viewport, { os: 'dark', onboarding: false })
    try {
      await seite.getByText('Kein Ziel', { exact: true }).first().waitFor({ timeout: 15000 })
      pruefe((await theme(seite)) === 'dark', `${label} | Wizard: <html> sollte dunkel bleiben (nur der Teilbaum ist hell)`)
      const wiz = await seite.evaluate(() => {
        const h = [...document.querySelectorAll('h1, h2')].find((e) => e.textContent.includes('Kalorienziel')) ?? document.querySelector('h1, h2')
        let e = h
        while (e && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)') e = e.parentElement
        return { text: getComputedStyle(h).color, bg: e ? getComputedStyle(e).backgroundColor : null }
      })
      pruefe(wiz.bg === CREAM, `${label} | Wizard-Hintergrund ${wiz.bg}, erwartet hell`)
      pruefe(wiz.text === ESPRESSO, `${label} | Wizard-Text ${wiz.text}, erwartet Espresso`)
      await seite.getByText('Kein Ziel', { exact: true }).first().click()
      await seite.getByRole('button', { name: 'Weiter' }).click()
      await seite.waitForTimeout(1600)
      await seite.getByRole('button', { name: 'Weiter' }).click()
      await seite.waitForTimeout(1600)
      await seite.getByText('Keine Einschränkung', { exact: true }).first().click()
      await seite.waitForTimeout(400)
      await seite.getByRole('button', { name: /Los geht/ }).click()
      await seite.locator('[aria-label="Neu würfeln"]').waitFor({ timeout: 15000 })
      await seite.waitForTimeout(1500)
      const app = await seite.evaluate(() => {
        const titel = document.querySelector('h2')
        return { text: titel ? getComputedStyle(titel).color : null, bg: getComputedStyle(document.body).backgroundColor }
      })
      pruefe(app.bg === DUNKEL, `${label} | nach dem Wizard: Body ${app.bg}, erwartet dunkel`)
      const zeile = await seite.evaluate(() => getComputedStyle(document.querySelector('#root > div, #root')).backgroundColor)
      pruefe(zeile === DUNKEL || zeile === 'rgba(0, 0, 0, 0)', `${label} | nach dem Wizard: Root ${zeile}`)
      pruefe(HELLTEXT !== ESPRESSO, 'sanity')
    } finally {
      await browser.close()
    }
  }
  console.log(`  fertig: ${label}`)
}

// SCHNELL=1: nur Chromium 375x812 (fuer Gegenproben mit absichtlich kaputtem Code).
const aufgaben = []
for (const b of process.env.SCHNELL ? [chromium] : [chromium, webkit]) for (const v of process.env.SCHNELL ? VIEWPORTS.slice(0, 1) : VIEWPORTS) aufgaben.push(() => lauf(b, v))
await Promise.all([0, 1, 2].map(async () => { while (aufgaben.length) await aufgaben.shift()() }))
console.log(`\n${faelle} Pruefungen`)
if (fehler.length) {
  console.error(`\n${fehler.length} FEHLER:\n- ` + [...new Set(fehler)].join('\n- '))
  process.exit(1)
}
console.log('Alle Pruefungen bestanden.')
