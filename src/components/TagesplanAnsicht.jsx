import SlotKarte from './SlotKarte'
import { MAHLZEITEN } from '../mahlzeiten'

// Findet zu einem Mahlzeit-Slug das Anzeige-Label, z. B. "fruehstueck" -> "Frühstück".
function labelFuer(mahlzeitTyp) {
  return MAHLZEITEN.find((m) => m.slug === mahlzeitTyp)?.label ?? mahlzeitTyp
}

// Zeigt den kompletten Tagesplan: eine Karte pro Mahlzeit-Typ mit den vier
// Zutaten-Slots (jeder einzeln neu wuerfelbar) und der jeweiligen
// Naehrwert-Summe, darunter eine Tagesuebersicht mit Gesamt-Summen und
// kompakter Auflistung pro Mahlzeit. Ersetzt waehrenddessen die
// Einzel-Mahlzeit-Ansicht in App.jsx.
function TagesplanAnsicht({ tagesplan, onSlotWuerfeln, onZurueck, onNeuPlanen }) {
  // Die Tagesuebersicht ist KEIN eigener State, sondern wird bei jedem
  // Rendern frisch aus den vier Mahlzeit-Eintraegen summiert.
  const gesamtKalorien = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeKalorien, 0)
  const gesamtProtein = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeProtein, 0)
  const gesamtCarbs = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeCarbs, 0)
  const gesamtFett = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeFett, 0)

  return (
    <>
      <button type="button" onClick={onZurueck} className="mx-4 mt-2 text-sm text-primary hover:underline">
        ← zurück zur Einzel-Ansicht
      </button>

      {tagesplan.map((eintrag, index) => (
        <section
          key={eintrag.mahlzeitTyp}
          className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm"
        >
          <h2 className="font-display text-xl font-semibold text-text">{labelFuer(eintrag.mahlzeitTyp)}</h2>
          <p className="mb-2 text-sm text-text-muted">
            {eintrag.summeKalorien.toFixed(1)} kcal · P {eintrag.summeProtein.toFixed(1)}g · C{' '}
            {eintrag.summeCarbs.toFixed(1)}g · F {eintrag.summeFett.toFixed(1)}g
          </p>

          <div className="grid grid-cols-2 gap-4">
            <SlotKarte
              titel="Protein"
              text={eintrag.protein.name}
              portion={eintrag.proteinPortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'protein')}
            />
            <SlotKarte
              titel="Carbs"
              text={eintrag.carbs.name}
              portion={eintrag.carbsPortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'carbs')}
            />
            <SlotKarte
              titel="Fett"
              text={eintrag.fett.name}
              portion={eintrag.fettPortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'fett')}
            />
            <SlotKarte
              titel="Gemüse"
              text={eintrag.gemuese.name}
              portion={eintrag.gemuesePortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'gemuese')}
            />
          </div>
        </section>
      ))}

      <section id="tagesuebersicht" className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Tagesübersicht</h2>
        <p className="font-display text-3xl font-semibold text-text">{gesamtKalorien.toFixed(1)} kcal</p>
        <p className="text-text-muted">
          P {gesamtProtein.toFixed(1)}g · C {gesamtCarbs.toFixed(1)}g · F {gesamtFett.toFixed(1)}g
        </p>

        <ul className="mt-3 space-y-1 text-sm text-text-muted">
          {tagesplan.map((eintrag) => (
            <li key={eintrag.mahlzeitTyp}>
              {labelFuer(eintrag.mahlzeitTyp)}: {eintrag.summeKalorien.toFixed(1)} kcal · P{' '}
              {eintrag.summeProtein.toFixed(1)}g · C {eintrag.summeCarbs.toFixed(1)}g · F{' '}
              {eintrag.summeFett.toFixed(1)}g
            </li>
          ))}
        </ul>
      </section>

      <button type="button" onClick={onNeuPlanen} className="m-4 rounded-lg bg-primary px-4 py-2 text-card">
        Ganzen Tag neu planen
      </button>
    </>
  )
}

export default TagesplanAnsicht
