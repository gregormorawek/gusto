import { MAHLZEITEN, MAHLZEIT_ICON } from '../mahlzeiten'
import AuswahlChip from './AuswahlChip'

// Zeigt einen Keramik-Auswahl-Chip pro Mahlzeit (Mehrfachauswahl, echte
// Checkbox fuer A11y bleibt erhalten, aber visuell versteckt - siehe
// AuswahlChip), welche Mahlzeiten bei "Ganzen Tag planen" ueberhaupt
// vorkommen sollen. ausgewaehlt ist das Array der aktuell aktiven Slugs,
// onAendern wird mit dem geklickten Slug aufgerufen (das eigentliche Toggle
// inkl. "mind. 1 bleibt aktiv"-Schutz passiert in App.jsx, siehe
// tagesplanMahlzeitenAendern). Ist nur noch eine Mahlzeit ausgewaehlt, wird
// genau diese als disabled dargestellt, damit sichtbar ist, warum sich der
// letzte Haken nicht entfernen laesst.
//
// layout analog zu MahlzeitFilter: 'reihe' (Default, ueberall ausser dem
// Wizard) vs. 'raster2x2' (NUR vom Onboarding-Wizard-proTag-Zweig gesetzt).
function TagesplanMahlzeitenFilter({ ausgewaehlt, onAendern, layout = 'reihe' }) {
  const letzteVerbleibende = ausgewaehlt.length === 1 ? ausgewaehlt[0] : null
  const containerKlasse = layout === 'raster2x2' ? 'grid grid-cols-2 gap-2 px-4' : 'flex flex-wrap gap-3 px-4'
  const groesse = layout === 'raster2x2' ? 'gross' : 'kompakt'

  return (
    <div className={containerKlasse}>
      {MAHLZEITEN.map(({ slug, label }) => {
        const aktiv = ausgewaehlt.includes(slug)
        const deaktiviert = slug === letzteVerbleibende
        return (
          <AuswahlChip
            key={slug}
            Icon={MAHLZEIT_ICON[slug]}
            label={label}
            aktiv={aktiv}
            groesse={groesse}
            input={{ type: 'checkbox', checked: aktiv, disabled: deaktiviert, onChange: () => onAendern(slug) }}
          />
        )
      })}
    </div>
  )
}

export default TagesplanMahlzeitenFilter
