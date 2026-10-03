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
  zutatenUndStatusAusTagesauswahl,
} from './einkaufsliste'
import { MAHLZEITEN, standardMahlzeit, aktiveMahlzeitenFuer } from './mahlzeiten'
import { supabase } from './supabase'
import { useTastaturAusgleich } from './useTastaturAusgleich'
import {
  gefiltertePoolFuerRezepte,
  alleAktivenMahlzeitenWuerfeln,
  filterSchluesselFuer,
  rezeptAusStapelZiehen,
  diaetenUmschalten,
} from './rezepteFilter'
import { bilderImHintergrundVorladen } from './bildVorladen'
import { budgetPruefer, budgetSchluessel, korridorFuerMahlzeit } from './budgetFilter'
import { nativeThemeSetzen, useDarstellung } from './theme'
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
// [mahlzeitTyp]: rezeptId | null }, hinzugefuegt: { [mahlzeitTyp]: rezeptId } }.
// hinzugefuegt haelt PRO MAHLZEIT die rezeptId, die zuletzt tatsaechlich zur
// Einkaufsliste hinzugefuegt wurde (siehe tagesauswahlZurEinkaufslisteHinzufuegen
// weiter unten) - bewusst die id selbst statt nur true/false: stimmt sie
// nicht mehr mit mahlzeiten[typ] ueberein (Rezept wurde ausgetauscht), gilt
// die Mahlzeit automatisch wieder als "offen", ohne eigene Invalidierung.
// BEWUSST kein dauerhafter Speiseplan: weicht das gespeicherte datum vom
// heutigen Datum ab (App wurde zuletzt an einem anderen Tag benutzt), werden
// mahlzeiten UND hinzugefuegt verworfen und leer mit heutigem Datum neu
// begonnen (Mitternachts-Reset). Der Vergleich passiert bewusst nur HIER
// beim Laden (lazy initializer), nicht ueber einen laufenden Timer - eine
// App-Sitzung, die exakt ueber Mitternacht hinweg offen bleibt, reset(et)
// also erst beim naechsten Neuladen, analog zu allen anderen
// localStorage-Ladefunktionen in dieser Datei (siehe z. B. zielLaden).
//
// hinzugefuegt ?? {} faengt eine gestern gespeicherte tagesauswahl ab, die
// dieses Feld noch nicht kannte - analog zum supermarktKategorie-Fallback in
// einkaufslisteLaden() (einkaufsliste.js).
function tagesauswahlLaden() {
  const heute = heutigesDatumString()
  try {
    const gespeichert = localStorage.getItem(TAGESAUSWAHL_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return { datum: heute, mahlzeiten: {}, hinzugefuegt: {} }
    }
    const geparst = JSON.parse(gespeichert)
    if (geparst.datum !== heute) {
      return { datum: heute, mahlzeiten: {}, hinzugefuegt: {} }
    }
    return { datum: heute, mahlzeiten: geparst.mahlzeiten ?? {}, hinzugefuegt: geparst.hinzugefuegt ?? {} }
  } catch {
    return { datum: heute, mahlzeiten: {}, hinzugefuegt: {} }
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

const SWIPE_STAPEL_LOCALSTORAGE_KEY = 'gusto-swipe-stapel'

// Laedt den Wiederholungsschutz-Stapel (siehe rezeptAusStapelZiehen in
// rezepteFilter.js) aus dem localStorage. Bewusst OHNE Mitternachts-Reset
// wie bei tagesauswahlLaden - der Stapel ist keine tagesaktuelle Merkliste,
// sondern soll ueber Tage (und App-Neustarts) hinweg erhalten bleiben, damit
// der Wiederholungsschutz ueberhaupt etwas bringt.
function swipeStapelLaden() {
  try {
    const gespeichert = localStorage.getItem(SWIPE_STAPEL_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return {}
    }
    const geparst = JSON.parse(gespeichert)
    return geparst && typeof geparst === 'object' ? geparst : {}
  } catch {
    return {}
  }
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

  // Im Onboarding-Wizard gewaehlte Mahlzeit-Praeferenz (nur relevant, wenn
  // ziel.typ NICHT 'proTag' ist - siehe OnboardingWizard.jsx Schritt 2 und
  // dessen WizardTageskarte-Vorschau). Lazy initializer: wird nur einmal
  // beim ersten Rendern anhand der Uhrzeit berechnet.
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)

  // Aktuell ausgewaehlte Diaetform-Filter (vegan/vegetarisch/glutenfrei),
  // Mehrfachauswahl. Leeres Array = kein Diaet-Filter aktiv, alle Zutaten
  // kommen infrage. Lazy initializer laedt den zuletzt gespeicherten Wert
  // aus dem localStorage (analog zu ziel/aktiveMahlzeiten),
  // damit die im Onboarding gewaehlte Ernaehrungsform einen Reload uebersteht.
  const [diaeten, setDiaeten] = useState(diaetenLaden)

  useEffect(() => {
    localStorage.setItem(DIAETEN_LOCALSTORAGE_KEY, JSON.stringify(diaeten))
  }, [diaeten])

  // Kalorienziel-Einstellung: { typ: 'kein' | 'proMahlzeit' | 'proTag', kalorien }.
  // Lazy initializer laedt den zuletzt gespeicherten Wert aus dem localStorage.
  const [ziel, setZiel] = useState(zielLaden)

  // Darstellung Hell/Dunkel/System (siehe theme.js) - setzt data-theme am <html>.
  const { darstellung, setDarstellung } = useDarstellung()


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

  // Meldet die gewaehlte Darstellung an die native Bruecke (siehe theme.js,
  // nativeThemeSetzen - bewusst der ROHE Modus 'system'/'hell'/'dunkel',
  // nicht das bereits aufgeloeste Theme, siehe dortiger Kommentar zum
  // Kreisschluss-Bugfix). WAEHREND der Onboarding-Wizard sichtbar ist,
  // IMMER 'hell': der Wizard ist bewusst vom Dark Mode ausgeklammert
  // (siehe CLAUDE.md Abschnitt 5), der data-theme="light"-Wrapper um
  // <OnboardingWizard> (weiter unten) deckt nur die WEB-Seite davon ab -
  // die native Oberflaeche (Statusleiste, Tastatur) braucht denselben
  // Zwang separat.
  //
  // GEFUNDENE URSACHE eines Simulator-Bugreports ("Startbildschirm bleibt
  // bei dunklem System hell, obwohl er dem Modus folgen soll"): der
  // native "Wizard erzwingt Hell"-Zwang wirkt ueber overrideUserInterface-
  // Style auf FENSTER-Ebene (siehe ThemeBridge.anwenden) - das faerbt
  // zwangslaeufig AUCH das JS-seitige window.matchMedia('(prefers-color-
  // scheme: dark)') fuer die GESAMTE Seite um (WKWebView leitet ihre
  // eigene Trait-Collection vom Fenster ab), nicht nur den Wizard-
  // Teilbaum. Die Bedingung unten war ZU FRUEH scharf: onboarding-
  // Abgeschlossen ist bereits waehrend des Startbildschirms false (er
  // erscheint VOR dem Wizard, siehe zeigtStartbildschirm-Kommentar), der
  // Zwang zaehlte also faelschlich auch fuer den Startbildschirm, der
  // eigentlich dem echten Modus folgen soll ("folgt dem Modus, damit er
  // zum nativen Splash passt", siehe Startbildschirm.jsx). Deshalb
  // zusaetzlich an zeigtStartbildschirm geprueft: der Zwang gilt nur,
  // wenn der Wizard TATSAECHLICH sichtbar ist (Startbildschirm bereits
  // weg UND Onboarding noch nicht abgeschlossen) - exakt dieselbe
  // Bedingung wie die Rendering-Weiche weiter unten.
  useEffect(() => {
    const wizardSichtbar = !zeigtStartbildschirm && !onboardingAbgeschlossen
    // 'hell' (Wizard) bzw. die GEWAEHLTE Darstellung - bewusst NICHT das
    // bereits aufgeloeste "theme": siehe ausfuehrlicher Kommentar bei
    // nativeThemeSetzen in theme.js (Kreisschluss-Bugfix).
    nativeThemeSetzen(wizardSichtbar ? 'hell' : darstellung)
  }, [darstellung, onboardingAbgeschlossen, zeigtStartbildschirm])


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
  // Merge-Logik) - App-weiter State analog zu ziel/diaeten oben:
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

  // Von TagAnsicht.jsx aufgerufen ("Zur Einkaufsliste"-Button) - liest die
  // komplette tagesaktuelle Rezept-Auswahl direkt aus dem tagesauswahl-State
  // (kein Parameter noetig ausser erzwingen). Pro Mahlzeit, nicht pro Tag:
  // zutatenUndStatusAusTagesauswahl liefert standardmaessig nur die Zutaten
  // der noch NICHT hinzugefuegten Mahlzeiten (siehe tagesauswahlLaden oben -
  // hinzugefuegt[typ] === mahlzeiten[typ]). erzwingen=true (TagAnsicht.jsx
  // nach expliziter Rueckfrage-Bestaetigung, nur wenn ALLE Mahlzeiten schon
  // dran waren) verarbeitet stattdessen wieder alle gesetzten Mahlzeiten.
  function tagesauswahlZurEinkaufslisteHinzufuegen(erzwingen = false) {
    const { zutaten, hinzugefuegt } = zutatenUndStatusAusTagesauswahl(tagesauswahl, rezepte, erzwingen)
    if (zutaten.length === 0) {
      return
    }
    setEinkaufsliste((aktuell) => zutatenHinzufuegen(aktuell, zutaten))
    setTagesauswahl((aktuell) => ({ ...aktuell, hinzugefuegt: { ...aktuell.hinzugefuegt, ...hinzugefuegt } }))
    toastZeigen('Zutaten hinzugefügt')
  }

  function einkaufslistePostenAbhaken(schluessel) {
    setEinkaufsliste((aktuell) => postenAbhaken(aktuell, schluessel))
  }

  function einkaufslisteAbgehakteEntfernen() {
    setEinkaufsliste((aktuell) => abgehakteEntfernen(aktuell))
  }

  // Leeren setzt auch die "hinzugefuegt"-Markierungen zurueck: sonst gilt eine
  // bereits hinzugefuegte Mahlzeit nach dem Leeren weiter als erledigt und
  // wird beim nächsten "Zur Einkaufsliste" stillschweigend übersprungen.
  // "Abgehakte entfernen" lässt sie bewusst stehen (die Mahlzeit wurde ja
  // eingekauft/gekocht, kein Grund, sie erneut anzubieten).
  function einkaufslisteLeeren() {
    setEinkaufsliste([])
    setTagesauswahl((aktuell) => ({ ...aktuell, hinzugefuegt: {} }))
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

  // Hinweis-Badge am Tag-Tab (TabLeiste.jsx): Set der Mahlzeit-Slugs, die seit
  // dem letzten Oeffnen des Tag-Tabs per "Uebernehmen" neu gesetzt wurden -
  // siehe tagesauswahlMahlzeitUebernehmen weiter unten fuers Befuellen.
  // Bewusst REIN In-Memory (kein localStorage, anders als tagesauswahl
  // selbst) - "seit dem letzten Oeffnen" ist ein Session-Konzept, das eine
  // App-Neuinstallation/einen Neustart nicht ueberleben muss.
  const [tagBadgeMahlzeiten, setTagBadgeMahlzeiten] = useState(() => new Set())

  // Leert das Badge, sobald der Tag-Tab tatsaechlich geoeffnet wird. Guard
  // gegen size===0 verhindert ein unnoetiges Set(0)->Set(0)-Update (neue
  // Referenz, aber inhaltlich unveraendert) bei jedem Verweilen auf dem
  // Tag-Tab oder erneuten Anklicken desselben Tabs.
  useEffect(() => {
    if (ansicht === 'tag' && tagBadgeMahlzeiten.size > 0) {
      setTagBadgeMahlzeiten(new Set())
    }
  }, [ansicht, tagBadgeMahlzeiten])

  // Wiederholungsschutz-Stapel fuers Rezepte-Wischen - siehe
  // swipeStapelLaden weiter oben und rezeptAusStapelZiehen in
  // rezepteFilter.js. Anders als tagesauswahl bewusst ohne
  // Mitternachts-Reset: der Stapel soll ueber Tage hinweg erhalten bleiben.
  const [swipeStapel, setSwipeStapel] = useState(swipeStapelLaden)

  useEffect(() => {
    localStorage.setItem(SWIPE_STAPEL_LOCALSTORAGE_KEY, JSON.stringify(swipeStapel))
  }, [swipeStapel])

  // Schreibt rezeptId als "fuer heute uebernommen" fuer EINE Mahlzeit fest -
  // ueberschreibt eine evtl. vorher fuer dieselbe Mahlzeit uebernommene
  // Auswahl. datum bleibt dabei unveraendert (kommt bereits mit heutigem
  // Datum aus tagesauswahlLaden bzw. dieser Funktion selbst).
  function tagesauswahlMahlzeitUebernehmen(mahlzeitTyp, rezeptId) {
    setTagesauswahl((aktuell) => ({
      ...aktuell,
      mahlzeiten: { ...aktuell.mahlzeiten, [mahlzeitTyp]: rezeptId },
    }))
    // Hinweis-Badge am Tag-Tab (TabLeiste.jsx) - zaehlt Mahlzeiten, nicht
    // Klicks: ist mahlzeitTyp schon im Set, wird dieselbe Set-Referenz
    // zurueckgegeben, React ueberspringt den Re-Render dafuer komplett
    // (Object.is-Vergleich bei useState-Updatern) - ein zweimaliges
    // Austauschen desselben Slots loest also weder eine hoehere Zahl noch
    // einen erneuten Pop aus.
    setTagBadgeMahlzeiten((aktuell) => (aktuell.has(mahlzeitTyp) ? aktuell : new Set(aktuell).add(mahlzeitTyp)))
  }

  // Wird von TagAnsicht.jsx aufgerufen (Wisch-nach-links-Aktion auf einer
  // BEFUELLTEN Mahlzeit-Zeile, siehe TagZeile dort) - macht die Uebernahme
  // rueckgaengig, die Zeile faellt danach in ihren Platzhalter-Zustand
  // zurueck (derselbe rezeptId==null-Fall wie "noch nie etwas gewaehlt",
  // TagAnsicht behandelt beides bereits identisch).
  function tagesauswahlMahlzeitEntfernen(mahlzeitTyp) {
    setTagesauswahl((aktuell) => ({
      ...aktuell,
      mahlzeiten: { ...aktuell.mahlzeiten, [mahlzeitTyp]: null },
    }))
  }

  // Wird von TagAnsicht.jsx aufgerufen (Tap auf eine LEERE Mahlzeit-Zeile) -
  // springt in den Swipe-Modus fuer GENAU diese Mahlzeit, um erstmalig ein
  // Rezept zu waehlen. Ein Tap auf eine BEREITS befuellte Zeile oeffnet
  // stattdessen direkt den Kochmodus (siehe onKochModusOeffnen-Verwendung in
  // TagAnsicht.jsx) - dieselbe Geste wie an der Swipe-Karte selbst (siehe
  // dortiger onTap-Kommentar), UND vermeidet, dass ein bereits gewaehltes
  // Rezept aus Versehen ueberschrieben wird, nur weil man es sich nochmal
  // ansehen wollte.
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
  // diaeten/ziel/aktiveMahlzeiten oben, die aus demselben Grund
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

  // Leeres Array [] als zweites Argument: dieser Code laeuft nur EINMAL,
  // wenn die Komponente zum ersten Mal angezeigt wird.
  useEffect(() => {
    async function zutatenLaden() {
      const rezepteErgebnis = await supabase
        .from('rezepte')
        .select(
          'id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten, ' +
            'anleitung, zubereitungszeit_min, ' +
            'portionen, tipps, kcal_pro_portion, protein_pro_portion, carbs_pro_portion, fett_pro_portion, ' +
            'rezept_zutaten(zutat_id, menge_g, anzeige_menge, anzeige_einheit, anmerkung, optional, sortierung, ' +
            'zutaten(id, name, kategorie, supermarkt_kategorie, ist_grundzutat, roh_faktor, einkaufseinheit, einheitengewicht_g))'
        )
        .order('sortierung', { referencedTable: 'rezept_zutaten' })

      if (rezepteErgebnis.error) {
        // Rezepte sind (noch) nicht kritisch fuer die Haupt-Ansicht - ein
        // Fehler hier soll nicht die ganze App blockieren, nur die
        // Rezepte-Ansicht bleibt dann leer (siehe RezepteSwipeAnsicht.jsx,
        // zeigt in dem Fall den "kein Rezept gefunden"-Hinweistext).
        console.error('Fehler beim Laden der Rezepte:', rezepteErgebnis.error)
      }

      const rezepteDaten = rezepteErgebnis.data ?? []
      setRezepte(rezepteDaten)

      // Direkt eine erste Auswahl PRO AKTIVER MAHLZEIT fuer den Rezepte-Tab
      // wuerfeln - der eigentliche Grund, warum rezepteProMahlzeitState
      // (siehe Kommentar dort) ueberhaupt bereits VOR dem ersten Rendern der
      // Rezepte-Ansicht einen echten Wert hat, statt erst per Folge-Effekt in
      // RezepteSwipeAnsicht.jsx selbst - genau das war die Ursache des
      // Flackerns (siehe Bugfix-Hintergrund weiter oben). Verwendet bewusst
      // rezepteDaten direkt (nicht den rezepte-State, der ist in diesem
      // Funktionsdurchlauf noch nicht aktualisiert). swipeStapel kommt aus
      // dem localStorage-Ladewert (swipeStapelLaden), da dieser Effekt nur
      // einmal beim Mount laeuft.
      const ersteAuswahl = alleAktivenMahlzeitenWuerfeln(
        aktiveMahlzeitenFuer(aktiveMahlzeiten),
        rezepteDaten,
        diaeten,
        {},
        swipeStapel,
        (slug, pool) => budgetPrueferFuerMahlzeit(slug, pool, aktiveMahlzeiten, rezepteDaten)
      )
      setRezepteProMahlzeitState(ersteAuswahl.rezepteProMahlzeitState)
      setSwipeStapel(ersteAuswahl.stapel)

      setLaedt(false)
    }

    zutatenLaden()
  }, [])

  // Bilder-Vorladen im Hintergrund (Zeitpunkt bewusst erst NACH dem
  // Startbildschirm, damit der Marken-Moment nicht mit Bild-Requests um
  // Bandbreite konkurriert).
  // Laeuft nach JEDEM Ziehen/Wechsel (nicht nur einmal beim Start), damit die
  // naechsten Karten schon im Cache liegen, bevor man sie braucht. Doppelte
  // Anforderungen verhindert bildVorladen.js (Set pro Sitzung).
  //
  // NICHT alle Rezeptbilder vorladen (Befund 03.10.2026): das waren bei jedem
  // Kaltstart ~100 Bilder (~40 MB mobile Daten pro Nutzer und Start) und hat
  // zusammen mit den Testlaeufen das Supabase-Egress-Kontingent gesprengt
  // (70 GB bei 5 GB Limit). Stattdessen nur, was als Naechstes wirklich
  // gebraucht wird:
  //  (1) die jetzt sichtbaren Karten je Mahlzeit,
  //  (2) im Wiederholungsschutz-Stapel (swipeStapel: reihenfolge/position,
  //      siehe rezepteFilter.js - exakt die Reihenfolge, in der gewuerfelt
  //      wird) die naechsten 3 Rezepte der AKTUELLEN Mahlzeit und das
  //      naechste je anderer Mahlzeit (falls man die Mahlzeit wechselt).
  // Ist ein Bild trotzdem noch nicht da, zeigt die Karte sofort Titel/Makros
  // auf ruhigem Platzhalter und blendet das Bild ein (RezeptSchwipKarte.jsx).
  // Hartes Limit pro Aufruf gegen unerwartet viele Eintraege.
  useEffect(() => {
    if (rezepte.length === 0 || zeigtStartbildschirm) {
      return
    }
    const VORLADE_LIMIT = 12
    const LOOKAHEAD_AKTUELLE_MAHLZEIT = 3
    const LOOKAHEAD_ANDERE_MAHLZEIT = 1
    const bildNachId = new Map(rezepte.map((r) => [r.id, r.bild_url]))
    const prioritaet = Object.values(rezepteProMahlzeitState).map((eintrag) => eintrag?.rezept?.bild_url)
    const lookahead = aktiveMahlzeitenFuer(aktiveMahlzeiten).flatMap(({ slug }) => {
      const eigenschaft = rezepteProMahlzeitState[slug]?.eigenschaft ?? ''
      const eintrag = swipeStapel?.[slug]?.[filterSchluesselFuer(diaeten, eigenschaft)]
      const anzahl = slug === rezepteAktuelleMahlzeit ? LOOKAHEAD_AKTUELLE_MAHLZEIT : LOOKAHEAD_ANDERE_MAHLZEIT
      return (eintrag?.reihenfolge ?? []).slice(eintrag?.position ?? 0, (eintrag?.position ?? 0) + anzahl).map((id) => bildNachId.get(id))
    })
    const zuLaden = [...new Set([...prioritaet, ...lookahead].filter(Boolean))].slice(0, VORLADE_LIMIT)
    bilderImHintergrundVorladen(zuLaden, 2)
  }, [rezepte, zeigtStartbildschirm, rezepteProMahlzeitState, swipeStapel, rezepteAktuelleMahlzeit, aktiveMahlzeiten, diaeten])

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
    const neueDiaeten = diaetenUmschalten(diaeten, slug)

    setDiaeten(neueDiaeten)

    // Unconditional (nicht nur wenn der Rezepte-Tab gerade sichtbar ist),
    // damit die Auswahl beim naechsten Oeffnen schon zur neuen Diaet-Auswahl
    // passt, statt veraltet im Cache zu haengen (siehe rezepteProMahlzeitState-
    // Kommentar weiter oben).
    const neueAuswahl = alleAktivenMahlzeitenWuerfeln(
      aktiveMahlzeitenFuer(aktiveMahlzeiten),
      rezepte,
      neueDiaeten,
      rezepteProMahlzeitState,
      swipeStapel,
      (slug, pool) => budgetPrueferFuerMahlzeit(slug, pool, aktiveMahlzeiten)
    )
    setRezepteProMahlzeitState(neueAuswahl.rezepteProMahlzeitState)
    setSwipeStapel(neueAuswahl.stapel)
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
    const neueAuswahl = alleAktivenMahlzeitenWuerfeln(
      aktiveMahlzeitenFuer(neueMahlzeiten),
      rezepte,
      diaeten,
      rezepteProMahlzeitState,
      swipeStapel,
      (slug, pool) => budgetPrueferFuerMahlzeit(slug, pool, neueMahlzeiten)
    )
    setRezepteProMahlzeitState(neueAuswahl.rezepteProMahlzeitState)
    setSwipeStapel(neueAuswahl.stapel)
  }

  // --- Budget-gewichtete Auswahl (siehe budgetFilter.js) ---

  // passtZuBudget-Pruefer fuer EINE Mahlzeit auf Basis des aktuellen Ziels
  // und der tagesaktuellen Auswahl (undefined = kein Budget, alles passt).
  // aktiveSlugs/rezepteListe sind ueberschreibbar, weil manche Aufrufer
  // (Mahlzeiten-Wechsel, erstes Laden) mit NEUEREN Werten arbeiten, als der
  // State im aktuellen Funktionsdurchlauf schon hergibt.
  function budgetPrueferFuerMahlzeit(slug, pool, aktiveSlugs = aktiveMahlzeiten, rezepteListe = rezepte) {
    return budgetPruefer(pool, korridorFuerMahlzeit(ziel, aktiveSlugs, tagesauswahl.mahlzeiten, rezepteListe, slug))
  }

  // Stilles Neuziehen: aendert sich das Budget einer Mahlzeit (Ziel geaendert,
  // anderswo ein Rezept uebernommen/entfernt, Mahlzeit ein-/ausgeschaltet),
  // wird ihr bereits gezogener Kandidat NUR dann ersetzt, wenn er nicht mehr
  // zum neuen Budget passt - passt er noch, bleibt er stehen. Die aktuell
  // sichtbare Karte kann sich dabei nie unter den Fingern aendern: das Budget
  // einer Mahlzeit haengt nur von den Auswahlen der ANDEREN Mahlzeiten und
  // vom Ziel ab (siehe mahlzeitBudget), beides passiert nicht auf ihrer
  // eigenen Karte - Uebernehmen aendert nur die Budgets der uebrigen.
  // BEWUSST hier auf App-Ebene als Effekt (nicht in RezepteSwipeAnsicht):
  // die Ansicht unmountet bei jedem Tab-Wechsel, ein Effekt dort wuerde
  // genau das Flackern zurueckbringen, siehe rezepteProMahlzeitState-Kommentar.
  // budgetSchluesselRef merkt sich den zuletzt verarbeiteten Korridor pro
  // Mahlzeit, damit nur ECHTE Aenderungen etwas ziehen (und ein doppelter
  // Effekt-Lauf in StrictMode nichts doppelt verbrennt).
  const budgetSchluesselRef = useRef({})
  useEffect(() => {
    if (rezepte.length === 0 || Object.keys(rezepteProMahlzeitState).length === 0) {
      return
    }
    let laufenderStapel = swipeStapel
    let neuerStand = rezepteProMahlzeitState
    for (const { slug } of aktiveMahlzeitenFuer(aktiveMahlzeiten)) {
      const korridor = korridorFuerMahlzeit(ziel, aktiveMahlzeiten, tagesauswahl.mahlzeiten, rezepte, slug)
      const schluessel = budgetSchluessel(korridor)
      if (budgetSchluesselRef.current[slug] === schluessel) {
        continue
      }
      const warVorher = slug in budgetSchluesselRef.current
      budgetSchluesselRef.current[slug] = schluessel
      const eintrag = neuerStand[slug]
      if (!warVorher || !eintrag?.rezept) {
        // Erster Lauf nach dem Laden: der Kandidat wurde bereits mit genau
        // diesem Budget gezogen (siehe zutatenLaden).
        continue
      }
      const eigenschaft = eintrag.eigenschaft ?? ''
      const pool = gefiltertePoolFuerRezepte(rezepte, slug, diaeten, eigenschaft)
      const pruefer = budgetPruefer(pool, korridor)
      if (!pruefer || pruefer(eintrag.rezept)) {
        continue
      }
      const ergebnis = rezeptAusStapelZiehen(laufenderStapel, slug, filterSchluesselFuer(diaeten, eigenschaft), pool, pruefer)
      laufenderStapel = ergebnis.stapel
      neuerStand = { ...neuerStand, [slug]: { eigenschaft, rezept: ergebnis.rezept } }
    }
    if (neuerStand !== rezepteProMahlzeitState) {
      setSwipeStapel(laufenderStapel)
      setRezepteProMahlzeitState(neuerStand)
    }
  }, [ziel, tagesauswahl.mahlzeiten, aktiveMahlzeiten, rezepte, rezepteProMahlzeitState])

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
    if ((rezepteProMahlzeitState[rezepteEffektivAktuelleMahlzeit]?.eigenschaft ?? '') === neueEigenschaft) {
      return
    }
    const pool = gefiltertePoolFuerRezepte(rezepte, rezepteEffektivAktuelleMahlzeit, diaeten, neueEigenschaft)
    const filterSchluessel = filterSchluesselFuer(diaeten, neueEigenschaft)
    const { rezept, stapel } = rezeptAusStapelZiehen(
      swipeStapel,
      rezepteEffektivAktuelleMahlzeit,
      filterSchluessel,
      pool,
      budgetPrueferFuerMahlzeit(rezepteEffektivAktuelleMahlzeit, pool, aktiveMahlzeiten)
    )
    setSwipeStapel(stapel)
    setRezepteProMahlzeitState((aktuell) => ({
      ...aktuell,
      [rezepteEffektivAktuelleMahlzeit]: { eigenschaft: neueEigenschaft, rezept },
    }))
  }

  // Bestaetigen des Filter-Sheets (FilterSheet.jsx): setzt Diaet UND die
  // Suess/Deftig-Eigenschaft der aktuell gezeigten Mahlzeit GEMEINSAM in
  // einem Rutsch und wuerfelt genau EINMAL neu - bewusst NICHT einfach
  // diaetenAendern gefolgt von rezepteEigenschaftFuerMahlzeitAendern
  // aufgerufen, weil setState asynchron ist: der zweite Aufruf wuerde ueber
  // den "diaeten"-Closure-Wert noch die ALTE Diaet-Auswahl sehen und einen
  // Zwischen-Wuerfelwurf mit falscher Kombination ausloesen. diaeten ist
  // unveraendert der App-weite Ernaehrungsform-Filter (identisch mit
  // Onboarding/Einstellungen, siehe FilterSheet.jsx-Hinweistext dazu) -
  // deshalb wuerfelt ein Diaet-Wechsel hier wie bisher ALLE aktiven
  // Mahlzeiten neu, waehrend die Eigenschaft nur die aktuell gezeigte
  // Mahlzeit betrifft (siehe rezepteEigenschaftFuerMahlzeitAendern oben).
  function rezepteFilterAnwenden(neueDiaeten, neueEigenschaftFuerAktuelleMahlzeit) {
    setDiaeten(neueDiaeten)
    const standMitNeuerEigenschaft = {
      ...rezepteProMahlzeitState,
      [rezepteEffektivAktuelleMahlzeit]: {
        ...rezepteProMahlzeitState[rezepteEffektivAktuelleMahlzeit],
        eigenschaft: neueEigenschaftFuerAktuelleMahlzeit,
      },
    }
    const neueAuswahl = alleAktivenMahlzeitenWuerfeln(
      rezepteAktiveMahlzeitenListe,
      rezepte,
      neueDiaeten,
      standMitNeuerEigenschaft,
      swipeStapel,
      (slug, pool) => budgetPrueferFuerMahlzeit(slug, pool, aktiveMahlzeiten)
    )
    setRezepteProMahlzeitState(neueAuswahl.rezepteProMahlzeitState)
    setSwipeStapel(neueAuswahl.stapel)
  }

  // "Neu würfeln" (Wisch nach links) in RezepteSwipeAnsicht.jsx - trifft NUR
  // die gerade angezeigte Mahlzeit, alle anderen behalten ihr Rezept. Zieht
  // aus dem Wiederholungsschutz-Stapel statt rein zufaellig (siehe
  // rezeptAusStapelZiehen in rezepteFilter.js).
  function rezepteMahlzeitTabWuerfeln() {
    const eigenschaftFuerMahlzeit = rezepteProMahlzeitState[rezepteEffektivAktuelleMahlzeit]?.eigenschaft ?? ''
    const pool = gefiltertePoolFuerRezepte(rezepte, rezepteEffektivAktuelleMahlzeit, diaeten, eigenschaftFuerMahlzeit)
    const filterSchluessel = filterSchluesselFuer(diaeten, eigenschaftFuerMahlzeit)
    const { rezept, stapel } = rezeptAusStapelZiehen(
      swipeStapel,
      rezepteEffektivAktuelleMahlzeit,
      filterSchluessel,
      pool,
      budgetPrueferFuerMahlzeit(rezepteEffektivAktuelleMahlzeit, pool, aktiveMahlzeiten)
    )
    setSwipeStapel(stapel)
    setRezepteProMahlzeitState((aktuell) => ({
      ...aktuell,
      [rezepteEffektivAktuelleMahlzeit]: {
        eigenschaft: eigenschaftFuerMahlzeit,
        rezept,
      },
    }))
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
        // Der Wizard ist vom Dark Mode ausgeklammert (er wird spaeter neu gebaut)
        // und bleibt IMMER hell: data-theme="light" deklariert die hellen Tokens
        // fuer den ganzen Teilbaum neu (index.css). display:contents = keine Box,
        // kein Transform, kein Layout-Einfluss - die Wizard-Choreografie bleibt
        // unberuehrt, der Wizard-Root ist weiterhin direktes Flex-Kind.
        <div data-theme="light" className="contents">
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
        </div>
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
        <TabLeiste aktiverTab={ansicht} onTabWaehlen={setAnsicht} tagBadgeAnzahl={tagBadgeMahlzeiten.size} />

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
            trotzdem einmal horizontal "gescrollt" wuerde.

            NACHTRAG (naechste Testrunde): urspruenglich bewusst NUR auf der
            X-Achse (nicht overscroll-none), mit der Annahme, dass normales,
            von iOS-Nutzern erwartetes vertikales Rubber-Banding an oberer/
            unterer Kante erwuenscht bleibt. Real-Device-Test zeigte danach
            aber ein NEU aufgetretenes elastisches Wippen auf dem Rezepte-
            Swipe-Screen, obwohl dessen Inhalt gar nicht ueberlaeuft - touch-
            action:pan-y aktiviert dort explizit vertikales Pannen, und OHNE
            overscroll-behavior-y bekommt WebKits interne WKChildScrollView
            trotzdem ihr natives Rand-Wippen, obwohl es fachlich nichts zu
            "ueberziehen" gibt. overscroll-none (statt weiterhin nur
            overscroll-x-none) unterbindet zusaetzlich dieses Y-Wippen -
            WICHTIG laut Spec: overscroll-behavior betrifft nur das
            elastische Rand-Verhalten UND das Scroll-Chaining zum Elternteil,
            NICHT das normale Scrollen selbst bei tatsaechlichem Overflow
            (Tag-Tab bei vielen Mahlzeiten, Einstellungen scrollen dadurch
            unveraendert normal weiter).

            NACHTRAG 2 (EIGENTLICHE URSACHE des ganzen "Karte laesst sich
            horizontal verschieben"-Raetsels, endlich gefunden): Nach dem
            overscroll-none-Fix oben blieb die native WKChildScrollView
            dieses Containers laut Laufzeit-Log dauerhaft bei einem
            NICHT-elastischen contentOffset von (16.0, 0.0) haengen, statt
            wie zuvor durch das Bounce-Zurueckfedern kaschiert zu werden.
            Per gezieltem DOM-Test bestaetigt: dieser Container hat (weil
            nur overflow-y-auto gesetzt wurde) laut getComputedStyle
            EFFEKTIV overflow-x:auto, NICHT visible - CSS-Spec-Regel:
            "wenn eine Achse ungleich visible/clip ist und die andere
            visible waere, wird die visible-Achse zu auto befoerdert".
            WebKit legt fuer overflow:auto/scroll-Container eine native,
            horizontal scrollfaehige ScrollView an, fuer overflow:hidden
            dagegen NICHT. Waehrend des Wisch-Ziehens der Rezept-Karte
            (RezeptSchwipKarte.jsx, x/rotate-Transform auf dem
            motion.div) wird diese Karte von KEINEM Vorfahren bis hinauf
            zu diesem Wrapper geclippt (der direkte aspect-[3/4]-Elternteil
            hat overflow:visible) - per direktem Transform-Test gemessen:
            card.style.transform = translateX(150px) erzeugt hier real
            ~157px zusaetzlichen scrollWidth. Mit dem oben effektiv
            aktiven overflow-x:auto haelt WebKits Scrolling-Koordinator
            das fuer echten (wenn auch nur waehrend der Geste
            existierenden) horizontalen Scrollinhalt und laesst der
            nativen ScrollView einen entsprechenden contentOffset-
            Spielraum - nach Geste-Ende blieb dieser (ohne die jetzt
            fehlende Bounce-Rueckfederung) auf einem Zwischenwert stehen.
            overflow-x-hidden (Tailwind) setzt overflow-x EXPLIZIT (statt
            es auf visible zu belassen und der Spec-Koerzion zu
            ueberlassen) - das verhindert die auto-Beforderung komplett,
            WebKit legt fuer diesen Container dann gar keine horizontal
            scrollfaehige native ScrollView mehr an. Visuell unkritisch:
            die Karte SOLL beim tatsaechlichen Swipe ohnehin komplett aus
            dem Bild fliegen (siehe SWIPE_AUSTRITT_PX in
            RezeptSchwipKarte.jsx) - overflow-x-hidden clippt das jetzt
            zusaetzlich sauber, statt es dem Zufall/Viewport-Rand zu
            ueberlassen. */}
        <div className="flex-1 min-h-0 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-none pb-[calc(96px_+_env(safe-area-inset-bottom))] pt-[calc(1rem_+_env(safe-area-inset-top))]">
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
            darstellung={darstellung}
            onDarstellungAendern={setDarstellung}
          />
        ) : ansicht === 'rezepte' ? (
          <RezepteSwipeAnsicht
            rezepteGeladen={!laedt}
            rezepte={rezepte}
            diaeten={diaeten}
            onDiaetenAendern={diaetenAendern}
            aktiveMahlzeiten={aktiveMahlzeiten}
            aktuelleMahlzeit={rezepteEffektivAktuelleMahlzeit}
            onMahlzeitAendern={setRezepteAktuelleMahlzeit}
            proMahlzeitState={rezepteProMahlzeitState}
            onEigenschaftAendern={rezepteEigenschaftFuerMahlzeitAendern}
            onFilterAnwenden={rezepteFilterAnwenden}
            onWuerfeln={rezepteMahlzeitTabWuerfeln}
            onUebernehmen={(rezeptId) => tagesauswahlMahlzeitUebernehmen(rezepteEffektivAktuelleMahlzeit, rezeptId)}
            onKochModusOeffnen={kochModusOeffnen}
          />
        ) : ansicht === 'tag' ? (
          <TagAnsicht
            rezepte={rezepte}
            ziel={ziel}
            aktiveMahlzeiten={aktiveMahlzeiten}
            tagesauswahl={tagesauswahl}
            onZeileOeffnen={tagZeileOeffnen}
            onZeileEntfernen={tagesauswahlMahlzeitEntfernen}
            onKochModusOeffnen={kochModusOeffnen}
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
