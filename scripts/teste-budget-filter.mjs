// Logik-Tests fuer die budget-gewichtete Rezeptauswahl (src/budgetFilter.js
// + Stapel-Anbindung in src/rezepteFilter.js). Laeuft ohne Framework mit
// node:test gegen den eingecheckten DB-Schnappschuss
// (scripts/testdaten/rezepte-schnappschuss.json, neu erzeugen mit
// `npm run schnappschuss`). Aufruf: npm run test:budget
// Gibt zusaetzlich die Szenario-Tabelle (Ziel x Mahlzeit) aus.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MINDEST_TREFFER,
  budgetPruefer,
  korridorFuerMahlzeit,
  mahlzeitBudget,
  passendeRezeptIds,
} from '../src/budgetFilter.js'
import {
  alleAktivenMahlzeitenWuerfeln,
  filterSchluesselFuer,
  gefiltertePoolFuerRezepte,
  rezeptAusStapelZiehen,
} from '../src/rezepteFilter.js'

const rezepte = JSON.parse(readFileSync(new URL('./testdaten/rezepte-schnappschuss.json', import.meta.url)))
const ALLE = ['fruehstueck', 'mittag', 'abend', 'snack']
const proTag = (min, max) => ({ typ: 'proTag', kalorien: { min: String(min), max: String(max) }, makro: {} })
const kcalVon = (id) => rezepte.find((r) => r.id === id).kcal_pro_portion

// ------------------------------------------------------------------
// Budget-Berechnung
// ------------------------------------------------------------------

test('ohne Ziel bzw. bei ungueltigem Korridor: kein Budget', () => {
  assert.equal(mahlzeitBudget({ typ: 'kein', kalorien: { min: '', max: '' } }, ALLE, {}, 'mittag'), null)
  assert.equal(mahlzeitBudget(proTag('', ''), ALLE, {}, 'mittag'), null)
  assert.equal(mahlzeitBudget(proTag(2200, 2100), ALLE, {}, 'mittag'), null) // Min >= Max
  assert.equal(mahlzeitBudget(proTag(0, 2100), ALLE, {}, 'mittag'), null)
  assert.equal(budgetPruefer([], null), undefined)
})

test('proTag: Anteile 25/30/30/15 auf Min UND Max, deaktivierte Mahlzeit bekommt nichts', () => {
  const b = mahlzeitBudget(proTag(2150, 2250), ALLE, {}, 'mittag')
  assert.deepEqual([b.min, b.max].map(Math.round), [645, 675])
  assert.equal(mahlzeitBudget(proTag(2150, 2250), ['fruehstueck', 'abend'], {}, 'mittag'), null)
})

test('proTag: nicht alle Mahlzeiten aktiv -> auf die aktiven umverteilt', () => {
  const b = mahlzeitBudget(proTag(2000, 2000 + 100), ['fruehstueck', 'abend'], {}, 'abend')
  // Abend 0,30 von (0,25 + 0,30)
  assert.deepEqual([b.min, b.max].map(Math.round), [Math.round((2000 * 0.3) / 0.55), Math.round((2100 * 0.3) / 0.55)])
})

test('proTag dynamisch: uebernommene Mahlzeiten werden abgezogen, Rest anteilig verteilt', () => {
  const b = mahlzeitBudget(proTag(2150, 2250), ALLE, { mittag: 700 }, 'abend')
  // Rest 1450..1550, offen: Fruehstueck + Abend + Snack (0,25+0,30+0,15 = 0,70)
  assert.deepEqual([b.min, b.max].map(Math.round), [Math.round((1450 * 0.3) / 0.7), Math.round((1550 * 0.3) / 0.7)])
})

test('proTag: letzte offene Mahlzeit bekommt den ganzen Rest', () => {
  const b = mahlzeitBudget(proTag(2150, 2250), ALLE, { fruehstueck: 500, mittag: 600, abend: 700 }, 'snack')
  assert.deepEqual([b.min, b.max], [350, 450])
})

test('proTag: eigene bisherige Auswahl zaehlt fuers Budget der Mahlzeit als offen', () => {
  const ohne = mahlzeitBudget(proTag(2150, 2250), ALLE, { mittag: 700 }, 'mittag')
  const leer = mahlzeitBudget(proTag(2150, 2250), ALLE, {}, 'mittag')
  assert.deepEqual(ohne, leer)
})

test('proTag: uebernommene Rezepte deaktivierter Mahlzeiten zaehlen nicht', () => {
  const b = mahlzeitBudget(proTag(2150, 2250), ['fruehstueck', 'abend'], { snack: 400 }, 'abend')
  assert.deepEqual([b.min, b.max].map(Math.round), [Math.round((2150 * 0.3) / 0.55), Math.round((2250 * 0.3) / 0.55)])
})

