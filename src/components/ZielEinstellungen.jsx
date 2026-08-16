import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconBan, IconCalendar, IconClock } from '@tabler/icons-react'
import AuswahlChip from './AuswahlChip'
import { HOEHEN_UEBERGANG_EASING, HOEHEN_UEBERGANG_MS, motionPropsFuer } from '../motionConfig'

// Beobachtet die tatsaechlich gerenderte Hoehe von inhaltRef und liefert sie
// als Zahl (px) zurueck - ueber ZWEI unabhaengige Mechanismen, die sich
// ergaenzen (auf echtem iOS Safari wurde beobachtet, dass sich NUR auf den
// ResizeObserver zu verlassen zu einer zu klein gemessenen Hoehe fuehren
// kann, sodass das letzte Eingabefeld am Kartenrand abgeschnitten wird -
// vermutlich ein Browser-spezifischer Timing-Unterschied dabei, WANN genau
// der Observer nach dem Mounten eines neuen Feldes feuert):
// 1. Ein useLayoutEffect OHNE Dependency-Array (feuert nach JEDEM Render
//    dieser Komponente) misst synchron nach - deckt zuverlaessig das
//    Wachsen ab, da ein neues Feld beim selben Render bereits seine volle
//    (nur noch unsichtbare, opacity:0) Groesse hat.
// 2. Der ResizeObserver bleibt zusaetzlich noetig fuer das Schrumpfen: ein
//    austretendes Element bleibt waehrend seiner eigenen Fade-out-Animation
//    im DOM (siehe fadeProps/AnimatePresence unten) und wird erst DANACH
//    entfernt - ein Zeitpunkt, zu dem diese Komponente selbst NICHT neu
//    rendert (kein Prop hat sich seitdem geaendert), Mechanismus 1 also
//    nichts davon mitbekommt.
// Grund fuer diesen Umweg statt framer-motions layout-Prop direkt auf dem
// Wrapper: layout animiert Groessen-Aenderungen, die durch das Unmounten
// eines AnimatePresence-Geschwisters ausgeloest werden, in diesem Setup
// NICHT zuverlaessig (springt statt zu interpolieren - per Screenshot-Serie
// + Hoehen-Messung verifiziert). Die aeussere Hoehen-Transition passiert
// stattdessen als simple CSS transition: height auf dem Aufrufer, siehe
// unten.
function useBeobachteteHoehe() {
  const inhaltRef = useRef(null)
  const [hoehe, setHoehe] = useState(undefined)

  // Bewusst OHNE Dependency-Array (soll nach jedem Render feuern) - kein
  // Endlos-Loop-Risiko: setHoehe mit demselben Wert wie zuvor loest KEINEN
  // erneuten Render aus (React vergleicht Primitives per Object.is), die
  // gemessene Hoehe von inhaltRef ist zudem unabhaengig von der Hoehe, die
  // der AUFRUFER (der Wrapper mit transition: height) gerade selbst hat.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (inhaltRef.current) {
      setHoehe(inhaltRef.current.getBoundingClientRect().height)
    }
  })

  useLayoutEffect(() => {
    const element = inhaltRef.current
    if (!element) {
      return undefined
    }
    const beobachter = new ResizeObserver(([eintrag]) => setHoehe(eintrag.contentRect.height))
    beobachter.observe(element)
    return () => beobachter.disconnect()
  }, [])

  return [inhaltRef, hoehe]
}

// Die drei moeglichen Ziel-Typen. "kein" ist der Standard (kein Kalorienziel
// aktiv), bei den anderen beiden gibt der User zusaetzlich eine Kalorienzahl
// im Zahlenfeld ein.
const ZIEL_OPTIONEN = [
  { typ: 'kein', label: 'Kein Ziel', Icon: IconBan },
  { typ: 'proMahlzeit', label: 'Pro Mahlzeit', Icon: IconClock },
  { typ: 'proTag', label: 'Pro Tag', Icon: IconCalendar },
]

// Bei "Pro Tag" zusaetzlich zeigbares Makro-Gesamtziel fuer den ganzen Tag
// (Protein/Carbs/Fett in Gramm). Wird intern auf die vier Mahlzeiten
// aufgeteilt - siehe makroZielFuerMahlzeitAusTagesziel in App.jsx.
const MAKRO_FELDER = [
  { kategorie: 'protein', label: 'Protein' },
  { kategorie: 'carbs', label: 'Carbs' },
  { kategorie: 'fett', label: 'Fett' },
]

