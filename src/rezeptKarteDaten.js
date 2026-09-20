// Liest ein Rezept-Objekt (aus dem select()-Embed in App.jsx, siehe dort:
// rezept_zutaten(..., zutaten(...))) in die Form, die die Anzeige braucht.
// Anders als der Vorgaenger rezeptKarteBerechnen (portionenRechner.js,
// Gaussscher Loeser) wird hier nichts mehr berechnet - Naehrwerte und
// Mengen kommen fertig aus der DB. Deshalb "Daten" statt "Berechnen" im
// Namen, und keine Parameter mehr fuer zutatenNachId/ziel/makroZiele.
//
// Bewusst weiterhin eine reine Funktion in einer eigenen Datei (nicht privat
// in einer Komponente) - dieselbe Begruendung wie beim Vorgaenger gilt
// unveraendert: RezeptSchwipKarte.jsx, TagAnsicht.jsx UND einkaufsliste.js
// brauchen dieselbe Rueckgabe.
export function rezeptKarteDaten(rezept) {
  if (!rezept) {
    return null
  }

  // rezept.rezept_zutaten kommt zwar schon sortiert aus der DB (.order() in
  // App.jsx), hier zusaetzlich sortiert als Absicherung falls diese Funktion
  // je mit einem Rezept-Objekt aus einer anderen Quelle aufgerufen wird -
  // bei 4-12 Eintraegen vernachlaessigbare Kosten.
  const zutaten = (rezept.rezept_zutaten ?? [])
    .slice()
    .sort((a, b) => a.sortierung - b.sortierung)
    .map((rezeptZutat) => ({
      zutatId: rezeptZutat.zutat_id,
      name: rezeptZutat.zutaten.name,
      kategorie: rezeptZutat.zutaten.kategorie,
      supermarktKategorie: rezeptZutat.zutaten.supermarkt_kategorie,
      istGrundzutat: rezeptZutat.zutaten.ist_grundzutat,
      mengeG: rezeptZutat.menge_g,
      anzeigeMenge: rezeptZutat.anzeige_menge,
      anzeigeEinheit: rezeptZutat.anzeige_einheit,
      anmerkung: rezeptZutat.anmerkung,
      optional: rezeptZutat.optional,
    }))

  return {
    zutaten,
    // Namen bewusst identisch zum Vorgaenger (summeKalorien/summeProtein/
    // summeCarbs/summeFett) - dadurch aendert Schritt 3 nur die Aufrufzeile,
    // nicht die Anzeige-JSX. ?? 0 faengt ein Rezept ohne gepflegte
    // Naehrwerte ab (zeigt dann 0 statt NaN in der UI).
    summeKalorien: rezept.kcal_pro_portion ?? 0,
    summeProtein: rezept.protein_pro_portion ?? 0,
    summeCarbs: rezept.carbs_pro_portion ?? 0,
    summeFett: rezept.fett_pro_portion ?? 0,
  }
}

// Namensfalle: rezept.portionen (wie viele Portionen die obigen Mengen
// ergeben) ist NICHT dasselbe wie das alte karte.portionen vom Vorgaenger
// (dort: Slot-Gramm pro Zutat, {proteinPortion, carbsPortion, ...}). Wird in
// dieser Etappe bewusst nicht gelesen - die Multiplikation damit kommt erst
// mit der Personenzahl-Einstellung.
