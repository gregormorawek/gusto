import { useEffect, useState } from 'react'
import './App.css'
import SlotKarte from './components/SlotKarte'
import { supabase } from './supabase'

// Hilfsfunktion: gibt aus einer beliebigen Liste ein zufaelliges Element zurueck.
function zufaelligesElement(liste) {
  const zufallsIndex = Math.floor(Math.random() * liste.length)
  return liste[zufallsIndex]
}

function App() {
  // Diese Listen kamen frueher aus hartcodierten Arrays,
  // jetzt fuellen wir sie per useEffect aus der Datenbank.
  const [proteinOptionen, setProteinOptionen] = useState([])
  const [carbsOptionen, setCarbsOptionen] = useState([])
  const [fettOptionen, setFettOptionen] = useState([])
  const [gemueseOptionen, setGemueseOptionen] = useState([])

  // State speichert die aktuell angezeigte Zutat pro Kategorie.
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fett, setFett] = useState('')
  const [gemuese, setGemuese] = useState('')

  // Solange die Daten noch nicht aus der Datenbank geladen sind, zeigen wir "Laedt...".
  const [laedt, setLaedt] = useState(true)

  // Leeres Array [] als zweites Argument: dieser Code laeuft nur EINMAL,
  // wenn die Komponente zum ersten Mal angezeigt wird.
  useEffect(() => {
    async function zutatenLaden() {
      const { data, error } = await supabase
        .from('zutaten')
        .select('name, kategorie')
        .eq('aktiv', true)

      if (error) {
        console.error('Fehler beim Laden der Zutaten:', error)
        setLaedt(false)
        return
      }

      // Die geladenen Zeilen (alle Kategorien gemischt) nach kategorie
      // aufteilen und jeweils nur die name-Werte behalten.
      const proteine = data.filter((z) => z.kategorie === 'protein').map((z) => z.name)
      const carbsListe = data.filter((z) => z.kategorie === 'carbs').map((z) => z.name)
      const fetteListe = data.filter((z) => z.kategorie === 'fett').map((z) => z.name)
      const gemueseListe = data.filter((z) => z.kategorie === 'gemuese').map((z) => z.name)

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

  if (laedt) {
    return <p className="p-4">Lädt...</p>
  }

  return (
    <>
      <section id="slots" className="grid grid-cols-2 gap-4 p-4">
        <SlotKarte titel="Protein" text={protein} />
        <SlotKarte titel="Carbs" text={carbs} />
        <SlotKarte titel="Fett" text={fett} />
        <SlotKarte titel="Gemüse" text={gemuese} />
      </section>

      <button type="button" onClick={neueAuswahlWuerfeln} className="m-4 rounded-lg bg-blue-600 px-4 py-2 text-white">
        Neue Auswahl würfeln
      </button>
    </>
  )
}

export default App