test('proMahlzeit: Korridor gilt direkt, unabhaengig von anderen Auswahlen', () => {
  const ziel = { typ: 'proMahlzeit', kalorien: { min: '500', max: '700' } }
  assert.deepEqual(mahlzeitBudget(ziel, ALLE, { mittag: 900 }, 'abend'), { min: 500, max: 700 })
})

test('korridorFuerMahlzeit liest kcal der uebernommenen Rezepte aus den Rezepten', () => {
  const mittag = rezepte.find((r) => r.mahlzeit === 'mittag')
  const direkt = mahlzeitBudget(proTag(2150, 2250), ALLE, { mittag: mittag.kcal_pro_portion }, 'abend')
  const ueberWrapper = korridorFuerMahlzeit(proTag(2150, 2250), ALLE, { mittag: mittag.id, snack: null }, rezepte, 'abend')
  assert.deepEqual(ueberWrapper, direkt)
})

// ------------------------------------------------------------------
// Passende Rezepte + Fallback
// ------------------------------------------------------------------

test('Szenario-Tabelle: nie leer, mindestens min(6, Pool), nur bei Fallback ausserhalb des Spielraums', () => {
  const zeilen = []
  for (const zielKcal of [1600, 2200, 3000]) {
    for (const slug of ALLE) {
      const pool = rezepte.filter((r) => r.mahlzeit === slug)
      const korridor = mahlzeitBudget(proTag(zielKcal - 50, zielKcal + 50), ALLE, {}, slug)
      const ids = passendeRezeptIds(pool, korridor)
      assert.ok(ids.size >= Math.min(MINDEST_TREFFER, pool.length), `${zielKcal}/${slug}: zu wenige Treffer`)
      const kcal = pool.filter((r) => ids.has(r.id)).map((r) => r.kcal_pro_portion)
      zeilen.push({
        Ziel: zielKcal,
        Mahlzeit: slug,
        Budget: Math.round((korridor.min + korridor.max) / 2),
        Treffer: `${ids.size}/${pool.length}`,
        Angezeigt: `${Math.round(Math.min(...kcal))}-${Math.round(Math.max(...kcal))} kcal`,
      })
    }
  }
  console.table(zeilen)
})

test('Fallback greift bei 3.000 kcal: es kommen die groessten Rezepte', () => {
  const pool = rezepte.filter((r) => r.mahlzeit === 'mittag')
  const korridor = mahlzeitBudget(proTag(2950, 3050), ALLE, {}, 'mittag')
  const ids = passendeRezeptIds(pool, korridor)
  assert.equal(ids.size, MINDEST_TREFFER)
  const groesste = [...pool].sort((a, b) => b.kcal_pro_portion - a.kcal_pro_portion).slice(0, MINDEST_TREFFER)
  assert.deepEqual([...ids].sort(), groesste.map((r) => r.id).sort())
})

test('Fallback bei ueberschrittenem Tag (negativer Rest): die kleinsten Rezepte', () => {
  const pool = rezepte.filter((r) => r.mahlzeit === 'snack')
  const korridor = mahlzeitBudget(proTag(1550, 1650), ALLE, { fruehstueck: 600, mittag: 720, abend: 784 }, 'snack')
  assert.ok(korridor.max < 0)
  const ids = passendeRezeptIds(pool, korridor)
  const kleinste = [...pool].sort((a, b) => a.kcal_pro_portion - b.kcal_pro_portion).slice(0, MINDEST_TREFFER)
  assert.deepEqual([...ids].sort(), kleinste.map((r) => r.id).sort())
})

test('kleiner Pool (Vegan + Fruehstueck): Filter laesst alles durch, nie leer', () => {
  const pool = gefiltertePoolFuerRezepte(rezepte, 'fruehstueck', ['vegan'], '')
  assert.ok(pool.length > 0 && pool.length < MINDEST_TREFFER)
  const ids = passendeRezeptIds(pool, { min: 3000, max: 3100 })
  assert.equal(ids.size, pool.length)
})

// ------------------------------------------------------------------
// Stapel + Budget
// ------------------------------------------------------------------

// Zieht n Mal aus dem Stapel und gibt die gezogenen Rezepte zurueck.
function ziehe(slug, diaeten, eigenschaft, korridor, n) {
  const pool = gefiltertePoolFuerRezepte(rezepte, slug, diaeten, eigenschaft)
  const schluessel = filterSchluesselFuer(diaeten, eigenschaft)
  const pruefer = budgetPruefer(pool, korridor)
  let stapel = {}
  const gezogen = []
  for (let i = 0; i < n; i++) {
    const ergebnis = rezeptAusStapelZiehen(stapel, slug, schluessel, pool, pruefer)
    stapel = ergebnis.stapel
    gezogen.push(ergebnis.rezept)
  }
  return { gezogen, pool }
}

