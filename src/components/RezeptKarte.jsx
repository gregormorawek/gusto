import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconPhotoOff } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import SlotKarte from './SlotKarte'
import { rezeptKarteBerechnen } from '../rezeptKarteBerechnen'
import { motionPropsFuer } from '../motionConfig'

// Reiner Crossfade fuer den Kartenwechsel (Tab-Wechsel UND Wuerfeln, seit
// key={angezeigtesRezept.id} unten identisch ausgeloest) - bewusst OHNE
// scale, anders als das app-weite SPRING_REVEAL-Preset aus motionConfig.js:
// die Skalierung wirkte in diesem Kontext (grosse Karte mit Bild) unruhig
// statt hochwertig. Nur lokal hier definiert statt in motionConfig.js, damit
// SPRING_REVEAL fuer die uebrigen Verwendungsstellen (Wizard-Chips u. a.)
// unangetastet bleibt - diese Variante ist bewusst RezeptKarte-exklusiv.
const RECIPE_CARD_FADE = { duration: 0.25, ease: 'easeOut' }

// Maximale Wartezeit auf das Vorladen des neuen Rezept-Bilds, bevor der
// Kartenwechsel TROTZDEM ausgeloest wird - verhindert, dass eine sehr
// langsame Verbindung die Wechsel-Animation unbegrenzt blockiert. In diesem
// Fall (Bild beim Mount noch nicht fertig) uebernimmt RezeptBilds eigener
// opacity-Fade-in das sanfte Nachladen statt eines harten Pop-ins.
const BILD_PRELOAD_TIMEOUT_MS = 1500

