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
  IconBulb,
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
// CLAUDE.md, "Neue kuratierte Rezepte").
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

// aktion -> Icon-EIGENBEWEGUNG (rotate/x/y/scale auf dem Icon-Symbol SELBST).
// Nur fuer aktion-Typen gesetzt, bei denen sich das Symbol bewegt - kochen/
// braten/roesten/servieren bleiben hier bewusst OHNE Eintrag (das Symbol
// selbst bleibt ruhig, nur die Deko-Schicht drumherum bewegt sich, siehe
// AKTION_DEKO unten). Alle Werte bewusst dezent (siehe Aufgabenstellung
// "subtil und ruhig") und an den bisherigen App-Ton angelehnt.
//
// WICHTIG (Akku-Fix, siehe PULS_RHYTHMUS unten): transition enthaelt HIER
// bewusst KEIN repeat mehr - das war frueher repeat:Infinity und lief damit
// nachweislich (per document.getAnimations()/getComputedStyle-Messung ueber
// mehrere Sekunden bestaetigt) durchgehend mit voller Framerate, SOLANGE der
// Schritt aktuell war, unabhaengig von echter Nutzerinteraktion - bei einem
// "10 Minuten quellen lassen"-Schritt ein reales, vermeidbares Akku-Thema
// auf dem iPhone. Die Objekte hier beschreiben jetzt nur noch EINEN
// Bewegungs-Zyklus ("ein Ruehren", "ein Hacken", ...); SchrittIcon (unten)
// spielt diesen per PULS_RHYTHMUS.wiederholungen-mal ab und pausiert danach
// in ICON_RUHE_POSE, statt endlos zu wiederholen.
const ICON_EIGENBEWEGUNG = {
  // Durchgehende, langsame volle Drehung statt Pendel - wie ein tatsaechlich
  // ruehrender Loeffel. repeatType:'loop' mit Ziel 360 statt eines Keyframe-
  // Arrays: nach jedem Durchlauf springt der interne Rotationswert zurueck
  // auf 0, was optisch nahtlos ist (0deg und 360deg sehen identisch aus).
  ruehren: {
    animate: { rotate: 360 },
    transition: { duration: 2.4, repeatType: 'loop', ease: 'linear' },
  },
  // Seitliches Wackeln MIT Skalierungs-Puls (leichtes Ein-/Ausatmen) - die
  // zusaetzliche scale-Dimension unterscheidet "mischen" jetzt klar von
  // "ruehren" (reine Rotation). Etwas groessere Ausschlaege als zuvor
  // (Aufgabenstellung: "etwas mehr Amplitude").
  mischen: {
    animate: { rotate: [0, -12, 9, -6, 0], x: [0, -1.5, 1.5, -1, 0], scale: [1, 1.05, 0.97, 1.02, 1] },
    transition: { duration: 1.8, ease: 'easeInOut' },
  },
  // Ruhiger Hack-Rhythmus: leichtes Auf-und-Ab. Der Einschlag-Moment am
  // unteren Punkt (t=0.5 dieses Zyklus) bekommt zusaetzlich einen kurzen
  // Funken-Blitz, siehe SchneidenFunke/AKTION_DEKO unten - dieselbe Duration
  // (0.7s) und dieselben impliziten times [0, 0.5, 1], damit beide Schichten
  // exakt synchron laufen. PULS_RHYTHMUS.schneiden spielt hiervon 3
  // Wiederholungen pro Puls ab (ein kurzer Hack-Burst, siehe dort).
  schneiden: {
    animate: { y: [0, 3, 0] },
    transition: { duration: 0.7, ease: 'easeInOut' },
  },
  // Periodischer Flip statt Dauerbewegung: die 180-Grad-Drehung findet nur in
  // den ersten/letzten ~6% jedes Zyklus statt (times-Array), dazwischen
  // Ruhe - "warten" soll entspannt wirken, nicht hektisch. Der fallende
  // Sandkorn-Punkt (WartenSandkorn/AKTION_DEKO unten) sorgt dafuer, dass die
  // lange Ruhephase trotzdem nicht komplett bewegungslos wirkt.
  warten: {
    animate: { rotate: [0, 180, 180, 360] },
    transition: { duration: 3.2, times: [0, 0.06, 0.94, 1], ease: 'easeInOut' },
  },
}

