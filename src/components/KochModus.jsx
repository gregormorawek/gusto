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
import {
  IconBowl,
  IconCheck,
  IconCooker,
  IconCut,
  IconGrillSpatula,
  IconHourglass,
  IconPhotoOff,
  IconSoup,
  IconToolsKitchen2,
  IconWhisk,
} from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import AnimierteZahl from './AnimierteZahl'
import { SHEET_SLIDE_UEBERGANG, SPRING_REVEAL } from '../motionConfig'

// aktion -> Icon, feste Zuordnung fuer die 8 erlaubten Werte (siehe
// CLAUDE.md, "Neue kuratierte Rezepte"). Rein statisch fuer jetzt - ein
// spaeterer Feature-Schritt ersetzt diese Icons durch animierte Versionen
// (z. B. Pfanne mit Dampf beim Braten), die Zuordnungsstelle bleibt dieselbe.
const AKTION_ICON = {
  schneiden: IconCut,
  kochen: IconSoup,
  braten: IconGrillSpatula,
  roesten: IconCooker,
  ruehren: IconWhisk,
  mischen: IconBowl,
  warten: IconHourglass,
  servieren: IconToolsKitchen2,
}

// Wie viel von der darunterliegenden RezeptKarte oben sichtbar bleibt
// (geblurrt+abgedunkelt, siehe Backdrop unten) - Apple-Pay-Sheet-Optik statt
// eines vollflaechigen Takeovers. 40-60px laut Vorgabe, 48px als Mittelwert.
const SHEET_PEEK_PX = 48

// Ab welcher Ziehdistanz bzw. -geschwindigkeit ein Loslassen als "schliessen"
// statt "zurueckschnappen" gilt. Geschwindigkeit in px/s (Framer-Motion-
// Einheit fuer info.velocity).
const SCHLIESS_DISTANZ_PX = 120
const SCHLIESS_GESCHWINDIGKEIT_PX_S = 500

// Maximale Backdrop-Intensitaet bei voll geoeffnetem Sheet (y=0) - espresso-
// farben statt neutral-schwarz: bg-text ist bereits der dunkle Warmton
// (#3E2E22) aus dem Marken-Farbschema, hier nur mit reduzierter Deckkraft
// als Abdunklung verwendet. KEIN neuer Farbwert (siehe CLAUDE.md).
const BACKDROP_BLUR_MAX_PX = 14
const BACKDROP_DIM_MAX_OPACITY = 0.45

// Federparameter fuers Schliessen per Drag - bewusst mit der tatsaechlichen
// Loslass-Geschwindigkeit (velocity) angestossen, damit sich das Zuziehen wie
// eine natuerliche Fortsetzung der Wischgeste anfuehlt, statt abrupt auf eine
// feste Kurve zu wechseln. NICHT SPRING_REVEAL (das ist fuer das
// Zurueckschnappen reserviert, siehe unten) - hier etwas straffer, damit ein
// entschlossenes Wegziehen sich auch entschlossen anfuehlt.
const DRAG_SCHLIESSEN_SPRING = { type: 'spring', stiffness: 300, damping: 32 }

