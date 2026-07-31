import { MAHLZEITEN } from '../mahlzeiten'

// Zeigt eine Checkbox pro Mahlzeit (Mehrfachauswahl, welche Mahlzeiten bei
// "Ganzen Tag planen" ueberhaupt vorkommen sollen). ausgewaehlt ist das Array
// der aktuell aktiven Slugs, onAendern wird mit dem geklickten Slug
// aufgerufen (das eigentliche Toggle inkl. "mind. 1 bleibt aktiv"-Schutz
// passiert in App.jsx, siehe tagesplanMahlzeitenAendern). Ist nur noch eine
// Mahlzeit ausgewaehlt, wird genau diese als disabled dargestellt, damit
// sichtbar ist, warum sich der letzte Haken nicht entfernen laesst.
function TagesplanMahlzeitenFilter({ ausgewaehlt, onAendern }) {
  const letzteVerbleibende = ausgewaehlt.length === 1 ? ausgewaehlt[0] : null

  return (
    <div className="mt-3 flex flex-wrap gap-3 px-4">
      {MAHLZEITEN.map(({ slug, label }) => (
        <label
          key={slug}
          className="flex items-center gap-1.5 rounded-full border border-primary/30 px-3 py-1 text-sm font-medium text-primary has-[:disabled]:opacity-40"
        >
          <input
            type="checkbox"
            checked={ausgewaehlt.includes(slug)}
            disabled={slug === letzteVerbleibende}
            onChange={() => onAendern(slug)}
            className="accent-primary disabled:cursor-not-allowed"
          />
          {label}
        </label>
      ))}
    </div>
  )
}

export default TagesplanMahlzeitenFilter
