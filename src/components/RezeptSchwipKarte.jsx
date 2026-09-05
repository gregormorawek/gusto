import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { IconCheck, IconDice5, IconPhotoOff, IconShoppingCart } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import { rezeptKarteBerechnen } from '../rezeptKarteBerechnen'
import { SPRING_REVEAL, transitionFuer } from '../motionConfig'

// NUR noch das WEGBLENDEN der alten Karte beim Kartenwechsel (Filter-
// Aenderung, die den angezeigten Kandidaten ersetzt, OHNE dass der User aktiv
// geswiped hat) - die neue Karte selbst bekommt bewusst KEIN eigenes
// initial-Fade mehr (kein initial-Prop unten am motion.div => startet direkt
// bei animate={{opacity:1}}, framer-motion interpoliert dann nichts). Grund
// (Nutzer-Feedback nach Real-Device-Test): vorher faedeten alte UND neue
// Karte GLEICHZEITIG uebereinander ein/aus (beide an x=0, da x ein einziger
// geteilter MotionValue ist, siehe x weiter unten) - sah wie eine
// Doppelbelichtung zweier Foodfotos aus. Jetzt ist die neue Karte einfach
// schon "da" (passend zum Deck-Stapel-Konzept: sie liegt konzeptuell bereits
// vorgeladen hinter der alten) und wird beim Wegwischen/Wegfaden der alten
// freigelegt - technisch der sauberste der beiden vom Nutzer vorgeschlagenen
// Ansaetze: ein Slide-Richtung waere bei einem Filter-Wechsel (kein Wisch,
// keine Richtung vorhanden) nicht sinnvoll herleitbar, hier reicht dagegen
// ein simples Weglassen des Enter-Fades.
const KARTEN_AUSTRITT_FADE = { duration: 0.25, ease: 'easeOut' }

// Maximale Wartezeit auf das Vorladen des neuen Rezept-Bilds, bevor der
// Kartenwechsel TROTZDEM ausgeloest wird - siehe RezeptKarte.jsx fuer die
// vollstaendige Herleitung (verhindert, dass eine sehr langsame Verbindung
// die Wechsel-Animation unbegrenzt blockiert).
const BILD_PRELOAD_TIMEOUT_MS = 1500

// Ab welcher Ziehdistanz bzw. -geschwindigkeit ein Loslassen als "Swipe"
// statt "zurueckschnappen" gilt - dieselbe Distanz/Geschwindigkeit-ODER-
// Verknuepfung wie SCHLIESS_DISTANZ_PX/SCHLIESS_GESCHWINDIGKEIT_PX_S in
// KochModus.jsx (dort vertikal fuers Sheet-Schliessen, hier horizontal
// fuers Karten-Swipe), Geschwindigkeit in px/s (Framer-Motion-Einheit fuer
// info.velocity).
const SWIPE_SCHWELLE_PX = 90
const SWIPE_SCHWELLE_GESCHWINDIGKEIT_PX_S = 500

// Wie weit die Karte beim tatsaechlichen Swipe (ueber der Schwelle) aus dem
// Bild herausfliegt, bevor der zugehoerige Callback (onWuerfeln/onUebernehmen)
// feuert - deutlich groesser als jeder realistische Viewport, damit die
// Karte in JEDEM Fall komplett unsichtbar ist, wenn die naechste Karte
// erscheint.
const SWIPE_AUSTRITT_PX = 600
const SWIPE_AUSTRITT_SPRING = { type: 'spring', stiffness: 260, damping: 30 }