// Duty-Cycle statt Dauerschleife: wiederholungen = wie oft EIN Zyklus aus
// ICON_EIGENBEWEGUNG[aktion] pro Puls abgespielt wird (bei schneiden 3 kurze
// Hacke hintereinander statt nur einem einzelnen Ausschlag - liest sich wie
// ein echter Hack-Rhythmus statt wie ein Zucken), ruheSekunden = Pause in
// ICON_RUHE_POSE danach, bevor der naechste Puls startet. Ergebnis pro
// aktion bewusst NICHT auf denselben Duty-Cycle getrimmt (waere selbst schon
// wieder ein synchrones, uniformes Muster ueber alle vier Typen hinweg) -
// warten braucht ohnehin kaum zusaetzliche Ruhe (der eigene Zyklus ist schon
// zu 94 % still), schneiden am meisten (kurzer knackiger Burst, dann lange
// Pause bis zum naechsten Hack-Ansatz).
const PULS_RHYTHMUS = {
  ruehren: { wiederholungen: 1, ruheSekunden: 6 },
  mischen: { wiederholungen: 1, ruheSekunden: 6 },
  schneiden: { wiederholungen: 3, ruheSekunden: 5 },
  warten: { wiederholungen: 1, ruheSekunden: 4 },
}

// Start-Versatz pro Schrittkarte (siehe SchrittIcon-Aufruf in
// KochModusInhalt: versatzSekunden={(index % VERSATZ_STAFFELUNG.length) *
// ...}) - verhindert, dass mehrere gleichzeitig sichtbare, aktive Icons im
// exakt selben Takt zucken (wirkt sonst wie ein technischer Defekt statt wie
// Lebendigkeit, siehe Aufgabenstellung). Nur EIN Schritt pro Rezept ist
// aktuell "istAktuell" (siehe aktuellerSchrittIndex), der Versatz wirkt sich
// also erst aus, wenn diese Komponente kuenftig mehrfach gleichzeitig
// animiert dargestellt wird - bewusst trotzdem schon jetzt eingebaut, statt
// es bis dahin zu vergessen.
const VERSATZ_STAFFELUNG_SEKUNDEN = [0, 1.3, 2.6, 3.9]

// Ruhe-Zielpose fuers Icon-Symbol, wenn KEINE Eigenbewegung laeuft (Schritt
// war nie aktuell ODER wurde gerade abgehakt/deaktiviert) - alle Achsen
// neutral. Bei einem Wechsel WEG von der Eigenbewegung (Schritt wird
// abgehakt, waehrend das Icon gerade z. B. mitten in einer Rotation steht)
// interpoliert framer-motion automatisch VOM aktuellen Wert zu dieser Pose,
// sobald sich animate/transition-Props aendern - kein manuelles Stop/Reset
// noetig, DAS ist der Mechanismus hinter dem weichen Ausklingen unten.
const ICON_RUHE_POSE = { rotate: 0, x: 0, y: 0, scale: 1 }

// Eigene (nicht mit SPRING_REVEAL geteilte) Feder fuers Zurueckfinden zur
// Ruhepose: SPRING_REVEAL (stiffness 300/damping 20) ist fuer das
// AUFTAUCHEN groesserer Flaechen gedacht und dabei bewusst leicht
// unterdaempft mit spuerbarem Nachwippen ueber ~500-600ms. Fuers Icon
// wollen wir stattdessen ein knackigeres "findet zurueck zur Mitte" in
// ca. 300-350ms (siehe Aufgabenstellung) - hoehere stiffness/damping.
const ICON_RUHE_SPRING = { type: 'spring', stiffness: 380, damping: 28 }

// Transition fuers Ausfaden der Deko-Partikel (Blasen/Funken/Glitzer/...),
// wenn ein Schritt abgehakt wird - siehe AnimatePresence-Nutzung in
// SchrittIcon unten. Kurz und rein opacity-basiert, kein Bewegungsversatz
// (Aufgabenstellung: "kurzer Opacity-Fade-out").
const DEKO_FADE_TRANSITION = { duration: 0.35, ease: 'easeOut' }

// aktion -> Deko-Komponente (Partikel/Gluehen NEBEN dem unbewegten Icon-
// Symbol). ruehren/mischen haben KEINEN Eintrag - deren gesamte Bewegung
// sitzt bereits auf dem Icon-Symbol selbst (siehe ICON_EIGENBEWEGUNG).
// Jede Komponente bekommt in SchrittIcon eine EIGENE AnimatePresence, damit
// sie beim Deaktivieren nicht hart aus dem DOM verschwindet, sondern
// ausfaedet (siehe DEKO_FADE_TRANSITION).

