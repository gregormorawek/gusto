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
//
// flex-wrap: ohne das ragte der letzte Chip ("Alles") im schmalen
// Filter-Panel des Rezepte-Tabs (RezepteSwipeAnsicht.jsx, dort w-72 minus
// Panel-Padding) rechts ueber den Panel-Rand hinaus (Real-Device-Bugreport)
// - analog zu MahlzeitFilters 'reihe'-Layout (siehe dortiger Kommentar zur
// selben Herleitung), bricht ein zu breiter Chip jetzt einfach in die
// naechste Zeile um statt zu ueberlaufen.
function SuessDeftigFilter({ aktuell, onAendern }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2 px-4">
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
