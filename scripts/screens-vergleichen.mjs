// Pixelvergleich zweier Screenshot-Ordner aus screens-erfassen.mjs.
//
//   node scripts/screens-vergleichen.mjs <ordnerA> <ordnerB> [--diff-out <ordner>]
//        [--auch <ordnerA2>] [--ignoriere <ordnerA2>]
//
// Ausgabe je Datei: identisch / abweichend (Pixelzahl, groesste Kanal-
// abweichung). --ignoriere: ein zweiter Basislinien-Lauf (A2); Dateien, die
// zwischen A und A2 bereits voneinander abweichen, sind "instabil"
// (z. B. der endlos animierte Startbildschirm) und zaehlen im Vergleich
// A-gegen-B nicht als Fehler. Exit-Code 1, wenn stabile Dateien abweichen
// oder fehlen.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import sharp from 'sharp'

const [ordnerA, ordnerB] = process.argv.slice(2)
const opt = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : null
}
const DIFF_OUT = opt('diff-out')
const IGNORIERE = opt('ignoriere')
const AUCH = opt('auch')
if (!ordnerA || !ordnerB) {
  console.error('Aufruf: node scripts/screens-vergleichen.mjs <ordnerA> <ordnerB> [--diff-out <ordner>] [--ignoriere <ordnerA2>]')
  process.exit(1)
}

function alleDateien(basis, unter = '') {
  const pfad = unter ? `${basis}/${unter}` : basis
  return readdirSync(pfad).flatMap((n) => {
    const rel = unter ? `${unter}/${n}` : n
    return statSync(`${basis}/${rel}`).isDirectory() ? alleDateien(basis, rel) : rel.endsWith('.png') ? [rel] : []
  })
}

async function vergleiche(a, b) {
  const [ba, bb] = [readFileSync(a), readFileSync(b)]
  if (ba.equals(bb)) return { gleich: true }
  const [ia, ib] = await Promise.all([sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true })])
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) {
    return { gleich: false, groesse: `${ia.info.width}x${ia.info.height} vs ${ib.info.width}x${ib.info.height}` }
  }
  let pixel = 0
  let maxDelta = 0
  const diff = Buffer.alloc(ia.data.length)
  for (let i = 0; i < ia.data.length; i += 4) {
    let d = 0
    for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(ia.data[i + k] - ib.data[i + k]))
    if (d > 0) {
      pixel++
      maxDelta = Math.max(maxDelta, d)
      diff[i] = 255
      diff[i + 3] = 255
    } else {
      diff[i] = diff[i + 1] = diff[i + 2] = ia.data[i] >> 2
      diff[i + 3] = 255
    }
  }
  return { gleich: pixel === 0, pixel, maxDelta, diff, info: ia.info }
}

const dateien = alleDateien(ordnerA)
const instabil = new Set()
if (IGNORIERE) {
  for (const f of dateien) {
    if (existsSync(`${IGNORIERE}/${f}`) && !(await vergleiche(`${ordnerA}/${f}`, `${IGNORIERE}/${f}`)).gleich) instabil.add(f)
  }
  console.log(`Instabil (A vs. A2 verschieden, ausgenommen): ${instabil.size}`)
  for (const f of [...instabil].sort()) console.log(`  ~ ${f}`)
}

let identisch = 0
let abweichend = 0
let fehlend = 0
for (const f of dateien.sort()) {
  if (instabil.has(f)) continue
  if (!existsSync(`${ordnerB}/${f}`)) {
    console.log(`FEHLT  ${f}`)
    fehlend++
    continue
  }
  let r = await vergleiche(`${ordnerA}/${f}`, `${ordnerB}/${f}`)
  if (!r.gleich && AUCH && existsSync(`${AUCH}/${f}`)) {
    const r2 = await vergleiche(`${AUCH}/${f}`, `${ordnerB}/${f}`)
    if (r2.gleich) r = r2
  }
  if (r.gleich) {
    identisch++
    continue
  }
  abweichend++
  console.log(`DIFF   ${f}  ${r.groesse ?? `${r.pixel} px, max Kanalabweichung ${r.maxDelta}`}`)
  if (DIFF_OUT && r.diff) {
    const ziel = `${DIFF_OUT}/${f}`
    mkdirSync(ziel.slice(0, ziel.lastIndexOf('/')), { recursive: true })
    await sharp(r.diff, { raw: { width: r.info.width, height: r.info.height, channels: 4 } }).png().toFile(ziel)
  }
}
console.log(`\n${identisch} identisch, ${abweichend} abweichend, ${fehlend} fehlend, ${instabil.size} instabil ausgenommen`)
process.exit(abweichend || fehlend ? 1 : 0)
