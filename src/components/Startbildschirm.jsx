import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import AnimatedButton from './AnimatedButton'
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
          reduzierteBewegung
            ? { opacity: 1 }
            : { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.01em' }
        }
        transition={
          reduzierteBewegung
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
        animate={reduzierteBewegung ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={
          reduzierteBewegung
            ? { duration: 0.2 }
            : { delay: BUTTON_VERZOEGERUNG_S, duration: BUTTON_DAUER_S, ease: EXPO_OUT }
        }
      >
        <AnimatedButton
          type="button"
          onClick={onWeiter}
          className="rounded-full bg-secondary px-8 py-3 text-base font-medium text-card shadow-sm"
        >
          Los geht&rsquo;s
        </AnimatedButton>
      </motion.div>
    </div>
  )
}

export default Startbildschirm
