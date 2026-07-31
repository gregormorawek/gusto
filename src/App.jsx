import { useEffect, useState } from 'react'
import './App.css'
import SlotKarte from './components/SlotKarte'
import MahlzeitFilter from './components/MahlzeitFilter'
import TagesplanAnsicht from './components/TagesplanAnsicht'
import OnboardingWizard from './components/OnboardingWizard'
import EinstellungenPanel from './components/EinstellungenPanel'
import { MAHLZEITEN } from './mahlzeiten'
import { supabase } from './supabase'

// Feste Reihenfolge der Mahlzeit-Typen fuer den Tagesplan, uebernommen aus
// den Filter-Slugs (fruehstueck, mittag, abend, snack).
const MAHLZEIT_REIHENFOLGE = MAHLZEITEN.map((m) => m.slug)

const ZIEL_LOCALSTORAGE_KEY = 'gusto-ziel'

// Standard-Ziel: kein Kalorienziel, kein Makro-Gesamtziel fuer den Tag.
const ZIEL_STANDARD = { typ: 'kein', kalorien: '', makro: { protein: '', carbs: '', fett: '' } }

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

// Hilfsfunktion: gibt aus einer beliebigen Liste ein zufaelliges Element zurueck.
function zufaelligesElement(liste) {
  const zufallsIndex = Math.floor(Math.random() * liste.length)
  return liste[zufallsIndex]
}

// Ermittelt anhand der Uhrzeit einen sinnvollen Standard-Filter,
// z. B. morgens vorausgewaehlt "fruehstueck".
function standardMahlzeit(datum = new Date()) {
  const stunde = datum.getHours()
  if (stunde >= 5 && stunde < 11) return 'fruehstueck'
  if (stunde >= 11 && stunde < 15) return 'mittag'
  if (stunde >= 15 && stunde < 18) return 'snack'
  if (stunde >= 18 && stunde < 22) return 'abend'
  return 'snack'
}

// Filtert eine Zutaten-Liste auf die, deren kommaseparierte "mahlzeiten"-Spalte
// den gewuenschten Filter enthaelt. Ist das Ergebnis leer (z. B. weil die
// Kategorie noch keine passend getaggten Zutaten hat), wird auf die
// ungefilterte Liste zurueckgefallen, statt eine leere Auswahl zu liefern.
function nachMahlzeitGefiltert(liste, mahlzeit) {
  const passt = liste.filter((z) =>
    (z.mahlzeiten ?? '').split(',').map((m) => m.trim()).includes(mahlzeit)
  )
  return passt.length > 0 ? passt : liste
}

// Filtert eine Zutaten-Liste auf die, deren kommaseparierte "diaeten"-Spalte
// ALLE aktuell ausgewaehlten Diaetformen enthaelt. Keine Auswahl (oder die
// Auswahl "keine" = Keine Einschraenkung, die kein echter DB-Tag ist) = Filter
// inaktiv, komplette Liste bleibt bestehen. Ist das Ergebnis leer (z. B. weil
// die Kategorie noch keine passend getaggten Zutaten hat), wird auf die
// ungefilterte Liste zurueckgefallen, statt eine leere Auswahl zu liefern.
function nachDiaetenGefiltert(liste, ausgewaehlteDiaeten) {
  const aktiveDiaeten = ausgewaehlteDiaeten.filter((d) => d !== 'keine')
  if (aktiveDiaeten.length === 0) {
    return liste
  }

  const passt = liste.filter((z) => {
    const vorhandeneDiaeten = (z.diaeten ?? '').split(',').map((d) => d.trim())
    return aktiveDiaeten.every((d) => vorhandeneDiaeten.includes(d))
  })
  return passt.length > 0 ? passt : liste
}

// Wendet Mahlzeit- und Diaet-Filter nacheinander auf eine Zutaten-Liste an.
function gefiltertePoolFuer(liste, mahlzeitWert, diaetenWert) {
  return nachDiaetenGefiltert(nachMahlzeitGefiltert(liste, mahlzeitWert), diaetenWert)
}

// Hilfsfunktion: rechnet einen 100g-Referenzwert (z. B. Kalorien pro 100g)
// auf die tatsaechliche Portionsgroesse der Zutat um.
function aufPortionSkalieren(wertPro100g, portionsGroesseInGramm) {
  return (wertPro100g / 100) * portionsGroesseInGramm
}

// Anteil der Tages-Kalorien, der bei ziel.typ === 'proTag' auf die jeweilige
// Mahlzeit entfaellt.
const TAGES_ANTEIL = { fruehstueck: 0.25, mittag: 0.35, abend: 0.3, snack: 0.1 }

// Ermittelt das Kalorienziel fuer EINE Mahlzeit-Kategorie, abhaengig vom
// gewaehlten Ziel-Typ. Gibt null zurueck, wenn kein Ziel aktiv ist oder die
// eingegebene Kalorienzahl (noch) ungueltig ist - in dem Fall bleibt die
// Portion unskaliert (Faktor 1).
function zielKalorienFuerMahlzeit(zielWert, mahlzeitWert) {
  const kalorienZahl = Number(zielWert.kalorien)
  if (zielWert.typ === 'kein' || !kalorienZahl || kalorienZahl <= 0) {
    return null
  }
  if (zielWert.typ === 'proMahlzeit') {
    return kalorienZahl
  }
  return kalorienZahl * (TAGES_ANTEIL[mahlzeitWert] ?? 0)
}

