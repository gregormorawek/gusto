#!/usr/bin/env node
// Einmaliges Wartungsskript: komprimiert die 30 Midjourney-Bilder im
// Supabase-Storage-Bucket "rezept-bilder" (Egress-Kontingent war ueberschritten).
//
// Wichtig: Der Dateiname bleibt UNVERAENDERT (inkl. .png-Endung), damit die
// bild_url-Spalte in der rezepte-Tabelle nicht angepasst werden muss. Statt
// auf JPEG umzukodieren, nutzt das Skript sharps PNG-Palette-Modus (echtes
// PNG, aber mit reduzierter Farbtiefe/Quantisierung) - das erreicht eine
// mit JPEG-Qualitaet ~78 vergleichbare Kompression, ohne das Dateiformat
// zu wechseln. Siehe CLAUDE.md-Auftrag fuer den Hintergrund.
//
// Aufruf:
//   node scripts/komprimiere-rezeptbilder.js bericht        -> nur Groessen auflisten (keine Aenderung)
//   node scripts/komprimiere-rezeptbilder.js test            -> komprimiert NUR das erste Bild zur Kontrolle
//   node scripts/komprimiere-rezeptbilder.js alle            -> komprimiert alle Bilder im Bucket
//   node scripts/komprimiere-rezeptbilder.js lokal <ordner>  -> komprimiert PNGs aus einem lokalen Ordner
//                                                                und laedt sie direkt hoch (Original geht nie
//                                                                unkomprimiert durchs Egress-Kontingent)

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const BUCKET = 'rezept-bilder'
const MAX_BREITE = 1200
const PNG_QUALITAET = 78 // vergleichbar mit JPEG-Qualitaet ~78, siehe Kommentar oben
const SCRATCHPAD = '/private/tmp/claude-501/-Users-gregormorawek-code-gusto/9f74ddc8-2506-4c65-b96c-0808c777b698/scratchpad'

// .env manuell laden: Dieses Skript laeuft per "node", nicht per Vite,
// daher ist import.meta.env hier leer.
async function ladeEnv() {
  const envPfad = path.resolve(process.cwd(), '.env')
  const inhalt = await fs.readFile(envPfad, 'utf-8')
  for (const zeile of inhalt.split('\n')) {
    const getrimmt = zeile.trim()
    if (!getrimmt || getrimmt.startsWith('#')) continue
    const gleichIndex = getrimmt.indexOf('=')
    if (gleichIndex === -1) continue
    const schluessel = getrimmt.slice(0, gleichIndex).trim()
    const wert = getrimmt.slice(gleichIndex + 1).trim()
    if (!(schluessel in process.env)) process.env[schluessel] = wert
  }
}

function formatiereBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function listeMitGroessen(supabase) {
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 })
  if (error) throw new Error(`Bucket-Listing fehlgeschlagen: ${error.message}`)
  return data
    .filter((eintrag) => eintrag.name.toLowerCase().endsWith('.png'))
    .sort((a, b) => {
      const na = Number(a.name.match(/\d+/)?.[0] ?? 0)
      const nb = Number(b.name.match(/\d+/)?.[0] ?? 0)
      return na - nb
    })
}

async function berichtAusgeben(supabase) {
  const dateien = await listeMitGroessen(supabase)
  let gesamt = 0
  for (const datei of dateien) {
    const groesse = datei.metadata?.size ?? 0
    gesamt += groesse
    console.log(`${datei.name}: ${formatiereBytes(groesse)}`)
  }
  console.log(`\nGesamt (${dateien.length} Dateien): ${formatiereBytes(gesamt)}`)
  return { dateien, gesamt }
}

async function komprimiereEinzelbild(supabase, name) {
  const { data: original, error: downloadFehler } = await supabase.storage.from(BUCKET).download(name)
  if (downloadFehler) throw new Error(`Download von ${name} fehlgeschlagen: ${downloadFehler.message}`)
  const inputBuffer = Buffer.from(await original.arrayBuffer())

  const outputBuffer = await sharp(inputBuffer)
    .resize({ width: MAX_BREITE, withoutEnlargement: true })
    .png({ quality: PNG_QUALITAET, palette: true, compressionLevel: 9 })
    .toBuffer()

  const { error: uploadFehler } = await supabase.storage
    .from(BUCKET)
    .upload(name, outputBuffer, { contentType: 'image/png', upsert: true })
  if (uploadFehler) throw new Error(`Upload von ${name} fehlgeschlagen: ${uploadFehler.message}`)

  return { vorher: inputBuffer.length, nachher: outputBuffer.length, inputBuffer, outputBuffer }
}

async function listeLokalMitGroessen(ordner) {
  const namen = await fs.readdir(ordner)
  const pngNamen = namen
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)?.[0] ?? 0)
      const nb = Number(b.match(/\d+/)?.[0] ?? 0)
      return na - nb
    })
  const dateien = []
  for (const name of pngNamen) {
    const stat = await fs.stat(path.join(ordner, name))
    dateien.push({ name, groesse: stat.size })
  }
  return dateien
}

