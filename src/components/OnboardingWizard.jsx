import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconBook2, IconDice5 } from '@tabler/icons-react'
import ZielEinstellungen from './ZielEinstellungen'
import MahlzeitFilter from './MahlzeitFilter'
import DiaetFilter from './DiaetFilter'
import TagesplanMahlzeitenFilter from './TagesplanMahlzeitenFilter'
import WizardTageskarte from './WizardTageskarte'
import AnimatedButton from './AnimatedButton'
import { kalorienZielGueltig } from '../kalorienZiel'
import { EXPO_OUT, SPRING_REVEAL, motionPropsFuer } from '../motionConfig'

const SCHRITT_TITEL = {
  1: 'Kalorienziel',
  2: 'Mahlzeit',
  3: 'Ernährungsform',
}

// Eingangsanimation fuer den Titel-Block (Schritt-Zaehler + grosse
// Ueberschrift) beim Schritt-Wechsel - dezentes Fade + minimaler Y-Versatz,
// bewusst OHNE Ueberschwingen (EXPO_OUT statt eines Springs), angelehnt an
// die Logo-Einblendung in Startbildschirm.jsx. Getrennt von schrittVarianten
// oben, da NUR der Titel-Block re-animiert (der Fortschrittsbalken bleibt
// unangetastet stehen und waechst weiterhin rein per width-transition, siehe
// Rendering unten) - waeren beide im selben AnimatePresence, wuerde der
// Balken bei jedem Schritt-Wechsel unnoetig mit aus-/einblenden.
const TITEL_TRANSITION = { duration: 0.28, ease: EXPO_OUT }

// Slide+Fade-Varianten fuer den Frage-Bereich beim Schritt-Wechsel. richtung
// (+1 = Weiter, -1 = Zurueck, siehe schrittWechseln) bestimmt, von welcher
// Seite die neue Frage hereinkommt bzw. wohin die alte rausgeht - Weiter
// kommt von rechts rein/geht nach links raus, Zurueck umgekehrt. Bei
// reduzierter Bewegung (prefers-reduced-motion) faellt die x-Verschiebung
// komplett weg, es bleibt nur ein reines Fade.
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

