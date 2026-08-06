import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconPhotoOff } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import SlotKarte from './SlotKarte'
import { rezeptKarteBerechnen } from '../rezeptKarteBerechnen'
import { SPRING_REVEAL, motionPropsFuer } from '../motionConfig'

// Zeigt EIN Rezept vollstaendig an: Bild (mit onError-Fallback), Titel,
// Beschreibung, die 4 Zutaten-Slots (ueber die bestehende SlotKarte-Optik,
// ohne Reroll-Controls) und die Makro-Summe, darunter der Wuerfeln-Button.
// Bewusst als eigene, wiederverwendbare Komponente (nicht mehr privat in
// RezepteAnsicht.jsx) - die Rezepte-Tagesplan-Ansicht (proTag-Zweig)
// verwendet sie unveraendert, nur mit dem Rezept der jeweils aktiven
// Tab-Mahlzeit als Prop. onWuerfeln/wuerfelnDeaktiviert kommen vom
// Aufrufer, damit "Anderes Rezept wuerfeln" je nach Kontext entweder die
// einzelne Mahlzeit-Auswahl oder gezielt die aktive Tab-Mahlzeit trifft.
// zusatzAktion ist optional (Default: keiner) - der Rezepte-Tagesplan
// (proTag-Zweig) reicht hier den "Ganzen Tag neu planen"-Button durch,
// damit beide Buttons EINE Zeile teilen statt zwei (wichtig fuer die
// 390px-ohne-Scrollen-Vorgabe) - die Einzel-Ansicht laesst die Prop weg und
// bleibt dadurch unveraendert bei einem einzelnen, vollbreiten Button.
function RezeptKarte({ rezept, zutatenNachId, ziel, makroZiele, onWuerfeln, wuerfelnDeaktiviert, zusatzAktion }) {
  const reduzierteBewegung = useReducedMotion()
  // Merkt sich die zuletzt FEHLGESCHLAGENE bild_url (statt eines simplen
  // Boolean) - so setzt sich der Fallback beim naechsten Rezept automatisch
  // zurueck, sobald sich bild_url aendert, ganz ohne einen eigenen Reset-
  // Effekt fuer den Rezeptwechsel (gilt auch fuer einen Tab-Wechsel, der ja
  // ebenfalls einfach ein neues rezept-Prop ist).
  const [fehlgeschlageneBildUrl, setFehlgeschlageneBildUrl] = useState(null)

  const karte = rezeptKarteBerechnen(rezept, zutatenNachId, ziel, makroZiele)
  const bildFehlgeschlagen = rezept && fehlgeschlageneBildUrl === rezept.bild_url

  return (
    <>
      {karte ? (
        <>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={rezept.id}
              {...motionPropsFuer(reduzierteBewegung, {
                initial: { opacity: 0, scale: 0.95 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.95 },
                transition: SPRING_REVEAL,
              })}
              className="mx-4 mt-2 rounded-[14px] bg-card p-3 shadow-sm"
            >
              {rezept.bild_url && !bildFehlgeschlagen ? (
                <img
                  src={rezept.bild_url}
                  alt={rezept.titel}
                  onError={() => setFehlgeschlageneBildUrl(rezept.bild_url)}
                  className="h-28 w-full rounded-2xl object-cover sm:h-56"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center rounded-2xl bg-secondary/10 text-text-muted sm:h-56">
                  <IconPhotoOff size={32} stroke={1.5} />
                </div>
              )}

              <h2 className="mt-2 font-display text-xl font-semibold text-text">{rezept.titel}</h2>
              <p className="mt-0.5 text-sm text-text-muted">{rezept.beschreibung}</p>
            </motion.div>
          </AnimatePresence>

          <section className="mt-2 grid grid-cols-2 gap-2 px-4">
            <SlotKarte
              titel="Protein"
              text={karte.proteinZutat.name}
              portion={karte.portionen.proteinPortion}
              zielWert={karte.makroZieleFuerRezept.protein}
              zielErreichbar={karte.portionen.proteinZielErreichbar}
            />
            <SlotKarte
              titel="Carbs"
              text={karte.carbsZutat.name}
              portion={karte.portionen.carbsPortion}
              zielWert={karte.makroZieleFuerRezept.carbs}
              zielErreichbar={karte.portionen.carbsZielErreichbar}
            />
            <SlotKarte
              titel="Fett"
              text={karte.fettZutat.name}
              portion={karte.portionen.fettPortion}
              zielWert={karte.makroZieleFuerRezept.fett}
              zielErreichbar={karte.portionen.fettZielErreichbar}
            />
            <SlotKarte
              titel={karte.gemueseZutat.kategorie === 'obst' ? 'Obst' : 'Gemüse'}
              text={karte.gemueseZutat.name}
              portion={karte.portionen.gemuesePortion}
            />
          </section>

          <section className="mx-4 mt-2 rounded-lg border border-secondary/20 bg-secondary/10 p-2 shadow-sm">
            <h2 className="text-sm font-semibold text-text">Summe</h2>
            <p className="font-display text-2xl font-semibold text-text">{karte.summeKalorien.toFixed(1)} kcal</p>
            <p className="text-sm text-text-muted">
              P {karte.summeProtein.toFixed(1)}g · C {karte.summeCarbs.toFixed(1)}g · F {karte.summeFett.toFixed(1)}g
            </p>
          </section>
        </>
      ) : (
        <p className="mx-4 mt-2 text-text-muted">Für diese Filterkombination gibt es noch kein Rezept.</p>
      )}

      <div className="mx-4 mb-2 mt-1 flex gap-2">
        <AnimatedButton
          type="button"
          onClick={onWuerfeln}
          disabled={wuerfelnDeaktiviert}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-card disabled:opacity-50"
        >
          Anderes Rezept würfeln
        </AnimatedButton>
        {zusatzAktion}
      </div>
    </>
  )
}

export default RezeptKarte
