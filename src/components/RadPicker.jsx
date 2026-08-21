import { useCallback, useEffect, useRef, useState } from 'react'

// Hoehe einer einzelnen Zahl-Zeile im Rad (px) - bestimmt sowohl das
// CSS-Scroll-Snap-Raster als auch, wie viele Zeilen ueber/unter der Mitte
// sichtbar sind (SICHTBARE_ZEILEN unten).
const ZEILEN_HOEHE_PX = 44
// Ungerade Anzahl, damit exakt eine Zeile in der Mitte des Rads sitzt.
const SICHTBARE_ZEILEN = 5
const RAD_HOEHE_PX = ZEILEN_HOEHE_PX * SICHTBARE_ZEILEN
// Wartezeit nach dem letzten Scroll-Event, bevor der naeheste Wert als
// "gewaehlt" gilt (Debounce) - verhindert, dass waehrend einer schnellen
// Wisch-Geste laufend Zwischenwerte gemeldet werden. UNVERAENDERT gegenueber
// der flachen Vorgaenger-Version - die 3D-Optik unten aendert NUR die
// visuelle Darstellung, nicht diese Auswahl-/Commit-Logik.
const SETTLE_VERZOEGERUNG_MS = 120

// Wie viele Zeilen ueber/unter der aktuellen (fraktionalen) Bildlaufmitte
// bei jedem Scroll-Frame noch per DOM-Ref neu transformiert werden -
// groesser als SICHTBARE_ZEILEN, damit bei sehr schnellen Wisch-Gesten
// (Momentum-Scroll kann zwischen zwei Frames mehrere Zeilen ueberspringen)
// kein "Loch" aus noch nicht aktualisierten, aber kurz sichtbaren Zeilen
// entsteht. Jenseits davon bleiben Zeilen an ihrem zuletzt berechneten
// (praktisch unsichtbaren) Zustand haengen - faellt dank Deckkraft nahe 0 +
// Mask-Fade (siehe Rendering unten) nicht auf.
const TRANSFORM_FENSTER_ZEILEN = 6
// Ab wie vielen Zeilen Abstand von der Mitte Kippung/Skalierung/Deckkraft
// ihr Maximum erreichen (weiter entfernte Zeilen werden darauf geklemmt).
const MAX_OFFSET_ZEILEN = 3
// CSS-perspective auf dem Rad-Container (px) - je kleiner, desto staerker
// die Fisheye-/Trommel-Verzerrung. 480px liefert bei ZEILEN_HOEHE_PX=44 und
// MAX_OFFSET_ZEILEN=3 (= 132px maximaler Versatz von der Mitte) eine
// deutliche, aber noch nicht comichaft uebertriebene Kippung (per
// Screenshot-Vergleich mehrerer Werte gegengeprueft).
const PERSPEKTIVE_PX = 480

// Kippwinkel/Skalierung/Deckkraft pro Zeile - bei aktiver reduzierter
// Bewegung deutlich gedaempfter (weniger extreme Kippung/Skalierung), damit
// sich das Rad waehrend des Scrollens ruhiger anfuehlt, OHNE die 3D-Optik
// selbst abzuschalten (Aufgabenstellung: "die 3D-Optik selbst darf bleiben,
// nur keine unruhige Momentum-Animation" - das eigentliche Schnappen/Snappen
// bleibt ohnehin schon ueber reduzierteBewegung -> behavior:'auto' statt
// 'smooth' bei scrollTo entschaerft, siehe scrollZuWert/handleScroll unten).
function anzeigeWerteFuer(reduzierteBewegung) {
  return reduzierteBewegung
    ? { winkelProZeileGrad: 10, skalierungMin: 0.82, deckkraftMin: 0.4 }
    : { winkelProZeileGrad: 20, skalierungMin: 0.62, deckkraftMin: 0.12 }
}

