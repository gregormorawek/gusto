import { IconApps, IconCandy, IconMeat } from '@tabler/icons-react'
import AuswahlChip from './AuswahlChip'

// Die drei moeglichen Werte des Suess/Deftig-Filters. slug ist der Wert,
// gegen den in der DB-Spalte "eigenschaft" verglichen wird (siehe
// nachSuessDeftigGefiltert in App.jsx). '' (Alles) ist kein echter DB-Tag und
// deaktiviert den Filter, sodass Zutaten MIT und OHNE eigenschaft einbezogen werden.
const SUESS_DEFTIG_OPTIONEN = [
  { slug: 'suess', label: 'Süß', Icon: IconCandy },
  { slug: 'deftig', label: 'Deftig', Icon: IconMeat },
  { slug: '', label: 'Alles', Icon: IconApps },
]

// Zeigt drei Keramik-Auswahl-Chips (Einzelauswahl, wie MahlzeitFilter) fuer
// den Suess/Deftig-Filter. Wird von App.jsx nur bei mahlzeit === 'fruehstueck'
// bzw. 'snack' gerendert - bei Mittag/Abend ergibt die Unterscheidung keinen
// Sinn.
function SuessDeftigFilter({ aktuell, onAendern }) {
  return (
    <div className="mt-2 flex gap-2 px-4">
      {SUESS_DEFTIG_OPTIONEN.map(({ slug, label, Icon }) => (
        <AuswahlChip
          key={slug || 'alles'}
          Icon={Icon}
          label={label}
          aktiv={slug === aktuell}
          onClick={() => onAendern(slug)}
        />
      ))}
    </div>
  )
}

export default SuessDeftigFilter
