import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconCheck, IconGenderFemale, IconGenderMale } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import RadPicker from './RadPicker'
import { AKTIVITAETEN, ZIELE } from '../kalorienBerechnung'
import { EXPO_OUT, motionPropsFuer } from '../motionConfig'

const ANZAHL_FRAGEN = 6

// Start-/Bereichswerte fuer die drei Rad-Picker-Screens (Alter/Groesse/
// Gewicht) - siehe Aufgabenstellung fuer die konkreten Zahlen.
const ALTER_BEREICH = { min: 16, max: 80, start: 30 }
const GROESSE_BEREICH = { min: 130, max: 220, start: 170 }
const GEWICHT_BEREICH = { min: 40, max: 200, start: 70 }

const TITEL = {
  1: 'Geschlecht',
  2: 'Alter',
  3: 'Größe',
  4: 'Gewicht',
  5: 'Aktivität',
  6: 'Ziel',
}

const UNTERTEXT = {
  1: 'Für die Berechnung deines Grundumsatzes.',
  2: 'Dein Alter fließt in die Berechnung deines Grundumsatzes ein.',
  3: 'Deine Körpergröße wird für den Grundumsatz gebraucht.',
  4: 'Dein aktuelles Gewicht als Ausgangspunkt.',
  5: 'Wie bewegst du dich normalerweise im Alltag?',
  6: 'Was möchtest du mit deiner Ernährung erreichen?',
}

// Slide+Fade-Varianten fuer den Frage-Bereich beim Screen-Wechsel - exakt
// dasselbe Grid-Stack+Crossfade-Muster wie OnboardingWizard.jsx (siehe
// dortiger Kommentar zur Herleitung: verhindert Layout-Sprung UND
// Doppel-Sprung beim Wechsel unterschiedlich hoher Screens). EXPO_OUT statt
// des Haupt-Wizards 'easeOut' - laut Aufgabenstellung bewusst derselbe
// "ruhige Mechanismus", aber mit dem fuer Marken-Momente reservierten
// Easing (siehe motionConfig.js-Kommentar zu EXPO_OUT).
function schrittVarianten(reduzierteBewegung) {
  if (reduzierteBewegung) {
    return {
      eintritt: { opacity: 0 },
      mitte: { opacity: 1 },
      austritt: { opacity: 0 },
    }
  }
  return {
    eintritt: (richtung) => ({ opacity: 0, x: richtung > 0 ? 40 : -40 }),
    mitte: { opacity: 1, x: 0 },
    austritt: (richtung) => ({ opacity: 0, x: richtung > 0 ? -40 : 40 }),
  }
}

