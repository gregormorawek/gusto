// Entkoppelt Browser-Tests von Supabase (Regel in CLAUDE.md Abschnitt 3:
// kein automatisierter Test greift live auf Supabase zu - Egress-Kontingent
// wurde schon zweimal gesprengt). Aufruf direkt nach newContext(), VOR dem
// ersten goto():
//   await supabaseOfflineEinrichten(kontext)
// - REST (rezepte) -> scripts/testdaten/app-rezepte-schnappschuss.json
//   (Erzeugung: npm run schnappschuss)
// - Storage-Bilder -> 1x1-Platzhalter-PNG
// - alles andere unter *.supabase.co -> leere Antwort
// Optional: eigene Rezepte (z. B. synthetische Testdaten) statt Schnappschuss.
import { readFileSync } from 'node:fs'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const SCHNAPPSCHUSS = new URL('../testdaten/app-rezepte-schnappschuss.json', import.meta.url)
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }

export async function supabaseOfflineEinrichten(kontext, rezepte = null) {
  const rezepteJson = JSON.stringify(rezepte ?? JSON.parse(readFileSync(SCHNAPPSCHUSS, 'utf8')))
  await kontext.route('**/*.supabase.co/**', (route) => {
    const anfrage = route.request()
    const url = anfrage.url()
    if (anfrage.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS })
    }
    if (url.includes('/storage/v1/')) {
      return route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS,
      body: url.includes('/rest/v1/rezepte') ? rezepteJson : '[]',
    })
  })
}
