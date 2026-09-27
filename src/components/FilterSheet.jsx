import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import AnimatedButton from './AnimatedButton'
import SegmentSchalter from './SegmentSchalter'
import DiaetFilter from './DiaetFilter'
import { gefiltertePoolFuerRezepte, diaetenUmschalten } from '../rezepteFilter'
import { SHEET_SLIDE_UEBERGANG, SPRING_REVEAL } from '../motionConfig'

// Exportiert, damit RezepteSwipeAnsicht.jsx daraus das Label fuer den
// aktiven Geschmack-Filter-Tag ableiten kann, ohne "Süß"/"Deftig" dort ein
// zweites Mal zu pflegen.
export const GESCHMACK_OPTIONEN = [
  { slug: '', label: 'Alle' },
  { slug: 'suess', label: 'Süß' },
  { slug: 'deftig', label: 'Deftig' },
]

// Ab welcher Ziehdistanz bzw. -geschwindigkeit ein Loslassen als "schliessen"
// statt "zurueckschnappen" gilt - kleinere Distanz als KochModus.jsx
// (dortiges Sheet ist fast bildschirmfuellend, dieses hier ist deutlich
// kuerzer, ein proportional kuerzerer Schwellwert fuehlt sich dadurch gleich
// "leicht" an statt unverhaeltnismaessig schwergaengig).
const SCHLIESS_DISTANZ_PX = 90
const SCHLIESS_GESCHWINDIGKEIT_PX_S = 500

// Gleiche Backdrop-Mechanik wie KochModus.jsx (siehe dortige Herleitung:
// color-mix() statt opacity, damit backdrop-filter nicht mitverduennt wird),
// aber etwas dezenter (kleineres Sheet, weniger Verdunklung noetig).
const BACKDROP_BLUR_MAX_PX = 10
const BACKDROP_DIM_MAX_PERCENT = 40

const DRAG_SCHLIESSEN_SPRING = { type: 'spring', stiffness: 300, damping: 32 }

