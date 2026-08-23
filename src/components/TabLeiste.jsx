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
            className="flex flex-1 flex-col items-center justify-center gap-0.5"
          >
            {/* Die Hervorhebungs-Pille sitzt ABSICHTLICH INNERHALB dieses
                h-8 w-12-Icon-Wrappers (inset-0, relativ zu DESSEN eigener
                Box) statt als Geschwister auf Button-Ebene: eine Pille auf
                Button-Ebene positioniert sich (ohne eigene top/left-Werte)
                per CSS "static position" an der Stelle, an der sie OHNE
                position:absolute im Flex-Fluss gelandet waere - bei einem
                mehrzeiligen Button (Icon + Label darunter) ist das die
                Mitte des GESAMTEN Inhalts (Icon+Gap+Label), NICHT die Mitte
                des Icons allein. Ergebnis: das Icon sass sichtbar zu hoch
                in der Pille (per getBoundingClientRect nachgewiesen: Pille
                zentriert auf Button-Mitte, Icon ca. 8-9px hoeher). inset-0
                relativ zu DIESEM Wrapper garantiert exakte Deckungsgleichheit
                mit der Icon-Box, unabhaengig von der (je nach aktiv/inaktiv
                unterschiedlich hohen) Label-Zeile darunter. */}
            <span className="relative flex h-8 w-12 items-center justify-center rounded-full">
              {aktiv && (
                // layoutId: EIN gemeinsames, "geteiltes" Element ueber alle
                // vier Tabs hinweg - obwohl es bei jedem Tab-Wechsel
                // technisch ein NEUER motion.span ist (nur beim jeweils
                // aktiven Tab gerendert), erkennt framer-motion anhand der
                // gleichen layoutId, dass es sich um dieselbe "Identitaet"
                // handelt, und animiert automatisch (FLIP) von der alten zur
                // neuen Position/Groesse - deshalb keine manuelle Positions-
                // Berechnung (z. B. ueber den Tab-Index) noetig.
                // Dezenter Cream-Aufheller (bg-card bei nur 20% Deckkraft) -
                // reines Cream/Weiss war zwar auf dem Tan-Pillen-Hintergrund
                // gut sichtbar, verschwand aber selbst als Icon/Label-Farbe
                // auf hellem Cream-App-Hintergrund (siehe naechster
                // Kommentar) - die Pille bleibt deshalb bewusst nur ein
                // dezenter Aufheller HINTER dem Icon, nicht die Haupt-
                // Kontrastquelle des aktiven Zustands.
                <motion.span
                  layoutId="tab-aktive-pille"
                  className="absolute inset-0 rounded-full bg-card/20"
                  transition={reduzierteBewegung ? { duration: 0 } : TAB_PILLE_UEBERGANG}
                />
              )}
              {/* relative z-10: garantiert, dass das Icon-Glyph ÜBER der
                  (ebenfalls positionierten) Pille gemalt wird, unabhaengig
                  von CSS-Male-Reihenfolge-Feinheiten zwischen position:
                  absolute- und position:relative-Geschwistern.
                  Aktiv: Terracotta (text-primary) statt reinem Cream/Weiss -
                  Cream/Weiss sah auf dem dunkleren Tan-Pillen-Hintergrund gut
                  aus, verschwand aber, sobald die Bar (bzw. ihr durchscheinender
                  Hintergrund) ueber hellem Cream-App-Content lag - Terracotta
                  funktioniert auf BEIDEN Situationen. Inaktiv: text-text/55
                  (mittleres Espresso, --color-text #3E2E22 bei 55% Deckkraft) -
                  weder auf Tan- noch auf Cream-Hintergrund zu kontrastarm,
                  bleibt aber klar gedaempfter als der aktive Terracotta-Ton. */}
              <Icon
                size={22}
                stroke={1.75}
                className={`relative z-10 transition-colors duration-150 ${aktiv ? 'text-primary' : 'text-text/55'}`}
              />
            </span>
            <span
              className={`relative font-sans transition-colors duration-150 ${
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