test('Stapel: nie null, nur passende Rezepte, jede Runde = jedes passende genau einmal, keine Wiederholung an der Rundengrenze', () => {
  for (const zielKcal of [1600, 2200, 3000]) {
    for (const slug of ALLE) {
      for (const diaeten of [[], ['vegan'], ['vegetarisch', 'glutenfrei']]) {
        const korridor = mahlzeitBudget(proTag(zielKcal - 50, zielKcal + 50), ALLE, {}, slug)
        const pool = gefiltertePoolFuerRezepte(rezepte, slug, diaeten, '')
        if (pool.length === 0) continue
        const passende = passendeRezeptIds(pool, korridor)
        const runden = 5
        const { gezogen } = ziehe(slug, diaeten, '', korridor, passende.size * runden)
        const label = `${zielKcal}/${slug}/${diaeten.join('+') || 'alle'}`
        assert.ok(gezogen.every((r) => r !== null), `${label}: leere Karte`)
        assert.ok(gezogen.every((r) => passende.has(r.id)), `${label}: Rezept ausserhalb des Budgets`)
        for (let r = 0; r < runden; r++) {
          const runde = gezogen.slice(r * passende.size, (r + 1) * passende.size).map((x) => x.id)
          assert.equal(new Set(runde).size, passende.size, `${label}: Runde ${r} nicht jedes Rezept genau einmal`)
        }
        if (passende.size > 1) {
          for (let i = 1; i < gezogen.length; i++) {
            assert.notEqual(gezogen[i].id, gezogen[i - 1].id, `${label}: direkte Wiederholung an Position ${i}`)
          }
        }
      }
    }
  }
})

test('Stapel: ohne Budget verhaelt er sich wie bisher (jedes Rezept des Pools genau einmal pro Runde)', () => {
  const { gezogen, pool } = ziehe('mittag', [], '', null, 29 * 3)
  for (let r = 0; r < 3; r++) {
    const runde = gezogen.slice(r * pool.length, (r + 1) * pool.length).map((x) => x.id)
    assert.equal(new Set(runde).size, pool.length)
  }
})

test('Stapel: Budget aendert sich mitten in der Runde (Restbudget sinkt) -> nie leer, nur passende', () => {
  const slug = 'abend'
  const pool = gefiltertePoolFuerRezepte(rezepte, slug, [], '')
  const schluessel = filterSchluesselFuer([], '')
  let stapel = {}
  const uebernommen = {}
  for (const [i, mahlzeitKcal] of [null, 700, 720].entries()) {
    if (mahlzeitKcal) uebernommen[i === 1 ? 'mittag' : 'fruehstueck'] = mahlzeitKcal
    const korridor = mahlzeitBudget(proTag(2150, 2250), ALLE, uebernommen, slug)
    const pruefer = budgetPruefer(pool, korridor)
    const passende = passendeRezeptIds(pool, korridor)
    for (let z = 0; z < 15; z++) {
      const e = rezeptAusStapelZiehen(stapel, slug, schluessel, pool, pruefer)
      stapel = e.stapel
      assert.ok(e.rezept && passende.has(e.rezept.id))
    }
  }
})

test('alleAktivenMahlzeitenWuerfeln: jede aktive Mahlzeit bekommt ein passendes Rezept', () => {
  const ziel = proTag(2150, 2250)
  const liste = ALLE.map((slug) => ({ slug }))
  const ergebnis = alleAktivenMahlzeitenWuerfeln(liste, rezepte, [], {}, {}, (slug, pool) =>
    budgetPruefer(pool, korridorFuerMahlzeit(ziel, ALLE, {}, rezepte, slug))
  )
  for (const slug of ALLE) {
    const pool = gefiltertePoolFuerRezepte(rezepte, slug, [], '')
    const passende = passendeRezeptIds(pool, mahlzeitBudget(ziel, ALLE, {}, slug))
    const rezept = ergebnis.rezepteProMahlzeitState[slug].rezept
    assert.ok(rezept && passende.has(rezept.id), slug)
  }
})

test('Stapel: leerer Pool liefert weiterhin null (kein Budget-Problem)', () => {
  const e = rezeptAusStapelZiehen({}, 'mittag', 'x', [], () => true)
  assert.equal(e.rezept, null)
})

test('Schnappschuss ist plausibel (100 Rezepte, alle mit kcal)', () => {
  assert.ok(rezepte.length >= 100)
  assert.ok(rezepte.every((r) => r.kcal_pro_portion > 0))
  assert.ok(kcalVon(rezepte[0].id) > 0)
})