// Eigene, ueber ihre url gekeyte Unterkomponente (siehe Verwendung unten) -
// das sorgt dafuer, dass React bei JEDEM Bildwechsel einen kompletten
// Neu-Mount macht und geladen automatisch auf false zurueckgesetzt wird,
// ohne einen manuellen Reset-Effekt. useLayoutEffect prueft direkt nach dem
// Mount (VOR dem ersten Browser-Paint) per img.complete, ob das Bild dank
// des Preloads in RezeptKarte bereits im Cache liegt - dann startet es
// sofort bei voller Deckkraft, ganz ohne sichtbares Aufblitzen. Nur falls
// das Preload-Timeout gegriffen hat (Bild beim Kartenwechsel noch nicht
// fertig), faengt der Fade-in das nachtraegliche Erscheinen sanft ab.
function RezeptBild({ url, alt, onError }) {
  const [geladen, setGeladen] = useState(false)
  const bildRef = useRef(null)

  useLayoutEffect(() => {
    if (bildRef.current?.complete) {
      setGeladen(true)
    }
  }, [])

  return (
    <img
      ref={bildRef}
      src={url}
      alt={alt}
      onLoad={() => setGeladen(true)}
      onError={onError}
      className={`h-28 w-full rounded-2xl object-cover transition-opacity duration-200 motion-reduce:transition-none sm:h-56 ${
        geladen ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}

// Zeigt EIN Rezept vollstaendig an: Bild (mit onError-Fallback), Titel,
// Beschreibung, die 4 Zutaten-Slots (ueber die bestehende SlotKarte-Optik,
// ohne Reroll-Controls) und die Makro-Summe, darunter der Wuerfeln-Button.
// Bewusst als eigene, wiederverwendbare Komponente (nicht mehr privat in
// RezepteAnsicht.jsx) - die Rezepte-Tagesplan-Ansicht (proTag-Zweig)
// verwendet sie unveraendert, nur mit dem Rezept der jeweils aktiven
// Tab-Mahlzeit als Prop. onWuerfeln/wuerfelnDeaktiviert kommen vom
// Aufrufer, damit "Anderes Rezept wuerfeln" je nach Kontext entweder die
// einzelne Mahlzeit-Auswahl oder gezielt die aktive Tab-Mahlzeit trifft.
// zusatzAktion ist optional (Default: keiner) - der Rezepte-Tagesplan
// (proTag-Zweig) reicht hier den "Ganzen Tag neu planen"-Button durch,
// damit beide Buttons EINE Zeile teilen statt zwei (wichtig fuer die
// 390px-ohne-Scrollen-Vorgabe) - die Einzel-Ansicht laesst die Prop weg und
// bleibt dadurch unveraendert bei einem einzelnen, vollbreiten Button.
function RezeptKarte({ rezept, zutatenNachId, ziel, makroZiele, onWuerfeln, wuerfelnDeaktiviert, zusatzAktion }) {
  const reduzierteBewegung = useReducedMotion()
  // Merkt sich die zuletzt FEHLGESCHLAGENE bild_url (statt eines simplen
  // Boolean) - so setzt sich der Fallback beim naechsten Rezept automatisch
  // zurueck, sobald sich bild_url aendert, ganz ohne einen eigenen Reset-
  // Effekt fuer den Rezeptwechsel (gilt auch fuer einen Tab-Wechsel, der ja
  // ebenfalls einfach ein neues rezept-Prop ist).
  const [fehlgeschlageneBildUrl, setFehlgeschlageneBildUrl] = useState(null)

  // Das TATSAECHLICH angezeigte Rezept - bewusst vom rezept-Prop entkoppelt.
  // Wechselt (und loest damit erst die AnimatePresence-Kartenwechsel-
  // Animation unten aus) erst, NACHDEM das neue Bild im Hintergrund
  // vorgeladen wurde, statt sofort bei jedem Prop-Wechsel. Ohne das poppte
  // das Bild sichtbar NACHTRAEGLICH rein, waehrend Titel/Zutaten/Summe (die
  // synchron aus dem Prop berechnet werden) schon fertig animiert waren.
  const [angezeigtesRezept, setAngezeigtesRezept] = useState(rezept)

  useEffect(() => {
    if (rezept?.id === angezeigtesRezept?.id) {
      return undefined
    }
    if (!rezept?.bild_url) {
      // Kein Bild zum Vorladen (kein Rezept mehr oder ohne bild_url) - sofort wechseln.
      setAngezeigtesRezept(rezept)
      return undefined
    }

    let abgebrochen = false
    const wechseln = () => {
      if (!abgebrochen) {
        setAngezeigtesRezept(rezept)
      }
    }
    const bild = new Image()
    bild.onload = wechseln
    bild.onerror = () => {
      // Fallback-Zustand gleich mitsetzen statt den echten <img> unten
      // ebenfalls noch einmal (erneut erfolglos) laden zu lassen.
      if (!abgebrochen) {
        setFehlgeschlageneBildUrl(rezept.bild_url)
      }
      wechseln()
    }
    bild.src = rezept.bild_url
    // Sicherheitsnetz: eine sehr langsame Verbindung soll die Wechsel-
    // Animation nicht unbegrenzt blockieren - RezeptBilds eigener
    // Fade-in faengt das dann sanft ab (siehe oben).
    const timeoutId = setTimeout(wechseln, BILD_PRELOAD_TIMEOUT_MS)

    return () => {
      abgebrochen = true
      clearTimeout(timeoutId)
    }
  }, [rezept, angezeigtesRezept])

  const karte = rezeptKarteBerechnen(angezeigtesRezept, zutatenNachId, ziel, makroZiele)
  const bildFehlgeschlagen = angezeigtesRezept && fehlgeschlageneBildUrl === angezeigtesRezept.bild_url

  return (
    <>
      {karte ? (
        <>
          {/* grid statt block: waehrend der Crossfade-Ueberlappung liegen
              altes UND neues motion.div per col-start-1/row-start-1 in
              GENAU derselben Grid-Zelle uebereinander (bewaehrter "CSS-
              Grid-Stack"-Trick) - anders als bei position: absolute braucht
              das keine manuell gemessene/gesetzte Hoehe, die Zeile sized
              sich automatisch auf die groessere der beiden Karten. Bewusst
              OHNE mode="popLayout": das haette dem austretenden Element
              selbst per JS berechnete inline top/left/width/height-Werte
              verpasst (Snapshot des BoundingClientRect) - genau das war die
              Ursache des beobachteten seitlichen Versatzes/"Wanderns", da
              dieser Snapshot nicht immer exakt mit der Grid-Zelle
              uebereinstimmte. Ohne popLayout ueberlaesst Framer Motion die
              Positionierung komplett unserem eigenen CSS. */}
          <div className="mx-4 mt-2 grid">
            <AnimatePresence>
              <motion.div
                key={angezeigtesRezept.id}
                {...motionPropsFuer(reduzierteBewegung, {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  exit: { opacity: 0 },
                  transition: RECIPE_CARD_FADE,
                })}
                className="col-start-1 row-start-1 rounded-[14px] bg-card p-3 shadow-sm"
              >
                {angezeigtesRezept.bild_url && !bildFehlgeschlagen ? (
                  <RezeptBild
                    key={angezeigtesRezept.bild_url}
                    url={angezeigtesRezept.bild_url}
                    alt={angezeigtesRezept.titel}
                    onError={() => setFehlgeschlageneBildUrl(angezeigtesRezept.bild_url)}
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center rounded-2xl bg-secondary/10 text-text-muted sm:h-56">
                    <IconPhotoOff size={32} stroke={1.5} />
                  </div>
                )}

                <h2 className="mt-2 font-display text-xl font-semibold text-text">{angezeigtesRezept.titel}</h2>
                <p className="mt-0.5 text-sm text-text-muted">{angezeigtesRezept.beschreibung}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <section className="mt-2 grid grid-cols-2 gap-2 px-4">
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

          <section className="mx-4 mt-2 rounded-lg border border-secondary/20 bg-secondary/10 p-2 shadow-sm">
            <h2 className="text-sm font-semibold text-text">Summe</h2>
            <p className="font-display text-2xl font-semibold text-text">{karte.summeKalorien.toFixed(1)} kcal</p>
            <p className="text-sm text-text-muted">
              P {karte.summeProtein.toFixed(1)}g · C {karte.summeCarbs.toFixed(1)}g · F {karte.summeFett.toFixed(1)}g
            </p>
          </section>
        </>
      ) : (
        <p className="mx-4 mt-2 text-text-muted">Für diese Filterkombination gibt es noch kein Rezept.</p>
      )}

      <div className="mx-4 mb-2 mt-1 flex gap-2">
        <AnimatedButton
          type="button"
          onClick={onWuerfeln}
          disabled={wuerfelnDeaktiviert}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-card disabled:opacity-50"
        >
          Anderes Rezept würfeln
        </AnimatedButton>
        {zusatzAktion}
      </div>
    </>
  )
}

export default RezeptKarte
