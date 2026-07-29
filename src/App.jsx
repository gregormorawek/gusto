import { useEffect, useState } from 'react'
import './App.css'
import SlotKarte from './components/SlotKarte'
import MahlzeitFilter from './components/MahlzeitFilter'
import DiaetFilter from './components/DiaetFilter'
import ZielEinstellungen from './components/ZielEinstellungen'
import TagesplanAnsicht from './components/TagesplanAnsicht'
import { MAHLZEITEN } from './mahlzeiten'
import { supabase } from './supabase'

// Feste Reihenfolge der Mahlzeit-Typen fuer den Tagesplan, uebernommen aus
// den Filter-Slugs (fruehstueck, mittag, abend, snack).
const MAHLZEIT_REIHENFOLGE = MAHLZEITEN.map((m) => m.slug)

const ZIEL_LOCALSTORAGE_KEY = 'gusto-ziel'

// Laedt das gespeicherte Kalorienziel aus dem localStorage. Ist noch nichts
// gespeichert oder der Inhalt beschaedigt (z. B. kein gueltiges JSON), wird
// auf den Standard "kein Ziel" zurueckgefallen.
function zielLaden() {
  try {
    const gespeichert = localStorage.getItem(ZIEL_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return { typ: 'kein', kalorien: '' }
    }
    return JSON.parse(gespeichert)
  } catch {
    return { typ: 'kein', kalorien: '' }
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
// ALLE aktuell ausgewaehlten Diaetformen enthaelt. Keine Auswahl = Filter
// inaktiv, komplette Liste bleibt bestehen. Ist das Ergebnis leer (z. B. weil
// die Kategorie noch keine passend getaggten Zutaten hat), wird auf die
// ungefilterte Liste zurueckgefallen, statt eine leere Auswahl zu liefern.
function nachDiaetenGefiltert(liste, ausgewaehlteDiaeten) {
  if (ausgewaehlteDiaeten.length === 0) {
    return liste
  }

  const passt = liste.filter((z) => {
    const vorhandeneDiaeten = (z.diaeten ?? '').split(',').map((d) => d.trim())
    return ausgewaehlteDiaeten.every((d) => vorhandeneDiaeten.includes(d))
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

  // Tagesplan: null = nicht aktiv (normale Einzel-Mahlzeit-Ansicht wird
  // gezeigt). Sonst ein Array mit 4 Eintraegen (einer pro Mahlzeit-Typ in
  // MAHLZEIT_REIHENFOLGE), die die Einzel-Ansicht ersetzen.
  const [tagesplan, setTagesplan] = useState(null)

  // Setzt die vier Portionen fuer EINE Mahlzeit passend zum aktuellen
  // Kalorienziel. Wird nach jedem Wuerfeln aufgerufen (statt die Portion
  // einfach auf portion_g zurueckzusetzen), damit die Skalierung nicht durch
  // einen spaeteren Reset ueberschrieben wird.
  function portionenSkaliertSetzen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert) {
    const portionen = portionenBerechnen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, ziel)
    setProteinPortion(portionen.proteinPortion)
    setCarbsPortion(portionen.carbsPortion)
    setFettPortion(portionen.fettPortion)
    setGemuesePortion(portionen.gemuesePortion)
  }

  // Baut aus vier Zutaten einen kompletten Tagesplan-Eintrag: skalierte
  // Portionen plus die daraus resultierende Kalorien-Summe dieser Mahlzeit.
  function tagesplanEintragBauen(mahlzeitTyp, proteinZutat, carbsZutat, fettZutat, gemueseZutat) {
    const portionen = portionenBerechnen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitTyp, ziel)
    const summeKalorien =
      aufPortionSkalieren(proteinZutat.kalorien, portionen.proteinPortion) +
      aufPortionSkalieren(carbsZutat.kalorien, portionen.carbsPortion) +
      aufPortionSkalieren(fettZutat.kalorien, portionen.fettPortion) +
      aufPortionSkalieren(gemueseZutat.kalorien, portionen.gemuesePortion)

    return {
      mahlzeitTyp,
      protein: proteinZutat,
      carbs: carbsZutat,
      fett: fettZutat,
      gemuese: gemueseZutat,
      ...portionen,
      summeKalorien,
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
      portionenSkaliertSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit)

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
    portionenSkaliertSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit)
  }

  // Diese vier Funktionen aendern jeweils nur EINEN Slot, skalieren danach
  // aber alle vier Portionen neu (weil sich die Kalorien-Basis der Mahlzeit
  // durch den Wechsel veraendert). Sie werden gleich als Prop an die
  // passende SlotKarte weitergegeben, damit deren kleiner Re-Roll-Button nur
  // diesen einen Slot neu wuerfelt.
  function proteinWuerfeln() {
    const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, mahlzeit, diaeten))
    setProtein(neuProtein)
    portionenSkaliertSetzen(neuProtein, carbs, fett, gemuese, mahlzeit)
  }

  function carbsWuerfeln() {
    const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, mahlzeit, diaeten))
    setCarbs(neuCarbs)
    portionenSkaliertSetzen(protein, neuCarbs, fett, gemuese, mahlzeit)
  }

  function fettWuerfeln() {
    const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, mahlzeit, diaeten))
    setFett(neuFett)
    portionenSkaliertSetzen(protein, carbs, neuFett, gemuese, mahlzeit)
  }

  function gemueseWuerfeln() {
    const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, mahlzeit, diaeten))
    setGemuese(neuGemuese)
    portionenSkaliertSetzen(protein, carbs, fett, neuGemuese, mahlzeit)
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
    portionenSkaliertSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, neueMahlzeit)
  }

  // Wird vom DiaetFilter aufgerufen, wenn der User eine Diaetform an- oder
  // abwaehlt. Wuerfelt sofort alle vier Kategorien neu, passend zur neuen
  // Auswahl. neueDiaeten wird direkt verwendet statt ueber den State zu
  // lesen, weil setDiaeten asynchron ist und der State-Wert im selben
  // Funktionsdurchlauf noch der alte waere.
  function diaetenAendern(slug) {
    const neueDiaeten = diaeten.includes(slug)
      ? diaeten.filter((d) => d !== slug)
      : [...diaeten, slug]

    const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, mahlzeit, neueDiaeten))
    const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, mahlzeit, neueDiaeten))
    const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, mahlzeit, neueDiaeten))
    const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, mahlzeit, neueDiaeten))

    setDiaeten(neueDiaeten)
    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenSkaliertSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit)
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

  // Wird vom "Ganzen Tag planen"-Button aufgerufen. Wuerfelt fuer jeden der
  // vier Mahlzeit-Typen (unabhaengig vom aktuell gewaehlten Mahlzeit-Filter)
  // einen eigenen Zutaten-Satz und skaliert ihn mit dem passenden Tages-Anteil.
  function tagPlanen() {
    const neuerPlan = MAHLZEIT_REIHENFOLGE.map((mahlzeitTyp) => {
      const neuProtein = zufaelligesElement(gefiltertePoolFuer(proteinOptionen, mahlzeitTyp, diaeten))
      const neuCarbs = zufaelligesElement(gefiltertePoolFuer(carbsOptionen, mahlzeitTyp, diaeten))
      const neuFett = zufaelligesElement(gefiltertePoolFuer(fettOptionen, mahlzeitTyp, diaeten))
      const neuGemuese = zufaelligesElement(gefiltertePoolFuer(gemueseOptionen, mahlzeitTyp, diaeten))
      return tagesplanEintragBauen(mahlzeitTyp, neuProtein, neuCarbs, neuFett, neuGemuese)
    })
    setTagesplan(neuerPlan)
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
        zutaten.gemuese
      )

      return aktuellerPlan.map((e, i) => (i === index ? neuerEintrag : e))
    })
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

  return (
    <>
      <header className="p-4">
        <h1 className="font-display text-3xl font-semibold text-primary">gusto</h1>
        <p className="text-sm text-text-muted">deine nächste mahlzeit, gewürfelt</p>
      </header>

      {!tagesplan && <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />}
      <DiaetFilter ausgewaehlt={diaeten} onAendern={diaetenAendern} />
      <ZielEinstellungen ziel={ziel} onTypAendern={zielTypAendern} onKalorienAendern={zielKalorienAendern} />

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
        />
      ) : (
        <>
          <section id="slots" className="grid grid-cols-2 gap-4 p-4">
            <SlotKarte titel="Protein" text={protein.name} portion={proteinPortion} onWuerfeln={proteinWuerfeln} />
            <SlotKarte titel="Carbs" text={carbs.name} portion={carbsPortion} onWuerfeln={carbsWuerfeln} />
            <SlotKarte titel="Fett" text={fett.name} portion={fettPortion} onWuerfeln={fettWuerfeln} />
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