// kochen: 2-3 kleine Blasen steigen auf und "poppen" (kurzer Scale-Spike auf
// ~1, dann schnell auf ~0.2 runter) statt durchgehender Dampf-Linien -
// sprudelnder statt dunstender Eindruck. Positionen bewusst in den seitlichen
// Randstreifen des 32px-Kreises (das 18px-Icon selbst sitzt zentriert, laesst
// also ca. 7px Rand auf jeder Seite frei) bzw. bereits ueber dem Icon - eine
// mittige Platzierung wuerde die Blasen mit der eigenen (dunkelorangen)
// Kontur des Suppentopf-Icons verschmelzen lassen (per Screenshot-Test
// bestaetigt: dort kaum erkennbar). unterschiedliche delays fuer einen
// unregelmaessigen, natuerlichen Sprudel-Rhythmus.
const KOCHEN_BLASEN = [
  { left: '2px', bottom: '3px', delay: 0 },
  { right: '2px', bottom: '5px', delay: 0.35 },
  { left: '13px', top: '4px', delay: 0.7 },
]

function KochBlasen() {
  return (
    <>
      {KOCHEN_BLASEN.map(({ delay, ...position }, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary"
          style={position}
          animate={{ y: [0, -6, -11, -12], scale: [0.6, 1, 1, 0.2], opacity: [0, 0.85, 0.85, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut', delay, times: [0, 0.45, 0.85, 1] }}
        />
      ))}
    </>
  )
}

// braten: warmer Terracotta-Gluehpuls im Icon-Hintergrund (langsames Atmen)
// PLUS kurze, radial nach aussen spritzende Funken (Sizzle) - zwei parallele
// Schichten, die sich klar von "kochen" (nur aufsteigende Blasen) und
// "roesten" (nur durchgehendes, langsames Gluehen ohne Funken) abgrenzen.
const BRATEN_FUNKEN = [
  { top: '40%', left: '35%', dx: -8, dy: -6, delay: 0 },
  { top: '55%', left: '65%', dx: 8, dy: -5, delay: 0.22 },
  { top: '35%', left: '55%', dx: 5, dy: 8, delay: 0.44 },
  { top: '58%', left: '38%', dx: -6, dy: 7, delay: 0.66 },
]

function BratenSizzle() {
  return (
    <>
      <motion.span
        className="absolute inset-0.5 rounded-full bg-primary/25 blur-[3px]"
        animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.08, 0.95] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {BRATEN_FUNKEN.map((f, i) => (
        <motion.span
          key={i}
          className="absolute h-0.5 w-0.5 rounded-full bg-primary"
          style={{ top: f.top, left: f.left }}
          animate={{ x: [0, f.dx], y: [0, f.dy], opacity: [0, 1, 0], scale: [0.5, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut', delay: f.delay }}
        />
      ))}
    </>
  )
}

// roesten: durchgehender (nicht gepulster/partikelhafter) langsamer
// Gluehschein, der zwischen Terracotta (--color-primary) und Oliv
// (--color-secondary) ueberblendet - zwei versetzt getimte, halbtransparente
// Kreisflaechen statt einer echten Farb-Interpolation (KEIN neuer Farbwert,
// siehe CLAUDE.md - beide Toene sind bereits bestehende Tokens). Dazu zwei
// duenne, schnell flirrende Hitze-Wellenlinien (schmaler + hoehere Frequenz
// als DampfSchwaden's Schwaden) - klare Abgrenzung zu "kochen".
function RoestenGluehen() {
  return (
    <>
      <motion.span
        className="absolute inset-0.5 rounded-full bg-primary/25 blur-[3px]"
        animate={{ opacity: [0.45, 0.15, 0.45], scale: [1, 1.1, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
      />
      <motion.span
        className="absolute inset-0.5 rounded-full bg-secondary/20 blur-[3px]"
        animate={{ opacity: [0.15, 0.4, 0.15], scale: [1, 1.08, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
      />
      <motion.span
        className="absolute -top-1 left-2 h-2 w-px bg-primary/70"
        animate={{ scaleY: [0.6, 1, 0.6], opacity: [0.3, 0.9, 0.3], skewX: [-6, 6, -6] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
      />
      <motion.span
        className="absolute -top-1 right-2 h-2 w-px bg-primary/70"
        animate={{ scaleY: [0.6, 1, 0.6], opacity: [0.3, 0.9, 0.3], skewX: [6, -6, 6] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
      />
    </>
  )
}

// schneiden: kurzer Funken-/Strich-Blitz am unteren Icon-Rand exakt am
// Einschlag-Moment. times deckungsgleich mit ICON_EIGENBEWEGUNG.schneiden
// (dieselbe 0.7s-Periode, Peak bei t=0.5 = dem tiefsten Punkt der Auf-Ab-
// Bewegung) - marginLeft statt einer translate-x-Utility-Klasse, weil
// framer-motion beim Animieren von scaleX die GESAMTE inline transform-
// Eigenschaft des Elements selbst schreibt und eine zusaetzliche Tailwind-
// Transform-Klasse auf demselben Element ueberschreiben wuerde.
function SchneidenFunke() {
  return (
    <motion.span
      className="absolute bottom-0.5 left-1/2 h-px w-2.5 bg-primary"
      style={{ marginLeft: '-5px' }}
      animate={{ opacity: [0, 0, 1, 0, 0], scaleX: [0.4, 0.4, 1, 0.6, 0.4] }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', times: [0, 0.4, 0.5, 0.65, 1] }}
    />
  )
}

// warten: einzelner, langsam fallender Punkt (Sanduhr-Sand) - laeuft
// unabhaengig vom Flip auf einer eigenen, kuerzeren Schleife (1.5s) durch,
// damit die lange Ruhephase zwischen den Flips (siehe ICON_EIGENBEWEGUNG.
// warten) nicht komplett bewegungslos wirkt.
function WartenSandkorn() {
  return (
    <motion.span
      className="absolute left-1/2 top-1.5 h-0.5 w-0.5 rounded-full bg-primary"
      style={{ marginLeft: '-1px' }}
      animate={{ y: [0, 11], opacity: [0, 0.8, 0.8, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeIn', times: [0, 0.15, 0.8, 1] }}
    />
  )
}

// servieren: die bestehenden Glitzerpunkte PLUS ein einmaliges diagonales
// Hochglanz-Wischen pro Loop ("fertig, glaenzt"-Moment). Die Rotation des
// Wisch-Streifens sitzt bewusst auf einem STATISCHEN Zwischen-Span (per
// Tailwind-Klasse), nicht auf dem von framer-motion animierten innersten
// Span - aus demselben Grund wie bei SchneidenFunke oben (framer wuerde
// eine zusaetzliche Transform-Klasse auf dem animierten Element selbst
// ueberschreiben). Der aeussere Span clippt den Streifen auf die Icon-
// Kreisflaeche (overflow-hidden+rounded-full), ausschliesslich fuer diese
// eine Deko - der gemeinsame Icon-Container bleibt bewusst OHNE
// overflow-hidden, damit z. B. DampfSchwaden/Glitzer bei anderen aktion-
// Typen weiterhin leicht ueber den Kreisrand hinausragen koennen.
function ServierGlitzer() {
  return (
    <>
      <motion.span
        className="absolute -top-0.5 -right-0.5 h-1 w-1 rounded-full bg-primary"
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
      />
      <motion.span
        className="absolute -bottom-0.5 -left-0.5 h-1 w-1 rounded-full bg-primary"
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
      />
    </>
  )
}

function ServierDeko() {
  return (
    <>
      <ServierGlitzer />
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute -inset-y-3 left-0 h-[150%] w-3 -rotate-12">
          <motion.span
            className="block h-full w-full bg-gradient-to-r from-transparent via-card/90 to-transparent"
            animate={{ x: ['-150%', '250%'] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
          />
        </span>
      </span>
    </>
  )
}

const AKTION_DEKO = {
  kochen: KochBlasen,
  braten: BratenSizzle,
  roesten: RoestenGluehen,
  schneiden: SchneidenFunke,
  warten: WartenSandkorn,
  servieren: ServierDeko,
}

// Schritt-Icon inkl. Animation fuer GENAU den aktuellen Schritt (siehe
// aktuellerSchrittIndex-Berechnung in KochModusInhalt unten).
//
// Duty-Cycle statt Dauerschleife (siehe ICON_EIGENBEWEGUNG/PULS_RHYTHMUS-
// Kommentare oben): ein lokaler Timer schaltet zwischen einem kurzen
// Bewegungs-Puls (pulsAktiv=true) und einer laengeren Ruhephase um, SOLANGE
// dieser Schritt der aktuelle ist. versatzSekunden verschiebt den Start
// dieses Zyklus pro Schrittkarte, damit mehrere gleichzeitig sichtbare
// aktive Icons nicht im selben Takt zucken.
//
// Zwei getrennte Bewegungs-Kanaele mit unterschiedlichem Ausklinge-Verhalten
// beim Deaktivieren (Puls endet, Schritt wird abgehakt oder ist nicht mehr
// aktuell):
//  1. Icon-Eigenbewegung (rotate/x/y/scale auf dem Symbol selbst, siehe
//     ICON_EIGENBEWEGUNG): bleibt PERMANENT gemountet, animate/transition-
//     Props wechseln lediglich zur Ruhepose (ICON_RUHE_POSE) mit einer
//     eigenen, weichen Feder (ICON_RUHE_SPRING) - framer-motion interpoliert
//     dabei automatisch vom aktuellen (ggf. mitten in der Bewegung
//     befindlichen) Wert aus, kein hartes Einfrieren.
//  2. Deko-Partikel (Blasen/Funken/Gluehen/Glitzer, siehe AKTION_DEKO): WIRD
//     entfernt, aber ueber eine lokale AnimatePresence mit exit={{opacity:0}}
//     erst ausgefadet statt sofort aus dem DOM zu verschwinden - dadurch
//     laeuft kein neuer Partikel-Zyklus mehr an, der laufende blendet aber
//     weich aus statt hart abzureissen.
function SchrittIcon({ Icon, aktion, istAktuell, reduzierteBewegung, versatzSekunden }) {
  const eigenbewegung = ICON_EIGENBEWEGUNG[aktion]
  const rhythmus = PULS_RHYTHMUS[aktion]
  const [pulsAktiv, setPulsAktiv] = useState(false)

  useEffect(() => {
    if (!istAktuell || reduzierteBewegung || !eigenbewegung || !rhythmus) {
      setPulsAktiv(false)
      return undefined
    }

    // Puls-Dauer ergibt sich aus der Dauer EINES ICON_EIGENBEWEGUNG-Zyklus
    // mal PULS_RHYTHMUS.wiederholungen (siehe zielTransition unten, das ist
    // exakt dieselbe Rechnung) - der Timer und die tatsaechlich laufende
    // Animation muessen deckungsgleich enden, sonst wuerde entweder mitten
    // in der Bewegung hart auf Ruhepose umgeschaltet oder das Icon staende
    // nach Animationsende noch kurz sichtbar still, bevor der Timer greift.
    const pulsDauerMs = eigenbewegung.transition.duration * rhythmus.wiederholungen * 1000
    const ruheDauerMs = rhythmus.ruheSekunden * 1000
    let timeoutId

    function pulsStarten() {
      setPulsAktiv(true)
      timeoutId = setTimeout(ruheStarten, pulsDauerMs)
    }
    function ruheStarten() {
      setPulsAktiv(false)
      timeoutId = setTimeout(pulsStarten, ruheDauerMs)
    }

    timeoutId = setTimeout(pulsStarten, versatzSekunden * 1000)
    return () => clearTimeout(timeoutId)
  }, [istAktuell, reduzierteBewegung, aktion, eigenbewegung, rhythmus, versatzSekunden])

  const animiert = istAktuell && !reduzierteBewegung && pulsAktiv
  const zielPose = animiert && eigenbewegung ? eigenbewegung.animate : ICON_RUHE_POSE
  const zielTransition =
    animiert && eigenbewegung
      ? { ...eigenbewegung.transition, repeat: rhythmus.wiederholungen - 1 }
      : reduzierteBewegung
        ? { duration: 0 } // Reduzierte Bewegung: instantan, keine Ausklinge-Animation.
        : ICON_RUHE_SPRING

  const Deko = AKTION_DEKO[aktion]
  const zeigtDeko = animiert && !!Deko

  return (
    <span
      className={`relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ${
        // Der Ring markiert den aktuellen Schritt JETZT durchgehend, nicht
        // mehr nur unter reduzierter Bewegung: er ist der Normalzustand, den
        // man dank Duty-Cycle ca. 80 % der Zeit sieht (siehe Aufgabenstellung
        // "Ruhepose muss fuer sich gut aussehen"), waehrend der kurze
        // Bewegungs-Puls dazwischen zusaetzlich dazukommt statt die einzige
        // "das ist dein Schritt"-Markierung zu sein - dadurch verschwindet
        // beim Puls-Ende auch kein visuelles Signal, es wird nur ruhiger.
        istAktuell ? 'ring-2 ring-primary/50' : ''
      }`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {zeigtDeko && (
          <motion.span
            key="deko"
            className="pointer-events-none absolute inset-0"
            exit={{ opacity: 0 }}
            transition={DEKO_FADE_TRANSITION}
          >
            <Deko />
          </motion.span>
        )}
      </AnimatePresence>
      <motion.span
        className="relative flex h-full w-full items-center justify-center"
        animate={zielPose}
        transition={zielTransition}
      >
        <Icon size={18} stroke={1.75} />
      </motion.span>
    </span>
  )
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
// farben statt neutral-schwarz: --color-text ist bereits der dunkle Warmton
// (#3E2E22) aus dem Marken-Farbschema, hier per color-mix() mit reduzierter
// Deckkraft als Abdunklung verwendet. KEIN neuer Farbwert (siehe CLAUDE.md).
//
// BEWUSST color-mix(in srgb, var(--color-text) X%, transparent) als
// background-color statt (wie urspruenglich) die CSS-Eigenschaft "opacity"
// auf dem ganzen Backdrop-Element: opacity wirkt auf das GESAMTE Element
// INKLUSIVE seines eigenen backdrop-filter-Ergebnisses und "verduennt" den
// dadurch berechneten Blur in Chromium fast bis zur Unsichtbarkeit (per
// isoliertem Test bestaetigt - derselbe Blur-Wert ist mit opacity kaum
// erkennbar, mit einer alpha-transparenten background-color dagegen klar
// sichtbar). color-mix() liefert dieselbe visuelle Abdunklung OHNE die
// opacity-Eigenschaft anzufassen, backdrop-filter bleibt dadurch bei voller
// Blur-Staerke sichtbar.
const BACKDROP_BLUR_MAX_PX = 14
const BACKDROP_DIM_MAX_PERCENT = 45

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
// Schliessen komplett unmounted). reduzierteBewegung kommt von
// KochModusSheet durch (dort ohnehin schon per useReducedMotion ermittelt).
function KochModusInhalt({ rezept, karte, erledigteSchritte, onSchrittUmschalten, reduzierteBewegung }) {
  // Der "aktuelle Schritt" ist der erste noch NICHT abgehakte - findIndex
  // liefert -1, wenn alle Schritte erledigt sind (dann animiert kein Icon
  // mehr, siehe SchrittIcon-Vergleich istAktuell unten).
  const aktuellerSchrittIndex = rezept.anleitung.findIndex((_, index) => !erledigteSchritte.has(index))

  // Zutaten-Split (Design-Durchgang fuer Rezepte mit 8-14 statt vormals fest
  // 4 Zutaten, siehe Kommentar an der Zutatenliste unten): zutaten.istGrundzutat
  // kommt 1:1 aus der DB-Spalte zutaten.ist_grundzutat (rezeptKarteDaten.js) -
  // KEINE Heuristik ueber Menge oder Namen, die Kuratierung liegt bewusst bei
  // Gregor in der DB, nicht in dieser Komponente. sortierung bleibt INNERHALB
  // jeder Gruppe erhalten (karte.zutaten kommt schon sortiert rein).
  //
  // Schwelle GRUNDZUTATEN_SPLIT_AB_ANZAHL statt immer zu splitten: bei
  // Fruehstueck/Snack-Rezepten (per Stichprobe ueber alle 30 Rezepte: meist
  // genau 1 Grundzutat, z. B. "Skyr-Snack mit Beeren" mit 6 Zutaten/1
  // Grundzutat) waere eine eigene Ueberschrift + Chip-Zeile fuer 1-2
  // Eintraege MEHR Struktur als die eigentliche Liste braucht - das Problem
  // (gleich gewichtete Pillen bei vielen Zutaten) existiert dort schlicht
  // nicht. Ab 3 Grundzutaten lohnt sich die eigene Gruppe (trifft laut
  // Stichprobe fast alle Mittag-/Abend-Rezepte plus die zutatenreicheren
  // Snacks wie "Kichererbsen-Snack"). Unterhalb der Schwelle bleiben ALLE
  // Zutaten in der normalen Kartenliste, unabhaengig von istGrundzutat.
  const GRUNDZUTATEN_SPLIT_AB_ANZAHL = 3
  const alleGrundZutaten = karte.zutaten.filter((z) => z.istGrundzutat)
  const splitAktiv = alleGrundZutaten.length >= GRUNDZUTATEN_SPLIT_AB_ANZAHL
  const hauptZutaten = splitAktiv ? karte.zutaten.filter((z) => !z.istGrundzutat) : karte.zutaten
  const grundZutaten = splitAktiv ? alleGrundZutaten : []

  return (
    // pb-[...]: Safe-Area unten (Home-Indicator) zusaetzlich zum bisherigen
    // pb-6 - das Sheet reicht bis bottom-0 (siehe KochModusSheet), ohne
    // env(safe-area-inset-bottom) wuerde der letzte Kochschritt auf
    // Geraeten mit Home-Indicator zu nah an dessen Bereich enden.
    <div className="pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]">
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
          Name+Menge je Zutat zum schnellen Nachschauen waehrend des Kochens.
          Zwei-Gruppen-Split (Design-Durchgang, siehe hauptZutaten/
          grundZutaten oben): bei 8-13 Zutaten machte eine einzige Liste
          gleich grosser Karten aus "150g Kichererbsen" und "1 Prise Salz"
          optisch dasselbe Gewicht - genau das Problem, das dieser Durchgang
          loesen soll (siehe Aufgabenstellung). hauptZutaten bleiben volle
          Karten (das, wofuer man tatsaechlich einkaufen/vorbereiten muss),
          grundZutaten (Gewuerze, Bruehe, Saft, ...) wandern in eine
          kompaktere Chip-Zeile darunter - kleiner, aber nicht versteckt. */}
      <div className="mx-4 mt-3 flex flex-col gap-2">
        {hauptZutaten.map((z) => (
          <div
            key={z.zutatId}
            className={`rounded-lg px-3 py-2 ${
              // Optional bekommt jetzt eine eigene Kartenkontur (gestrichelt)
              // statt nur eines angehaengten "· optional"-Wortes im Fliesstext
              // - auf einen Blick erkennbar, ohne die Zeile lesen zu muessen
              // (siehe Aufgabenstellung "klarer abgesetzt").
              z.optional ? 'border border-dashed border-text-muted/40 bg-card' : 'bg-secondary/10'
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-text">{z.name}</p>
              <p className="shrink-0 text-sm font-medium text-text">
                <AnimierteZahl wert={z.anzeigeMenge ?? 0} /> {z.anzeigeEinheit}
              </p>
            </div>
            {(z.anmerkung || z.optional) && (
              <p className="mt-0.5 text-xs text-text-muted">
                {[z.anmerkung, z.optional ? 'optional' : null].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {grundZutaten.length > 0 && (
        <div className="mx-4 mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Aus dem Vorrat</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {grundZutaten.map((z) => (
              <span
                key={z.zutatId}
                className={`rounded-full px-2.5 py-1 text-xs text-text-muted ${
                  z.optional ? 'border border-dashed border-text-muted/40' : 'bg-secondary/10'
                }`}
              >
                {z.name} · {z.anzeigeMenge ?? 0} {z.anzeigeEinheit}
                {z.optional && ' · optional'}
              </span>
            ))}
          </div>
        </div>
      )}

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
                  <SchrittIcon
                    Icon={Icon}
                    aktion={schritt.aktion}
                    istAktuell={index === aktuellerSchrittIndex}
                    reduzierteBewegung={reduzierteBewegung}
                    versatzSekunden={VERSATZ_STAFFELUNG_SEKUNDEN[index % VERSATZ_STAFFELUNG_SEKUNDEN.length]}
                  />
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

      {/* Tipps bekommen einen eigenen, benannten Platz UNTERHALB der ganzen
          Anleitung statt gar nicht angezeigt zu werden (Luecke im
          Datenmodell-Umbau, siehe Aufgabenstellung). Bewusst NICHT einzelnen
          Schritten zugeordnet: rezepte.tipps hat dafuer aktuell kein Feld
          (kein schritt-Index in der jsonb-Struktur, nur { titel, text }) -
          und inhaltlich sind nicht alle Tipps ueberhaupt schrittspezifisch
          (z. B. "Warm oder kalt" bei der Couscous-Bowl betrifft das fertige
          Gericht, nicht einen einzelnen Schritt). Eine Zuordnung waere reine
          Texterkennung/Raten - genau die Art Praezision-vortaeuschende
          Komplexitaet, die CLAUDE.md Abschnitt 6 nicht meint. Falls
          schrittgebundene Tipps gewuenscht sind, braucht das ein eigenes
          Feld in der jsonb-Struktur plus Neuzuordnung der bestehenden Tipps
          in der DB - eigene Content-Aufgabe fuer Gregor, kein Rendering-Detail. */}
      {/* Bewusst NICHT mx-4 + einzelne Karten wie Zutaten/Anleitung darueber -
          das haette wie ein nachtraeglich angehaengter Kasten gewirkt (siehe
          Aufgabenstellung). Stattdessen randlose, ganzflaechig eingefaerbte
          Sektion (wie das Titelbild oben randlos ist) - das rahmt den Screen
          bewusst: Foto oben, Tipps-Band unten, dazwischen die eigentliche
          Arbeit. Die Icon-Badges (h-8 w-8 rounded-full bg-primary/10
          text-primary) sind bewusst identisch zur Kreisform der
          Schritt-Icons oben (SchrittIcon-Wrapper) - derselbe visuelle
          Baustein, keine neu erfundene Optik nur fuer diese Sektion. */}
      {rezept.tipps?.length > 0 && (
        <div className="mt-6 bg-secondary/10 px-4 pt-5">
          <h2 className="font-display text-xl font-semibold text-text">Tipps</h2>
          <div className="mt-3 flex flex-col gap-4 pb-5">
            {rezept.tipps.map((tipp, index) => (
              <div key={index} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                  <IconBulb size={16} stroke={1.75} />
                </span>
                <div>
                  <p className="text-sm font-medium text-text">{tipp.titel}</p>
                  <p className="mt-0.5 text-sm text-text-muted">{tipp.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const dimPercent = useTransform(y, [0, sheetHoehe], [BACKDROP_DIM_MAX_PERCENT, 0])
  const backdropFilterWert = useMotionTemplate`blur(${blurPx}px)`
  const backdropHintergrundWert = useMotionTemplate`color-mix(in srgb, var(--color-text) ${dimPercent}%, transparent)`

  // EINZIGER Schliess-Pfad fuer alle drei Ausloeser (Drag-Wegziehen, "←
  // Zurück"-Button, Tap auf den Hintergrund-Streifen) - alle rufen diese
  // Funktion auf, damit sich das Sheet IMMER sichtbar zuzieht statt bei
  // Button/Tap nur zu verblassen. startGeschwindigkeit ist bei einer echten
  // Drag-Geste die tatsaechliche Loslass-Geschwindigkeit (natuerliche
  // Fortsetzung der Wischgeste), bei Button/Tap 0 (kein Schwung vorhanden).
  // Erst zuende animieren, DANACH erst onZurueck - sonst wuerde React das
  // Sheet mitten in der eigenen Zuzieh-Animation unmounten.
  function schliessen(startGeschwindigkeit = 0) {
    if (reduzierteBewegung) {
      onZurueck()
      return
    }
    animate(y, sheetHoehe, { ...DRAG_SCHLIESSEN_SPRING, velocity: startGeschwindigkeit, onComplete: onZurueck })
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
          dimPercent oben) - laeuft dadurch live mit, ob der Nutzer gerade
          zieht oder die Tween-Animation laeuft. ZUSAETZLICH ein echter
          <button>, kein reines Deko-Div: ein Tap auf den sichtbaren
          Hintergrund-Streifen oberhalb des Sheets schliesst es ueber
          denselben schliessen()-Pfad wie Drag/"← Zurück" (siehe Aufgabe).
          Der Button ist zwar "fixed inset-0" (volle Viewport-Groesse), aber
          nur der obere Streifen ist tatsaechlich TREFFBAR - der Rest liegt
          unter dem Sheet (z-50), das seinerseits eigene Klick-Ziele hat.
          Unter reduzierter Bewegung bewusst STATISCHE Werte (kein Blur-
          UEBERGANG, siehe Aufgabenstellung) statt der y-gekoppelten
          Transforms, da unter reduzierter Bewegung ohnehin nicht gezogen
          werden kann (drag ist unten deaktiviert) - y wuerde sonst konstant
          bei 0 stehen und permanent volle Intensitaet liefern, was fuer
          EXIT (Schliessen) falsch waere. exit setzt Blur/Hintergrund
          zusaetzlich explizit auf 0 zurueck, damit beim (dort instantanen)
          Schliessen kein Rest-Blur haengen bleibt, auch wenn opacity 0
          das ohnehin schon unsichtbar macht. */}
      <motion.button
        type="button"
        aria-label="Kochmodus schließen"
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
            <AnimatedButton type="button" onClick={() => schliessen()} className="text-sm text-primary hover:underline">
              ← Zurück
            </AnimatedButton>
            <p className="text-sm font-medium text-text-muted">
              {erledigteSchritte.size}/{rezept.anleitung.length} Schritte
            </p>
          </div>
        </div>

        {/* overflow-x-hidden overscroll-x-none: dieselbe Absicherung gegen
            WKWebViews interne WKChildScrollView-Bewegung wie am
            App.jsx-Content-Wrapper (siehe dortiger Kommentar zur Herleitung
            ueber ein natives Laufzeit-Log, inkl. NACHTRAG 2 zu
            overflow-x-hidden - hier ohne x/rotate-transformierte Kinder
            also nicht der eigentliche Bug-Fundort, aber aus
            Konsistenzgruenden identisch behandelt) - JEDER eigene
            overflow-y-auto-Bereich bekommt in WKWebView seine eigene
            ScrollView. Bewusst OHNE touch-pan-y hier (anders als am
            App.jsx-Wrapper): dieser Bereich hat mit
            handlePointerDownInhalt bereits eine eigene, sorgfaeltig
            austarierte Pointer-Logik fuer das Zusammenspiel mit dem
            vertikalen Drag-to-close der ganzen Sheet (siehe deren
            Kommentare) - touch-action zusaetzlich zu setzen waere ein
            unnoetiges Risiko fuer dieses bereits funktionierende
            Zusammenspiel, ohne dass dieser Screen bisher ueberhaupt vom
            gemeldeten Bug betroffen war. */}
        <div ref={inhaltRef} onPointerDown={handlePointerDownInhalt} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain overscroll-x-none">
          <KochModusInhalt
            rezept={rezept}
            karte={karte}
            erledigteSchritte={erledigteSchritte}
            onSchrittUmschalten={onSchrittUmschalten}
            reduzierteBewegung={reduzierteBewegung}
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
// Momentaufnahme-Snapshot vom Oeffnen-Zeitpunkt (rezeptKarteDaten-Ergebnis),
// kein State mehr - seit dem Datenmodell-Umbau ohnehin ziel-/makroZiele-
// unabhaengig (feste Naehrwerte/Mengen aus der DB), kann also erst recht
// nicht mehr waehrend der Session veralten.
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
