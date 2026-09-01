import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { IconArrowRight } from '@tabler/icons-react'
import { SplashScreen } from '@capacitor/splash-screen'
import { EXPO_OUT } from '../motionConfig'

// Das native SplashScreen-Plugin (siehe capacitor.config.json,
// launchAutoHide:false) haelt den nativen Cream-Splash bewusst offen, bis
// WIR ihn hier explizit ausblenden - genau in dem Moment, in dem dieser
// Screen sein erstes Frame gerendert hat. Da das native Splash-Bild (siehe
// resources/gusto_splash.png) jetzt eine reine Cream-Flaeche OHNE Logo ist -
// exakt dieselbe Farbe wie der Hintergrund hier (--color-bg) - ist der
// Uebergang fuer das Auge unsichtbar: es verschwindet einfach eine Flaeche
// unter einer identischen Flaeche, WAEHREND darueber bereits der erste
// Buchstabe von "gusto" einzublenden beginnt. hide() ist auf Web (Browser-
// Dev, kein natives Capacitor) ein reiner No-Op (siehe
// @capacitor/splash-screen/web.js) - kein Guard noetig.
function nativenSplashAusblenden() {
  SplashScreen.hide()
}

const BEREITS_GEOEFFNET_LOCALSTORAGE_KEY = 'gusto-app-bereits-geoeffnet'

// Ob dieser Startbildschirm schon einmal komplett durchlaufen wurde (PFAD B
// unten) - analog zum Onboarding-Flag-Muster in App.jsx
// (ONBOARDING_LOCALSTORAGE_KEY), aber bewusst HIER lokal gehalten statt
// dort: anders als onboardingAbgeschlossen (das die App-weite
// Wizard/Hauptansicht-Weiche steuert) betrifft dieses Flag ausschliesslich
// die interne Choreografie dieser einen Komponente.
function bereitsGeoeffnetLaden() {
  return localStorage.getItem(BEREITS_GEOEFFNET_LOCALSTORAGE_KEY) === 'true'
}

// Das Wortmark selbst - einzeln referenziert (statt nur als JSX-Text), weil
// sowohl die Buchstaben-Aufsplittung unten als auch die Gesamtdauer-
// Berechnung (BUCHSTABEN_GESAMT_*_S) seine Laenge kennen muessen.
const WORTMARKE = 'gusto'
const BUCHSTABEN_ANZAHL = WORTMARKE.length

// Buchstaben-Aufbau: jeder Buchstabe blendet EINZELN ein (Scale-Einflug
// 0.85->1, Fade, leichtes Hochdriften), statt wie frueher das komplette Wort
// auf einmal - siehe Aufgabenstellung. Getrennte Versatz-/Dauer-Werte fuer
// PFAD A (Erstbesuch, siehe Rendering weiter unten) und PFAD B
// (Folgebesuch): Folgebesuche sollen spuerbar schneller wirken, da dort kein
// Tap abgewartet wird, sondern direkt in die Hauptansicht uebergeblendet
// wird. Ziel-Gesamtdauer bewusst als FESTE Vorgabe pro Pfad definiert
// (PFAD A ~2.0s, PFAD B ~1.3s, siehe Geraetetest-Feedback), Stagger und
// Einzeldauer sind daraus zurueckgerechnet ((n-1) * Stagger + Dauer =
// Zielwert) - NICHT einfach linear von den alten (zu knappen) Werten
// hochskaliert. Aufteilung in beiden Pfaden bewusst so gewaehlt, dass die
// Einzeldauer deutlich groesser als der Stagger ist (Verhaeltnis ~3.5-4x):
// dadurch ueberlappen sich die Animationen benachbarter Buchstaben spuerbar
// (naechster Buchstabe startet, WAEHREND der vorherige noch sanft
// ausklingt) statt dass jeder Buchstabe isoliert "tickt" - das ergibt den
// gewuenschten organischen/fliessenden statt mechanisch-linearen Eindruck.
// Trotz der Ueberlappung bleiben die Buchstaben einzeln erkennbar, weil
// EXPO_OUT (Ease-Out) den Grossteil der sichtbaren Bewegung jedes
// Buchstabens schon in der ersten Haelfte seiner Dauer zeigt - das Ende ist
// nur noch ein feines Ausklingen.
// BUCHSTABEN_GESAMT_*_S ist der Zeitpunkt, an dem der LETZTE Buchstabe
// fertig ist ((n-1) Versaetze + eine Buchstaben-Dauer) - Referenzpunkt fuer
// den Halo-Glow-Peak (GLOW_EINTRITT_DAUER_*_S) UND fuer Button-Erscheinen
// (BUTTON_VERZOEGERUNG_S) bzw. den Auto-Trigger in PFAD B
// (NAECHSTE_ANSICHT_VERZOEGERUNG_FOLGEBESUCH_S) weiter unten - bewusst NICHT
// von der Buchstaben-Gesamtdauer entkoppelt: Button/Auto-Trigger warten
// weiterhin, bis der letzte Buchstabe fertig aufgebaut ist, sonst wuerde der
// Button erscheinen bzw. (in PFAD B) die Ausblenden-Choreografie starten,
// WAEHREND noch Buchstaben mitten in der Einblend-Animation haengen - das
// waere sichtbar abgeschnitten/kaputt.
const BUCHSTABE_SCALE_START = 0.85
const BUCHSTABE_DRIFT_PX = 8

