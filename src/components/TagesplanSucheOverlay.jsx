import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import { FADE_UEBERGANG, SPRING_REVEAL, motionPropsFuer, transitionFuer } from '../motionConfig'
import { suchtextGefiltert } from '../zutatenFilter'

// Ersetzt das bisherige INLINE-Suchfeld von SlotKarte fuer die Tagesplan-
// Ansicht: nach REROLL_SCHWELLE_FUER_SUCHE aufeinanderfolgenden Rerolls
// desselben Slots (siehe TagesplanAnsicht.jsx) erscheint dieses Suchfeld
// stattdessen als Overlay ueber der ganzen kompakten Liste - inline wuerde in
// der neuen, engen Zeilen-Optik die deterministische Hoehe wieder aufbrechen.
// Gleiches Backdrop-Fade-Muster wie der "Kalorienziel neu berechnen?"-Dialog
// in EinstellungenAnsicht.jsx, fuer App-weite
// Konsistenz. slot ist { index, kategorie, titel, suchPool } | null (siehe
// sucheSlot-State in TagesplanAnsicht.jsx) - offen/geschlossen wird darueber
// gesteuert (kein eigener offen-Prop noetig).
function TagesplanSucheOverlay({ slot, onWaehlen, onSchliessen }) {
  const reduzierteBewegung = useReducedMotion()
  const [suchtext, setSuchtext] = useState('')

  // Suchtext gehoert konzeptionell zum jeweils GERADE offenen Slot - beim
  // Wechsel auf einen anderen Slot (oder beim Schliessen) faengt die Suche
  // wieder leer an, statt den alten Text des vorherigen Slots zu zeigen.
  useEffect(() => {
    setSuchtext('')
  }, [slot])

  const treffer = slot ? suchtextGefiltert(slot.suchPool, suchtext) : []

  return (
    <AnimatePresence>
      {slot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitionFuer(reduzierteBewegung, FADE_UEBERGANG)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-text/40 p-4"
          onClick={onSchliessen}
        >
          <motion.div
            {...motionPropsFuer(reduzierteBewegung, {
              initial: { opacity: 0, y: -16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -16 },
              transition: SPRING_REVEAL,
            })}
            className="mt-16 w-full max-w-sm rounded-lg bg-card p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-text">{slot.titel} suchen</h2>
              <AnimatedButton
                type="button"
                onClick={onSchliessen}
                aria-label="Suche schließen"
                className="text-text-muted hover:text-primary"
              >
                <IconX size={20} stroke={1.75} />
              </AnimatedButton>
            </div>

            <input
              type="text"
              autoFocus
              value={suchtext}
              onChange={(e) => setSuchtext(e.target.value)}
              placeholder={`${slot.titel} suchen…`}
              className="mt-3 w-full rounded-md border border-text-muted/30 px-2 py-1.5 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {suchtext.trim() && (
              treffer.length > 0 ? (
                <ul className="mt-2 max-h-60 overflow-y-auto rounded-md border border-text-muted/20 bg-card">
                  {treffer.map((z) => (
                    <li key={z.name}>
                      <button
                        type="button"
                        onClick={() => onWaehlen(z)}
                        className="block w-full px-2 py-1.5 text-left text-sm text-text hover:bg-primary/10"
                      >
                        {z.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-text-muted">Keine passende Zutat gefunden</p>
              )
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default TagesplanSucheOverlay