async function komprimiereLokaleDatei(supabase, ordner, name) {
  const inputBuffer = await fs.readFile(path.join(ordner, name))

  const outputBuffer = await sharp(inputBuffer)
    .resize({ width: MAX_BREITE, withoutEnlargement: true })
    .png({ quality: PNG_QUALITAET, palette: true, compressionLevel: 9 })
    .toBuffer()

  const { error: uploadFehler } = await supabase.storage
    .from(BUCKET)
    .upload(name, outputBuffer, { contentType: 'image/png', upsert: true })
  if (uploadFehler) throw new Error(`Upload von ${name} fehlgeschlagen: ${uploadFehler.message}`)

  return { vorher: inputBuffer.length, nachher: outputBuffer.length }
}

async function main() {
  await ladeEnv()

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'Fehlt: VITE_SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY in .env.\n' +
        'Der anon key reicht fuer Storage-Schreibzugriff nicht aus.'
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const modus = process.argv[2]

  if (modus === 'bericht') {
    await berichtAusgeben(supabase)
    return
  }

  if (modus === 'test') {
    const { dateien } = await berichtAusgeben(supabase)
    if (dateien.length === 0) {
      console.log('Keine Bilder gefunden.')
      return
    }
    const testDatei = dateien[0]
    console.log(`\nKomprimiere zur Kontrolle nur: ${testDatei.name}`)
    const ergebnis = await komprimiereEinzelbild(supabase, testDatei.name)
    console.log(
      `${testDatei.name}: ${formatiereBytes(ergebnis.vorher)} -> ${formatiereBytes(ergebnis.nachher)} ` +
        `(-${(100 - (ergebnis.nachher / ergebnis.vorher) * 100).toFixed(0)}%)`
    )

    await fs.mkdir(SCRATCHPAD, { recursive: true })
    const vorherPfad = path.join(SCRATCHPAD, `test-vorher-${testDatei.name}`)
    const nachherPfad = path.join(SCRATCHPAD, `test-nachher-${testDatei.name}`)
    await fs.writeFile(vorherPfad, ergebnis.inputBuffer)
    await fs.writeFile(nachherPfad, ergebnis.outputBuffer)
    console.log(`\nZum visuellen Vergleich gespeichert:\n  ${vorherPfad}\n  ${nachherPfad}`)
    return
  }

  if (modus === 'alle') {
    const { dateien, gesamt: gesamtVorher } = await berichtAusgeben(supabase)
    console.log(`\nKomprimiere ${dateien.length} Bilder...\n`)
    let gesamtNachher = 0
    for (const datei of dateien) {
      const ergebnis = await komprimiereEinzelbild(supabase, datei.name)
      gesamtNachher += ergebnis.nachher
      console.log(
        `${datei.name}: ${formatiereBytes(ergebnis.vorher)} -> ${formatiereBytes(ergebnis.nachher)} ` +
          `(-${(100 - (ergebnis.nachher / ergebnis.vorher) * 100).toFixed(0)}%)`
      )
    }
    console.log(
      `\nBucket gesamt: ${formatiereBytes(gesamtVorher)} -> ${formatiereBytes(gesamtNachher)} ` +
        `(-${(100 - (gesamtNachher / gesamtVorher) * 100).toFixed(0)}%)`
    )
    return
  }

  if (modus === 'lokal') {
    const ordner = process.argv[3]
    if (!ordner) {
      console.error('Bitte Ordner angeben: node scripts/komprimiere-rezeptbilder.js lokal <ordner>')
      process.exit(1)
    }
    const ordnerPfad = path.resolve(process.cwd(), ordner)
    const dateien = await listeLokalMitGroessen(ordnerPfad)
    const gesamtVorher = dateien.reduce((summe, d) => summe + d.groesse, 0)
    console.log(`${dateien.length} PNGs in ${ordnerPfad} gefunden, gesamt ${formatiereBytes(gesamtVorher)}\n`)

    let gesamtNachher = 0
    for (const datei of dateien) {
      const ergebnis = await komprimiereLokaleDatei(supabase, ordnerPfad, datei.name)
      gesamtNachher += ergebnis.nachher
      console.log(
        `${datei.name}: ${formatiereBytes(ergebnis.vorher)} -> ${formatiereBytes(ergebnis.nachher)} ` +
          `(-${(100 - (ergebnis.nachher / ergebnis.vorher) * 100).toFixed(0)}%)`
      )
    }
    console.log(
      `\nGesamt: ${formatiereBytes(gesamtVorher)} -> ${formatiereBytes(gesamtNachher)} ` +
        `(-${(100 - (gesamtNachher / gesamtVorher) * 100).toFixed(0)}%)`
    )
    return
  }

  console.log(
    'Bitte Modus angeben:\n' +
      '  node scripts/komprimiere-rezeptbilder.js bericht        (nur Groessen auflisten)\n' +
      '  node scripts/komprimiere-rezeptbilder.js test           (nur 1 Bild komprimieren, zur Kontrolle)\n' +
      '  node scripts/komprimiere-rezeptbilder.js alle           (alle Bilder im Bucket komprimieren)\n' +
      '  node scripts/komprimiere-rezeptbilder.js lokal <ordner> (lokale PNGs komprimieren und hochladen)'
  )
}

main().catch((fehler) => {
  console.error(fehler)
  process.exit(1)
})
