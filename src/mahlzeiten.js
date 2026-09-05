import { IconApple, IconCoffee, IconMoon, IconSoup } from '@tabler/icons-react'

// Die vier moeglichen Mahlzeit-Typen. slug ist der Wert, gegen den in der
// DB-Spalte "mahlzeiten" (kommasepariert) verglichen wird, label ist die
// Anzeige in UI-Elementen wie MahlzeitFilter oder TagesplanAnsicht.
export const MAHLZEITEN = [
  { slug: 'fruehstueck', label: 'Frühstück' },
  { slug: 'mittag', label: 'Mittag' },
  { slug: 'abend', label: 'Abend' },
  { slug: 'snack', label: 'Snack' },
]

// Icon pro Mahlzeit - einzige Quelle fuer diese Zuordnung, verwendet von
// MahlzeitFilter, AktiveMahlzeitenFilter und WizardTageskarte.
export const MAHLZEIT_ICON = {
  fruehstueck: IconCoffee,
  mittag: IconSoup,
  abend: IconMoon,
  snack: IconApple,
}

// Ermittelt anhand der Uhrzeit einen sinnvollen Standard-Filter, z. B.
// morgens vorausgewaehlt "fruehstueck". Wird sowohl fuer die Einzel-Ansicht
// (App.jsx) als auch fuer die Rezepte-Ansicht als initialer Mahlzeit-Filter
// verwendet - deshalb hier statt lokal in einer der beiden Komponenten.
export function standardMahlzeit(datum = new Date()) {
  const stunde = datum.getHours()
  if (stunde >= 5 && stunde < 11) return 'fruehstueck'
  if (stunde >= 11 && stunde < 15) return 'mittag'
  if (stunde >= 15 && stunde < 18) return 'snack'
  if (stunde >= 18 && stunde < 22) return 'abend'
  return 'snack'
}

// Feste Anzeige-Reihenfolge der Mahlzeit-Tabs (Fruehstueck -> Mittag ->
// Abend -> Snack), eingeschraenkt auf die laut Einstellungen aktivierten
// Mahlzeiten (aktiveMahlzeiten in App.jsx). Urspruenglich privat in
// RezepteAnsicht.jsx, jetzt hier geteilt: App.jsx braucht dieselbe Ableitung
// jetzt ebenfalls, seit die Rezepte-Tagesplan-Auswahl (welche Mahlzeit-Tabs
// existieren) beim "Mahlzeiten anpassen" eine Ebene hoeher (in App.jsx)
// neu gewuerfelt wird, statt nur lokal in einem Effekt der (bei Tab-Wechsel
// unmountenden) RezepteAnsicht.jsx.
export function aktiveMahlzeitenFuer(aktiveMahlzeitenSlugs) {
  return MAHLZEITEN.filter(({ slug }) => aktiveMahlzeitenSlugs.includes(slug))
}
