import { motion } from 'framer-motion'

// Sechs leicht rotierte "Saaten"-Ellipsen, verstreut auf der Schuessel-
// Oberflaeche - Positionen/Rotationen von Hand gesetzt statt zufaellig
// generiert, damit das Muster bei jedem Render identisch bleibt (kein
// Re-Randomize bei Re-Mounts, z. B. beim Zurueck->Weiter-Wechsel 3<->4).
const SAATEN = [
  { cx: 54, cy: 60, rotation: 20 },
  { cx: 67, cy: 70, rotation: -15 },
  { cx: 82, cy: 58, rotation: 35 },
  { cx: 96, cy: 68, rotation: -25 },
  { cx: 108, cy: 59, rotation: 10 },
  { cx: 75, cy: 72, rotation: -40 },
]

// Drei leicht unterschiedliche S-Kurven fuer die Dampffaeden (x-Basis 56/80/
// 104) - bewusst nicht alle identisch, damit der Dampf organischer wirkt
// statt wie ein einzelnes, dreifach kopiertes Muster.
const DAMPF_PFADE = [
  'M56 50 C 50 40 62 34 56 24 C 50 16 62 10 56 4',
  'M80 46 C 74 36 86 30 80 20 C 74 12 86 6 80 0',
  'M104 50 C 98 40 110 34 104 24 C 98 16 110 10 104 4',
]

// Dezente, animierte Schuessel-Illustration fuer den Abschluss-Screen des
// Onboarding-Wizards ("Alles bereit!", schritt===4 in OnboardingWizard.jsx) -
// fuellt den bisher leeren Raum zwischen Untertitel und den beiden
// Auswahl-Karten. Reiner Strich (kein flaechiges Icon), angelehnt an den
// bestehenden Marken-Ton (siehe CLAUDE.md Design-Vertrag) - ausschliesslich
// bestehende Farb-Tokens (primary/secondary/text-muted), keine neuen Werte.
//
// reduzierteBewegung wird als Prop durchgereicht (nicht selbst per
// useReducedMotion() ermittelt) - gleiches Muster wie WizardTageskarte.jsx:
// der Aufrufer (OnboardingWizard.jsx) hat den Wert ohnehin schon fuer den
// Rest des Screens ermittelt. Anders als DampfSchwaden.jsx (dort entscheidet
// der AUFRUFER per Bedingung, ob die Komponente ueberhaupt gerendert wird)
// bleibt die Schuessel selbst bei reduzierter Bewegung sichtbar - nur die
// drei Dampffaeden werden weggelassen (komplett, nicht nur pausiert), damit
// wirklich keine Restanimation im DOM haengen bleibt.
function DampfSchuesselIllustration({ reduzierteBewegung, className = '' }) {
  return (
    <svg viewBox="0 0 160 140" className={className} role="img" aria-label="Schüssel mit aufsteigendem Dampf">
      {/* Oberflaeche/Fuellung - liegt UNTER dem Rand-Strich, damit dessen
          Kontur sauber darueber liegt */}
      <ellipse cx="80" cy="64" rx="46" ry="10" className="fill-secondary/25" />

      {SAATEN.map((saat, i) => (
        <ellipse
          key={i}
          cx={saat.cx}
          cy={saat.cy}
          rx="2.4"
          ry="1.2"
          className="fill-text-muted/70"
          transform={`rotate(${saat.rotation} ${saat.cx} ${saat.cy})`}
        />
      ))}

      {/* Schuessel-Koerper (Aussenkontur unterhalb des Rands) */}
      <path
        d="M28 64 C 28 96 50 118 80 118 C 110 118 132 96 132 64"
        fill="none"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Schuessel-Rand (vorderer Ellipsen-Bogen, oben auf dem Koerper gezeichnet) */}
      <ellipse cx="80" cy="64" rx="52" ry="14" fill="none" className="stroke-primary" strokeWidth="2.5" />

      {DAMPF_PFADE.map(
        (d, i) =>
          !reduzierteBewegung && (
            <motion.path
              key={i}
              d={d}
              fill="none"
              className="stroke-primary"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.55, 0], y: [0, -10, -22] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
            />
          ),
      )}
    </svg>
  )
}

export default DampfSchuesselIllustration
