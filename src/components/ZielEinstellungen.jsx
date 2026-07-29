// Die drei moeglichen Ziel-Typen. "kein" ist der Standard (kein Kalorienziel
// aktiv), bei den anderen beiden gibt der User zusaetzlich eine Kalorienzahl
// im Zahlenfeld ein.
const ZIEL_OPTIONEN = [
  { typ: 'kein', label: 'Kein Ziel' },
  { typ: 'proMahlzeit', label: 'Pro Mahlzeit' },
  { typ: 'proTag', label: 'Pro Tag' },
]

// Bei "Pro Tag" zusaetzlich zeigbares Makro-Gesamtziel fuer den ganzen Tag
// (Protein/Carbs/Fett in Gramm). Wird intern auf die vier Mahlzeiten
// aufgeteilt - siehe makroZielFuerMahlzeitAusTagesziel in App.jsx.
const MAKRO_FELDER = [
  { kategorie: 'protein', label: 'Protein' },
  { kategorie: 'carbs', label: 'Carbs' },
  { kategorie: 'fett', label: 'Fett' },
]

// Zeigt die Ziel-Typ-Auswahl (Radio, Single-Select), ein Zahlenfeld fuer die
// Kalorienzahl (falls ein Ziel aktiv ist) und - nur bei "Pro Tag" - ein
// Makro-Gesamtziel fuer den ganzen Tag. ziel ist { typ, kalorien, makro:
// { protein, carbs, fett } }. onTypAendern/onKalorienAendern/onMakroAendern
// werden mit dem jeweils neuen Wert aufgerufen.
function ZielEinstellungen({ ziel, onTypAendern, onKalorienAendern, onMakroAendern }) {
  return (
    <section className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Kalorienziel</h2>

      <div className="mt-2 flex flex-col gap-2">
        {ZIEL_OPTIONEN.map(({ typ, label }) => (
          <label key={typ} className="flex items-center gap-2 text-sm font-medium text-text">
            <input
              type="radio"
              name="ziel-typ"
              value={typ}
              checked={ziel.typ === typ}
              onChange={() => onTypAendern(typ)}
              className="accent-primary"
            />
            {label}
          </label>
        ))}
      </div>

      {ziel.typ !== 'kein' && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={ziel.kalorien}
            onChange={(e) => onKalorienAendern(e.target.value)}
            placeholder="z. B. 600"
            className="w-24 rounded-md border border-text-muted/30 px-2 py-1 text-sm text-text"
          />
          <span className="text-sm text-text-muted">
            kcal {ziel.typ === 'proMahlzeit' ? 'pro Mahlzeit' : 'pro Tag'}
          </span>
        </div>
      )}

      {ziel.typ === 'proTag' && (
        <div className="mt-3">
          <p className="text-xs text-text-muted">Makro-Gesamtziel für den Tag (optional):</p>
          <div className="mt-1 flex gap-3">
            {MAKRO_FELDER.map(({ kategorie, label }) => (
              <label key={kategorie} className="flex items-center gap-1 text-xs text-text-muted">
                {label}:
                <input
                  type="number"
                  min="0"
                  value={ziel.makro[kategorie]}
                  onChange={(e) => onMakroAendern(kategorie, e.target.value)}
                  placeholder="–"
                  className="w-14 rounded-md border border-text-muted/30 px-1 py-0.5 text-xs text-text"
                />
                g
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default ZielEinstellungen
