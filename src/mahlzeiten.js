// Die vier moeglichen Mahlzeit-Typen. slug ist der Wert, gegen den in der
// DB-Spalte "mahlzeiten" (kommasepariert) verglichen wird, label ist die
// Anzeige in UI-Elementen wie MahlzeitFilter oder TagesplanAnsicht.
export const MAHLZEITEN = [
  { slug: 'fruehstueck', label: 'Frühstück' },
  { slug: 'mittag', label: 'Mittag' },
  { slug: 'abend', label: 'Abend' },
  { slug: 'snack', label: 'Snack' },
]
