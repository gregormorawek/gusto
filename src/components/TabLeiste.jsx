import { IconBook2, IconDice5, IconSettings, IconShoppingCart } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'

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
function TabLeiste({ aktiverTab, onTabWaehlen }) {
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
            <span
              className={
                aktiv
                  ? 'flex h-8 w-12 items-center justify-center rounded-full bg-primary/15'
                  : 'flex h-8 w-12 items-center justify-center rounded-full'
              }
            >
              <Icon size={22} stroke={1.75} className={aktiv ? 'text-primary' : 'text-text/40'} />
            </span>
            <span
              className={
                aktiv ? 'font-sans text-[10px] font-semibold text-primary' : 'font-sans text-[9px] font-medium text-text/40'
              }
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
