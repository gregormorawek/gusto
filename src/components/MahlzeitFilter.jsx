import { MAHLZEITEN } from '../mahlzeiten'
import AnimatedButton from './AnimatedButton'

// Zeigt einen Button pro Mahlzeit. aktuell ist der gerade aktive
// Filter-Slug, onAendern wird mit dem geklickten Slug aufgerufen. flex-wrap
// statt einer starren Einzelreihe, damit auf schmalen Viewports (v. a. im
// Wizard, wo die Reihe zusaetzlich durch die Karten-Innenabstaende
// eingeengt wird) die 4. Pille ("Snack") umbricht statt aus der Karte
// herauszuragen - bei ausreichend Breite (z. B. Haupt-Ansicht) bleibt die
// Reihe einzeilig, da genug Platz vorhanden ist.
//
// mahlzeiten ist optional (Default: alle 4) - die Rezepte-Tagesplan-Ansicht
// (RezepteAnsicht.jsx, proTag-Zweig) nutzt diese Komponente auch als
// Tab-Leiste NUR fuer die laut Einstellungen aktivierten Mahlzeiten
// (tagesplanMahlzeiten), gleiche Pillen-Optik, aber eine gefilterte Liste
// statt der vollen MAHLZEITEN-Liste.
function MahlzeitFilter({ aktuell, onAendern, mahlzeiten = MAHLZEITEN }) {
  return (
    <div className="flex flex-wrap gap-2 px-4">
      {mahlzeiten.map(({ slug, label }) => (
        <AnimatedButton
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
        </AnimatedButton>
      ))}
    </div>
  )
}

export default MahlzeitFilter
