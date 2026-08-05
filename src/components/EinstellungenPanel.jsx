import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ZielEinstellungen from './ZielEinstellungen'
import DiaetFilter from './DiaetFilter'
import SuessDeftigFilter from './SuessDeftigFilter'
import TagesplanMahlzeitenFilter from './TagesplanMahlzeitenFilter'
import AnimatedButton from './AnimatedButton'
import { FADE_UEBERGANG, SPRING_REVEAL, motionPropsFuer, transitionFuer } from '../motionConfig'

// Modal-Panel fuer die Werte, die nach dem Onboarding nicht mehr staendig
// gebraucht werden (Kalorienziel, Ernaehrungsform, bei "Pro Tag" zusaetzlich
// die Tagesplan-Mahlzeitenauswahl), aber weiterhin editierbar bleiben
// muessen. Rendert dieselben Komponenten wie der Onboarding-Wizard, nur in
// einem Overlay statt als eigener Schritt. Wird sowohl ueber das
// Zahnrad-Icon als auch ueber den "Mahlzeiten anpassen"-Link in der
// Haupt-Ansicht geoeffnet (beide teilen sich denselben einstellungenOffen-State).
//
// Der SuessDeftigFilter lebt zusaetzlich zur Einzel-Ansicht (dort nur bei
// fruehstueck/snack sichtbar) auch hier, IMMER sichtbar - genau wie
// DiaetFilter. Das ist der einzige Weg, den Filter im Tagesplan-Modus
// (ziel.typ === 'proTag') ueberhaupt zu erreichen, da dort die Einzel-
// Ansicht (und damit ihr SuessDeftigFilter) nicht gerendert wird.
function EinstellungenPanel({
  offen,
  onSchliessen,
  ziel,
  onTypAendern,
  onKalorienAendern,
  onMakroAendern,
  diaeten,
  onDiaetenAendern,
  suessDeftig,
  onSuessDeftigAendern,
  tagesplanMahlzeiten,
  onTagesplanMahlzeitenAendern,
}) {
  const reduzierteBewegung = useReducedMotion()

  return (
    <AnimatePresence>
      {offen && (
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
              <h2 className="font-display text-lg font-semibold text-text">Einstellungen</h2>
              <AnimatedButton
                type="button"
                onClick={onSchliessen}
                aria-label="Einstellungen schließen"
                className="text-text-muted hover:text-primary"
              >
                ✕
              </AnimatedButton>
            </div>

            <div className="mt-3">
              <ZielEinstellungen
                ziel={ziel}
                onTypAendern={onTypAendern}
                onKalorienAendern={onKalorienAendern}
                onMakroAendern={onMakroAendern}
              />
            </div>

            {ziel.typ === 'proTag' && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mahlzeiten im Tagesplan</h3>
                <p className="mt-1 text-xs text-text-muted">Welche Mahlzeiten sollen im Tagesplan vorkommen?</p>
                <div className="mt-2">
                  <TagesplanMahlzeitenFilter ausgewaehlt={tagesplanMahlzeiten} onAendern={onTagesplanMahlzeitenAendern} />
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Ernährungsform</h3>
              <div className="mt-2">
                <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Süß oder deftig</h3>
              <p className="mt-1 text-xs text-text-muted">Gilt für Frühstück und Snacks.</p>
              <div className="mt-2">
                <SuessDeftigFilter aktuell={suessDeftig} onAendern={onSuessDeftigAendern} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default EinstellungenPanel
