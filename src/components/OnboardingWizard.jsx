import { useState } from 'react'
import ZielEinstellungen from './ZielEinstellungen'
import MahlzeitFilter from './MahlzeitFilter'
import DiaetFilter from './DiaetFilter'

const SCHRITT_TITEL = {
  1: 'Kalorienziel',
  2: 'Mahlzeit',
  3: 'Ernährungsform',
}

// Prueft, ob die Kalorienziel-Auswahl aus Schritt 1 vollstaendig ist: "kein
// Ziel" ist immer gueltig, bei "proMahlzeit"/"proTag" muss zusaetzlich eine
// positive Kalorienzahl eingetragen sein - sonst bleibt "Weiter" blockiert.
function kalorienZielGueltig(ziel) {
  if (!ziel.typ) {
    return false
  }
  if (ziel.typ === 'kein') {
    return true
  }
  const kalorienZahl = Number(ziel.kalorien)
  return ziel.kalorien !== '' && Number.isFinite(kalorienZahl) && kalorienZahl > 0
}

// Einmaliger 3-Schritte-Wizard fuer den allerersten Besuch. Der Schritt-
// Zaehler ist reiner interner UI-State - App.jsx muss nur wissen, WANN der
// Wizard fertig ist (onAbschluss), nicht bei welchem Schritt er gerade steht.
// Alle drei Schritte rendern exakt dieselben Komponenten wie die Haupt-
// Ansicht (ZielEinstellungen/MahlzeitFilter/DiaetFilter) mit denselben
// Props/Handlern, damit sich Wizard und spaeteres Einstellungen-Panel
// identisch verhalten.
function OnboardingWizard({
  ziel,
  onTypAendern,
  onKalorienAendern,
  onMakroAendern,
  mahlzeit,
  onMahlzeitAendern,
  diaeten,
  onDiaetenAendern,
  onAbschluss,
}) {
  const [schritt, setSchritt] = useState(1)
  const zielGueltig = kalorienZielGueltig(ziel)
  const diaetGueltig = diaeten.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <header className="p-4">
        <h1 className="font-display text-3xl font-semibold text-primary">gusto</h1>
        <p className="text-sm text-text-muted">
          Schritt {schritt} von 3 – {SCHRITT_TITEL[schritt]}
        </p>
      </header>

      <div className="flex-1">
        {schritt === 1 && (
          <>
            <ZielEinstellungen
              ziel={ziel}
              onTypAendern={onTypAendern}
              onKalorienAendern={onKalorienAendern}
              onMakroAendern={onMakroAendern}
            />
            {!zielGueltig && ziel.typ && ziel.typ !== 'kein' && (
              <p className="mx-4 mt-2 text-xs text-primary">
                Bitte eine gültige Kalorienzahl (größer als 0) eingeben.
              </p>
            )}
          </>
        )}

        {schritt === 2 && (
          <section className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mahlzeit</h2>
            <p className="mt-1 text-xs text-text-muted">Womit soll es losgehen? Das lässt sich später jederzeit ändern.</p>
            <div className="mt-3">
              <MahlzeitFilter aktuell={mahlzeit} onAendern={onMahlzeitAendern} />
            </div>
          </section>
        )}

        {schritt === 3 && (
          <>
            <section className="mx-4 mt-4 rounded-lg border border-secondary/20 bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Ernährungsform</h2>
              <div className="mt-3">
                <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />
              </div>
            </section>
            {!diaetGueltig && (
              <p className="mx-4 mt-2 text-xs text-primary">
                Bitte eine Option auswählen (z. B. "Keine Einschränkung").
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-4">
        {schritt > 1 ? (
          <button
            type="button"
            onClick={() => setSchritt((s) => s - 1)}
            className="rounded-lg border border-primary/30 px-4 py-2 text-primary"
          >
            Zurück
          </button>
        ) : (
          <span />
        )}

        {schritt < 3 ? (
          <button
            type="button"
            onClick={() => setSchritt((s) => s + 1)}
            disabled={schritt === 1 && !zielGueltig}
            className="rounded-lg bg-primary px-4 py-2 text-card disabled:cursor-not-allowed disabled:opacity-40"
          >
            Weiter
          </button>
        ) : (
          <button
            type="button"
            onClick={onAbschluss}
            disabled={!diaetGueltig}
            className="rounded-lg bg-primary px-4 py-2 text-card disabled:cursor-not-allowed disabled:opacity-40"
          >
            Los geht's
          </button>
        )}
      </div>
    </div>
  )
}

export default OnboardingWizard