// Zeigt die Ziel-Typ-Auswahl (Radio, Single-Select), zwei Zahlenfelder fuer
// das Kalorienfenster (Min/Max, falls ein Ziel aktiv ist) und - nur bei
// "Pro Tag" - ein Makro-Gesamtziel fuer den ganzen Tag. ziel ist { typ,
// kalorien: { min, max }, makro: { protein, carbs, fett } }. onTypAendern
// wird mit dem neuen Typ aufgerufen, onKalorienAendern mit ('min'|'max', wert)
// (Signatur analog zu onMakroAendern), onMakroAendern mit (kategorie, wert).
// Fade-Props fuer die beiden waechst-/schrumpft-Bloecke (Min/Max-Kalorien,
// Makro-Ziele): animate verzoegert den Fade-in um 100ms, damit die
// Hoehen-Animation des wachsenden Bereichs (siehe useBeobachteteHoehe oben)
// sichtbar VOR dem Inhalt startet ("Bewegung fuehrt, Inhalt folgt"). exit
// hat bewusst KEINE Verzoegerung, aber eine ruhigere 200ms-Dauer (statt
// hektischer 150ms) - AnimatePresence haelt das austretende Element ohnehin
// bis zum Ende seiner Exit-Animation im normalen Fluss, die Card schrumpft
// also erst NACH dem Fade-out (Standardverhalten, kein popLayout noetig).
// Bei reduzierter Bewegung entfernt motionPropsFuer diese Transitions
// komplett zugunsten eines einheitlichen 150ms-Fades ohne Verzoegerung
// (siehe motionConfig.js) - dieselbe Konvention wie ueberall sonst in der App.
function fadeProps(reduzierteBewegung) {
  return motionPropsFuer(reduzierteBewegung, {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25, delay: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  })
}

function ZielEinstellungen({ ziel, onTypAendern, onKalorienAendern, onMakroAendern }) {
  const reduzierteBewegung = useReducedMotion()
  const [inhaltRef, hoehe] = useBeobachteteHoehe()

  return (
    <section className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Kalorienziel</h2>

      <div className="mt-2 flex flex-wrap gap-2">
        {ZIEL_OPTIONEN.map(({ typ, label, Icon }) => (
          <AuswahlChip
            key={typ}
            Icon={Icon}
            label={label}
            aktiv={ziel.typ === typ}
            input={{ type: 'radio', name: 'ziel-typ', checked: ziel.typ === typ, onChange: () => onTypAendern(typ) }}
          />
        ))}
      </div>

      {/* Hoehe dieses Wrappers folgt per CSS transition der per ResizeObserver
          beobachteten Hoehe von inhaltRef (siehe useBeobachteteHoehe oben) -
          NICHT framer-motions layout-Prop, das war hier unzuverlaessig. Die
          Chip-Reihe ist ein Geschwister-Element DAVOR und bleibt dadurch
          komplett unbeteiligt an der Groessen-Animation. */}
      <div
        className="overflow-hidden transition-[height] motion-reduce:transition-none"
        style={{ height: hoehe, transitionDuration: `${HOEHEN_UEBERGANG_MS}ms`, transitionTimingFunction: HOEHEN_UEBERGANG_EASING }}
      >
        <div ref={inhaltRef}>
          <AnimatePresence>
            {ziel.typ !== 'kein' && (
              <motion.div
                key="kalorien-eingabe"
                {...fadeProps(reduzierteBewegung)}
                className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <label className="flex items-center gap-1.5 text-sm text-text-muted">
                  Min:
                  <input
                    type="number"
                    min="0"
                    value={ziel.kalorien.min}
                    onChange={(e) => onKalorienAendern('min', e.target.value)}
                    placeholder={ziel.typ === 'proTag' ? 'z. B. 1800' : 'z. B. 500'}
                    className="w-24 rounded-md border border-text-muted/30 px-2 py-1 text-text"
                  />
                  kcal
                </label>
                <label className="flex items-center gap-1.5 text-sm text-text-muted">
                  Max:
                  <input
                    type="number"
                    min="0"
                    value={ziel.kalorien.max}
                    onChange={(e) => onKalorienAendern('max', e.target.value)}
                    placeholder={ziel.typ === 'proTag' ? 'z. B. 2200' : 'z. B. 700'}
                    className="w-24 rounded-md border border-text-muted/30 px-2 py-1 text-text"
                  />
                  kcal
                </label>
                <span className="text-sm text-text-muted">{ziel.typ === 'proMahlzeit' ? 'pro Mahlzeit' : 'pro Tag'}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ziel.typ === 'proTag' && (
              <motion.div key="makro-eingabe" {...fadeProps(reduzierteBewegung)} className="mt-3">
                <p className="text-xs text-text-muted">Makro-Gesamtziel für den Tag (optional):</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
                  {MAKRO_FELDER.map(({ kategorie, label }) => (
                    <label key={kategorie} className="flex items-center gap-1.5 text-xs text-text-muted">
                      {label}:
                      <input
                        type="number"
                        min="0"
                        value={ziel.makro[kategorie]}
                        onChange={(e) => onMakroAendern(kategorie, e.target.value)}
                        placeholder="–"
                        className="w-16 rounded-md border border-text-muted/30 px-1.5 py-1 text-text"
                      />
                      g
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

export default ZielEinstellungen