// PFAD A: 4 * 0.25s + 1.0s = 2.0s exakt (Verhaeltnis Dauer/Stagger = 4).
const BUCHSTABE_VERSATZ_ERSTBESUCH_S = 0.25
const BUCHSTABE_DAUER_ERSTBESUCH_S = 1.0
const BUCHSTABEN_GESAMT_ERSTBESUCH_S = (BUCHSTABEN_ANZAHL - 1) * BUCHSTABE_VERSATZ_ERSTBESUCH_S + BUCHSTABE_DAUER_ERSTBESUCH_S // = 2.0s

// PFAD B: 4 * 0.15s + 0.7s = 1.3s exakt (Verhaeltnis Dauer/Stagger ~4.67,
// spuerbar knapperer Stagger als PFAD A fuer den gewuenschten schnelleren
// Eindruck, aber ein noch etwas hoeheres Verhaeltnis als PFAD A - die
// Einzeldauer dominiert relativ noch staerker - damit es trotz der
// kuerzeren Gesamtzeit nicht wieder abrupt wirkt).
const BUCHSTABE_VERSATZ_FOLGEBESUCH_S = 0.15
const BUCHSTABE_DAUER_FOLGEBESUCH_S = 0.7
const BUCHSTABEN_GESAMT_FOLGEBESUCH_S = (BUCHSTABEN_ANZAHL - 1) * BUCHSTABE_VERSATZ_FOLGEBESUCH_S + BUCHSTABE_DAUER_FOLGEBESUCH_S // = 1.3s

// Reduced-Motion-Ersatz fuer den gestaffelten Aufbau (siehe Rendering weiter
// unten): einfaches, schnelles Fade des KOMPLETTEN Wortmarks statt einzelner
// Buchstaben, in BEIDEN Pfaden - Dauer dient in PFAD B zugleich als
// Referenzpunkt fuer den automatischen Uebergang (analog zu
// BUCHSTABEN_GESAMT_FOLGEBESUCH_S im Normalfall).
const BUCHSTABEN_EINFACH_DAUER_S = 0.2

