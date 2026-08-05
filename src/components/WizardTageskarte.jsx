import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import {
  IconApple,
  IconCheck,
  IconCoffee,
  IconFlame,
  IconLeaf,
  IconMoon,
  IconSoup,
  IconWheatOff,
} from '@tabler/icons-react'
import { MAHLZEITEN } from '../mahlzeiten'
import { kalorienZielGueltig } from '../kalorienZiel'

const MAHLZEIT_ICON = {
  fruehstueck: IconCoffee,
  mittag: IconSoup,
  abend: IconMoon,
  snack: IconApple,
}

const DIAET_ICON = {
  vegan: IconLeaf,
  vegetarisch: IconLeaf,
  glutenfrei: IconWheatOff,
  keine: IconCheck,
}

const DIAET_LABEL = {
  vegan: 'Vegan',
  vegetarisch: 'Vegetarisch',
  glutenfrei: 'Glutenfrei',
  keine: 'Alles',
}

const UEBERSCHWING_FEDER = { type: 'spring', stiffness: 300, damping: 20 }

// Zaehlt eine angezeigte Ganzzahl sanft von ihrem zuletzt angezeigten Wert
// auf "ziel" hoch/runter (statt hart zu springen). anzeigeRef haelt den
// ZWISCHENSTAND der laufenden Animation fest (nicht nur den Zielwert), damit
// ein erneuter Zielwechsel WAEHREND einer laufenden Animation sauber vom
// aktuell sichtbaren Wert aus weiterzaehlt statt neu bei 0 anzusetzen.
// Reduzierte Bewegung (prefers-reduced-motion) ueberspringt die Animation
// komplett und springt direkt zum Zielwert.
function useAnimierteZahl(ziel, reduzierteBewegung) {
  const [anzeige, setAnzeige] = useState(0)
  const anzeigeRef = useRef(0)

  useEffect(() => {
    if (reduzierteBewegung) {
      anzeigeRef.current = ziel
      setAnzeige(ziel)
      return
    }
    if (anzeigeRef.current === ziel) {
      return
    }
    const controls = animate(anzeigeRef.current, ziel, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (wert) => {
        anzeigeRef.current = wert
        setAnzeige(Math.round(wert))
      },
    })
    return () => controls.stop()
  }, [ziel, reduzierteBewegung])

  return anzeige
}

// Ein einzelner Icon-Chip (Mahlzeit ODER Diaetform) - der Chip selbst ist
// IMMER sichtbar (gestrichelt/blass), nur die getoente "aktiv"-Ebene
// darueber wird per AnimatePresence ein-/ausgeblendet, wenn sich der
// aktiv-Status aendert. So entsteht das gewuenschte "scale+fade mit
// Ueberschwingen bei Auswahl, scale-down+fade-out bei Abwahl" OHNE dass der
// Chip selbst ver- oder auftaucht. farbKlasse bestimmt Terrakotta (Mahlzeit)
// vs. Oliv (Diaetform).
function IconChip({ Icon, label, aktiv, farbKlasse, reduzierteBewegung }) {
  const federOderFade = reduzierteBewegung ? { duration: 0.15 } : UEBERSCHWING_FEDER

  return (
    <div className="relative flex flex-col items-center gap-1 rounded-2xl border border-dashed border-text-muted/50 px-3 py-2">
      <AnimatePresence>
        {aktiv && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={federOderFade}
            className={`absolute inset-0 rounded-2xl border ${farbKlasse.aktivBorder} ${farbKlasse.aktivBg}`}
          />
        )}
      </AnimatePresence>
      <Icon
        size={22}
        stroke={1.75}
        className={`relative ${aktiv ? farbKlasse.aktivText : 'text-text-muted/50'}`}
      />
      <span className={`relative text-[11px] font-medium ${aktiv ? farbKlasse.aktivText : 'text-text-muted/50'}`}>
        {label}
      </span>
    </div>
  )
}

const TERRAKOTTA = { aktivBorder: 'border-primary', aktivBg: 'bg-primary/15', aktivText: 'text-primary' }
const OLIVE = { aktivBorder: 'border-secondary', aktivBg: 'bg-secondary/15', aktivText: 'text-secondary' }

// Live-Vorschau des Onboarding-Wizards: statt eines abstrakten Fortschritts-
// Fuellstands zeigt diese Tageskarte die ECHTEN, bereits gegebenen
// Antworten (Kalorienziel/Mahlzeiten/Ernaehrungsform) und waechst mit jedem
// Schritt inhaltlich mit. Erscheint erst, sobald mindestens ein Teil echten
// Inhalt hat - kein leerer Platzhalter-Rahmen auf Schritt 1, bevor ein
// Kalorienziel gewaehlt wurde.
function WizardTageskarte({ schritt, ziel, mahlzeit, tagesplanMahlzeiten, proTag, diaeten, reduzierteBewegung }) {
  const kalorienGueltig = ziel.typ !== 'kein' && kalorienZielGueltig(ziel)
  const kalorienMittelwert = kalorienGueltig
    ? Math.round((Number(ziel.kalorien.min) + Number(ziel.kalorien.max)) / 2)
    : 0
  const angezeigteKalorien = useAnimierteZahl(kalorienMittelwert, reduzierteBewegung)

  const ausgewaehlteMahlzeiten = proTag ? tagesplanMahlzeiten : [mahlzeit]
  const zeigeMahlzeiten = schritt >= 2
  const zeigeDiaet = schritt >= 3 && diaeten.length > 0

  const hatInhalt = kalorienGueltig || zeigeMahlzeiten || zeigeDiaet
  if (!hatInhalt) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduzierteBewegung ? { duration: 0.15 } : { duration: 0.3, ease: 'easeOut' }}
      className="rounded-[14px] bg-card p-5 shadow-sm"
    >
      <AnimatePresence>
        {kalorienGueltig && (
          <motion.div
            key="kalorien"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={reduzierteBewegung ? { duration: 0.15 } : { duration: 0.3, ease: 'easeOut' }}
            className="flex items-center gap-2"
          >
            <IconFlame size={28} stroke={1.75} className="shrink-0 text-primary" />
            <p className="font-display text-4xl font-semibold text-text">
              {angezeigteKalorien}
              <span className="ml-1 text-base font-medium text-text-muted">kcal</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zeigeMahlzeiten && (
          <motion.div
            key="mahlzeiten"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={reduzierteBewegung ? { duration: 0.15 } : { duration: 0.3, ease: 'easeOut' }}
            className={`flex gap-2 ${kalorienGueltig ? 'mt-4' : ''}`}
          >
            {MAHLZEITEN.map(({ slug, label }) => (
              <IconChip
                key={slug}
                Icon={MAHLZEIT_ICON[slug]}
                label={label}
                aktiv={ausgewaehlteMahlzeiten.includes(slug)}
                farbKlasse={TERRAKOTTA}
                reduzierteBewegung={reduzierteBewegung}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zeigeDiaet && (
          <motion.div
            key="diaet"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={reduzierteBewegung ? { duration: 0.15 } : UEBERSCHWING_FEDER}
            className={`flex flex-wrap gap-2 ${zeigeMahlzeiten ? 'mt-4' : ''}`}
          >
            {Object.keys(DIAET_ICON).map((slug) => (
              <IconChip
                key={slug}
                Icon={DIAET_ICON[slug]}
                label={DIAET_LABEL[slug]}
                aktiv={diaeten.includes(slug)}
                farbKlasse={OLIVE}
                reduzierteBewegung={reduzierteBewegung}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default WizardTageskarte
