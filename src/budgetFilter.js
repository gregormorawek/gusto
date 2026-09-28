// Budget-gewichtete Rezeptauswahl: das Kalorienziel beeinflusst, welche
// Rezepte beim Wischen gezogen werden. Reine Funktionen ohne React (isoliert
// testbar, siehe scripts/teste-budget-filter.mjs). Angedockt wird ueber den
// passtZuBudget-Parameter von rezeptAusStapelZiehen (rezepteFilter.js) -
// der Stapel selbst bleibt budget-unabhaengig, das Budget filtert nur beim
// ZIEHEN (siehe dortiger Kommentar).
//
// Produktregeln (Gregor, siehe CLAUDE.md Abschnitt 7):
// - Ernaehrungsform/Geschmack sind harte Filter (gefiltertePoolFuerRezepte),
//   das Budget ist ein WEICHER Filter obendrauf.
// - Der Bildschirm darf nie wegen des Budgets leer sein: passen zu wenige
//   Rezepte, kommen die naechstliegenden (siehe passendeRezeptIds).
// - Ohne aktives, gueltiges Kalorienziel verhaelt sich alles wie vorher.

// Anteil der Tages-Kalorien je Mahlzeit bei ziel.typ === 'proTag'. Bewusst
// NICHT 25/35/30/10 (Basiswerte der stillgelegten portionenRechner.js),
// sondern datenbasiert: die Mediane der Rezepte (Fruehstueck 509, Mittag
// 594, Abend 652, Snack 331 kcal) summieren sich auf ~2.090 kcal und
// entsprechen grob 24/28/31/16 % - Abend ist die schwerste Mahlzeit, der
// Snack groesser als 10 %. Bei 2.200 kcal treffen die Budgets damit die
// Mediane fast exakt.
export const BUDGET_ANTEIL = { fruehstueck: 0.25, mittag: 0.3, abend: 0.3, snack: 0.15 }

// So viele Rezepte muessen mindestens "passen" - sonst kommen stattdessen
// die MINDEST_TREFFER naechstliegenden (Fallback).
export const MINDEST_TREFFER = 6

// Spielraum um den Budget-Korridor: relativ zur Korridor-Mitte, aber nie
// unter dem absoluten Mindestspielraum. Ohne Untergrenze waere er beim Snack
// (Budget ~240 kcal) nur +-36 kcal - viel zu eng fuer die Streuung der Daten.
const SPIELRAUM_ANTEIL = 0.15
const SPIELRAUM_MIN_KCAL = 75

// Liefert den gueltigen Kalorien-Korridor { min, max } des Ziels (Tages- bzw.
// Mahlzeit-Korridor je nach Typ) oder null bei "kein Ziel"/ungueltigen
// Werten. Dieselbe Gueltigkeitsregel wie kalorienZielGueltig (Min > 0,
// Max > 0, Min < Max), bewusst hier eigenstaendig, weil sie auch mit dem
// halb ausgefuellten Zustand aus den Einstellungen klarkommen muss.
function zielKorridor(ziel) {
  if (!ziel || (ziel.typ !== 'proTag' && ziel.typ !== 'proMahlzeit')) {
    return null
  }
  const min = Number(ziel.kalorien?.min)
  const max = Number(ziel.kalorien?.max)
  if (!(min > 0) || !(max > 0) || min >= max) {
    return null
  }
  return { min, max }
}

// Budget-Korridor { min, max } fuer EINE Mahlzeit, oder null (= kein Filter).
//
// - 'proMahlzeit': der Korridor gilt direkt pro Mahlzeit, keine Verteilung,
//   keine Dynamik.
// - 'proTag': das Budget ist DYNAMISCH. Bereits uebernommene Rezepte ANDERER
//   Mahlzeiten werden von Min UND Max des Tageskorridors abgezogen, der Rest
//   verteilt sich nach BUDGET_ANTEIL auf die noch offenen Mahlzeiten (zu
//   denen die betrachtete Mahlzeit IMMER zaehlt - hat sie selbst schon eine
//   Auswahl, gilt sie fuers Budget wieder als offen, damit ein Austausch
//   nicht gegen das eigene alte Rezept gerechnet wird). Die letzte offene
//   Mahlzeit bekommt dadurch automatisch den ganzen Rest (Anteil 1).
//
// aktiveSlugs: aktive Mahlzeiten (nur die zaehlen), uebernommeneKcal:
// { [mahlzeitSlug]: kcal_pro_portion des uebernommenen Rezepts }.
// Der Rest kann negativ werden (Tag schon ueberschritten) - das ist gewollt,
// passendeRezeptIds faellt dann auf die kleinsten Rezepte zurueck.
export function mahlzeitBudget(ziel, aktiveSlugs, uebernommeneKcal, mahlzeitSlug) {
  const korridor = zielKorridor(ziel)
  if (!korridor || !aktiveSlugs.includes(mahlzeitSlug)) {
    return null
  }
  if (ziel.typ === 'proMahlzeit') {
    return korridor
  }

  const bereitsGegessen = aktiveSlugs
    .filter((slug) => slug !== mahlzeitSlug && uebernommeneKcal[slug] != null)
    .reduce((summe, slug) => summe + Number(uebernommeneKcal[slug]), 0)
  const offeneSlugs = aktiveSlugs.filter((slug) => slug === mahlzeitSlug || uebernommeneKcal[slug] == null)
  const anteilSumme = offeneSlugs.reduce((summe, slug) => summe + (BUDGET_ANTEIL[slug] ?? 0), 0)
  const anteil = anteilSumme > 0 ? (BUDGET_ANTEIL[mahlzeitSlug] ?? 0) / anteilSumme : 1

  return {
    min: (korridor.min - bereitsGegessen) * anteil,
    max: (korridor.max - bereitsGegessen) * anteil,
  }
}

