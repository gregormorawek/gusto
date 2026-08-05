import { MAHLZEITEN } from '../mahlzeiten'

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
              ? 'rounded-full border border-primary bg-primary px-3 py-1 text-sm font-medium text-card transition-colors duration-200'
              : 'rounded-full border border-primary/30 bg-transparent px-3 py-1 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary/10'
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default MahlzeitFilter
