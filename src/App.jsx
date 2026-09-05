import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './App.css'
import RezepteSwipeAnsicht from './components/RezepteSwipeAnsicht'
import TagAnsicht from './components/TagAnsicht'
import OnboardingWizard from './components/OnboardingWizard'
import Startbildschirm from './components/Startbildschirm'
import EinstellungenAnsicht from './components/EinstellungenAnsicht'
import KochModus from './components/KochModus'
import TabLeiste from './components/TabLeiste'
import EinkaufslisteAnsicht from './components/EinkaufslisteAnsicht'
import Toast from './components/Toast'
import {
  einkaufslisteLaden,
  EINKAUFSLISTE_LOCALSTORAGE_KEY,
  zutatenHinzufuegen,
  postenAbhaken,
  abgehakteEntfernen,
  zutatenAusRezeptKarte,
  zutatenAusTagesauswahl,
} from './einkaufsliste'
import { MAHLZEITEN, standardMahlzeit, aktiveMahlzeitenFuer } from './mahlzeiten'
import { supabase } from './supabase'
import { useTastaturAusgleich } from './useTastaturAusgleich'
import { gefiltertePoolFuerRezepte, alleAktivenMahlzeitenWuerfeln } from './rezepteFilter'
import { bilderImHintergrundVorladen } from './bildVorladen'
import { EXPO_OUT, FADE_UEBERGANG } from './motionConfig'

// Gestaffelte Fade-Choreografie Startbildschirm -> naechste Ansicht (Wizard
// oder Hauptansicht, siehe Rendering-Weiche am Komponentenende) - ersetzt
// den frueheren Seiten-Swipe (Commit 4956561). Das eigentliche Ausblenden
// von Logo/Halo/Button lebt bereits INNERHALB Startbildschirm.jsx (siehe
// dortige AUSBLEND_DAUER_S) - Startbildschirm ruft onWeiter (== hier
// setZeigtStartbildschirm(false)) erst NACH Abschluss jenes Ausblendens auf.
// Diese Konstante betrifft nur noch die EINBLEND-Seite: die naechste
// Ansicht blendet DANACH bewusst LANGSAMER ein (opacity 0->1 + Aufwaerts-
// Drift), mit derselben EXPO_OUT-Kurve wie die urspruengliche Logo-
// Einblendung im Startbildschirm - dieselbe "zeremonielle" Bewegungssprache
// setzt sich im Handoff fort. Das rausschiebende Startbildschirm-Overlay
// selbst (siehe AnimatePresence weiter unten) braucht zu diesem Zeitpunkt
// nur noch ein KURZES, reines Fade (FADE_UEBERGANG) fuer den cremefarbenen
// Hintergrund - sein Inhalt ist zu diesem Zeitpunkt schon unsichtbar.
const NAECHSTE_ANSICHT_EINBLEND_DAUER_S = 1.05
const NAECHSTE_ANSICHT_EINBLEND_Y_PX = 18

// Feste Reihenfolge der Mahlzeit-Typen (fruehstueck, mittag, abend, snack) -
// Fallback-Wert fuer aktiveMahlzeitenLaden, falls noch nichts gespeichert ist.
const MAHLZEIT_REIHENFOLGE = MAHLZEITEN.map((m) => m.slug)

const ZIEL_LOCALSTORAGE_KEY = 'gusto-ziel'

// Standard-Ziel: kein Kalorienziel, kein Makro-Gesamtziel fuer den Tag.
const ZIEL_STANDARD = { typ: 'kein', kalorien: { min: '', max: '' }, makro: { protein: '', carbs: '', fett: '' } }

// Laedt das gespeicherte Kalorienziel (inkl. Makro-Gesamtziel fuer "Pro Tag")
// aus dem localStorage. Ist noch nichts gespeichert oder der Inhalt
// beschaedigt (z. B. kein gueltiges JSON), wird auf ZIEL_STANDARD
// zurueckgefallen. Der Merge mit ZIEL_STANDARD sorgt dafuer, dass auch aeltere,
// vor Einfuehrung des Makro-Gesamtziels gespeicherte Objekte (ohne "makro")
// sauber ergaenzt werden.
function zielLaden() {
  try {
    const gespeichert = localStorage.getItem(ZIEL_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return ZIEL_STANDARD
    }
    return { ...ZIEL_STANDARD, ...JSON.parse(gespeichert) }
  } catch {
    return ZIEL_STANDARD
  }
}

const ONBOARDING_LOCALSTORAGE_KEY = 'gusto-onboarding-abgeschlossen'

// Prueft, ob der Onboarding-Wizard beim allerersten Besuch schon einmal
// abgeschlossen wurde. Erst danach zeigt die App die Haupt-Ansicht sofort;
// vorher wird bei jedem Laden der Wizard angezeigt.
function onboardingAbgeschlossenLaden() {
  return localStorage.getItem(ONBOARDING_LOCALSTORAGE_KEY) === 'true'
}

const MAKRO_ZIELE_LOCALSTORAGE_KEY = 'gusto-makro-ziele'

// Laedt die gespeicherten Makro-Ziele (Protein/Carbs/Fett in Gramm, PRO
// MAHLZEIT-TYP) aus dem localStorage. Ist noch nichts gespeichert oder der
// Inhalt beschaedigt, wird ein leeres Objekt zurueckgegeben (= keine Ziele
// gesetzt). Form: { [mahlzeitTyp]: { protein, carbs, fett } }.
function makroZieleLaden() {
  try {
    const gespeichert = localStorage.getItem(MAKRO_ZIELE_LOCALSTORAGE_KEY)
    return gespeichert ? JSON.parse(gespeichert) : {}
  } catch {
    return {}
  }
}

// Umbenannt von "tagesplanMahlzeiten" (Rezepte-Swipe-Pivot, siehe Plan
// floating-mixing-shannon.md): der alte Name war an das inzwischen
// entfernte Wuerfel-"Tagesplan"-Konzept angelehnt und waere jetzt
// irrefuehrend - die Bedeutung (welche der 4 Mahlzeiten ueberhaupt aktiv
// sind, steuert Tag-Tab-Zeilen UND Mahlzeit-Switcher-Optionen) bleibt exakt
// gleich, nur alter localStorage-Key bleibt bewusst bestehen fuer bereits
// gespeicherte Werte... siehe unten: NEUER Key, alte Werte gehen einmalig
// verloren (Fallback greift dann auf alle vier Mahlzeiten, siehe Kommentar
// dort - kein Datenverlust-Risiko, nur eine harmlose Neuauswahl).
const AKTIVE_MAHLZEITEN_LOCALSTORAGE_KEY = 'gusto-aktive-mahlzeiten'

// Laedt, welche Mahlzeiten ueberhaupt aktiv sind (Tag-Tab-Zeilen, Mahlzeit-
// Switcher-Optionen). Ist noch nichts gespeichert, der Inhalt beschaedigt
// oder leer, wird auf alle vier Mahlzeiten zurueckgefallen - das entspricht
// dem Verhalten vor Einfuehrung dieser Auswahl.
function aktiveMahlzeitenLaden() {
  try {
    const gespeichert = localStorage.getItem(AKTIVE_MAHLZEITEN_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return MAHLZEIT_REIHENFOLGE
    }
    const geparst = JSON.parse(gespeichert)
    return Array.isArray(geparst) && geparst.length > 0 ? geparst : MAHLZEIT_REIHENFOLGE
  } catch {
    return MAHLZEIT_REIHENFOLGE
  }
}

const DIAETEN_LOCALSTORAGE_KEY = 'gusto-diaeten'

