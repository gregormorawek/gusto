import { useEffect, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { IconArrowRight } from '@tabler/icons-react'
import { EXPO_OUT } from '../motionConfig'

// Dauer/Timing der Logo-Eingangsanimation - siehe Kommentar an der
// Verwendungsstelle unten fuer die Choreografie im Detail. Der Blur-
// Uebergang ist bewusst KUERZER als die Gesamtdauer (endet bei 65%): das
// Logo soll schon scharf lesbar sein, waehrend Scale/Letter-Spacing/Opacity
// noch sanft auslaufen, statt bis zum allerletzten Frame unscharf zu wirken.
const LOGO_DAUER_S = 1.5
const LOGO_BLUR_DAUER_S = LOGO_DAUER_S * 0.65

// Der Button erscheint erst, NACHDEM sich Logo (1.5s) und Glow (1.6s) sicht-
// bar beruhigt haben - siehe Aufgabenstellung "nachdem Logo+Glow sich
// beruhigt haben".
const BUTTON_VERZOEGERUNG_S = 1.9
const BUTTON_DAUER_S = 0.7

// Glow-Eingang: schnelles Aufblenden zu einem kurzen Peak (~0.5), danach
// Beruhigung auf den Ruhewert (~0.18) - EIN Tween mit Zwischen-Keyframe statt
// zwei separaten Animate-Aufrufen, da Ein- und Beruhigungsphase nahtlos
// ineinander uebergehen sollen (kein sichtbarer Bruch dazwischen).
const GLOW_EINTRITT_DAUER_S = 1.6
const GLOW_EINTRITT_OPACITY = [0, 0.5, 0.18]
const GLOW_EINTRITT_TIMES = [0, 0.55, 1]

// Ruhe-Puls NACH dem Eintritt: sehr langsamer, dezenter Atem-Zyklus, laeuft
// endlos weiter, solange der Startbildschirm sichtbar ist (siehe useEffect
// unten - wird per animate() IMPERATIV erst nach Abschluss des Eintritts
// gestartet statt als Teil eines einzigen repeat:Infinity-Keyframe-Arrays,
// weil sich sonst die einmalige Eintritts-Spitze bei JEDEM Loop-Durchlauf
// wiederholen wuerde statt nur beim allerersten Mal).
const GLOW_RUHE_DAUER_S = 6
const GLOW_RUHE_OPACITY = [0.12, 0.2, 0.12]
const GLOW_RUHE_SCALE = [1, 1.06, 1]

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

// Ausblenden-Choreografie beim Tap (Teil B, ersetzt den frueheren
// Seiten-Swipe aus Commit 4956561 - siehe App.jsx-Rendering-Weiche fuer die
// anschliessende, LANGSAMERE Wizard-Einblendung): Logo, Halo und Button
// faden gemeinsam aus, Logo/Button zusaetzlich mit einem minimalen
// Nach-oben-Drift (translateY negativ). AUSBLEND_DAUER_S bewusst KUERZER
// als die Einblend-Dauer der naechsten Ansicht (siehe dortige Konstante) -
// genau diese Asymmetrie (schnelleres Ausblenden, bewusst langsameres
// Einblenden) ist Teil der gewuenschten Choreografie.
const AUSBLEND_DAUER_S = 0.65
const AUSBLEND_DRIFT_PX = -16

// Neuer erster Bildschirm beim App-Start (siehe App.jsx-Verwendungsstelle) -
// ein Marken-Moment VOR Wizard/Hauptansicht. onWeiter fuehrt zu genau dem,
// was App.jsx ohnehin als naechstes rendern wuerde (Wizard fuer neue Nutzer,
// Hauptansicht fuer wiederkehrende) - diese Komponente kennt diese
// Unterscheidung bewusst NICHT, sie ruft nur onWeiter auf und ueberlaesst
// App.jsx die bestehende onboardingAbgeschlossen-Weiche.
function Startbildschirm({ onWeiter }) {
  const reduzierteBewegung = useReducedMotion()
  const glowOpacity = useMotionValue(0)
  const glowScale = useMotionValue(1)

  // Wird beim Tap auf "Los geht's" gesetzt und startet die Ausblenden-
  // Choreografie (siehe AUSBLEND_DAUER_S-Kommentar oben) - danach ist der
  // Button disabled (siehe Verwendungsstelle), damit ein zweiter Tap
  // waehrend des Ausblendens nicht zwei ueberlappende Timer/onWeiter-Aufrufe
  // ausloest.
  const [wirdAusgeblendet, setWirdAusgeblendet] = useState(false)

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
      duration: GLOW_EINTRITT_DAUER_S,
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
  }, [reduzierteBewegung, glowOpacity, glowScale])

  // Ausblenden-Choreografie: startet erst NACH dem Tap (wirdAusgeblendet).
  // Ein neuer animate()-Aufruf auf glowOpacity uebernimmt automatisch die
  // Kontrolle ueber den MotionValue und stoppt damit implizit den laufenden
  // Ruhe-Puls von oben (framer-motion erlaubt pro MotionValue immer nur
  // GENAU eine aktive Animation) - kein manuelles Stoppen der dortigen
  // Controls noetig. Der eigentliche Seitenwechsel (onWeiter, von App.jsx
  // uebergeben) wird bewusst per eigenem Timer statt per
  // animate(...).then()/onComplete ausgeloest: es gibt HIER mehrere
  // gleichzeitig ausblendende Elemente (Logo, Halo, Button-Wrapper unten),
  // ein einzelner Timer mit derselben Dauer ist robuster/einfacher
  // nachvollziehbar als eine Abhaengigkeit von genau EINEM ihrer
  // Animations-Abschluesse.
  useEffect(() => {
    if (!wirdAusgeblendet) return undefined

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
  }, [wirdAusgeblendet, reduzierteBewegung, glowOpacity, onWeiter])

  // Ausblenden-Ziel/Transition fuer Logo und Button-Wrapper - beide teilen
  // sich dieselbe Fade+Drift-Choreografie (siehe AUSBLEND_DAUER_S-Kommentar
  // oben), daher hier EINMAL berechnet statt an beiden Verwendungsstellen
  // dupliziert. Unter reduzierter Bewegung reines Fade ohne y-Versatz
  // (siehe Aufgabenstellung "Uebergang wird zu einem direkten/kurzen Fade
  // ohne Drift"). scale:1 explizit gesetzt (nicht einfach weggelassen!) -
  // beide Elemente haben in ihrem jeweiligen "initial" einen scale-Wert
  // ungleich 1 (Logo 1.1, Button-Wrapper 0.96, siehe deren initial-Props
  // unten). Ohne diesen expliziten Wert faellt framer-motion beim Wechsel
  // des animate-Ziels fuer eine dort NICHT genannte Prop auf deren
  // initial-Wert zurueck statt den aktuellen Wert zu halten - das Logo/der
  // Button waeren beim Ausblenden also zusaetzlich sichtbar (wieder)
  // geschrumpft/gewachsen, ein unbeabsichtigter Nebeneffekt (per Playwright-
  // Messung bestaetigt, bevor dieser Fix ergaenzt wurde).
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

      <motion.p
        className="relative select-none font-display text-7xl font-medium text-primary sm:text-8xl"
        initial={
          reduzierteBewegung
            ? { opacity: 0 }
            : { opacity: 0, scale: 1.1, filter: 'blur(8px)', letterSpacing: '0.14em' }
        }
        animate={
          wirdAusgeblendet
            ? ausblendAnimate
            : reduzierteBewegung
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.01em' }
        }
        transition={
          wirdAusgeblendet
            ? ausblendTransition
            : reduzierteBewegung
              ? { duration: 0.2 }
              : {
                  duration: LOGO_DAUER_S,
                  ease: EXPO_OUT,
                  // Blur schliesst frueher ab als der Rest (siehe Konstanten-
                  // Kommentar oben) - deshalb eigener Eintrag statt der
                  // Top-Level-duration.
                  filter: { duration: LOGO_BLUR_DAUER_S, ease: EXPO_OUT },
                }
        }
      >
        gusto
      </motion.p>

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
    </div>
  )
}

export default Startbildschirm
