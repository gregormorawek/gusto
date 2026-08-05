import SlotKarte from './SlotKarte'
import { MAHLZEITEN } from '../mahlzeiten'
import { gefiltertePoolFuer, vierterSlotOptionenFuer } from '../zutatenFilter'

// Findet zu einem Mahlzeit-Slug das Anzeige-Label, z. B. "fruehstueck" -> "Frühstück".
function labelFuer(mahlzeitTyp) {
  return MAHLZEITEN.find((m) => m.slug === mahlzeitTyp)?.label ?? mahlzeitTyp
}

// Ab wie vielen aufeinanderfolgenden Rerolls DESSELBEN Slots das Suchfeld
// automatisch erscheint - identischer Wert wie in App.jsx (Einzel-Ansicht).
const REROLL_SCHWELLE_FUER_SUCHE = 3

// Zeigt den kompletten Tagesplan: eine Karte pro Mahlzeit-Typ mit den vier
// Zutaten-Slots (jeder einzeln neu wuerfelbar) und der jeweiligen
// Naehrwert-Summe, darunter eine Tagesuebersicht mit Gesamt-Summen und
// kompakter Auflistung pro Mahlzeit. tagesplanRerollZaehler/onZutatWaehlen
// sowie die *Optionen-Listen und diaeten/suessDeftig werden fuers Suchfeld
// gebraucht (siehe SlotKarte) - der Such-Pool wird PRO EINTRAG unten exakt
// mit denselben Filterfunktionen berechnet wie beim Wuerfeln.
function TagesplanAnsicht({
  tagesplan,
  tagesplanRerollZaehler,
  onSlotWuerfeln,
  onZutatWaehlen,
  proteinOptionen,
  carbsOptionen,
  fettOptionen,
  gemueseOptionen,
  obstOptionen,
  diaeten,
  suessDeftig,
  onZurueck,
  onMahlzeitenAnpassen,
  onNeuPlanen,
}) {
  // Die Tagesuebersicht ist KEIN eigener State, sondern wird bei jedem
  // Rendern frisch aus den vier Mahlzeit-Eintraegen summiert.
  const gesamtKalorien = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeKalorien, 0)
  const gesamtProtein = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeProtein, 0)
  const gesamtCarbs = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeCarbs, 0)
  const gesamtFett = tagesplan.reduce((summe, eintrag) => summe + eintrag.summeFett, 0)

  return (
    <>
      <div className="mx-4 mt-2 flex items-center gap-4">
        <button type="button" onClick={onZurueck} className="text-sm text-primary hover:underline">
          ← Zurück
        </button>
        <button type="button" onClick={onMahlzeitenAnpassen} className="text-sm text-primary hover:underline">
          Mahlzeiten anpassen
        </button>
      </div>

      {tagesplan.map((eintrag, index) => {
        // Exakt derselbe gefilterte Pool wie beim Wuerfeln dieser Mahlzeit
        // (siehe tagesplanSlotWuerfeln in App.jsx) - berechnet pro Eintrag,
        // weil jede Mahlzeit ihren eigenen mahlzeitTyp hat.
        const proteinSuchPool = gefiltertePoolFuer(proteinOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig)
        const carbsSuchPool = gefiltertePoolFuer(carbsOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig)
        const fettSuchPool = gefiltertePoolFuer(fettOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig)
        const gemueseSuchPool = vierterSlotOptionenFuer(gemueseOptionen, obstOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig)
        const zaehler = tagesplanRerollZaehler[index]

        return (
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
                zielWert={eintrag.proteinZielG}
                zielErreichbar={eintrag.proteinZielErreichbar}
                sucheAnzeigen={zaehler.protein >= REROLL_SCHWELLE_FUER_SUCHE}
                suchPool={proteinSuchPool}
                onZutatWaehlen={(zutat) => onZutatWaehlen(index, 'protein', zutat)}
              />
              <SlotKarte
                titel="Carbs"
                text={eintrag.carbs.name}
                portion={eintrag.carbsPortion}
                onWuerfeln={() => onSlotWuerfeln(index, 'carbs')}
                zielWert={eintrag.carbsZielG}
                zielErreichbar={eintrag.carbsZielErreichbar}
                sucheAnzeigen={zaehler.carbs >= REROLL_SCHWELLE_FUER_SUCHE}
                suchPool={carbsSuchPool}
                onZutatWaehlen={(zutat) => onZutatWaehlen(index, 'carbs', zutat)}
              />
              <SlotKarte
                titel="Fett"
                text={eintrag.fett.name}
                portion={eintrag.fettPortion}
                onWuerfeln={() => onSlotWuerfeln(index, 'fett')}
                zielWert={eintrag.fettZielG}
                zielErreichbar={eintrag.fettZielErreichbar}
                sucheAnzeigen={zaehler.fett >= REROLL_SCHWELLE_FUER_SUCHE}
                suchPool={fettSuchPool}
                onZutatWaehlen={(zutat) => onZutatWaehlen(index, 'fett', zutat)}
              />
              <SlotKarte
                titel={eintrag.gemuese.kategorie === 'obst' ? 'Obst' : 'Gemüse'}
                text={eintrag.gemuese.name}
                portion={eintrag.gemuesePortion}
                onWuerfeln={() => onSlotWuerfeln(index, 'gemuese')}
                sucheAnzeigen={zaehler.gemuese >= REROLL_SCHWELLE_FUER_SUCHE}
                suchPool={gemueseSuchPool}
                onZutatWaehlen={(zutat) => onZutatWaehlen(index, 'gemuese', zutat)}
              />
            </div>
          </section>
        )
      })}

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