// Laedt die im Onboarding gewaehlte Ernaehrungsform (Array von Slugs, z. B.
// ['vegan'] oder ['keine']) aus dem localStorage. Ist noch nichts
// gespeichert oder der Inhalt beschaedigt, wird ein leeres Array
// zurueckgegeben (= kein Diaet-Filter aktiv, entspricht dem Verhalten vor
// Einfuehrung dieser Persistierung).
function diaetenLaden() {
  try {
    const gespeichert = localStorage.getItem(DIAETEN_LOCALSTORAGE_KEY)
    const geparst = gespeichert ? JSON.parse(gespeichert) : []
    return Array.isArray(geparst) ? geparst : []
  } catch {
    return []
  }
}

const TAGESAUSWAHL_LOCALSTORAGE_KEY = 'gusto-tagesauswahl'

// Heutiges Datum als 'YYYY-MM-DD' in LOKALER Zeitzone - bewusst NICHT
// toISOString() (das ist UTC und wuerde rund um Mitternacht in Zeitzonen
// oestlich von UTC noch den Vortag liefern, obwohl lokal schon der naechste
// Tag begonnen hat).
function heutigesDatumString() {
  const heute = new Date()
  const jahr = heute.getFullYear()
  const monat = String(heute.getMonth() + 1).padStart(2, '0')
  const tag = String(heute.getDate()).padStart(2, '0')
  return `${jahr}-${monat}-${tag}`
}

// Laedt die tagesaktuelle Rezept-Auswahl (Rezepte-Swipe-Pivot, siehe Plan
// floating-mixing-shannon.md): welches Rezept pro Mahlzeit per "Uebernehmen"
// fuer HEUTE festgelegt wurde - { datum: 'YYYY-MM-DD', mahlzeiten: {
// [mahlzeitTyp]: rezeptId | null } }. BEWUSST kein dauerhafter Speiseplan:
// weicht das gespeicherte datum vom heutigen Datum ab (App wurde zuletzt an
// einem anderen Tag benutzt), wird mahlzeiten verworfen und leer mit
// heutigem Datum neu begonnen (Mitternachts-Reset). Der Vergleich passiert
// bewusst nur HIER beim Laden (lazy initializer), nicht ueber einen
// laufenden Timer - eine App-Sitzung, die exakt ueber Mitternacht hinweg
// offen bleibt, reset(et) also erst beim naechsten Neuladen, analog zu allen
// anderen localStorage-Ladefunktionen in dieser Datei (siehe z. B. zielLaden).
function tagesauswahlLaden() {
  const heute = heutigesDatumString()
  try {
    const gespeichert = localStorage.getItem(TAGESAUSWAHL_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return { datum: heute, mahlzeiten: {} }
    }
    const geparst = JSON.parse(gespeichert)
    if (geparst.datum !== heute) {
      return { datum: heute, mahlzeiten: {} }
    }
    return { datum: heute, mahlzeiten: geparst.mahlzeiten ?? {} }
  } catch {
    return { datum: heute, mahlzeiten: {} }
  }
}

const KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY = 'gusto-kochschritte-persistent'

// Ob abgehakte Kochschritte (siehe KochModus.jsx) dauerhaft im localStorage
// gespeichert werden sollen, statt nur fuer die aktuelle Sitzung zu gelten -
// Toggle in EinstellungenAnsicht.jsx (Sektion "Kochassistent"). Default false
// (= bisheriges Verhalten: reiner In-Memory-State, siehe erledigteSchritte
// weiter unten).
function kochschrittePersistentLaden() {
  return localStorage.getItem(KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY) === 'true'
}

const KOCHSCHRITTE_FORTSCHRITT_LOCALSTORAGE_KEY = 'gusto-kochschritte-fortschritt'

// Laedt den zuletzt gespeicherten Kochschritte-Fortschritt (welches Rezept,
// welche Schritt-Indizes) - ABER NUR, wenn kochschrittePersistentLaden()
// gerade true liefert. Ist der Toggle aus, wird IMMER ein leerer Fortschritt
// zurueckgegeben, selbst wenn noch ein alter Stand im localStorage liegt -
// so bleibt "aus" garantiert gleichbedeutend mit dem bisherigen reinen
// Sitzungs-Verhalten, unabhaengig davon, ob der Toggle zwischendurch schon
// einmal an war.
function kochschritteFortschrittLaden() {
  if (!kochschrittePersistentLaden()) {
    return { rezeptId: null, indices: new Set() }
  }
  try {
    const gespeichert = localStorage.getItem(KOCHSCHRITTE_FORTSCHRITT_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return { rezeptId: null, indices: new Set() }
    }
    const geparst = JSON.parse(gespeichert)
    return {
      rezeptId: geparst.rezeptId ?? null,
      indices: new Set(Array.isArray(geparst.indices) ? geparst.indices : []),
    }
  } catch {
    return { rezeptId: null, indices: new Set() }
  }
}

// Hilfsfunktion: gibt aus einer beliebigen Liste ein zufaelliges Element zurueck.
function zufaelligesElement(liste) {
  const zufallsIndex = Math.floor(Math.random() * liste.length)
  return liste[zufallsIndex]
}