// Eigene, ueber ihre url gekeyte Unterkomponente (1:1 aus RezeptKarte.jsx
// uebernommen, aber absolute inset-0 statt einer relativ-hohen Box - das
// Bild ist hier der VOLLSTAENDIGE Kartenhintergrund, nicht nur ein Ausschnitt
// oben in der Karte). useLayoutEffect prueft direkt nach dem Mount (VOR dem
// ersten Browser-Paint) per img.complete, ob das Bild dank des app-weiten
// Vorladens (bildVorladen.js, siehe App.jsx) bereits im Cache liegt - dann
// startet es sofort bei voller Deckkraft, ganz ohne sichtbares Aufblitzen.
function KartenBild({ url, alt, onError }) {
  const [geladen, setGeladen] = useState(false)
  const bildRef = useRef(null)

  useLayoutEffect(() => {
    if (bildRef.current?.complete) {
      setGeladen(true)
    }
  }, [])

  return (
    <>
      {!geladen && (
        <div className="absolute inset-0 animate-pulse bg-secondary/10 motion-reduce:animate-none" aria-hidden="true" />
      )}
      <img
        ref={bildRef}
        src={url}
        alt={alt}
        draggable={false}
        onLoad={() => setGeladen(true)}
        onError={onError}
        // select-none/-webkit-touch-callout/-webkit-user-drag: draggable={false}
        // oben blockiert nur HTML5-Drag-and-Drop (mousedown-basiert) - WebKits
        // eigene, TOUCH-basierte Bild-Drag-Geste (langes Druecken+Bewegen auf
        // einem <img>, normalerweise fuers "Bild teilen/sichern") ist ein
        // komplett separater nativer Mechanismus, den weder draggable=false
        // noch touch-action:pan-y (siehe style-Attribut am Karten-Wrapper
        // oben) abdecken - genau das war laut Real-Device-Test die
        // verbleibende Ursache fuer noch minimal moegliches horizontales
        // Verschieben trotz touch-action:pan-y auf dem Drag-Ziel-Element.
        className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-200 [-webkit-touch-callout:none] [-webkit-user-drag:none] motion-reduce:transition-none ${
          geladen ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  )
}

// Kompakte Makro-Pille fuer die Kartenrueckseite (Scrim) - ersetzt die
// frueheren SlotKarte-2x2-Kacheln (siehe Plan floating-mixing-shannon.md,
// Abschnitt RezeptSchwipKarte.jsx): zeigt die drei Makro-SUMMEN des ganzen
// Rezepts (wie zuvor die "Summe"-Box in RezeptKarte.jsx), nicht mehr
// einzelne Zutaten-Portionen - fuer eine Foto-Karte im Swipe-Format reicht
// der grobe Makro-Ueberblick, die einzelnen Zutaten bleiben ueber "Jetzt
// kochen"/die Einkaufsliste weiterhin einsehbar.
function MakroPille({ label, wertGramm }) {
  return (
    <span className="rounded-full bg-card/20 px-2.5 py-1 text-xs font-medium text-card backdrop-blur-sm">
      {label} {wertGramm.toFixed(0)}g
    </span>
  )
}

// Kartenrahmen-Klassen, geteilt zwischen den zwei rein dekorativen
// "Stapel dahinter"-Karten und der echten, interaktiven Karte - dieselbe
// Groesse/Rundung/Position (absolute inset-0), damit die scale-Transforms
// der Deko-Karten optisch wirklich wie derselbe Kartentyp "dahinter" wirken.
const KARTEN_RAHMEN = 'absolute inset-0 overflow-hidden rounded-[14px] shadow-md'

function KartenSkeleton() {
  return <div className={`${KARTEN_RAHMEN} z-10 animate-pulse bg-secondary/10 motion-reduce:animate-none`} aria-hidden="true" />
}

// RezeptSchwipKarte: ersetzt RezeptKarte.jsx als Herzstueck des Rezepte-Tabs
// (Rezepte-Swipe-Pivot, siehe Plan floating-mixing-shannon.md). Vollbild-
// Foto+Scrim statt Foto-oben/Karte-unten, mit horizontaler Wisch-Geste
// (links = "Neu wuerfeln", rechts = "Uebernehmen") UND denselben zwei runden
// Buttons darunter, die EXAKT dieselben Callbacks ausloesen wie die Geste
// (siehe kartenAustreten weiter unten - eine einzige, gemeinsame Stelle,
// keine doppelte Schwellen-/Callback-Logik). Rendert zusaetzlich die zwei
// rein dekorativen "Stapel dahinter"-Karten (vermitteln "es gibt Nachschub",
// ohne dass dafuer ein echtes vorgefertigtes Deck existieren muesste) sowie
// die kleine Sekundaer-Aktion "Zur Einkaufsliste" am Kartenrand - der frueher
// danebenstehende "Jetzt kochen"-Button ist entfallen, ein Tap auf die Karte
// selbst oeffnet jetzt direkt den Kochmodus (siehe onTap weiter unten). Beide
// brauchen die hier lokal berechnete karte/angezeigtes Rezept, deshalb leben
// sie hier statt im Aufrufer (RezepteSwipeAnsicht.jsx).
function RezeptSchwipKarte({
  rezepteGeladen = true,
  rezept,
  zutatenNachId,
  ziel,
  makroZiele,
  onWuerfeln,
  wuerfelnDeaktiviert,
  onUebernehmen,
  onKochModusOeffnen,
  onZurEinkaufslisteHinzufuegen,
}) {
  const reduzierteBewegung = useReducedMotion()

  // Merkt sich die zuletzt FEHLGESCHLAGENE bild_url (statt eines simplen
  // Boolean) - siehe RezeptKarte.jsx fuer die vollstaendige Herleitung
  // (setzt sich beim naechsten Rezept automatisch zurueck, ganz ohne einen
  // eigenen Reset-Effekt).
  const [fehlgeschlageneBildUrl, setFehlgeschlageneBildUrl] = useState(null)

  // Das TATSAECHLICH angezeigte Rezept - bewusst vom rezept-Prop entkoppelt,
  // identisches Preload-vor-Crossfade-Muster wie RezeptKarte.jsx (siehe
  // dortiger Kommentar): wechselt erst, NACHDEM das neue Bild im
  // Hintergrund vorgeladen wurde. Bei einem tatsaechlichen Swipe (siehe
  // kartenAustreten) ist die alte Karte zu diesem Zeitpunkt bereits per x
  // aus dem Bild geflogen, der Crossfade darunter faengt danach nur noch
  // das Erscheinen der NEUEN Karte ab.
  const [angezeigtesRezept, setAngezeigtesRezept] = useState(rezept)

  useEffect(() => {
    if (rezept?.id === angezeigtesRezept?.id) {
      return undefined
    }
    if (!rezept?.bild_url) {
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
      if (!abgebrochen) {
        setFehlgeschlageneBildUrl(rezept.bild_url)
      }
      wechseln()
    }
    bild.src = rezept.bild_url
    const timeoutId = setTimeout(wechseln, BILD_PRELOAD_TIMEOUT_MS)

    return () => {
      abgebrochen = true
      clearTimeout(timeoutId)
    }
  }, [rezept, angezeigtesRezept])

  const karte = rezeptKarteBerechnen(angezeigtesRezept, zutatenNachId, ziel, makroZiele)
  const bildFehlgeschlagen = angezeigtesRezept && fehlgeschlageneBildUrl === angezeigtesRezept.bild_url

  // x ist die EINZIGE Quelle der Wahrheit fuer den horizontalen Kartenversatz
  // waehrend des Ziehens/Austretens - EIN stabiler MotionValue ueber die
  // gesamte Lebensdauer dieser Komponente (nicht pro angezeigtesRezept neu
  // erzeugt), wird nach jedem Austreten wieder auf 0 zurueckgesetzt (siehe
  // kartenAustreten), bevor die naechste Karte per AnimatePresence einblendet.
  const x = useMotionValue(0)
  // Dezenter Tilt waehrend des Ziehens (bewaehrtes "Tinder-Karten"-Muster) -
  // rein optisches Feedback, unabhaengig von der Schwellen-Logik unten.
  const rotate = useTransform(x, [-200, 200], [-8, 8])
  // Richtungs-Hinweis-Badges (siehe Rendering unten): blenden erst kurz vor
  // Erreichen der jeweiligen Schwelle sichtbar ein, damit sie beim normalen,
  // kurzen Antippen/Wackeln nicht schon aufblitzen.
  const wuerfelnHinweisOpazitaet = useTransform(x, [-SWIPE_SCHWELLE_PX, -SWIPE_SCHWELLE_PX * 0.4], [1, 0])
  const uebernehmenHinweisOpazitaet = useTransform(x, [SWIPE_SCHWELLE_PX * 0.4, SWIPE_SCHWELLE_PX], [0, 1])

  // Einzige Stelle, die einen "Austritt" (Wisch-Geste ueber der Schwelle ODER
  // Tap auf einen der beiden runden Buttons) in den passenden Callback
  // uebersetzt - richtung: -1 = links ("Neu wuerfeln"), +1 = rechts
  // ("Uebernehmen"). Bewusst VOR jeder Animation gegen die jeweilige
  // Deaktivierung geprueft (disabled Buttons UND eine unterschwellige Wisch-
  // Geste in eine deaktivierte Richtung fuehren zu GENAU demselben "nichts
  // passiert"), damit hier keine zwei getrennte Kopien derselben Pruefung
  // entstehen (siehe Aufgabenstellung "keine doppelte Logik").
  function kartenAustreten(richtung) {
    if (richtung < 0 && wuerfelnDeaktiviert) {
      return
    }
    if (richtung > 0 && !angezeigtesRezept) {
      return
    }

    if (reduzierteBewegung) {
      if (richtung < 0) {
        onWuerfeln()
      } else {
        onUebernehmen(angezeigtesRezept.id)
      }
      return
    }

    animate(x, richtung * SWIPE_AUSTRITT_PX, SWIPE_AUSTRITT_SPRING).then(() => {
      // Zuruecksetzen VOR dem Callback: sollte der Callback (z. B. bei einem
      // sehr kleinen Pool) zufaellig dasselbe Rezept erneut liefern, bleibt
      // DIESE Karteninstanz (kein Key-Wechsel, kein Remount) einfach sichtbar
      // in der Mitte stehen, statt dauerhaft ausserhalb des Bildes zu haengen.
      x.set(0)
      if (richtung < 0) {
        onWuerfeln()
      } else {
        onUebernehmen(angezeigtesRezept.id)
      }
    })
  }

  function handleDragEnd(_event, info) {
    const nachLinks = info.offset.x < 0
    const ueberSchwelle =
      Math.abs(info.offset.x) > SWIPE_SCHWELLE_PX || Math.abs(info.velocity.x) > SWIPE_SCHWELLE_GESCHWINDIGKEIT_PX_S
    const erlaubt = ueberSchwelle && (nachLinks ? !wuerfelnDeaktiviert : !!angezeigtesRezept)

    if (erlaubt) {
      kartenAustreten(nachLinks ? -1 : 1)
    } else {
      animate(x, 0, SPRING_REVEAL)
    }
  }

  return (
    // gap-4 (16px) zwischen Karten-Block und Buttons-Block: GARANTIERT
    // reservierter Zwischenraum, der (anders als eine margin auf dem
    // Karten-Container) von Flexbox nachweislich NIE zusammengeschrumpft
    // wird, egal wie knapp der verfuegbare Platz ist (siehe
    // Playwright-Messreihe unten) - genau das hat die z-index-Loesung der
    // letzten Runde NICHT geleistet. GEFUNDENE URSACHE des Real-Device-
    // Bugreports "Buttons überdecken jetzt die Deko-Karten komplett": auf
    // einem Geraet mit Notch/Dynamic Island verbraucht
    // env(safe-area-inset-top/bottom) zusaetzlichen Platz, den mein
    // Test-Browser mit 0 simuliert (siehe App.jsx pt-/pb-calc) - das
    // schrumpft den flex-1-Buttons-Bereich weiter zusammen, als in einem
    // gewoehnlichen Browser sichtbar. Per Playwright/WebKit nachgemessen
    // (gleiche Breite 375px, nur die Hoehe schrittweise reduziert, um genau
    // diesen Effekt zu simulieren): sobald die Hoehe unter ~780px faellt,
    // beruehren sich Deko-Karten-Unterkante und Button-Oberkante GENAU im
    // Abstand des groessten Deko-Ueberstands (-12px UEBERLAPPUNG, konstant,
    // nicht nur auf sehr kleinen Geraeten) - exakt der gemeldete Bug. z-20
    // auf dem Buttons-Block (siehe unten) hat das nur VERDECKT (Buttons
    // malen sich einfach ueber die Deko-Karten), nicht behoben. Mit gap-4
    // (16px, groesser als der max. 12px-Ueberstand der groesseren
    // Deko-Karte) bleibt selbst im dokumentierten Extremfall ein sichtbarer
    // Mindestabstand von 4px - der Ueberstand bleibt als schmaler Rand
    // erkennbar, beruehrt aber nie mehr die Buttons.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="relative mx-4 mt-2 aspect-[3/4] shrink-0">
        {/* Zwei rein dekorative "Stapel dahinter"-Karten - NICHT per scale()
            auf einer inset-0-Flaeche (das haette sie exakt zentriert hinter
            der gleich grossen Vorderkarte verschwinden lassen, komplett
            unsichtbar - per Screenshot-Test bestaetigt). Stattdessen schmaler
            (inset-x) UND nach oben versetzt (top), aber am UNTEREN Rand ueber
            die Vorderkarte hinaus verlaengert (negativer bottom-Wert) - so
            schaut jede Karte nur unten als duenner Streifen unter der
            Vorderkarte heraus, unabhaengig von der (durch aspect-[3/4]
            responsiv variierenden) tatsaechlichen Kartenhoehe. Ueberstand
            bewusst KLEIN gehalten (max. 3 statt vormals 5 Tailwind-Einheiten,
            12px), damit er sicher unter dem gap-4 (16px, siehe Kommentar am
            aeusseren Container oben) bleibt - DAS, nicht mehr der z-index,
            ist jetzt die eigentliche Garantie gegen ein Hineinragen in die
            Button-Reihe. z-index:auto (kein eigener z-index hier) bleibt nur
            noch als zweite Absicherung bestehen: die Buttons-Flaeche
            weiter unten ist zusaetzlich z-20, deckt sich aber unter der
            gap-4-Garantie im Normalfall gar nicht mehr mit diesen Karten. */}
        <div className="absolute inset-x-8 top-4 -bottom-3 rounded-[14px] bg-card opacity-40 shadow-sm" aria-hidden="true" />
        <div className="absolute inset-x-5 top-2 -bottom-1.5 rounded-[14px] bg-card opacity-70 shadow-sm" aria-hidden="true" />

        {!rezepteGeladen ? (
          <KartenSkeleton />
        ) : karte ? (
          <AnimatePresence>
            <motion.div
              key={angezeigtesRezept.id}
              drag={reduzierteBewegung ? false : 'x'}
              dragElastic={0.9}
              onDragEnd={handleDragEnd}
              // onTap statt onClick: framer-motions eigene Tap-Geste erkennt
              // zuverlaessig, ob der Pointer sich waehrend Druecken+Loslassen
              // nennenswert bewegt hat, und feuert in dem Fall NICHT (die
              // laufende drag-Geste "gewinnt" stattdessen) - genau die vom
              // Auftrag geforderte saubere Trennung Tap/Wisch, ganz ohne
              // eigene Schwellen-Logik. Oeffnet den Kochmodus nur, wenn es
              // ueberhaupt eine Kochanleitung gibt (siehe CLAUDE.md "Neue
              // kuratierte Rezepte") - sonst erwartet KochModus.jsx ein
              // vorhandenes anleitung-Array und wuerde sonst abstuerzen,
              // exakt dieselbe Bedingung wie vorher am jetzt entfernten
              // eigenen "Jetzt kochen"-Button.
              onTap={() => {
                if (angezeigtesRezept.anleitung?.length > 0) {
                  onKochModusOeffnen(angezeigtesRezept, karte)
                }
              }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitionFuer(reduzierteBewegung, KARTEN_AUSTRITT_FADE)}
              style={{ x, rotate, touchAction: 'pan-y' }}
              className={`${KARTEN_RAHMEN} z-10 cursor-grab bg-card active:cursor-grabbing`}
            >
              {angezeigtesRezept.bild_url && !bildFehlgeschlagen ? (
                <KartenBild
                  key={angezeigtesRezept.bild_url}
                  url={angezeigtesRezept.bild_url}
                  alt={angezeigtesRezept.titel}
                  onError={() => setFehlgeschlageneBildUrl(angezeigtesRezept.bild_url)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary/10 text-text-muted">
                  <IconPhotoOff size={40} stroke={1.5} />
                </div>
              )}

              {/* Scrim: dunkler Espresso-Verlauf (--color-text, kein neuer
                  Farbwert, siehe CLAUDE.md) am unteren Kartenrand, sorgt fuer
                  Lesbarkeit von Kicker/Titel/Makro-Pillen auf jedem Foto. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-text/90 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-card/80">
                  {karte.summeKalorien.toFixed(0)} kcal
                </p>
                <h2 className="mt-0.5 font-display text-2xl font-semibold text-card">{angezeigtesRezept.titel}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <MakroPille label="P" wertGramm={karte.summeProtein} />
                  <MakroPille label="K" wertGramm={karte.summeCarbs} />
                  <MakroPille label="F" wertGramm={karte.summeFett} />
                </div>
              </div>

              {/* Richtungs-Hinweis-Badges - rein optisches Feedback waehrend
                  des Ziehens (siehe wuerfelnHinweisOpazitaet/
                  uebernehmenHinweisOpazitaet oben), pointer-events-none
                  damit sie die Drag-Geste selbst nicht stoeren. */}
              <motion.span
                style={{ opacity: wuerfelnHinweisOpazitaet }}
                className="pointer-events-none absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-primary shadow-sm"
              >
                <IconDice5 size={20} stroke={1.75} />
              </motion.span>
              <motion.span
                style={{ opacity: uebernehmenHinweisOpazitaet }}
                className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-secondary shadow-sm"
              >
                <IconCheck size={20} stroke={2} />
              </motion.span>

              {/* Einzige verbleibende Sekundaer-Aktion am Kartenrand - "Jetzt
                  kochen" (Kochhauben-Icon) ist entfallen, dieselbe Aktion
                  passiert jetzt per Tap auf die Karte selbst (siehe onTap am
                  motion.div oben). onPointerDown stoppt die Ausbreitung VOR
                  Framers eigenem Pointer-Listener auf dem Karten-Wrapper
                  (Bubbling-Phase) - ohne das wuerde ein Tap auf diesen Button
                  zusaetzlich als Karten-Tap durchgereicht und den Kochmodus
                  MIT oeffnen, obwohl nur die Einkaufsliste gemeint war. z-20
                  haelt den Button ueber dem z-10-Kartenkoerper UND den
                  Richtungs-Hinweis-Badges antippbar. */}
              <div className="absolute bottom-24 right-3 z-20">
                <AnimatedButton
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onZurEinkaufslisteHinzufuegen(karte)}
                  aria-label="Zur Einkaufsliste"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-primary shadow-sm backdrop-blur-sm"
                >
                  <IconShoppingCart size={18} stroke={1.75} />
                </AnimatedButton>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className={`${KARTEN_RAHMEN} z-10 flex items-center justify-center bg-card p-6 text-center`}>
            <p className="text-text-muted">Für diese Filterkombination gibt es noch kein Rezept.</p>
          </div>
        )}
      </div>

      {/* Freier Raum zwischen Kartenunterkante und Tab-Leiste (siehe
          RezepteSwipeAnsicht.jsx fuer den umgebenden flex-Aufbau, der diesem
          Block seine tatsaechliche Hoehe gibt) - flex-1 + justify-center
          zentriert Button-Reihe + Hinweistext gemeinsam als EIN Block
          vertikal in diesem Raum, statt wie zuvor per festem mt-Wert direkt
          unter der Karte zu kleben. NICHT mehr exakt "gleicher Abstand oben/
          unten": der aeussere gap-4 (siehe Kommentar dort, Ueberlappungs-
          Fix) zieht fix 16px von der Flaeche OBERHALB dieses Blocks ab, bevor
          justify-center den REST symmetrisch aufteilt - im Normalfall (viel
          Luft vorhanden) ein kaum wahrnehmbarer Bias von wenigen Prozent,
          aber die einzige Moeglichkeit, den Abstand nach oben GARANTIERT nie
          auf 0 fallen zu lassen (siehe Playwright-Messreihe dort). z-20:
          jetzt nur noch zweite Absicherung (siehe Kommentar an den
          Deck-Karten oben) - im Normalfall ueberschneidet sich diese Flaeche
          dank gap-4 gar nicht mehr mit den Deck-Karten. */}
      <div className="relative z-20 flex flex-1 flex-col items-center justify-center gap-2">
        <div className="flex items-center justify-center gap-[26px]">
          <AnimatedButton
            type="button"
            onClick={() => kartenAustreten(-1)}
            disabled={wuerfelnDeaktiviert}
            aria-label="Neu würfeln"
            className="flex h-[66px] w-[66px] items-center justify-center rounded-full border border-primary/40 bg-card text-primary shadow-sm disabled:opacity-40"
          >
            <IconDice5 size={28} stroke={1.75} />
          </AnimatedButton>
          <AnimatedButton
            type="button"
            onClick={() => kartenAustreten(1)}
            disabled={!angezeigtesRezept}
            aria-label="Übernehmen"
            className="flex h-[82px] w-[82px] items-center justify-center rounded-full bg-secondary text-card shadow-md disabled:opacity-40"
          >
            <IconCheck size={34} stroke={2} />
          </AnimatedButton>
        </div>
        <p className="text-center text-xs text-text-muted">Nach links wischen für etwas anderes</p>
      </div>
    </div>
  )
}

export default RezeptSchwipKarte