// Anteil der Glow-Eintritt-Dauer, bei dem der Opacity-Peak erreicht wird
// (siehe GLOW_EINTRITT_TIMES) - daraus leiten sich GLOW_EINTRITT_DAUER_*_S
// so ab, dass der Peak GENAU dann eintritt, wenn der letzte Buchstabe fertig
// aufgebaut ist ("sobald alle Buchstaben stehen, erreicht der Halo-Glow
// volle Intensitaet", siehe Aufgabenstellung).
const GLOW_EINTRITT_PEAK_ANTEIL = 0.55
const GLOW_EINTRITT_OPACITY = [0, 0.5, 0.18]
const GLOW_EINTRITT_TIMES = [0, GLOW_EINTRITT_PEAK_ANTEIL, 1]
const GLOW_EINTRITT_DAUER_ERSTBESUCH_S = BUCHSTABEN_GESAMT_ERSTBESUCH_S / GLOW_EINTRITT_PEAK_ANTEIL
const GLOW_EINTRITT_DAUER_FOLGEBESUCH_S = BUCHSTABEN_GESAMT_FOLGEBESUCH_S / GLOW_EINTRITT_PEAK_ANTEIL

// Ruhe-Puls NACH dem Eintritt: sehr langsamer, dezenter Atem-Zyklus, laeuft
// endlos weiter, solange der Startbildschirm sichtbar ist (siehe useEffect
// unten - wird per animate() IMPERATIV erst nach Abschluss des Eintritts
// gestartet statt als Teil eines einzigen repeat:Infinity-Keyframe-Arrays,
// weil sich sonst die einmalige Eintritts-Spitze bei JEDEM Loop-Durchlauf
// wiederholen wuerde statt nur beim allerersten Mal).
const GLOW_RUHE_DAUER_S = 6
const GLOW_RUHE_OPACITY = [0.12, 0.2, 0.12]
const GLOW_RUHE_SCALE = [1, 1.06, 1]

// PFAD A (Erstbesuch, siehe bereitsGeoeffnet-Weiche unten): Pause nach dem
// Buchstabenaufbau, bevor der Button erscheint. Bewusst zusaetzlich zur
// (jetzt laengeren) Buchstaben-Gesamtdauer, nicht Teil davon - siehe
// Geraetetest-Feedback "0.3s laenger ON TOP der Buchstabenzeit". Danach
// wartet der Button OHNE Zeitlimit auf den Tap - siehe Geraetetest-Feedback
// "Tap soll zwingend notwendig sein, kein Auto-Advance mehr in PFAD A" (kein
// BUTTON_AUTO_DAUER_S/Auto-Trigger-Timer mehr, siehe dazu auch dessen
// Entfernung im Auto-Trigger-Effekt weiter unten).
const BUCHSTABEN_PAUSE_S = 0.42
const BUTTON_VERZOEGERUNG_S = BUCHSTABEN_GESAMT_ERSTBESUCH_S + BUCHSTABEN_PAUSE_S // = 2.42s
const BUTTON_DAUER_S = 0.45

// PFAD B (Folgebesuch, siehe Auto-Trigger-Effekt weiter unten): Pause nach
// dem Buchstabenaufbau, bevor die Ausblenden-/Crossfade-Choreografie
// automatisch startet - analog zu BUCHSTABEN_PAUSE_S oben, aber fuer PFAD B
// neu eingefuehrt (vorher 0, siehe Geraetetest-Feedback).
const NAECHSTE_ANSICHT_PAUSE_FOLGEBESUCH_S = 0.3
const NAECHSTE_ANSICHT_VERZOEGERUNG_FOLGEBESUCH_S = BUCHSTABEN_GESAMT_FOLGEBESUCH_S + NAECHSTE_ANSICHT_PAUSE_FOLGEBESUCH_S // = 1.6s

