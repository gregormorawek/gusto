import { IconBook2, IconDice5, IconSettings, IconShoppingCart } from '@tabler/icons-react'
import { motion, useReducedMotion } from 'framer-motion'
import AnimatedButton from './AnimatedButton'
import { EXPO_OUT } from '../motionConfig'

// Die vier Tabs der schwebenden Bottom-Navigation, in Anzeige-Reihenfolge.
// key entspricht bei 'haupt'/'rezepte'/'einkaufsliste' 1:1 dem bestehenden
// ansicht-State in App.jsx - 'einstellungen' ist bewusst KEIN eigener
// ansicht-Wert (siehe App.jsx/aktiverTabLeiste), sondern oeffnet weiterhin
// nur das bestehende EinstellungenPanel-Overlay obendrauf, waehrend ansicht
// unveraendert bleibt. IconDice5/IconBook2 sind dieselben Icons, die bereits
// im OnboardingWizard-Abschluss-Screen fuer "Wuerfeln"/"Rezepte" verwendet
// werden (dortige Tap-Karten) - fuer eine konsistente Icon-Sprache app-weit.
const TABS = [
  { key: 'haupt', label: 'Planen', Icon: IconDice5 },
  { key: 'rezepte', label: 'Rezepte', Icon: IconBook2 },
  { key: 'einkaufsliste', label: 'Einkaufsliste', Icon: IconShoppingCart },
  { key: 'einstellungen', label: 'Einstellungen', Icon: IconSettings },
]

// Schwebende, halbtransparente Pill-Tab-Bar im "Liquid Glass"-Stil (siehe
// .tab-leiste in index.css fuer Blur/Rand/Schatten - dort statt als
// Tailwind-Arbitrary-Values, weil mehrere Vendor-Praefixe + mehrteilige
// rgba-Werte in Utility-Klassen-Syntax kaum lesbar waeren). z-30: bewusst
// UNTER allen bestehenden fixed inset-0-Overlays (KochModus z-40/z-50,
// Kalorienrechner z-40, EinstellungenPanel z-50), damit die Bar beim
// Oeffnen eines dieser Overlays vollstaendig darunter verschwindet.
// Dauer/Easing des Gleitens der aktiven Hervorhebungs-Pille zwischen zwei
// Tabs (siehe layoutId weiter unten) - EXPO_OUT (siehe motionConfig.js) ist
// dort eigentlich fuer den grossen Startbildschirm-Marken-Moment gedacht,
// passt aber auch hier: schneller Start, sehr sanftes Abbremsen, genau das
// "gleitende", native Anfuehlen nativer iOS-Tab-Bars statt eines linearen
// Wischs.
const TAB_PILLE_UEBERGANG = { duration: 0.28, ease: EXPO_OUT }

function TabLeiste({ aktiverTab, onTabWaehlen }) {
  // Reduzierte Bewegung: die Pille soll NICHT mehr gleiten, sondern direkt
  // am neuen Tab erscheinen - framer-motions layoutId-Animation (siehe
  // unten) wird dafuer per transition={{ duration: 0 }} auf "kein
  // Uebergang" gestellt. Der Icon/Label-Farbwechsel bleibt in JEDEM Fall
  // bestehen (reine CSS transition-colors, siehe Icon/Label unten) - das ist
  // bewusst kein raeumlicher Bewegungseffekt, sondern nur eine Farbaenderung,
  // und bleibt laut Aufgabenstellung auch unter reduzierter Bewegung erhalten.
  const reduzierteBewegung = useReducedMotion()

  return (
    <nav
      className="tab-leiste fixed inset-x-3 z-30 flex h-[60px] items-stretch justify-around rounded-[22px]"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      aria-label="Hauptnavigation"
    >
      {TABS.map(({ key, label, Icon }) => {
        const aktiv = aktiverTab === key
        return (
          <AnimatedButton
            key={key}
            type="button"
            onClick={() => onTabWaehlen(key)}
            aria-current={aktiv ? 'page' : undefined}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
          >
            {aktiv && (
              // layoutId: EIN gemeinsames, "geteiltes" Element ueber alle
              // vier Tabs hinweg - obwohl es bei jedem Tab-Wechsel technisch
              // ein NEUER motion.span ist (nur beim jeweils aktiven Tab
              // gerendert), erkennt framer-motion anhand der gleichen
              // layoutId, dass es sich um dieselbe "Identitaet" handelt, und
              // animiert automatisch (FLIP) von der alten zur neuen Position/
              // Groesse - deshalb keine manuelle Positions-Berechnung noetig.
              //
              // WICHTIG: inset-0 ist hier bewusst relativ zum GESAMTEN Button
              // (Icon+Gap+Label), nicht mehr nur zum Icon-Wrapper (fruehere
              // Fassung) - Grund: auf farbigem Inhalt hinter der Bar (z. B.
              // ein terracotta-farbener Button, siehe Bugreport) war zwar das
              // Icon (innerhalb seines eigenen kleinen Pillen-Ovals) noch
              // lesbar, das LABEL darunter sass aber komplett AUSSERHALB
              // jeder Aufhellung direkt auf dem durchscheinenden Bar-
              // Hintergrund und verschmolz dort mit terracotta-farbenem
              // Inhalt (Terracotta-Text auf terracotta-durchscheinendem
              // Grund). inset-0 auf Button-Ebene (mit explizitem inset-0
              // statt der fruehmals fehlerhaften "static position" ohne
              // top/left) deckt Icon UND Label gemeinsam ab, ohne die
              // Zentrierungs-Regression von damals zu wiederholen.
              <motion.span
                layoutId="tab-aktive-pille"
                className="absolute inset-0 rounded-2xl bg-card/38"
                transition={reduzierteBewegung ? { duration: 0 } : TAB_PILLE_UEBERGANG}
              />
            )}
            {/* relative z-10: garantiert, dass Icon+Label ÜBER der
                (ebenfalls positionierten) Pille gemalt werden, unabhaengig
                von CSS-Male-Reihenfolge-Feinheiten zwischen position:
                absolute- und position:relative-Geschwistern.
                Aktiv: Terracotta (text-primary) - funktioniert zuverlaessig
                auf der jetzt kraeftigeren Cream-Pille (38% statt 20%
                Deckkraft), UNABHAENGIG davon, welche Farbe hinter der
                durchscheinenden Bar selbst liegt (Cream/Tan/Oliv/Terracotta) -
                die Pille sitzt ja jetzt IMMER dahinter. Inaktiv: text-text/55
                (mittleres Espresso) - weder auf Tan- noch auf Cream-
                Hintergrund zu kontrastarm, bleibt aber klar gedaempfter als
                der aktive Terracotta-Ton. */}
            <span className="relative z-10 flex h-8 w-12 items-center justify-center rounded-full">
              <Icon size={22} stroke={1.75} className={`transition-colors duration-150 ${aktiv ? 'text-primary' : 'text-text/55'}`} />
            </span>
            <span
              className={`relative z-10 font-sans transition-colors duration-150 ${
                aktiv ? 'text-[10px] font-semibold text-primary' : 'text-[9px] font-medium text-text/55'
              }`}
            >
              {label}
            </span>
          </AnimatedButton>
        )
      })}
    </nav>
  )
}

export default TabLeiste
