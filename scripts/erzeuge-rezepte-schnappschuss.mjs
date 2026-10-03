// Erzeugt den Rezepte-Schnappschuss fuer scripts/teste-budget-filter.mjs neu
// aus der Live-Datenbank (nur Lesen ueber den Anon-Key aus .env, RLS erlaubt
// Public-Read). Aufruf: npm run schnappschuss
//
// Wann laufen lassen (siehe CLAUDE.md Abschnitt 9): nach jedem neuen
// Rezepte-Paket und nach jeder Aenderung an Mengen/Zutaten/portionen (also
// immer, wenn rezept_naehrwerte_neu_berechnen() lief) - sonst testet
// teste-budget-filter.mjs gegen veraltete kcal-Werte.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const wurzel = fileURLToPath(new URL('..', import.meta.url))
const env = Object.fromEntries(
  readFileSync(`${wurzel}.env`, 'utf8')
    .split('\n')
    .filter((zeile) => zeile.includes('=') && !zeile.startsWith('#'))
    .map((zeile) => {
      const i = zeile.indexOf('=')
      return [zeile.slice(0, i).trim(), zeile.slice(i + 1).trim()]
    })
)

const antwort = await fetch(
  `${env.VITE_SUPABASE_URL}/rest/v1/rezepte?select=id,titel,mahlzeit,eigenschaft,diaeten,kcal_pro_portion&order=id&limit=1000`,
  { headers: { apikey: env.VITE_SUPABASE_ANON_KEY } }
)
if (!antwort.ok) {
  console.error('Abruf fehlgeschlagen:', antwort.status, await antwort.text())
  process.exit(1)
}
const rezepte = (await antwort.json()).map((r) => ({ ...r, kcal_pro_portion: Number(r.kcal_pro_portion) }))

// Zweite Datei: die VOLLSTAENDIGE Antwort, die die App selbst bei Supabase
// anfragt (gleicher select wie in App.jsx, inkl. rezept_zutaten + zutaten).
// Daraus bedient scripts/hilfen/offline-supabase.mjs alle Browser-Tests, damit
// KEIN automatisierter Test live auf Supabase zugreift (CLAUDE.md Abschnitt 3).
// Eine einzige Anfrage, nur Daten - keine Bilder.
const appSelect =
  'id,titel,beschreibung,bild_url,mahlzeit,eigenschaft,diaeten,anleitung,zubereitungszeit_min,portionen,tipps,' +
  'kcal_pro_portion,protein_pro_portion,carbs_pro_portion,fett_pro_portion,' +
  'rezept_zutaten(zutat_id,menge_g,anzeige_menge,anzeige_einheit,anmerkung,optional,sortierung,' +
  'zutaten(id,name,kategorie,supermarkt_kategorie,ist_grundzutat,roh_faktor,einkaufseinheit,einheitengewicht_g))'
const appAntwort = await fetch(
  `${env.VITE_SUPABASE_URL}/rest/v1/rezepte?select=${encodeURIComponent(appSelect)}&order=id&limit=1000&rezept_zutaten.order=sortierung`,
  { headers: { apikey: env.VITE_SUPABASE_ANON_KEY } }
)
if (!appAntwort.ok) {
  console.error('Abruf (App-Antwort) fehlgeschlagen:', appAntwort.status, await appAntwort.text())
  process.exit(1)
}
const appRezepte = await appAntwort.json()
writeFileSync(`${wurzel}scripts/testdaten/app-rezepte-schnappschuss.json`, JSON.stringify(appRezepte) + '\n')
console.log(`${appRezepte.length} Rezepte (voll) geschrieben nach scripts/testdaten/app-rezepte-schnappschuss.json`)

const ziel = `${wurzel}scripts/testdaten/rezepte-schnappschuss.json`
writeFileSync(ziel, JSON.stringify(rezepte, null, 1) + '\n')
console.log(`${rezepte.length} Rezepte geschrieben nach scripts/testdaten/rezepte-schnappschuss.json`)
