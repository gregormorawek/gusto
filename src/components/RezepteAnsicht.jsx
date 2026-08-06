import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconPhotoOff } from '@tabler/icons-react'
import MahlzeitFilter from './MahlzeitFilter'
import SuessDeftigFilter from './SuessDeftigFilter'
import DiaetFilter from './DiaetFilter'
import AnimatedButton from './AnimatedButton'
import SlotKarte from './SlotKarte'
import { standardMahlzeit } from '../mahlzeiten'
import { gefiltertePoolFuerRezepte, zufaelligesElement } from '../rezepteFilter'
import { aufPortionSkalieren, portionenMitMakroZielenBerechnen } from '../portionenRechner'
import { SPRING_REVEAL, motionPropsFuer } from '../motionConfig'

// mahlzeit und eigenschaft sind BEWUSST eigener, lokaler State (nicht der
// globale State der Einzel-Ansicht) - die bestehenden App.jsx-Handler fuer
// diese beiden Filter wuerfeln sofort auch die Einzel-Ansicht-Slots neu, was
// hier nicht passieren darf, nur weil man in der Rezepte-Ansicht einen
// anderen Filter waehlt. diaeten dagegen ist bewusst GETEILTER State (Prop
// von App.jsx) - Ernaehrungsform ist eine App-weite Praeferenz, dieselbe
// Instanz wie in der Einzel-Ansicht/im Einstellungen-Panel. ziel/makroZiele
// sind ebenfalls geteilter State - dieselben Kalorien-/Makro-Ziele wie in
// den Einstellungen, damit die Portionszahlen unten live darauf reagieren.
function RezepteAnsicht({ rezepte, zutatenNachId, diaeten, onDiaetenAendern, ziel, makroZiele }) {
  const reduzierteBewegung = useReducedMotion()
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)
  const [eigenschaft, setEigenschaft] = useState('')
  const [aktuellesRezept, setAktuellesRezept] = useState(null)
  // Merkt sich die zuletzt FEHLGESCHLAGENE bild_url (statt eines simplen
  // Boolean) - so setzt sich der Fallback beim naechsten Rezept automatisch
  // zurueck, sobald sich bild_url aendert, ganz ohne einen eigenen Reset-
  // Effekt fuer den Rezeptwechsel.
  const [fehlgeschlageneBildUrl, setFehlgeschlageneBildUrl] = useState(null)

  const pool = gefiltertePoolFuerRezepte(rezepte, mahlzeit, diaeten, eigenschaft)

  // Waehlt bei jeder Aenderung des (geteilten) Diaet-Filters ein neues
  // passendes Rezept, UND einmalig, sobald die Rezepte fertig geladen sind
  // (rezepte wechselt dann von [] auf die echten Eintraege). mahlzeit und
  // eigenschaft loesen die Neuauswahl stattdessen direkt in ihren eigenen
  // Aendern-Handlern unten aus (analog zum bestehenden Muster in App.jsx),
  // deshalb absichtlich NICHT in dieser Abhaengigkeitsliste.
  useEffect(() => {
    const aktuellerPool = gefiltertePoolFuerRezepte(rezepte, mahlzeit, diaeten, eigenschaft)
    setAktuellesRezept(aktuellerPool.length > 0 ? zufaelligesElement(aktuellerPool) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaeten, rezepte])

  function mahlzeitAendern(neueMahlzeit) {
    if (neueMahlzeit === mahlzeit) {
      return
    }
    const neuerPool = gefiltertePoolFuerRezepte(rezepte, neueMahlzeit, diaeten, eigenschaft)
    setMahlzeit(neueMahlzeit)
    setAktuellesRezept(neuerPool.length > 0 ? zufaelligesElement(neuerPool) : null)
  }

  function eigenschaftAendern(neueEigenschaft) {
    if (neueEigenschaft === eigenschaft) {
      return
    }
    const neuerPool = gefiltertePoolFuerRezepte(rezepte, mahlzeit, diaeten, neueEigenschaft)
    setEigenschaft(neueEigenschaft)
    setAktuellesRezept(neuerPool.length > 0 ? zufaelligesElement(neuerPool) : null)
  }

  // "Anderes Rezept wuerfeln": kompletter Kombinations-Wechsel innerhalb des
  // aktuellen Pools - kein Einzel-Slot-Reroll, das gibt es hier bewusst
  // nicht (wuerde die feste, garantiert passende Rezept-Kombination aufloesen).
  function rezeptWuerfeln() {
    setAktuellesRezept(pool.length > 0 ? zufaelligesElement(pool) : null)
  }

  // Baut aus einem Rezept alles, was die Karte zum Anzeigen braucht: die 4
  // referenzierten Zutaten-Objekte (Namens-/Naehrwert-Join gegen die schon
  // geladene zutatenNachId-Map) plus die LIVE berechneten Portionen/Summen.
  //
  // Bewusst KEIN State und KEIN eigener Effekt fuer die Portionen (anders
  // als in der Einzel-Ansicht, wo proteinPortion etc. State sind und nur bei
  // Wuerfeln/manueller Auswahl/Makro-Ziel-Aenderung explizit neu gesetzt
  // werden - eine reine Kalorienziel-Aenderung loest dort KEIN sofortiges
  // Neuberechnen aus). Hier reicht ein reiner Render-Wert: die 4 Zutaten
  // stehen durchs Rezept fest, es findet keine ziel-bewusste AUSWAHL mehr
  // statt (vergleichbar mit dem Pfad nach einer manuellen Wahl im
  // Reroll-Suchfeld) - nur noch Portionsberechnung. So reagieren die Zahlen
  // automatisch auf JEDE Aenderung von ziel/makroZiele in den Einstellungen.
  function rezeptKarteBerechnen(rezept) {
    if (!rezept) {
      return null
    }
    const proteinZutat = zutatenNachId[rezept.protein_zutat_id]
    const carbsZutat = zutatenNachId[rezept.carbs_zutat_id]
    const fettZutat = zutatenNachId[rezept.fett_zutat_id]
    const gemueseZutat = zutatenNachId[rezept.gemuese_obst_zutat_id]
    const makroZieleFuerRezept = makroZiele[rezept.mahlzeit] ?? { protein: '', carbs: '', fett: '' }

    const portionen = portionenMitMakroZielenBerechnen(
      proteinZutat,
      carbsZutat,
      fettZutat,
      gemueseZutat,
      rezept.mahlzeit,
      ziel,
      makroZieleFuerRezept
    )

    const summeKalorien =
      aufPortionSkalieren(proteinZutat.kalorien, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.kalorien, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.kalorien, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.kalorien, portionen.gemuesePortion)
    const summeProtein =
      aufPortionSkalieren(proteinZutat.protein_g, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.protein_g, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.protein_g, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.protein_g, portionen.gemuesePortion)
    const summeCarbs =
      aufPortionSkalieren(proteinZutat.carbs_g, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.carbs_g, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.carbs_g, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.carbs_g, portionen.gemuesePortion)
    const summeFett =
      aufPortionSkalieren(proteinZutat.fett_g, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.fett_g, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.fett_g, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.fett_g, portionen.gemuesePortion)

    return { proteinZutat, carbsZutat, fettZutat, gemueseZutat, makroZieleFuerRezept, portionen, summeKalorien, summeProtein, summeCarbs, summeFett }
  }

  const karte = rezeptKarteBerechnen(aktuellesRezept)
  const bildFehlgeschlagen = aktuellesRezept && fehlgeschlageneBildUrl === aktuellesRezept.bild_url

  return (
    <>
      <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />

      {(mahlzeit === 'fruehstueck' || mahlzeit === 'snack') && (
        <SuessDeftigFilter aktuell={eigenschaft} onAendern={eigenschaftAendern} />
      )}

      <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />

      {karte ? (
        <>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={aktuellesRezept.id}
              {...motionPropsFuer(reduzierteBewegung, {
                initial: { opacity: 0, scale: 0.95 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.95 },
                transition: SPRING_REVEAL,
              })}
              className="mx-4 mt-4 rounded-[14px] bg-card p-5 shadow-sm"
            >
              {aktuellesRezept.bild_url && !bildFehlgeschlagen ? (
                <img
                  src={aktuellesRezept.bild_url}
                  alt={aktuellesRezept.titel}
                  onError={() => setFehlgeschlageneBildUrl(aktuellesRezept.bild_url)}
                  className="h-56 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-56 w-full items-center justify-center rounded-2xl bg-secondary/10 text-text-muted">
                  <IconPhotoOff size={40} stroke={1.5} />
                </div>
              )}

              <h2 className="mt-4 font-display text-2xl font-semibold text-text">{aktuellesRezept.titel}</h2>
              <p className="mt-1 text-sm text-text-muted">{aktuellesRezept.beschreibung}</p>
            </motion.div>
          </AnimatePresence>

          <section className="mt-4 grid grid-cols-2 gap-4 px-4">
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

          <section className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Summe</h2>
            <p className="font-display text-3xl font-semibold text-text">{karte.summeKalorien.toFixed(1)} kcal</p>
            <p className="text-text-muted">
              P {karte.summeProtein.toFixed(1)}g · C {karte.summeCarbs.toFixed(1)}g · F {karte.summeFett.toFixed(1)}g
            </p>
          </section>
        </>
      ) : (
        <p className="mx-4 mt-4 text-text-muted">Für diese Filterkombination gibt es noch kein Rezept.</p>
      )}

      <AnimatedButton
        type="button"
        onClick={rezeptWuerfeln}
        disabled={pool.length === 0}
        className="m-4 rounded-lg bg-primary px-4 py-2 text-card disabled:opacity-50"
      >
        Anderes Rezept würfeln
      </AnimatedButton>
    </>
  )
}

export default RezepteAnsicht
