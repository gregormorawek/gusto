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
//
// Chips gestapelt statt umbrechend + groesse="breit" (Redesign, siehe
// ZielEinstellungen.jsx fuer dieselbe Aenderung an den Kalorienziel-Chips) -
// analog dortiger Begruendung ("brechen unsauber um"). KEIN eigenes px-4
// mehr: beide Aufrufer (OnboardingWizard.jsx Schritt 3, EinstellungenPanel)
// betten diese Komponente bereits in eine eigene gepolsterte Karte ein - das
// fruehere zusaetzliche px-4 hier erzeugte dadurch doppeltes Padding, die
// (jetzt volle Breite einnehmenden) Chips wirkten gegenueber der
// "Ernaehrungsform"-Ueberschrift daneben sichtbar eingerueckt.
function DiaetFilter({ ausgewaehlt, onAendern }) {
  return (
    <div className="mt-2 flex flex-col gap-1">
      {DIAETEN.map(({ slug, label }) => {
        const aktiv = ausgewaehlt.includes(slug)
        return (
          <AuswahlChip
            key={slug}
            Icon={DIAET_ICON[slug]}
            label={label}
            groesse="breit"
            aktiv={aktiv}
            input={{ type: 'checkbox', checked: aktiv, onChange: () => onAendern(slug) }}
          />
        )
      })}
    </div>
  )
}

export default DiaetFilter
