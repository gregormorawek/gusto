// Prueft, ob eine Kalorienziel-Auswahl ({ typ, kalorien: { min, max } })
// vollstaendig gueltig ist: "kein Ziel" ist immer gueltig, bei
// "proMahlzeit"/"proTag" muessen zusaetzlich Min UND Max positiv eingetragen
// sein UND Min echt kleiner als Max sein. Eigene Datei statt privat in
// OnboardingWizard.jsx, damit WizardTageskarte.jsx sie ohne zirkulaeren
// Import mitnutzen kann (beide brauchen dieselbe Gueltigkeits-Logik).
export function kalorienZielGueltig(ziel) {
  if (!ziel.typ) {
    return false
  }
  if (ziel.typ === 'kein') {
    return true
  }
  const minZahl = Number(ziel.kalorien.min)
  const maxZahl = Number(ziel.kalorien.max)
  return (
    ziel.kalorien.min !== '' &&
    ziel.kalorien.max !== '' &&
    Number.isFinite(minZahl) &&
    Number.isFinite(maxZahl) &&
    minZahl > 0 &&
    maxZahl > 0 &&
    minZahl < maxZahl
  )
}
