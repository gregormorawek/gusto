import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconBook2, IconChevronRight, IconDice5 } from '@tabler/icons-react'
import ZielEinstellungen from './ZielEinstellungen'
import MahlzeitFilter from './MahlzeitFilter'
import DiaetFilter from './DiaetFilter'
import TagesplanMahlzeitenFilter from './TagesplanMahlzeitenFilter'
import WizardTageskarte from './WizardTageskarte'
import AnimatedButton from './AnimatedButton'
import DampfSchuesselIllustration from './DampfSchuesselIllustration'
import Kalorienrechner from './Kalorienrechner'
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

  // Ob der optionale Kalorienrechner-Wizard (Kalorienrechner.jsx) gerade
  // ueber Schritt 1 geoeffnet ist. BEWUSST hier auf OnboardingWizard-Ebene
  // statt lokal in ZielEinstellungen.jsx, damit Kalorienrechner (fixed
  // inset-0) als GESCHWISTER der schritt-1-Content-Motion.div gerendert
  // werden kann, nicht als deren Nachfahre - andernfalls wuerde das dortige
  // per Framer Motion gesetzte inline transform (x-Slide beim
  // Schritt-Wechsel, siehe schrittVarianten oben) einen neuen Containing-
  // Block-Kontext fuer alle fixed-Nachfahren erzeugen und den Rechner damit
  // NICHT mehr am tatsaechlichen Viewport, sondern an dieser Motion.div
  // positionieren (siehe identisches Problem/geloest fuer KochModus in
  // App.jsx, dortiger naechsteAnsichtRef-Kommentar).
  const [kalorienrechnerOffen, setKalorienrechnerOffen] = useState(false)

  // Zaehler statt Boolean: wird bei JEDEM "Selbst anpassen"-Tap hochgezaehlt
  // (siehe kalorienrechnerUebernehmen unten) und unveraendert als Prop an
  // ZielEinstellungen durchgereicht. Ein Boolean wuerde bei zwei
  // aufeinanderfolgenden "Selbst anpassen"-Taps (Rechner erneut oeffnen,
  // wieder "Selbst anpassen") beim zweiten Mal nicht von true auf true
  // wechseln - der useEffect in ZielEinstellungen, der daran das Min-Feld
  // fokussiert, wuerde dann nicht erneut feuern. Ein monoton steigender Wert
  // aendert sich dagegen garantiert bei jedem Tap.
  const [minFeldFokusZaehler, setMinFeldFokusZaehler] = useState(0)

  // Uebernimmt das Ergebnis des Kalorienrechners (siehe Kalorienrechner.jsx)
  // in genau die Setter, die Schritt 1 (ZielEinstellungen) ohnehin schon
  // bekommt - kein eigenes/neues State-System. Setzt IMMER auf "proTag" (der
  // Rechner ist nur dafuer da), schliesst danach den Rechner, und erhoeht bei
  // fokussieren:true zusaetzlich den Fokus-Zaehler fuer das Min-Feld (siehe
  // oben) - fuer den "Werte uebernehmen"-Pfad passiert das nicht, dort
  // reicht das stumme Eintragen.
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
    // h-dvh statt min-h-dvh - GEFUNDENE URSACHE dafuer, dass die Seite trotz
    // "kein Scrollen auf dem Handy"-Prinzip scrollbar wurde: min-h-dvh ist
    // nur eine MINDESTHOEHE, kein Deckel - wenn die Summe aus Header (durch
    // min-h-[80px] am Titel-Block, siehe dortiger Kommentar), Footer (natuerliche
    // Kartenhoehe) und Frage-Bereich zusammen mehr Platz braucht als der
    // Viewport hergibt, wuchs die GESAMTE Seite bisher einfach darueber
    // hinaus, statt dass min-h-0/overflow-hidden am Frage-Bereich (flex-1)
    // wie beabsichtigt greifen konnte - diese beiden Eigenschaften wirken
    // nur, wenn der FLEX-CONTAINER selbst eine DEFINITE (nicht nur minimale)
    // Hoehe hat, aus der die Flexbox-Rechnung ableiten kann, wie viel Platz
    // "uebrig" ist. Per Messung konkret nachgewiesen: scrollHeight 849px bei
    // innerHeight 812px, ein Ueberschuss von 37px bei Schritt 3 (Header
    // 202px + Footer 329px + Frage-Bereich-Inhalt zusammen). h-dvh gibt dem
    // Wurzel-Container stattdessen eine FESTE Hoehe exakt in Viewport-Groesse
    // - der flex-1-Frage-Bereich bekommt dadurch eine echte, definite
    // "Rest-Hoehe" zugewiesen und schneidet ueberschuessigen Inhalt per
    // overflow-hidden intern ab, statt die ganze Seite wachsen zu lassen.
    <div className="flex h-dvh flex-col bg-bg">
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
            opacity aus/ein, exakt synchron mit dem Titel-Crossfade darunter.

            motion.div mit animate-Prop statt einer reinen CSS
            transition-opacity - GEFUNDENE URSACHE dafuer, dass der Balken
            beim Uebergang 3->4 sichtbar NACHGELAGERT verblasste statt
            synchron mit dem Titel: per getComputedStyle()-Serie (10 rAF-
            Frames nach dem Klick) hart nachgewiesen, dass balkenOpacity bei
            t+12ms noch unveraendert bei 1.000 stand, WAEHREND der Titel-
            Crossfade (framer-motion) zur selben Zeit schon bei 13% angekommen
            war - der Balken bewegte sich ueberhaupt erst ab ca. t+25ms. Eine
            reine CSS transition-opacity startet ueber den Style-Recalc-
            Zyklus des Browsers, waehrend framer-motion ueber einen eigenen,
            JS-/requestAnimationFrame-gesteuerten Scheduler animiert - zwei
            unterschiedliche Startzeitpunkte fuer denselben React-Commit.
            motion.div mit animate={{opacity}} nutzt denselben Scheduler wie
            der Titel-Crossfade darunter (identische TITEL_TRANSITION), beide
            starten dadurch garantiert im selben Frame. */}
        <motion.div
          className="mt-6 flex gap-1.5"
          animate={{ opacity: schritt <= 3 ? 1 : 0 }}
          transition={reduzierteBewegung ? { duration: 0.15 } : TITEL_TRANSITION}
        >
          {[1, 2, 3].map((s) => (
            <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-text-muted/20">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
                style={{ width: s <= schritt ? '100%' : '0%' }}
              />
            </span>
          ))}
        </motion.div>

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
            etablierte finale Snap beim Entfernen des alten Titels.

            min-h-[80px] - GEFUNDENE URSACHE des LETZTEN verbleibenden
            Sprungs, der beim Wechsel "Alles bereit"->Schritt 3 auffiel (bei
            SCHMALEM Viewport reproduziert, 375x812 - bei zu grossem Viewport
            im Test zuvor nicht sichtbar/messbar gewesen). Per Layout-
            Instability-API (PerformanceObserver "layout-shift", praeziser
            als manuelles getBoundingClientRect()-Polling) hart nachgewiesen:
            der Frage-Bereich-Container zeigt bei diesem Uebergang GENAU
            EINEN Shift (top 202px->178px, Hoehe bleibt konstant 428px) -
            kein "erst zu tief, dann Sprung"-Doppelmuster, sondern ein reiner,
            unanimierter Sprung der VERTIKALEN POSITION. Urspruengliche Ursache:
            Schritt-4-Titel ("Alles bereit!" + Subtext, damals mt-8/mt-2) war
            per Messung 104px hoch, Schritt-<=3-Titel ("Schritt X von 3" +
            Ueberschrift, mt-5/mt-1) nur 80px - der Grid-Stack oben verhindert
            zwar die FRUEHERE Doppel-Sprung-Variante (Luecke waehrend
            mode="wait"), aber sobald der alte (kuerzere ODER laengere) Titel
            entfernt wird, sized sich DIESER Grid-Stack selbst auf seine neue
            Zielhoehe - der 24px-Hoehenunterschied im Header verschob daher
            IMMER den gesamten darunterliegenden Frage-Bereich samt Footer, in
            BEIDE Richtungen (3->4 UND 4->3 gleichermassen).

            NACHTRAG (Nebenwirkungs-Bugfix "PROBLEM 1"): min-h-[104px] behob
            zwar den Sprung, kostete aber 24px permanent reservierten Platz
            auf JEDEM Schritt - bei knappem Viewport (375x812, Schritt 3 MIT
            leerer Diaet-Auswahl, also dem "Bitte eine Option auswaehlen"-
            Hinweistext sichtbar - der PRIMAERE Erstbesuch-Fall, nicht etwa
            ein Sonderfall) reichte der verbleibende Platz im flex-1-Frage-
            Bereich dadurch nicht mehr aus (234px verfuegbar vs. 310px
            benoetigt) - der Hinweistext wurde von h-full/overflow-hidden
            (siehe Kommentar dort zu "PROBLEM 2") unsichtbar abgeschnitten,
            statt (wie vor dem h-dvh-Fix) wenigstens per Scroll erreichbar zu
            sein - eine Verschlechterung. Fix: schritt4s Titel-Abstaende auf
            mt-5/mt-1 verkleinert (identisch zu Schritt <=3s eigenen Werten,
            siehe JSX unten) - dadurch ist die NATUERLICHE Hoehe beider
            Varianten jetzt IDENTISCH bei 80px (per direkter Kind-Element-
            Messung bestaetigt, nicht per scrollHeight - CSS-Grids
            align-items:stretch stretcht das Kind sonst auf die Zeilenhoehe
            und taeuscht scrollHeight vor). min-h-[80px] reserviert dadurch
            keinen einzigen ungenutzten Pixel mehr, behebt den Sprung aber
            weiterhin genauso zuverlaessig, da beide Varianten nun exakt
            gleich hoch sind.

            NACHTRAG 2 (Bugfix "Wizard-Uebergaenge, siebter Versuch",
            Problem 2): trotz identischer mt-5/mt-1-Abstaende blieb ein
            kleinerer, aber weiterhin messbarer 8px-Sprung beim Uebergang
            4->3 (headerBottom 186px->178px) bestehen - GEFUNDENE URSACHE per
            direkter Kind-Element-Messung (h1/p-Rects statt der vom
            Grid-align-items:stretch verzerrten Wrapper-Hoehe, die faelschlich
            fuer beide Varianten identisch 88px zeigte): Schritt-4s
            Untertitel "Wie möchtest du starten?" (reines p, keine
            Groessen-Klasse) rendert in font-sans-Standardgroesse
            (16px/leading-normal = 24px Zeilenhoehe), waehrend Schritt-<=3s
            Eyebrow-Label "Schritt X von 3" per text-xs NUR 16px Zeilenhoehe
            hat (12px/leading-4) - ein 8px-Unterschied genau in DIESER einen
            Zeile, unabhaengig von den (korrekten) mt-5/mt-1-Aussenabstaenden.
            leading-4 (identische 16px Zeilenhoehe wie text-xs) auf dem
            Untertitel behebt den Rest-Sprung, OHNE dessen Schriftgroesse
            (bewusst weiterhin gut lesbare 16px statt 12px, passend zum
            freundlicheren Ton dieser Abschluss-Zeile) zu aendern - per
            Screenshot bei 375x812 gegengeprueft: kein sichtbares Clipping
            der Umlaute/Unterlaengen bei 16px Schrift in 16px Zeilenhoehe. */}
        <div className="grid min-h-[80px]">
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
                  <h1 className="mt-5 font-display text-4xl font-semibold text-text sm:text-5xl">Alles bereit!</h1>
                  <p className="mt-1 leading-4 text-text-muted">Wie möchtest du starten?</p>
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
            konkret beobachteten Bug nicht die Ursache war.

            h-full overflow-hidden HIER ZUSAETZLICH (nicht nur am aeusseren
            Flex-Container) - GEFUNDENE URSACHE dafuer, dass die sticky
            Kalorien-Karte beim Uebergang 3->2 kurzzeitig die Mahlzeit-
            Optionen ueberdeckte: getBoundingClientRect() zeigte den
            aeusseren Flex-Container (mit overflow-hidden, Hoehe seit dem
            h-dvh-Fix jetzt definit statt nur minimal) korrekt bei
            outerBottom=484px geclippt, WAEHREND dieses .grid-Element
            selbst per Layout-Box (CSS Grid sized sich per Definition auf
            seinen Inhalt, unabhaengig vom verfuegbaren Platz im Elternteil)
            weiterhin bis 528px reichte (44px Ueberhang) - overflow-hidden
            auf dem AEUSSEREN Container allein reichte nicht: es clippt
            zuverlaessig, WAS ausserhalb SEINER EIGENEN Box liegt, aber ein
            zu grosses DIREKTES Kind clippt dadurch nicht automatisch SICH
            SELBST - das Kind bleibt als eigene Box 528px hoch, nur der
            sichtbare Ausschnitt in den Eltern-Grenzen war geclippt, waehrend
            transformierte Nachfahren (framer-motion animiert per transform:
            translateX/opacity, siehe schrittVarianten oben) auf eigenen
            Compositing-Layern in der Praxis dennoch teilweise sichtbar
            blieben. Per Screenshot-Serie visuell bestaetigt: die Mahlzeiten-
            Chips ragten sichtbar in die darunterliegende Kalorien-Karte
            hinein. h-full zwingt dieses .grid-Element auf GENAU die Hoehe
            des jetzt definiten Eltern-Containers (statt sich per Inhalt
            selbst hochzuziehen), overflow-hidden DIREKT hier etabliert eine
            eigene, garantiert wirksame Clip-Grenze an GENAU dieser Hoehe -
            das Kollisionsrisiko mit dem Footer ist dadurch strukturell
            ausgeschlossen, unabhaengig von Compositing-Feinheiten. */}
        <div className="grid h-full grid-cols-1 overflow-hidden">
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
                    onKalorienrechnerOeffnen={() => setKalorienrechnerOffen(true)}
                    minFeldFokusZaehler={minFeldFokusZaehler}
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
                  {/* p-3 statt Schritt 2s p-6 - Platzbudget-Anpassung
                      (Redesign "Chips volle Breite"): die vier gestapelten
                      Ernaehrungsform-Chips brauchen spuerbar mehr Hoehe als
                      das fruehere 2+1-umbrechende Layout. Per Messung bei
                      375x700 nachgewiesen: mit p-6 (unveraendertem Chip-
                      Padding) 48.5px Ueberhang (vierte Chip "Keine
                      Einschraenkung" wurde vom overflow-hidden-Frage-Bereich
                      abgeschnitten) - selbst NACH Reduktion auf p-4 plus
                      kompakterem Chip-Innenabstand (siehe AuswahlChip.jsx
                      'breit'/DiaetFilter.jsx-Gap) blieben noch -10.5px
                      Ueberhang. Erst diese Kombination aus mehreren, bewusst
                      VERTEILTEN Reduktionen (Karten-Padding UND Chip-
                      Innenabstand UND Chip-Zwischenabstand - keine einzelne
                      Stelle traegt die gesamte Last) schafft wieder positiven
                      Puffer (per Nachmessung ~23px bei 375x700). Bewusst NUR
                      hier reduziert (nicht an Schritt 2s Karte, siehe
                      Aufgabenstellung "Mahlzeiten-Chips ... bleibt
                      unangetastet") - der dadurch leicht abweichende
                      Innenabstand zwischen Schritt 2 und 3 ist der bewusst in
                      Kauf genommene Trade-off, um das Clipping OHNE
                      Aufbrechen der bereits geloesten h-dvh/min-h-0/sticky-
                      Struktur zu beheben. */}
                  <section className="mx-4 rounded-2xl border border-secondary/20 bg-card p-3 shadow-sm">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Ernährungsform</h2>
                    <div className="mt-2">
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
                  <DampfSchuesselIllustration
                    reduzierteBewegung={reduzierteBewegung}
                    className="mx-auto mb-5 h-auto w-[130px]"
                  />

                  <div className="flex flex-col gap-3">
                    <AnimatedButton
                      type="button"
                      onClick={() => onAbschluss('haupt')}
                      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-secondary/20 bg-card py-5 pl-6 pr-4 text-left shadow-sm"
                    >
                      <span className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden="true" />
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <IconDice5 size={26} stroke={1.75} className="text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <h2 className="font-display text-lg font-semibold text-text">Würfeln</h2>
                        <p className="mt-0.5 text-sm text-text-muted">
                          Eine einzelne Zutaten-Kombination für deine nächste Mahlzeit auswürfeln.
                        </p>
                      </span>
                      <IconChevronRight size={20} stroke={1.75} className="shrink-0 text-text-muted" />
                    </AnimatedButton>

                    <AnimatedButton
                      type="button"
                      onClick={() => onAbschluss('rezepte')}
                      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-secondary/20 bg-card py-5 pl-6 pr-4 text-left shadow-sm"
                    >
                      <span className="absolute inset-y-0 left-0 w-1.5 bg-secondary" aria-hidden="true" />
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                        <IconBook2 size={26} stroke={1.75} className="text-secondary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <h2 className="font-display text-lg font-semibold text-text">Rezepte</h2>
                        <p className="mt-0.5 text-sm text-text-muted">
                          Fertige, kuratierte Rezept-Ideen zum Durchstöbern.
                        </p>
                      </span>
                      <IconChevronRight size={20} stroke={1.75} className="shrink-0 text-text-muted" />
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
          durchgehend, kann also nie mehr "frisch" etabliert werden muessen.

          pb-2/pt-1 (statt urspruenglich pb-8/pt-4) + mt-1 am Karte-Button-
          Abstand unten - GEFUNDENE URSACHE (Nebenwirkung des h-dvh- und
          min-h-[80px]-Fixes, siehe dortige Kommentare zu "PROBLEM 1"): bei
          schmalem+niedrigem Viewport (375x812) MIT leerer Diaet-Auswahl
          (der PRIMAERE Erstbesuch-Fall, nicht etwa ein Sonderfall - jeder
          neue Nutzer hat diaeten=[] beim ersten Durchlauf) reichte der
          verfuegbare Platz im flex-1-Frage-Bereich selbst nach Ausschoepfen
          der Titel-Reservierung nicht aus, um Ernaehrungsform-Karte UND den
          "Bitte eine Option auswaehlen"-Hinweis UND die Kalorien-Karte UND
          den Button gleichzeitig ohne Clipping zu zeigen (Defizit per
          Messung: 52px). Nach Ruecksprache gezielt auf mehrere Abstaende
          verteilt reduziert (nicht an einer einzigen Stelle konzentriert),
          bewusst NUR im Wizard-eigenen Footer-Container - WizardTageskarte.jsx
          selbst (dort auch ausserhalb des Wizards wiederverwendet) bleibt
          unangetastet. Per Screenshot-Vergleich bei 375x812 (knapp, jetzt
          alles sichtbar) und 390x844 (mehr Platz, wirkt nicht gedraengt)
          gegengeprueft. */}
      <div className="sticky bottom-0 z-10 bg-bg px-6 pb-2 pt-1">
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

            <div className="mt-1">
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

      {/* Ausserhalb aller x-transform-animierten Motion.divs gerendert -
          siehe kalorienrechnerOffen-Kommentar oben zur Begruendung. */}
      <Kalorienrechner
        offen={kalorienrechnerOffen}
        onSchliessen={() => setKalorienrechnerOffen(false)}
        onUebernehmen={kalorienrechnerUebernehmen}
      />
    </div>
  )
}

export default OnboardingWizard
