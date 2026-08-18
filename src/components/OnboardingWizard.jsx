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

        {/* IMMER gerendert (statt {schritt <= 3 && (...)}) - GEFUNDENE
            URSACHE (eine von zwei) des Ruckelns bei 3<->"Alles bereit"
            (Schritt 4): ohne Platzhalter verschwand dieser Block beim
            Erreichen von Schritt 4 SOFORT und unanimiert aus dem Header,
            wodurch der Header augenblicklich ca. 30px kuerzer wurde - das
            verschob den darunterliegenden, per justify-start verankerten
            Frage-Bereich (und damit z. B. die Wuerfeln/Rezepte-Karten)
            sofort mit nach oben, obwohl deren EIGENER Crossfade noch lief.
            Per getBoundingClientRect()-Serie hart nachgewiesen: headerBottom
            sprang exakt beim Klick von 178px auf 148px (30px, synchron mit
            gridTop 202px->172px). Fix: der Block bleibt strukturell IMMER
            vorhanden (reserviert seine Hoehe durchgehend, wie der Zurueck-
            Button-Platzhalter oben) - nur seine Sichtbarkeit blendet per
            opacity aus/ein, exakt synchron mit dem Titel-Crossfade darunter. */}
        <div
          className="mt-6 flex gap-1.5 transition-opacity motion-reduce:transition-none"
          style={{ opacity: schritt <= 3 ? 1 : 0, transitionDuration: `${TITEL_TRANSITION.duration * 1000}ms` }}
        >
          {[1, 2, 3].map((s) => (
            <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-text-muted/20">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
                style={{ width: s <= schritt ? '100%' : '0%' }}
              />
            </span>
          ))}
        </div>

        {/* Titel-Block per Grid-Stack ueberlappend gecrossfadet (identisches
            Muster wie der Frage-Bereich/RezeptKarte.jsx) - GEFUNDENE URSACHE
            (die zweite von zwei) desselben 3<->4-Ruckelns: das vorherige
            mode="wait" zeigt altes und neues NIE gleichzeitig, sondern
            raeumt das alte ERST vollstaendig weg (inkl. dessen Layout-Hoehe),
            bevor das neue ueberhaupt montiert wird - dazwischen liegt eine
            kurze Luecke, in der der Titel-Block GAR KEINEN Inhalt (und damit
            keine Hoehe) hat, bevor er auf die neue Zielgroesse springt. Per
            getBoundingClientRect()-Serie hart nachgewiesen: headerBottom
            sprang ~140ms nach dem ersten (Fortschrittsbalken-)Sprung ein
            ZWEITES Mal, von 148px auf 172px (gridTop 172px->196px) - exakt
            zeitlich passend zum mode="wait"-Wechsel. Mit dem Grid-Stack
            liegen altes+neues Titel-Motion.div stattdessen (wie beim Frage-
            Bereich) uebereinander in derselben Zelle, der Header sized sich
            waehrend der Ueberlappung auf die groessere der beiden Hoehen -
            kein Nullpunkt-Sprung mehr dazwischen, nur noch der eine bereits
            etablierte finale Snap beim Entfernen des alten Titels (siehe
            Kommentar zum Frage-Bereich oben zu genau diesem, akzeptierten
            Restverhalten). */}
        <div className="grid">
          <AnimatePresence initial={false}>
            <motion.div
              key={schritt}
              className="col-start-1 row-start-1"
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
        </div>
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
          dieses flex-1-Containers liegen.

          min-h-0 - GEFUNDENE URSACHE dafuer, dass die untere Karte +
          "Weiter"-Button bei JEDEM Schritt-Wechsel kurz nach unten sprangen
          und danach wieder zurueck nach oben schnappten: Flex-Items haben
          per CSS-Spezifikation einen IMPLIZITEN min-height:auto (nicht 0)
          entlang der Hauptachse - das bedeutet, dieses flex-1-Element darf
          NIE kleiner werden als der eigene INHALT es verlangt, selbst wenn
          overflow-hidden gesetzt ist (overflow-hidden schneidet nur sichtbar
          ab, verhindert aber nicht, dass die Box SELBST waechst). Waehrend
          der Crossfade-Ueberlappung ist der Inhalt dieses Bereichs (die
          Grid-Stack-Zeile, die sich auf die Vereinigung aus altem+neuem
          Schritt sized) kurzzeitig HOEHER als der eigentlich verfuegbare
          Platz - ohne min-h-0 wuchs deshalb NICHT nur diese Box, sondern
          die GESAMTE Seite (min-h-dvh ist nur eine Mindesthoehe, kein
          Deckel) ueber die Viewport-Hoehe hinaus, was den darunter als
          naechstes Flex-Geschwister folgenden Footer (Karte + Button)
          zeitweise nach unten schob - und wieder zurueck, sobald der alte
          Schritt-Inhalt am Ende des Crossfades entfernt wird und die Zeile
          auf ihre normale Hoehe zurueckschrumpft. Per getBoundingClientRect()-
          Serie hart nachgewiesen: btnTop sprang exakt beim Klick von 756px
          auf 780px (24px, synchron mit document.documentElement.scrollHeight
          844px->868px) und zurueck auf 756px, sobald gridHeight von 390px
          auf 302px fiel. min-h-0 hebt den impliziten min-height:auto auf -
          das Element darf jetzt tatsaechlich auf seine zugewiesene flex-1-
          Groesse schrumpfen, das kurzzeitig zu hohe Grid-Stack-Overlay wird
          von overflow-hidden dann wie beabsichtigt intern abgeschnitten
          statt die gesamte Seite (und damit den Footer) zu verschieben. */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-start overflow-hidden px-6 py-6">
        {/* grid-cols-1 (statt der impliziten grid-template-columns:none-
            Voreinstellung, die eine einzelne auto-sized Spalte ergibt) -
            urspruengliche (FALSIFIZIERTE) Hypothese fuer den Breiten-Sprung
            beim Schritt-Wechsel war eine inhaltsbasierte auto-Spaltenbreite.
            Per getBoundingClientRect()-Vergleich widerlegt: NICHT nur
            ".grid" wurde schmaler (342px->327px), sondern der GESAMTE
            aeussere Flex-Container UND document.documentElement.clientWidth
            gleichermassen (390px->375px, exakt 15px) - synchron mit
            document.documentElement.scrollHeight, das kurzzeitig ueber
            window.innerHeight hinausschoss. Tatsaechliche Ursache: eine
            waehrend der Crossfade-Ueberlappung kurzzeitig auftauchende
            vertikale Scrollbar (siehe scrollbar-gutter:stable-Fix in
            index.css) - behoben dort, nicht hier. grid-cols-1 bleibt
            trotzdem bestehen, als zusaetzliche, unabhaengige Haertung:
            macht die Spalte explizit minmax(0,1fr) (containerbreitenbasiert)
            statt auto (inhaltsbasiert) - beide gestapelten Schritte liegen
            dadurch garantiert deckungsgleich in Breite UND Position,
            unabhaengig vom jeweiligen Inhalt, auch wenn das fuer den
            konkret beobachteten Bug nicht die Ursache war. */}
        <div className="grid grid-cols-1">
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

      {/* sticky bottom-0 statt normaler Dokumentfluss - GEFUNDENE URSACHE
          dafuer, dass Karte + "Weiter"-Button bei JEDEM Schritt-Wechsel
          kurz nach unten sprangen und danach zurueckschnappten (min-h-0 am
          Frage-Bereich oben behebt nur EINEN von ZWEI unabhaengigen
          Beitraegen zu diesem Bug - dieser hier ist der zweite, staerkere).
          WizardTageskarte hat seit dem Clipping-Bugfix (Entfernen von
          useBeobachteteHoehe/wachstumBeimMount, siehe dortiger Kommentar in
          WizardTageskarte.jsx) KEINE Wachstums-Animation beim allerersten
          Erscheinen mehr - sie erscheint bei Schritt 1->2 SOFORT in voller
          Hoehe, synchron mit dem React-State-Update, WAEHREND der unabhaengig
          getimte obere Crossfade noch ca. 330ms lang den ALTEN (hoeheren)
          Schritt-1-Inhalt zusaetzlich zum neuen zeigt (Grid-Stack-
          Ueberlappung). Beide Effekte addieren sich: die Seite braucht
          waehrend dieses Fensters kurzzeitig MEHR Hoehe als der Viewport
          hergibt, wodurch der Footer (der bisher ganz normal im
          Dokumentfluss NACH dem Frage-Bereich sitzt) nach unten geschoben
          wird - und zurueckschnappt, sobald der Crossfade abschliesst und
          der alte Inhalt entfernt wird. Per getBoundingClientRect()-Serie
          hart nachgewiesen: btnTop 756px->780px->756px, synchron mit
          document.documentElement.scrollHeight 844px->868px->844px.
          sticky bottom-0 (exaktes Gegenstueck zum bereits bewaehrten sticky
          top-0 am Header oben) loest das strukturell: sobald der Footer
          wegen zu hohem Inhalt darueber unter den sichtbaren Viewport-
          Bereich rutschen wuerde, "klebt" er stattdessen an der Viewport-
          Unterkante fest, GENAU an der Position, an der er nach Abschluss
          des Uebergangs ohnehin natuerlich zu liegen kommt (das Layout
          passt nach Abschluss des Crossfades wieder in den Viewport) -
          dadurch faellt die sichtbare Vertikalbewegung praktisch komplett
          weg, statt nur schneller/langsamer zu sein. z-10 + bg-bg wie beim
          Header, damit der darunter befindliche Inhalt beim Ueberlappen
          nicht sichtbar durchscheint.

          Dieser Wrapper selbst ist jetzt IMMER gemountet (statt vorher
          {schritt <= 3 && (...)} um das ganze sticky-Element herum) -
          GEFUNDENE URSACHE (per Ausschlussverfahren, da direkt per
          getBoundingClientRect()-Serie in Chromium nicht reproduzierbar -
          vermutlich eine WebKit/Safari-spezifische Eigenheit bei einem
          FRISCH gemounteten position:sticky-Element) des letzten
          verbleibenden Sprungs beim Uebergang "Alles bereit"->Schritt 3:
          dieser sticky-Wrapper existierte auf Schritt 4 bisher GAR NICHT
          (kein Footer dort) und wurde beim Zurueck-Wechsel zu Schritt 3
          FRISCH neu erzeugt - ein neu eingefuegtes sticky-Element muss
          seinen "angeklebten" Zustand erst on-the-fly etablieren, was in
          Safari nachweislich (siehe frueherer Bugfix-Kontext zu sticky-
          Positionierung) einen Frame lang verzoegert reagieren kann,
          waehrenddessen es kurzzeitig an seiner normalen Dokumentfluss-
          Position (statt der Viewport-Unterkante) erscheint - sichtbar als
          "Karte startet zu tief, snappt dann nach oben". Alle ANDEREN
          Uebergaenge (1->2, 2->3, 3->2, 3->4) betrifft das nicht, da der
          sticky-Wrapper dort bereits durchgehend existiert und nur seine
          Kinder sich aendern/resizen, nie neu gemountet wird. Fix: exakt
          dasselbe Muster wie beim Fortschrittsbalken oben (siehe dortiger
          Kommentar) - der sticky-Container bleibt strukturell IMMER
          bestehen, nur sein INHALT wird fuer Schritt 4 weggelassen. Der
          sticky-Kontext existiert dadurch bereits VOR jedem Schritt-Wechsel
          durchgehend, kann also nie mehr "frisch" etabliert werden muessen. */}
      <div className="sticky bottom-0 z-10 bg-bg px-6 pb-8 pt-4">
        {schritt <= 3 && (
          <>
            {/* ERSTER Versuch fuer das Kartenhoehen-Problem (nicht dieses
                hier) war ein Grid-Stack mit key={schritt} um WizardTageskarte
                (analog zum Frage-Bereich/RezeptKarte.jsx) - per eigener
                Verifikation SOFORT wieder verworfen: key={schritt} erzwingt
                bei JEDEM Schritt-Wechsel einen kompletten Neu-Mount der
                Karte, wodurch auch AnimierteZahl (siehe dortiger Kommentar -
                haelt ihren zuletzt gezeigten Wert bewusst in einem Ref fest,
                damit ein Wertwechsel smooth vom ALTEN zum NEUEN Wert
                hochzaehlt statt jedes Mal neu bei 0 anzusetzen) bei jedem
                Schritt-Wechsel neu montiert wurde - die Kalorien-/Makro-
                Zahlen zaehlten dadurch REGRESSIV jedes Mal neu von 0 hoch
                statt vom vorherigen Wert weiterzuzaehlen. Fix stattdessen in
                WizardTageskarte.jsx selbst (useBeobachteteHoehe erneut
                aktiviert) - siehe dortiger Kommentar zur Herleitung. Diese
                Stelle bleibt bewusst eine EINZIGE, durchgehend gemountete
                WizardTageskarte-Instanz (kein key, kein Grid-Stack hier). */}
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
          </>
        )}
      </div>
    </div>
  )
}

export default OnboardingWizard
