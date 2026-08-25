import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconGenderFemale, IconGenderMale } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import RadPicker from './RadPicker'
import Kalorienrechner, { GeschlechtKarte, OptionZeile } from './Kalorienrechner'
import ZielEinstellungen from './ZielEinstellungen'
import TagesplanMahlzeitenFilter from './TagesplanMahlzeitenFilter'
import DiaetFilter from './DiaetFilter'
import SuessDeftigFilter from './SuessDeftigFilter'
import {
  AKTIVITAETEN,
  ZIELE,
  berechneKalorienZiel,
  koerperdatenLaden,
  koerperdatenSpeichern,
  koerperdatenVollstaendig,
} from '../kalorienBerechnung'
import { FADE_UEBERGANG, SPRING_REVEAL, motionPropsFuer, transitionFuer } from '../motionConfig'

// Start-/Bereichswerte fuer die drei Rad-Picker-Felder - IDENTISCH zu den
// Bereichen im Kalorienrechner-Wizard (Kalorienrechner.jsx), damit ein dort
// (z. B. im Onboarding) bereits erfasster Wert hier garantiert innerhalb des
// scrollbaren Bereichs liegt. "start" wird hier nur als Fallback gebraucht,
// wenn koerperdatenLaden() (siehe kalorienBerechnung.js) noch keinen
// gespeicherten Wert liefert - der tatsaechlich angezeigte Wert kommt aus
// dem koerperdaten-State unten.
const ALTER_BEREICH = { min: 16, max: 80 }
const GROESSE_BEREICH = { min: 130, max: 220 }
const GEWICHT_BEREICH = { min: 40, max: 200 }

// Feste, schmale Rad-Breite (siehe "breite"-Prop-Kommentar in RadPicker.jsx)
// fuer die drei Koerperdaten-Raeder hier in den Einstellungen - anders als
// im Kalorienrechner-Wizard sind die Raeder hier nur EIN Element unter
// vielen auf einer normal scrollbaren Seite, eine volle Zeilenbreite wuerde
// dort versehentliche Rad-Aenderungen beim Durchscrollen begünstigen.
const KOERPERDATEN_RAD_BREITE_PX = 150

// Divisor fuer die Umrechnung eines TAGES-Kalorienziels (das Ergebnis von
// berechneKalorienZiel, siehe kalorienBerechnung.js) auf ein PRO-MAHLZEIT-
// Fenster, falls ziel.typ==='proMahlzeit' aktiv ist. Der Rechner selbst kennt
// nur ein Tagesziel (er wird app-weit ausschliesslich fuer "Pro Tag" genutzt,
// siehe Kalorienrechner.jsx/kalorienrechnerUebernehmen), "Pro Mahlzeit"
// verwendet dagegen bewusst EIN FLACHES Fenster fuer JEDE Mahlzeit
// (unabhaengig vom Mahlzeit-Typ, siehe zielKalorienFensterFuerMahlzeit in
// portionenRechner.js - dort wird bei proMahlzeit KEIN TAGES_ANTEIL
// angewendet). Ohne einen einzelnen "diese eine Mahlzeit"-Bezug bleibt eine
// gleichmaessige Aufteilung auf die App-Standardanzahl von 4 Mahlzeiten
// (Fruehstueck/Mittag/Abend/Snack) die einzige verzerrungsfreie Annahme.
const MAHLZEITEN_PRO_TAG = 4

function KoerperdatenLabel({ children }) {
  return <p className="text-xs font-medium text-text-muted">{children}</p>
}

// Kleine, dezente Sektions-Ueberschrift (Inter, 11px, uppercase, Tan,
// letter-spacing 0.06em) - exakt der in der Aufgabenstellung geforderte
// Stil, bewusst NICHT identisch mit dem groesseren "text-sm ... tracking-
// wide"-Titel-Stil, den z. B. ZielEinstellungen.jsx fuer seine eigene
// "Kalorienziel"-Ueberschrift verwendet (jene Komponente wird unveraendert
// eingebunden, siehe Sektion 2 unten, und behaelt deshalb ihren bisherigen
// Titel-Stil).
function SektionTitel({ children }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">{children}</h2>
}