// Volle-Breite-Options-Zeile fuer Aktivitaet/Ziel (Screen 5/6) - Label +
// Erklaerzeile untereinander, GLEICHER "Keramik"-Einsink-Zustand wie
// AuswahlChip.jsx (Rand durchgezogen + Schatten nach innen + Versatz nach
// unten bei Auswahl), aber zweizeilig statt einzeiliger Icon+Label-Pille -
// AuswahlChip selbst unterstuetzt keine zweite Zeile, daher hier lokal
// nachgebaut statt die geteilte Komponente eigens dafuer zu erweitern.
// Schatten-Y-Versatz bewusst 0 (symmetrischer Inset-Schatten) - siehe
// ausfuehrlicher Kommentar an containerKlassen in AuswahlChip.jsx zur
// Herleitung (behebt die optische obere/untere-Padding-Asymmetrie bei
// zweizeiligem Inhalt).
function OptionZeile({ aktiv, label, erklaerung, onClick }) {
  return (
    <AnimatedButton
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[transform,box-shadow,border-color] duration-150 ease-out motion-reduce:transition-none ${
        aktiv
          ? 'translate-y-0.5 border-primary bg-primary/20 shadow-[inset_0_0_6px_0_rgba(62,46,34,0.35)]'
          : 'border-text-muted/30 bg-card shadow-sm hover:border-primary/50'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${aktiv ? 'font-semibold text-text' : 'font-medium text-text'}`}>{label}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{erklaerung}</span>
      </span>
      {aktiv && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-card">
          <IconCheck size={14} stroke={3} />
        </span>
      )}
    </AnimatedButton>
  )
}

// Grosse Auswahl-Karte fuer Screen 1 (Geschlecht) - zwei nebeneinander,
// Icon-Kreis oben + Label darunter, derselbe Einsink-Zustand wie
// OptionZeile/AuswahlChip fuer App-weite Konsistenz.
function GeschlechtKarte({ Icon, label, aktiv, onClick }) {
  return (
    <AnimatedButton
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border px-4 py-6 transition-[transform,box-shadow,border-color] duration-150 ease-out motion-reduce:transition-none ${
        aktiv
          ? 'translate-y-0.5 border-primary bg-primary/20 shadow-[inset_0_0_6px_0_rgba(62,46,34,0.35)]'
          : 'border-text-muted/30 bg-card shadow-sm hover:border-primary/50'
      }`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full ${aktiv ? 'bg-primary text-card' : 'bg-text-muted/10 text-text-muted'}`}
      >
        <Icon size={28} stroke={1.75} />
      </span>
      <span className={`text-sm ${aktiv ? 'font-semibold text-text' : 'font-medium text-text-muted'}`}>{label}</span>
    </AnimatedButton>
  )
}

// Der eigentliche Inhalt der Rechner-Strecke - ausgelagert aus
// Kalorienrechner (siehe ganz unten), damit der gesamte Frage-/Antwort-State
// bei JEDEM Oeffnen als FRISCHE Hooks-Instanz entsteht (analog zu
// KochModusSheet in KochModus.jsx: dieser Teil wird von AnimatePresence bei
// offen=false komplett unmounted, kein manuelles Reset-Handling noetig).
function KalorienrechnerInhalt({ onSchliessen }) {
  const reduzierteBewegung = useReducedMotion()
  const [schritt, setSchritt] = useState(1)
  // richtung merkt sich, ob der letzte Wechsel ein Weiter (+1) oder ein
  // Zurueck (-1) war - siehe OnboardingWizard.jsx-Vorbild fuer denselben
  // Mechanismus.
  const [richtung, setRichtung] = useState(1)

  const [antworten, setAntworten] = useState({
    geschlecht: null,
    alterJahre: ALTER_BEREICH.start,
    groesseCm: GROESSE_BEREICH.start,
    gewichtKg: GEWICHT_BEREICH.start,
    aktivitaet: null,
    ziel: null,
  })

  function antwortAendern(feld, wert) {
    setAntworten((aktuell) => ({ ...aktuell, [feld]: wert }))
  }

  function weiter() {
    setRichtung(1)
    if (schritt === ANZAHL_FRAGEN) {
      // TODO (Prompt 2): fuehrt zum Ergebnis-Screen, der berechneKalorienZiel
      // (aus kalorienBerechnung.js) mit "antworten" aufruft, die berechneten
      // Werte zeigt UND per Uebernahme-Button in ZielEinstellungen eintraegt.
      // Die Strecke endet bewusst vorerst mit einem Platzhalter-Screen
      // (Aufgabenstellung: "in diesem Prompt also noch keine Werte in die
      // Kalorienziel-Felder eintragen").
      setSchritt(ANZAHL_FRAGEN + 1)
      return
    }
    setSchritt((s) => s + 1)
  }

  function zurueck() {
    setRichtung(-1)
    if (schritt === 1) {
      onSchliessen()
      return
    }
    setSchritt((s) => s - 1)
  }

  const kannWeiter =
    (schritt !== 1 || antworten.geschlecht) &&
    (schritt !== 5 || antworten.aktivitaet) &&
    (schritt !== 6 || antworten.ziel)

  return (
    // fixed inset-0 statt eines Bottom-Sheets (anders als KochModus.jsx) -
    // die Aufgabenstellung will einen eigenen Vollbild-Screen "ueber dem
    // Wizard", kein Ziehen/Peek noetig. h-dvh + sticky Header/Footer +
    // min-h-0/overflow-hidden im mittleren Bereich: dasselbe robuste Skelett
    // wie OnboardingWizard.jsx (siehe dortige ausfuehrliche Kommentare zur
    // Herleitung dieser Struktur - identische Bugs bei schmalem Viewport
        // wuerden sonst hier erneut auftreten).
    <motion.div
      {...motionPropsFuer(reduzierteBewegung, {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      })}
      className="fixed inset-0 z-40 flex h-dvh flex-col bg-bg"
    >
      <header className="sticky top-0 z-10 bg-bg px-6 pt-8">
        <AnimatedButton
          type="button"
          onClick={zurueck}
          aria-label={schritt === 1 ? 'Rechner schließen' : 'Zurück'}
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-text-muted hover:text-primary"
        >
          ←
        </AnimatedButton>

        {/* Eigener 6-Segmente-Fortschrittsbalken - bewusst klar abgesetzt von
            den 3 Hauptschritt-Segmenten des Haupt-Wizards (schmalere,
            olivfarbene Segmente statt der terrakottafarbenen Haupt-Segmente),
            damit User optisch nicht verwechseln, in welcher der beiden
            Strecken sie sich gerade befinden. */}
        <div className="mt-6 flex gap-1">
          {Array.from({ length: ANZAHL_FRAGEN }, (_, i) => i + 1).map((s) => (
            <span key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-text-muted/20">
              <span
                className="block h-full rounded-full bg-secondary transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
                style={{ width: s <= schritt ? '100%' : '0%' }}
              />
            </span>
          ))}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-6">
        <div className="grid h-full grid-cols-1 overflow-hidden">
          <AnimatePresence custom={richtung} initial={false}>
            {schritt <= ANZAHL_FRAGEN ? (
              <motion.div
                key={schritt}
                // overflow-hidden + min-h-0 HIER - GEFUNDENE URSACHE des
                // "erster/letzter Chip wird vom Header/Footer verdeckt"-Bugs
                // (Aufgabenstellung "sticky Header/Footer überdecken ersten/
                // letzten Chip"): dieses Grid-Item hat h-full (100% seiner
                // Grid-Zelle, siehe gridStack-Kommentar unten), OHNE
                // overflow-hidden bleibt sein automatisches min-height:auto
                // (CSS-Sizing-Spec) aber INHALTSBASIERT statt auf 0
                // ueberschrieben zu werden - bei Inhalt, der laenger ist als
                // die Zelle (z. B. 4 Aktivitaets-Chips bei knappem Viewport),
                // GEWINNT dieses min-height:auto gegen h-full und die Box
                // waechst ueber ihre Grid-Zelle hinaus (per Messung
                // nachgewiesen: 388px statt der zugeteilten 348px bei
                // 375x560). Die ueberschuessigen ~40px werden vom AEUSSEREN
                // "grid h-full ... overflow-hidden"-Stack zwar unsichtbar
                // abgeschnitten, aber eben NICHT dort, wo man es erwartet -
                // der Schnitt liegt an der Grid-Zellen-Kante, die knapp ueber
                // dem Footer sitzt, wodurch der LETZTE Chip dort verschwindet.
                // GENAUSO WICHTIG: weil diese Box nie auf ihre echte
                // Zielhoehe gezwungen wurde, wurde auch der weiter unten
                // verschachtelte "overflow-y-auto"-Chip-Container nie
                // korrekt hoehenbegrenzt - er blieb einfach so gross wie sein
                // Inhalt, konnte also gar NICHT scrollen (der ueberschuessige
                // Teil war schlicht unerreichbar, nicht nur voruebergehend
                // verdeckt). overflow-hidden hier ueberschreibt das
                // automatische min-height wie spezifiziert auf 0, h-full
                // greift dadurch wieder als HARTE Obergrenze - min-h-0
                // zusaetzlich als dieselbe Absicherung fuer den darunter
                // liegenden Flex-Kontext (analog zum etablierten Muster in
                // OnboardingWizard.jsx, dessen "min-h-0 flex-1 ...
                // overflow-hidden"-Frage-Bereich denselben Zweck erfuellt -
                // dort aber ohne diese zusaetzliche Titel+Inhalt-flex-col-
                // Verschachtelung, die dieser Screen durch das Kombinieren
                // von Titel/Untertext UND Frage-Inhalt in EINEM
                // Crossfade-Block neu einfuehrt).
                className="col-start-1 row-start-1 flex h-full min-h-0 flex-col overflow-hidden"
                custom={richtung}
                variants={schrittVarianten(reduzierteBewegung)}
                initial="eintritt"
                animate="mitte"
                exit="austritt"
                transition={reduzierteBewegung ? { duration: 0.15 } : { duration: 0.32, ease: EXPO_OUT }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Frage {schritt} von {ANZAHL_FRAGEN}
                </p>
                <h1 className="mt-1 font-display text-3xl font-semibold text-text sm:text-4xl">{TITEL[schritt]}</h1>
                <p className="mt-2 text-sm text-text-muted">{UNTERTEXT[schritt]}</p>

                {/* min-h-0 zusaetzlich zum bestehenden overflow-hidden - siehe
                    ausfuehrlicher Kommentar am Eltern-motion.div oben zur
                    Herleitung des Bugs: dieselbe Absicherung (automatisches
                    min-height auf 0 statt content-basiert) jetzt auch in
                    DIESEM Flex-Kontext, damit dieser Bereich bei knappem
                    Platz tatsaechlich auf die verfuegbare Rest-Hoehe
                    schrumpft, statt sie zu ueberschreiten. */}
                <div className="mt-6 flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
                  {schritt === 1 && (
                    <div className="flex gap-3">
                      <GeschlechtKarte
                        Icon={IconGenderFemale}
                        label="Weiblich"
                        aktiv={antworten.geschlecht === 'weiblich'}
                        onClick={() => antwortAendern('geschlecht', 'weiblich')}
                      />
                      <GeschlechtKarte
                        Icon={IconGenderMale}
                        label="Männlich"
                        aktiv={antworten.geschlecht === 'maennlich'}
                        onClick={() => antwortAendern('geschlecht', 'maennlich')}
                      />
                    </div>
                  )}

                  {schritt === 2 && (
                    <RadPicker
                      min={ALTER_BEREICH.min}
                      max={ALTER_BEREICH.max}
                      startWert={antworten.alterJahre}
                      einheit="Jahre"
                      ariaLabel="Alter in Jahren"
                      reduzierteBewegung={reduzierteBewegung}
                      onAendern={(w) => antwortAendern('alterJahre', w)}
                    />
                  )}

                  {schritt === 3 && (
                    <RadPicker
                      min={GROESSE_BEREICH.min}
                      max={GROESSE_BEREICH.max}
                      startWert={antworten.groesseCm}
                      einheit="cm"
                      ariaLabel="Größe in Zentimetern"
                      reduzierteBewegung={reduzierteBewegung}
                      onAendern={(w) => antwortAendern('groesseCm', w)}
                    />
                  )}

                  {schritt === 4 && (
                    <RadPicker
                      min={GEWICHT_BEREICH.min}
                      max={GEWICHT_BEREICH.max}
                      startWert={antworten.gewichtKg}
                      einheit="kg"
                      ariaLabel="Gewicht in Kilogramm"
                      reduzierteBewegung={reduzierteBewegung}
                      onAendern={(w) => antwortAendern('gewichtKg', w)}
                    />
                  )}

                  {schritt === 5 && (
                    <div className="flex flex-col gap-2 overflow-y-auto">
                      {AKTIVITAETEN.map((option) => (
                        <OptionZeile
                          key={option.id}
                          label={option.label}
                          erklaerung={option.erklaerung}
                          aktiv={antworten.aktivitaet === option.id}
                          onClick={() => antwortAendern('aktivitaet', option.id)}
                        />
                      ))}
                    </div>
                  )}

                  {schritt === 6 && (
                    <div className="flex flex-col gap-2 overflow-y-auto">
                      {ZIELE.map((option) => (
                        <OptionZeile
                          key={option.id}
                          label={option.label}
                          erklaerung={option.erklaerung}
                          aktiv={antworten.ziel === option.id}
                          onClick={() => antwortAendern('ziel', option.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              // Platzhalter-Screen fuer den (in Prompt 2 folgenden)
              // Ergebnis-Screen - siehe TODO-Kommentar in weiter() oben.
              <motion.div
                key="platzhalter"
                className="col-start-1 row-start-1 flex h-full flex-col items-center justify-center text-center"
                custom={richtung}
                variants={schrittVarianten(reduzierteBewegung)}
                initial="eintritt"
                animate="mitte"
                exit="austritt"
                transition={reduzierteBewegung ? { duration: 0.15 } : { duration: 0.32, ease: EXPO_OUT }}
              >
                <h1 className="font-display text-3xl font-semibold text-text sm:text-4xl">Fast fertig!</h1>
                <p className="mt-2 max-w-xs text-sm text-text-muted">
                  Der Ergebnis-Screen mit deinem berechneten Kalorien- und Makroziel folgt in Kürze.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 bg-bg px-6 pb-2 pt-1">
        {schritt <= ANZAHL_FRAGEN ? (
          <AnimatedButton
            type="button"
            onClick={weiter}
            disabled={!kannWeiter}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {schritt === ANZAHL_FRAGEN ? 'Ziel berechnen' : 'Weiter'}
          </AnimatedButton>
        ) : (
          <AnimatedButton
            type="button"
            onClick={onSchliessen}
            className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm"
          >
            Schließen
          </AnimatedButton>
        )}
      </div>
    </motion.div>
  )
}

// Aeussere Huelle - haelt den Rechner nur gemountet, waehrend offen=true,
// analog zum AnimatePresence-Wrapper in KochModus.jsx. offen/onSchliessen
// kommen von ZielEinstellungen.jsx (dort ein einfacher useState, siehe
// dortiger Kommentar) - kein neues App-weites Routing/State noetig.
function Kalorienrechner({ offen, onSchliessen }) {
  return <AnimatePresence>{offen && <KalorienrechnerInhalt onSchliessen={onSchliessen} />}</AnimatePresence>
}

export default Kalorienrechner
