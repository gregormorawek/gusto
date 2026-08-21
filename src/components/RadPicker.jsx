import { useEffect, useRef, useState } from 'react'

// Hoehe einer einzelnen Zahl-Zeile im Rad (px) - bestimmt sowohl das
// CSS-Scroll-Snap-Raster als auch, wie viele Zeilen ueber/unter der Mitte
// sichtbar sind (SICHTBARE_ZEILEN unten).
const ZEILEN_HOEHE_PX = 44
// Ungerade Anzahl, damit exakt eine Zeile in der Mitte des Rads sitzt.
const SICHTBARE_ZEILEN = 5
const RAD_HOEHE_PX = ZEILEN_HOEHE_PX * SICHTBARE_ZEILEN
// Wartezeit nach dem letzten Scroll-Event, bevor der naeheste Wert als
// "gewaehlt" gilt (Debounce) - verhindert, dass waehrend einer schnellen
// Wisch-Geste laufend Zwischenwerte gemeldet werden.
const SETTLE_VERZOEGERUNG_MS = 120

// iOS-Stil Zahlen-Scrollrad, wiederverwendet fuer Alter/Groesse/Gewicht im
// Kalorienrechner (siehe Kalorienrechner.jsx) - EINE parametrisierte
// Komponente statt drei fast identischer Screens. Bewusst OHNE
// Tastatur-Zifferneingabe (vermeidet die App-weit bekannte
// Tastatur-Verschiebungs-Problematik, siehe useTastaturAusgleich.js),
// stattdessen ein scrollbares Zahlenrad per CSS scroll-snap. Reine Zahlen
// ohne Formatierung in der scrollenden Liste, die Einheit steht STATISCH
// daneben (nicht Teil jeder einzelnen Zeile).
//
// Unkontrolliert bzgl. externer wert-Aenderungen (kein "wert"-Prop, nur
// startWert einmalig beim Mount + onAendern nach jeder Auswahl) - konsistent
// mit dem Bottom-Sheet-Muster in KochModus.jsx: jeder Kalorienrechner-Screen
// mountet seinen RadPicker frisch, der Rechner selbst haelt den aktuellen
// Wert im eigenen State (siehe Kalorienrechner.jsx).
//
// scroll-behavior bewusst NICHT per Tailwind-Klasse global auf "smooth"
// gesetzt (haette auch die direkte scrollTop-Zuweisung beim Mount unten
// animiert, siehe dortiger Kommentar) - Smooth/Instant wird stattdessen pro
// Aufruf explizit ueber scrollTo({behavior}) gesteuert.
function RadPicker({ min, max, startWert, einheit, onAendern, reduzierteBewegung, ariaLabel }) {
  const scrollRef = useRef(null)
  const settleTimeoutRef = useRef(null)
  const [wert, setWert] = useState(startWert)

  const werte = []
  for (let w = min; w <= max; w += 1) {
    werte.push(w)
  }

  // Polster oben/unten in Groesse einer halben Rad-Hoehe minus einer halben
  // Zeile - dadurch koennen auch der erste und der letzte Wert exakt in die
  // Mitte gescrollt werden (ohne Polster wuerde der Scrollbereich dort
  // vorzeitig enden, der erste/letzte Wert liesse sich nie zentrieren).
  const polsterPx = (RAD_HOEHE_PX - ZEILEN_HOEHE_PX) / 2

  // Initiale Scroll-Position exakt auf startWert setzen - EINMALIG beim
  // Mount (leeres deps-Array bewusst, siehe Komponenten-Kommentar oben:
  // startWert aendert sich waehrend der Lebensdauer dieser Instanz nicht).
  // Direkte scrollTop-Zuweisung statt scrollTo({behavior:'auto'}) - ohne die
  // globale scroll-smooth-Klasse (siehe oben) ist das ohnehin instantan,
  // hier zusaetzlich robust falls ein Browser scrollTo mit behavior:'auto'
  // dennoch verzoegert verarbeitet.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTop = (startWert - min) * ZEILEN_HOEHE_PX
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => clearTimeout(settleTimeoutRef.current)
  }, [])

  function indexZuWert(index) {
    return Math.min(max, Math.max(min, min + index))
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) {
      return
    }
    clearTimeout(settleTimeoutRef.current)
    settleTimeoutRef.current = setTimeout(() => {
      const index = Math.round(el.scrollTop / ZEILEN_HOEHE_PX)
      const neuerWert = indexZuWert(index)
      // Exakt einrasten - behebt minimale Sub-Pixel-Abweichungen, die reines
      // CSS scroll-snap bei schnellem Wischen gelegentlich stehen laesst.
      el.scrollTo({ top: (neuerWert - min) * ZEILEN_HOEHE_PX, behavior: reduzierteBewegung ? 'auto' : 'smooth' })
      setWert(neuerWert)
      onAendern(neuerWert)
    }, SETTLE_VERZOEGERUNG_MS)
  }

  function scrollZuWert(neuerWert) {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollTo({ top: (neuerWert - min) * ZEILEN_HOEHE_PX, behavior: reduzierteBewegung ? 'auto' : 'smooth' })
    setWert(neuerWert)
    onAendern(neuerWert)
  }

  // Minimale Tastatur-Bedienbarkeit (Pfeiltasten) als niedrigschwelliger
  // A11y-Zusatz - der Rad-Bereich selbst nimmt bewusst KEINE
  // Zahlen-Texteingabe entgegen (siehe Komponenten-Kommentar oben).
  function handleKeyDown(event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      scrollZuWert(Math.min(max, wert + 1))
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      scrollZuWert(Math.max(min, wert - 1))
    }
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative" style={{ height: RAD_HOEHE_PX, width: 96 }}>
        {/* Auswahl-Markierung in der Mitte - pointer-events-none, damit sie
            den Scroll-Bereich darunter nicht blockiert. */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-lg border-y border-primary/40 bg-primary/5"
          style={{ top: polsterPx, height: ZEILEN_HOEHE_PX }}
          aria-hidden="true"
        />

        {/* mask-image blendet die oberen/unteren Randzeilen sanft aus
            (klassischer "Rad"-Look) - sowohl Webkit- als auch
            Standard-Property fuer breitere Browser-Unterstuetzung (analog
            zum bestehenden WebkitBackdropFilter-Muster in KochModus.jsx). */}
        <div
          ref={scrollRef}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
            maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
          }}
        >
          <div style={{ height: polsterPx }} aria-hidden="true" />
          {werte.map((w) => (
            <div
              key={w}
              role="option"
              aria-selected={w === wert}
              className="flex snap-center items-center justify-center tabular-nums"
              style={{ height: ZEILEN_HOEHE_PX }}
            >
              <span className={w === wert ? 'text-2xl font-semibold text-text' : 'text-lg text-text-muted'}>{w}</span>
            </div>
          ))}
          <div style={{ height: polsterPx }} aria-hidden="true" />
        </div>
      </div>

      <span className="text-sm font-medium text-text-muted">{einheit}</span>
    </div>
  )
}

export default RadPicker
