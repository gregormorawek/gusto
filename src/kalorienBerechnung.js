// Reine Rechen-Logik fuer den optionalen Kalorienrechner-Wizard
// (Kalorienrechner.jsx) - komplett von React/JSX getrennt, damit sie isoliert
// (ohne Rendering) testbar bleibt. Mifflin-St-Jeor-Formel fuer den
// Grundumsatz (siehe Aufgabenstellung "Kalorienrechner-Wizard" fuer die
// genauen Werte/Herkunft).

// Aktivitaetsstufen: id -> Label/Erklaerzeile fuers Rendering in
// Kalorienrechner.jsx. Die ids sind zugleich die Schluessel in
// AKTIVITAETSFAKTOR unten - EINE Quelle der Wahrheit, damit UI-Auswahl und
// Rechen-Logik nie auseinanderlaufen koennen.
export const AKTIVITAETEN = [
  { id: 'kaumAktiv', label: 'Kaum aktiv', erklaerung: 'Sitzender Alltag, kaum Sport' },
  { id: 'leichtAktiv', label: 'Leicht aktiv', erklaerung: '1–2× Sport pro Woche' },
  { id: 'maessigAktiv', label: 'Mäßig aktiv', erklaerung: '3–5× Sport pro Woche' },
  { id: 'sehrAktiv', label: 'Sehr aktiv', erklaerung: 'Täglich Sport / körperlicher Job' },
]

// id -> Multiplikator auf den Grundumsatz (BMR), ergibt den Gesamtumsatz (TDEE).
const AKTIVITAETSFAKTOR = {
  kaumAktiv: 1.2,
  leichtAktiv: 1.375,
  maessigAktiv: 1.55,
  sehrAktiv: 1.725,
}

// Ziel-Optionen: id -> Label/Erklaerzeile, analog zu AKTIVITAETEN oben.
export const ZIELE = [
  { id: 'abnehmen', label: 'Abnehmen', erklaerung: 'Moderates Kaloriendefizit' },
  { id: 'halten', label: 'Gewicht halten', erklaerung: 'Kalorien im Gleichgewicht' },
  { id: 'zunehmen', label: 'Zunehmen', erklaerung: 'Leichter Kalorienüberschuss' },
]

// id -> Multiplikator auf den Gesamtumsatz (TDEE), ergibt den rohen
// Kalorien-Zielwert (vor Rundung/Sicherheits-Untergrenze).
const ZIEL_FAKTOR = {
  abnehmen: 0.8,
  halten: 1,
  zunehmen: 1.1,
}

// Sichere Kalorien-Untergrenze je Geschlecht - faellt der rohe Zielwert
// darunter, wird er auf diese Schwelle angehoben (siehe wurdeAngehoben in
// berechneKalorienZiel unten).
const UNTERGRENZE_KCAL = { weiblich: 1200, maennlich: 1500 }

const PROTEIN_G_PRO_KG = 1.8
const FETT_ANTEIL_AN_ZIELKALORIEN = 0.27
const KCAL_PRO_G_PROTEIN = 4
const KCAL_PRO_G_FETT = 9
const KCAL_PRO_G_CARBS = 4
const MIN_MAX_SPANNE_KCAL = 100
const RUNDUNGS_SCHRITT_KCAL = 10

function rundeAuf(wert, schritt) {
  return Math.round(wert / schritt) * schritt
}

// Grundumsatz (Basal Metabolic Rate) nach Mifflin-St-Jeor.
function grundumsatz({ geschlecht, alterJahre, groesseCm, gewichtKg }) {
  const basis = 10 * gewichtKg + 6.25 * groesseCm - 5 * alterJahre
  return geschlecht === 'maennlich' ? basis + 5 : basis - 161
}

// Makros aus den bereits finalen Zielkalorien (nach Rundung UND ggf.
// Anhebung auf die Sicherheits-Untergrenze) + Koerpergewicht ableiten.
// Reihenfolge wichtig: Protein zuerst (fix pro kg Koerpergewicht), dann Fett
// (fester Anteil an den Zielkalorien), Kohlenhydrate erhalten den REST der
// Kalorien - wuerde man Carbs zuerst fix vorgeben, koennten sie bei sehr
// niedrigen Zielkalorien rechnerisch negativ werden.
function makrosBerechnen(zielKalorien, gewichtKg) {
  const proteinG = gewichtKg * PROTEIN_G_PRO_KG
  const proteinKcal = proteinG * KCAL_PRO_G_PROTEIN
  const fettKcal = zielKalorien * FETT_ANTEIL_AN_ZIELKALORIEN
  const fettG = fettKcal / KCAL_PRO_G_FETT
  const carbsKcal = Math.max(0, zielKalorien - proteinKcal - fettKcal)
  const carbsG = carbsKcal / KCAL_PRO_G_CARBS
  return {
    proteinG: Math.round(proteinG),
    kohlenhydrateG: Math.round(carbsG),
    fettG: Math.round(fettG),
  }
}

// Haupt-Einstiegspunkt: berechnet aus den 6 Wizard-Antworten das komplette
// Kalorien-/Makro-Ziel. eingaben = { geschlecht: 'weiblich'|'maennlich',
// alterJahre, groesseCm, gewichtKg, aktivitaet: id aus AKTIVITAETEN,
// ziel: id aus ZIELE }.
//
// Rueckgabe: { zielKalorien, minKalorien, maxKalorien, proteinG,
// kohlenhydrateG, fettG, wurdeAngehoben }. wurdeAngehoben zeigt an, ob der
// rohe Zielwert unter die Sicherheits-Untergrenze fiel und deshalb
// angehoben wurde - der (in Prompt 2 folgende) Ergebnis-Screen soll das dem
// User dann als freundlichen Hinweis zeigen.
export function berechneKalorienZiel({ geschlecht, alterJahre, groesseCm, gewichtKg, aktivitaet, ziel }) {
  const bmr = grundumsatz({ geschlecht, alterJahre, groesseCm, gewichtKg })
  const tdee = bmr * AKTIVITAETSFAKTOR[aktivitaet]
  const zielKalorienRoh = tdee * ZIEL_FAKTOR[ziel]

  const untergrenze = UNTERGRENZE_KCAL[geschlecht]
  const wurdeAngehoben = zielKalorienRoh < untergrenze
  const zielKalorienBasis = wurdeAngehoben ? untergrenze : zielKalorienRoh

  const zielKalorien = rundeAuf(zielKalorienBasis, RUNDUNGS_SCHRITT_KCAL)
  const { proteinG, kohlenhydrateG, fettG } = makrosBerechnen(zielKalorien, gewichtKg)

  return {
    zielKalorien,
    minKalorien: zielKalorien - MIN_MAX_SPANNE_KCAL,
    maxKalorien: zielKalorien + MIN_MAX_SPANNE_KCAL,
    proteinG,
    kohlenhydrateG,
    fettG,
    wurdeAngehoben,
  }
}