// Eigener, staerkerer Press-Effekt NUR fuer den "Los geht's"-Button - bewusst
// NICHT der globale AnimatedButton-Press (scale: 0.97, siehe
// AnimatedButton.jsx/motionConfig.js), der app-weit fuer die vielen kleinen
// Buttons dezent bleiben soll. Dieser eine Button ist der einzige Tap auf
// diesem ganzen Bildschirm und der Startschuss fuer den anschliessenden
// Seiten-Swipe (siehe App.jsx) - er darf entsprechend mehr Gewicht haben,
// deshalb ein lokaler motion.button statt AnimatedButton hier.
//
// HERO_BUTTON_PRESS (Eindruecken): eigene, KURZE Transition NUR fuer die
// Hinbewegung (whileTap-Werte werden IMMER mit ihrer eigenen transition
// animiert, unabhaengig vom transition-Prop des motion.button - siehe
// framer-motion-Doku zu Gesture-Props) - ein knapper linearer/easeOut-Tween
// statt eines Springs, damit das Eindruecken selbst kontrolliert wirkt (kein
// Wabbeln WAEHREND der Finger noch auf dem Button liegt).
//
// HERO_BUTTON_RELEASE_SPRING (Loslassen): das eigentliche "knackige"
// Zurueckfedern - greift automatisch beim Ende der Tap-Geste, weil framer-
// motion dann zur naechsten aktiven Ziel-Groesse (hier: die transition-Prop
// des motion.button selbst, siehe Verwendungsstelle) zurueckanimiert. Niedrige
// Daempfung (damping 12 bei stiffness 480) fuer ein bewusst SICHTBARES,
// aber kurzes Ueberschwingen leicht ueber 1.0, bevor es sich einpendelt -
// genau das gewuenschte "hochwertige, satte" Gefuehl statt eines reinen
// Einrastens ohne jedes Nachschwingen (das haette sich zu abrupt/hart statt
// "knackig" angefuehlt).
const HERO_BUTTON_PRESS = { scale: 0.92, transition: { duration: 0.12, ease: 'easeOut' } }
const HERO_BUTTON_RELEASE_SPRING = { type: 'spring', stiffness: 480, damping: 12, mass: 0.6 }

// Shimmer-Sweep auf dem "Los geht's"-Button: ein heller, leicht schraeger
// Lichtstreif laeuft periodisch diagonal durch, mit einer ruhigen Pause
// dazwischen (repeatDelay) statt eines hektischen Dauerloops - siehe
// Aufgabenstellung "dezent halten, nicht wie ein aufdringlicher
// Werbe-Effekt". Layer wird NUR ausserhalb reduzierter Bewegung ueberhaupt
// gerendert (siehe Verwendungsstelle), nicht nur pausiert - "Button-Shimmer
// aus (statisch)" verlangt einen wirklich unbewegten Button, kein
// unsichtbar mitlaufendes Element.
const SHIMMER_SWEEP_DAUER_S = 1.3
const SHIMMER_PAUSE_S = 2.6

// Ausblenden-Choreografie beim Tap bzw. beim automatischen Trigger (siehe
// naechsteAnsicht-Uebergang in App.jsx fuer die anschliessende, LANGSAMERE
// Wizard-/Hauptansicht-Einblendung): Wortmark, Halo und Button (PFAD A) bzw.
// nur Wortmark und Halo (PFAD B, kein Button vorhanden) faden gemeinsam aus,
// Wortmark/Button zusaetzlich mit einem minimalen Nach-oben-Drift
// (translateY negativ). AUSBLEND_DAUER_S bewusst KUERZER als die Einblend-
// Dauer der naechsten Ansicht (siehe dortige Konstante) - genau diese
// Asymmetrie (schnelleres Ausblenden, bewusst langsameres Einblenden) ist
// Teil der gewuenschten Choreografie.
const AUSBLEND_DAUER_S = 0.65
const AUSBLEND_DRIFT_PX = -16

