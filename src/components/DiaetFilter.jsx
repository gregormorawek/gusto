import { IconCheck, IconLeaf, IconWheatOff } from '@tabler/icons-react'
import AuswahlChip from './AuswahlChip'

// Die vier moeglichen Diaetform-Filter. slug ist der Wert, gegen den in der
// DB-Spalte "diaeten" (kommasepariert) verglichen wird, label ist die
// Anzeige im Chip. "keine" ist ein Spezialfall (kein DB-Tag, siehe
// nachDiaetenGefiltert in App.jsx) und schliesst die anderen drei
// gegenseitig aus - die Ausschluss-Logik selbst lebt in App.jsx.
export const DIAET_ICON = {
  vegan: IconLeaf,
  vegetarisch: IconLeaf,
  glutenfrei: IconWheatOff,
  keine: IconCheck,
}

const DIAETEN = [
  { slug: 'vegan', label: 'Vegan' },
  { slug: 'vegetarisch', label: 'Vegetarisch' },
  { slug: 'glutenfrei', label: 'Glutenfrei' },
  { slug: 'keine', label: 'Keine Einschränkung' },
]

// Zeigt einen Keramik-Auswahl-Chip pro Diaetform (Mehrfachauswahl, echte
// Checkbox fuer A11y bleibt erhalten, aber visuell versteckt - siehe
// AuswahlChip). ausgewaehlt ist das Array der aktuell aktiven Slugs,
// onAendern wird mit dem geklickten Slug aufgerufen (das eigentliche Toggle
// passiert in App.jsx).
function DiaetFilter({ ausgewaehlt, onAendern }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 px-4">
      {DIAETEN.map(({ slug, label }) => {
        const aktiv = ausgewaehlt.includes(slug)
        return (
          <AuswahlChip
            key={slug}
            Icon={DIAET_ICON[slug]}
            label={label}
            aktiv={aktiv}
            input={{ type: 'checkbox', checked: aktiv, onChange: () => onAendern(slug) }}
          />
        )
      })}
    </div>
  )
}

export default DiaetFilter
