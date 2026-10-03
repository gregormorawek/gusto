// Logik-Tests fuer den Einkaufslisten-Umbau (Roh-Faktor, Einkaufseinheit,
// Einheitengewicht - siehe CLAUDE.md Abschnitt 12, "Einkaufsliste zeigt
// teils falsche Mengen"). Laeuft ohne Framework mit node:test.
// Aufruf: npm run test:einkaufsliste
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { einkaufsMengeFormatieren, zutatenAusRezeptKarte, zutatenHinzufuegen } from '../src/einkaufsliste.js'
import { rezeptKarteDaten } from '../src/rezeptKarteDaten.js'

const zutat = (ueberschreibungen) => ({
  zutatId: 1,
  name: 'Testzutat',
  kategorie: 'carbs',
  supermarktKategorie: 'sonstiges',
  mengeG: 100,
  rohFaktor: null,
  einkaufseinheit: 'g',
  einheitengewichtG: null,
  ...ueberschreibungen,
})

test('einkaufsMengeFormatieren: g ohne Roh-Faktor - unveraendertes Gramm', () => {
  assert.equal(einkaufsMengeFormatieren(zutat({ mengeG: 150 })), '150 g')
})

test('einkaufsMengeFormatieren: g mit Roh-Faktor - rechnet aufs Rohgewicht um (Buchweizen-Beispiel)', () => {
  // 150 g gekocht / 3,7 (Faktor Buchweizen) = 40,5 g, auf 5 g gerundet 40 g
  assert.equal(einkaufsMengeFormatieren(zutat({ mengeG: 150, rohFaktor: 3.7 })), '40 g')
})

test('einkaufsMengeFormatieren: Rohgewicht wird auf 5 g gerundet (Spaghetti 89 -> 90, Reis 56 -> 55), mindestens 5 g', () => {
  assert.equal(einkaufsMengeFormatieren(zutat({ mengeG: 89 * 2.5, rohFaktor: 2.5 })), '90 g')
  assert.equal(einkaufsMengeFormatieren(zutat({ mengeG: 56 * 3, rohFaktor: 3 })), '55 g')
  assert.equal(einkaufsMengeFormatieren(zutat({ mengeG: 2, rohFaktor: 3 })), '5 g')
})

test('einkaufsMengeFormatieren: Summierung bleibt exakt - Rundung nur in der Anzeige', () => {
  const liste = zutatenHinzufuegen(zutatenHinzufuegen([], [zutat({ mengeG: 112 })]), [zutat({ mengeG: 113 })])
  assert.equal(liste[0].mengeG, 225)
})

test('einkaufsMengeFormatieren: ml - gleiche Zahl, andere Einheit', () => {
  assert.equal(einkaufsMengeFormatieren(zutat({ mengeG: 200, einkaufseinheit: 'ml' })), '200 ml')
})

test('einkaufsMengeFormatieren: stueck - Toleranz-Rundung (Gregors drei Beispiele)', () => {
  const basis = { einkaufseinheit: 'stueck', einheitengewichtG: 100 }
  assert.equal(einkaufsMengeFormatieren(zutat({ ...basis, mengeG: 107 })), '1 Stück') // 1,07 bleibt 1
  assert.equal(einkaufsMengeFormatieren(zutat({ ...basis, mengeG: 130 })), '2 Stück') // 1,3 wird 2
  assert.equal(einkaufsMengeFormatieren(zutat({ ...basis, mengeG: 40 })), '1 Stück') // 0,4 wird 1 (Mindestens 1)
  assert.equal(einkaufsMengeFormatieren(zutat({ ...basis, mengeG: 100 })), '1 Stück') // exakt 1,0
  assert.equal(einkaufsMengeFormatieren(zutat({ ...basis, mengeG: 250 })), '3 Stück') // 2,5 -> ueber Toleranz -> 3
})

