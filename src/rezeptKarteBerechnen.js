import { aufPortionSkalieren, portionenMitMakroZielenBerechnen } from './portionenRechner'

// Baut aus einem Rezept alles, was RezeptKarte.jsx zum Anzeigen braucht: die
// 4 referenzierten Zutaten-Objekte (Namens-/Naehrwert-Join gegen die schon
// geladene zutatenNachId-Map) plus die LIVE berechneten Portionen/Summen.
//
// Bewusst eine reine Funktion in einer eigenen Datei (statt privat in
// RezeptKarte.jsx) - RezepteAnsicht.jsx (proTag-Zweig) braucht dieselbe
// Rechnung fuer die kompakte Tages-Makrosumme ueber ALLE aktiven Mahlzeiten,
// nicht nur fuer die eine gerade angezeigte Karte. Ausserdem exportiert eine
// Komponenten-Datei damit ausschliesslich die Komponente selbst (Fast
// Refresh/HMR-Konvention).
//
// Kein State/Effekt fuer die Portionen (anders als in der Einzel-Ansicht,
// wo proteinPortion etc. State sind und nur bei Wuerfeln/manueller
// Auswahl/Makro-Ziel-Aenderung explizit neu gesetzt werden - eine reine
// Kalorienziel-Aenderung loest dort KEIN sofortiges Neuberechnen aus). Hier
// reicht ein reiner Render-Wert: die 4 Zutaten stehen durchs Rezept fest, es
// findet keine ziel-bewusste AUSWAHL mehr statt (vergleichbar mit dem Pfad
// nach einer manuellen Wahl im Reroll-Suchfeld) - nur noch
// Portionsberechnung. So reagieren die Zahlen automatisch auf JEDE
// Aenderung von ziel/makroZiele in den Einstellungen.
export function rezeptKarteBerechnen(rezept, zutatenNachId, ziel, makroZiele) {
  if (!rezept) {
    return null
  }
  const proteinZutat = zutatenNachId[rezept.protein_zutat_id]
  const carbsZutat = zutatenNachId[rezept.carbs_zutat_id]
  const fettZutat = zutatenNachId[rezept.fett_zutat_id]
  const gemueseZutat = zutatenNachId[rezept.gemuese_obst_zutat_id]
  const makroZieleFuerRezept = makroZiele[rezept.mahlzeit] ?? { protein: '', carbs: '', fett: '' }

  const portionen = portionenMitMakroZielenBerechnen(
    proteinZutat,
    carbsZutat,
    fettZutat,
    gemueseZutat,
    rezept.mahlzeit,
    ziel,
    makroZieleFuerRezept
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

  return { proteinZutat, carbsZutat, fettZutat, gemueseZutat, makroZieleFuerRezept, portionen, summeKalorien, summeProtein, summeCarbs, summeFett }
}
