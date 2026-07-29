import { useEffect, useState } from 'react'
import './App.css'
import SlotKarte from './components/SlotKarte'
import MahlzeitFilter from './components/MahlzeitFilter'
import { supabase } from './supabase'

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

// Hilfsfunktion: rechnet einen 100g-Referenzwert (z. B. Kalorien pro 100g)
// auf die tatsaechliche Portionsgroesse der Zutat um.
function aufPortionSkalieren(wertPro100g, portionsGroesseInGramm) {
  return (wertPro100g / 100) * portionsGroesseInGramm
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

  // Jedes Mal, wenn sich "protein" aendert (erstes Laden ODER Re-Roll),
  // setzen wir proteinPortion auf die Portionsgroesse der NEUEN Zutat zurueck.
  // Ohne das wuerde nach einem Re-Roll die alte, vom User eingegebene
  // Portionsgroesse an der neuen Zutat kleben bleiben.
  useEffect(() => {
    if (protein) {
      setProteinPortion(protein.portion_g)
    }
  }, [protein])

  useEffect(() => {
    if (carbs) {
      setCarbsPortion(carbs.portion_g)
    }
  }, [carbs])

  useEffect(() => {
    if (fett) {
      setFettPortion(fett.portion_g)
    }
  }, [fett])

  useEffect(() => {
    if (gemuese) {
      setGemuesePortion(gemuese.portion_g)
    }
  }, [gemuese])

  // Leeres Array [] als zweites Argument: dieser Code laeuft nur EINMAL,
  // wenn die Komponente zum ersten Mal angezeigt wird.
  useEffect(() => {
    async function zutatenLaden() {
      const { data, error } = await supabase
        .from('zutaten')
        // Zusaetzlich zu name und kategorie laden wir jetzt auch die
        // Naehrwert-Spalten und die Portionsgroesse (portion_g) mit,
        // damit wir spaeter eine Summe berechnen koennen.
        .select('name, kategorie, kalorien, protein_g, carbs_g, fett_g, portion_g, mahlzeiten')
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
      setProtein(zufaelligesElement(nachMahlzeitGefiltert(proteine, mahlzeit)))
      setCarbs(zufaelligesElement(nachMahlzeitGefiltert(carbsListe, mahlzeit)))
      setFett(zufaelligesElement(nachMahlzeitGefiltert(fetteListe, mahlzeit)))
      setGemuese(zufaelligesElement(nachMahlzeitGefiltert(gemueseListe, mahlzeit)))

      setLaedt(false)
    }

    zutatenLaden()
  }, [])

  // Waehlt fuer jede Kategorie eine neue zufaellige Zutat aus dem Pool des
  // aktuellen Mahlzeit-Filters aus und schreibt sie in den jeweiligen State.
  function neueAuswahlWuerfeln() {
    setProtein(zufaelligesElement(nachMahlzeitGefiltert(proteinOptionen, mahlzeit)))
    setCarbs(zufaelligesElement(nachMahlzeitGefiltert(carbsOptionen, mahlzeit)))
    setFett(zufaelligesElement(nachMahlzeitGefiltert(fettOptionen, mahlzeit)))
    setGemuese(zufaelligesElement(nachMahlzeitGefiltert(gemueseOptionen, mahlzeit)))
  }

  // Diese vier Funktionen aendern jeweils nur EINEN State.
  // Sie werden gleich als Prop an die passende SlotKarte weitergegeben,
  // damit deren kleiner Re-Roll-Button nur diesen einen Slot neu wuerfelt.
  function proteinWuerfeln() {
    setProtein(zufaelligesElement(nachMahlzeitGefiltert(proteinOptionen, mahlzeit)))
  }

  function carbsWuerfeln() {
    setCarbs(zufaelligesElement(nachMahlzeitGefiltert(carbsOptionen, mahlzeit)))
  }

  function fettWuerfeln() {
    setFett(zufaelligesElement(nachMahlzeitGefiltert(fettOptionen, mahlzeit)))
  }

  function gemueseWuerfeln() {
    setGemuese(zufaelligesElement(nachMahlzeitGefiltert(gemueseOptionen, mahlzeit)))
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

    setMahlzeit(neueMahlzeit)
    setProtein(zufaelligesElement(nachMahlzeitGefiltert(proteinOptionen, neueMahlzeit)))
    setCarbs(zufaelligesElement(nachMahlzeitGefiltert(carbsOptionen, neueMahlzeit)))
    setFett(zufaelligesElement(nachMahlzeitGefiltert(fettOptionen, neueMahlzeit)))
    setGemuese(zufaelligesElement(nachMahlzeitGefiltert(gemueseOptionen, neueMahlzeit)))
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

      <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />

      <section id="slots" className="grid grid-cols-2 gap-4 p-4">
        <SlotKarte titel="Protein" text={protein.name} onWuerfeln={proteinWuerfeln} />
        <SlotKarte titel="Carbs" text={carbs.name} onWuerfeln={carbsWuerfeln} />
        <SlotKarte titel="Fett" text={fett.name} onWuerfeln={fettWuerfeln} />
        <SlotKarte titel="Gemüse" text={gemuese.name} onWuerfeln={gemueseWuerfeln} />
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
  )
}

export default App