// Teilt einen einzelnen Wert des Tages-Makroziels (Gramm) mit demselben
// TAGES_ANTEIL-Schluessel wie das Kalorienziel auf eine Mahlzeit auf. Leerer/
// ungueltiger Wert ergibt '' (kein Ziel fuer diese Mahlzeit).
function tagesMakroAnteilBerechnen(tagesWert, anteil) {
  const zahl = Number(tagesWert)
  if (!zahl || zahl <= 0) {
    return ''
  }
  return String(Math.round(zahl * anteil))
}

// Leitet aus dem Tages-Makroziel (zielWert.makro) das Makro-Ziel fuer EINE
// Mahlzeit ab. Rein lokale Berechnung fuer den Tagesplan - liest/schreibt
// NICHT den makroZiele-State, der ausschliesslich der Einzel-Ansicht
// vorbehalten ist (beide Ansichten haben also getrennte Makro-Ziel-Quellen).
function makroZielFuerMahlzeitAusTagesziel(zielWert, mahlzeitWert) {
  const anteil = TAGES_ANTEIL[mahlzeitWert] ?? 0
  return {
    protein: tagesMakroAnteilBerechnen(zielWert.makro.protein, anteil),
    carbs: tagesMakroAnteilBerechnen(zielWert.makro.carbs, anteil),
    fett: tagesMakroAnteilBerechnen(zielWert.makro.fett, anteil),
  }
}

// Berechnet den Faktor, mit dem alle vier Portionen GLEICHMAESSIG multipliziert
// werden, damit die Kalorien-Summe moeglichst nah am Ziel liegt. Kalorien
// skalieren linear mit der Portionsgroesse, deshalb trifft zielKalorien /
// basisKalorien das Ziel exakt - ausser die Grenze (50%-200% der urspruenglichen
// Portion) wird ueberschritten, dann kommt der naechstmoegliche Wert heraus.
function skalierungsfaktorBerechnen(zielKalorien, basisKalorien) {
  if (zielKalorien === null || basisKalorien <= 0) {
    return 1
  }
  return Math.min(2, Math.max(0.5, zielKalorien / basisKalorien))
}

// Berechnet aus den vier (ungefilterten, in ihrer Datenbank-Portionsgroesse
// vorliegenden) Zutaten die neuen, gleichmaessig skalierten Portionsgroessen
// fuer die angegebene Mahlzeit und das aktuelle Kalorienziel. Ohne aktives
// Ziel ist der Faktor 1, die Portionen bleiben also beim Datenbank-Wert.
function portionenBerechnen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, zielWert) {
  const basisKalorien =
    aufPortionSkalieren(proteinZutat.kalorien, proteinZutat.portion_g) +
    aufPortionSkalieren(carbsZutat.kalorien, carbsZutat.portion_g) +
    aufPortionSkalieren(fettZutat.kalorien, fettZutat.portion_g) +
    aufPortionSkalieren(gemueseZutat.kalorien, gemueseZutat.portion_g)

  const faktor = skalierungsfaktorBerechnen(zielKalorienFuerMahlzeit(zielWert, mahlzeitWert), basisKalorien)

  return {
    proteinPortion: Math.round(proteinZutat.portion_g * faktor),
    carbsPortion: Math.round(carbsZutat.portion_g * faktor),
    fettPortion: Math.round(fettZutat.portion_g * faktor),
    gemuesePortion: Math.round(gemueseZutat.portion_g * faktor),
  }
}

// Passt EINE Portion so an, dass ihr Makro-Wert (in Gramm) moeglichst nah am
// Ziel liegt - in beide Richtungen -, waehrend die Kalorien-Summe der GESAMTEN
// Mahlzeit innerhalb von +-15% von referenzKalorien bleibt. kalorienAndereSlots
// sind die (bereits feststehenden) Kalorien der jeweils anderen drei Slots.
// Ist das Ziel mit der Toleranz nicht vereinbar, wird die Portion so weit wie
// moeglich angepasst (bestmoegliche Annaeherung) und erreichbar = false gesetzt.
function makroZielPortionBerechnen(zutat, aktuellePortion, zielGramm, naehrwertSchluessel, kalorienAndereSlots, referenzKalorien) {
  if (!zielGramm || zielGramm <= 0) {
    return { portion: aktuellePortion, erreichbar: true }
  }

  const naehrwertProGramm = zutat[naehrwertSchluessel] / 100
  if (naehrwertProGramm <= 0) {
    // Die Zutat traegt dieses Makro gar nicht - das Ziel ist prinzipiell unerreichbar.
    return { portion: aktuellePortion, erreichbar: false }
  }

  const kandidatPortion = zielGramm / naehrwertProGramm
  const kalorienProGramm = zutat.kalorien / 100
  if (kalorienProGramm <= 0) {
    // Kalorienfreie Zutat: die Toleranz-Grenze betrifft diese Portion nicht.
    return { portion: Math.round(kandidatPortion), erreichbar: true }
  }

  const portionMin = Math.max(0, (referenzKalorien * 0.85 - kalorienAndereSlots) / kalorienProGramm)
  const portionMax = Math.max(0, (referenzKalorien * 1.15 - kalorienAndereSlots) / kalorienProGramm)
  const geklemmtePortion = Math.min(portionMax, Math.max(portionMin, kandidatPortion))

  return {
    portion: Math.round(geklemmtePortion),
    erreichbar: Math.abs(geklemmtePortion - kandidatPortion) < 0.5,
  }
}

