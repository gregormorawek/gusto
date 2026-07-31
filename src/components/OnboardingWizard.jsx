import { useState } from 'react'
import ZielEinstellungen from './ZielEinstellungen'
import MahlzeitFilter from './MahlzeitFilter'
import DiaetFilter from './DiaetFilter'
import TagesplanMahlzeitenFilter from './TagesplanMahlzeitenFilter'

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
// Alle Schritte rendern exakt dieselben Komponenten wie die Haupt-Ansicht
// (ZielEinstellungen/MahlzeitFilter/DiaetFilter/TagesplanMahlzeitenFilter)
// mit denselben Props/Handlern, damit sich Wizard und spaeteres
// Einstellungen-Panel identisch verhalten. Layout bewusst grosszuegig
// gehalten (viel Weissraum, grosse Touch-Targets) - nur mit den
// bestehenden Marken-Tokens, keine neuen Farben/Fonts.
function OnboardingWizard({
  ziel,
  onTypAendern,
  onKalorienAendern,
  onMakroAendern,
  mahlzeit,
  onMahlzeitAendern,
  diaeten,
  onDiaetenAendern,
  tagesplanMahlzeiten,
  onTagesplanMahlzeitenAendern,
  onAbschluss,
}) {
  const [schritt, setSchritt] = useState(1)
  const zielGueltig = kalorienZielGueltig(ziel)
  const diaetGueltig = diaeten.length > 0
  const proTag = ziel.typ === 'proTag'

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="px-6 pt-8">
        <p className="font-display text-lg font-semibold text-primary">gusto</p>

        <div className="mt-6 flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= schritt ? 'bg-primary' : 'bg-text-muted/20'}`}
            />
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Schritt {schritt} von 3
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-text">{SCHRITT_TITEL[schritt]}</h1>
      </header>

      <div className="flex-1 px-6 py-6">
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
          <section className="mx-4 rounded-2xl border border-secondary/20 bg-card p-6 shadow-sm">
            {proTag ? (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mahlzeiten</h2>
                <p className="mt-1 text-xs text-text-muted">Welche Mahlzeiten sollen im Tagesplan vorkommen?</p>
                <div className="mt-3">
                  <TagesplanMahlzeitenFilter ausgewaehlt={tagesplanMahlzeiten} onAendern={onTagesplanMahlzeitenAendern} />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mahlzeit</h2>
                <p className="mt-1 text-xs text-text-muted">Womit soll es losgehen? Das lässt sich später jederzeit ändern.</p>
                <div className="mt-3">
                  <MahlzeitFilter aktuell={mahlzeit} onAendern={onMahlzeitAendern} />
                </div>
              </>
            )}
          </section>
        )}

        {schritt === 3 && (
          <>
            <section className="mx-4 rounded-2xl border border-secondary/20 bg-card p-6 shadow-sm">
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

      <div className="px-6 pb-8 pt-2">
        {schritt < 3 ? (
          <button
            type="button"
            onClick={() => setSchritt((s) => s + 1)}
            disabled={schritt === 1 && !zielGueltig}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Weiter
          </button>
        ) : (
          <button
            type="button"
            onClick={onAbschluss}
            disabled={!diaetGueltig}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Los geht's
          </button>
        )}

        {schritt > 1 && (
          <button
            type="button"
            onClick={() => setSchritt((s) => s - 1)}
            className="mt-3 w-full text-center text-sm text-text-muted hover:text-primary"
          >
            Zurück
          </button>
        )}
      </div>
    </div>
  )
}

export default OnboardingWizard