test('einkaufsMengeFormatieren: zehe - Singular/Plural', () => {
  const basis = { einkaufseinheit: 'zehe', einheitengewichtG: 4 }
  assert.equal(einkaufsMengeFormatieren(zutat({ ...basis, mengeG: 4 })), '1 Zehe')
  assert.equal(einkaufsMengeFormatieren(zutat({ ...basis, mengeG: 8 })), '2 Zehen')
})

test('einkaufsMengeFormatieren: Validierung gegen die Regel "1 Stück auf der Liste bleibt 1 Stück" (Gregors Herleitung)', () => {
  // Die im SQL Editor gesetzten Einheitengewichte sind bewusst mindestens so
  // gross wie die groesste "1 Stück"-Verwendung in den Rezepten (siehe
  // CLAUDE.md Abschnitt 12) - eine einzelne Rezept-Verwendung mit "1 Stück"
  // darf deshalb, isoliert auf der Liste, nie mehr als 1 ergeben.
  const einheitengewicht = 150 // z. B. Paprika
  const groessteEinzelVerwendung = 150 // groesster beobachteter "1 Stück"-Wert
  assert.equal(einkaufsMengeFormatieren(zutat({ einkaufseinheit: 'stueck', einheitengewichtG: einheitengewicht, mengeG: groessteEinzelVerwendung })), '1 Stück')
})

test('zutatenAusRezeptKarte: uebernimmt rohFaktor/einkaufseinheit/einheitengewichtG aus der Karte', () => {
  const karte = { zutaten: [zutat({ mengeG: 60, einkaufseinheit: 'stueck', einheitengewichtG: 60 })] }
  const [posten] = zutatenAusRezeptKarte(karte)
  assert.equal(posten.einkaufseinheit, 'stueck')
  assert.equal(posten.einheitengewichtG, 60)
  assert.equal(posten.mengeG, 60)
})

test('zutatenAusRezeptKarte: fehlende Einkaufseinheit faellt auf g zurueck', () => {
  const karte = { zutaten: [{ zutatId: 2, name: 'Alt', kategorie: 'carbs', supermarktKategorie: 'sonstiges', mengeG: 50 }] }
  const [posten] = zutatenAusRezeptKarte(karte)
  assert.equal(posten.einkaufseinheit, 'g')
})

test('zutatenHinzufuegen: summiert mengeG in Gramm, Einheitenfelder bleiben vom ersten Eintrag', () => {
  const eier = (mengeG) => zutat({ zutatId: 4, name: 'Eier', mengeG, einkaufseinheit: 'stueck', einheitengewichtG: 60 })
  let liste = zutatenHinzufuegen([], [eier(120)]) // Rezept A: 2 Eier
  liste = zutatenHinzufuegen(liste, [eier(60)]) // Rezept B: 1 Ei
  assert.equal(liste.length, 1)
  assert.equal(liste[0].mengeG, 180) // 180 g Gesamt = 3 Eier, NICHT rundungsbedingt separat berechnet
  assert.equal(einkaufsMengeFormatieren(liste[0]), '3 Stück')
})

test('rezeptKarteDaten: reicht roh_faktor/einkaufseinheit/einheitengewicht_g aus der DB-Zeile durch', () => {
  const rezept = {
    kcal_pro_portion: 500,
    protein_pro_portion: 20,
    carbs_pro_portion: 60,
    fett_pro_portion: 15,
    rezept_zutaten: [
      {
        zutat_id: 91,
        menge_g: 8,
        anzeige_menge: 2,
        anzeige_einheit: 'Zehe',
        anmerkung: null,
        optional: false,
        sortierung: 1,
        zutaten: {
          id: 91,
          name: 'Knoblauch',
          kategorie: 'gemuese',
          supermarkt_kategorie: 'obst_gemuese',
          ist_grundzutat: true,
          roh_faktor: null,
          einkaufseinheit: 'zehe',
          einheitengewicht_g: 4,
        },
      },
    ],
  }
  const karte = rezeptKarteDaten(rezept)
  const [posten] = zutatenAusRezeptKarte(karte)
  assert.equal(einkaufsMengeFormatieren(posten), '2 Zehen')
})