// Wendet zuerst die bestehende, gleichmaessige Kalorienziel-Skalierung an und
// passt danach - falls gesetzt - Protein-, Carbs- und Fett-Portion NACHEINANDER
// an ihr jeweiliges Makro-Ziel an (Gemuese hat kein Makro-Ziel). Jede Anpassung
// bezieht sich auf den bis dahin aktuellen Kalorien-Stand der Mahlzeit, d. h.
// die Reihenfolge Protein -> Carbs -> Fett kann das Ergebnis beeinflussen, wenn
// mehrere Ziele gleichzeitig gesetzt sind und die Toleranz knapp wird.
function portionenMitMakroZielenBerechnen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, zielWert, makroZieleWert) {
  const basisPortionen = portionenBerechnen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, zielWert)

  const zielKalorien = zielKalorienFuerMahlzeit(zielWert, mahlzeitWert)
  const kalorienVorMakroAnpassung =
    aufPortionSkalieren(proteinZutat.kalorien, basisPortionen.proteinPortion) +
    aufPortionSkalieren(carbsZutat.kalorien, basisPortionen.carbsPortion) +
    aufPortionSkalieren(fettZutat.kalorien, basisPortionen.fettPortion) +
    aufPortionSkalieren(gemueseZutat.kalorien, basisPortionen.gemuesePortion)
  const referenzKalorien = zielKalorien ?? kalorienVorMakroAnpassung

  let proteinPortion = basisPortionen.proteinPortion
  let carbsPortion = basisPortionen.carbsPortion
  let fettPortion = basisPortionen.fettPortion
  const gemuesePortion = basisPortionen.gemuesePortion

  const proteinErgebnis = makroZielPortionBerechnen(
    proteinZutat,
    proteinPortion,
    Number(makroZieleWert.protein),
    'protein_g',
    aufPortionSkalieren(carbsZutat.kalorien, carbsPortion) +
      aufPortionSkalieren(fettZutat.kalorien, fettPortion) +
      aufPortionSkalieren(gemueseZutat.kalorien, gemuesePortion),
    referenzKalorien
  )
  proteinPortion = proteinErgebnis.portion

  const carbsErgebnis = makroZielPortionBerechnen(
    carbsZutat,
    carbsPortion,
    Number(makroZieleWert.carbs),
    'carbs_g',
    aufPortionSkalieren(proteinZutat.kalorien, proteinPortion) +
      aufPortionSkalieren(fettZutat.kalorien, fettPortion) +
      aufPortionSkalieren(gemueseZutat.kalorien, gemuesePortion),
    referenzKalorien
  )
  carbsPortion = carbsErgebnis.portion

  const fettErgebnis = makroZielPortionBerechnen(
    fettZutat,
    fettPortion,
    Number(makroZieleWert.fett),
    'fett_g',
    aufPortionSkalieren(proteinZutat.kalorien, proteinPortion) +
      aufPortionSkalieren(carbsZutat.kalorien, carbsPortion) +
      aufPortionSkalieren(gemueseZutat.kalorien, gemuesePortion),
    referenzKalorien
  )
  fettPortion = fettErgebnis.portion

  return {
    proteinPortion,
    carbsPortion,
    fettPortion,
    gemuesePortion,
    proteinZielErreichbar: proteinErgebnis.erreichbar,
    carbsZielErreichbar: carbsErgebnis.erreichbar,
    fettZielErreichbar: fettErgebnis.erreichbar,
  }
}

