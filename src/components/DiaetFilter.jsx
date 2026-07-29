// Die drei moeglichen Diaetform-Filter. slug ist der Wert, gegen den in der
// DB-Spalte "diaeten" (kommasepariert) verglichen wird, label ist die
// Anzeige neben der Checkbox.
const DIAETEN = [
  { slug: 'vegan', label: 'Vegan' },
  { slug: 'vegetarisch', label: 'Vegetarisch' },
  { slug: 'glutenfrei', label: 'Glutenfrei' },
]

// Zeigt eine Checkbox pro Diaetform (Mehrfachauswahl). ausgewaehlt ist das
// Array der aktuell aktiven Slugs, onAendern wird mit dem geklickten Slug
// aufgerufen (das eigentliche Toggle passiert in App.jsx).
function DiaetFilter({ ausgewaehlt, onAendern }) {
  return (
    <div className="flex gap-3 px-4">
      {DIAETEN.map(({ slug, label }) => (
        <label
          key={slug}
          className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 text-sm font-medium text-primary"
        >
          <input
            type="checkbox"
            checked={ausgewaehlt.includes(slug)}
            onChange={() => onAendern(slug)}
            className="accent-primary"
          />
          {label}
        </label>
      ))}
    </div>
  )
}

export default DiaetFilter
