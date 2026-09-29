import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import AnimatedButton from './AnimatedButton'
import { SPRING_REVEAL } from '../motionConfig'

// Generischer iOS-Segment-Schalter: gedaempfte Tan-Leiste (bg-text-muted/15,
// kein neuer Farbwert), aktives Segment als eigene, per layoutId GLEITENDE
// weisse Flaeche mit feinem Schatten (Karten-Weiss, wie in der App sonst
// auch fuer "ausgewaehlt/oben" verwendet). Rein textbasiert, bewusst OHNE
// Icons - bei bis zu vier Segmenten auf 375px Breite wuerden Icons+Text zu
// eng, ausserdem sind native iOS-Segment-Schalter selbst ueberwiegend
// reiner Text (siehe Auftrag).
//
// useId() statt eines festen layoutId-Strings: der Schalter wird an ZWEI
// Stellen gleichzeitig sichtbar verwendet (Mahlzeit-Wechsel in der
// Kopfzeile UND Geschmack-Auswahl im offenen FilterSheet) - ohne pro Instanz
// eindeutige layoutId wuerde framer-motion die weisse Flaeche faelschlich
// ZWISCHEN beiden Schaltern hin- und hergleiten lassen, sobald beide
// gleichzeitig gemountet sind.
function SegmentSchalter({ optionen, aktuell, onAendern }) {
  const instanzId = useId()
  const reduzierteBewegung = useReducedMotion()

  return (
    <div role="tablist" className="flex gap-0.5 rounded-full bg-surface p-1">
      {optionen.map(({ slug, label }) => {
        const aktiv = slug === aktuell
        return (
          <AnimatedButton
            key={slug || 'leer'}
            type="button"
            role="tab"
            aria-selected={aktiv}
            onClick={() => onAendern(slug)}
            className="relative flex-1 rounded-full px-2 py-1.5 text-sm"
          >
            {aktiv && (
              <motion.span
                layoutId={`${instanzId}-aktiv`}
                transition={reduzierteBewegung ? { duration: 0.15 } : SPRING_REVEAL}
                className="absolute inset-0 rounded-full bg-surface-raised shadow-sm"
              />
            )}
            {/* Inaktives Label: text-text/75 statt text-text-muted
                (Kontrastanhebung 29.09.2026). text-muted auf der eigenen,
                15% getoenten Leiste (bg-surface) kam nur auf 3,65:1 - und das
                laesst sich NICHT durch Nachjustieren der Tin-Staerke beheben:
                da Vordergrund UND Hintergrund aus demselben Tan-Ton gemischt
                sind, sinkt der Kontrast bei staerkerer Toenung (mehr Tan im
                Hintergrund) sogar noch WEITER, statt zu steigen - 15% ist
                schon nahe am kontrastreichsten Punkt dieser Kombination.
                text-text/75 (gedimmtes Espresso statt gedimmtes Tan) kommt
                auf 4,58:1 und folgt damit demselben Muster wie iOS' eigene
                sekundaere Label-Farben (Opazitaets- statt Farbtonabstufung
                von der Vordergrundfarbe). Sichtbar dunkler als vorher -
                bewusst, das IST die Kontrastkorrektur an dieser Stelle. NUR
                im Hellen: die dunkle Fassung war mit 5,39:1 (text-muted auf
                der blickdichten dunklen Flaeche) bereits ausreichend - dort
                per dark:text-text-muted bewusst beim bisherigen Ton belassen,
                damit sich am Dark Mode nichts aendert. */}
            <span className={`relative z-10 ${aktiv ? 'font-semibold text-text' : 'font-medium text-text/75 dark:text-text-muted'}`}>{label}</span>
          </AnimatedButton>
        )
      })}
    </div>
  )
}

export default SegmentSchalter
