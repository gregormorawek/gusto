import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconCheck, IconGenderFemale, IconGenderMale } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import RadPicker from './RadPicker'
import { AKTIVITAETEN, ZIELE, berechneKalorienZiel, koerperdatenSpeichern } from '../kalorienBerechnung'
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
// Exportiert, damit EinstellungenAnsicht.jsx (Sektion "Meine Koerperdaten")
// fuer Aktivitaet/Ziel exakt dieselbe Optik wiederverwendet statt sie ein
// zweites Mal nachzubauen.
// Schatten-Y-Versatz bewusst 0 (symmetrischer Inset-Schatten) - siehe
// ausfuehrlicher Kommentar an containerKlassen in AuswahlChip.jsx zur
// Herleitung (behebt die optische obere/untere-Padding-Asymmetrie bei
// zweizeiligem Inhalt).
export function OptionZeile({ aktiv, label, erklaerung, onClick }) {
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
// OptionZeile/AuswahlChip fuer App-weite Konsistenz. Exportiert - siehe
// OptionZeile-Kommentar oben zur Wiederverwendung in EinstellungenAnsicht.jsx.
export function GeschlechtKarte({ Icon, label, aktiv, onClick }) {
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

// Kleine Makro-Kachel fuer den Ergebnis-Screen (Protein/Kohlenhydrate/Fett).
// Bewusst NICHT die bestehende SlotKarte (RezeptKarte.jsx) wiederverwendet -
// die ist auf einen konkreten Zutaten-Slot zugeschnitten (Name/Portion/
// Reroll/Ziel-Editierbarkeit/Live-Suche) und wuerde hier nur ihren Titel-
// und Wert-Teil nutzen, der Rest bliebe totes Props-Feld. Stattdessen eine
// eigene, radikal einfache Kachel mit demselben Typo-Vokabular (uppercase
// Tan-Label + Fraunces-Wert) - bg-bg (Creme) statt bg-card, damit die drei
// Kacheln sich sichtbar von der umgebenden weissen Ergebnis-Karte absetzen,
// ohne einen neuen Farb-Token einzufuehren.
function ErgebnisMakroKachel({ label, wertG }) {
  return (
    <div className="rounded-lg bg-bg px-2 py-2 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg font-semibold text-text">{wertG} g</p>
    </div>
  )
}

// Der eigentliche Inhalt der Rechner-Strecke - ausgelagert aus
// Kalorienrechner (siehe ganz unten), damit der gesamte Frage-/Antwort-State
// bei JEDEM Oeffnen als FRISCHE Hooks-Instanz entsteht (analog zu
// KochModusSheet in KochModus.jsx: dieser Teil wird von AnimatePresence bei
// offen=false komplett unmounted, kein manuelles Reset-Handling noetig).
function KalorienrechnerInhalt({ onSchliessen, onUebernehmen }) {
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

  // Nur berechnet, sobald der Ergebnis-Screen tatsaechlich erreicht ist (alle
  // 6 Antworten stehen dann fest, kannWeiter erzwingt das bereits vorher pro
  // Schritt) - reine Funktion, daher unproblematisch, sie bei jedem Render
  // dieses Screens neu aufzurufen statt sie zu memoisieren.
  const ergebnis = schritt > ANZAHL_FRAGEN ? berechneKalorienZiel(antworten) : null

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
      {/* pt-[...]: Safe-Area oben (Notch/Dynamic Island), analog zu
          OnboardingWizard.jsx - derselbe fixed inset-0-Vollbild-Screen
          braucht denselben Schutz. */}
      <header className="sticky top-0 z-10 bg-bg px-6 pt-[calc(2rem_+_env(safe-area-inset-top))]">
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
                    // py-2 (8px) oben+unten - GEMESSENER Freiraum-Bedarf fuer
                    // den Schatten des ersten/letzten Chips (siehe Kommentar
                    // an OptionZeile oben): per getBoundingClientRect() +
                    // computed box-shadow nachgewiesen, dass der inaktive
                    // shadow-sm bis zu 4px nach unten / 2px nach oben ausser-
                    // halb der Chip-Box ausblutet, UND dass translate-y-0.5
                    // (2px) im aktiven Zustand den letzten Chip selbst 2px
                    // ueber die vorherige Boxhoehe hinausschiebt (Chromium
                    // zaehlt das zur scrollHeight, obwohl es die eigentliche
                    // Layout-Hoehe nicht veraendert) - OHNE diesen Puffer
                    // schneidet das overflow-y-auto dieses Containers genau
                    // an dieser Kante hart ab. 8px deckt beide Faelle mit
                    // Marge ab. overflow-y-auto bleibt als Sicherheitsnetz
                    // erhalten (z.B. groessere System-Schriftgroesse) - der
                    // uebergeordnete "justify-center"-Flex-Bereich hat bei
                    // 375x700 (engster getesteter Fall) ausreichend Frei-
                    // raum (~100px), sodass es im Alltag nicht greift.
                    <div className="flex flex-col gap-2 overflow-y-auto py-2">
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
                    // py-2 - derselbe Schatten-Freiraum wie beim Aktivitaets-
                    // Container (schritt 5) oben, aus denselben Messungen
                    // hergeleitet (identische OptionZeile-Komponente/
                    // Schatten-Werte). Weniger Optionen (3 statt 4) heisst
                    // NICHT weniger Puffer-Bedarf - der Schatten haengt an
                    // JEDEM einzelnen Chip, nicht an der Gesamtzahl.
                    <div className="flex flex-col gap-2 overflow-y-auto py-2">
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
              // Ergebnis-Screen - zeigt berechneKalorienZiel(antworten)
              // (oben als "ergebnis" bereitgestellt). Bewusst KEIN eigener
              // Einblend-/Hochzaehl-Effekt auf der grossen Kalorienzahl
              // selbst (statisch gerendert statt z. B. AnimierteZahl) - die
              // Aufgabenstellung will hier explizit keine Zahl-Animation,
              // unabhaengig von reduzierter Bewegung. Der Screen-Wechsel
              // selbst (Slide+Fade) laeuft trotzdem wie bei den Fragen davor
              // ueber schrittVarianten, fuer einen konsistenten Uebergang.
              <motion.div
                key="ergebnis"
                className="col-start-1 row-start-1 flex h-full min-h-0 flex-col overflow-hidden"
                custom={richtung}
                variants={schrittVarianten(reduzierteBewegung)}
                initial="eintritt"
                animate="mitte"
                exit="austritt"
                transition={reduzierteBewegung ? { duration: 0.15 } : { duration: 0.32, ease: EXPO_OUT }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Dein Ergebnis</p>
                <h1 className="mt-1 font-display text-3xl font-semibold text-text sm:text-4xl">
                  Das empfehlen wir dir
                </h1>

                {/* Derselbe "py-2 als Schatten-Puffer"-Kniff wie bei den
                    OptionZeile-Containern oben (schritt 5/6) - die Karte
                    darunter hat einen shadow-sm, der sonst am unteren Rand
                    dieses min-h-0-Bereichs abgeschnitten wuerde. */}
                <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-y-auto py-2">
                  <div className="rounded-2xl bg-card p-4 shadow-sm">
                    <p>
                      <span className="font-display text-5xl font-semibold text-text">{ergebnis.zielKalorien}</span>{' '}
                      <span className="text-sm text-text-muted">kcal pro Tag</span>
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Spanne: {ergebnis.minKalorien} – {ergebnis.maxKalorien} kcal
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <ErgebnisMakroKachel label="Protein" wertG={ergebnis.proteinG} />
                      <ErgebnisMakroKachel label="Kohlenh." wertG={ergebnis.kohlenhydrateG} />
                      <ErgebnisMakroKachel label="Fett" wertG={ergebnis.fettG} />
                    </div>
                  </div>

                  {ergebnis.wurdeAngehoben && (
                    <p className="text-xs text-text-muted">
                      Wir haben dein Ziel auf einen gesunden Mindestwert angepasst.
                    </p>
                  )}

                  <p className="text-xs text-text-muted">
                    Diese Werte sind eine Orientierung, kein medizinischer Rat.
                  </p>
                </div>
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
          // "Selbst anpassen" ruft onUebernehmen mit fokussieren:true auf -
          // uebernimmt dieselben Werte, signalisiert dem Aufrufer (Schritt 1)
          // aber zusaetzlich, das Min-Feld danach zu fokussieren, statt die
          // Werte nur stumm einzutragen.
          //
          // Beide Buttons speichern zusaetzlich "antworten" (Geschlecht/
          // Alter/Groesse/Gewicht/Aktivitaet/Ziel) als eigenstaendiges
          // "Koerperdaten"-Profil im localStorage (siehe koerperdatenSpeichern
          // in kalorienBerechnung.js) - UNABHAENGIG davon, ob dieser Rechner
          // gerade aus dem Onboarding ODER aus EinstellungenAnsicht.jsx heraus
          // geoeffnet wurde. Genau DAS macht die Sektion "Meine Koerperdaten"
          // dort hinterher vorausgefuellt, ohne dass der Aufrufer (onUebernehmen)
          // davon wissen muesste.
          <div className="flex flex-col items-center gap-2">
            <AnimatedButton
              type="button"
              onClick={() => {
                koerperdatenSpeichern(antworten)
                onUebernehmen(ergebnis, { fokussieren: false })
              }}
              className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm"
            >
              Werte übernehmen
            </AnimatedButton>
            <AnimatedButton
              type="button"
              onClick={() => {
                koerperdatenSpeichern(antworten)
                onUebernehmen(ergebnis, { fokussieren: true })
              }}
              className="text-sm font-medium text-text-muted hover:text-primary"
            >
              Selbst anpassen
            </AnimatedButton>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Aeussere Huelle - haelt den Rechner nur gemountet, waehrend offen=true,
// analog zum AnimatePresence-Wrapper in KochModus.jsx. offen/onSchliessen/
// onUebernehmen kommen von OnboardingWizard.jsx (dort ein einfacher
// useState fuer offen, siehe dortiger Kommentar zur bewussten Platzierung
// als Geschwister der Schritt-1-Motion.div) - kein neues App-weites
// Routing/State noetig, onUebernehmen nutzt dieselben Setter, die
// OnboardingWizard ohnehin schon an ZielEinstellungen durchreicht.
// onUebernehmen(ergebnis, { fokussieren }) wird sowohl von "Werte
// uebernehmen" als auch von "Selbst anpassen" aufgerufen (siehe
// KalorienrechnerInhalt-Footer oben) - fokussieren unterscheidet nur, ob der
// Aufrufer danach zusaetzlich das Min-Feld fokussieren soll.
function Kalorienrechner({ offen, onSchliessen, onUebernehmen }) {
  return (
    <AnimatePresence>
      {offen && <KalorienrechnerInhalt onSchliessen={onSchliessen} onUebernehmen={onUebernehmen} />}
    </AnimatePresence>
  )
}

export default Kalorienrechner
