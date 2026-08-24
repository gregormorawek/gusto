import { useEffect } from 'react'

// Wie viel Platz unterhalb des fokussierten Feldes mindestens sichtbar
// bleiben soll, bevor wir es als "von der Tastatur verdeckt" werten.
const TASTATUR_PUFFER_PX = 16

const TEXT_INPUT_TYPEN_AUSSCHLUSS = new Set(['button', 'submit', 'checkbox', 'radio', 'range', 'color', 'file', 'reset'])

function istTextEingabe(element) {
  if (!(element instanceof HTMLElement)) return false
  if (element.tagName === 'TEXTAREA') return true
  if (element.tagName !== 'INPUT') return false
  return !TEXT_INPUT_TYPEN_AUSSCHLUSS.has(element.type)
}

// Naechster tatsaechlich scrollender Vorfahre ab (aber exklusive) element -
// i. d. R. der Body/document.scrollingElement, aber z. B. innerhalb von
// KochModus (eigener overflow-y-auto-Inhaltsbereich) oder dem "Kalorienziel
// neu berechnen?"-Dialog in EinstellungenAnsicht.jsx (Modal mit eigenem
// overflow-y-auto) ist es ein anderes Element. Ohne diese
// Suche wuerde ein pauschales window.scrollBy() in einem fixed positionierten
// Sheet/Modal schlicht nichts bewirken.
function naechsterScrollContainer(element) {
  let aktuell = element.parentElement
  while (aktuell) {
    const stil = getComputedStyle(aktuell)
    if ((stil.overflowY === 'auto' || stil.overflowY === 'scroll') && aktuell.scrollHeight > aktuell.clientHeight) {
      return aktuell
    }
    aktuell = aktuell.parentElement
  }
  return document.scrollingElement ?? document.documentElement
}

// Backstop fuers Fokussieren von Eingabefeldern, wenn die Tastatur einen
// Teil des Bildschirms einnimmt - siehe Aufgabenstellung "Ruckartige
// Tastatur-Verschiebung". Bewusst NUR ein BACKSTOP, kein Ersatz fuer das
// bestehende interactive-widget=resizes-content aus index.html (das bleibt
// unveraendert, siehe dortiger Kommentar zur historischen Statusleisten-
// Ueberschiess-Regression): dieser Hook greift NUR ein, wenn das fokussierte
// Feld NACH dem nativen Reflow/Scroll noch tatsaechlich verdeckt ist, und
// gleicht dann gezielt NUR die restliche Ueberdeckung aus (per Visual
// Viewport API gemessen) statt die Kontrolle komplett zu uebernehmen -
// dadurch keine doppelte/konkurrierende Bewegung mit dem nativen Verhalten,
// sondern hoechstens eine kleine, sanfte Korrektur obendrauf.
export function useTastaturAusgleich() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined

    function ausgleichen() {
      const aktiv = document.activeElement
      if (!istTextEingabe(aktiv)) return

      const rect = aktiv.getBoundingClientRect()
      const sichtbarUnten = viewport.height + viewport.offsetTop
      const ueberdeckung = rect.bottom + TASTATUR_PUFFER_PX - sichtbarUnten
      if (ueberdeckung <= 0) return

      const reduzierteBewegung = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      naechsterScrollContainer(aktiv).scrollBy({ top: ueberdeckung, behavior: reduzierteBewegung ? 'auto' : 'smooth' })
    }

    // rAF statt sofort: direkt bei focusin sind getBoundingClientRect()/
    // visualViewport-Werte auf iOS oft noch die ALTEN (Tastatur-Animation
    // hat gerade erst begonnen) - ein Frame Verzoegerung reicht fuer
    // verlaessliche Werte.
    function verzoegertAusgleichen() {
      requestAnimationFrame(ausgleichen)
    }

    viewport.addEventListener('resize', ausgleichen)
    document.addEventListener('focusin', verzoegertAusgleichen)
    return () => {
      viewport.removeEventListener('resize', ausgleichen)
      document.removeEventListener('focusin', verzoegertAusgleichen)
    }
  }, [])
}