// Wizard fuer den allerersten Besuch: 3 Frage-Schritte (Kalorienziel/
// Mahlzeit/Ernaehrungsform) + 1 Abschluss-Screen (Schritt 4, "Los geht's"-
// Auswahl zwischen Wuerfeln/Rezepte). Der Schritt-Zaehler ist reiner
// interner UI-State - App.jsx muss nur wissen, WANN der Wizard fertig ist
// (onAbschluss) UND in welcher Ansicht er starten soll (Parameter von
// onAbschluss), nicht bei welchem Schritt er gerade steht. Schritt 1-3
// rendern exakt dieselben Komponenten wie die Haupt-Ansicht
// (ZielEinstellungen/MahlzeitFilter/DiaetFilter/TagesplanMahlzeitenFilter)
// mit denselben Props/Handlern, damit sich Wizard und spaeteres
// Einstellungen-Panel identisch verhalten.
//
// Layout Schritt 1-3: Kopfbereich (Zurueck-Pfeil ab Schritt 2 + 3-Segmente-
// Fortschrittsbalken mit Width-Transition + Titel), mittlerer Bereich (die
// eigentliche Frage, per AnimatePresence beim Schritt-Wechsel geslided),
// unteres Drittel (WizardTageskarte + "Weiter"-Button).
//
// Schritt 4 ist BEWUSST ANDERS (kein Datenfeld mehr, sondern der
// Abschluss): kein Fortschrittsbalken, celebratorische Ueberschrift statt
// Frage-Titel, keine WizardTageskarte/kein Button-Footer - stattdessen zwei
// grosse Tap-Karten (Wuerfeln/Rezepte), deren Tap selbst die Aktion ist.
// Bleibt trotzdem im SELBEN AnimatePresence wie Schritt 1-3 (nur mit
// eigenen, nicht-geslideten Animate-Props statt der gemeinsamen
// schrittVarianten), damit der Uebergang 3->4 weiterhin sauber ausspielt
// statt abrupt zu wirken. Nur bestehende Marken-Tokens, keine neuen
// Farben/Fonts.
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
  // richtung merkt sich, ob der LETZTE Schrittwechsel ein Weiter (+1) oder
  // ein Zurueck (-1) war - wird als "custom"-Wert an die Slide-Varianten
  // durchgereicht, damit AnimatePresence weiss, aus welcher Richtung die neue
  // Frage hereinkommen soll.
  const [richtung, setRichtung] = useState(1)
  const reduzierteBewegung = useReducedMotion()

  const zielGueltig = kalorienZielGueltig(ziel)
  const diaetGueltig = diaeten.length > 0
  const proTag = ziel.typ === 'proTag'

  function weiterKlicken() {
    setRichtung(1)
    setSchritt((s) => s + 1)
  }

  function zurueckKlicken() {
    setRichtung(-1)
    setSchritt((s) => s - 1)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* sticky top-0: bleibt beim Fokussieren eines Eingabefelds (Tastatur
          erscheint, siehe useTastaturAusgleich.js) an Ort und Stelle stehen,
          waehrend sich nur der Inhalt darunter verschiebt - macht die
          Bewegung insgesamt ruhiger UND verhindert strukturell, dass der
          Header (wie im Kommentar in index.html zur alten resizes-content-
          Entscheidung beschrieben) hinter die Statusleiste hochgescrollt
          wird: sticky kann per Definition nicht ueber top:0 hinaus scrollen.
          bg-bg noetig, damit der darunter scrollende Inhalt nicht sichtbar
          durchscheint, sobald der Header steht und der Rest weiterzieht. */}
      <header className="sticky top-0 z-10 bg-bg px-6 pt-8">
        {schritt > 1 ? (
          // EXPLIZIT h-9 w-9 (statt sich implizit aus p-2 + text-2xl-
          // Zeilenhoehe zu ergeben) + flex-Zentrierung fuers "←" - GEFUNDENE
          // URSACHE eines vierten, wieder separaten Beitrags zum "Doppel-
          // Sprung"/Nachjustieren (siehe Bugfix "Wizard-Uebergaenge, dritter
          // Versuch"): der Kommentar am Platzhalter unten behauptet zwar
          // "derselben Groesse", tatsaechlich war der Button OHNE explizite
          // Hoehe 48px hoch (p-2 + text-2xl-Inhalt), der Platzhalter dagegen
          // exakt 36px (h-9) - per getBoundingClientRect()-Messung an beiden
          // Elementen konkret nachgewiesen. Dieser 12px-Unterschied liess
          // den STICKY HEADER beim Schritt-1-zu-2-Wechsel augenblicklich und
          // unanimiert wachsen (Button ersetzt Platzhalter), was den
          // darunterliegenden, per justify-center zentrierten Frage-Bereich
          // sofort mitverschob - voellig unabhaengig von/zusaetzlich zu den
          // beiden anderen in diesem Bugfix gefundenen Ursachen.
          <AnimatedButton
            type="button"
            onClick={zurueckKlicken}
            aria-label="Zurück"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-text-muted hover:text-primary"
          >
            ←
          </AnimatedButton>
        ) : (
          // Platzhalter in derselben Groesse wie der Zurueck-Pfeil (siehe
          // dortiger Kommentar zur h-9 w-9-Vereinheitlichung), damit der
          // Titel beim Wechsel von Schritt 1 zu Schritt 2 nicht springt. Der
          // frühere "gusto"-Logo-Schriftzug daneben ist entfernt (siehe
          // Startbildschirm.jsx - der neue Splash-Screen uebernimmt jetzt den
          // grossen Marken-Moment, die Wiederholung hier im Wizard war
          // redundant) - der Platzhalter bleibt trotzdem bestehen, sonst
          // wuerde der Fortschrittsbalken/Titel beim Schritt-1-zu-2-Wechsel
          // um seine Hoehe nach unten springen.
          <span className="block h-9 w-9" />
        )}

        {schritt <= 3 && (
          <div className="mt-6 flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-text-muted/20">
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
                  style={{ width: s <= schritt ? '100%' : '0%' }}
                />
              </span>
            ))}
          </div>
        )}

        {/* Titel-Block separat per AnimatePresence gekapselt (siehe
            TITEL_TRANSITION oben) - der Fortschrittsbalken darueber bleibt
            bewusst AUSSERHALB, damit er beim Schritt-Wechsel nicht mit
            aus-/einblendet, sondern durchgehend sichtbar bleibt und nur
            seine Fuellung per width-transition waechst. mode="wait" statt
            eines echten Crossfades, da altes und neues sich sonst an
            derselben Stelle ueberlappen wuerden (kein Ueberlagerungs-Layout
            wie bei RezeptKarte.jsx, wo beide Bilder per Grid-Overlay
            uebereinander liegen koennen). */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={schritt}
            {...motionPropsFuer(reduzierteBewegung, {
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: TITEL_TRANSITION,
            })}
          >
            {schritt <= 3 ? (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Schritt {schritt} von 3
                </p>
                <h1 className="mt-1 font-display text-4xl font-semibold text-text sm:text-5xl">
                  {SCHRITT_TITEL[schritt]}
                </h1>
              </>
            ) : (
              <>
                <h1 className="mt-8 font-display text-4xl font-semibold text-text sm:text-5xl">Alles bereit!</h1>
                <p className="mt-2 text-text-muted">Wie möchtest du starten?</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </header>

      {/* grid statt block: waehrend der Crossfade-Ueberlappung liegen altes
          UND neues motion.div per col-start-1/row-start-1 in GENAU derselben
          Grid-Zelle uebereinander (identischer "CSS-Grid-Stack"-Trick wie in
          RezeptKarte.jsx) - die Zeile sized sich automatisch auf die
          groessere der beiden Schritt-Inhalte, dadurch KEIN Hart-Sprung mehr
          beim Wechsel zwischen unterschiedlich hohen Schritten. Bewusst OHNE
          mode="wait" (das haette altes/neues NACHEINANDER statt
          UEBERLAPPEND gezeigt und genau den vorherigen Sprung verursacht,
          siehe Bugfix "Wizard-Schritt-Uebergaenge glaetten") und OHNE
          mode="popLayout" (siehe RezeptKarte.jsx-Kommentar zur Herleitung:
          das haette dem austretenden Element eigene, nicht immer exakt
          passende inline-Positionswerte verpasst).
          BEWUSST OHNE zusaetzlichen useBeobachteteHoehe-Wrapper (anders als
          ein frueherer Versuch, siehe Bugfix "Wizard-Uebergaenge, zweiter
          Versuch"): grid sized sich WAEHREND der Ueberlappung bereits
          korrekt auf die groessere Seite; ein zusaetzlicher Hoehen-
          Uebergang ERST NACH dem Ende der Ueberlappung erzeugte einen
          sichtbar ZWEITEN, vom Crossfade entkoppelten Sprung ("skaliert
          kurz nach dem Sichtbarwerden nochmals nach") - per
          getBoundingClientRect()-Serie konkret nachgewiesen (Inhalt war
          nach ~330ms bereits fertig sichtbar/positioniert, der Wrapper zog
          danach nochmal separat ueber weitere ~330ms nach). Exakt dasselbe
          Muster wie RezeptKarte.jsx, das ebenfalls OHNE einen solchen
          Wrapper auskommt.

          justify-start statt justify-center - GEFUNDENE URSACHE eines
          Rucklers, der spezifisch beim Wechsel 1->2 auftrat ("Mahlzeiten"-
          Viereck bewegt sich kurz nach oben und springt dann zurueck nach
          unten): Schritt 1 (Kalorienziel, mit Min/Max- + Makro-Feldern) ist
          deutlich hoeher als Schritt 2 (nur das Mahlzeiten-Viereck). Mit
          justify-center wird die Grid-Stack-Zeile INNERHALB des flex-1-
          Bereichs vertikal zentriert - waehrend der Ueberlappung sized sich
          die Zeile auf den GROESSEREN (alten, Schritt-1-)Inhalt, die
          Zentrierung berechnet die Top-Position also relativ zu DESSEN
          Hoehe. Sobald der alte Inhalt am Ende des Crossfades entfernt wird,
          schrumpft die Zeile schlagartig auf die Hoehe des NEUEN (kuerzeren,
          Schritt-2-)Inhalts - die Zentrierung berechnet die Top-Position
          dadurch neu und verschiebt die Zeile (und damit das Mahlzeiten-
          Viereck) einen zweiten, vom Crossfade entkoppelten Schritt nach
          unten. Per getBoundingClientRect()-Serie ueber den gesamten
          Uebergang konkret nachgewiesen (gridTop glitt zunaechst souveraen
          nach oben, sprang danach hart zurueck nach unten). Existierte laut
          Ruecksprache bereits VOR jeder Kartenhoehen-Animation - liegt also
          nicht an WizardTageskarte, sondern strukturell an der Kombination
          aus Zentrierung + stark unterschiedlichen Schritt-Hoehen (bei 2->3
          bisher zufaellig unauffaellig, weil beide Schritte aehnlich hoch
          sind). Mit justify-start haengt die Top-Position der Zeile nicht
          mehr von IHRER EIGENEN Hoehe ab - sie bleibt fix am oberen Rand
          dieses Bereichs, unabhaengig davon, welcher/wie hohe Schritt
          gerade (oder ueberlappend) sichtbar ist. Gilt automatisch fuer
          ALLE Uebergaenge (1<->2, 2<->3), nicht nur 1->2, da die Ursache
          strukturell im Alignment liegt, nicht in einem schrittspezifischen
          Sonderfall. Titel-Block (im sticky Header) und der untere Bereich
          (Karte + Button, eigener Flex-Sibling unterhalb dieses Bereichs)
          sind von dieser Aenderung nicht betroffen, da sie ausserhalb
          dieses flex-1-Containers liegen. */}
      <div className="relative flex flex-1 flex-col justify-start overflow-hidden px-6 py-6">
        <div className="grid">
          <AnimatePresence custom={richtung} initial={false}>
            <motion.div
              key={schritt}
              className="col-start-1 row-start-1"
              {...(schritt === 4
                ? motionPropsFuer(reduzierteBewegung, {
                    initial: { opacity: 0, scale: 0.95 },
                    animate: { opacity: 1, scale: 1 },
                    exit: { opacity: 0, scale: 0.95 },
                    transition: SPRING_REVEAL,
                  })
                : {
                    custom: richtung,
                    variants: schrittVarianten(reduzierteBewegung),
                    initial: 'eintritt',
                    animate: 'mitte',
                    exit: 'austritt',
                    transition: reduzierteBewegung ? { duration: 0.15 } : { duration: 0.32, ease: 'easeOut' },
                  })}
            >
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
                      Bitte gültige Min-/Max-Werte eingeben (beide größer als 0, Min kleiner als Max).
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
                        <TagesplanMahlzeitenFilter
                          ausgewaehlt={tagesplanMahlzeiten}
                          onAendern={onTagesplanMahlzeitenAendern}
                          layout="raster2x2"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Mahlzeit</h2>
                      <p className="mt-1 text-xs text-text-muted">Womit soll es losgehen? Das lässt sich später jederzeit ändern.</p>
                      <div className="mt-3">
                        <MahlzeitFilter aktuell={mahlzeit} onAendern={onMahlzeitAendern} layout="raster2x2" />
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

              {schritt === 4 && (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <AnimatedButton
                      type="button"
                      onClick={() => onAbschluss('haupt')}
                      className="flex flex-1 flex-col items-start gap-2 rounded-2xl border border-secondary/20 bg-card p-6 text-left shadow-sm"
                    >
                      <IconDice5 size={32} stroke={1.75} className="text-primary" />
                      <h2 className="font-display text-xl font-semibold text-text">Würfeln</h2>
                      <p className="text-sm text-text-muted">
                        Eine einzelne Zutaten-Kombination für deine nächste Mahlzeit auswürfeln.
                      </p>
                    </AnimatedButton>

                    <AnimatedButton
                      type="button"
                      onClick={() => onAbschluss('rezepte')}
                      className="flex flex-1 flex-col items-start gap-2 rounded-2xl border border-secondary/20 bg-card p-6 text-left shadow-sm"
                    >
                      <IconBook2 size={32} stroke={1.75} className="text-primary" />
                      <h2 className="font-display text-xl font-semibold text-text">Rezepte</h2>
                      <p className="text-sm text-text-muted">
                        Fertige, kuratierte Rezept-Ideen zum Durchstöbern.
                      </p>
                    </AnimatedButton>
                  </div>

                  <p className="mt-4 text-center text-xs text-text-muted">
                    Du kannst jederzeit zwischen beiden wechseln.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {schritt <= 3 && (
        <div className="px-6 pb-8 pt-4">
          <WizardTageskarte
            schritt={schritt}
            ziel={ziel}
            mahlzeit={mahlzeit}
            tagesplanMahlzeiten={tagesplanMahlzeiten}
            proTag={proTag}
            diaeten={diaeten}
            reduzierteBewegung={reduzierteBewegung}
          />

          <div className="mt-6">
            <AnimatedButton
              type="button"
              onClick={weiterKlicken}
              disabled={(schritt === 1 && !zielGueltig) || (schritt === 3 && !diaetGueltig)}
              className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Weiter
            </AnimatedButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default OnboardingWizard
