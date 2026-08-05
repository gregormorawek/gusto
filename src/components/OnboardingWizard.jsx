import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ZielEinstellungen from './ZielEinstellungen'
import MahlzeitFilter from './MahlzeitFilter'
import DiaetFilter from './DiaetFilter'
import TagesplanMahlzeitenFilter from './TagesplanMahlzeitenFilter'
import WizardTageskarte from './WizardTageskarte'
import { kalorienZielGueltig } from '../kalorienZiel'

const SCHRITT_TITEL = {
  1: 'Kalorienziel',
  2: 'Mahlzeit',
  3: 'Ernährungsform',
}

// Slide+Fade-Varianten fuer den Frage-Bereich beim Schritt-Wechsel. richtung
// (+1 = Weiter, -1 = Zurueck, siehe schrittWechseln) bestimmt, von welcher
// Seite die neue Frage hereinkommt bzw. wohin die alte rausgeht - Weiter
// kommt von rechts rein/geht nach links raus, Zurueck umgekehrt. Bei
// reduzierter Bewegung (prefers-reduced-motion) faellt die x-Verschiebung
// komplett weg, es bleibt nur ein reines Fade.
function schrittVarianten(reduzierteBewegung) {
  if (reduzierteBewegung) {
    return {
      eintritt: { opacity: 0 },
      mitte: { opacity: 1 },
      austritt: { opacity: 0 },
    }
  }
  return {
    eintritt: (richtung) => ({ opacity: 0, x: richtung > 0 ? 40 : -40 }),
    mitte: { opacity: 1, x: 0 },
    austritt: (richtung) => ({ opacity: 0, x: richtung > 0 ? -40 : 40 }),
  }
}