// aktion -> Icon-Liste s.o. Der eigentliche Sheet-Inhalt - Bild, Titel,
// Beschreibung, kompakte Zutaten-Referenz, vollstaendige Kochanleitung mit
// Checkboxen. erledigteSchritte/onSchrittUmschalten kommen von App.jsx (State
// dort, siehe Kommentar an der dortigen Verwendungsstelle) - NICHT mehr
// lokaler State hier, damit der Haken-Status ein Schliessen+Wiederoeffnen
// desselben Rezepts uebersteht (dieser Teil der Komponente wird ja bei jedem
// Schliessen komplett unmounted).
function KochModusInhalt({ rezept, karte, erledigteSchritte, onSchrittUmschalten }) {
  const zutatenReferenz = [
    { label: 'Protein', name: karte.proteinZutat.name, portion: karte.portionen.proteinPortion },
    { label: 'Kohlenhydrate', name: karte.carbsZutat.name, portion: karte.portionen.carbsPortion },
    { label: 'Fett', name: karte.fettZutat.name, portion: karte.portionen.fettPortion },
    {
      label: karte.gemueseZutat.kategorie === 'obst' ? 'Obst' : 'Gemüse',
      name: karte.gemueseZutat.name,
      portion: karte.portionen.gemuesePortion,
    },
  ]

  return (
    <div className="pb-6">
      {/* Randloses Bild ueber die volle Breite (kein mx-4, kein rounded) -
          bewusster Kontrast zur kompakten RezeptKarte, in der das Bild noch
          in eine gepolsterte Karte eingebettet ist. */}
      <div className="mt-1">
        {rezept.bild_url ? (
          <img src={rezept.bild_url} alt={rezept.titel} className="h-56 w-full object-cover sm:h-80" />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-secondary/10 text-text-muted sm:h-80">
            <IconPhotoOff size={40} stroke={1.5} />
          </div>
        )}
      </div>

      <h1 className="mx-4 mt-3 font-display text-2xl font-semibold text-text">{rezept.titel}</h1>
      <p className="mx-4 mt-1 text-sm text-text-muted">{rezept.beschreibung}</p>

      {/* Kompakte Zutaten-Referenz - bewusst NICHT die grossen SlotKarte-
          Kacheln aus RezeptKarte.jsx (waere eine reine Wiederholung), nur
          Name+Menge je Zutat zum schnellen Nachschauen waehrend des Kochens. */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        {zutatenReferenz.map((z) => (
          <div key={z.label} className="rounded-lg bg-secondary/10 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{z.label}</p>
            <p className="text-sm text-text">
              {z.name} · <AnimierteZahl wert={z.portion ?? 0} /> g
            </p>
          </div>
        ))}
      </div>

      <ol className="mx-4 mt-4 space-y-2">
        {rezept.anleitung.map((schritt, index) => {
          const Icon = AKTION_ICON[schritt.aktion]
          const erledigt = erledigteSchritte.has(index)
          return (
            <li key={index}>
              <AnimatedButton
                type="button"
                onClick={() => onSchrittUmschalten(index)}
                aria-pressed={erledigt}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left shadow-sm transition-colors duration-150 ${
                  erledigt ? 'border-secondary/30 bg-secondary/10' : 'border-text-muted/20 bg-card'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
                    erledigt ? 'border-secondary bg-secondary text-card' : 'border-text-muted/40'
                  }`}
                  aria-hidden="true"
                >
                  {erledigt && <IconCheck size={14} stroke={3} />}
                </span>

                {Icon && (
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <Icon size={18} stroke={1.75} />
                  </span>
                )}

                <span className={`flex-1 text-sm ${erledigt ? 'text-text-muted line-through' : 'text-text'}`}>
                  <span className="mr-1 font-display font-semibold text-secondary">{index + 1}.</span>
                  {schritt.text}
                </span>
              </AnimatedButton>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// Das eigentliche Sheet + Backdrop - ausgelagert aus KochModus (siehe ganz
// unten), damit y/dragControls/ResizeObserver bei JEDEM Oeffnen als FRISCHE
// Hooks-Instanz entstehen (dieser Teil wird von AnimatePresence bei
// eintrag=null komplett unmounted und beim naechsten Oeffnen neu gemountet -
// kein Reset-Handling fuer y noetig, es startet einfach automatisch wieder
// bei sheetHoehe/"zu"). erledigteSchritte/onSchrittUmschalten kommen
// weiterhin von App.jsx durch (siehe KochModusInhalt-Kommentar oben).
function KochModusSheet({ eintrag, onZurueck, erledigteSchritte, onSchrittUmschalten }) {
  const { rezept, karte } = eintrag
  const reduzierteBewegung = useReducedMotion()
  const sheetRef = useRef(null)
  const inhaltRef = useRef(null)
  const dragControls = useDragControls()

  // Startschaetzung synchron aus window.innerHeight (kein Warten auf den
  // ResizeObserver noetig) - verhindert einen falschen initial-y-Wert beim
  // allerersten Rendern, siehe initial={{ y: sheetHoehe }} unten.
  const [sheetHoehe, setSheetHoehe] = useState(() => window.innerHeight - SHEET_PEEK_PX)

  useEffect(() => {
    const el = sheetRef.current
    if (!el) {
      return undefined
    }
    const beobachter = new ResizeObserver(([eintragRO]) => setSheetHoehe(eintragRO.contentRect.height))
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [])

  // y ist die EINZIGE Quelle der Wahrheit fuer die Sheet-Position: 0 = ganz
  // offen, sheetHoehe = komplett unter dem sichtbaren Bereich (= "zu"). Wird
  // sowohl vom Drag-Gesten-Handling ALS AUCH von initial/animate/exit unten
  // gesetzt (Framer Motion erlaubt beides auf demselben extern uebergebenen
  // MotionValue, siehe style={{ y }}) - dadurch bleiben Blur/Dimming (per
  // useTransform direkt von y abgeleitet) IMMER synchron zur tatsaechlichen
  // Position, egal ob die Bewegung gerade vom Finger oder von einer
  // Tween-Animation kommt.
  const y = useMotionValue(sheetHoehe)
  const blurPx = useTransform(y, [0, sheetHoehe], [BACKDROP_BLUR_MAX_PX, 0])
  const dimOpacity = useTransform(y, [0, sheetHoehe], [BACKDROP_DIM_MAX_OPACITY, 0])
  const backdropFilterWert = useMotionTemplate`blur(${blurPx}px)`

  function handleDragEnd(_event, info) {
    const schliessen = info.offset.y > SCHLIESS_DISTANZ_PX || info.velocity.y > SCHLIESS_GESCHWINDIGKEIT_PX_S
    if (schliessen) {
      // Erst zuende animieren (mit der tatsaechlichen Loslass-Geschwindigkeit
      // als Startimpuls), DANACH erst onZurueck - sonst wuerde React das
      // Sheet mitten in der eigenen Zuzieh-Animation unmounten und dabei auf
      // die starre SHEET_SLIDE_UEBERGANG-Exit-Animation umspringen, was sich
      // wie ein Ruckler anfuehlen wuerde.
      animate(y, sheetHoehe, { ...DRAG_SCHLIESSEN_SPRING, velocity: info.velocity.y, onComplete: onZurueck })
    } else {
      animate(y, 0, SPRING_REVEAL)
    }
  }

  function handlePointerDownKopfbereich(event) {
    dragControls.start(event)
  }

  // Nur starten, wenn die Inhalts-Scrollflaeche bereits ganz oben ist -
  // sonst wuerde jeder Wisch INNERHALB der Anleitung (normales Scrollen)
  // faelschlich als Sheet-Drag interpretiert. Ein reiner Tap (kein
  // Bewegungs-Delta ueber Framer Motions eigene Schwelle hinaus) bleibt
  // trotzdem ein normaler Klick, z. B. auf eine Schritt-Checkbox.
  function handlePointerDownInhalt(event) {
    if (inhaltRef.current && inhaltRef.current.scrollTop <= 0) {
      dragControls.start(event)
    }
  }

  const sheetMotionProps = reduzierteBewegung
    ? {
        // Reduzierte Bewegung: y bleibt konstant bei 0 (offene Position) -
        // NICHT ueber motionPropsFuer()s generisches "opacity-Key im Objekt
        // strippt y" loesen wie sonst in der App ueblich, weil y hier ein
        // EXTERN gebundener MotionValue ist (style={{ y }}), auf den auch
        // das Drag-Handling direkt schreibt. Wuerde initial/animate/exit
        // hier den y-Key komplett weglassen (wie es motionPropsFuer taete),
        // bliebe der MotionValue dauerhaft bei seinem Startwert sheetHoehe
        // stehen - das Sheet wuerde unsichtbar bleiben. Stattdessen explizit
        // y:0 in allen drei Props, nur opacity fadet - macht "direktes
        // Ein-/Ausblenden ohne Bewegung" korrekt UND behaelt die richtige
        // Endposition.
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
      {/* Backdrop: geblurrte + espressofarben abgedunkelte darunterliegende
          RezeptKarte, Intensitaet direkt von y abgeleitet (siehe blurPx/
          dimOpacity oben) - laeuft dadurch live mit, ob der Nutzer gerade
          zieht oder die Tween-Animation laeuft. Unter reduzierter Bewegung
          bewusst STATISCHE Werte (kein Blur-UEBERGANG, siehe Aufgabenstellung)
          statt der y-gekoppelten Transforms, da unter reduzierter Bewegung
          ohnehin nicht gezogen werden kann (drag ist unten deaktiviert) - y
          wuerde sonst konstant bei 0 stehen und permanent volle Intensitaet
          liefern, was fuer EXIT (Schliessen) falsch waere. */}
      <motion.div
        className="fixed inset-0 z-40 bg-text"
        style={
          reduzierteBewegung
            ? undefined
            : { opacity: dimOpacity, backdropFilter: backdropFilterWert, WebkitBackdropFilter: backdropFilterWert }
        }
        initial={reduzierteBewegung ? { opacity: 0 } : undefined}
        animate={
          reduzierteBewegung
            ? { opacity: BACKDROP_DIM_MAX_OPACITY, backdropFilter: `blur(${BACKDROP_BLUR_MAX_PX}px)` }
            : undefined
        }
        exit={reduzierteBewegung ? { opacity: 0 } : undefined}
        transition={reduzierteBewegung ? { duration: 0.15 } : undefined}
        aria-hidden="true"
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
        style={{ y, height: `calc(100dvh - ${SHEET_PEEK_PX}px)` }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[14px] bg-bg shadow-lg"
      >
        {/* Griff + Kopfbereich: NICHT Teil der scrollenden Flaeche darunter -
            von hier aus startet ein Drag immer sofort (siehe
            handlePointerDownKopfbereich), unabhaengig vom Scroll-Zustand des
            Inhalts. */}
        <div onPointerDown={handlePointerDownKopfbereich} className="shrink-0 touch-none pb-1 pt-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-text-muted" />
          <div className="mt-2 flex items-center justify-between px-4">
            <AnimatedButton type="button" onClick={onZurueck} className="text-sm text-primary hover:underline">
              ← Zurück
            </AnimatedButton>
            <p className="text-sm font-medium text-text-muted">
              {erledigteSchritte.size}/{rezept.anleitung.length} Schritte
            </p>
          </div>
        </div>

        <div ref={inhaltRef} onPointerDown={handlePointerDownInhalt} className="flex-1 overflow-y-auto overscroll-contain">
          <KochModusInhalt
            rezept={rezept}
            karte={karte}
            erledigteSchritte={erledigteSchritte}
            onSchrittUmschalten={onSchrittUmschalten}
          />
        </div>
      </motion.div>
    </>
  )
}

// Echtes, ziehbares Bottom-Sheet (Apple-Pay-Stil) statt des frueheren
// vollflaechigen Takeovers: oben bleibt ein Streifen der RezeptKarte
// sichtbar (geblurrt+abgedunkelt), das Sheet selbst kann per Ziehen
// geschlossen werden. eintrag kommt von App.jsx (State auf Top-Level, siehe
// dortiger Kommentar) - { rezept, karte } | null. karte ist ein REINER
// Momentaufnahme-Snapshot vom Oeffnen-Zeitpunkt (rezeptKarteBerechnen-
// Ergebnis), kein State mehr: da das Zahnrad (und damit jede Moeglichkeit,
// ziel/makroZiele waehrend des Kochmodus zu aendern) verdeckt ist, kann er
// waehrend der Session ohnehin nicht veralten.
//
// erledigteSchritte/onSchrittUmschalten kommen EBENFALLS von App.jsx (State
// dort, siehe Kommentar an der dortigen Verwendungsstelle) statt lokal hier
// gehalten zu werden - der Haken-Status muss ein Schliessen+Wiederoeffnen
// desselben Rezepts ueberleben, waehrend KochModusSheet (siehe oben) bei
// jedem Schliessen tatsaechlich unmounted wird.
function KochModus({ eintrag, onZurueck, erledigteSchritte, onSchrittUmschalten }) {
  return (
    <AnimatePresence>
      {eintrag && (
        <KochModusSheet
          eintrag={eintrag}
          onZurueck={onZurueck}
          erledigteSchritte={erledigteSchritte}
          onSchrittUmschalten={onSchrittUmschalten}
        />
      )}
    </AnimatePresence>
  )
}

export default KochModus
