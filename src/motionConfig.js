// Geteilte framer-motion-Presets, damit sich Animationen app-weit gleich
// anfuehlen statt pro Komponente leicht unterschiedliche Ad-hoc-Werte zu
// verwenden.

// Feder-Preset fuer "etwas erscheint/wird ausgewaehlt" (Icon-Chips im
// Wizard, Zutaten-Karten-Reveal, Panel-Oeffnen, ...) - leichtes
// Ueberschwingen, aber nicht wabbelig.
export const SPRING_REVEAL = { type: 'spring', stiffness: 300, damping: 20 }

// Fuer einen vollflaechigen Bottom-Sheet-Takeover (KochModus.jsx) ist das
// leichte Nachwippen von SPRING_REVEAL unpassend - wirkt bei einer grossen,
// die ganze Seite einnehmenden Flaeche verspielt statt hochwertig/nativ.
// BEWUSST ein reiner Tween mit Cubic-Bezier-Ease-out statt eines Springs:
// ein Spring kann ueber stiffness/damping zwar RECHNERISCH kritisch gedaempft
// (Ueberschwingfrei) konfiguriert werden, reagiert dabei aber empfindlich auf
// die genauen Werte UND auf die Distanz, ueber die animiert wird (bei einer
// vollen Bildschirmhoehe wie hier ist "kein Overshoot" mit einem Spring nicht
// so zuverlaessig garantiert wie mit einem Tween, der der Kurve exakt folgt,
// unabhaengig von der Distanz). Der Bezier-Verlauf [0.32, 0.72, 0, 1]
// entspricht dem in nativen iOS-Sheets ueblichen Ease-out (schnellerer Start,
// sehr sanftes, UEBERSCHWINGFREIES Abbremsen) - selbe gefuehlte
// Gesamtdauer wie SPRING_REVEAL vorher (~350ms bis zur Ruhelage), nur ohne
// dessen Nachwippen.
export const SHEET_SLIDE_UEBERGANG = { type: 'tween', duration: 0.35, ease: [0.32, 0.72, 0, 1] }

// Reines Fade ohne Bewegung, fuer Backdrop/Farb-Uebergaenge o.ae.
export const FADE_UEBERGANG = { duration: 0.25 }

// Standard-Versatz (in px) fuer Slide-Einblendungen (Suchfeld, Panel, ...).
export const SLIDE_DISTANZ = 10

// Dauer/Easing fuer automatische Hoehen-Aenderungen (z. B. eine Card, die
// durch neu erscheinende Felder waechst/schrumpft). Als reine Zahlenwerte
// (nicht als framer-motion-Transition-Objekt), da sich herausgestellt hat,
// dass framer-motions layout-Prop Groessen-Aenderungen, die durch das
// Unmounten eines AnimatePresence-Geschwisters ausgeloest werden, NICHT
// zuverlaessig animiert (springt statt zu interpolieren, siehe
// ZielEinstellungen.jsx - dort per ResizeObserver + CSS transition: height
// geloest, robuster als framer-motions automatische Layout-Projection fuer
// diesen speziellen Fall). ms/Tailwind-Easing-Name statt Sekunden/framer-
// Easing-Alias, da dieser Wert als CSS-Transition verwendet wird.
export const HOEHEN_UEBERGANG_MS = 350
export const HOEHEN_UEBERGANG_EASING = 'ease-in-out'

// Liefert bei aktiver reduzierter Bewegung (prefers-reduced-motion) immer
// ein kurzes, bewegungsloses Fade statt der uebergebenen normalen
// Transition - zentrale Stelle statt der Ternary in jeder Komponente. Nur
// fuer Stellen geeignet, die ohnehin schon reines Fade sind (kein y-/scale-
// Versatz in initial/animate/exit) - sonst bleibt trotz kuerzerer Transition
// eine (nur schnellere) Bewegung sichtbar, siehe motionPropsFuer.
export function transitionFuer(reduzierteBewegung, normaleTransition) {
  return reduzierteBewegung ? { duration: 0.15 } : normaleTransition
}

// Liefert die vollstaendigen motion-Props (initial/animate/exit/transition)
// fuer eine Reveal-Animation mit y-Versatz und/oder scale. Anders als
// transitionFuer (die nur die Transition-Timing-Funktion tauscht) werden bei
// aktiver reduzierter Bewegung die y-/scale-Werte aus initial/animate/exit
// komplett entfernt - es bleibt nur noch der reine opacity-Wert uebrig,
// sodass wirklich KEINE Bewegung mehr stattfindet (nicht nur eine schnellere).
// Analog zum Vorbild AnimierteZahl.jsx, die bei reduzierter Bewegung direkt
// zum Zielwert springt statt hochzuzaehlen.
function nurOpacity(props) {
  return props && 'opacity' in props ? { opacity: props.opacity } : props
}

export function motionPropsFuer(reduzierteBewegung, { initial, animate, exit, transition }) {
  if (!reduzierteBewegung) {
    return { initial, animate, exit, transition }
  }
  return {
    initial: nurOpacity(initial),
    animate: nurOpacity(animate),
    exit: nurOpacity(exit),
    transition: { duration: 0.15 },
  }
}
