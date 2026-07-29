// Die vier moeglichen Mahlzeit-Filter. slug ist der Wert, gegen den in der
// DB-Spalte "mahlzeiten" (kommasepariert) verglichen wird, label ist die
// Anzeige im Button.
const MAHLZEITEN = [
  { slug: 'fruehstueck', label: 'Frühstück' },
  { slug: 'mittag', label: 'Mittag' },
  { slug: 'abend', label: 'Abend' },
  { slug: 'snack', label: 'Snack' },
]

// Zeigt vier Buttons, einer pro Mahlzeit. aktuell ist der gerade aktive
// Filter-Slug, onAendern wird mit dem geklickten Slug aufgerufen.
function MahlzeitFilter({ aktuell, onAendern }) {
  return (
    <div className="flex gap-2 px-4">
      {MAHLZEITEN.map(({ slug, label }) => (
        <button
          key={slug}
          type="button"
          onClick={() => onAendern(slug)}
          className={
            slug === aktuell
              ? 'rounded-full bg-primary px-3 py-1 text-sm font-medium text-card'
              : 'rounded-full border border-primary/30 px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10'
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default MahlzeitFilter
