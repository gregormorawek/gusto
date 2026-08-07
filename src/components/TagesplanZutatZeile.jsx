import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconAlertTriangle, IconApple, IconBread, IconCarrot, IconDroplet, IconMeat, IconRefresh } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import AnimierteZahl from './AnimierteZahl'
import { SPRING_REVEAL, motionPropsFuer } from '../motionConfig'

// Kategorie -> Icon, ausschliesslich anhand des titel-Strings (identisch zu
// den Werten, die TagesplanAnsicht.jsx als titel an diese Zeile uebergibt -
// "Protein"/"Carbs"/"Fett"/"Gemüse"/"Obst", exakt wie bei SlotKarte). Kein
// zusaetzlicher kategorie-Prop noetig, dieselbe Quelle wie die Ueberschrift.
const KATEGORIE_ICON = {
  Protein: IconMeat,
  Carbs: IconBread,
  Fett: IconDroplet,
  Gemüse: IconCarrot,
  Obst: IconApple,
}

// Farbiger Chip-Hintergrund je Kategorie, AUSSCHLIESSLICH aus den beiden
// erlaubten Marken-Tokens (--color-primary/Terrakotta, --color-secondary/
// Olive) plus --color-text-muted abgeleitet - siehe CLAUDE.md, "keine neuen
// Farben ohne Ruecksprache". Damit trotzdem 4 unterscheidbare warme Toene
// entstehen: Protein = volles Terrakotta, Carbs = der bereits bestehende
// warme Braun-Ton text-muted ("Tan"), Fett = abgeschwaechtes Terrakotta
// (heller/waermerer "Sand"-Ton, klar unterscheidbar von Carbs), Gemuese/Obst
// = volles Olive. icon bestimmt die Icon-Farbe AUF dem Chip - bei den beiden
// hellen Chips (Fett) reicht Weiss nicht als Kontrast, dort dunkles Icon.
const KATEGORIE_CHIP = {
  Protein: { bg: 'bg-primary', icon: 'text-card' },
  Carbs: { bg: 'bg-text-muted', icon: 'text-card' },
  Fett: { bg: 'bg-primary/40', icon: 'text-text' },
  Gemüse: { bg: 'bg-secondary', icon: 'text-card' },
  Obst: { bg: 'bg-secondary', icon: 'text-card' },
}

// Kompakte, listenartige Alternative zu SlotKarte - NUR fuer die Tagesplan-
// Ansicht (Option B: alle 4 Mahlzeiten gleichzeitig sichtbar, siehe
// TagesplanAnsicht.jsx). Eine Zeile statt einer Karte: farbiger Icon-Chip,
// Name (voller Text, kein Ellipsis - bei der vollen Zeilenbreite hier
// brechen selbst die laengsten DB-Namen nicht um, anders als im
// 2-spaltigen SlotKarte-Grid), Portion, optionaler Ziel-nicht-erreichbar-
// Hinweis als Icon, Reroll-Icon als visueller Hinweis. Portion/Ziel-Werte
// kommen unveraendert aus der bestehenden portionenRechner.js-Pipeline
// (App.jsx) - diese Komponente zeigt nur an, rechnet nichts selbst.
//
// Tap-to-Reroll: die GANZE Zeile ist ein einziges AnimatedButton (= ein
// echtes <button>, kein role="button"-Div) - das Reroll-Icon am Ende ist
// dadurch rein dekorativ (kein eigenes verschachteltes <button>, HTML
// erlaubt ohnehin keine interaktiven Elemente ineinander). Ein echtes
// <button>-Element bringt Fokus/Tastatur (Enter+Leertaste)/Screenreader-
// Semantik automatisch mit - robuster als eine selbstgebaute
// role="button"+tabIndex+onKeyDown-Nachbildung. Der "Ziel nicht erreichbar"-
// Hinweis fliesst deshalb mit in aria-label ein, statt als eigenes
// role="img"-Element im Button zu stecken (verschachtelte ARIA-Rollen
// innerhalb eines bereits benannten Buttons sind fuer Screenreader nicht
// zuverlaessig).
function TagesplanZutatZeile({ titel, text, portion, onWuerfeln, zielWert, zielErreichbar }) {
  const reduzierteBewegung = useReducedMotion()
  const Icon = KATEGORIE_ICON[titel]
  const chip = KATEGORIE_CHIP[titel]
  const zielNichtErreichbar = zielWert && !zielErreichbar

  return (
    <AnimatedButton
      type="button"
      onClick={onWuerfeln}
      aria-label={zielNichtErreichbar ? `${titel} neu würfeln (Ziel nicht ganz erreichbar)` : `${titel} neu würfeln`}
      className="flex w-full items-center gap-2 border-b border-text-muted/10 py-1 text-left last:border-b-0"
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${chip.bg}`}>
        <Icon size={14} stroke={2} className={chip.icon} aria-hidden="true" />
      </span>

      <AnimatePresence mode="popLayout">
        <motion.div
          key={text}
          {...motionPropsFuer(reduzierteBewegung, {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.95 },
            transition: SPRING_REVEAL,
          })}
          className="min-w-0 flex-1"
        >
          <p className="text-sm font-medium text-text">{text}</p>
        </motion.div>
      </AnimatePresence>

      <span className="shrink-0 text-xs text-text-muted">
        <AnimierteZahl wert={portion ?? 0} /> g
      </span>

      {zielNichtErreichbar && <IconAlertTriangle size={14} stroke={1.75} className="shrink-0 text-primary/70" aria-hidden="true" />}

      <IconRefresh size={16} stroke={1.75} className="shrink-0 text-primary" aria-hidden="true" />
    </AnimatedButton>
  )
}

export default TagesplanZutatZeile
