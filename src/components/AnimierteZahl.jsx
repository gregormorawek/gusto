import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

// Zeigt eine Ganzzahl an, die sich beim ersten Erscheinen von 0 auf "wert"
// hochzaehlt und bei spaeteren Aenderungen smooth vom zuletzt angezeigten
// Wert zum neuen "wert" zaehlt (statt hart zu springen). anzeigeRef haelt
// den ZWISCHENSTAND der laufenden Animation fest (nicht nur den Zielwert),
// damit ein erneuter Wertwechsel WAEHREND einer laufenden Animation sauber
// vom aktuell sichtbaren Wert aus weiterzaehlt statt neu anzusetzen. Ruft
// useReducedMotion() selbst auf (statt es als Prop zu verlangen) - bei
// aktiver reduzierter Bewegung springt die Zahl direkt zum Zielwert.
function AnimierteZahl({ wert, className }) {
  const reduzierteBewegung = useReducedMotion()
  const [anzeige, setAnzeige] = useState(0)
  const anzeigeRef = useRef(0)

  useEffect(() => {
    if (reduzierteBewegung) {
      anzeigeRef.current = wert
      setAnzeige(wert)
      return
    }
    if (anzeigeRef.current === wert) {
      return
    }
    const controls = animate(anzeigeRef.current, wert, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (zwischenwert) => {
        anzeigeRef.current = zwischenwert
        setAnzeige(Math.round(zwischenwert))
      },
    })
    return () => controls.stop()
  }, [wert, reduzierteBewegung])

  return <span className={className}>{anzeige}</span>
}

export default AnimierteZahl
