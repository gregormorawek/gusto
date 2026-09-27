import { useState } from 'react'
import { IconAdjustmentsHorizontal, IconX } from '@tabler/icons-react'
import SegmentSchalter from './SegmentSchalter'
import FilterSheet, { GESCHMACK_OPTIONEN } from './FilterSheet'
import RezeptSchwipKarte from './RezeptSchwipKarte'
import { DIAETEN } from './DiaetFilter'
import { aktiveMahlzeitenFuer } from '../mahlzeiten'
import { gefiltertePoolFuerRezepte } from '../rezepteFilter'

// RezepteSwipeAnsicht ersetzt RezepteAnsicht.jsx als Hauptbildschirm des
// Rezepte-Tabs (Rezepte-Swipe-Pivot, siehe Plan floating-mixing-shannon.md).
// Anders als die fruehere RezepteAnsicht.jsx gibt es HIER keine Einzel-/
// Tagesplan-Weiche mehr - die Ansicht verhaelt sich fuer alle drei
// ziel.typ-Werte identisch, siehe dortiger Kommentar in App.jsx. Der
// Browsing-Kandidat pro Mahlzeit kommt ausschliesslich aus proMahlzeitState
// (App.jsx, ein Eintrag pro Mahlzeit-Typ), aktuelleMahlzeit waehlt aus,
// welcher Eintrag gerade als grosse Swipe-Karte gezeigt wird.
//
// Kopfzeile-Redesign (abgeloest: die alte "Alles"-Pille mit verstecktem
// Dropdown-Panel, siehe Git-Historie) - Grund: die Pille zeigte IMMER
// "Alles", auch bei aktiven Filtern, man sah nie auf einen Blick, was
// gerade eingestellt ist. Jetzt zwei Zeilen:
// 1. Ein textbasierter iOS-Segment-Schalter fuer den Mahlzeit-Wechsel (ersetzt
//    die fruehere grosse Ueberschrift), NUR mit den laut Einstellungen
//    aktivierten Mahlzeiten (aktiveMahlzeitenListe).
// 2. Aktive Filter als entfernbare Tags (links) + ein runder Filter-Knopf mit
//    Zaehler-Badge (rechts), der FilterSheet.jsx oeffnet.
function RezepteSwipeAnsicht({
  rezepteGeladen,
  rezepte,
  diaeten,
  onDiaetenAendern,
  aktiveMahlzeiten,
  aktuelleMahlzeit,
  onMahlzeitAendern,
  proMahlzeitState,
  onEigenschaftAendern,
  onFilterAnwenden,
  onWuerfeln,
  onUebernehmen,
  onKochModusOeffnen,
}) {
  const [filterSheetOffen, setFilterSheetOffen] = useState(false)

  const aktiveMahlzeitenListe = aktiveMahlzeitenFuer(aktiveMahlzeiten)

  const aktuellerEintrag = proMahlzeitState[aktuelleMahlzeit]
  const aktuellesRezept = aktuellerEintrag?.rezept ?? null
  const aktuelleEigenschaft = aktuellerEintrag?.eigenschaft ?? ''
  const aktuellerPool = gefiltertePoolFuerRezepte(rezepte, aktuelleMahlzeit, diaeten, aktuelleEigenschaft)

  // Geschmack (Suess/Deftig) ist nur bei fruehstueck/snack ueberhaupt ein
  // echter Filter (siehe gefiltertePoolFuerRezepte) - ausserhalb dieser
  // beiden Mahlzeiten deshalb NIE als Tag zeigen, selbst wenn im State noch
  // ein alter Wert haengt (kann rein technisch nicht passieren, siehe
  // App.jsx, aber die Bedingung hier ist die einzige Quelle der Wahrheit
  // fuer "zeigt dieser Filter gerade ueberhaupt etwas an").
  const geschmackAktiv = (aktuelleMahlzeit === 'fruehstueck' || aktuelleMahlzeit === 'snack') && aktuelleEigenschaft !== ''

  // Aktive Filter-Tags: Diaetformen (ohne "keine" - das ist kein echter
  // DB-Tag, sondern die Abwesenheit einer Einschraenkung) plus - nur wenn
  // gerade relevant - der Geschmack. Labels kommen aus DIAETEN/
  // GESCHMACK_OPTIONEN statt hier ein zweites Mal gepflegt zu werden.
  const diaetTags = DIAETEN.filter(({ slug }) => slug !== 'keine' && diaeten.includes(slug)).map(({ slug, label }) => ({
    slug,
    label,
    onEntfernen: () => onDiaetenAendern(slug),
  }))
  const geschmackTags = geschmackAktiv
    ? [
        {
          slug: aktuelleEigenschaft,
          label: GESCHMACK_OPTIONEN.find((option) => option.slug === aktuelleEigenschaft)?.label ?? '',
          onEntfernen: () => onEigenschaftAendern(''),
        },
      ]
    : []
  const aktiveTags = [...diaetTags, ...geschmackTags]
  const filterAktiv = aktiveTags.length > 0

  return (
    // min-h-full statt h-full: streckt sich auf mind. die Hoehe des
    // umgebenden Scroll-Containers (App.jsx, .flex-1.min-h-0.overflow-y-auto)
    // - das gibt RezeptSchwipKarte weiter unten ueberhaupt erst einen echten
    // flex-1-Raum, den es fuer die Button-/Hinweistext-Zentrierung braucht
    // (siehe dortiger Kommentar, Real-Device-Bugreport "Buttons vertikal
    // nicht mittig"). "min-" statt eines harten h-full: auf sehr kurzen
    // Viewports darf der Inhalt (Kopfzeile + Karte + Buttons) trotzdem ueber
    // diese Mindesthoehe hinauswachsen und im Scroll-Container scrollen,
    // statt hart abgeschnitten zu werden.
    <div className="flex min-h-full flex-col">
      <div className="mx-4 mt-1 shrink-0">
        <SegmentSchalter optionen={aktiveMahlzeitenListe} aktuell={aktuelleMahlzeit} onAendern={onMahlzeitAendern} />

        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-1.5">
            {aktiveTags.map(({ slug, label, onEntfernen }) => (
              <button
                key={slug}
                type="button"
                onClick={onEntfernen}
                aria-label={`${label}-Filter entfernen`}
                className="flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-medium text-text shadow-sm"
              >
                {label}
                <IconX size={12} stroke={2.5} />
              </button>
            ))}
          </div>

          {/* 44px (h-11/w-11) laut Vorgabe - ausreichend grosse Tap-Flaeche
              auch neben den kleineren Tag-Chips daneben. Badge nur bei
              mindestens einem aktiven Filter, siehe filterAktiv. */}
          <button
            type="button"
            onClick={() => setFilterSheetOffen(true)}
            aria-label="Filter öffnen"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-text-muted/30 bg-card text-text shadow-sm"
          >
            <IconAdjustmentsHorizontal size={20} stroke={1.75} />
            {filterAktiv && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-dark px-1 text-[10px] font-semibold text-card">
                {aktiveTags.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <RezeptSchwipKarte
        rezepteGeladen={rezepteGeladen}
        rezept={aktuellesRezept}
        onWuerfeln={onWuerfeln}
        wuerfelnDeaktiviert={aktuellerPool.length === 0}
        onUebernehmen={onUebernehmen}
        onKochModusOeffnen={onKochModusOeffnen}
        filterAktiv={filterAktiv}
        onFilterAnpassen={() => setFilterSheetOffen(true)}
      />

      <FilterSheet
        offen={filterSheetOffen}
        onSchliessen={() => setFilterSheetOffen(false)}
        aktuelleMahlzeit={aktuelleMahlzeit}
        diaeten={diaeten}
        eigenschaftFuerMahlzeit={aktuelleEigenschaft}
        rezepte={rezepte}
        onFilterAnwenden={onFilterAnwenden}
      />
    </div>
  )
}

export default RezepteSwipeAnsicht
