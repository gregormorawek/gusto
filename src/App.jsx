import { useEffect, useState } from 'react'
import './App.css'
import SlotKarte from './components/SlotKarte'
import { supabase } from './supabase'

// Hilfsfunktion: gibt aus einer beliebigen Liste ein zufaelliges Element zurueck.
function zufaelligesElement(liste) {
  const zufallsIndex = Math.floor(Math.random() * liste.length)
  return liste[zufallsIndex]
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

  // Solange die Daten noch nicht aus der Datenbank geladen sind, zeigen wir "Laedt...".
  const [laedt, setLaedt] = useState(true)

  // Leeres Array [] als zweites Argument: dieser Code laeuft nur EINMAL,
  // wenn die Komponente zum ersten Mal angezeigt wird.
  useEffect(() => {
    async function zutatenLaden() {
      const { data, error } = await supabase
        .from('zutaten')
        // Zusaetzlich zu name und kategorie laden wir jetzt auch die
        // Naehrwert-Spalten und die Portionsgroesse (portion_g) mit,
        // damit wir spaeter eine Summe berechnen koennen.
        .select('name, kategorie, kalorien, protein_g, carbs_g, fett_g, portion_g')
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

      // Direkt eine erste zufaellige Auswahl setzen, sobald die Daten da sind.
      setProtein(zufaelligesElement(proteine))
      setCarbs(zufaelligesElement(carbsListe))
      setFett(zufaelligesElement(fetteListe))
      setGemuese(zufaelligesElement(gemueseListe))

      setLaedt(false)
    }

    zutatenLaden()
  }, [])

  // Waehlt fuer jede Kategorie eine neue zufaellige Zutat aus und
  // schreibt sie in den jeweiligen State.
  function neueAuswahlWuerfeln() {
    setProtein(zufaelligesElement(proteinOptionen))
    setCarbs(zufaelligesElement(carbsOptionen))
    setFett(zufaelligesElement(fettOptionen))
    setGemuese(zufaelligesElement(gemueseOptionen))
  }

  // Diese vier Funktionen aendern jeweils nur EINEN State.
  // Sie werden gleich als Prop an die passende SlotKarte weitergegeben,
  // damit deren kleiner Re-Roll-Button nur diesen einen Slot neu wuerfelt.
  function proteinWuerfeln() {
    setProtein(zufaelligesElement(proteinOptionen))
  }

  function carbsWuerfeln() {
    setCarbs(zufaelligesElement(carbsOptionen))
  }

  function fettWuerfeln() {
    setFett(zufaelligesElement(fettOptionen))
  }

  function gemueseWuerfeln() {
    setGemuese(zufaelligesElement(gemueseOptionen))
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
    aufPortionSkalieren(protein.kalorien, protein.portion_g) +
    aufPortionSkalieren(carbs.kalorien, carbs.portion_g) +
    aufPortionSkalieren(fett.kalorien, fett.portion_g) +
    aufPortionSkalieren(gemuese.kalorien, gemuese.portion_g)

  const summeProtein =
    aufPortionSkalieren(protein.protein_g, protein.portion_g) +
    aufPortionSkalieren(carbs.protein_g, carbs.portion_g) +
    aufPortionSkalieren(fett.protein_g, fett.portion_g) +
    aufPortionSkalieren(gemuese.protein_g, gemuese.portion_g)

  const summeCarbs =
    aufPortionSkalieren(protein.carbs_g, protein.portion_g) +
    aufPortionSkalieren(carbs.carbs_g, carbs.portion_g) +
    aufPortionSkalieren(fett.carbs_g, fett.portion_g) +
    aufPortionSkalieren(gemuese.carbs_g, gemuese.portion_g)

  const summeFett =
    aufPortionSkalieren(protein.fett_g, protein.portion_g) +
    aufPortionSkalieren(carbs.fett_g, carbs.portion_g) +
    aufPortionSkalieren(fett.fett_g, fett.portion_g) +
    aufPortionSkalieren(gemuese.fett_g, gemuese.portion_g)

  return (
    <>
      <section id="slots" className="grid grid-cols-2 gap-4 p-4">
        <SlotKarte titel="Protein" text={protein.name} onWuerfeln={proteinWuerfeln} />
        <SlotKarte titel="Carbs" text={carbs.name} onWuerfeln={carbsWuerfeln} />
        <SlotKarte titel="Fett" text={fett.name} onWuerfeln={fettWuerfeln} />
        <SlotKarte titel="Gemüse" text={gemuese.name} onWuerfeln={gemueseWuerfeln} />
      </section>

      <section id="summe" className="mx-4 rounded-lg border border-gray-300 p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Summe</h2>
        <p className="text-gray-600">{summeKalorien.toFixed(1)} kcal</p>
        <p className="text-gray-600">Protein: {summeProtein.toFixed(1)} g</p>
        <p className="text-gray-600">Carbs: {summeCarbs.toFixed(1)} g</p>
        <p className="text-gray-600">Fett: {summeFett.toFixed(1)} g</p>
      </section>

      <button type="button" onClick={neueAuswahlWuerfeln} className="m-4 rounded-lg bg-blue-600 px-4 py-2 text-white">
        Neue Auswahl würfeln
      </button>
    </>
  )
}

export default App