function App() {
  // Diese Listen kamen frueher aus hartcodierten Arrays,
  // jetzt fuellen wir sie per useEffect aus der Datenbank.
  const [proteinOptionen, setProteinOptionen] = useState([])
  const [carbsOptionen, setCarbsOptionen] = useState([])
  const [fettOptionen, setFettOptionen] = useState([])
  const [gemueseOptionen, setGemueseOptionen] = useState([])

  // State speichert die aktuell angezeigte Zutat pro Kategorie.
  // Ab jetzt ist das jeweils ein GANZES Objekt (z. B. { name, kalorien, protein_g, ... }),
  // deshalb ist der Anfangswert null und nicht mehr ein leerer Text.
  const [protein, setProtein] = useState(null)
  const [carbs, setCarbs] = useState(null)
  const [fett, setFett] = useState(null)
  const [gemuese, setGemuese] = useState(null)

  // Eigener State pro Slot fuer die vom User eingegebene Portionsgroesse (in Gramm).
  // Das ist NICHT dasselbe wie protein.portion_g: Der Datenbank-Wert ist nur der
  // Startwert, der User soll ihn aber ueberschreiben koennen. Anfangswert ist null,
  // weil beim allerersten Rendern noch keine Zutat geladen ist.
  const [proteinPortion, setProteinPortion] = useState(null)
  const [carbsPortion, setCarbsPortion] = useState(null)
  const [fettPortion, setFettPortion] = useState(null)
  const [gemuesePortion, setGemuesePortion] = useState(null)

  // Solange die Daten noch nicht aus der Datenbank geladen sind, zeigen wir "Laedt...".
  const [laedt, setLaedt] = useState(true)

  // Aktuell gewaehlter Mahlzeit-Filter (fruehstueck/mittag/abend/snack).
  // Lazy initializer: wird nur einmal beim ersten Rendern anhand der Uhrzeit berechnet.
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)

  // Aktuell ausgewaehlte Diaetform-Filter (vegan/vegetarisch/glutenfrei),
  // Mehrfachauswahl. Leeres Array = kein Diaet-Filter aktiv, alle Zutaten
  // kommen infrage.
  const [diaeten, setDiaeten] = useState([])

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

  // Ob das Einstellungen-Panel (Kalorienziel + Ernaehrungsform, ausserhalb
  // des Onboardings ueber das Zahnrad-Icon erreichbar) gerade offen ist.
  const [einstellungenOffen, setEinstellungenOffen] = useState(false)

  // Wird vom Wizard aufgerufen, wenn der User Schritt 3 mit "Los geht's"
  // abschliesst. Persistiert den Abschluss, damit der Wizard bei
  // zukuenftigen Besuchen nicht mehr erscheint.
  function onboardingAbschliessen() {
    localStorage.setItem(ONBOARDING_LOCALSTORAGE_KEY, 'true')
    setOnboardingAbgeschlossen(true)
  }

  // Tagesplan: null = nicht aktiv (normale Einzel-Mahlzeit-Ansicht wird
  // gezeigt). Sonst ein Array mit 4 Eintraegen (einer pro Mahlzeit-Typ in
  // MAHLZEIT_REIHENFOLGE), die die Einzel-Ansicht ersetzen.
  const [tagesplan, setTagesplan] = useState(null)

  // Makro-Ziele (Protein/Carbs/Fett in Gramm) PRO MAHLZEIT-TYP:
  // { [mahlzeitTyp]: { protein, carbs, fett } }. Wird von der Einzel-Ansicht
  // (fuer den aktuellen Mahlzeit-Filter) UND vom Tagesplan (fuer alle vier
  // Mahlzeiten) gemeinsam genutzt, damit z. B. "40g Protein beim Fruehstueck"
  // unabhaengig von Ansicht und Reload erhalten bleibt.
  const [makroZiele, setMakroZiele] = useState(makroZieleLaden)

  useEffect(() => {
    localStorage.setItem(MAKRO_ZIELE_LOCALSTORAGE_KEY, JSON.stringify(makroZiele))
  }, [makroZiele])

  // Ob das jeweilige Makro-Ziel der aktuell angezeigten Einzel-Mahlzeit mit
  // der zuletzt berechneten Portion erreichbar war (fuer den dezenten Hinweis
  // in der UI). Wird bei jedem Wuerfeln/Ziel-Aendern neu gesetzt. Wird NICHT
  // persistiert, da rein aus der aktuellen Zutat + Ziel abgeleitet.
  const [proteinZielErreichbar, setProteinZielErreichbar] = useState(true)
  const [carbsZielErreichbar, setCarbsZielErreichbar] = useState(true)
  const [fettZielErreichbar, setFettZielErreichbar] = useState(true)

  // Liefert die Makro-Ziele fuer einen Mahlzeit-Typ mit sinnvollem Default.
  function makroZieleFuer(mahlzeitTyp) {
    return makroZiele[mahlzeitTyp] ?? { protein: '', carbs: '', fett: '' }
  }

  // Setzt die vier Portionen fuer EINE Mahlzeit passend zum aktuellen
  // Kalorienziel UND den aktuellen Makro-Zielen. Wird nach jedem Wuerfeln
  // aufgerufen (statt die Portion einfach auf portion_g zurueckzusetzen),
  // damit die Skalierung nicht durch einen spaeteren Reset ueberschrieben wird.
  function portionenMitMakroZielenSetzen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, makroZieleWert) {
    const ergebnis = portionenMitMakroZielenBerechnen(
      proteinZutat,
      carbsZutat,
      fettZutat,
      gemueseZutat,
      mahlzeitWert,
      ziel,
      makroZieleWert
    )
    setProteinPortion(ergebnis.proteinPortion)
    setCarbsPortion(ergebnis.carbsPortion)
    setFettPortion(ergebnis.fettPortion)
    setGemuesePortion(ergebnis.gemuesePortion)
    setProteinZielErreichbar(ergebnis.proteinZielErreichbar)
    setCarbsZielErreichbar(ergebnis.carbsZielErreichbar)
    setFettZielErreichbar(ergebnis.fettZielErreichbar)
  }

  // Baut aus vier Zutaten einen kompletten Tagesplan-Eintrag: skalierte
  // Portionen (inkl. Makro-Ziel-Anpassung) plus die daraus resultierenden
  // Naehrwert-Summen dieser Mahlzeit. makroZieleWert wird explizit als Param
  // uebergeben (statt aus dem makroZiele-State gelesen), damit der Aufrufer
  // z. B. gerade erst getippte Werte OHNE Verzoegerung durch asynchrones
  // setState hier schon beruecksichtigen kann.
  function tagesplanEintragBauen(mahlzeitTyp, proteinZutat, carbsZutat, fettZutat, gemueseZutat, makroZieleWert) {
    const portionen = portionenMitMakroZielenBerechnen(
      proteinZutat,
      carbsZutat,
      fettZutat,
      gemueseZutat,
      mahlzeitTyp,
      ziel,
      makroZieleWert
    )
    const summeKalorien =
      aufPortionSkalieren(proteinZutat.kalorien, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.kalorien, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.kalorien, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.kalorien, portionen.gemuesePortion)
    const summeProtein =
      aufPortionSkalieren(proteinZutat.protein_g, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.protein_g, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.protein_g, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.protein_g, portionen.gemuesePortion)
    const summeCarbs =
      aufPortionSkalieren(proteinZutat.carbs_g, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.carbs_g, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.carbs_g, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.carbs_g, portionen.gemuesePortion)
    const summeFett =
      aufPortionSkalieren(proteinZutat.fett_g, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.fett_g, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.fett_g, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.fett_g, portionen.gemuesePortion)

    return {
      mahlzeitTyp,
      protein: proteinZutat,
      carbs: carbsZutat,
      fett: fettZutat,
      gemuese: gemueseZutat,
      ...portionen,
      proteinZielG: makroZieleWert.protein,
      carbsZielG: makroZieleWert.carbs,
      fettZielG: makroZieleWert.fett,
      summeKalorien,
      summeProtein,
      summeCarbs,
      summeFett,
    }
  }

  // Leeres Array [] als zweites Argument: dieser Code laeuft nur EINMAL,
  // wenn die Komponente zum ersten Mal angezeigt wird.
  useEffect(() => {
    async function zutatenLaden() {
      const { data, error } = await supabase
        .from('zutaten')
        // Zusaetzlich zu name und kategorie laden wir jetzt auch die
        // Naehrwert-Spalten und die Portionsgroesse (portion_g) mit,
        // damit wir spaeter eine Summe berechnen koennen.
        .select('name, kategorie, kalorien, protein_g, carbs_g, fett_g, portion_g, mahlzeiten, diaeten')
        .eq('aktiv', true)

      if (error) {
        console.error('Fehler beim Laden der Zutaten:', error)
        setLaedt(false)
        return
      }

      // Die geladenen Zeilen (alle Kategorien gemischt) nach kategorie aufteilen.
      // Wir behalten diesmal die KOMPLETTEN Objekte (nicht nur den Namen),
      // damit die Naehrwerte spaeter noch verfuegbar sind.
      const proteine = data.filter((z) => z.kategorie === 'protein')
      const carbsListe = data.filter((z) => z.kategorie === 'carbs')
      const fetteListe = data.filter((z) => z.kategorie === 'fett')
      const gemueseListe = data.filter((z) => z.kategorie === 'gemuese')

      setProteinOptionen(proteine)
      setCarbsOptionen(carbsListe)
      setFettOptionen(fetteListe)
      setGemueseOptionen(gemueseListe)

      // Direkt eine erste zufaellige Auswahl setzen, sobald die Daten da sind,
      // passend zum aktuell (per Uhrzeit) vorausgewaehlten Mahlzeit-Filter.
      const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteine, mahlzeit, diaeten))
      const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsListe, mahlzeit, diaeten))
      const neuFett = zufaelligesElement(gefiltertePoolFuer(fetteListe, mahlzeit, diaeten))
      const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseListe, mahlzeit, diaeten))

      setProtein(neuProtein)
      setCarbs(neuCarbs)
      setFett(neuFett)
      setGemuese(neuGemuese)
      portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))

      setLaedt(false)
    }

    zutatenLaden()
  }, [])

  // Waehlt fuer jede Kategorie eine neue zufaellige Zutat aus dem Pool des
  // aktuellen Mahlzeit-Filters aus und schreibt sie in den jeweiligen State.
  function neueAuswahlWuerfeln() {
    const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, mahlzeit, diaeten))
    const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, mahlzeit, diaeten))
    const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, mahlzeit, diaeten))
    const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, mahlzeit, diaeten))

    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))
  }

  // Diese vier Funktionen aendern jeweils nur EINEN Slot, skalieren danach
  // aber alle vier Portionen neu (weil sich die Kalorien-Basis der Mahlzeit
  // durch den Wechsel veraendert). Sie werden gleich als Prop an die
  // passende SlotKarte weitergegeben, damit deren kleiner Re-Roll-Button nur
  // diesen einen Slot neu wuerfelt.
  function proteinWuerfeln() {
    const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, mahlzeit, diaeten))
    setProtein(neuProtein)
    portionenMitMakroZielenSetzen(neuProtein, carbs, fett, gemuese, mahlzeit, makroZieleFuer(mahlzeit))
  }

  function carbsWuerfeln() {
    const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, mahlzeit, diaeten))
    setCarbs(neuCarbs)
    portionenMitMakroZielenSetzen(protein, neuCarbs, fett, gemuese, mahlzeit, makroZieleFuer(mahlzeit))
  }

  function fettWuerfeln() {
    const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, mahlzeit, diaeten))
    setFett(neuFett)
    portionenMitMakroZielenSetzen(protein, carbs, neuFett, gemuese, mahlzeit, makroZieleFuer(mahlzeit))
  }

  function gemueseWuerfeln() {
    const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, mahlzeit, diaeten))
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(protein, carbs, fett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))
  }

  // Wird vom MahlzeitFilter aufgerufen, wenn der User einen anderen Filter
  // waehlt. Wuerfelt sofort alle vier Kategorien neu, passend zum neuen
  // Filter. neueMahlzeit wird direkt verwendet statt ueber den State zu
  // lesen, weil setMahlzeit asynchron ist und der State-Wert im selben
  // Funktionsdurchlauf noch der alte waere.
  function mahlzeitAendern(neueMahlzeit) {
    if (neueMahlzeit === mahlzeit) {
      return
    }

    const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, neueMahlzeit, diaeten))
    const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, neueMahlzeit, diaeten))
    const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, neueMahlzeit, diaeten))
    const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, neueMahlzeit, diaeten))

    setMahlzeit(neueMahlzeit)
    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, neueMahlzeit, makroZieleFuer(neueMahlzeit))
  }

  // Wird vom DiaetFilter aufgerufen, wenn der User eine Diaetform an- oder
  // abwaehlt. "keine" (Keine Einschraenkung) schliesst sich mit den anderen
  // drei Diaetformen gegenseitig aus: Anwaehlen von "keine" ersetzt eine
  // evtl. bestehende Auswahl komplett, Anwaehlen einer der anderen drei
  // entfernt ein evtl. aktives "keine" wieder. Wuerfelt danach sofort alle
  // vier Kategorien neu, passend zur neuen Auswahl. neueDiaeten wird direkt
  // verwendet statt ueber den State zu lesen, weil setDiaeten asynchron ist
  // und der State-Wert im selben Funktionsdurchlauf noch der alte waere.
  function diaetenAendern(slug) {
    let neueDiaeten
    if (slug === 'keine') {
      neueDiaeten = diaeten.includes('keine') ? [] : ['keine']
    } else if (diaeten.includes(slug)) {
      neueDiaeten = diaeten.filter((d) => d !== slug)
    } else {
      neueDiaeten = [...diaeten.filter((d) => d !== 'keine'), slug]
    }

    const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, mahlzeit, neueDiaeten))
    const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, mahlzeit, neueDiaeten))
    const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, mahlzeit, neueDiaeten))
    const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, mahlzeit, neueDiaeten))

    setDiaeten(neueDiaeten)
    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))

    // Ist gerade ein Tagesplan sichtbar, muss der ebenfalls neu gewuerfelt
    // werden, sonst wuerden dort weiterhin Zutaten stehen, die die neue
    // Diaet-Auswahl nicht erfuellen.
    if (tagesplan) {
      setTagesplan(tagesplanErzeugen(neueDiaeten))
    }
  }

  // Wird von ZielEinstellungen aufgerufen, wenn der User einen anderen
  // Ziel-Typ waehlt. Die Kalorienzahl bleibt dabei erhalten, damit sie beim
  // Zurueckwechseln nicht verloren geht. Verlaesst der User "Pro Tag", macht
  // ein evtl. sichtbarer Tagesplan keinen Sinn mehr und wird geschlossen.
  function zielTypAendern(typ) {
    setZiel((aktuell) => ({ ...aktuell, typ }))
    if (typ !== 'proTag') {
      setTagesplan(null)
    }
  }

  // Wird von ZielEinstellungen aufgerufen, wenn der User die Kalorienzahl
  // aendert.
  function zielKalorienAendern(kalorien) {
    setZiel((aktuell) => ({ ...aktuell, kalorien }))
  }

  // Wird von ZielEinstellungen aufgerufen, wenn der User das Tages-Makroziel
  // (Protein/Carbs/Fett in Gramm, nur bei "Pro Tag" sichtbar) aendert. Wirkt
  // - wie zielKalorienAendern - erst beim naechsten (Neu-)Planen des Tages,
  // nicht sofort.
  function zielMakroAendern(kategorie, wert) {
    setZiel((aktuell) => ({ ...aktuell, makro: { ...aktuell.makro, [kategorie]: wert } }))
  }

  // Aktualisiert das Makro-Ziel (Protein/Carbs/Fett) der aktuellen Einzel-
  // Mahlzeit in makroZiele und berechnet die Portionen SOFORT neu, ohne neu
  // zu wuerfeln. makroZiele ist ausschliesslich der Einzel-Ansicht vorbehalten
  // - der Tagesplan leitet seine Makro-Ziele stattdessen direkt aus dem
  // Tages-Makroziel in ziel.makro ab (makroZielFuerMahlzeitAusTagesziel).
  function makroZielAendern(kategorie, wert) {
    const neueZiele = { ...makroZieleFuer(mahlzeit), [kategorie]: wert }
    setMakroZiele((aktuell) => ({ ...aktuell, [mahlzeit]: neueZiele }))
    portionenMitMakroZielenSetzen(protein, carbs, fett, gemuese, mahlzeit, neueZiele)
  }

  // Wuerfelt fuer jeden der vier Mahlzeit-Typen (unabhaengig vom aktuell
  // gewaehlten Mahlzeit-Filter) einen eigenen Zutaten-Satz, skaliert ihn mit
  // dem passenden Tages-Anteil und gibt den kompletten neuen Tagesplan
  // zurueck (setzt selbst KEINEN State, damit die Funktion sowohl fuer den
  // "Ganzen Tag planen"-Button als auch fuer eine Diaet-Filter-Aenderung
  // waehrend eines aktiven Tagesplans wiederverwendet werden kann).
  function tagesplanErzeugen(diaetenWert) {
    return MAHLZEIT_REIHENFOLGE.map((mahlzeitTyp) => {
      const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, mahlzeitTyp, diaetenWert))
      const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, mahlzeitTyp, diaetenWert))
      const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, mahlzeitTyp, diaetenWert))
      const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, mahlzeitTyp, diaetenWert))
      return tagesplanEintragBauen(
        mahlzeitTyp,
        neuProtein,
        neuCarbs,
        neuFett,
        neuGemuese,
        makroZielFuerMahlzeitAusTagesziel(ziel, mahlzeitTyp)
      )
    })
  }

  // Wird vom "Ganzen Tag planen"- bzw. "Ganzen Tag neu planen"-Button aufgerufen.
  function tagPlanen() {
    setTagesplan(tagesplanErzeugen(diaeten))
  }

  // Wuerfelt im Tagesplan EINEN Slot (kategorie: protein/carbs/fett/gemuese)
  // einer einzelnen Mahlzeit (index in MAHLZEIT_REIHENFOLGE) neu und
  // skaliert danach alle vier Portionen dieser Mahlzeit neu.
  function tagesplanSlotWuerfeln(index, kategorie) {
    setTagesplan((aktuellerPlan) => {
      const eintrag = aktuellerPlan[index]
      const optionenNachKategorie = {
        protein: proteinOptionen,
        carbs: carbsOptionen,
        fett: fettOptionen,
        gemuese: gemueseOptionen,
      }
      const neueZutat = zufaelligesElement(
        gefiltertePoolFuer(optionenNachKategorie[kategorie], eintrag.mahlzeitTyp, diaeten)
      )
      const zutaten = {
        protein: eintrag.protein,
        carbs: eintrag.carbs,
        fett: eintrag.fett,
        gemuese: eintrag.gemuese,
        [kategorie]: neueZutat,
      }
      const neuerEintrag = tagesplanEintragBauen(
        eintrag.mahlzeitTyp,
        zutaten.protein,
        zutaten.carbs,
        zutaten.fett,
        zutaten.gemuese,
        makroZielFuerMahlzeitAusTagesziel(ziel, eintrag.mahlzeitTyp)
      )

      return aktuellerPlan.map((e, i) => (i === index ? neuerEintrag : e))
    })
  }

  if (!onboardingAbgeschlossen) {
    return (
      <OnboardingWizard
        ziel={ziel}
        onTypAendern={zielTypAendern}
        onKalorienAendern={zielKalorienAendern}
        onMakroAendern={zielMakroAendern}
        mahlzeit={mahlzeit}
        onMahlzeitAendern={mahlzeitAendern}
        diaeten={diaeten}
        onDiaetenAendern={diaetenAendern}
        onAbschluss={onboardingAbschliessen}
      />
    )
  }

  if (laedt) {
    return <p className="p-4">Lädt...</p>
  }

  // Die vier Summen sind KEIN eigener State, sondern werden bei jedem
  // Rendern frisch aus protein, carbs, fett und gemuese berechnet.
  // So koennen Anzeige und tatsaechliche Auswahl nie auseinanderlaufen.
  //
  // Jeder Naehrwert steht in der Datenbank als 100g-Referenzwert.
  // Mit aufPortionSkalieren() rechnen wir ihn zuerst pro Zutat auf die
  // tatsaechliche Portionsgroesse um, und summieren erst DANACH.
  const summeKalorien =
    aufPortionSkalieren(protein.kalorien, proteinPortion ?? protein.portion_g) +
    aufPortionSkalieren(carbs.kalorien, carbsPortion ?? carbs.portion_g) +
    aufPortionSkalieren(fett.kalorien, fettPortion ?? fett.portion_g) +
    aufPortionSkalieren(gemuese.kalorien, gemuesePortion ?? gemuese.portion_g)

  const summeProtein =
    aufPortionSkalieren(protein.protein_g, proteinPortion ?? protein.portion_g) +
    aufPortionSkalieren(carbs.protein_g, carbsPortion ?? carbs.portion_g) +
    aufPortionSkalieren(fett.protein_g, fettPortion ?? fett.portion_g) +
    aufPortionSkalieren(gemuese.protein_g, gemuesePortion ?? gemuese.portion_g)

  const summeCarbs =
    aufPortionSkalieren(protein.carbs_g, proteinPortion ?? protein.portion_g) +
    aufPortionSkalieren(carbs.carbs_g, carbsPortion ?? carbs.portion_g) +
    aufPortionSkalieren(fett.carbs_g, fettPortion ?? fett.portion_g) +
    aufPortionSkalieren(gemuese.carbs_g, gemuesePortion ?? gemuese.portion_g)

  const summeFett =
    aufPortionSkalieren(protein.fett_g, proteinPortion ?? protein.portion_g) +
    aufPortionSkalieren(carbs.fett_g, carbsPortion ?? carbs.portion_g) +
    aufPortionSkalieren(fett.fett_g, fettPortion ?? fett.portion_g) +
    aufPortionSkalieren(gemuese.fett_g, gemuesePortion ?? gemuese.portion_g)

  const aktuelleMakroZiele = makroZieleFuer(mahlzeit)

  return (
    <>
      <header className="flex items-start justify-between p-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">gusto</h1>
          <p className="text-sm text-text-muted">deine nächste mahlzeit, gewürfelt</p>
        </div>
        <button
          type="button"
          onClick={() => setEinstellungenOffen(true)}
          aria-label="Einstellungen öffnen"
          className="mt-1 text-2xl text-text-muted hover:text-primary"
        >
          ⚙
        </button>
      </header>

      <EinstellungenPanel
        offen={einstellungenOffen}
        onSchliessen={() => setEinstellungenOffen(false)}
        ziel={ziel}
        onTypAendern={zielTypAendern}
        onKalorienAendern={zielKalorienAendern}
        onMakroAendern={zielMakroAendern}
        diaeten={diaeten}
        onDiaetenAendern={diaetenAendern}
      />

      {!tagesplan && <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />}

      {ziel.typ === 'proTag' && !tagesplan && (
        <button type="button" onClick={tagPlanen} className="mx-4 mt-4 rounded-lg bg-primary px-4 py-2 text-card">
          Ganzen Tag planen
        </button>
      )}

      {tagesplan ? (
        <TagesplanAnsicht
          tagesplan={tagesplan}
          onSlotWuerfeln={tagesplanSlotWuerfeln}
          onZurueck={() => setTagesplan(null)}
          onNeuPlanen={tagPlanen}
        />
      ) : (
        <>
          <section id="slots" className="grid grid-cols-2 gap-4 p-4">
            <SlotKarte
              titel="Protein"
              text={protein.name}
              portion={proteinPortion}
              onWuerfeln={proteinWuerfeln}
              zielWert={aktuelleMakroZiele.protein}
              onZielAendern={(wert) => makroZielAendern('protein', wert)}
              zielErreichbar={proteinZielErreichbar}
            />
            <SlotKarte
              titel="Carbs"
              text={carbs.name}
              portion={carbsPortion}
              onWuerfeln={carbsWuerfeln}
              zielWert={aktuelleMakroZiele.carbs}
              onZielAendern={(wert) => makroZielAendern('carbs', wert)}
              zielErreichbar={carbsZielErreichbar}
            />
            <SlotKarte
              titel="Fett"
              text={fett.name}
              portion={fettPortion}
              onWuerfeln={fettWuerfeln}
              zielWert={aktuelleMakroZiele.fett}
              onZielAendern={(wert) => makroZielAendern('fett', wert)}
              zielErreichbar={fettZielErreichbar}
            />
            <SlotKarte titel="Gemüse" text={gemuese.name} portion={gemuesePortion} onWuerfeln={gemueseWuerfeln} />
          </section>

          <section id="summe" className="mx-4 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-text">Summe</h2>
            <p className="font-display text-3xl font-semibold text-text">{summeKalorien.toFixed(1)} kcal</p>
            <p className="text-text-muted">
              P {summeProtein.toFixed(1)}g · C {summeCarbs.toFixed(1)}g · F {summeFett.toFixed(1)}g
            </p>
          </section>

          <button type="button" onClick={neueAuswahlWuerfeln} className="m-4 rounded-lg bg-primary px-4 py-2 text-card">
            Neue Auswahl würfeln
          </button>
        </>
      )}
    </>
  )
}

export default App
