import { useCallback, useLayoutEffect, useState } from 'react'

// Beobachtet die tatsaechlich gerenderte Hoehe des zurueckgegebenen Elements
// und liefert sie als Zahl (px) zurueck - Basis fuer eine per CSS
// transition:height sanft animierte Wrapper-Hoehe (statt eines Hart-
// Sprungs), wenn AnimatePresence-Geschwister DARIN mounten/unmounten.
// Urspruenglich in ZielEinstellungen.jsx entwickelt (siehe dortiger
// ausfuehrlicher Kommentar zur Herleitung/zum flow-root-Bugfix).
//
// WICHTIG - nur fuer Inhalt geeignet, der INNERHALB eines bereits stabil
// gemounteten Wrappers waechst/schrumpft (z. B. WizardTageskarte.jsx: die
// Karte selbst bleibt beim Schritt-Wechsel bestehen, nur ihre Sektionen
// kommen/gehen). NICHT geeignet fuer einen Wrapper, dessen INHALT selbst per
// AnimatePresence-Crossfade komplett ausgetauscht wird (z. B. der Frage-
// Bereich in OnboardingWizard.jsx) - dort erledigt der CSS-Grid-Stack-Trick
// (siehe RezeptKarte.jsx) die groessenneutrale Ueberlappung bereits
// vollstaendig; ein zusaetzlicher Hoehen-Uebergang oben drauf erzeugt einen
// sichtbar ZWEITEN, vom Crossfade ENTKOPPELTEN Sprung, sobald der aeltere
// (groessere) Inhalt entfernt wird und der Wrapper NACHTRAEGLICH auf die
// neue Zielhoehe nachzieht - per getBoundingClientRect()-Serie konkret
// nachgewiesen (siehe Bugfix "Wizard-Uebergaenge, zweiter Versuch"). Deshalb
// wurde dieser Hook dort wieder entfernt.
//
// GEFUNDENE URSACHE des urspruenglichen Clipping-Bugs (Eingabefelder am
// Kartenrand abgeschnitten, reproduzierbar in JEDEM Chromium, nicht Safari-
// spezifisch): klassisches CSS-Margin-Collapse. Das gemessene Element selbst
// hat kein eigenes Padding/Border/overflow - das mt-3 des ERSTEN sichtbaren
// Kindes kollabierte dadurch nach AUSSEN, VOR dessen eigene Border-Box.
// getBoundingClientRect() maass dadurch systematisch zu wenig - der Wrapper
// bekam eine zu kleine Ziel-Hoehe gesetzt, die letzte Zeile wurde
// abgeschnitten. Behoben durch flow-root auf dem gemessenen Element bei der
// jeweiligen Verwendungsstelle (siehe dort im JSX) - etabliert einen neuen
// Block-Formatting-Context, der Margin-Collapse verhindert, ohne (anders
// als overflow-hidden) selbst Inhalt abzuschneiden.
//
// CALLBACK-REF statt useRef() - GEFUNDENE URSACHE eines zweiten, separaten
// Bugs (WizardTageskarte.jsx schrumpfte beim Zurueck-Navigieren 3->2 nicht
// mehr, blieb hart auf der Schritt-3-Groesse stehen): WizardTageskarte
// rendert ihr gemessenes Element NICHT immer (gibt bei !hatInhalt frueh
// null zurueck, z. B. auf Schritt 1, bevor ueberhaupt ein Kalorienziel
// gesetzt ist). Mit einem simplen useRef() + useLayoutEffect(fn, []) fuer
// den ResizeObserver lief dieser EINMALIGE Mount-Effekt beim ALLERERSTEN
// Render, zu dem inhaltRef.current noch null war (Karte hatte ja noch
// keinen Inhalt) - der Observer wurde dadurch NIE erstellt, fuer den Rest
// der gesamten Komponenten-Lebensdauer (leeres Dependency-Array = laeuft
// nie wieder). Per direktem console.log-Tracing der ResizeObserver-
// Erstellung konkret nachgewiesen: kein einziges "angehaengt"-Log fuer die
// Karte in der gesamten Session. Dass Schritt 2->3 (vorwaerts) trotzdem
// meist richtig aussah, war REINER ZUFALL - Mechanismus 1 (der Effekt ohne
// Dependency-Array, der nach JEDEM Render neu misst) traf durch andere,
// zeitgleich laufende Re-Renders (z. B. die Kalorien-Hochzaehl-Animation)
// oft genug zufaellig die richtige Groesse, waehrend beim Zurueck-Wechsel
// (kein Kalorien-Hochzaehlen, keine weiteren Re-Renders danach) dieser
// Zufallstreffer ausblieb. Ein Callback-Ref (statt useRef) wird von React
// bei JEDEM tatsaechlichen Mount/Unmount des Elements aufgerufen - auch
// wenn das erst nach mehreren Rendern passiert, in denen die Komponente
// zuvor null zurueckgab - dadurch haengt sich der ResizeObserver-Effekt
// (jetzt mit [element] als Dependency statt []) zuverlaessig genau dann
// ein, wenn das Element TATSAECHLICH im DOM erscheint, unabhaengig von der
// Navigationsrichtung.
export function useBeobachteteHoehe() {
  const [element, setElement] = useState(null)
  const inhaltRef = useCallback((node) => setElement(node), [])
  const [hoehe, setHoehe] = useState(undefined)

  // Bewusst OHNE Dependency-Array (soll nach jedem Render feuern) - kein
  // Endlos-Loop-Risiko: setHoehe mit demselben Wert wie zuvor loest KEINEN
  // erneuten Render aus (React vergleicht Primitives per Object.is), die
  // gemessene Hoehe ist zudem unabhaengig von der Hoehe, die der AUFRUFER
  // (der Wrapper mit transition: height) gerade selbst hat.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (element) {
      setHoehe(element.getBoundingClientRect().height)
    }
  })

  // Der ResizeObserver bleibt zusaetzlich noetig fuer das Schrumpfen: ein
  // austretendes Element bleibt waehrend seiner eigenen Fade-out-Animation
  // im DOM (siehe AnimatePresence an der jeweiligen Verwendungsstelle) und
  // wird erst DANACH entfernt - ein Zeitpunkt, zu dem die Komponente selbst
  // NICHT zwingend neu rendert, Mechanismus 1 also nichts davon mitbekommt.
  useLayoutEffect(() => {
    if (!element) {
      return undefined
    }
    const beobachter = new ResizeObserver(([eintrag]) => setHoehe(eintrag.contentRect.height))
    beobachter.observe(element)
    return () => beobachter.disconnect()
  }, [element])

  // document.fonts.ready erzwingt EINE zusaetzliche Nachmessung, sobald die
  // Webfonts (Fraunces/Inter, per <link> in index.html, ohne preload) fertig
  // geladen sind - der Fallback-Font vor dem Laden ergibt eine andere
  // Zeilenumbruch-Situation als nach dem Swap, siehe Herleitung in der
  // urspruenglichen Fehlersuche (ZielEinstellungen.jsx-Git-Historie).
  useLayoutEffect(() => {
    if (!element) {
      return undefined
    }
    let abgemeldet = false
    document.fonts.ready.then(() => {
      if (!abgemeldet) {
        setHoehe(element.getBoundingClientRect().height)
      }
    })
    return () => {
      abgemeldet = true
    }
  }, [element])

  return [inhaltRef, hoehe]
}
