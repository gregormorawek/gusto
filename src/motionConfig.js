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
// Transition - zentrale Stelle statt der Ternary in jeder Komponente.
export function transitionFuer(reduzierteBewegung, normaleTransition) {
  return reduzierteBewegung ? { duration: 0.15 } : normaleTransition
}
