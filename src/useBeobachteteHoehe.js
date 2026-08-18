import { useLayoutEffect, useRef, useState } from 'react'

// Beobachtet die tatsaechlich gerenderte Hoehe von inhaltRef und liefert sie
// als Zahl (px) zurueck - Basis fuer eine per CSS transition:height sanft
// animierte Wrapper-Hoehe (statt eines Hart-Sprungs), wenn AnimatePresence-
// Geschwister darin mounten/unmounten. Urspruenglich in ZielEinstellungen.jsx
// entwickelt (siehe dortiger ausfuehrlicher Kommentar zur Herleitung/zum
// flow-root-Bugfix), hierher extrahiert, da WizardTageskarte.jsx denselben
// Mechanismus fuer denselben Zweck braucht (dort wachsende/schrumpfende
// Kalorien-/Mahlzeiten-/Diaet-/Makro-Sektionen).
//
// GEFUNDENE URSACHE des urspruenglichen Clipping-Bugs (Eingabefelder am
// Kartenrand abgeschnitten, reproduzierbar in JEDEM Chromium, nicht Safari-
// spezifisch): klassisches CSS-Margin-Collapse. inhaltRef selbst hat kein
// eigenes Padding/Border/overflow - das mt-3 des ERSTEN sichtbaren Kindes
// kollabierte dadurch nach AUSSEN, VOR inhaltRefs eigene Border-Box.
// inhaltRef.scrollHeight/getBoundingClientRect() maass dadurch systematisch
// genau um diesen mt-3-Wert zu wenig - der Wrapper bekam eine zu kleine
// Ziel-Hoehe gesetzt, die letzte Zeile wurde abgeschnitten. Behoben durch
// flow-root auf inhaltRef bei der Verwendungsstelle (siehe dort im JSX) -
// etabliert einen neuen Block-Formatting-Context, der Margin-Collapse
// verhindert, ohne (anders als overflow-hidden) selbst Inhalt abzuschneiden.
//
// Die folgenden DREI unabhaengigen Trigger-Mechanismen bleiben trotzdem
// sinnvoll (sie bestimmen WANN neu gemessen wird, nicht WAS gemessen wird -
// das flow-root-fix behebt die Korrektheit der Messung selbst):
// 1. Ein useLayoutEffect OHNE Dependency-Array (feuert nach JEDEM Render
//    dieser Komponente) misst synchron nach - deckt zuverlaessig das
//    Wachsen ab, da ein neues Feld beim selben Render bereits seine volle
//    (nur noch unsichtbare, opacity:0) Groesse hat.
// 2. Der ResizeObserver bleibt zusaetzlich noetig fuer das Schrumpfen: ein
//    austretendes Element bleibt waehrend seiner eigenen Fade-out-Animation
//    im DOM (siehe AnimatePresence an der jeweiligen Verwendungsstelle) und
//    wird erst DANACH entfernt - ein Zeitpunkt, zu dem diese Komponente
//    selbst NICHT neu rendert (kein Prop hat sich seitdem geaendert),
//    Mechanismus 1 also nichts davon mitbekommt.
// 3. document.fonts.ready erzwingt EINE zusaetzliche Nachmessung, sobald die
//    Webfonts (Fraunces/Inter, per <link> in index.html, ohne preload) fertig
//    geladen sind - der Fallback-Font vor dem Laden ergibt eine andere
//    Zeilenumbruch-Situation als nach dem Swap, siehe Herleitung in der
//    urspruenglichen Fehlersuche (ZielEinstellungen.jsx-Git-Historie).
// Grund fuer diesen Umweg statt framer-motions layout-Prop direkt auf dem
// Wrapper: layout animiert Groessen-Aenderungen, die durch das Unmounten
// eines AnimatePresence-Geschwisters ausgeloest werden, in diesem Setup
// NICHT zuverlaessig (springt statt zu interpolieren - per Screenshot-Serie
// + Hoehen-Messung verifiziert). Die aeussere Hoehen-Transition passiert
// stattdessen als simple CSS transition: height beim jeweiligen Aufrufer.
export function useBeobachteteHoehe() {
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

  useLayoutEffect(() => {
    let abgemeldet = false
    document.fonts.ready.then(() => {
      if (!abgemeldet && inhaltRef.current) {
        setHoehe(inhaltRef.current.getBoundingClientRect().height)
      }
    })
    return () => {
      abgemeldet = true
    }
  }, [])

  return [inhaltRef, hoehe]
}
