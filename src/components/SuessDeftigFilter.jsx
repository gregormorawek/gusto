import AnimatedButton from './AnimatedButton'

// Die drei moeglichen Werte des Suess/Deftig-Filters. slug ist der Wert,
// gegen den in der DB-Spalte "eigenschaft" verglichen wird (siehe
// nachSuessDeftigGefiltert in App.jsx). '' (Alles) ist kein echter DB-Tag und
// deaktiviert den Filter, sodass Zutaten MIT und OHNE eigenschaft einbezogen werden.
const SUESS_DEFTIG_OPTIONEN = [
  { slug: 'suess', label: 'Süß' },
  { slug: 'deftig', label: 'Deftig' },
  { slug: '', label: 'Alles' },
]

// Zeigt drei Buttons (Einzelauswahl, wie MahlzeitFilter) fuer den
// Suess/Deftig-Filter. Wird von App.jsx nur bei mahlzeit === 'fruehstueck'
// bzw. 'snack' gerendert - bei Mittag/Abend ergibt die Unterscheidung keinen
// Sinn.
function SuessDeftigFilter({ aktuell, onAendern }) {
  return (
    <div className="mt-2 flex gap-2 px-4">
      {SUESS_DEFTIG_OPTIONEN.map(({ slug, label }) => (
        <AnimatedButton
          key={slug || 'alles'}
          type="button"
          onClick={() => onAendern(slug)}
          className={
            slug === aktuell
              ? 'rounded-full border border-primary bg-primary px-3 py-1 text-sm font-medium text-card transition-colors duration-200'
              : 'rounded-full border border-primary/30 bg-transparent px-3 py-1 text-sm font-medium text-primary transition-colors duration-200 hover:bg-primary/10'
          }
        >
          {label}
        </AnimatedButton>
      ))}
    </div>
  )
}

export default SuessDeftigFilter
