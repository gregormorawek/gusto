import { useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import {
  IconCheck,
  IconChevronRight,
  IconPhotoOff,
  IconPlus,
  IconShoppingCart,
  IconToolsKitchen2,
  IconTrash,
} from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import AnimierteZahl from './AnimierteZahl'
import { aktiveMahlzeitenFuer } from '../mahlzeiten'
import { rezeptKarteDaten } from '../rezeptKarteDaten'
import { FADE_UEBERGANG, motionPropsFuer, SPRING_REVEAL, transitionFuer } from '../motionConfig'

// Reines Fade fuer den Inhaltswechsel EINER TagZeile (Platzhalter <-> echtes
// Rezept) - siehe TagZeile weiter unten fuer den Kontext. Kurz und dezent,
// kein Bewegungsversatz (das wuerde bei einer schmalen Listenzeile eher
// unruhig als hochwertig wirken).
const ZEILEN_INHALT_FADE = { duration: 0.22, ease: 'easeOut' }

// Wie breit der "Entfernen"-Button hinter einer befuellten Zeile ist, wenn
// man nach links wischt (natives iOS-Listenzeilen-Muster statt eines
// dauerhaft sichtbaren X an jeder Zeile, siehe Aufgabenstellung) - wird per
// dragConstraints unten als maximale Zieh-Distanz genutzt.
const ENTFERNEN_BREITE_PX = 96
// Ab welchem Anteil dieses Wegs beim Loslassen "offen bleiben" statt
// "zurueckschnappen" gilt - Haelfte der Zieh-Distanz, analog zu jeder
// anderen Swipe-Schwelle in der App (siehe z. B. SWIPE_SCHWELLE_PX in
// RezeptSchwipKarte.jsx).
const ENTFERNEN_OEFFNEN_SCHWELLE_PX = ENTFERNEN_BREITE_PX / 2

// Befuellte Mahlzeit-Zeile: horizontale Wisch-nach-links-Geste legt einen
// "Entfernen"-Button dahinter frei. Ein reiner Tap OHNE Zieh-Bewegung
// oeffnet stattdessen den Kochmodus (siehe onOeffnen-Verwendungsstelle in
// TagZeile/TagAnsicht weiter unten) - dieselbe Geste wie ein Tap auf die
// Swipe-Karte selbst (siehe RezeptSchwipKarte.jsx). War die Zeile bereits
// offen (Entfernen-Button sichtbar), schliesst ein weiterer Tap sie nur
// wieder, statt den Kochmodus zu oeffnen - Standard-iOS-Verhalten: "woanders
// hintippen, waehrend eine Wisch-Aktion offen ist" bedeutet abbrechen, nicht
// die eigentliche Zeilen-Aktion ausloesen.
//
// TAP-VS-DRAG-WARNUNG (bewusst hier dokumentiert, nicht nur in
// RezeptSchwipKarte.jsx): exakt dieselbe Fehlerklasse wie die mehrtaegige
// Regression auf der Rezept-Swipe-Karte (siehe CLAUDE.md-Bugfix-Historie)
// kann bei JEDER Kombination aus drag + Framers eigenem onTap auf demselben
// Element auftreten - Framer Motions interne Tap-vs-Drag-Unterdrueckung
// verliert nachweislich ein internes Listener-Wettrennen dabei. Deshalb von
// Anfang an dieselbe, bereits verifizierte Loesung statt eines neuen
// Versuchs mit Framers interner Arbitrierung: istAmZiehenRef wird bei jedem
// Pointerdown zurueckgesetzt und von onDragStart (feuert erst NACH Framers
// eigener 3px-Erkennungsschwelle, also nur bei einer echten Zieh-Bewegung)
// auf true gesetzt - onTap prueft ihn zuerst, bevor irgendeine Aktion
// ausgeloest wird.
function TagZeileBefuellt({ label, rezept, karte, onOeffnen, onEntfernen }) {
  const x = useMotionValue(0)
  const istAmZiehenRef = useRef(false)
  const [offen, setOffen] = useState(false)

  function schliessen() {
    animate(x, 0, SPRING_REVEAL)
    setOffen(false)
  }

  // Entscheidung anhand der TATSAECHLICHEN Endposition (nicht der
  // Zug-Richtung) - funktioniert dadurch unabhaengig davon, ob die Geste
  // beim Oeffnen oder beim (teilweisen) Wieder-Schliessen endet.
  function handleDragEnd() {
    const sollOffenBleiben = x.get() < -ENTFERNEN_OEFFNEN_SCHWELLE_PX
    animate(x, sollOffenBleiben ? -ENTFERNEN_BREITE_PX : 0, SPRING_REVEAL)
    setOffen(sollOffenBleiben)
  }

  return (
    // GEFUNDENER DARSTELLUNGSFEHLER (Real-Device-Feedback, per Messung
    // bestaetigt): im Ruhezustand deckt sich die Geometrie von Karte und
    // Entfernen-Button exakt (beide 82px hoch, rechte Kante beide bei
    // 359px) - das Problem trat NUR beim Antippen (Einsink-Effekt) und beim
    // Zurueckfedern auf, weil whileTap bisher NUR auf der inneren Karte
    // (AnimatedButton) sass, nicht auf diesem Wrapper: die Karte schrumpfte
    // kurz, die Clip-Grenze (dieser Wrapper) blieb bei voller Groesse
    // stehen - der darunterliegende, IMMER unveraendert grosse Button ragte
    // dadurch ringsum minimal hervor. Fix: whileTap sitzt jetzt HIER, auf
    // dem gemeinsamen overflow-hidden-Container - Karte UND Clip-Grenze
    // schrumpfen dadurch untrennbar im GLEICHEN Schritt, der Button kann
    // rechnerisch in keinem Zwischenzustand mehr hervorschauen. Die beiden
    // Kind-Elemente selbst tragen deshalb bewusst KEIN eigenes whileTap mehr
    // (kein AnimatedButton fuer sie, siehe unten - sonst wuerde sich der
    // Effekt doppelt/uneinheitlich aufaddieren).
    <motion.div whileTap={{ scale: 0.97 }} className="relative overflow-hidden rounded-lg">
      {/* rounded-l-lg: die linke Kante (die einzige, die beim Freiziehen
          tatsaechlich sichtbar wird - rechts/oben/unten deckt sich der
          Button bereits mit der eigenen Rundung des Wrappers, siehe dessen
          rounded-lg oben) bekommt denselben Radius wie die Zeilenkarte -
          sonst wirkt der Button beim Freilegen wie ein abgeschnittener
          Block statt einem eigenstaendigen, rundum abgerundeten Element.
          Reine Randform, betrifft NICHT die Bleed-Fixes von zuvor (Scale
          sitzt weiterhin auf dem Wrapper, dieser Button bleibt geometrisch
          unveraendert). */}
      <button
        type="button"
        onClick={onEntfernen}
        aria-label={`${label}: Rezept entfernen`}
        className="absolute inset-y-0 right-0 flex items-center justify-center gap-1.5 rounded-l-lg bg-primary text-xs font-medium text-card"
        style={{ width: ENTFERNEN_BREITE_PX }}
      >
        <IconTrash size={18} stroke={1.75} />
        Entfernen
      </button>

      {/* z-10: liegt UEBER dem Entfernen-Button, solange x nahe 0 ist -
          touchAction: 'pan-y' laesst echtes vertikales Seiten-Scrollen
          weiterhin nativ durch (dieselbe Absicherung wie an der
          Rezept-Swipe-Karte), JS uebernimmt nur die horizontale Achse. */}
      <motion.button
        type="button"
        drag="x"
        dragConstraints={{ left: -ENTFERNEN_BREITE_PX, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        onPointerDown={() => {
          istAmZiehenRef.current = false
        }}
        onDragStart={() => {
          istAmZiehenRef.current = true
        }}
        onDragEnd={handleDragEnd}
        onTap={() => {
          if (istAmZiehenRef.current) {
            return
          }
          if (offen) {
            schliessen()
            return
          }
          onOeffnen()
        }}
        style={{ x, touchAction: 'pan-y' }}
        className="relative z-10 flex w-full items-center gap-3 rounded-lg border border-text-muted/20 bg-card px-3 py-3 text-left shadow-sm"
      >
        {rezept.bild_url ? (
          <img src={rezept.bild_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-text-muted">
            <IconPhotoOff size={22} stroke={1.75} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-secondary">{label}</span>
          <span className="block truncate font-medium text-text">{rezept.titel}</span>
          <span className="block text-xs text-text-muted">
            {karte.summeKalorien.toFixed(0)} kcal · P {karte.summeProtein.toFixed(0)}g
          </span>
        </span>
        <IconChevronRight size={18} stroke={1.75} className="shrink-0 text-text-muted/60" />
      </motion.button>
    </motion.div>
  )
}

// Platzhalter-Zeile (noch keine Mahlzeit gewaehlt): reiner Tap oeffnet den
// Swipe-Modus fuer diese Mahlzeit - kein Wisch-zum-Entfernen, es gibt ja
// noch nichts zu entfernen.
function TagZeilePlatzhalter({ label, onOeffnen }) {
  return (
    <AnimatedButton
      type="button"
      onClick={onOeffnen}
      className="flex w-full items-center gap-3 rounded-lg border border-dashed border-text-muted/30 px-3 py-3 text-left"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-text-muted/10 text-text-muted">
        <IconPlus size={22} stroke={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</span>
        <span className="block text-sm text-text-muted">Noch nicht gewählt — tippen zum Auswählen</span>
      </span>
      <IconChevronRight size={18} stroke={1.75} className="shrink-0 text-text-muted/60" />
    </AnimatedButton>
  )
}

// Uebergangs-Wrapper zwischen Platzhalter- und befuellter Zeile - komplett
// unterschiedliche innere Struktur/Interaktion (siehe die beiden
// Unterkomponenten oben), deshalb hier nur der Fade-Uebergang zwischen den
// beiden, keine gemeinsame Darstellung.
//
// GEFUNDENE LUECKE (Qualitaetslatte "nichts darf sich tot anfuehlen"): kommt
// man von der Swipe-Karte zurueck und hat gerade per "Uebernehmen" ein
// Rezept fuer eine vorher leere Mahlzeit festgelegt, sprang diese Zeile beim
// naechsten Besuch des Tag-Tabs hart von Platzhalter- auf Foto-Darstellung
// um. AnimatePresence mode="wait" faedet den Platzhalter-Inhalt jetzt zuerst
// kurz aus, dann den neuen Inhalt ein (sequenziell statt ueberlappend - bei
// so unterschiedlicher innerer Struktur wirkt ein sauberes "loest sich auf,
// dann erscheint das Neue" ruhiger als ein Overlap beider Layouts).
//
// initial={true} (Standardwert, deshalb NICHT initial={false} gesetzt) ist
// hier bewusst wichtig, keine Nachlaessigkeit: App.jsx mountet TagAnsicht bei
// JEDEM Tab-Wechsel komplett neu (einfache ansicht-Ternary, kein dauerhaft
// gemounteter, nur versteckter Baum) - der Moment "Tab gerade erst geoeffnet,
// Zeile zeigt zum ersten Mal das gerade uebernommene Rezept" IST hier
// technisch immer ein Erstmontieren dieser Komponenteninstanz. Mit
// initial={false} wuerde exakt der Uebergang unterdrueckt, um den es hier
// geht - genauso beim ENTFERNEN einer Zeile (faellt zurueck in den
// Platzhalter, derselbe Mechanismus greift dann in umgekehrter Richtung).
function TagZeile({ label, rezept, karte, onOeffnenPlatzhalter, onKochModusOeffnen, onEntfernen }) {
  const reduzierteBewegung = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      {karte ? (
        <motion.div
          key="gefuellt"
          {...motionPropsFuer(reduzierteBewegung, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: ZEILEN_INHALT_FADE,
          })}
        >
          <TagZeileBefuellt
            label={label}
            rezept={rezept}
            karte={karte}
            onOeffnen={() => {
              // Oeffnet den Kochmodus nur, wenn es ueberhaupt eine
              // Kochanleitung gibt - dieselbe Absicherung wie am (jetzt
              // entfernten) Warenkorb-Button der Swipe-Karte, siehe deren
              // onTap-Kommentar in RezeptSchwipKarte.jsx.
              if (rezept.anleitung?.length > 0) {
                onKochModusOeffnen(rezept, karte)
              }
            }}
            onEntfernen={onEntfernen}
          />
        </motion.div>
      ) : (
        <motion.div
          key="leer"
          {...motionPropsFuer(reduzierteBewegung, {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: ZEILEN_INHALT_FADE,
          })}
        >
          <TagZeilePlatzhalter label={label} onOeffnen={onOeffnenPlatzhalter} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Geometrie des Tagesziel-Rings (siehe TagesZielRing weiter unten) - eigene
// Konstanten statt magischer Zahlen im JSX, da dieselben Werte fuer
// Kreisumfang-Berechnung UND die Positionierung der Min-Markierung
// gebraucht werden.
const RING_RADIUS = 42
const RING_STRICHBREITE = 10
const RING_UMFANG = 2 * Math.PI * RING_RADIUS

// Tagesziel-Ring: NUR sinnvoll bei ziel.typ === 'proTag', wo kalorien.min/max
// tatsaechlich den GANZEN Tag beschreibt (siehe tagesZielKalorien-Kommentar
// in TagAnsicht unten) - bei 'proMahlzeit' gilt dieselbe Spanne PRO Mahlzeit,
// ein Ring waere dort eine erfundene Hochrechnung (mit Gregor abgestimmt:
// bewusst NICHT gebaut, dort bleibt die reine Textzeile).
//
// ZWEITE FASSUNG (erste Fassung mit einem einzelnen Markierungspunkt fuer
// kalorien.min war laut Real-Device-Feedback nicht selbsterklaerend - "ein
// Nutzer hat keine Chance" zu erraten, was der Punkt bedeutet, ohne es
// vorher zu wissen). Jetzt STATT eines Punktes die komplette Zielspanne
// (min bis max) als eigenes, sichtbar anders eingefaerbtes Bogen-STUECK der
// Ringbahn - keine Erklaerung noetig, weil man die zwei Informationen direkt
// gegeneinander ABLESEN kann: "das helle Bahnstueck ist die Zielzone, mein
// gefuellter Bogen reicht so weit hinein/durch/darueber hinaus". Drei
// Bogen-Ebenen uebereinander (Reihenfolge = Mal-Reihenfolge im SVG, letzte
// gewinnt sichtbar):
//   1. Bahnstueck VOR der Zielzone (0 bis min) - gedaempft/neutral.
//   2. Bahnstueck DER Zielzone (min bis max) - sichtbar heller/waermer
//      (secondary-Ton, im Rest der App bereits fuer "bestaetigt/positiv"
//      verwendet, z. B. der Uebernehmen-Button an der Swipe-Karte) -
//      GANZ OHNE Fortschritt sofort als "das ist mein Ziel-Bereich" lesbar.
//   3. Der tatsaechliche Fortschritt (0 bis kalorien), oben drauf in
//      primary/terracotta - deckt Bahnstueck 1 und/oder 2 entsprechend ab.
// Bei max GEDECKELT (nicht darueber hinaus gefuellt) - ein ueberlaufender
// Ring waere lesbar falsch ("mehr als 100%"), die tatsaechliche Zahl bleibt
// daneben ohnehin als Text sichtbar (siehe Verwendungsstelle).
function TagesZielRing({ kalorien, min, max }) {
  const reduzierteBewegung = useReducedMotion()
  const fortschritt = max > 0 ? Math.min(kalorien / max, 1) : 0
  const minAnteil = max > 0 ? Math.min(min / max, 1) : 0

  // strokeDasharray "sichtbare Laenge, Rest" + strokeDashoffset "wo auf der
  // Bahn dieses Stueck beginnt" (negativ = im Uhrzeigersinn verschoben) -
  // Standardtechnik fuer PARTIELLE Kreisboegen in SVG. Beide Bahnstuecke
  // zusammen ergeben exakt den vollen Kreis, ohne Ueberlappung.
  const vorZoneLaenge = RING_UMFANG * minAnteil
  const zoneLaenge = RING_UMFANG * (1 - minAnteil)

  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0 -rotate-90" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        strokeWidth={RING_STRICHBREITE}
        className="stroke-text-muted/15"
        fill="none"
        strokeDasharray={`${vorZoneLaenge} ${RING_UMFANG - vorZoneLaenge}`}
        strokeDashoffset={0}
      />
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        strokeWidth={RING_STRICHBREITE}
        className="stroke-secondary/30"
        fill="none"
        strokeDasharray={`${zoneLaenge} ${RING_UMFANG - zoneLaenge}`}
        strokeDashoffset={-vorZoneLaenge}
      />
      <motion.circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        strokeWidth={RING_STRICHBREITE}
        strokeLinecap="round"
        className="stroke-primary"
        fill="none"
        strokeDasharray={RING_UMFANG}
        initial={false}
        animate={{ strokeDashoffset: RING_UMFANG * (1 - fortschritt) }}
        transition={reduzierteBewegung ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

// Warmer, einladender Einstieg statt der bisherigen 4 gestrichelten
// Platzhalter-Zeilen ohne jede Einordnung + einer entmutigenden "0 kcal"-
// Grosszahl (Bugreport "leerer Zustand ist gar nicht gestaltet"). Nur
// sichtbar, wenn WIRKLICH noch fuer keine einzige Mahlzeit etwas feststeht
// (siehe hatMindestensEinenEintrag in TagAnsicht) - sobald die erste Zeile
// befuellt ist, uebernimmt wieder die normale Zusammenfassungskarte
// (TagesZielRing bzw. Text) den gewohnten Platz.
function LeererTagEinstieg() {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center gap-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
        <IconToolsKitchen2 size={26} stroke={1.75} className="text-secondary" />
      </span>
      <h2 className="font-display text-lg font-semibold text-text">Für heute ist noch nichts geplant</h2>
      <p className="max-w-[26rem] text-sm text-text-muted">
        Wische dich unten im Rezepte-Tab durch ein paar Vorschläge — was du übernimmst, erscheint hier.
      </p>
    </div>
  )
}

// Bestaetigungs-Dialog fuer den Fall "alle gesetzten Mahlzeiten sind schon
// auf der Einkaufsliste, User klickt den Button trotzdem bewusst" - NICHT
// destruktiv (im Gegensatz zum "Wirklich alles loeschen?"-Vorbild in
// EinkaufslisteAnsicht.jsx), aber verdient trotzdem eine explizite
// Rueckfrage statt stillem erneuten Addieren, siehe Aufgabenstellung.
// Bewusst dasselbe Backdrop-/Karten-Muster (fixed inset-0 bg-text/40 +
// zentrierte bg-card-Karte) fuer visuelle Konsistenz zwischen den beiden
// Bestaetigungs-Dialogen der App.
function ErneutHinzufuegenBestaetigung({ offen, onAbbrechen, onBestaetigen }) {
  const reduzierteBewegung = useReducedMotion()
  return (
    <AnimatePresence>
      {offen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitionFuer(reduzierteBewegung, FADE_UEBERGANG)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-4"
          onClick={onAbbrechen}
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
            <p className="font-display text-lg font-semibold text-text">Nochmal hinzufügen?</p>
            <p className="mt-1 text-sm text-text-muted">
              Diese Zutaten stehen schon auf deiner Einkaufsliste und würden erneut addiert.
            </p>
            <div className="mt-4 flex gap-2">
              <AnimatedButton
                type="button"
                onClick={onAbbrechen}
                className="flex-1 rounded-lg border border-text-muted/30 px-3 py-2 text-sm font-medium text-text"
              >
                Abbrechen
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={onBestaetigen}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-card"
              >
                Hinzufügen
              </AnimatedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// TagAnsicht ersetzt TagesplanAnsicht.jsx (Rezepte-Swipe-Pivot, siehe Plan
// floating-mixing-shannon.md) - zeigt, was per "Uebernehmen" fuer HEUTE
// bereits feststeht (tagesauswahl, siehe App.jsx), eine Zeile pro aktiver
// Mahlzeit plus eine aggregierte Tages-Summe. Haelt selbst ausser dem
// Bestaetigungs-Dialog-Sichtbarkeitszustand (siehe hinzufuegenBestaetigungOffen
// unten, analog zum Vorbild in EinkaufslisteAnsicht.jsx) KEINEN eigenen
// State - tagesauswahl/rezepte/zutatenNachId/ziel/makroZiele kommen komplett
// als Props von App.jsx, exakt wie RezepteSwipeAnsicht.jsx.
function TagAnsicht({
  rezepte,
  zutatenNachId,
  ziel,
  makroZiele,
  aktiveMahlzeiten,
  tagesauswahl,
  onZeileOeffnen,
  onZeileEntfernen,
  onKochModusOeffnen,
  onZurEinkaufslisteHinzufuegen,
}) {
  const aktiveMahlzeitenListe = aktiveMahlzeitenFuer(aktiveMahlzeiten)

  // Pro aktiver Mahlzeit: das gesetzte Rezept (falls vorhanden UND noch in
  // rezepte auffindbar) plus dessen Kartendaten direkt aus der DB (feste
  // Naehrwerte/Mengen, keine Ziel-/Makro-Abhaengigkeit mehr - siehe
  // rezeptKarteDaten.js). rezeptKarteDaten liefert bei rezept=null ohnehin
  // bereits null, das deckt sowohl "nichts gesetzt" als auch "gesetzte
  // rezeptId nicht mehr auffindbar" einheitlich ab.
  const eintraege = aktiveMahlzeitenListe.map(({ slug, label }) => {
    const rezeptId = tagesauswahl.mahlzeiten[slug]
    const rezept = rezeptId != null ? (rezepte.find((r) => r.id === rezeptId) ?? null) : null
    const karte = rezeptKarteDaten(rezept)
    return { slug, label, rezept: karte ? rezept : null, karte }
  })

  const hatMindestensEinenEintrag = eintraege.some((eintrag) => eintrag.karte)

  // Welche Eintraege sind noch NICHT zur Einkaufsliste hinzugefuegt worden -
  // siehe tagesauswahl.hinzugefuegt in App.jsx: haelt pro Mahlzeit die
  // zuletzt hinzugefuegte rezeptId, ein Mismatch mit der aktuell gesetzten
  // rezeptId (nie hinzugefuegt ODER Rezept seither ausgetauscht) zaehlt als
  // offen. alleBereitsHinzugefuegt schaltet Button-Optik/-Verhalten weiter
  // unten um (siehe hinzufuegenButtonKlick).
  const offeneEintraege = eintraege.filter(
    (eintrag) => eintrag.karte && tagesauswahl.hinzugefuegt[eintrag.slug] !== tagesauswahl.mahlzeiten[eintrag.slug]
  )
  const alleBereitsHinzugefuegt = hatMindestensEinenEintrag && offeneEintraege.length === 0

  const [hinzufuegenBestaetigungOffen, setHinzufuegenBestaetigungOffen] = useState(false)

  // Normalfall (mind. eine Mahlzeit noch offen): direkt und ohne Rueckfrage
  // nur die offenen Mahlzeiten hinzufuegen (siehe
  // zutatenUndStatusAusTagesauswahl in einkaufsliste.js). Sind bereits ALLE
  // gesetzten Mahlzeiten hinzugefuegt, waere ein direktes erneutes Addieren
  // ein stilles Verdoppeln - dafuer stattdessen die Rueckfrage oeffnen (siehe
  // ErneutHinzufuegenBestaetigung oben), die ihrerseits erzwingen=true nutzt.
  function hinzufuegenButtonKlick() {
    if (alleBereitsHinzugefuegt) {
      setHinzufuegenBestaetigungOffen(true)
    } else {
      onZurEinkaufslisteHinzufuegen(false)
    }
  }

  function hinzufuegenBestaetigt() {
    onZurEinkaufslisteHinzufuegen(true)
    setHinzufuegenBestaetigungOffen(false)
  }

  // Kompakte Tages-Summe ueber alle VORHANDENEN Eintraege - reiner
  // Render-Wert (kein State), analog zur bestehenden tagesSumme-Reduce-Logik
  // in RezepteAnsicht.jsx (jetzt hier uebernommen, dort mit dem Rest der
  // Datei in Schritt 6 entfernt).
  const tagesSumme = eintraege.reduce(
    (summe, eintrag) =>
      eintrag.karte
        ? {
            kalorien: summe.kalorien + eintrag.karte.summeKalorien,
            protein: summe.protein + eintrag.karte.summeProtein,
            carbs: summe.carbs + eintrag.karte.summeCarbs,
            fett: summe.fett + eintrag.karte.summeFett,
          }
        : summe,
    { kalorien: 0, protein: 0, carbs: 0, fett: 0 }
  )

  // Tagesziel-Vergleich nur bei ziel.typ === 'proTag' sinnvoll - das ist der
  // EINZIGE Zieltyp, bei dem ziel.kalorien.min/max tatsaechlich den ganzen
  // Tag beschreibt (siehe zielKalorienFensterFuerMahlzeit in
  // portionenRechner.js). Bei 'proMahlzeit' gilt dieselbe Spanne PRO
  // Mahlzeit - ein "Tagesziel" waere dort nur eine erfundene Multiplikation
  // mit der Anzahl aktiver Mahlzeiten, die der User nie explizit so
  // eingegeben hat, deshalb hier bewusst weggelassen (wie bei 'kein'). Aus
  // demselben Grund zeigt NUR dieser Fall den Fortschritts-Ring (siehe
  // TagesZielRing oben) - 'proMahlzeit'/'kein' bleiben bei der reinen
  // Textzeile.
  const tagesZielKalorien =
    ziel.typ === 'proTag' && Number(ziel.kalorien.min) > 0 && Number(ziel.kalorien.max) > 0
      ? { min: Number(ziel.kalorien.min), max: Number(ziel.kalorien.max) }
      : null

  return (
    <>
      <h1 className="mx-4 mt-1 font-display text-2xl font-semibold text-text">Heute</h1>

      {!hatMindestensEinenEintrag && <LeererTagEinstieg />}

      <div className={`mx-4 flex flex-col gap-2 ${hatMindestensEinenEintrag ? 'mt-3' : 'mt-5'}`}>
        {eintraege.map((eintrag) => (
          <TagZeile
            key={eintrag.slug}
            label={eintrag.label}
            rezept={eintrag.rezept}
            karte={eintrag.karte}
            onOeffnenPlatzhalter={() => onZeileOeffnen(eintrag.slug)}
            onKochModusOeffnen={onKochModusOeffnen}
            onEntfernen={() => onZeileEntfernen(eintrag.slug)}
          />
        ))}
      </div>

      {/* Zusammenfassungskarte + "Zur Einkaufsliste"-Button nur, sobald
          WIRKLICH etwas zusammenzufassen ist - eine "0 kcal"-Grosszahl neben
          4 leeren Platzhaltern wirkte eher entmutigend als informativ (siehe
          LeererTagEinstieg oben, der diesen Platz im leeren Zustand
          stattdessen einnimmt), und ein permanent deaktivierter Button war
          ohnehin nur totes Gewicht auf dem Screen. */}
      {hatMindestensEinenEintrag && (
        <>
          <section className="mx-4 mt-3 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-text">Tag gesamt</h2>
            {tagesZielKalorien ? (
              <div className="mt-1 flex items-center gap-4">
                <TagesZielRing kalorien={tagesSumme.kalorien} min={tagesZielKalorien.min} max={tagesZielKalorien.max} />
                <div className="min-w-0">
                  <p className="font-display text-2xl font-semibold text-text">
                    <AnimierteZahl wert={Math.round(tagesSumme.kalorien)} /> kcal
                  </p>
                  <p className="text-xs text-text-muted">
                    Ziel {tagesZielKalorien.min.toFixed(0)}–{tagesZielKalorien.max.toFixed(0)} kcal
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    P {tagesSumme.protein.toFixed(0)}g · K {tagesSumme.carbs.toFixed(0)}g · F {tagesSumme.fett.toFixed(0)}g
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold text-text">{tagesSumme.kalorien.toFixed(0)} kcal</p>
                <p className="text-sm text-text-muted">
                  P {tagesSumme.protein.toFixed(0)}g · K {tagesSumme.carbs.toFixed(0)}g · F {tagesSumme.fett.toFixed(0)}g
                </p>
              </>
            )}
          </section>

          <div className="mx-4 mb-4 mt-3">
            <AnimatedButton
              type="button"
              onClick={hinzufuegenButtonKlick}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                alleBereitsHinzugefuegt ? 'border-text-muted/30 text-text-muted' : 'border-secondary text-secondary'
              }`}
            >
              {alleBereitsHinzugefuegt ? (
                <IconCheck size={18} stroke={1.75} />
              ) : (
                <IconShoppingCart size={18} stroke={1.75} />
              )}
              {alleBereitsHinzugefuegt ? 'Bereits hinzugefügt' : 'Zur Einkaufsliste hinzufügen'}
            </AnimatedButton>
          </div>
        </>
      )}

      <ErneutHinzufuegenBestaetigung
        offen={hinzufuegenBestaetigungOffen}
        onAbbrechen={() => setHinzufuegenBestaetigungOffen(false)}
        onBestaetigen={hinzufuegenBestaetigt}
      />
    </>
  )
}

export default TagAnsicht
