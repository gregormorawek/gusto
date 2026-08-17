import { useState } from 'react'
import {
  IconBowl,
  IconCheck,
  IconCooker,
  IconCut,
  IconGrillSpatula,
  IconHourglass,
  IconPhotoOff,
  IconSoup,
  IconToolsKitchen2,
  IconWhisk,
} from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import AnimierteZahl from './AnimierteZahl'

// aktion -> Icon, feste Zuordnung fuer die 8 erlaubten Werte (siehe
// CLAUDE.md, "Neue kuratierte Rezepte"). Rein statisch fuer jetzt - ein
// spaeterer Feature-Schritt ersetzt diese Icons durch animierte Versionen
// (z. B. Pfanne mit Dampf beim Braten), die Zuordnungsstelle bleibt dieselbe.
const AKTION_ICON = {
  schneiden: IconCut,
  kochen: IconSoup,
  braten: IconGrillSpatula,
  roesten: IconCooker,
  ruehren: IconWhisk,
  mischen: IconBowl,
  warten: IconHourglass,
  servieren: IconToolsKitchen2,
}

// Grossflaechige Detail-Ansicht fuer EIN Rezept: groesseres Bild, Titel,
// Beschreibung, eine kompakte Zutaten-Referenz (NICHT die vollen SlotKarte-
// Kacheln aus RezeptKarte - hier reicht Name+Menge zum schnellen
// Nachschauen waehrend des Kochens) und die vollstaendige, abhakbare
// Kochanleitung. Bewusst KEINE eigene Route (die App verwendet nirgends
// react-router) - RezeptKarte.jsx haelt den offen/geschlossen-Zustand
// lokal und rendert diese Komponente einfach anstelle der Karte, genau wie
// TagesplanAnsicht.jsx die Tagesplan-Detailansicht anstelle des "Ganzen Tag
// planen"-Buttons rendert.
//
// erledigteSchritte ist bewusst reiner In-Memory-State (Set von Indizes) in
// dieser Komponente selbst - kein localStorage. Verlaesst man die Seite
// (onZurueck) und kommt zurueck, ist die Komponente neu gemountet und der
// Haken-Status damit wieder leer. Das ist so gewollt (siehe CLAUDE.md) - ob
// der Fortschritt spaeter dauerhaft gespeichert wird, soll ueber einen
// eigenen Einstellungen-Toggle entschieden werden, nicht hier fix verdrahtet.
function KochModus({ rezept, karte, onZurueck }) {
  const [erledigteSchritte, setErledigteSchritte] = useState(() => new Set())

  function schrittUmschalten(index) {
    setErledigteSchritte((aktuell) => {
      const naechste = new Set(aktuell)
      if (naechste.has(index)) {
        naechste.delete(index)
      } else {
        naechste.add(index)
      }
      return naechste
    })
  }

  const zutatenReferenz = [
    { label: 'Protein', name: karte.proteinZutat.name, portion: karte.portionen.proteinPortion },
    { label: 'Kohlenhydrate', name: karte.carbsZutat.name, portion: karte.portionen.carbsPortion },
    { label: 'Fett', name: karte.fettZutat.name, portion: karte.portionen.fettPortion },
    {
      label: karte.gemueseZutat.kategorie === 'obst' ? 'Obst' : 'Gemüse',
      name: karte.gemueseZutat.name,
      portion: karte.portionen.gemuesePortion,
    },
  ]

  return (
    <div className="pb-4">
      <AnimatedButton type="button" onClick={onZurueck} className="mx-4 mt-2 text-sm text-primary hover:underline">
        ← Zurück
      </AnimatedButton>

      <div className="mx-4 mt-2">
        {rezept.bild_url ? (
          <img
            src={rezept.bild_url}
            alt={rezept.titel}
            className="h-48 w-full rounded-2xl object-cover sm:h-72"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-secondary/10 text-text-muted sm:h-72">
            <IconPhotoOff size={40} stroke={1.5} />
          </div>
        )}
      </div>

      <h1 className="mx-4 mt-3 font-display text-2xl font-semibold text-text">{rezept.titel}</h1>
      <p className="mx-4 mt-1 text-sm text-text-muted">{rezept.beschreibung}</p>

      {/* Kompakte Zutaten-Referenz - bewusst NICHT die grossen SlotKarte-
          Kacheln aus RezeptKarte.jsx (waere eine reine Wiederholung), nur
          Name+Menge je Zutat zum schnellen Nachschauen waehrend des Kochens. */}
      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        {zutatenReferenz.map((z) => (
          <div key={z.label} className="rounded-lg bg-secondary/10 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{z.label}</p>
            <p className="text-sm text-text">
              {z.name} · <AnimierteZahl wert={z.portion ?? 0} /> g
            </p>
          </div>
        ))}
      </div>

      <ol className="mx-4 mt-4 space-y-2">
        {rezept.anleitung.map((schritt, index) => {
          const Icon = AKTION_ICON[schritt.aktion]
          const erledigt = erledigteSchritte.has(index)
          return (
            <li key={index}>
              <AnimatedButton
                type="button"
                onClick={() => schrittUmschalten(index)}
                aria-pressed={erledigt}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left shadow-sm transition-colors duration-150 ${
                  erledigt ? 'border-secondary/30 bg-secondary/10' : 'border-text-muted/20 bg-card'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
                    erledigt ? 'border-secondary bg-secondary text-card' : 'border-text-muted/40'
                  }`}
                  aria-hidden="true"
                >
                  {erledigt && <IconCheck size={14} stroke={3} />}
                </span>

                {Icon && (
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <Icon size={18} stroke={1.75} />
                  </span>
                )}

                <span className={`flex-1 text-sm ${erledigt ? 'text-text-muted line-through' : 'text-text'}`}>
                  <span className="mr-1 font-display font-semibold text-secondary">{index + 1}.</span>
                  {schritt.text}
                </span>
              </AnimatedButton>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default KochModus
