import ZielEinstellungen from './ZielEinstellungen'
import DiaetFilter from './DiaetFilter'

// Modal-Panel fuer die Werte, die nach dem Onboarding nicht mehr staendig
// gebraucht werden (Kalorienziel, Ernaehrungsform), aber weiterhin
// editierbar bleiben muessen. Rendert dieselben Komponenten wie der
// Onboarding-Wizard, nur in einem Overlay statt als eigener Schritt.
function EinstellungenPanel({
  offen,
  onSchliessen,
  ziel,
  onTypAendern,
  onKalorienAendern,
  onMakroAendern,
  diaeten,
  onDiaetenAendern,
}) {
  if (!offen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-text/40 p-4"
      onClick={onSchliessen}
    >
      <div
        className="mt-16 w-full max-w-sm rounded-lg bg-card p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">Einstellungen</h2>
          <button
            type="button"
            onClick={onSchliessen}
            aria-label="Einstellungen schließen"
            className="text-text-muted hover:text-primary"
          >
            ✕
          </button>
        </div>

        <div className="mt-3">
          <ZielEinstellungen
            ziel={ziel}
            onTypAendern={onTypAendern}
            onKalorienAendern={onKalorienAendern}
            onMakroAendern={onMakroAendern}
          />
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Ernährungsform</h3>
          <div className="mt-2">
            <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EinstellungenPanel
