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
    <div role="tablist" className="flex gap-0.5 rounded-full bg-text-muted/15 p-1">
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
                className="absolute inset-0 rounded-full bg-card shadow-sm"
              />
            )}
            <span className={`relative z-10 ${aktiv ? 'font-semibold text-text' : 'font-medium text-text-muted'}`}>{label}</span>
          </AnimatedButton>
        )
      })}
    </div>
  )
}

export default SegmentSchalter
