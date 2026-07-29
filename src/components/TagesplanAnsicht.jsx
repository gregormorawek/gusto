import SlotKarte from './SlotKarte'
import { MAHLZEITEN } from '../mahlzeiten'

// Zeigt den kompletten Tagesplan: eine Karte pro Mahlzeit-Typ mit den vier
// Zutaten-Slots (jeder einzeln neu wuerfelbar) und der jeweiligen
// Kalorien-Summe. Ersetzt waehrenddessen die Einzel-Mahlzeit-Ansicht in App.jsx.
function TagesplanAnsicht({ tagesplan, onSlotWuerfeln, onZurueck }) {
  return (
    <>
      <button type="button" onClick={onZurueck} className="mx-4 mt-2 text-sm text-primary hover:underline">
        ← zurück zur Einzel-Ansicht
      </button>

      {tagesplan.map((eintrag, index) => {
        const label = MAHLZEITEN.find((m) => m.slug === eintrag.mahlzeitTyp)?.label ?? eintrag.mahlzeitTyp

        return (
          <section
            key={eintrag.mahlzeitTyp}
            className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm"
          >
            <h2 className="font-display text-xl font-semibold text-text">{label}</h2>
            <p className="mb-2 text-sm text-text-muted">{eintrag.summeKalorien.toFixed(1)} kcal</p>

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
        )
      })}
    </>
  )
}

export default TagesplanAnsicht
