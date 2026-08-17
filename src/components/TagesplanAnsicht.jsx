import { useEffect, useRef, useState } from 'react'
import TagesplanZutatZeile from './TagesplanZutatZeile'
import TagesplanSucheOverlay from './TagesplanSucheOverlay'
import AnimatedButton from './AnimatedButton'
import { MAHLZEITEN } from '../mahlzeiten'
import { gefiltertePoolFuer, vierterSlotOptionenFuer } from '../zutatenFilter'

// Findet zu einem Mahlzeit-Slug das Anzeige-Label, z. B. "fruehstueck" -> "Frühstück".
function labelFuer(mahlzeitTyp) {
  return MAHLZEITEN.find((m) => m.slug === mahlzeitTyp)?.label ?? mahlzeitTyp
}

// Kleines Badge-Pill fuer die Mahlzeit-Kopfzeile (kcal/Makro-Werte) - ton
// waehlt zwischen den beiden erlaubten Marken-Tokens bei ~15% Deckkraft,
// passende volle Textfarbe darauf.
function MakroPill({ ton, children }) {
  const klassen = ton === 'primary' ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary'
  return <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${klassen}`}>{children}</span>
}

// Ab wie vielen aufeinanderfolgenden Rerolls DESSELBEN Slots das Suchfeld
// automatisch erscheint - identischer Wert wie in App.jsx (Einzel-Ansicht).
const REROLL_SCHWELLE_FUER_SUCHE = 3

// Feste Reihenfolge der 4 Kategorien PRO Mahlzeit-Eintrag, fuer den
// Zaehler-Vergleich im Effekt unten (welcher der bis zu 16 Slots - 4
// Mahlzeiten x 4 Kategorien - ist gerade erst ueber die Reroll-Schwelle
// gestiegen).
const KATEGORIEN = ['protein', 'carbs', 'fett', 'gemuese']

// Zeigt den kompletten Tagesplan kompakt: eine schlanke Zutaten-Zeile pro
// Slot (TagesplanZutatZeile, KEINE SlotKarte-Kacheln mehr) unter einem
// schmalen Mahlzeit-Label, alle 4 Mahlzeiten gleichzeitig sichtbar (Option
// B - anders als der Rezepte-Tagesplan, der stattdessen Tabs verwendet, weil
// hier bewusst der ganze Tag auf einen Blick sichtbar bleiben soll). Ersetzt
// SlotKarte NUR hier - Einzel-Ansicht und Rezepte-Tab bleiben unveraendert.
//
// Die pro-Mahlzeit-Kalorien/Makro-Zeile bleibt UNVERAENDERT (auf Wunsch,
// nicht Teil der Verdichtung) - einzig die bisherige, komplett redundante
// "Tagesuebersicht"-Sektion am Seitenende (dieselben Summen ein zweites Mal
// aufgelistet) faellt weg, ersetzt durch eine kompakte Tages-Summen-Zeile
// ganz oben (analog zum Rezepte-Tagesplan, siehe RezepteAnsicht.jsx).
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

  // { index, kategorie } des Slots, dessen Reroll-Suchfeld gerade als
  // Overlay offen ist - null, wenn keins offen ist.
  const [sucheSlot, setSucheSlot] = useState(null)
  // Merkt sich den zuletzt gesehenen tagesplanRerollZaehler-Stand, um beim
  // naechsten Rendern zu erkennen, WELCHER Slot-Zaehler sich seit dem
  // letzten Mal erhoeht hat (siehe Kommentar im Effekt unten).
  const vorherigeZaehler = useRef(null)

  // Oeffnet das Such-Overlay automatisch, sobald ein Slot GERADE ERST ueber
  // die Reroll-Schwelle gestiegen ist ("neu > alt", nicht nur "neu >=
  // Schwelle"!). Der Unterschied ist entscheidend: eine reine Ableitung
  // "zeige Overlay, wenn Zaehler >= Schwelle" wuerde ein per Backdrop-Klick
  // geschlossenes Overlay bei JEDEM weiteren Re-Render (z. B. durch einen
  // Reroll an ganz anderer Stelle) sofort wieder oeffnen, weil der Zaehler
  // ja weiterhin >= Schwelle bleibt - der User haette gar keine Moeglichkeit,
  // es zuzuklappen. Mit dem "gerade erst gestiegen"-Vergleich wird das
  // Oeffnen zu einem einmaligen Ereignis PRO Reroll: der User kann es per
  // Backdrop-Klick schliessen, und ein erneuter Reroll desselben Slots
  // (Zaehler steigt weiter, 3 -> 4 -> 5 ...) oeffnet es bewusst wieder -
  // exakt das bisherige "wird nach jedem weiteren Reroll erneut angeboten"-
  // Verhalten von SlotKarte, nur jetzt schliessbar.
  useEffect(() => {
    if (vorherigeZaehler.current) {
      for (let index = 0; index < tagesplanRerollZaehler.length; index++) {
        for (const kategorie of KATEGORIEN) {
          const neu = tagesplanRerollZaehler[index][kategorie]
          const alt = vorherigeZaehler.current[index]?.[kategorie] ?? 0
          if (neu > alt && neu >= REROLL_SCHWELLE_FUER_SUCHE) {
            setSucheSlot({ index, kategorie })
          }
        }
      }
    }
    vorherigeZaehler.current = tagesplanRerollZaehler
  }, [tagesplanRerollZaehler])

  // Baut aus dem offenen sucheSlot (nur index+kategorie) die Anzeige-Daten
  // fuers Overlay: Titel + EXAKT derselbe gefilterte Pool wie beim Wuerfeln
  // dieses Slots (siehe tagesplanSlotWuerfeln in App.jsx). null, wenn gerade
  // kein Overlay offen ist.
  function overlaySlotDaten() {
    if (!sucheSlot) {
      return null
    }
    const eintrag = tagesplan[sucheSlot.index]
    const poolNachKategorie = {
      protein: gefiltertePoolFuer(proteinOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig),
      carbs: gefiltertePoolFuer(carbsOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig),
      fett: gefiltertePoolFuer(fettOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig),
      gemuese: vierterSlotOptionenFuer(gemueseOptionen, obstOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig),
    }
    const titelNachKategorie = {
      protein: 'Protein',
      carbs: 'Kohlenhydrate',
      fett: 'Fett',
      gemuese: eintrag.gemuese.kategorie === 'obst' ? 'Obst' : 'Gemüse',
    }
    return { titel: titelNachKategorie[sucheSlot.kategorie], suchPool: poolNachKategorie[sucheSlot.kategorie] }
  }

  function zutatImOverlayWaehlen(zutat) {
    if (!sucheSlot) {
      return
    }
    onZutatWaehlen(sucheSlot.index, sucheSlot.kategorie, zutat)
    setSucheSlot(null)
  }

  return (
    <>
      <div className="mx-4 mt-2 flex items-center gap-4">
        <AnimatedButton type="button" onClick={onZurueck} className="text-sm text-primary hover:underline">
          ← Zurück
        </AnimatedButton>
        <AnimatedButton type="button" onClick={onMahlzeitenAnpassen} className="text-sm text-primary hover:underline">
          Mahlzeiten anpassen
        </AnimatedButton>
      </div>

      {/* Ersetzt die bisherige "Tagesuebersicht"-Sektion am Seitenende
          (dieselben Summen wurden dort ein zweites Mal aufgelistet) - Tages-
          Gesamtsumme + "Ganzen Tag neu planen" teilen sich EINE kompakte
          Zeile, analog zur Tages-Summen-Zeile im Rezepte-Tagesplan
          (RezepteAnsicht.jsx, RezepteTagesplan). */}
      <div className="mx-4 mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-text-muted">
          Tag gesamt: <span className="font-semibold text-text">{gesamtKalorien.toFixed(0)} kcal</span> · P{' '}
          {gesamtProtein.toFixed(0)}g · C {gesamtCarbs.toFixed(0)}g · F {gesamtFett.toFixed(0)}g
        </p>
        <AnimatedButton type="button" onClick={onNeuPlanen} className="shrink-0 text-sm text-primary hover:underline">
          Ganzen Tag neu planen
        </AnimatedButton>
      </div>

      {tagesplan.map((eintrag, index) => (
        <div
          key={eintrag.mahlzeitTyp}
          className={`mx-4 mt-3 ${index === tagesplan.length - 1 ? 'mb-4' : ''}`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">{labelFuer(eintrag.mahlzeitTyp)}</h2>
          {/* Dieselben Werte wie bisher (Fliesstext-Zeile) - jetzt als kleine
              Badge-Pills statt eines Satzes: kcal terrakotta-getoent (die
              "Headline"-Zahl), P/C/F gemeinsam oliv-getoent (die
              Aufschluesselung darunter) - beides aus den bestehenden
              primary/secondary-Tokens bei ~15% Deckkraft. */}
          <div className="mb-1 flex flex-wrap gap-1">
            <MakroPill ton="primary">{eintrag.summeKalorien.toFixed(0)} kcal</MakroPill>
            <MakroPill ton="secondary">P {eintrag.summeProtein.toFixed(1)}g</MakroPill>
            <MakroPill ton="secondary">C {eintrag.summeCarbs.toFixed(1)}g</MakroPill>
            <MakroPill ton="secondary">F {eintrag.summeFett.toFixed(1)}g</MakroPill>
          </div>

          <div>
            <TagesplanZutatZeile
              titel="Protein"
              text={eintrag.protein.name}
              portion={eintrag.proteinPortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'protein')}
              zielWert={eintrag.proteinZielG}
              zielErreichbar={eintrag.proteinZielErreichbar}
            />
            <TagesplanZutatZeile
              titel="Kohlenhydrate"
              text={eintrag.carbs.name}
              portion={eintrag.carbsPortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'carbs')}
              zielWert={eintrag.carbsZielG}
              zielErreichbar={eintrag.carbsZielErreichbar}
            />
            <TagesplanZutatZeile
              titel="Fett"
              text={eintrag.fett.name}
              portion={eintrag.fettPortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'fett')}
              zielWert={eintrag.fettZielG}
              zielErreichbar={eintrag.fettZielErreichbar}
            />
            <TagesplanZutatZeile
              titel={eintrag.gemuese.kategorie === 'obst' ? 'Obst' : 'Gemüse'}
              text={eintrag.gemuese.name}
              portion={eintrag.gemuesePortion}
              onWuerfeln={() => onSlotWuerfeln(index, 'gemuese')}
            />
          </div>
        </div>
      ))}

      <TagesplanSucheOverlay slot={overlaySlotDaten()} onWaehlen={zutatImOverlayWaehlen} onSchliessen={() => setSucheSlot(null)} />
    </>
  )
}

export default TagesplanAnsicht