// Reine Rechenfunktion (kein React-State): liefert rotateX/scale/opacity
// fuer EINE Zeile anhand ihres (moeglicherweise fraktionalen) Abstands von
// der Bildlaufmitte in Zeilen-Einheiten. offsetRows < 0 = Zeile liegt UEBER
// der Mitte, > 0 = darunter. Negatives Vorzeichen bei winkelGrad: Zeilen
// ueber der Mitte sollen wie die Innenseite einer Trommel nach HINTEN/OBEN
// wegkippen (rotateX positiv kippt per CSS-Definition die OBERE Kante vom
// Betrachter weg) - also braucht eine Zeile ueber der Mitte (offsetRows
// negativ) einen POSITIVEN Winkel, eine Zeile darunter einen NEGATIVEN -
// exakt was "-offsetRows * Grad-pro-Zeile" liefert.
function trommelStilFuerOffset(offsetRows, anzeigeWerte) {
  const geklemmt = Math.max(-MAX_OFFSET_ZEILEN, Math.min(MAX_OFFSET_ZEILEN, offsetRows))
  const t = Math.abs(geklemmt) / MAX_OFFSET_ZEILEN
  const winkelGrad = -geklemmt * anzeigeWerte.winkelProZeileGrad
  const skala = 1 - t * (1 - anzeigeWerte.skalierungMin)
  const deckkraft = 1 - t * (1 - anzeigeWerte.deckkraftMin)
  return { transform: `rotateX(${winkelGrad.toFixed(2)}deg) scale(${skala.toFixed(3)})`, opacity: deckkraft.toFixed(3) }
}

