import { useLayoutEffect, useRef, useState } from 'react'
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
//
// GEFUNDENE URSACHE eines gemeldeten Real-Device-Bugs ("Rezepte-Ansicht ist
// minimal scrollbar, soll sie nicht sein"): RezeptSchwipKarte.jsx deckelt die
// Karte auf max-h-[52dvh] - ein fester Anteil der Viewport-Hoehe, kalibriert
// auf die FRUEHERE einzeilige Ueberschrift. Die neue zweizeilige Kopfzeile
// hier (Segment-Schalter + Tag-Zeile) ist ca. 48px hoeher, UND ihre Hoehe
// variiert zusaetzlich mit der Anzahl aktiver Filter-Tags (Umbruch auf 2
// Zeilen bei vielen langen Labels) - ein fester dvh-Wert kann das nicht mehr
// treffen, ohne entweder bei kurzen Viewports zu ueberlaufen
// (siehe Bugreport) oder bei jedem Filter-Zustand grosszuegig Luft zu
// verschenken. Deshalb wird die tatsaechlich verfuegbare Hoehe hier LIVE
// gemessen (per ResizeObserver) und als Budget an RezeptSchwipKarte
// durchgereicht, die daraus (abzueglich ihrer EIGENEN Margins/Gap/
// Mindesthoehe der Buttons-Reihe) die exakte maximale Kartenhoehe berechnet -
// "die Karte gibt nach", nicht die Seite.
//
// GEFUNDENE URSACHE eines ZWEITEN gemeldeten Real-Device-Bugs ("Karte rueckt
// beim Tab-Wechsel sichtbar nach" + "Karte nicht mittig, rechts mehr Abstand
// als links"): kopfHoehe/verfuegbareHoehe starten bei jedem Mount (der
// Rezepte-Tab wird beim Tab-Wechsel komplett neu gemountet) bei 0, solange
// die Messung noch nicht vorliegt faellt RezeptSchwipKarte auf ihre grobe
// max-h-[52dvh]-Schaetzung zurueck. Per MutationObserver/ResizeObserver-
// Protokollierung ueber die ersten Frames nach einem Tab-Wechsel gemessen
// (nicht vermutet): computed transform blieb waehrend der GESAMTEN Messung
// "none" - keine Animation beteiligt. Stattdessen aendern sich Hoehe UND
// Breite der Karte zwischen zwei echten Paints (z. B. 375x700 mit aktiven
// Filter-Tags: erster Paint bei Hoehe 364px/Breite 296px aus der reinen
// CSS-Schaetzung, zweiter Paint bei Hoehe 324px/Breite 311px aus der
// gemessenen kartenBudgetPx) - die schmalere Breite im ersten Paint sitzt
// wegen der festen mx-8-Raender links buendig statt zentriert (32px links,
// 47px rechts), genau das gemeldete Zentrierungsproblem. Beide Symptome sind
// also dieselbe Ursache aus zwei Blickwinkeln.
//
// Der Grund, warum die synchrone berechnen()-Messung in den Effekten unten
// den ersten Paint trotzdem nicht abfaengt: einfaches useEffect laeuft
// IMMER erst NACH dem ersten Browser-Paint (das ist der ganze Sinn von
// useEffect gegenueber useLayoutEffect). Fix: useLayoutEffect statt
// useEffect - das laeuft synchron NACH den DOM-Mutationen, aber VOR dem
// Paint, ein darin synchron aufgerufenes setState committet die korrekten
// Werte also noch VOR dem allerersten sichtbaren Frame. Der ResizeObserver
// bleibt fuer SPAETERE echte Aenderungen (Filter-Tags aendern die
// Kopfzeilen-Hoehe, Geraet wird gedreht) weiterhin bestehen - nur der
// initiale Messwert wird jetzt zusaetzlich synchron vorweggenommen.
const KOPF_MARGIN_TOP_PX = 4 // mt-1 auf dem Kopf-Container unten

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

  // kopfRef misst die tatsaechliche Hoehe der Kopfzeile (Segment-Schalter +
  // Tag-Zeile), scrollContainerRef.current?.parentElement ist der App.jsx-
  // Scroll-Wrapper (".flex-1.min-h-0.overflow-y-auto...", direktes Eltern-
  // Element dieser Komponente) - dessen clientHeight minus seiner eigenen
  // (Safe-Area-abhaengigen) Padding-Werte ist die WIRKLICH verfuegbare Hoehe,
  // unabhaengig davon, ob der eigene Inhalt gerade ueberlaeuft (overflow-
  // y-auto aendert die eigene Groesse des Containers nicht). getComputedStyle
  // loest env(safe-area-inset-*) automatisch in echte Pixel auf - auf dem
  // Geraet (Notch/Home-Indicator) automatisch korrekt, ohne dass diese Werte
  // hier dupliziert werden muessten.
  const wurzelRef = useRef(null)
  const kopfRef = useRef(null)
  const [kopfHoehe, setKopfHoehe] = useState(0)
  const [verfuegbareHoehe, setVerfuegbareHoehe] = useState(0)

  useLayoutEffect(() => {
    const kopfEl = kopfRef.current
    if (!kopfEl) {
      return undefined
    }
    // Synchrone Erstmessung VOR dem ersten Paint (siehe Kommentar oben) -
    // der ResizeObserver darunter uebernimmt danach nur noch SPAETERE
    // Aenderungen (z. B. Filter-Tags wechseln die Zeilenanzahl).
    setKopfHoehe(kopfEl.getBoundingClientRect().height)
    const beobachter = new ResizeObserver(([eintrag]) => setKopfHoehe(eintrag.contentRect.height))
    beobachter.observe(kopfEl)
    return () => beobachter.disconnect()
  }, [])

  useLayoutEffect(() => {
    const scrollContainer = wurzelRef.current?.parentElement
    if (!scrollContainer) {
      return undefined
    }
    const berechnen = () => {
      const stil = getComputedStyle(scrollContainer)
      setVerfuegbareHoehe(scrollContainer.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom))
    }
    berechnen()
    const beobachter = new ResizeObserver(berechnen)
    beobachter.observe(scrollContainer)
    return () => beobachter.disconnect()
  }, [])

  // null solange noch nicht beide Messungen vorliegen (allererster Render,
  // vor dem ersten ResizeObserver-Callback) - RezeptSchwipKarte faellt dann
  // auf ihre eigene grobe max-h-[52dvh]-Anfangsschaetzung zurueck.
  const kartenBudgetPx = kopfHoehe > 0 && verfuegbareHoehe > 0 ? verfuegbareHoehe - kopfHoehe - KOPF_MARGIN_TOP_PX : null

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
    <div ref={wurzelRef} className="flex min-h-full flex-col">
      <div ref={kopfRef} className="mx-4 mt-1 shrink-0">
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
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-dark px-1 text-[10px] font-semibold text-on-primary">
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
        kartenBudgetPx={kartenBudgetPx}
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
