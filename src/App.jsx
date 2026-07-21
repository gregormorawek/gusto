import { useState } from 'react'
import './App.css'
import SlotKarte from './components/SlotKarte'

// Moegliche Zutaten pro Kategorie.
// Der Button (Schritt 3c) wird spaeter zufaellig eine davon auswaehlen.
const proteinOptionen = ['Huehnchen', 'Rind', 'Fisch', 'Tofu', 'Eier']
const carbsOptionen = ['Reis', 'Nudeln', 'Kartoffeln', 'Quinoa', 'Brot']
const fettOptionen = ['Olivenoel', 'Avocado', 'Nuesse', 'Butter']
const gemueseOptionen = ['Brokkoli', 'Spinat', 'Paprika', 'Karotten']

// Hilfsfunktion: gibt aus einer beliebigen Liste ein zufaelliges Element zurueck.
function zufaelligesElement(liste) {
  const zufallsIndex = Math.floor(Math.random() * liste.length)
  return liste[zufallsIndex]
}

function App() {
  // State speichert die aktuell angezeigte Zutat pro Kategorie.
  // Als Startwert nehmen wir einfach die erste Zutat aus jeder Liste.
  const [protein, setProtein] = useState(proteinOptionen[0])
  const [carbs, setCarbs] = useState(carbsOptionen[0])
  const [fett, setFett] = useState(fettOptionen[0])
  const [gemuese, setGemuese] = useState(gemueseOptionen[0])

  // Waehlt fuer jede Kategorie eine neue zufaellige Zutat aus und
  // schreibt sie in den jeweiligen State.
  function neueAuswahlWuerfeln() {
    setProtein(zufaelligesElement(proteinOptionen))
    setCarbs(zufaelligesElement(carbsOptionen))
    setFett(zufaelligesElement(fettOptionen))
    setGemuese(zufaelligesElement(gemueseOptionen))
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