// Erster Bildschirm beim App-Start (siehe App.jsx-Verwendungsstelle) - ein
// Marken-Moment VOR Wizard/Hauptansicht. onWeiter fuehrt zu genau dem, was
// App.jsx ohnehin als naechstes rendern wuerde (Wizard fuer neue Nutzer,
// Hauptansicht fuer wiederkehrende) - diese Komponente kennt diese
// Unterscheidung bewusst NICHT, sie ruft nur onWeiter auf und ueberlaesst
// App.jsx die bestehende onboardingAbgeschlossen-Weiche.
//
// ZWEI PFADE, gesteuert durch bereitsGeoeffnet (siehe
// BEREITS_GEOEFFNET_LOCALSTORAGE_KEY oben):
// - PFAD A (allererstes Oeffnen): Buchstabenaufbau, kurze Pause, dann
//   erscheint der "Los geht's"-Button - wartet OHNE Zeitlimit auf den Tap
//   (bewusst kein Auto-Trigger, siehe Geraetetest-Feedback "Tap soll
//   zwingend notwendig sein"). Der Tap setzt das Flag.
// - PFAD B (jeder weitere Besuch): derselbe Buchstabenaufbau, nur straffer
//   getaktet, OHNE Button/Pause - direkt im Anschluss faedet automatisch in
//   die naechste Ansicht ueber (unveraendert, weiterhin mit Auto-Trigger).
function Startbildschirm({ onWeiter }) {
  const reduzierteBewegung = useReducedMotion()
  const glowOpacity = useMotionValue(0)
  const glowScale = useMotionValue(1)

  // Lazy initializer: einmalig beim ersten Rendern aus localStorage gelesen
  // und danach fuer die gesamte Lebensdauer dieser Komponente unveraendert -
  // ein Wechsel MITTEN in der Choreografie ergibt inhaltlich keinen Sinn,
  // das Flag beschreibt ja "war das hier schon mal komplett durchgelaufen".
  const [bereitsGeoeffnet] = useState(bereitsGeoeffnetLaden)

  const buchstabeVersatzS = bereitsGeoeffnet ? BUCHSTABE_VERSATZ_FOLGEBESUCH_S : BUCHSTABE_VERSATZ_ERSTBESUCH_S
  const buchstabeDauerS = bereitsGeoeffnet ? BUCHSTABE_DAUER_FOLGEBESUCH_S : BUCHSTABE_DAUER_ERSTBESUCH_S
  const glowEintrittDauerS = bereitsGeoeffnet ? GLOW_EINTRITT_DAUER_FOLGEBESUCH_S : GLOW_EINTRITT_DAUER_ERSTBESUCH_S

  // Wird gesetzt, sobald die Ausblenden-Choreografie beginnt - ausgeloest
  // ENTWEDER durch einen Tap auf "Los geht's" (PFAD A, einziger Ausloeser
  // dort - kein Auto-Trigger mehr) ODER automatisch (PFAD B, siehe
  // Auto-Trigger-Effekt weiter unten). Button ist danach disabled (siehe
  // Verwendungsstelle), damit ein zweiter Tap waehrend des Ausblendens
  // nicht zwei ueberlappende Timer/onWeiter-Aufrufe ausloest.
  const [wirdAusgeblendet, setWirdAusgeblendet] = useState(false)

  // Blendet den NATIVEN Splash aus, sobald dieser Web-Screen sein erstes
  // Frame gerendert hat (leerer deps-Array = genau einmal beim Mount, nach
  // dem ersten Commit/Paint) - siehe Kommentar an nativenSplashAusblenden
  // oben zur Nahtlosigkeit dieses Uebergangs.
  useEffect(() => {
    nativenSplashAusblenden()
  }, [])

  useEffect(() => {
    if (reduzierteBewegung) {
      // Kein Puls, kein Eintritts-Tween - Glow steht sofort auf seinem
      // Ruhewert (siehe Aufgabenstellung "kein Halo-Puls" unter reduzierter
      // Bewegung). Der Glow selbst bleibt aber sichtbar (nur die Bewegung
      // entfaellt), analog zum Ring-statt-Animation-Muster in KochModus.jsx.
      glowOpacity.set(0.18)
      return undefined
    }

    let ruheOpacityControls
    let ruheScaleControls
    const eintrittControls = animate(glowOpacity, GLOW_EINTRITT_OPACITY, {
      duration: glowEintrittDauerS,
      times: GLOW_EINTRITT_TIMES,
      ease: 'easeOut',
      onComplete: () => {
        ruheOpacityControls = animate(glowOpacity, GLOW_RUHE_OPACITY, {
          duration: GLOW_RUHE_DAUER_S,
          repeat: Infinity,
          ease: 'easeInOut',
        })
        ruheScaleControls = animate(glowScale, GLOW_RUHE_SCALE, {
          duration: GLOW_RUHE_DAUER_S,
          repeat: Infinity,
          ease: 'easeInOut',
        })
      },
    })

    return () => {
      eintrittControls.stop()
      ruheOpacityControls?.stop()
      ruheScaleControls?.stop()
    }
  }, [reduzierteBewegung, glowOpacity, glowScale, glowEintrittDauerS])

  // Automatischer Weiter-Trigger NUR in PFAD B (dort existiert gar kein
  // Button, siehe Rendering weiter unten) - feuert nach
  // NAECHSTE_ANSICHT_VERZOEGERUNG_FOLGEBESUCH_S (Buchstaben-Gesamtdauer +
  // eigene Pause, siehe dessen Kommentar oben), bzw. nach
  // BUCHSTABEN_EINFACH_DAUER_S unter reduzierter Bewegung. PFAD A hat
  // BEWUSST keinen Auto-Trigger (mehr) - siehe Geraetetest-Feedback "Tap
  // soll zwingend notwendig sein, kein Auto-Advance". Der fruehere
  // BUTTON_AUTO_DAUER_S-Zweig fuer PFAD A ist deshalb komplett entfernt,
  // nicht nur deaktiviert.
  useEffect(() => {
    if (wirdAusgeblendet || !bereitsGeoeffnet) return undefined

    const dauerS = reduzierteBewegung ? BUCHSTABEN_EINFACH_DAUER_S : NAECHSTE_ANSICHT_VERZOEGERUNG_FOLGEBESUCH_S

    const timer = setTimeout(() => setWirdAusgeblendet(true), dauerS * 1000)
    return () => clearTimeout(timer)
  }, [wirdAusgeblendet, bereitsGeoeffnet, reduzierteBewegung])

  // Ausblenden-Choreografie: startet erst NACHDEM wirdAusgeblendet gesetzt
  // wurde (Tap oder Auto-Trigger, siehe oben). Setzt bei PFAD A zugleich das
  // "schon mal geoeffnet"-Flag fuer alle KUENFTIGEN Aufrufe (bereitsGeoeffnet
  // selbst bleibt fuer den Rest DIESER Sitzung unveraendert, siehe dessen
  // Kommentar oben - nur der naechste App-Start liest das neu). Ein neuer
  // animate()-Aufruf auf glowOpacity uebernimmt automatisch die Kontrolle
  // ueber den MotionValue und stoppt damit implizit den laufenden Ruhe-Puls
  // von oben (framer-motion erlaubt pro MotionValue immer nur GENAU eine
  // aktive Animation) - kein manuelles Stoppen der dortigen Controls noetig.
  // Der eigentliche Seitenwechsel (onWeiter, von App.jsx uebergeben) wird
  // bewusst per eigenem Timer statt per animate(...).then()/onComplete
  // ausgeloest: es gibt HIER mehrere gleichzeitig ausblendende Elemente
  // (Wortmark, Halo, ggf. Button-Wrapper), ein einzelner Timer mit derselben
  // Dauer ist robuster/einfacher nachvollziehbar als eine Abhaengigkeit von
  // genau EINEM ihrer Animations-Abschluesse.
  useEffect(() => {
    if (!wirdAusgeblendet) return undefined

    if (!bereitsGeoeffnet) {
      localStorage.setItem(BEREITS_GEOEFFNET_LOCALSTORAGE_KEY, 'true')
    }

    const dauerS = reduzierteBewegung ? 0.15 : AUSBLEND_DAUER_S
    const glowControls = animate(glowOpacity, 0, {
      duration: dauerS,
      ease: reduzierteBewegung ? 'linear' : EXPO_OUT,
    })
    const timer = setTimeout(onWeiter, dauerS * 1000)

    return () => {
      glowControls.stop()
      clearTimeout(timer)
    }
  }, [wirdAusgeblendet, bereitsGeoeffnet, reduzierteBewegung, glowOpacity, onWeiter])

  // Ausblenden-Ziel/Transition fuer Wortmark und Button-Wrapper - beide
  // teilen sich dieselbe Fade+Drift-Choreografie (siehe AUSBLEND_DAUER_S-
  // Kommentar oben), daher hier EINMAL berechnet statt an beiden
  // Verwendungsstellen dupliziert. Unter reduzierter Bewegung reines Fade
  // ohne y-Versatz (siehe Aufgabenstellung "Uebergang wird zu einem
  // direkten/kurzen Fade ohne Drift"). scale:1 explizit gesetzt (nicht
  // einfach weggelassen!) - der Button-Wrapper hat in seinem "initial" einen
  // scale-Wert ungleich 1 (0.96, siehe dessen initial-Prop unten). Ohne
  // diesen expliziten Wert faellt framer-motion beim Wechsel des animate-
  // Ziels fuer eine dort NICHT genannte Prop auf deren initial-Wert zurueck
  // statt den aktuellen Wert zu halten - der Button waere beim Ausblenden
  // also zusaetzlich sichtbar (wieder) geschrumpft, ein unbeabsichtigter
  // Nebeneffekt (per Playwright-Messung bestaetigt, bevor dieser Fix
  // ergaenzt wurde).
  const ausblendAnimate = reduzierteBewegung
    ? { opacity: 0 }
    : { opacity: 0, y: AUSBLEND_DRIFT_PX, scale: 1 }
  const ausblendTransition = reduzierteBewegung
    ? { duration: 0.15 }
    : { duration: AUSBLEND_DAUER_S, ease: EXPO_OUT }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6">
      {/* Halo-Glow: radialer Verlauf mit transparenter Mitte (0%), der erst
          AUSSERHALB des Textbereichs zu Terracotta aufblueht (Peak bei 42%
          Radius, ~40% Alpha per color-mix - siehe CLAUDE.md, kein neuer
          Farbwert) und zu den aeusseren 76% wieder in Transparenz auslaeuft.
          opacity/scale kommen aus den oben imperativ gesteuerten
          MotionValues statt aus animate/transition-Props, weil die Choreo-
          grafie (einmaliger Eintritt -> endloser Ruhe-Puls) zwei
          unterschiedliche Transitions braucht, die nacheinander starten. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute h-[85vw] w-[85vw] max-h-[520px] max-w-[520px] rounded-full"
        style={{
          opacity: glowOpacity,
          scale: glowScale,
          background:
            'radial-gradient(circle, transparent 0%, color-mix(in srgb, var(--color-primary) 40%, transparent) 42%, transparent 76%)',
        }}
      />

      {/* Wortmark-Wrapper: traegt NUR noch die Ausblenden-Choreografie (das
          Einblenden passiert pro Buchstabe in den Kindern, siehe unten) -
          initial={false} verhindert eine eigene (ueberfluessige) Mount-
          Animation dieses Wrappers selbst. */}
      <motion.p
        className="relative select-none font-display text-7xl font-medium text-primary sm:text-8xl"
        style={{ letterSpacing: '0.01em' }}
        initial={false}
        animate={wirdAusgeblendet ? ausblendAnimate : { opacity: 1, y: 0, scale: 1 }}
        transition={wirdAusgeblendet ? ausblendTransition : { duration: 0 }}
      >
        {reduzierteBewegung ? (
          // Reduced Motion (beide Pfade): einfaches, schnelles Fade des
          // KOMPLETTEN Wortmarks statt gestaffeltem Buchstabenaufbau, siehe
          // Aufgabenstellung.
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: BUCHSTABEN_EINFACH_DAUER_S }}
          >
            {WORTMARKE}
          </motion.span>
        ) : (
          // Buchstaben-Aufbau: jeder Buchstabe ein eigenes motion.span mit
          // individuellem delay (index * buchstabeVersatzS) - inline-block,
          // damit der Scale-/Translate-Transform sauber am jeweiligen
          // Buchstaben ansetzt statt am ganzen Textfluss.
          WORTMARKE.split('').map((buchstabe, index) => (
            <motion.span
              key={index}
              className="inline-block"
              initial={{ opacity: 0, scale: BUCHSTABE_SCALE_START, y: BUCHSTABE_DRIFT_PX }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: index * buchstabeVersatzS,
                duration: buchstabeDauerS,
                ease: EXPO_OUT,
              }}
            >
              {buchstabe}
            </motion.span>
          ))
        )}
      </motion.p>

      {/* Button existiert NUR in PFAD A (Erstbesuch) - PFAD B blendet direkt
          nach dem Buchstabenaufbau automatisch weiter, siehe
          Auto-Trigger-Effekt oben. */}
      {!bereitsGeoeffnet && (
        <motion.div
          className="relative mt-10"
          initial={reduzierteBewegung ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
          animate={
            wirdAusgeblendet
              ? ausblendAnimate
              : reduzierteBewegung
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
          }
          transition={
            wirdAusgeblendet
              ? ausblendTransition
              : reduzierteBewegung
                ? { duration: 0.2 }
                : { delay: BUTTON_VERZOEGERUNG_S, duration: BUTTON_DAUER_S, ease: EXPO_OUT }
          }
        >
          {/* motion.button statt AnimatedButton - siehe Kommentar zu
              HERO_BUTTON_PRESS/HERO_BUTTON_RELEASE_SPRING oben zur Begruendung.
              whileTap traegt seine eigene (kurze, kontrollierte) Transition;
              das Zurueckfedern beim Loslassen nutzt automatisch die hier
              gesetzte transition-Prop (der Spring) - kein Aufleuchten/Puls
              (bewusst weggelassen, siehe Aufgabenstellung). Unter reduzierter
              Bewegung komplett ohne whileTap: kein Press-Spring, reiner
              Klick wie ein normales <button>. disabled waehrend
              wirdAusgeblendet - siehe Kommentar an dessen useState oben.
              relative+overflow-hidden traegt den Shimmer-Layer (siehe unten);
              der weiche Olive-Schatten kommt per style/color-mix statt einer
              Tailwind-Standardfarbe (siehe CLAUDE.md-Vertrag). */}
          <motion.button
            type="button"
            onClick={() => setWirdAusgeblendet(true)}
            disabled={wirdAusgeblendet}
            whileTap={reduzierteBewegung ? undefined : HERO_BUTTON_PRESS}
            transition={HERO_BUTTON_RELEASE_SPRING}
            className="relative overflow-hidden rounded-full bg-secondary px-10 py-4 text-base font-medium text-card"
            style={{
              boxShadow: '0 14px 34px -12px color-mix(in srgb, var(--color-secondary) 55%, transparent)',
            }}
          >
            {/* Shimmer-Sweep: schraeger Lichtstreif, der periodisch (mit
                Pause dazwischen, siehe SHIMMER_PAUSE_S) einmal durchs Button
                wandert. NUR ausserhalb reduzierter Bewegung gerendert (nicht
                nur pausiert) - siehe Kommentar an SHIMMER_SWEEP_DAUER_S oben.
                overflow-hidden am Button (siehe className oben) schneidet den
                Streif sauber an dessen abgerundetem Rand ab. */}
            {!reduzierteBewegung && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-card/35 to-transparent"
                animate={{ x: ['-150%', '450%'] }}
                transition={{
                  duration: SHIMMER_SWEEP_DAUER_S,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: SHIMMER_PAUSE_S,
                }}
              />
            )}
            {/* z-10, damit Text+Icon ueber dem Shimmer-Layer liegen (der ohne
                eigenes z-index sonst je nach DOM-Reihenfolge/Compositing
                durchscheinen koennte). */}
            <span className="relative z-10 inline-flex items-center gap-2">
              Los geht&rsquo;s
              <IconArrowRight size={20} stroke={2} aria-hidden="true" />
            </span>
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}

export default Startbildschirm