// Ein-/Aus-Schalter im iOS-Stil fuer Sektion 5 (Kochassistent) - dieselbe
// Terracotta-bei-aktiv-Sprache wie AuswahlChip, aber als echter Schalter
// statt als Chip (hier gibt es nur EINE binaere Einstellung, keine Auswahl
// aus mehreren Optionen).
//
// GEFUNDENE URSACHE eines Bugs, bei dem der Knob im AUS-Zustand bereits
// rechts sass (und im AN-Zustand noch weiter nach rechts aus dem Toggle
// herausrutschte): der Knob hatte bewusst nur "top-0.5", aber KEIN
// explizites "left" - ohne links UND rechts gesetzten Wert loeste der
// Browser die statische Position hier auf "rechtsbuendig" auf (per Messung
// bestaetigt: computed left=24px auf einem 48px breiten Track = Knob schon
// im Ruhezustand am rechten Rand), die translate-x-Werte kamen dann
// zusaetzlich ON TOP dieser bereits-rechts-Position drauf. "left-0.5" fixiert
// jetzt explizit den linken Basis-Zustand (2px Innenabstand), translate-x
// bewegt den Knob von DORT aus - AUS keine Verschiebung, AN um 20px nach
// rechts (48px Track - 24px Knob - 2*2px Innenabstand = 20px Restweg,
// exakt translate-x-5). overflow-hidden auf dem Track verhindert zusaetzlich,
// dass der Knob (z. B. bei extremen Schriftgroessen-Skalierungen) je ueber
// den Rand hinausrutschen kann.
function ToggleZeile({ label, beschreibung, aktiv, onClick }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text">{label}</span>
        {beschreibung && <span className="mt-0.5 block text-xs text-text-muted">{beschreibung}</span>}
      </span>
      <AnimatedButton
        type="button"
        role="switch"
        aria-checked={aktiv}
        aria-label={label}
        onClick={onClick}
        className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full transition-colors duration-150 motion-reduce:transition-none ${
          aktiv ? 'bg-primary' : 'bg-text-muted/20'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform duration-150 motion-reduce:transition-none ${
            aktiv ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </AnimatedButton>
    </div>
  )
}

// Inaktive Vorschau-Zeile fuer Sektion 6 (App) - rein visueller Platzhalter
// fuer spaeter geplante Features, siehe CLAUDE.md. Bewusst ein <div> statt
// eines <button> - es gibt (noch) keine Funktion dahinter.
function AppPlatzhalterZeile({ label }) {
  return (
    <div className="flex items-center justify-between gap-3 opacity-50">
      <span className="text-sm font-medium text-text">{label}</span>
      <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
        Bald verfügbar
      </span>
    </div>
  )
}

// Bestaetigungs-Dialog "Kalorienziel neu berechnen?" - erscheint, sobald
// eine Koerperdaten-Aenderung (siehe koerperdatenFeldAendern unten) bei
// bereits aktivem Kalorienziel eine vollstaendige Neuberechnung ermoeglicht.
// Gleiches Overlay-/Karten-Muster wie ListeLeerenBestaetigung in
// EinkaufslisteAnsicht.jsx (fixed inset-0 bg-text/40 + zentrierte
// bg-card-Karte) - Backdrop-Klick zaehlt wie dort als "Abbrechen", hier also
// als "Behalten" (Kalorienziel bleibt unveraendert, die Koerperdaten selbst
// sind zu diesem Zeitpunkt aber laengst gespeichert, siehe dortiger
// Kommentar).
function KalorienzielNeuBerechnenDialog({ empfehlung, onUebernehmen, onBehalten }) {
  const reduzierteBewegung = useReducedMotion()
  return (
    <AnimatePresence>
      {empfehlung && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitionFuer(reduzierteBewegung, FADE_UEBERGANG)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-4"
          onClick={onBehalten}
        >
          <motion.div
            {...motionPropsFuer(reduzierteBewegung, {
              initial: { opacity: 0, y: -16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -16 },
              transition: SPRING_REVEAL,
            })}
            className="w-full max-w-xs rounded-lg bg-card p-4 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-semibold text-text">Kalorienziel neu berechnen?</p>
            <p className="mt-1 text-sm text-text-muted">
              Basierend auf deinen neuen Körperdaten würden wir {empfehlung.zielKalorien} kcal pro Tag empfehlen.
            </p>
            <div className="mt-4 flex gap-2">
              <AnimatedButton
                type="button"
                onClick={onBehalten}
                className="flex-1 rounded-lg border border-text-muted/30 px-3 py-2 text-sm font-medium text-text"
              >
                Behalten
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={onUebernehmen}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-card"
              >
                Übernehmen
              </AnimatedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Voller Einstellungen-Tab (ersetzt das fruehere EinstellungenPanel-Overlay,
// siehe App.jsx) - eigener scrollbarer Screen im iOS-Einstellungen-Stil.
// Anders als die uebrige App (siehe "kein Scrollen"-Prinzip in mehreren
// Kommentaren) DARF/SOLL dieser Screen normal per Seiten-Scroll scrollen,
// analog zu EinkaufslisteAnsicht.jsx.
function EinstellungenAnsicht({
  ziel,
  onTypAendern,
  onKalorienAendern,
  onMakroAendern,
  diaeten,
  onDiaetenAendern,
  suessDeftig,
  onSuessDeftigAendern,
  tagesplanMahlzeiten,
  onTagesplanMahlzeitenAendern,
  kochschrittePersistent,
  onKochschrittePersistentUmschalten,
}) {
  // Koerperdaten-Profil (Sektion 1) - eigenstaendiger, lokaler State analog
  // zu z. B. tagesplanMahlzeiten in App.jsx: lazy initializer laedt den
  // zuletzt gespeicherten Stand (siehe koerperdatenLaden in
  // kalorienBerechnung.js), ein Effekt-freier Setter schreibt jede Aenderung
  // synchron zurueck (kein useEffect noetig, siehe koerperdatenFeldAendern
  // unten - anders als z. B. ziel/diaeten in App.jsx, wo mehrere Setter an
  // derselben Stelle greifen koennten, gibt es hier nur einen einzigen
  // Schreibpfad).
  const reduzierteBewegung = useReducedMotion()

  const [koerperdaten, setKoerperdaten] = useState(koerperdatenLaden)

  // Nicht-null, waehrend der "Kalorienziel neu berechnen?"-Dialog offen ist -
  // enthaelt die (bereits gespeicherten) Koerperdaten, auf deren Basis die
  // Empfehlung im Dialog berechnet wird.
  const [ausstehendeKoerperdaten, setAusstehendeKoerperdaten] = useState(null)

  // Wird von JEDEM Koerperdaten-Feld unten aufgerufen. Speichert IMMER
  // sofort (unabhaengig davon, ob danach noch ein Dialog erscheint - siehe
  // Aufgabenstellung: "Behalten" aendert am bereits gespeicherten Stand
  // nichts mehr). Zeigt den Neu-Berechnen-Dialog NUR, wenn zusaetzlich (a)
  // bereits ein Kalorienziel aktiv ist (nicht "Kein Ziel") UND (b) inzwischen
  // alle 6 Felder ausgefuellt sind (koerperdatenVollstaendig) - ohne (b)
  // koennte berechneKalorienZiel unten nicht sinnvoll aufgerufen werden.
  //
  // GEFUNDENE URSACHE eines Bugs, bei dem der Dialog schon beim blossen
  // OEFFNEN dieses Screens erschien (ohne jede Nutzer-Eingabe): RadPicker
  // setzt beim Mount programmatisch scrollTop (siehe dortiger Kommentar) -
  // das loest im Browser TROTZDEM ein natives "scroll"-Event aus, das durch
  // RadPickers normalen Settle-/Debounce-Pfad laeuft und onAendern EINMAL mit
  // dem (unveraenderten) Startwert aufruft. Der fruehe Return unten
  // unterscheidet diesen Fall (wert === bereits gespeicherter Wert) von einer
  // ECHTEN Nutzer-Aenderung und verhindert so ein unbeabsichtigtes Ausloesen
  // des Dialogs direkt beim Mounten der drei RadPicker (Alter/Groesse/
  // Gewicht).
  function koerperdatenFeldAendern(feld, wert) {
    if (koerperdaten[feld] === wert) {
      return
    }
    const naechste = { ...koerperdaten, [feld]: wert }
    setKoerperdaten(naechste)
    koerperdatenSpeichern(naechste)
    if (ziel.typ !== 'kein' && koerperdatenVollstaendig(naechste)) {
      setAusstehendeKoerperdaten(naechste)
    }
  }

  // Nur berechnet, waehrend der Dialog tatsaechlich offen ist (siehe
  // ausstehendeKoerperdaten oben) - dient sowohl der Anzeige im Dialog
  // (empfehlung.zielKalorien) als auch, unveraendert, dem "Uebernehmen"-Pfad
  // unten (keine zweite/abweichende Berechnung).
  const empfehlung = ausstehendeKoerperdaten ? berechneKalorienZiel(ausstehendeKoerperdaten) : null

  function neuBerechnenUebernehmen() {
    const ergebnis = empfehlung
    if (ziel.typ === 'proTag') {
      onKalorienAendern('min', String(ergebnis.minKalorien))
      onKalorienAendern('max', String(ergebnis.maxKalorien))
      onMakroAendern('protein', String(ergebnis.proteinG))
      onMakroAendern('carbs', String(ergebnis.kohlenhydrateG))
      onMakroAendern('fett', String(ergebnis.fettG))
    } else {
      // proMahlzeit - siehe MAHLZEITEN_PRO_TAG-Kommentar oben zur Herleitung
      // der Gleichverteilung ueber die 4 Standard-Mahlzeiten.
      onKalorienAendern('min', String(Math.round(ergebnis.minKalorien / MAHLZEITEN_PRO_TAG)))
      onKalorienAendern('max', String(Math.round(ergebnis.maxKalorien / MAHLZEITEN_PRO_TAG)))
    }
    setAusstehendeKoerperdaten(null)
  }

  // Eigene Kalorienrechner-Anbindung fuer den "Ziel berechnen"-Einstieg
  // INNERHALB von ZielEinstellungen (Sektion 2 unten) - ANALOG zu
  // OnboardingWizard.jsx (dort dieselbe kalorienrechnerOffen/
  // minFeldFokusZaehler/kalorienrechnerUebernehmen-Kombination, siehe
  // dortiger ausfuehrlicher Kommentar zur Begruendung des Zaehlers statt
  // eines Booleans). ZielEinstellungen wird unveraendert eingebunden - sie
  // erwartet exakt diese beiden Props/den Handler, unabhaengig davon, ob sie
  // im Wizard oder hier gerendert wird.
  const [kalorienrechnerOffen, setKalorienrechnerOffen] = useState(false)
  const [minFeldFokusZaehler, setMinFeldFokusZaehler] = useState(0)

  function kalorienrechnerUebernehmen(ergebnis, { fokussieren }) {
    onTypAendern('proTag')
    onKalorienAendern('min', String(ergebnis.minKalorien))
    onKalorienAendern('max', String(ergebnis.maxKalorien))
    onMakroAendern('protein', String(ergebnis.proteinG))
    onMakroAendern('carbs', String(ergebnis.kohlenhydrateG))
    onMakroAendern('fett', String(ergebnis.fettG))
    setKalorienrechnerOffen(false)
    if (fokussieren) {
      setMinFeldFokusZaehler((n) => n + 1)
    }
  }

  return (
    <>
      <h1 className="px-4 pt-2 font-display text-2xl font-semibold text-text">Einstellungen</h1>

      {/* Sektion 1: Meine Koerperdaten */}
      <section className="mx-4 mt-4 rounded-2xl bg-card p-4 shadow-sm">
        <SektionTitel>Meine Körperdaten</SektionTitel>

        <div className="mt-3 flex gap-3">
          <GeschlechtKarte
            Icon={IconGenderFemale}
            label="Weiblich"
            aktiv={koerperdaten.geschlecht === 'weiblich'}
            onClick={() => koerperdatenFeldAendern('geschlecht', 'weiblich')}
          />
          <GeschlechtKarte
            Icon={IconGenderMale}
            label="Männlich"
            aktiv={koerperdaten.geschlecht === 'maennlich'}
            onClick={() => koerperdatenFeldAendern('geschlecht', 'maennlich')}
          />
        </div>

        <div className="mt-4">
          <KoerperdatenLabel>Alter</KoerperdatenLabel>
          <RadPicker
            min={ALTER_BEREICH.min}
            max={ALTER_BEREICH.max}
            startWert={koerperdaten.alterJahre}
            einheit="Jahre"
            ariaLabel="Alter in Jahren"
            reduzierteBewegung={reduzierteBewegung}
            breite={KOERPERDATEN_RAD_BREITE_PX}
            onAendern={(w) => koerperdatenFeldAendern('alterJahre', w)}
          />
        </div>

        <div className="mt-2">
          <KoerperdatenLabel>Größe (cm)</KoerperdatenLabel>
          <RadPicker
            min={GROESSE_BEREICH.min}
            max={GROESSE_BEREICH.max}
            startWert={koerperdaten.groesseCm}
            einheit="cm"
            ariaLabel="Größe in Zentimetern"
            reduzierteBewegung={reduzierteBewegung}
            breite={KOERPERDATEN_RAD_BREITE_PX}
            onAendern={(w) => koerperdatenFeldAendern('groesseCm', w)}
          />
        </div>

        <div className="mt-2">
          <KoerperdatenLabel>Gewicht (kg)</KoerperdatenLabel>
          <RadPicker
            min={GEWICHT_BEREICH.min}
            max={GEWICHT_BEREICH.max}
            startWert={koerperdaten.gewichtKg}
            einheit="kg"
            ariaLabel="Gewicht in Kilogramm"
            reduzierteBewegung={reduzierteBewegung}
            breite={KOERPERDATEN_RAD_BREITE_PX}
            onAendern={(w) => koerperdatenFeldAendern('gewichtKg', w)}
          />
        </div>

        <div className="mt-3">
          <KoerperdatenLabel>Aktivität</KoerperdatenLabel>
          <div className="mt-1.5 flex flex-col gap-2">
            {AKTIVITAETEN.map((option) => (
              <OptionZeile
                key={option.id}
                label={option.label}
                erklaerung={option.erklaerung}
                aktiv={koerperdaten.aktivitaet === option.id}
                onClick={() => koerperdatenFeldAendern('aktivitaet', option.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-3">
          <KoerperdatenLabel>Ziel</KoerperdatenLabel>
          <div className="mt-1.5 flex flex-col gap-2">
            {ZIELE.map((option) => (
              <OptionZeile
                key={option.id}
                label={option.label}
                erklaerung={option.erklaerung}
                aktiv={koerperdaten.ziel === option.id}
                onClick={() => koerperdatenFeldAendern('ziel', option.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Sektion 2: Kalorienziel - unveraendert eingebunden, inkl. eigenem
          Kalorienrechner-Einstieg (siehe kalorienrechnerUebernehmen oben). */}
      <ZielEinstellungen
        ziel={ziel}
        onTypAendern={onTypAendern}
        onKalorienAendern={onKalorienAendern}
        onMakroAendern={onMakroAendern}
        onKalorienrechnerOeffnen={() => setKalorienrechnerOffen(true)}
        minFeldFokusZaehler={minFeldFokusZaehler}
      />

      {/* Sektionen 3-6: EIN gemeinsamer, durch dezente Trennlinien
          (rgba(138,107,74,0.15) === text-muted bei 15% Deckkraft, siehe
          Design-Vertrag in CLAUDE.md) gegliederter Karten-Block - genau die
          in der Aufgabenstellung geforderte "Sektionen mit Trennlinien"-
          Optik. divide-y greift automatisch nur zwischen tatsaechlich
          gerenderten Kindern, die Mahlzeiten-Sektion (nur bei "Pro Tag"
          relevant) kann daher bedingt weggelassen werden, ohne eine
          verwaiste Trennlinie zu hinterlassen. */}
      <div className="mx-4 mt-3 divide-y divide-text-muted/15 overflow-hidden rounded-2xl bg-card shadow-sm">
        {ziel.typ === 'proTag' && (
          <div className="p-4">
            <SektionTitel>Mahlzeiten</SektionTitel>
            <p className="mt-1 text-xs text-text-muted">Welche Mahlzeiten sollen im Tagesplan vorkommen?</p>
            <div className="mt-2">
              <TagesplanMahlzeitenFilter ausgewaehlt={tagesplanMahlzeiten} onAendern={onTagesplanMahlzeitenAendern} />
            </div>
          </div>
        )}

        <div className="p-4">
          <SektionTitel>Ernährung</SektionTitel>
          <div className="mt-2">
            <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />
          </div>
          <p className="mt-3 text-xs text-text-muted">Süß oder deftig - gilt für Frühstück und Snacks.</p>
          <div className="mt-2">
            <SuessDeftigFilter aktuell={suessDeftig} onAendern={onSuessDeftigAendern} />
          </div>
        </div>

        <div className="p-4">
          <SektionTitel>Kochassistent</SektionTitel>
          <div className="mt-3">
            <ToggleZeile
              label="Kochschritte merken"
              beschreibung="Abgehakte Schritte im Kochmodus dauerhaft speichern, statt nur für die aktuelle Sitzung."
              aktiv={kochschrittePersistent}
              onClick={onKochschrittePersistentUmschalten}
            />
          </div>
        </div>

        <div className="p-4">
          <SektionTitel>App</SektionTitel>
          <div className="mt-3 flex flex-col gap-3">
            <AppPlatzhalterZeile label="Account erstellen" />
            <AppPlatzhalterZeile label="Premium" />
          </div>
        </div>
      </div>

      <Kalorienrechner
        offen={kalorienrechnerOffen}
        onSchliessen={() => setKalorienrechnerOffen(false)}
        onUebernehmen={kalorienrechnerUebernehmen}
      />

      <KalorienzielNeuBerechnenDialog
        empfehlung={empfehlung}
        onUebernehmen={neuBerechnenUebernehmen}
        onBehalten={() => setAusstehendeKoerperdaten(null)}
      />
    </>
  )
}

export default EinstellungenAnsicht
