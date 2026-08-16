import { MAHLZEITEN, MAHLZEIT_ICON } from '../mahlzeiten'
import AuswahlChip from './AuswahlChip'

// Zeigt einen Keramik-Auswahl-Chip pro Mahlzeit. aktuell ist der gerade
// aktive Filter-Slug, onAendern wird mit dem geklickten Slug aufgerufen.
//
// layout steuert NUR die Anordnung des Containers:
// - 'reihe' (Default): flex-wrap, damit auf schmalen Viewports (v. a. im
//   Wizard, wo die Reihe zusaetzlich durch die Karten-Innenabstaende
//   eingeengt wird) die 4. Pille ("Snack") umbricht statt aus der Karte
//   herauszuragen - bei ausreichend Breite (z. B. Haupt-Ansicht/Rezepte-Tab)
//   bleibt die Reihe einzeilig, da genug Platz vorhanden ist.
// - 'raster2x2': NUR vom Onboarding-Wizard (Schritt 2) gesetzt, damit die
//   Mahlzeitauswahl dort als 2x2-Raster statt als Reihe erscheint. Der
//   Tagesplan-Tab-Umschalter (RezepteAnsicht.jsx) bleibt bewusst beim
//   Default 'reihe'.
//
// mahlzeiten ist optional (Default: alle 4) - die Rezepte-Tagesplan-Ansicht
// (RezepteAnsicht.jsx, proTag-Zweig) nutzt diese Komponente auch als
// Tab-Leiste NUR fuer die laut Einstellungen aktivierten Mahlzeiten
// (tagesplanMahlzeiten), gleiche Chip-Optik, aber eine gefilterte Liste
// statt der vollen MAHLZEITEN-Liste.
function MahlzeitFilter({ aktuell, onAendern, mahlzeiten = MAHLZEITEN, layout = 'reihe' }) {
  const containerKlasse = layout === 'raster2x2' ? 'grid grid-cols-2 gap-2 px-4' : 'flex flex-wrap gap-2 px-4'
  const groesse = layout === 'raster2x2' ? 'gross' : 'kompakt'

  return (
    <div className={containerKlasse}>
      {mahlzeiten.map(({ slug, label }) => (
        <AuswahlChip
          key={slug}
          Icon={MAHLZEIT_ICON[slug]}
          label={label}
          aktiv={slug === aktuell}
          groesse={groesse}
          onClick={() => onAendern(slug)}
        />
      ))}
    </div>
  )
}

export default MahlzeitFilter