// Eigentlicher Sheet-Inhalt - ausgelagert aus FilterSheet (siehe ganz unten),
// damit Entwurfs-State/y/dragControls/ResizeObserver bei JEDEM Oeffnen als
// FRISCHE Hooks-Instanz entstehen (wird von AnimatePresence bei offen=false
// komplett unmounted, gleiches Muster wie KochModusSheet in KochModus.jsx).
// entwurfDiaeten/entwurfEigenschaft starten dadurch automatisch synchron zum
// aktuellen globalen Filterstand, ganz ohne eigenen Reset-Effekt.
//
// WICHTIG: der Entwurf wird NUR bei Tap auf den CTA-Button uebernommen
// (bestaetigen -> onFilterAnwenden). Wegwischen und Hintergrund-Tap
// VERWERFEN ihn (schliessen() ruft NIE onFilterAnwenden auf) - Auftrag: man
// soll im Sheet frei mit der Trefferzahl experimentieren koennen, ohne beim
// versehentlichen Zuziehen ungewollt die eigene Ernaehrungsform-Einstellung
// zu veraendern.
function FilterSheetInhalt({ onSchliessen, aktuelleMahlzeit, diaeten, eigenschaftFuerMahlzeit, rezepte, onFilterAnwenden }) {
  const reduzierteBewegung = useReducedMotion()
  const sheetRef = useRef(null)
  const dragControls = useDragControls()

  const [entwurfDiaeten, setEntwurfDiaeten] = useState(diaeten)
  const [entwurfEigenschaft, setEntwurfEigenschaft] = useState(eigenschaftFuerMahlzeit)

  // Geschmack (Suess/Deftig) ergibt bei Mittag/Abend keinen Sinn (eigenschaft
  // ist dort in der DB immer null, siehe rezepteFilter.js) - Abschnitt bleibt
  // deshalb bei diesen zwei Mahlzeiten ausgeblendet statt null Treffer zu
  // riskieren.
  const geschmackRelevant = aktuelleMahlzeit === 'fruehstueck' || aktuelleMahlzeit === 'snack'
  const trefferAnzahl = gefiltertePoolFuerRezepte(rezepte, aktuelleMahlzeit, entwurfDiaeten, entwurfEigenschaft).length

  // Grobe Erststartschaetzung - der ResizeObserver unten korrigiert direkt
  // nach dem Mount (vor jeder moeglichen Nutzerinteraktion) auf die
  // tatsaechliche Hoehe, siehe SHEET_PEEK_PX-Kommentar in KochModus.jsx fuer
  // dasselbe Muster/denselben Kompromiss (kurzzeitig ungenauer Startwert,
  // rein fuer den allerersten initial-y, statt auf den ersten
  // ResizeObserver-Callback warten zu muessen).
  const [sheetHoehe, setSheetHoehe] = useState(420)

  useEffect(() => {
    const el = sheetRef.current
    if (!el) {
      return undefined
    }
    const beobachter = new ResizeObserver(([eintrag]) => setSheetHoehe(eintrag.contentRect.height))
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [])

  const y = useMotionValue(sheetHoehe)
  const blurPx = useTransform(y, [0, sheetHoehe], [BACKDROP_BLUR_MAX_PX, 0])
  const dimPercent = useTransform(y, [0, sheetHoehe], [BACKDROP_DIM_MAX_PERCENT, 0])
  const backdropFilterWert = useMotionTemplate`blur(${blurPx}px)`
  const backdropHintergrundWert = useMotionTemplate`color-mix(in srgb, var(--color-text) ${dimPercent}%, transparent)`

  // EINZIGER Schliess-Pfad fuer Drag-Wegziehen UND Hintergrund-Tap - siehe
  // Kommentar oben, warum hier bewusst NIE onFilterAnwenden aufgerufen wird.
  function schliessen(startGeschwindigkeit = 0) {
    if (reduzierteBewegung) {
      onSchliessen()
      return
    }
    animate(y, sheetHoehe, { ...DRAG_SCHLIESSEN_SPRING, velocity: startGeschwindigkeit, onComplete: onSchliessen })
  }

  // Einziger Pfad, der den Entwurf tatsaechlich uebernimmt: erst
  // onFilterAnwenden (loest in App.jsx EINEN gemeinsamen Neu-Wuerfel-Wurf
  // aus, siehe dortiger Kommentar), DANACH erst zuziehen - so aendert sich
  // die Karte dahinter bereits waehrend das Sheet noch wegschiebt, statt
  // dass man auf das Ende der Zuzieh-Animation warten muss.
  function bestaetigen() {
    onFilterAnwenden(entwurfDiaeten, entwurfEigenschaft)
    schliessen()
  }

  function handleDragEnd(_event, info) {
    const sollSchliessen = info.offset.y > SCHLIESS_DISTANZ_PX || info.velocity.y > SCHLIESS_GESCHWINDIGKEIT_PX_S
    if (sollSchliessen) {
      schliessen(info.velocity.y)
    } else {
      animate(y, 0, SPRING_REVEAL)
    }
  }

  function handlePointerDownKopfbereich(event) {
    dragControls.start(event)
  }

  // BEWUSST kein Drag-Start vom Inhalt aus (anders als KochModus.jsx, dort
  // nicht angetastet - dessen Verhalten ist richtig, siehe dortiger
  // handlePointerDownInhalt). Dieses Sheet ist kurz genug, um OHNE Scrollen
  // auf den Bildschirm zu passen (siehe kartenBudgetPx-Mechanismus in
  // RezepteSwipeAnsicht.jsx) - scrollTop ist im Inhalt deshalb so gut wie
  // IMMER 0. Ein "nur starten, wenn scrollTop<=0"-Wert wie in KochModus.jsx
  // waere hier also praktisch IMMER erfuellt: jede Beruehrung einer
  // Ernaehrungs-Zeile haette den Sheet-Drag gestartet und den eigentlichen
  // Checkbox-Tap geschluckt bzw. beim minimalen Zittern des Fingers auf die
  // Nachbarzeile verschoben (Real-Device-Bugreport, per Touch-Simulation in
  // WebKit reproduziert: schon 4px Fingerbewegung starteten sichtbar den
  // Sheet-Drag UND unterdrueckten den Checkbox-Toggle komplett). Zuziehen
  // startet hier deshalb ausschliesslich ueber den Kopfbereich
  // (handlePointerDownKopfbereich) - der ist mit Griff + "Filter"/
  // "Zurücksetzen"-Zeile gross genug zum Greifen.

  const sheetMotionProps = reduzierteBewegung
    ? {
        initial: { opacity: 0, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: sheetHoehe },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: sheetHoehe },
        transition: SHEET_SLIDE_UEBERGANG,
      }

  return (
    <>
      <motion.button
        type="button"
        aria-label="Filter schließen"
        onClick={() => schliessen()}
        className="fixed inset-0 z-40 cursor-default"
        style={
          reduzierteBewegung
            ? undefined
            : { backgroundColor: backdropHintergrundWert, backdropFilter: backdropFilterWert, WebkitBackdropFilter: backdropFilterWert }
        }
        initial={
          reduzierteBewegung
            ? { backgroundColor: 'color-mix(in srgb, var(--color-text) 0%, transparent)', backdropFilter: 'blur(0px)' }
            : undefined
        }
        animate={
          reduzierteBewegung
            ? {
                backgroundColor: `color-mix(in srgb, var(--color-text) ${BACKDROP_DIM_MAX_PERCENT}%, transparent)`,
                backdropFilter: `blur(${BACKDROP_BLUR_MAX_PX}px)`,
              }
            : undefined
        }
        exit={
          reduzierteBewegung
            ? { backgroundColor: 'color-mix(in srgb, var(--color-text) 0%, transparent)', backdropFilter: 'blur(0px)' }
            : undefined
        }
        transition={reduzierteBewegung ? { duration: 0.15 } : undefined}
      />

      <motion.div
        ref={sheetRef}
        drag={reduzierteBewegung ? false : 'y'}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: sheetHoehe }}
        dragElastic={{ top: 0.2, bottom: 0.05 }}
        onDragEnd={handleDragEnd}
        {...sheetMotionProps}
        style={{ y, maxHeight: 'calc(100dvh - 32px)' }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[14px] bg-bg shadow-lg"
      >
        {/* Griff + Kopfbereich: startet einen Drag immer sofort, unabhaengig
            vom Scroll-Zustand des Inhalts darunter (siehe KochModus.jsx). */}
        <div onPointerDown={handlePointerDownKopfbereich} className="shrink-0 touch-none pb-1 pt-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-text-muted" />
          <div className="mt-2 flex items-center justify-between px-4">
            <p className="font-display text-lg font-semibold text-text">Filter</p>
            <AnimatedButton
              type="button"
              onClick={() => {
                setEntwurfDiaeten([])
                setEntwurfEigenschaft('')
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Zurücksetzen
            </AnimatedButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain overscroll-x-none">
          <div className="px-4 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pt-2">
            {geschmackRelevant && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Geschmack</p>
                <div className="mt-2">
                  <SegmentSchalter optionen={GESCHMACK_OPTIONEN} aktuell={entwurfEigenschaft} onAendern={setEntwurfEigenschaft} />
                </div>
              </>
            )}

            <p className={`text-xs font-semibold uppercase tracking-wide text-text-muted ${geschmackRelevant ? 'mt-5' : ''}`}>
              Ernährung
            </p>
            {/* KEIN -mx-4-Ausgleich hier (anders als die alte Filter-Pille in
                RezepteSwipeAnsicht.jsx, siehe Git-Historie): DiaetFilter hat
                laut eigenem Kommentar dort bewusst KEIN eingebautes px-4 mehr
                (beide anderen Aufrufer betten es bereits in eine eigene
                gepolsterte Karte ein) - ein zusaetzliches -mx-4 HIER zog die
                Zeilen faelschlich bis an den Bildschirmrand, breiter als der
                Geschmack-Schalter direkt darueber (Real-Device-Bugreport). */}
            <DiaetFilter
              ausgewaehlt={entwurfDiaeten}
              onAendern={(slug) => setEntwurfDiaeten((aktuell) => diaetenUmschalten(aktuell, slug))}
              zeigeKeineOption={false}
            />
            {/* Zwei kurze Klarstellungen in einem Absatz: Vegan zaehlt
                automatisch als Vegetarisch mit (siehe erfuelltDiaet in
                rezepteFilter.js) UND diese Auswahl ist NICHT auf die aktuell
                gezeigte Mahlzeit beschraenkt, sondern identisch mit
                diaeten in den Einstellungen (App.jsx) - ohne den zweiten
                Satz koennte man glauben, man filtert gerade nur Snacks. */}
            <p className="mt-2 text-xs text-text-muted">
              Vegane Rezepte sind bei Vegetarisch mit dabei. Die Auswahl gilt für alle Mahlzeiten und ist dieselbe wie in den
              Einstellungen.
            </p>

            <AnimatedButton
              type="button"
              onClick={bestaetigen}
              disabled={trefferAnzahl === 0}
              className="mt-5 w-full rounded-full bg-primary-dark py-3 text-center text-sm font-semibold text-card shadow-sm disabled:opacity-40"
            >
              {trefferAnzahl === 0 ? 'Keine Rezepte für diese Auswahl' : `${trefferAnzahl} ${trefferAnzahl === 1 ? 'Rezept' : 'Rezepte'} anzeigen`}
            </AnimatedButton>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// FilterSheet ersetzt die alte Filter-Pille samt Dropdown-Panel in
// RezepteSwipeAnsicht.jsx. offen/onSchliessen kommen als lokaler State von
// dort (kein App.jsx-State noetig, das Sheet hat ausserhalb seiner eigenen
// Sichtbarkeit keinen Zustand, den ein anderer Screen kennen muesste).
function FilterSheet({ offen, onSchliessen, aktuelleMahlzeit, diaeten, eigenschaftFuerMahlzeit, rezepte, onFilterAnwenden }) {
  return (
    <AnimatePresence>
      {offen && (
        <FilterSheetInhalt
          onSchliessen={onSchliessen}
          aktuelleMahlzeit={aktuelleMahlzeit}
          diaeten={diaeten}
          eigenschaftFuerMahlzeit={eigenschaftFuerMahlzeit}
          rezepte={rezepte}
          onFilterAnwenden={onFilterAnwenden}
        />
      )}
    </AnimatePresence>
  )
}

export default FilterSheet
