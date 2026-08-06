import { useEffect, useState } from 'react'
import MahlzeitFilter from './MahlzeitFilter'
import SuessDeftigFilter from './SuessDeftigFilter'
import DiaetFilter from './DiaetFilter'
import AnimatedButton from './AnimatedButton'
import { standardMahlzeit } from '../mahlzeiten'
import { gefiltertePoolFuerRezepte, zufaelligesElement } from '../rezepteFilter'

// Schlichte Platzhalter-Anzeige fuer Schritt 2 (Navigation + Datenlogik) -
// wird in Schritt 3 durch die polierte Anzeige (Bild, Live-Makroberechnung,
// Animationen) ersetzt. Hier soll nur verifizierbar sein, dass
// Filter+Zufallsauswahl+Datenzugriff korrekt funktionieren.
//
// mahlzeit und eigenschaft sind BEWUSST eigener, lokaler State (nicht der
// globale State der Einzel-Ansicht) - die bestehenden App.jsx-Handler fuer
// diese beiden Filter wuerfeln sofort auch die Einzel-Ansicht-Slots neu, was
// hier nicht passieren darf, nur weil man in der Rezepte-Ansicht einen
// anderen Filter waehlt. diaeten dagegen ist bewusst GETEILTER State (Prop
// von App.jsx) - Ernaehrungsform ist eine App-weite Praeferenz, dieselbe
// Instanz wie in der Einzel-Ansicht/im Einstellungen-Panel.
function RezepteAnsicht({ rezepte, zutatenNachId, diaeten, onDiaetenAendern }) {
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)
  const [eigenschaft, setEigenschaft] = useState('')
  const [aktuellesRezept, setAktuellesRezept] = useState(null)

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

  const zutatName = (id) => zutatenNachId[id]?.name ?? '?'

  return (
    <>
      <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />

      {(mahlzeit === 'fruehstueck' || mahlzeit === 'snack') && (
        <SuessDeftigFilter aktuell={eigenschaft} onAendern={eigenschaftAendern} />
      )}

      <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />

      {aktuellesRezept ? (
        <section className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-text">{aktuellesRezept.titel}</h2>
          <p className="mt-1 text-text-muted">{aktuellesRezept.beschreibung}</p>
          <ul className="mt-3 list-disc pl-5 text-text">
            <li>{zutatName(aktuellesRezept.protein_zutat_id)}</li>
            <li>{zutatName(aktuellesRezept.carbs_zutat_id)}</li>
            <li>{zutatName(aktuellesRezept.fett_zutat_id)}</li>
            <li>{zutatName(aktuellesRezept.gemuese_obst_zutat_id)}</li>
          </ul>
        </section>
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
