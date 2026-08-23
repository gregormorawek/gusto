import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconCheck } from '@tabler/icons-react'
import { FADE_UEBERGANG, transitionFuer } from '../motionConfig'

// Kurze, selbst verschwindende Bestaetigung ("Zutaten hinzugefügt" o. Ae.) -
// AUSDRUECKLICH kein Modal/Overlay: kein Backdrop, pointer-events-none auf
// dem Wrapper (blockiert also nie Taps auf dahinterliegende Inhalte), oben
// mittig ueber dem Content, WEIT weg von der schwebenden TabLeiste am
// unteren Rand, damit sich beide "floating"-Elemente niemals ueberlappen.
// App.jsx uebernimmt das Timing (setTimeout, siehe dortiger toastZeigen-
// Kommentar) - diese Komponente ist rein zustandslos/darstellend.
// nachricht ist ein { text, id }-Objekt (id statt reinem Text als
// AnimatePresence-key) - so animiert eine zweite, IDENTISCHE Nachricht kurz
// hintereinander trotzdem erneut ein/aus, statt (bei text als Key) einfach
// nur die bestehende Anzeige unveraendert stehen zu lassen.
function Toast({ nachricht }) {
  const reduzierteBewegung = useReducedMotion()

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ top: 'calc(12px + env(safe-area-inset-top))' }}
    >
      <AnimatePresence>
        {nachricht && (
          <motion.div
            key={nachricht.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transitionFuer(reduzierteBewegung, FADE_UEBERGANG)}
            className="flex items-center gap-1.5 rounded-full bg-text px-4 py-2 text-sm font-medium text-card shadow-lg"
            role="status"
          >
            <IconCheck size={16} stroke={3} className="shrink-0" />
            {nachricht.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Toast