// iOS-Stil 3D-Trommel-Zahlenrad, wiederverwendet fuer Alter/Groesse/Gewicht
// im Kalorienrechner (siehe Kalorienrechner.jsx) - EINE parametrisierte
// Komponente statt drei fast identischer Screens. Bewusst OHNE
// Tastatur-Zifferneingabe (vermeidet die App-weit bekannte
// Tastatur-Verschiebungs-Problematik, siehe useTastaturAusgleich.js).
//
// Auswahl-/Commit-Logik (Scroll-Snap, Settle-Debounce, onAendern-Timing,
// Pfeiltasten) ist GEGENUEBER der vorherigen flachen Version UNVERAENDERT -
// siehe jeweilige Kommentare unten. Neu ist NUR die visuelle 3D-Schicht:
// jede Zeile bekommt per rotateX/scale/opacity (trommelStilFuerOffset oben)
// eine ihrem Abstand von der Mitte entsprechende Kippung/Verkleinerung/
// Abblendung, auf dem umschliessenden Rad-Container sitzt eine CSS-
// perspective. Diese 3D-Werte werden NICHT ueber React-State/-Re-render
// gesetzt (waere bei bis zu 60 Updates/Sekunde waehrend des Scrollens ein
// Performance-Risiko und wuerde ausserdem bei jedem Re-render - z. B. wenn
// "wert" beim Settle wechselt - die per Scroll-Event zuletzt gesetzten
// Inline-Styles wieder ueberschreiben), sondern IMPERATIV per DOM-Ref direkt
// auf die Elemente geschrieben (aktualisiereTransforms unten) - GPU-
// freundlich (nur transform/opacity/color, keine Layout-aendernden
// Eigenschaften), rAF-gebuendelt gegen mehrfache Ausfuehrung pro Frame.
// Genau DESHALB tragen die Zahlen-<span>s unten bewusst KEIN style-Prop von
// React aus - React wuerde ein reconciliertes style-Attribut sonst bei
// jedem Re-render auf den JSX-Wert zuruecksetzen und die imperativen
// Scroll-Updates dadurch "wegradieren".
function RadPicker({ min, max, startWert, einheit, onAendern, reduzierteBewegung, ariaLabel }) {
  const scrollRef = useRef(null)
  const settleTimeoutRef = useRef(null)
  const rafRef = useRef(null)
  const itemRefs = useRef([])
  // Sentinel -1 (KEIN gueltiger Index) statt z. B. startWert-min - GEFUNDENE
  // URSACHE eines Bugs, bei dem die Terracotta-Hervorhebung der Mitte beim
  // allerersten Aufruf von aktualisiereTransforms() ausblieb: waere dieser
  // Ref direkt mit dem Start-Index vorinitialisiert, wuerde der dortige
  // "hat sich der zentrierte Index geaendert"-Vergleich beim ersten Aufruf
  // (der ja GENAU wieder den Start-Index berechnet) faelschlich false
  // ergeben - die Hervorhebung wuerde uebersprungen, bis der User tatsaechlich
  // einmal einen anderen Wert zentriert. -1 kann nie ein echter Index sein,
  // garantiert dadurch, dass der erste Aufruf IMMER als "geaendert" zaehlt.
  const zentrierterIndexRef = useRef(-1)
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

  // Setzt Transform/Deckkraft/Hervorhebung fuer alle Zeilen im Fenster um
  // die aktuelle (fraktionale) Bildlaufposition - siehe Komponenten-
  // Kommentar oben zur Begruendung der imperativen DOM-Mutation statt
  // React-State. scrollTopWert kommt entweder live vom scroll-Event (echtes
  // Scrollen/Momentum/Pfeiltasten-scrollTo) oder wird beim Mount einmalig
  // synchron mit dem initialen scrollTop aufgerufen.
  const aktualisiereTransforms = useCallback(
    (scrollTopWert) => {
      const anzeigeWerte = anzeigeWerteFuer(reduzierteBewegung)
      const mitteIndexFraktional = scrollTopWert / ZEILEN_HOEHE_PX
      const zentrierterIndex = Math.round(mitteIndexFraktional)
      const startIndex = Math.max(0, zentrierterIndex - TRANSFORM_FENSTER_ZEILEN)
      const endIndex = Math.min(werte.length - 1, zentrierterIndex + TRANSFORM_FENSTER_ZEILEN)

      for (let i = startIndex; i <= endIndex; i += 1) {
        const el = itemRefs.current[i]
        if (!el) {
          continue
        }
        const stil = trommelStilFuerOffset(i - mitteIndexFraktional, anzeigeWerte)
        el.style.transform = stil.transform
        el.style.opacity = stil.opacity
      }

      // Terracotta+halbfett nur fuer GENAU die aktuell zentrierte Zeile -
      // aendert sich in Echtzeit waehrend des Scrollens (nicht erst beim
      // Settle), fuer den authentischen "was gerade vorne steht ist
      // hervorgehoben"-Trommel-Eindruck. Bewusst getrennt von der
      // Settle-/onAendern-Logik in handleScroll unten: DIESE Hervorhebung
      // ist rein visuell, die tatsaechliche Werte-Auswahl (aria-selected,
      // onAendern) bleibt unveraendert an den gedebounceten "wert"-State
      // gekoppelt.
      if (zentrierterIndex !== zentrierterIndexRef.current) {
        const altesEl = itemRefs.current[zentrierterIndexRef.current]
        if (altesEl) {
          altesEl.style.color = 'var(--color-text-muted)'
          altesEl.style.fontWeight = '400'
        }
        const neuesEl = itemRefs.current[zentrierterIndex]
        if (neuesEl) {
          neuesEl.style.color = 'var(--color-primary)'
          neuesEl.style.fontWeight = '600'
        }
        zentrierterIndexRef.current = zentrierterIndex
      }
    },
    [reduzierteBewegung, werte.length],
  )

  // Initiale Scroll-Position exakt auf startWert setzen - EINMALIG beim
  // Mount (leeres deps-Array bewusst, siehe Komponenten-Kommentar oben:
  // startWert aendert sich waehrend der Lebensdauer dieser Instanz nicht).
  // Direkte scrollTop-Zuweisung statt scrollTo({behavior:'auto'}) - ohne
  // eine globale scroll-smooth-Klasse ist das ohnehin instantan. Direkt im
  // Anschluss synchron aktualisiereTransforms(...) - sonst wuerden alle
  // Zeilen bis zum naechsten (asynchronen) scroll-Event flach/ungekippt
  // erscheinen.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const initialerScrollTop = (startWert - min) * ZEILEN_HOEHE_PX
    el.scrollTop = initialerScrollTop
    aktualisiereTransforms(initialerScrollTop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(settleTimeoutRef.current)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  function indexZuWert(index) {
    return Math.min(max, Math.max(min, min + index))
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) {
      return
    }

    // Visuelle 3D-Transforms: pro Frame per requestAnimationFrame gebuendelt
    // - mehrere schnell aufeinanderfolgende scroll-Events (auf manchen
    // Geraeten deutlich mehr als 60/Sekunde) duerfen nur EINE Neuberechnung
    // pro tatsaechlich gerenderten Frame ausloesen.
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (scrollRef.current) {
          aktualisiereTransforms(scrollRef.current.scrollTop)
        }
      })
    }

    // Werte-Auswahl - UNVERAENDERT gegenueber der vorherigen flachen
    // Version: Debounce entscheidet, welcher Wert nach Scroll-Ende als
    // "gewaehlt" gilt, rastet exakt ein und meldet ihn per onAendern.
    clearTimeout(settleTimeoutRef.current)
    settleTimeoutRef.current = setTimeout(() => {
      const index = Math.round(el.scrollTop / ZEILEN_HOEHE_PX)
      const neuerWert = indexZuWert(index)
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
    <div className="relative flex items-center justify-center gap-3" style={{ height: RAD_HOEHE_PX }}>
      {/* Auswahl-Markierung spannt die GESAMTE Zeile (Zahlenrad + Einheit),
          nicht nur die Zahlenspalte - dadurch liegt die Einheit sichtbar
          "in" der hervorgehobenen Zeile, wie bei einem nativen iOS-Picker.
          top/height exakt deckungsgleich mit der mittleren Zeile im
          Scroll-Bereich (polsterPx/ZEILEN_HOEHE_PX, siehe oben) - beide
          Container teilen sich dieselbe RAD_HOEHE_PX und damit dieselbe
          vertikale Mitte, die Positionierung stimmt daher ohne
          zusaetzlichen Versatz. pointer-events-none, damit sie den
          Scroll-Bereich darunter nicht blockiert. */}
      <div
        className="pointer-events-none absolute inset-x-0 rounded-lg border-y border-primary/30 bg-primary/5"
        style={{ top: polsterPx, height: ZEILEN_HOEHE_PX }}
        aria-hidden="true"
      />

      {/* perspective HIER (Rad-Container, Vorfahre der rotateX-
          transformierten Zahlen-<span>s unten) - CSS-perspective wirkt nur
          auf Nachfahren, nicht auf das Element selbst, muss also eine Ebene
          oberhalb der eigentlichen 3D-Transforms sitzen. */}
      <div className="relative" style={{ height: RAD_HOEHE_PX, width: 104, perspective: PERSPEKTIVE_PX }}>
        {/* mask-image blendet die oberen/unteren Randzeilen weich zur
            Hintergrundfarbe aus (Aufgabenstellung) - fadet zu TRANSPARENT
            statt eine Hintergrundfarbe hart zu ueberlagern, was sich
            automatisch mit dem dahinterliegenden Screen-Hintergrund
            (bg-bg/#F7F1E6) deckt, ohne die Farbe hier zu haerten. Sowohl
            Webkit- als auch Standard-Property fuer breitere
            Browser-Unterstuetzung (analog zum bestehenden
            WebkitBackdropFilter-Muster in KochModus.jsx). */}
        <div
          ref={scrollRef}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)',
            maskImage: 'linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)',
          }}
        >
          <div style={{ height: polsterPx }} aria-hidden="true" />
          {werte.map((w, i) => (
            // AEUSSERES Element (Snap-Ziel, role="option") bewusst OHNE
            // eigenen Transform - CSS scroll-snap berechnet Snap-Positionen
            // aus der LAYOUT-Box des Snap-Ziels; ein rotateX/scale direkt
            // hier koennte auf manchen Browsern die wahrgenommene Snap-
            // Geometrie vom tatsaechlichen Layout entkoppeln. Die 3D-Kippung
            // sitzt stattdessen auf dem INNEREN <span> - rein kosmetisch,
            // ohne Einfluss auf Scroll-/Snap-Berechnung.
            <div
              key={w}
              role="option"
              aria-selected={w === wert}
              className="flex snap-center items-center justify-center tabular-nums"
              style={{ height: ZEILEN_HOEHE_PX }}
            >
              {/* ref (und damit das imperative Transform-Ziel) sitzt HIER auf
                  dem INNEREN <span>, NICHT auf dem aeusseren role="option"-Div
                  - siehe Kommentar am map()-Aufruf oben zur Begruendung.
                  Bewusst OHNE style-Prop von React aus - siehe ausfuehrlicher
                  Komponenten-Kommentar oben zur Begruendung (imperative
                  DOM-Mutation wuerde sonst bei jedem Re-render ueberschrieben).
                  text-muted als CSS-Ausgangszustand (bevor der Mount-Effekt
                  synchron die korrekte Trommel-Pose inkl. Hervorhebung der
                  Mitte setzt) - font-display (Fraunces) fuer alle Zeilen
                  einheitlich, wie im Marken-Vertrag fuer Zahlen vorgesehen. */}
              <span
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                className="font-display text-2xl text-text-muted"
              >
                {w}
              </span>
            </div>
          ))}
          <div style={{ height: polsterPx }} aria-hidden="true" />
        </div>
      </div>

      <span className="relative text-sm font-medium text-text-muted">{einheit}</span>
    </div>
  )
}

export default RadPicker