function App() {
  // App-weiter Backstop gegen ruckartiges Verschieben beim Fokussieren von
  // Eingabefeldern (Tastatur ueberdeckt das Feld) - siehe
  // useTastaturAusgleich.js. Bewusst hier auf Top-Level statt in einzelnen
  // Formular-Komponenten, damit er ueberall greift (Onboarding-Wizard,
  // Einstellungen-Panel, Zutatensuche, ...), ohne an jeder Stelle einzeln
  // eingebunden werden zu muessen.
  useTastaturAusgleich()

  // Solange die Daten noch nicht aus der Datenbank geladen sind, zeigen wir "Laedt...".
  const [laedt, setLaedt] = useState(true)

  // Welche Hauptansicht gerade sichtbar ist. 'rezepte' zeigt die
  // RezepteSwipeAnsicht, 'tag' die TagAnsicht.
  const [ansicht, setAnsicht] = useState('rezepte')

  // Alle Rezepte aus der Datenbank (ungefiltert, siehe rezepteFilter.js fuer
  // die clientseitige Filterung). Bei nur ~30 Eintraegen reicht ein
  // einzelner Fetch beim Laden, siehe zutatenLaden-Effekt unten.
  const [rezepte, setRezepte] = useState([])

  // Nachschlage-Map zutat.id -> Zutat-Objekt, fuer den Zutaten-Join in der
  // Rezepte-Anzeige (jedes Rezept referenziert 4 Zutaten nur per id). Wird
  // im selben Effekt wie setRezepte aus den geladenen Zutaten gebaut, siehe
  // zutatenLaden-Effekt unten.
  const [zutatenNachId, setZutatenNachId] = useState({})

  // Im Onboarding-Wizard gewaehlte Mahlzeit-Praeferenz (nur relevant, wenn
  // ziel.typ NICHT 'proTag' ist - siehe OnboardingWizard.jsx Schritt 2 und
  // dessen WizardTageskarte-Vorschau). Lazy initializer: wird nur einmal
  // beim ersten Rendern anhand der Uhrzeit berechnet.
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)

  // Aktuell ausgewaehlte Diaetform-Filter (vegan/vegetarisch/glutenfrei),
  // Mehrfachauswahl. Leeres Array = kein Diaet-Filter aktiv, alle Zutaten
  // kommen infrage. Lazy initializer laedt den zuletzt gespeicherten Wert
  // aus dem localStorage (analog zu ziel/makroZiele/aktiveMahlzeiten),
  // damit die im Onboarding gewaehlte Ernaehrungsform einen Reload uebersteht.
  const [diaeten, setDiaeten] = useState(diaetenLaden)

  useEffect(() => {
    localStorage.setItem(DIAETEN_LOCALSTORAGE_KEY, JSON.stringify(diaeten))
  }, [diaeten])

  // Kalorienziel-Einstellung: { typ: 'kein' | 'proMahlzeit' | 'proTag', kalorien }.
  // Lazy initializer laedt den zuletzt gespeicherten Wert aus dem localStorage.
  const [ziel, setZiel] = useState(zielLaden)

  // Speichert das Ziel bei jeder Aenderung im localStorage, damit es beim
  // naechsten Oeffnen der App erhalten bleibt.
  useEffect(() => {
    localStorage.setItem(ZIEL_LOCALSTORAGE_KEY, JSON.stringify(ziel))
  }, [ziel])

  // Ob der Onboarding-Wizard schon einmal abgeschlossen wurde. Lazy
  // initializer liest den Wert einmalig aus dem localStorage; solange er
  // false ist, zeigt die App statt der Haupt-Ansicht den Wizard.
  const [onboardingAbgeschlossen, setOnboardingAbgeschlossen] = useState(onboardingAbgeschlossenLaden)

  // Startbildschirm (Startbildschirm.jsx) - Marken-Moment VOR Wizard/
  // Hauptansicht, siehe Rendering-Weiche weiter unten. BEWUSST kein
  // localStorage wie bei onboardingAbgeschlossen: der Startbildschirm soll
  // bei JEDEM App-Start erscheinen (nicht nur beim allerersten Besuch),
  // daher reiner In-Memory-State, der bei jedem Neuladen wieder bei true
  // beginnt.
  const [zeigtStartbildschirm, setZeigtStartbildschirm] = useState(true)

  // Fuer die Fade-Choreografie beim Verlassen des Startbildschirms (siehe
  // Rendering-Weiche am Komponentenende) - dort wird bei reduzierter
  // Bewegung sofort hart umgeschaltet statt sanft ein-/auszublenden.
  const reduzierteBewegung = useReducedMotion()

  // DOM-Referenz auf den einblendenden "naechste Ansicht"-Wrapper (siehe
  // Rendering-Weiche am Komponentenende) - wird NUR gebraucht, um nach
  // Abschluss der Einblend-Animation das von framer-motion gesetzte inline
  // transform:translateY(...) (aus deren y-Drift) wieder zu entfernen
  // (siehe dortiger Kommentar) - dieser Wrapper bleibt fuer den Rest der
  // Sitzung bestehen (kein AnimatePresence/Unmount noetig), ein liegen
  // gebliebenes transform wuerde sonst DAUERHAFT einen neuen Stacking/
  // Containing-Block-Kontext fuer alle darin verschachtelten fixed
  // inset-0-Overlays (KochModus, Kalorienrechner) erzeugen.
  const naechsteAnsichtRef = useRef(null)

  // Ob abgehakte Kochschritte dauerhaft gespeichert werden (siehe
  // KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY oben) - Toggle in
  // EinstellungenAnsicht.jsx.
  const [kochschrittePersistent, setKochschrittePersistent] = useState(kochschrittePersistentLaden)

  useEffect(() => {
    localStorage.setItem(KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY, String(kochschrittePersistent))
  }, [kochschrittePersistent])

  function kochschrittePersistentUmschalten() {
    setKochschrittePersistent((aktuell) => !aktuell)
  }

  // Kochmodus-Sheet (siehe KochModus.jsx) - bewusst HIER auf Top-Level statt
  // lokal in RezeptSchwipKarte.jsx, damit es als "fixed inset-0"-Backdrop
  // wirklich DIE GESAMTE App-Navigation optisch verdeckt (Rezepte/Tag-Tabs,
  // TabLeiste). null | { rezept, karte } - karte ist ein reiner
  // Momentaufnahme-Snapshot vom Oeffnen-Zeitpunkt (siehe KochModus.jsx-
  // Kommentar dort).
  const [kochModusEintrag, setKochModusEintrag] = useState(null)

  // Abhak-Status der Kochanleitung - siehe KochModus.jsx-Kommentar: lebt
  // BEWUSST hier statt lokal im Sheet, damit ein Schliessen+Wiederoeffnen
  // desselben Rezepts (das Sheet selbst wird dabei komplett unmounted) den
  // Fortschritt NICHT verwirft. erledigteSchritteRezeptId merkt sich, zu
  // welchem Rezept das aktuelle Set gehoert - weicht die beim naechsten
  // Oeffnen uebergebene rezept.id davon ab (neu gewuerfelt ODER Filter-
  // Wechsel hat ein anderes Rezept ausgewaehlt), wird VOR dem Anzeigen
  // zurueckgesetzt (siehe kochModusOeffnen unten). Lazy initializer laedt bei
  // aktivem kochschrittePersistent-Toggle den zuletzt gespeicherten Stand
  // (siehe kochschritteFortschrittLaden oben) - sonst (Default) startet
  // beides leer, exakt wie vor Einfuehrung dieses Toggles.
  const [erledigteSchritte, setErledigteSchritte] = useState(() => kochschritteFortschrittLaden().indices)
  const [erledigteSchritteRezeptId, setErledigteSchritteRezeptId] = useState(() => kochschritteFortschrittLaden().rezeptId)

  // Schreibt den Fortschritt bei JEDER Aenderung zurueck - aber NUR, solange
  // kochschrittePersistent aktiv ist (sonst bliebe ein veralteter Stand im
  // localStorage liegen, der nach einem erneuten Einschalten faelschlich
  // wieder auftauchen wuerde, siehe kochschritteFortschrittLaden oben). Das
  // Umschalten selbst (kochschrittePersistent in den deps) sorgt dafuer, dass
  // der AKTUELLE Sitzungs-Fortschritt sofort gespeichert wird, sobald der
  // Toggle eingeschaltet wird - nicht erst bei der naechsten Abhak-Aktion.
  useEffect(() => {
    if (!kochschrittePersistent) {
      return
    }
    localStorage.setItem(
      KOCHSCHRITTE_FORTSCHRITT_LOCALSTORAGE_KEY,
      JSON.stringify({ rezeptId: erledigteSchritteRezeptId, indices: [...erledigteSchritte] })
    )
  }, [kochschrittePersistent, erledigteSchritte, erledigteSchritteRezeptId])

  // Reset beim Verlassen des Rezepte-Tabs: sorgt dafuer, dass auch ein
  // zufaellig identisches Rezept beim naechsten Besuch wieder bei 0 startet,
  // statt alten Fortschritt "wiederzufinden" - ABER NUR, wenn
  // kochschrittePersistent AUS ist. Bei aktivem Toggle ist genau das
  // Gegenteil gewuenscht (Fortschritt soll Tab-/Sitzungs-Wechsel ueberleben),
  // ein Reset hier wuerde die eben gespeicherten Daten sonst sofort wieder
  // ueberschreiben (siehe Persistenz-Effekt oben, der bei JEDER Aenderung
  // von erledigteSchritte greift).
  useEffect(() => {
    if (kochschrittePersistent) {
      return
    }
    if (ansicht !== 'rezepte') {
      setErledigteSchritte(new Set())
      setErledigteSchritteRezeptId(null)
    }
  }, [ansicht, kochschrittePersistent])

  function kochModusOeffnen(rezept, karte) {
    if (rezept.id !== erledigteSchritteRezeptId) {
      setErledigteSchritte(new Set())
      setErledigteSchritteRezeptId(rezept.id)
    }
    setKochModusEintrag({ rezept, karte })
  }

  function kochSchrittUmschalten(index) {
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

  // Einkaufsliste (siehe einkaufsliste.js fuer das Datenmodell/die reine
  // Merge-Logik) - App-weiter State analog zu ziel/diaeten/makroZiele oben:
  // lazy initializer laedt den zuletzt gespeicherten Stand aus dem
  // localStorage, ein Effekt schreibt jede Aenderung sofort zurueck.
  const [einkaufsliste, setEinkaufsliste] = useState(einkaufslisteLaden)

  useEffect(() => {
    localStorage.setItem(EINKAUFSLISTE_LOCALSTORAGE_KEY, JSON.stringify(einkaufsliste))
  }, [einkaufsliste])

  // Kurze, selbst verschwindende Bestaetigung (siehe Toast.jsx) fuer die
  // beiden "zur Einkaufsliste hinzufuegen"-Einstiegspunkte (Rezepte-Tab,
  // Tag-Tab) - { text, id } statt nur text, damit eine zweite, IDENTISCHE
  // Bestaetigung kurz hintereinander (z. B. zweimal "Zutaten hinzugefügt")
  // trotzdem sichtbar neu einblendet, siehe Toast.jsx-Kommentar zum key.
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  // Raeumt einen noch laufenden Toast-Timer auf, wenn die Komponente
  // (theoretisch) unmountet wird - reines Aufraeumen, verhindert ein
  // setState nach Unmount, praktisch relevant vor allem bei Hot-Reload
  // waehrend der Entwicklung.
  useEffect(() => () => clearTimeout(toastTimeoutRef.current), [])

  function toastZeigen(text) {
    clearTimeout(toastTimeoutRef.current)
    setToast({ text, id: Date.now() })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2000)
  }

  // Von RezeptSchwipKarte.jsx aufgerufen ("Zur Einkaufsliste"-Button) -
  // bekommt die dort bereits berechnete karte (4 Zutaten + tatsaechliche
  // Portionen).
  function rezeptZurEinkaufslisteHinzufuegen(karte) {
    setEinkaufsliste((aktuell) => zutatenHinzufuegen(aktuell, zutatenAusRezeptKarte(karte)))
    toastZeigen('Zutaten hinzugefügt')
  }

  // Von TagAnsicht.jsx aufgerufen ("Zur Einkaufsliste"-Button) - liest die
  // komplette tagesaktuelle Rezept-Auswahl direkt aus dem tagesauswahl-State
  // (kein Parameter noetig).
  function tagesauswahlZurEinkaufslisteHinzufuegen() {
    setEinkaufsliste((aktuell) =>
      zutatenHinzufuegen(aktuell, zutatenAusTagesauswahl(tagesauswahl.mahlzeiten, rezepte, zutatenNachId, ziel, makroZiele))
    )
    toastZeigen('Zutaten hinzugefügt')
  }

  function einkaufslistePostenAbhaken(schluessel) {
    setEinkaufsliste((aktuell) => postenAbhaken(aktuell, schluessel))
  }

  function einkaufslisteAbgehakteEntfernen() {
    setEinkaufsliste((aktuell) => abgehakteEntfernen(aktuell))
  }

  function einkaufslisteLeeren() {
    setEinkaufsliste([])
  }

  // Wird vom Wizard aufgerufen, sobald der User auf Schritt 3 (letzter
  // Frage-Schritt seit dem Rezepte-Swipe-Pivot, siehe OnboardingWizard.jsx)
  // auf "Los geht's" tippt. gewaehlteAnsicht ist inzwischen IMMER 'rezepte'
  // (OnboardingWizard.jsx ruft onAbschluss ausschliesslich damit auf - die
  // fruehere Wahl zwischen "Wuerfeln"/"Rezepte" gibt es nicht mehr) - der
  // Parameter bleibt trotzdem bestehen statt hart auf 'rezepte' zu setzen,
  // damit diese Funktion nicht wissen muss, WELCHEN Wert der Wizard schickt.
  // Persistiert den Abschluss, damit der Wizard bei zukuenftigen Besuchen
  // nicht mehr erscheint.
  function onboardingAbschliessen(gewaehlteAnsicht) {
    localStorage.setItem(ONBOARDING_LOCALSTORAGE_KEY, 'true')
    setOnboardingAbgeschlossen(true)
    setAnsicht(gewaehlteAnsicht)
  }

  // Welche Mahlzeiten ueberhaupt aktiv sind (Mehrfachauswahl, mind. 1 -
  // siehe aktiveMahlzeitenAendern). Lazy initializer laedt den zuletzt
  // gespeicherten Wert aus dem localStorage.
  const [aktiveMahlzeiten, setAktiveMahlzeiten] = useState(aktiveMahlzeitenLaden)

  useEffect(() => {
    localStorage.setItem(AKTIVE_MAHLZEITEN_LOCALSTORAGE_KEY, JSON.stringify(aktiveMahlzeiten))
  }, [aktiveMahlzeiten])

  // Tagesaktuelle Rezept-Auswahl (Rezepte-Swipe-Pivot) - siehe
  // tagesauswahlLaden weiter oben fuer das Datenmodell und den
  // Mitternachts-Reset.
  const [tagesauswahl, setTagesauswahl] = useState(tagesauswahlLaden)

  useEffect(() => {
    localStorage.setItem(TAGESAUSWAHL_LOCALSTORAGE_KEY, JSON.stringify(tagesauswahl))
  }, [tagesauswahl])

  // Schreibt rezeptId als "fuer heute uebernommen" fuer EINE Mahlzeit fest -
  // ueberschreibt eine evtl. vorher fuer dieselbe Mahlzeit uebernommene
  // Auswahl. datum bleibt dabei unveraendert (kommt bereits mit heutigem
  // Datum aus tagesauswahlLaden bzw. dieser Funktion selbst).
  function tagesauswahlMahlzeitUebernehmen(mahlzeitTyp, rezeptId) {
    setTagesauswahl((aktuell) => ({
      ...aktuell,
      mahlzeiten: { ...aktuell.mahlzeiten, [mahlzeitTyp]: rezeptId },
    }))
  }

  // Wird von TagAnsicht.jsx aufgerufen (Tap auf eine Mahlzeit-Zeile) -
  // springt zurueck in den Swipe-Modus fuer GENAU diese Mahlzeit, egal ob
  // dafuer heute schon ein Rezept feststeht (ansehen/aendern) oder noch
  // nicht (erstmalig waehlen) - TagZeile in TagAnsicht.jsx behandelt beide
  // Faelle mit demselben Tap.
  function tagZeileOeffnen(mahlzeitTyp) {
    setRezepteAktuelleMahlzeit(mahlzeitTyp)
    setAnsicht('rezepte')
  }

  // Rezepte-Tab-Auswahl - BEWUSST hier auf App-Ebene gehalten statt lokal in
  // RezepteSwipeAnsicht.jsx. Bugfix-Hintergrund: die Rezepte-Ansicht wird
  // beim Tab-Wechsel per echtem Conditional-Rendering komplett unmountet/
  // neu gemountet. Lokaler State startete dadurch bei JEDEM Oeffnen des
  // Rezepte-Tabs wieder bei null/{} und wurde erst per useEffect NACH dem
  // ersten Paint neu befuellt - in der Luecke dazwischen zeigte die Karte
  // faelschlich "Fuer diese Filterkombination gibt es noch kein Rezept.",
  // obwohl die Daten laengst da waren (nur der lokale Auswahl-State noch
  // nicht neu gewuerfelt). Zusaetzlich musste die Karte danach noch das
  // (evtl. neu ausgewuerfelte, andere) Rezeptbild frisch vorladen (siehe
  // BILD_PRELOAD_TIMEOUT_MS-Kommentar in RezeptSchwipKarte.jsx) - macht die
  // sichtbare Luecke auf einer echten Verbindung ca. 1 Sekunde lang statt nur
  // einen Frame. Mit dem State hier oben bleibt die Auswahl ueber Tab-
  // Wechsel hinweg erhalten (kein Neu-Wuerfeln, kein erneutes Bild-Vorladen
  // fuer ein Rezept, das man Sekunden zuvor schon gesehen hat) - analog zu
  // diaeten/ziel/makroZiele/aktiveMahlzeiten oben, die aus demselben Grund
  // schon auf dieser Ebene liegen. Die Erst-Befuellung passiert im
  // zutatenLaden-Effekt weiter unten, im selben Zug wie setRezepte(...) -
  // Diaet-/Mahlzeiten-AENDERUNGEN loesen die Neu-Wuerfelung direkt in den
  // jeweiligen Handlern aus (diaetenAendern, aktiveMahlzeitenAendern weiter
  // unten), bewusst NICHT ueber einen an RezepteSwipeAnsicht gebundenen
  // useEffect - der wuerde bei jedem Remount (= jedem Tab-Wechsel) erneut
  // feuern und genau das Caching wieder aufheben, das dieser Fix bezweckt.
  //
  // rezepteProMahlzeitState ist die EINZIGE Quelle fuer den Browsing-
  // Kandidaten - { [mahlzeitTyp]: { eigenschaft, rezept } }, ein Eintrag pro
  // Mahlzeit, unabhaengig von ziel.typ.
  const [rezepteAktuelleMahlzeit, setRezepteAktuelleMahlzeit] = useState(standardMahlzeit)
  const [rezepteProMahlzeitState, setRezepteProMahlzeitState] = useState({})

  // Makro-Ziele (Protein/Carbs/Fett in Gramm) PRO MAHLZEIT-TYP:
  // { [mahlzeitTyp]: { protein, carbs, fett } }. Wird von rezeptKarteBerechnen
  // (siehe RezepteSwipeAnsicht.jsx/RezeptSchwipKarte.jsx/TagAnsicht.jsx)
  // gelesen, damit z. B. ein vor dem Rezepte-Swipe-Pivot gesetztes "40g
  // Protein-Ziel beim Fruehstueck" weiterhin beruecksichtigt wird. BEWUSST
  // schreibgeschuetzt (kein Setter mehr) - die einzige Editier-Oberflaeche
  // dafuer war die inzwischen entfernte Einzel-Ansicht (SlotKarte-
  // "Protein-Ziel:"-Eingabefeld), die neue Rezepte-Swipe-Ansicht bietet
  // (noch) keinen Ersatz dafuer. Bestehende, bereits gespeicherte Werte
  // bleiben dadurch erhalten und wirksam, koennen aber aktuell ueber keine
  // UI mehr GEAENDERT werden - ein bekannter, absichtlich in Kauf
  // genommener Funktionsluecke des Pivots, kein Bug.
  const [makroZiele] = useState(makroZieleLaden)

  // Leeres Array [] als zweites Argument: dieser Code laeuft nur EINMAL,
  // wenn die Komponente zum ersten Mal angezeigt wird.
  useEffect(() => {
    async function zutatenLaden() {
      // Zutaten und Rezepte parallel laden (zwei unabhaengige Tabellen) -
      // beide muessen fertig sein, bevor "laedt" auf false geht, sonst
      // waere die Rezepte-Ansicht kurz mit einer leeren Liste sichtbar.
      const [zutatenErgebnis, rezepteErgebnis] = await Promise.all([
        supabase
          .from('zutaten')
          // "id" brauchen wir fuer den Zutaten-Join in der Rezepte-Ansicht
          // (jedes Rezept referenziert 4 Zutaten nur per id).
          .select('id, name, kategorie, supermarkt_kategorie, kalorien, protein_g, carbs_g, fett_g, portion_g, mahlzeiten, diaeten, eigenschaft')
          .eq('aktiv', true),
        supabase
          .from('rezepte')
          .select(
            'id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten, protein_zutat_id, carbs_zutat_id, fett_zutat_id, gemuese_obst_zutat_id, anleitung'
          ),
      ])

      if (zutatenErgebnis.error) {
        console.error('Fehler beim Laden der Zutaten:', zutatenErgebnis.error)
        setLaedt(false)
        return
      }
      if (rezepteErgebnis.error) {
        // Rezepte sind (noch) nicht kritisch fuer die Haupt-Ansicht - ein
        // Fehler hier soll nicht die ganze App blockieren, nur die
        // Rezepte-Ansicht bleibt dann leer (siehe RezepteSwipeAnsicht.jsx,
        // zeigt in dem Fall den "kein Rezept gefunden"-Hinweistext).
        console.error('Fehler beim Laden der Rezepte:', rezepteErgebnis.error)
      }

      setZutatenNachId(Object.fromEntries(zutatenErgebnis.data.map((z) => [z.id, z])))
      const rezepteDaten = rezepteErgebnis.data ?? []
      setRezepte(rezepteDaten)

      // Direkt eine erste Auswahl PRO AKTIVER MAHLZEIT fuer den Rezepte-Tab
      // wuerfeln - der eigentliche Grund, warum rezepteProMahlzeitState
      // (siehe Kommentar dort) ueberhaupt bereits VOR dem ersten Rendern der
      // Rezepte-Ansicht einen echten Wert hat, statt erst per Folge-Effekt in
      // RezepteSwipeAnsicht.jsx selbst - genau das war die Ursache des
      // Flackerns (siehe Bugfix-Hintergrund weiter oben). Verwendet bewusst
      // rezepteDaten direkt (nicht den rezepte-State, der ist in diesem
      // Funktionsdurchlauf noch nicht aktualisiert).
      setRezepteProMahlzeitState(
        alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenFuer(aktiveMahlzeiten), rezepteDaten, diaeten)({})
      )

      setLaedt(false)
    }

    zutatenLaden()
  }, [])

  // Laedt die Rezeptbilder (~30 kuratierte Rezepte) im Hintergrund vor, damit
  // sie beim tatsaechlichen Anzeigen (erster Rezepte-Tab-Besuch, Wuerfeln)
  // schon im Browser-Cache liegen - RezeptBild (RezeptSchwipKarte.jsx) startet
  // dann sofort bei voller Deckkraft statt den Skeleton-Platzhalter zu
  // zeigen (siehe dortiger img.complete-Check in RezeptBild). Bugfix-
  // Hintergrund: der Skeleton aus commit 8817121 verhindert zwar die
  // FALSCHE "kein Rezept"-Meldung, das Bild selbst braucht aber weiterhin
  // eine Sekunde, wenn es beim ersten Erscheinen noch nie geladen wurde.
  //
  // Zeitpunkt bewusst NICHT "sofort beim App-Start" (waehrend rezepte noch
  // leer ist, kaeme ohnehin nichts zum Vorladen zusammen) UND NICHT bevor
  // der Startbildschirm fertig ist (zeigtStartbildschirm) - der Marken-
  // Moment beim App-Start soll nicht mit ~30 Bild-Requests um Bandbreite/
  // Hauptthread konkurrieren. Sobald BEIDE Bedingungen erfuellt sind (Daten
  // da UND Startbildschirm weg), sind wir entweder im Wizard (neuer Nutzer -
  // dort vergehen noch mehrere Interaktionsschritte bis "Alles bereit!")
  // oder direkt in der Haupt-Ansicht (wiederkehrender Nutzer) - in BEIDEN
  // Faellen bleibt genug Zeit, bevor der Rezepte-Tab ueberhaupt angefasst wird.
  //
  // bilderVorgeladenRef verhindert ein zweites Anstossen (z. B. durch React
  // StrictModes doppelten Effekt-Aufruf in der Entwicklung, oder falls dieser
  // Effekt aus einem anderen Grund erneut liefe) - das Vorladen soll pro
  // Sitzung nur EINMAL starten.
  const bilderVorgeladenRef = useRef(false)
  useEffect(() => {
    if (bilderVorgeladenRef.current || rezepte.length === 0 || zeigtStartbildschirm) {
      return
    }
    bilderVorgeladenRef.current = true

    // Priorisierung: die Bilder, die beim Oeffnen des Rezepte-Tabs SOFORT
    // sichtbar waeren (bereits synchron in zutatenLaden oben ausgewuerfelt,
    // siehe rezepteProMahlzeitState-Kommentar weiter oben), zuerst - deckt
    // den im Auftrag genannten "Alles bereit!" -> Rezepte-Fall sofort ab.
    // Danach der Rest aller Rezepte in Datenbank-Reihenfolge, im Hintergrund
    // "troepfelnd" (siehe bildVorladen.js).
    const prioritaet = Object.values(rezepteProMahlzeitState).map((eintrag) => eintrag?.rezept?.bild_url)
    const rest = rezepte.map((r) => r.bild_url)
    bilderImHintergrundVorladen([...prioritaet, ...rest], 2)
  }, [rezepte, zeigtStartbildschirm, rezepteProMahlzeitState])

  // Wird von ZielEinstellungen aufgerufen, wenn der User einen anderen
  // Ziel-Typ waehlt. Die Kalorienzahl bleibt dabei erhalten, damit sie beim
  // Zurueckwechseln nicht verloren geht.
  function zielTypAendern(typ) {
    setZiel((aktuell) => ({ ...aktuell, typ }))
  }

  // Wird von ZielEinstellungen aufgerufen, wenn der User Min oder Max des
  // Kalorienfensters aendert. feld ist 'min' oder 'max' (Signatur analog zu
  // zielMakroAendern).
  function zielKalorienAendern(feld, wert) {
    setZiel((aktuell) => ({ ...aktuell, kalorien: { ...aktuell.kalorien, [feld]: wert } }))
  }

  // Wird von ZielEinstellungen aufgerufen, wenn der User das Tages-Makroziel
  // (Protein/Carbs/Fett in Gramm, nur bei "Pro Tag" sichtbar) aendert.
  function zielMakroAendern(kategorie, wert) {
    setZiel((aktuell) => ({ ...aktuell, makro: { ...aktuell.makro, [kategorie]: wert } }))
  }

  // Wird vom DiaetFilter aufgerufen, wenn der User eine Diaetform an- oder
  // abwaehlt. "keine" (Keine Einschraenkung) schliesst sich mit den anderen
  // drei Diaetformen gegenseitig aus: Anwaehlen von "keine" ersetzt eine
  // evtl. bestehende Auswahl komplett, Anwaehlen einer der anderen drei
  // entfernt ein evtl. aktives "keine" wieder. Wuerfelt danach sofort den
  // Rezepte-Tab (alle aktiven Mahlzeiten) neu, passend zur neuen Auswahl.
  // neueDiaeten wird direkt verwendet statt ueber den State zu lesen, weil
  // setDiaeten asynchron ist und der State-Wert im selben Funktionsdurchlauf
  // noch der alte waere.
  function diaetenAendern(slug) {
    let neueDiaeten
    if (slug === 'keine') {
      neueDiaeten = diaeten.includes('keine') ? [] : ['keine']
    } else if (diaeten.includes(slug)) {
      neueDiaeten = diaeten.filter((d) => d !== slug)
    } else {
      neueDiaeten = [...diaeten.filter((d) => d !== 'keine'), slug]
    }

    setDiaeten(neueDiaeten)

    // Unconditional (nicht nur wenn der Rezepte-Tab gerade sichtbar ist),
    // damit die Auswahl beim naechsten Oeffnen schon zur neuen Diaet-Auswahl
    // passt, statt veraltet im Cache zu haengen (siehe rezepteProMahlzeitState-
    // Kommentar weiter oben).
    setRezepteProMahlzeitState(alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenFuer(aktiveMahlzeiten), rezepte, neueDiaeten))
  }

  // Wird von AktiveMahlzeitenFilter aufgerufen, wenn der User eine Mahlzeit
  // an- oder abwaehlt (Mehrfachauswahl, welche der vier Mahlzeiten
  // ueberhaupt aktiv sein sollen - steuert Tag-Tab-Zeilen UND Mahlzeit-
  // Switcher-Optionen). Das Abwaehlen der LETZTEN verbleibenden Mahlzeit ist
  // ein No-Op: es gibt hier keinen "Weiter"-Gate-Punkt wie im Wizard, der
  // einen leeren Zwischenstand abfangen koennte - jeder Klick wirkt sofort.
  function aktiveMahlzeitenAendern(slug) {
    const istAusgewaehlt = aktiveMahlzeiten.includes(slug)
    if (istAusgewaehlt && aktiveMahlzeiten.length === 1) {
      return
    }

    const neueMahlzeiten = istAusgewaehlt
      ? aktiveMahlzeiten.filter((m) => m !== slug)
      : [...aktiveMahlzeiten, slug]

    setAktiveMahlzeiten(neueMahlzeiten)

    // Die aktiven Mahlzeit-Tabs im Rezepte-Tab richten sich nach genau
    // demselben aktiveMahlzeiten-Wert (siehe RezepteSwipeAnsicht.jsx/
    // aktiveMahlzeitenFuer) - deshalb hier ebenfalls neu wuerfeln.
    setRezepteProMahlzeitState(alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenFuer(neueMahlzeiten), rezepte, diaeten))
  }

  // --- Rezepte-Tab (RezepteSwipeAnsicht.jsx) ---

  // Effektiv aktuelle Mahlzeit: rezepteAktuelleMahlzeit ODER, falls die
  // zuletzt gewaehlte Mahlzeit inzwischen ueber "Mahlzeiten anpassen"
  // deaktiviert wurde, die erste noch aktive Mahlzeit. Bewusst als
  // abgeleiteter Wert bei JEDEM Rendern neu berechnet (statt wie vorher per
  // useEffect nachtraeglich korrigiert) - so bleibt rezepteAktuelleMahlzeit
  // robust gegen den Fall "gerade sichtbare Mahlzeit wurde deaktiviert",
  // OHNE dass dafuer ein eigener Effekt noetig waere, der beim Tab-Remount
  // erneut anspringen wuerde.
  const rezepteAktiveMahlzeitenListe = aktiveMahlzeitenFuer(aktiveMahlzeiten)
  const rezepteEffektivAktuelleMahlzeit =
    rezepteAktuelleMahlzeit && rezepteAktiveMahlzeitenListe.some(({ slug }) => slug === rezepteAktuelleMahlzeit)
      ? rezepteAktuelleMahlzeit
      : rezepteAktiveMahlzeitenListe[0]?.slug ?? 'mittag'

  function rezepteEigenschaftFuerMahlzeitAendern(neueEigenschaft) {
    setRezepteProMahlzeitState((aktuell) => {
      if ((aktuell[rezepteEffektivAktuelleMahlzeit]?.eigenschaft ?? '') === neueEigenschaft) {
        return aktuell
      }
      const pool = gefiltertePoolFuerRezepte(rezepte, rezepteEffektivAktuelleMahlzeit, diaeten, neueEigenschaft)
      return {
        ...aktuell,
        [rezepteEffektivAktuelleMahlzeit]: {
          eigenschaft: neueEigenschaft,
          rezept: pool.length > 0 ? zufaelligesElement(pool) : null,
        },
      }
    })
  }

  // "Neu würfeln" in RezepteSwipeAnsicht.jsx - trifft NUR die gerade
  // angezeigte Mahlzeit, alle anderen behalten ihr Rezept.
  function rezepteMahlzeitTabWuerfeln() {
    setRezepteProMahlzeitState((aktuell) => {
      const eigenschaftFuerMahlzeit = aktuell[rezepteEffektivAktuelleMahlzeit]?.eigenschaft ?? ''
      const pool = gefiltertePoolFuerRezepte(rezepte, rezepteEffektivAktuelleMahlzeit, diaeten, eigenschaftFuerMahlzeit)
      return {
        ...aktuell,
        [rezepteEffektivAktuelleMahlzeit]: {
          eigenschaft: eigenschaftFuerMahlzeit,
          rezept: pool.length > 0 ? zufaelligesElement(pool) : null,
        },
      }
    })
  }

  // Allererster Bildschirm der App - siehe Startbildschirm.jsx. Tap auf den
  // dortigen Button setzt NUR diesen State zurueck; welche der beiden
  // folgenden Ansichten (Wizard/Hauptansicht) dann erscheint, entscheidet
  // weiterhin ausschliesslich die bestehende onboardingAbgeschlossen-Weiche
  // direkt darunter, komplett unveraendert.
  //
  // Fuer den Crossfade (Bugfix "Startbildschirm-Uebergang") darf diese
  // Weiche NICHT mehr per frueher Return komplett abbrechen (das wuerde die
  // naechste Ansicht erst NACH dem Ausblenden des Startbildschirms montieren
  // - ein harter Schnitt statt einer Ueberlappung). Stattdessen wird die
  // GESAMTE bisherige Rendering-Kette (Wizard/Laedt/Hauptansicht,
  // unveraendert per fruehem Return INNERHALB dieser Funktion) in ein IIFE
  // gewrappt und als eigener Wert (naechsteAnsicht) berechnet - sie wird erst
  // dann ueberhaupt ausgewertet/montiert, wenn zeigtStartbildschirm bereits
  // false ist (siehe Bedingung ganz unten bei der Verwendung), damit VOR dem
  // ersten Tap weiterhin exakt nichts von alldem gemountet wird (keine
  // Verhaltensaenderung fuer die Zeit davor). Alle Hooks der Komponente
  // stehen bereits VOLLSTAENDIG oberhalb dieser Stelle (siehe Kommentare zu
  // den einzelnen useState/useEffect-Aufrufen weiter oben) - das IIFE selbst
  // ruft KEINE weiteren Hooks auf, ist also unproblematisch fuer die
  // Rules-of-Hooks.
  const naechsteAnsicht = (() => {
    if (!onboardingAbgeschlossen) {
      return (
        <OnboardingWizard
          ziel={ziel}
          onTypAendern={zielTypAendern}
          onKalorienAendern={zielKalorienAendern}
          onMakroAendern={zielMakroAendern}
          mahlzeit={mahlzeit}
          onMahlzeitAendern={setMahlzeit}
          diaeten={diaeten}
          onDiaetenAendern={diaetenAendern}
          aktiveMahlzeiten={aktiveMahlzeiten}
          onAktiveMahlzeitenAendern={aktiveMahlzeitenAendern}
          onAbschluss={onboardingAbschliessen}
        />
      )
    }

    if (laedt) {
      return <p className="p-4">Lädt...</p>
    }

    return (
      <>
        {/* Der fruehere "gusto"-Logo+Slogan-Header ist auf den Hauptseiten
            (nach Abschluss des Onboardings) bewusst entfernt - spart
            vertikalen Platz app-weit. Bleibt NUR im OnboardingWizard
            erhalten (dort unveraendert, siehe WizardTageskarte.jsx u. a.) - der
            Wizard ist der einzige Ort, an dem der Marken-Einstieg noch gezeigt
            wird. Die frueher hier oben sitzende Tab-Leiste + Einstellungen-
            Zahnrad ist durch die schwebende TabLeiste (siehe TabLeiste.jsx)
            am unteren Rand ersetzt - 'einstellungen' ist dort ein ganz
            normaler ansicht-Wert wie 'rezepte'/'tag'/'einkaufsliste', siehe
            Rendering-Weiche unten. */}
        <TabLeiste aktiverTab={ansicht} onTabWaehlen={setAnsicht} />

        <Toast nachricht={toast} />

        <KochModus
          eintrag={kochModusEintrag}
          onZurueck={() => setKochModusEintrag(null)}
          erledigteSchritte={erledigteSchritte}
          onSchrittUmschalten={kochSchrittUmschalten}
        />

        {/* flex-1 min-h-0 overflow-y-auto: DIE innere Scroll-Region dieses
            Screens (siehe App-Shell-Pattern in index.css - html/body
            scrollen bewusst NICHT mehr) - deckt Rezepte/Tag/Einkaufsliste/
            Einstellungen einheitlich mit einem einzigen Wrapper ab, da alle
            vier hier durchlaufen. pt-[...]: Safe-Area oben (Notch/Dynamic
            Island), da hier (anders als im OnboardingWizard/Kalorienrechner
            mit eigenem stickyem Header) kein separater Header-Bereich
            existiert, der das uebernehmen koennte. pb-[...]: Platz fuer die
            schwebende TabLeiste (60px Hoehe + 12px Bodenabstand + Safe-Area,
            siehe .tab-leiste in index.css), damit sie den untersten Inhalt
            nicht dauerhaft ueberlagert. Nur um diesen Content-Block herum
            (nicht um KochModus oben) - das ist ein fixed inset-0-Overlay und
            deckt den Viewport ohnehin komplett ab, braucht also keine eigene
            Scroll-Region/kein eigenes Padding.

            touch-pan-y overscroll-x-none: GEFUNDENE URSACHE (per natives
            Laufzeit-Log in MainViewController.swift zweifelsfrei bewiesen,
            siehe dortiger Diagnose-Code) eines Real-Device-Bugreports
            ("Druecken+Halten auf freier Stelle + Wischen verschiebt die
            komplette Flaeche inkl. der eigentlich fixed positionierten
            Tab-Leiste"). Der native Fix in MainViewController.swift
            (webView.scrollView.isScrollEnabled=false) griff NICHT, weil sich
            waehrend der Touch-Interaktion eine ZWEITE, separate native
            WKChildScrollView bildet - WebKits eigene interne ScrollView fuer
            GENAU diesen overflow-y-auto-Container (jeder eigene
            "overflow: auto/scroll"-Bereich bekommt in WKWebView seine EIGENE
            native ScrollView, unabhaengig von webView.scrollView selbst) -
            und deren contentOffset sich waehrend der Geste nachweislich
            AUCH horizontal bewegte (x=136 im Log), obwohl dieser Container
            NUR vertikal scrollen soll. touch-action:pan-y (Tailwind
            touch-pan-y) sagt dem Browser bereits VOR jeder Scroll-
            Entscheidung, dass eine horizontale Touch-Bewegung hier gar
            nicht erst als Pan/Scroll-Geste interpretiert werden darf.
            overscroll-behavior-x:none (Tailwind overscroll-x-none) ist die
            zweite, unabhaengige Absicherung: unterbindet zusaetzlich JEDES
            elastische Ueberziehen/Rubber-Banding auf der X-Achse, falls
            trotzdem einmal horizontal "gescrollt" wuerde. Bewusst NUR auf
            der X-Achse (nicht overscroll-none/touch-none) - das normale,
            von iOS-Nutzern erwartete vertikale Rubber-Banding an oberer/
            unterer Kante bleibt dadurch unangetastet erhalten, nur die
            (hier fachlich sinnlose) horizontale Bewegung wird
            unterbunden. */}
        <div className="flex-1 min-h-0 touch-pan-y overflow-y-auto overscroll-x-none pb-[calc(96px_+_env(safe-area-inset-bottom))] pt-[calc(1rem_+_env(safe-area-inset-top))]">
        {ansicht === 'einstellungen' ? (
          <EinstellungenAnsicht
            ziel={ziel}
            onTypAendern={zielTypAendern}
            onKalorienAendern={zielKalorienAendern}
            onMakroAendern={zielMakroAendern}
            diaeten={diaeten}
            onDiaetenAendern={diaetenAendern}
            aktiveMahlzeiten={aktiveMahlzeiten}
            onAktiveMahlzeitenAendern={aktiveMahlzeitenAendern}
            kochschrittePersistent={kochschrittePersistent}
            onKochschrittePersistentUmschalten={kochschrittePersistentUmschalten}
          />
        ) : ansicht === 'rezepte' ? (
          <RezepteSwipeAnsicht
            rezepteGeladen={!laedt}
            rezepte={rezepte}
            zutatenNachId={zutatenNachId}
            diaeten={diaeten}
            onDiaetenAendern={diaetenAendern}
            ziel={ziel}
            makroZiele={makroZiele}
            aktiveMahlzeiten={aktiveMahlzeiten}
            aktuelleMahlzeit={rezepteEffektivAktuelleMahlzeit}
            onMahlzeitAendern={setRezepteAktuelleMahlzeit}
            proMahlzeitState={rezepteProMahlzeitState}
            onEigenschaftAendern={rezepteEigenschaftFuerMahlzeitAendern}
            onWuerfeln={rezepteMahlzeitTabWuerfeln}
            onUebernehmen={(rezeptId) => tagesauswahlMahlzeitUebernehmen(rezepteEffektivAktuelleMahlzeit, rezeptId)}
            onKochModusOeffnen={kochModusOeffnen}
            onZurEinkaufslisteHinzufuegen={rezeptZurEinkaufslisteHinzufuegen}
          />
        ) : ansicht === 'tag' ? (
          <TagAnsicht
            rezepte={rezepte}
            zutatenNachId={zutatenNachId}
            ziel={ziel}
            makroZiele={makroZiele}
            aktiveMahlzeiten={aktiveMahlzeiten}
            tagesauswahl={tagesauswahl}
            onZeileOeffnen={tagZeileOeffnen}
            onZurEinkaufslisteHinzufuegen={tagesauswahlZurEinkaufslisteHinzufuegen}
          />
        ) : ansicht === 'einkaufsliste' ? (
          <EinkaufslisteAnsicht
            liste={einkaufsliste}
            onPostenAbhaken={einkaufslistePostenAbhaken}
            onAbgehakteEntfernen={einkaufslisteAbgehakteEntfernen}
            onListeLeeren={einkaufslisteLeeren}
          />
        ) : null}
        </div>
      </>
    )
  })()

  // Rendering-Weiche: solange der Startbildschirm sichtbar ist, wird
  // naechsteAnsicht (Wizard/Laedt/Hauptansicht, siehe IIFE oben) NICHT in den
  // Baum eingehaengt - sie wird erst gemountet, wenn Startbildschirm.jsx
  // onWeiter aufruft (== setZeigtStartbildschirm(false)), was dort selbst
  // erst NACH Abschluss von dessen eigenem Ausblenden (Logo/Halo/Button,
  // siehe dortige AUSBLEND_DAUER_S) passiert. Zu diesem Zeitpunkt faedet
  // sie DANN mit NAECHSTE_ANSICHT_EINBLEND_DAUER_S ein (siehe Konstante
  // oben) - "direkt danach, keine Pause" aus der Aufgabenstellung.
  // AnimatePresence haelt das Startbildschirm-Overlay parallel dazu noch so
  // lange im DOM, bis dessen eigenes (kurzes) exit-Fade fertig ist (siehe
  // dessen motion.div unten) - da die naechste Ansicht bereits DARUNTER
  // liegt und zu diesem Zeitpunkt schon mitten in ihrer eigenen Einblend-
  // Animation steckt, entsteht durch dieses kurze, ueberlappende
  // Weg-Fade des cremefarbenen Overlays genau der gewuenschte "leicht
  // ueberlappende" Uebergang statt eines harten Schnitts.
  return (
    <>
      {!zeigtStartbildschirm && (
        <motion.div
          key="app-inhalt"
          ref={naechsteAnsichtRef}
          // flex flex-1 min-h-0 flex-col overflow-hidden: fuellt #root (siehe
          // App-Shell-Pattern in index.css) komplett aus, OHNE selbst zu
          // wachsen/zu scrollen - das eigentliche Scrollen passiert
          // ausschliesslich in den inneren Scroll-Regionen darunter (Content-
          // Wrapper weiter unten fuer Rezepte/Tag/Einkaufsliste/
          // Einstellungen, bzw. das eigene h-dvh-Skelett von
          // OnboardingWizard.jsx). min-h-0 ist noetig, damit dieser
          // Flex-Container ueberhaupt kleiner als sein Inhalt werden darf -
          // ohne min-h-0 wuerde sein impliziter min-height:auto verhindern,
          // dass ein zu hoher naechsteAnsicht-Inhalt intern (statt der
          // ganzen Seite) beschnitten wird, siehe dieselbe Problematik
          // bereits geloest in OnboardingWizard.jsx/Kalorienrechner.jsx.
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          initial={
            reduzierteBewegung ? false : { opacity: 0, y: NAECHSTE_ANSICHT_EINBLEND_Y_PX }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduzierteBewegung
              ? { duration: 0.15 }
              : { duration: NAECHSTE_ANSICHT_EINBLEND_DAUER_S, ease: EXPO_OUT }
          }
          onAnimationComplete={() => {
            // Nach Abschluss das von framer-motion gesetzte inline
            // transform:translateY(0px) (aus dem y-Drift oben) wieder
            // entfernen (siehe Kommentar an naechsteAnsichtRef oben) -
            // dieser Wrapper bleibt fuer den Rest der Sitzung bestehen, ein
            // liegen gebliebener (wenn auch optisch wirkungsloser)
            // transform-Wert wuerde sonst DAUERHAFT einen neuen
            // Containing-Block fuer alle darin verschachtelten fixed
            // inset-0-Overlays (KochModus, Kalorienrechner) erzeugen -
            // siehe Aufgabenstellung "Stacking-Kontext-Probleme". Direkte
            // DOM-Mutation statt eines State-Umbaus (z. B. den Wrapper nach
            // Abschluss durch naechsteAnsicht OHNE Wrapper zu ersetzen): ein
            // struktureller Umbau wuerde React dazu bringen, den kompletten
            // Teilbaum (samt OnboardingWizard/Hauptansicht) neu zu mounten
            // (anderer Element-Typ an derselben Stelle - motion.div vs.
            // Fragment/OnboardingWizard direkt), was einen sichtbaren
            // Re-Mount ausloesen wuerde. Die ref bleibt dieselbe motion.div-
            // Instanz ueber die gesamte Sitzung.
            if (naechsteAnsichtRef.current) {
              naechsteAnsichtRef.current.style.transform = ''
            }
          }}
        >
          {naechsteAnsicht}
        </motion.div>
      )}

      {/* eigenes AnimatePresence NUR um den Startbildschirm (nicht um die
          gesamte Rendering-Weiche) - GENAU dieses Muster (Uebergang nur auf
          einer bewusst schlanken, ausschliesslich fuer den Uebergang
          zustaendigen motion.div) ist bereits an mehreren Stellen der App
          etabliert (z. B. Titel-Crossfade in OnboardingWizard.jsx). fixed
          inset-0 + bg-bg + hoher z-index, damit der Startbildschirm waehrend
          seines (kurzen) Weg-Fadens weiterhin die GESAMTE App wie bisher
          verdeckt (unabhaengig von der tatsaechlichen Hoehe von
          naechsteAnsicht darunter) und nicht durch Layout-Fluss verschoben
          wird - dieses Overlay wird nach seinem exit vollstaendig aus dem
          DOM entfernt (AnimatePresence), ein liegen gebliebenes transform
          ist hier also (anders als beim staendig bestehen bleibenden
          app-inhalt-Wrapper oben) unproblematisch. Reines FADE_UEBERGANG
          statt eines eigenen Bezugs auf reduzierte Bewegung: exit ist hier
          in BEIDEN Faellen ein reines Opacity-Fade, nur die Dauer
          unterscheidet sich. */}
      <AnimatePresence>
        {zeigtStartbildschirm && (
          <motion.div
            key="startbildschirm"
            className="fixed inset-0 z-50 bg-bg"
            exit={{ opacity: 0 }}
            transition={reduzierteBewegung ? { duration: 0.15 } : FADE_UEBERGANG}
          >
            <Startbildschirm onWeiter={() => setZeigtStartbildschirm(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App
