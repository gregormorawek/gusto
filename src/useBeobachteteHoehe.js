import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

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
// nie wieder). Ein Callback-Ref (statt useRef) wird von React bei JEDEM
// tatsaechlichen Mount/Unmount des Elements aufgerufen - auch wenn das erst
// nach mehreren Rendern passiert, in denen die Komponente zuvor null
// zurueckgab - dadurch haengt sich der ResizeObserver-Effekt (jetzt mit
// [element] als Dependency statt []) zuverlaessig genau dann ein, wenn das
// Element TATSAECHLICH im DOM erscheint, unabhaengig von der Navigations-
// richtung.
//
// wachstumBeimMount - GEFUNDENE URSACHE eines DRITTEN, wieder separaten Bugs
// ("Doppel-Sprung"/Nachjustieren beim Schritt-Wechsel 1->2, siehe Bugfix
// "Wizard-Uebergaenge, dritter Versuch"): WizardTageskarte gibt auf Schritt
// 1 fruh null zurueck (siehe oben) - beim Wechsel zu Schritt 2 erscheint sie
// dadurch zum ALLERERSTEN Mal, mit SOFORT ihrer vollen natuerlichen Hoehe
// (kein vorheriger Wert, von dem aus eine CSS-Transition haette starten
// koennen). Da WizardTageskarte im FOOTER unterhalb des per flex-1+
// justify-center zentrierten Frage-Bereichs sitzt, verkleinert dieses
// SOFORTIGE Beanspruchen von Footer-Platz augenblicklich den fuer den
// Frage-Bereich verfuegbaren Raum - der (zu diesem Zeitpunkt noch
// unveraenderte, gleich hohe) Frage-Bereich wird dadurch OHNE jede
// Animation neu zentriert/verschoben. Per getBoundingClientRect()-Serie
// konkret nachgewiesen: der Frage-Bereich sprang binnen 13ms nach dem Klick
// um 38px nach oben, waehrend seine eigene Hoehe zu diesem Zeitpunkt NOCH
// UNVERAENDERT war (390px) - ein von der spaeteren Crossfade-Aufloesung
// (weiteres Update ~1 Zyklus spaeter, wenn der alte Schritt-Inhalt entfernt
// wird) VOLLSTAENDIG ENTKOPPELTES zweites Bewegungs-Ereignis. Mit
// wachstumBeimMount:true startet die Karte beim allerersten Erscheinen
// bei Hoehe 0 (statt sofort auf voller Hoehe) und waechst danach per
// derselben CSS-Transition sanft auf ihre echte Hoehe - der Footer
// beansprucht seinen Platz dadurch GRADUELL statt schlagartig, wodurch sich
// der Frage-Bereich synchron MIT statt NACH der Crossfade-Bewegung neu
// zentriert. Bewusst NICHT der Hook-Standard (wuerde sonst z. B.
// ZielEinstellungen beim allerersten Seitenaufruf unerwuenscht von 0
// hochwachsen lassen, statt direkt in korrekter Groesse zu erscheinen).
export function useBeobachteteHoehe({ wachstumBeimMount = false } = {}) {
  const [element, setElement] = useState(null)
  const inhaltRef = useCallback((node) => setElement(node), [])
  const [hoehe, setHoehe] = useState(wachstumBeimMount ? 0 : undefined)

  // Solange messungFreigegeben false ist (nur unmittelbar nach einem
  // wachstumBeimMount-Mount), UNTERDRUECKEN alle drei Mess-Mechanismen
  // unten ihre Korrektur - sie wuerden sonst (useLayoutEffect + ResizeObserver
  // feuern beide synchron VOR dem naechsten Browser-Paint) die Hoehe schon
  // auf den Zielwert korrigieren, BEVOR ueberhaupt einmal 0 sichtbar
  // gerendert wurde. Die CSS-Transition haette dann keinen sichtbaren
  // Ausgangspunkt zum Wachsen - das Element wuerde einfach sofort in voller
  // Groesse erscheinen. Der useEffect ganz unten hebt die Sperre ERST NACH
  // dem ersten Paint (+ 1 zusaetzlichem rAF als Sicherheitsmarge) auf.
  const messungFreigegeben = useRef(!wachstumBeimMount)

  // Bewusst OHNE Dependency-Array (soll nach jedem Render feuern) - kein
  // Endlos-Loop-Risiko: setHoehe mit demselben Wert wie zuvor loest KEINEN
  // erneuten Render aus (React vergleicht Primitives per Object.is), die
  // gemessene Hoehe ist zudem unabhaengig von der Hoehe, die der AUFRUFER
  // (der Wrapper mit transition: height) gerade selbst hat.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (element && messungFreigegeben.current) {
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
    const beobachter = new ResizeObserver(([eintrag]) => {
      if (messungFreigegeben.current) {
        setHoehe(eintrag.contentRect.height)
      }
    })
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
      if (!abgemeldet && messungFreigegeben.current) {
        setHoehe(element.getBoundingClientRect().height)
      }
    })
    return () => {
      abgemeldet = true
    }
  }, [element])

  // Siehe Kommentar zu wachstumBeimMount oben - hebt die Mess-Sperre NACH
  // dem ersten Paint auf und stoesst die erste echte Messung selbst an.
  // useEffect statt useLayoutEffect ist hier ABSICHTLICH und OHNE
  // zusaetzliches requestAnimationFrame: useEffect-Callbacks laufen per
  // React-Garantie nach Layout UND Paint ("during a deferred event"), im
  // Gegensatz zu den drei useLayoutEffect-Mechanismen oben, die noch VOR dem
  // Paint laufen - genau dieser Unterschied wird hier gebraucht, um das 0px
  // zwischenzeitlich tatsaechlich sichtbar werden zu lassen. BEWUSST kein
  // requestAnimationFrame als zusaetzliche Sicherheitsmarge (frueherer
  // Versuch) - rAF haengt vom Compositor/Frame-Takt ab, der sich in der
  // Praxis (u. a. in automatisierten/CDP-gesteuerten Browser-Sessions,
  // konkret beobachtet: rAF gedrosselt auf exakt 1 Hz statt ~60 Hz) massiv
  // verzoegern kann - waehrend useEffects eigene, davon unabhaengige
  // Ausfuehrungsgarantie zuverlaessig genuegt.
  useEffect(() => {
    if (!wachstumBeimMount || !element || messungFreigegeben.current) {
      return undefined
    }
    messungFreigegeben.current = true
    setHoehe(element.getBoundingClientRect().height)
  }, [wachstumBeimMount, element])

  return [inhaltRef, hoehe]
}