// Abstand eines kcal-Werts zum Korridor (0 = innerhalb).
function abstandZuKorridor(kcal, korridor) {
  if (kcal < korridor.min) return korridor.min - kcal
  if (kcal > korridor.max) return kcal - korridor.max
  return 0
}

// Menge der Rezept-IDs aus pool, die zum Budget-Korridor "passen".
//
// 1. Regulaer: alle Rezepte, deren Abstand zum Korridor <= Spielraum ist.
// 2. Fallback: kommen dabei weniger als MINDEST_TREFFER heraus (bzw. der
//    ganze Pool, falls der kleiner ist - z. B. bei Vegan + Fruehstueck), zaehlen
//    stattdessen die MINDEST_TREFFER naechstliegenden. Bewusst KEIN
//    stufenweises Aufweiten des Spielraums: bei extremen Budgets (3.000 kcal
//    Mittag) waere er nach wenigen Stufen so breit, dass gar nicht mehr
//    gefiltert wuerde - Rang statt Schwellwert erhaelt die Wirkung.
//    Dadurch ist das Ergebnis nie leer, solange der Pool nicht leer ist.
export function passendeRezeptIds(pool, korridor, mindestTreffer = MINDEST_TREFFER) {
  const mitte = (korridor.min + korridor.max) / 2
  const spielraum = Math.max(SPIELRAUM_ANTEIL * Math.abs(mitte), SPIELRAUM_MIN_KCAL)

  const mitAbstand = pool.map((r) => ({ id: r.id, abstand: abstandZuKorridor(Number(r.kcal_pro_portion), korridor) }))
  const regulaer = mitAbstand.filter((r) => r.abstand <= spielraum)
  const noetig = Math.min(mindestTreffer, pool.length)
  if (regulaer.length >= noetig) {
    return new Set(regulaer.map((r) => r.id))
  }
  const nachAbstand = [...mitAbstand].sort((a, b) => a.abstand - b.abstand)
  return new Set(nachAbstand.slice(0, noetig).map((r) => r.id))
}

// Baut den passtZuBudget-Pruefer fuer rezeptAusStapelZiehen: undefined bei
// "kein Budget" (der Stapel nutzt dann seinen Standard, der alles passieren
// laesst), sonst eine Funktion Rezept -> Boolean auf Basis von
// passendeRezeptIds. pool ist der bereits nach Mahlzeit/Diaet/Geschmack
// gefilterte Pool, aus dem auch gezogen wird.
export function budgetPruefer(pool, korridor) {
  if (!korridor) {
    return undefined
  }
  const ids = passendeRezeptIds(pool, korridor)
  return (rezept) => ids.has(rezept.id)
}

// Stabiler Text-Schluessel eines Budget-Korridors (auf ganze kcal gerundet),
// zum Erkennen "hat sich das Budget dieser Mahlzeit geaendert?" (App.jsx,
// stilles Neuziehen). Leerer String = kein Budget.
export function budgetSchluessel(korridor) {
  return korridor ? `${Math.round(korridor.min)}-${Math.round(korridor.max)}` : ''
}

// Komfort-Wrapper fuer App.jsx: ermittelt den Budget-Korridor einer Mahlzeit
// direkt aus den App-States. tagesauswahlMahlzeiten ist
// tagesauswahl.mahlzeiten ({ [slug]: rezeptId | null }), rezepte die
// komplette Rezepte-Liste (fuer die kcal der uebernommenen Rezepte).
export function korridorFuerMahlzeit(ziel, aktiveSlugs, tagesauswahlMahlzeiten, rezepte, mahlzeitSlug) {
  const uebernommeneKcal = {}
  for (const [slug, rezeptId] of Object.entries(tagesauswahlMahlzeiten ?? {})) {
    if (rezeptId == null) {
      continue
    }
    const rezept = rezepte.find((r) => r.id === rezeptId)
    if (rezept) {
      uebernommeneKcal[slug] = Number(rezept.kcal_pro_portion)
    }
  }
  return mahlzeitBudget(ziel, aktiveSlugs, uebernommeneKcal, mahlzeitSlug)
}
