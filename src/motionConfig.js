// Geteilte framer-motion-Presets, damit sich Animationen app-weit gleich
// anfuehlen statt pro Komponente leicht unterschiedliche Ad-hoc-Werte zu
// verwenden.

// Feder-Preset fuer "etwas erscheint/wird ausgewaehlt" (Icon-Chips im
// Wizard, Zutaten-Karten-Reveal, Panel-Oeffnen, ...) - leichtes
// Ueberschwingen, aber nicht wabbelig.
export const SPRING_REVEAL = { type: 'spring', stiffness: 300, damping: 20 }

// Reines Fade ohne Bewegung, fuer Backdrop/Farb-Uebergaenge o.ae.
export const FADE_UEBERGANG = { duration: 0.25 }

// Standard-Versatz (in px) fuer Slide-Einblendungen (Suchfeld, Panel, ...).
export const SLIDE_DISTANZ = 10

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