// Einmaliger 3-Schritte-Wizard fuer den allerersten Besuch. Der Schritt-
// Zaehler ist reiner interner UI-State - App.jsx muss nur wissen, WANN der
// Wizard fertig ist (onAbschluss), nicht bei welchem Schritt er gerade steht.
// Alle Schritte rendern exakt dieselben Komponenten wie die Haupt-Ansicht
// (ZielEinstellungen/MahlzeitFilter/DiaetFilter/TagesplanMahlzeitenFilter)
// mit denselben Props/Handlern, damit sich Wizard und spaeteres
// Einstellungen-Panel identisch verhalten - dieses Redesign aendert NUR den
// Container drumherum (Vollbild + Slide-Uebergaenge + Live-Tageskarte
// unten), nicht die Fragen/Optionen/Validierung selbst.
//
// Layout pro Schritt: Kopfbereich (Zurueck-Pfeil ab Schritt 2 + 3-Segmente-
// Fortschrittsbalken mit Width-Transition + Titel), mittlerer Bereich (die
// eigentliche Frage, per AnimatePresence beim Schritt-Wechsel geslided),
// unteres Drittel (WizardTageskarte + Weiter/Los-geht's-Button). Nur
// bestehende Marken-Tokens, keine neuen Farben/Fonts.
function OnboardingWizard({
  ziel,
  onTypAendern,
  onKalorienAendern,
  onMakroAendern,
  mahlzeit,
  onMahlzeitAendern,
  diaeten,
  onDiaetenAendern,
  tagesplanMahlzeiten,
  onTagesplanMahlzeitenAendern,
  onAbschluss,
}) {
  const [schritt, setSchritt] = useState(1)
  // richtung merkt sich, ob der LETZTE Schrittwechsel ein Weiter (+1) oder
  // ein Zurueck (-1) war - wird als "custom"-Wert an die Slide-Varianten
  // durchgereicht, damit AnimatePresence weiss, aus welcher Richtung die neue
  // Frage hereinkommen soll.
  const [richtung, setRichtung] = useState(1)
  const reduzierteBewegung = useReducedMotion()

  const zielGueltig = kalorienZielGueltig(ziel)
  const diaetGueltig = diaeten.length > 0
  const proTag = ziel.typ === 'proTag'

  function weiterKlicken() {
    setRichtung(1)
    setSchritt((s) => s + 1)
  }

  function zurueckKlicken() {
    setRichtung(-1)
    setSchritt((s) => s - 1)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="px-6 pt-8">
        <div className="flex items-center gap-3">
          {schritt > 1 ? (
            <button
              type="button"
              onClick={zurueckKlicken}
              aria-label="Zurück"
              className="-ml-2 rounded-full p-2 text-2xl text-text-muted hover:text-primary"
            >
              ←
            </button>
          ) : (
            // Platzhalter in derselben Groesse wie der Zurueck-Pfeil, damit
            // der Titel beim Wechsel von Schritt 1 zu Schritt 2 nicht springt.
            <span className="h-9 w-9" />
          )}
          <p className="font-display text-lg font-semibold text-primary">gusto</p>
        </div>

        <div className="mt-6 flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-text-muted/20">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
                style={{ width: s <= schritt ? '100%' : '0%' }}
              />
            </span>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Schritt {schritt} von 3
        </p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-text sm:text-5xl">
          {SCHRITT_TITEL[schritt]}
        </h1>
      </header>

      <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-6">
        <AnimatePresence mode="wait" custom={richtung} initial={false}>
          <motion.div
            key={schritt}
            custom={richtung}
            variants={schrittVarianten(reduzierteBewegung)}
            initial="eintritt"
            animate="mitte"
            exit="austritt"
            transition={reduzierteBewegung ? { duration: 0.15 } : { duration: 0.32, ease: 'easeOut' }}
          >
            {schritt === 1 && (
              <>
                <ZielEinstellungen
                  ziel={ziel}
                  onTypAendern={onTypAendern}
                  onKalorienAendern={onKalorienAendern}
                  onMakroAendern={onMakroAendern}
                />
                {!zielGueltig && ziel.typ && ziel.typ !== 'kein' && (
                  <p className="mx-4 mt-2 text-xs text-primary">
                    Bitte gültige Min-/Max-Werte eingeben (beide größer als 0, Min kleiner als Max).
                  </p>
                )}
              </>
            )}

            {schritt === 2 && (
              <section className="mx-4 rounded-2xl border border-secondary/20 bg-card p-6 shadow-sm">
                {proTag ? (
                  <>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mahlzeiten</h2>
                    <p className="mt-1 text-xs text-text-muted">Welche Mahlzeiten sollen im Tagesplan vorkommen?</p>
                    <div className="mt-3">
                      <TagesplanMahlzeitenFilter ausgewaehlt={tagesplanMahlzeiten} onAendern={onTagesplanMahlzeitenAendern} />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mahlzeit</h2>
                    <p className="mt-1 text-xs text-text-muted">Womit soll es losgehen? Das lässt sich später jederzeit ändern.</p>
                    <div className="mt-3">
                      <MahlzeitFilter aktuell={mahlzeit} onAendern={onMahlzeitAendern} />
                    </div>
                  </>
                )}
              </section>
            )}

            {schritt === 3 && (
              <>
                <section className="mx-4 rounded-2xl border border-secondary/20 bg-card p-6 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Ernährungsform</h2>
                  <div className="mt-3">
                    <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />
                  </div>
                </section>
                {!diaetGueltig && (
                  <p className="mx-4 mt-2 text-xs text-primary">
                    Bitte eine Option auswählen (z. B. "Keine Einschränkung").
                  </p>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 pt-4">
        <WizardTageskarte
          schritt={schritt}
          ziel={ziel}
          mahlzeit={mahlzeit}
          tagesplanMahlzeiten={tagesplanMahlzeiten}
          proTag={proTag}
          diaeten={diaeten}
          reduzierteBewegung={reduzierteBewegung}
        />

        <div className="mt-6">
          {schritt < 3 ? (
            <motion.button
              type="button"
              onClick={weiterKlicken}
              disabled={schritt === 1 && !zielGueltig}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Weiter
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={onAbschluss}
              disabled={!diaetGueltig}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Los geht's
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
