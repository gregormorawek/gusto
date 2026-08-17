import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
import { SHEET_SLIDE_UEBERGANG, motionPropsFuer } from '../motionConfig'

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

// Der eigentliche Seiteninhalt - ausgelagert aus KochModus (siehe unten),
// damit der Fixed-Overlay-Wrapper NUR fuer die Ein-/Ausblende-Animation und
// den Scroll-Container zustaendig ist, waehrend dieser Teil rein den Inhalt
// beschreibt. eintrag ist { rezept, karte } (siehe App.jsx), nie null - der
// Aufrufer rendert KochModusInhalt nur, wenn eintrag tatsaechlich gesetzt ist.
function KochModusInhalt({ eintrag, onZurueck }) {
  const { rezept, karte } = eintrag
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
    <div className="pb-6">
      {/* Eigener, minimaler Kopfbereich NUR fuer den Kochmodus - ersetzt die
          sonst hier sichtbare App-Navigation (Planen/Rezepte-Tabs, Tag-
          gesamt-Header, Mahlzeiten-Filter, Zahnrad), die dank des Fixed-
          Overlays in KochModus (siehe unten) komplett verdeckt ist. Rechts
          ein simpler Fortschritts-Text statt einer Progressbar - reicht fuer
          "wie weit bin ich", ohne einen weiteren visuellen Balken einzufuehren. */}
      <div className="flex items-center justify-between px-4 pt-4">
        <AnimatedButton type="button" onClick={onZurueck} className="text-sm text-primary hover:underline">
          ← Zurück
        </AnimatedButton>
        <p className="text-sm font-medium text-text-muted">
          {erledigteSchritte.size}/{rezept.anleitung.length} Schritte
        </p>
      </div>

      {/* Randloses Bild ueber die volle Breite (kein mx-4, kein rounded) -
          bewusster Kontrast zur kompakten RezeptKarte, in der das Bild noch
          in eine gepolsterte Karte eingebettet ist. Hoeher als dort (h-56
          statt h-48, sm:h-80 statt sm:h-72), da hier mehr vertikaler Raum
          zur Verfuegung steht. */}
      <div className="mt-3">
        {rezept.bild_url ? (
          <img src={rezept.bild_url} alt={rezept.titel} className="h-56 w-full object-cover sm:h-80" />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-secondary/10 text-text-muted sm:h-80">
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

// Echter Vollbild-Takeover statt eines Abschnitts INNERHALB der Rezepte-
// Ansicht: ein "fixed inset-0"-Overlay ueber der gesamten App, das die
// bisherige Navigation (Planen/Rezepte-Tabs, Tag-gesamt-Header, Mahlzeiten-
// Filter, Zahnrad) optisch komplett verdeckt (deren Inhalt bleibt darunter
// zwar gemountet, ist aber unsichtbar - genau wie EinstellungenPanel.jsx es
// bereits fuer sein Overlay macht, nur ohne dessen Backdrop-Klick-zum-
// Schliessen, da der Kochmodus eine eigene Seite ist, kein Dialog).
//
// eintrag kommt von App.jsx (State auf Top-Level, siehe dortiger Kommentar)
// - { rezept, karte } | null. karte ist ein REINER Momentaufnahme-Snapshot
// vom Oeffnen-Zeitpunkt (rezeptKarteBerechnen-Ergebnis), kein State mehr:
// da das Zahnrad (und damit jede Moeglichkeit, ziel/makroZiele waehrend des
// Kochmodus zu aendern) verdeckt ist, kann er waehrend der Session ohnehin
// nicht veralten.
//
// Slide-up (Bottom-Sheet-artig) statt des frueheren reinen Fade+Scale:
// SHEET_SLIDE_UEBERGANG (eigenes Preset NUR fuer diesen Takeover, siehe
// motionConfig.js - bewusst NICHT SPRING_REVEAL, dessen leichtes
// Nachwippen bei einer vollflaechigen Seite verspielt statt hochwertig
// wirkte) auf y (100% -> 0) KOMBINIERT mit opacity, nicht nur y allein -
// motionPropsFuer() strippt bei reduzierter Bewegung ausschliesslich Props,
// die einen opacity-Key enthalten (siehe nurOpacity() dort), ein reiner
// y-Wert ohne opacity wuerde also NICHT automatisch deaktiviert. Mit
// opacity im selben Objekt wird daraus bei reduzierter Bewegung korrekt
// ein reines, bewegungsloses Fade.
function KochModus({ eintrag, onZurueck }) {
  const reduzierteBewegung = useReducedMotion()

  return (
    <AnimatePresence>
      {eintrag && (
        <motion.div
          {...motionPropsFuer(reduzierteBewegung, {
            initial: { opacity: 0, y: '100%' },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: '100%' },
            transition: SHEET_SLIDE_UEBERGANG,
          })}
          className="fixed inset-0 z-50 overflow-y-auto bg-bg"
        >
          <KochModusInhalt eintrag={eintrag} onZurueck={onZurueck} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default KochModus
