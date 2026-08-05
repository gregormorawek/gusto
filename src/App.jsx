import { useEffect, useState } from 'react'
import './App.css'
import SlotKarte from './components/SlotKarte'
import MahlzeitFilter from './components/MahlzeitFilter'
import SuessDeftigFilter from './components/SuessDeftigFilter'
import TagesplanAnsicht from './components/TagesplanAnsicht'
import OnboardingWizard from './components/OnboardingWizard'
import EinstellungenPanel from './components/EinstellungenPanel'
import { MAHLZEITEN } from './mahlzeiten'
import { supabase } from './supabase'
import { gefiltertePoolFuer, vierterSlotOptionenFuer } from './zutatenFilter'

// Feste Reihenfolge der Mahlzeit-Typen fuer den Tagesplan, uebernommen aus
// den Filter-Slugs (fruehstueck, mittag, abend, snack).
const MAHLZEIT_REIHENFOLGE = MAHLZEITEN.map((m) => m.slug)

const ZIEL_LOCALSTORAGE_KEY = 'gusto-ziel'

// Standard-Ziel: kein Kalorienziel, kein Makro-Gesamtziel fuer den Tag.
const ZIEL_STANDARD = { typ: 'kein', kalorien: { min: '', max: '' }, makro: { protein: '', carbs: '', fett: '' } }

// Laedt das gespeicherte Kalorienziel (inkl. Makro-Gesamtziel fuer "Pro Tag")
// aus dem localStorage. Ist noch nichts gespeichert oder der Inhalt
// beschaedigt (z. B. kein gueltiges JSON), wird auf ZIEL_STANDARD
// zurueckgefallen. Der Merge mit ZIEL_STANDARD sorgt dafuer, dass auch aeltere,
// vor Einfuehrung des Makro-Gesamtziels gespeicherte Objekte (ohne "makro")
// sauber ergaenzt werden.
function zielLaden() {
  try {
    const gespeichert = localStorage.getItem(ZIEL_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return ZIEL_STANDARD
    }
    return { ...ZIEL_STANDARD, ...JSON.parse(gespeichert) }
  } catch {
    return ZIEL_STANDARD
  }
}

const ONBOARDING_LOCALSTORAGE_KEY = 'gusto-onboarding-abgeschlossen'

// Prueft, ob der Onboarding-Wizard beim allerersten Besuch schon einmal
// abgeschlossen wurde. Erst danach zeigt die App die Haupt-Ansicht sofort;
// vorher wird bei jedem Laden der Wizard angezeigt.
function onboardingAbgeschlossenLaden() {
  return localStorage.getItem(ONBOARDING_LOCALSTORAGE_KEY) === 'true'
}

const MAKRO_ZIELE_LOCALSTORAGE_KEY = 'gusto-makro-ziele'

// Laedt die gespeicherten Makro-Ziele (Protein/Carbs/Fett in Gramm, PRO
// MAHLZEIT-TYP) aus dem localStorage. Ist noch nichts gespeichert oder der
// Inhalt beschaedigt, wird ein leeres Objekt zurueckgegeben (= keine Ziele
// gesetzt). Form: { [mahlzeitTyp]: { protein, carbs, fett } }.
function makroZieleLaden() {
  try {
    const gespeichert = localStorage.getItem(MAKRO_ZIELE_LOCALSTORAGE_KEY)
    return gespeichert ? JSON.parse(gespeichert) : {}
  } catch {
    return {}
  }
}

const TAGESPLAN_MAHLZEITEN_LOCALSTORAGE_KEY = 'gusto-tagesplan-mahlzeiten'

// Laedt, welche Mahlzeiten bei "Ganzen Tag planen" beruecksichtigt werden
// sollen. Ist noch nichts gespeichert, der Inhalt beschaedigt oder leer,
// wird auf alle vier Mahlzeiten zurueckgefallen - das entspricht dem
// Verhalten vor Einfuehrung dieser Auswahl.
function tagesplanMahlzeitenLaden() {
  try {
    const gespeichert = localStorage.getItem(TAGESPLAN_MAHLZEITEN_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return MAHLZEIT_REIHENFOLGE
    }
    const geparst = JSON.parse(gespeichert)
    return Array.isArray(geparst) && geparst.length > 0 ? geparst : MAHLZEIT_REIHENFOLGE
  } catch {
    return MAHLZEIT_REIHENFOLGE
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

// Hilfsfunktion: rechnet einen 100g-Referenzwert (z. B. Kalorien pro 100g)
// auf die tatsaechliche Portionsgroesse der Zutat um.
function aufPortionSkalieren(wertPro100g, portionsGroesseInGramm) {
  return (wertPro100g / 100) * portionsGroesseInGramm
}

// Anteil der Tages-Kalorien, der bei ziel.typ === 'proTag' auf die jeweilige
// Mahlzeit entfaellt (Basiswerte fuer ALLE vier Mahlzeiten - siehe
// normalisierteTagesAnteile fuer die Umrechnung auf eine Teilmenge).
const TAGES_ANTEIL = { fruehstueck: 0.25, mittag: 0.35, abend: 0.3, snack: 0.1 }

// Normalisiert TAGES_ANTEIL auf eine Teilmenge ausgewaehlter Mahlzeiten, sodass
// die Anteile der ausgewaehlten Mahlzeiten wieder in Summe 100% ergeben. Bei
// z. B. nur Mittag+Abend: 0.35/(0.35+0.3) und 0.3/(0.35+0.3).
function normalisierteTagesAnteile(ausgewaehlteMahlzeiten) {
  const basisSumme = ausgewaehlteMahlzeiten.reduce((summe, typ) => summe + (TAGES_ANTEIL[typ] ?? 0), 0)
  if (basisSumme <= 0) {
    return {}
  }
  return Object.fromEntries(
    ausgewaehlteMahlzeiten.map((typ) => [typ, (TAGES_ANTEIL[typ] ?? 0) / basisSumme])
  )
}

// Ermittelt das Kalorienfenster (Min/Max) fuer EINE Mahlzeit-Kategorie,
// abhaengig vom gewaehlten Ziel-Typ. Gibt null zurueck, wenn kein Ziel aktiv
// ist oder Min/Max (noch) nicht beide gueltig eingegeben sind (Min muss
// echt kleiner als Max sein) - in dem Fall bleibt die Portion unskaliert
// (Faktor 1). anteilUeberschreibung ersetzt bei Bedarf den TAGES_ANTEIL-
// Basiswert (z. B. mit einem normalisierten Anteil aus dem Tagesplan, wenn
// nicht alle vier Mahlzeiten ausgewaehlt sind) - ohne Angabe (Einzel-
// Ansicht) bleibt das Verhalten unveraendert. Bei "Pro Tag" wird die
// TAGES_ANTEIL-Aufteilung auf Min UND Max GETRENNT angewendet, sodass jede
// Mahlzeit ihr eigenes Fenster bekommt.
function zielKalorienFensterFuerMahlzeit(zielWert, mahlzeitWert, anteilUeberschreibung) {
  const minZahl = Number(zielWert.kalorien.min)
  const maxZahl = Number(zielWert.kalorien.max)
  if (zielWert.typ === 'kein' || !minZahl || !maxZahl || minZahl <= 0 || maxZahl <= 0 || minZahl >= maxZahl) {
    return null
  }
  if (zielWert.typ === 'proMahlzeit') {
    return { min: minZahl, max: maxZahl }
  }
  const anteil = anteilUeberschreibung ?? TAGES_ANTEIL[mahlzeitWert] ?? 0
  return { min: minZahl * anteil, max: maxZahl * anteil }
}

// Toleranz fuer "kann eine Zutat OHNE Makro-Ziel einen Kalorien-Beitrag
// realistisch erreichen" beim Vorfiltern des Wuerfel-Pools (siehe
// nachErreichbaremKalorienBeitragGefiltert). Gilt NICHT fuer Slots MIT
// Makro-Ziel - deren Portion wird nie geklemmt, siehe
// makroZielPortionBerechnen und MAKRO_PORTION_PLAUSIBEL_MIN/MAX.
const KALORIEN_TOLERANZ = 0.15

// Berechnet den ungefaehren Kalorien-Beitrag, den EIN Slot beisteuern sollte,
// damit die Mahlzeit am Ende im aktiven Kalorienfenster landet: Restspielraum
// (Fenstermitte minus die bereits feststehenden Kalorien anderer Slots),
// gleichmaessig auf die noch zu befuellenden Slots verteilt. Ohne aktives
// Kalorienziel (kalorienFenster === null) gibt es keinen Beitrag vorzugeben -
// das Wuerfeln bleibt dann komplett offen wie bisher.
function zielKalorienBeitragFuerSlot(kalorienFenster, kalorienBereitsGefuellt, anzahlVerbleibenderSlots) {
  if (kalorienFenster === null) {
    return null
  }
  const mitte = (kalorienFenster.min + kalorienFenster.max) / 2
  return (mitte - kalorienBereitsGefuellt) / anzahlVerbleibenderSlots
}

// Schraenkt einen Zutaten-Pool VOR dem Wuerfeln auf Kandidaten ein, die den
// gewuenschten Kalorien-Beitrag realistisch erreichen koennen - "realistisch"
// heisst: innerhalb der bestehenden 0,5x-2x-Portionsklemmung der FLEXIBLEN
// Slots (siehe portionenMitMakroZielenBerechnen), aufgeweitet um
// KALORIEN_TOLERANZ. zielBeitrag === null (kein Kalorienziel aktiv) laesst
// den Pool unveraendert. Ist das Ergebnis leer, wird - wie bei allen anderen
// Filtern (nachMahlzeitGefiltert etc.) - auf den ungefilterten Pool
// zurueckgefallen, statt eine leere Auswahl zu liefern. Gilt NUR fuer Slots
// OHNE Makro-Ziel - fuer Slots MIT Makro-Ziel siehe
// nachErreichbaremMakroZielGefiltert.
function nachErreichbaremKalorienBeitragGefiltert(liste, zielBeitrag) {
  if (zielBeitrag === null) {
    return liste
  }

  const passt = liste.filter((z) => {
    const kalorienBeiMinPortion = aufPortionSkalieren(z.kalorien, z.portion_g * 0.5)
    const kalorienBeiMaxPortion = aufPortionSkalieren(z.kalorien, z.portion_g * 2)
    return (
      zielBeitrag >= kalorienBeiMinPortion * (1 - KALORIEN_TOLERANZ) &&
      zielBeitrag <= kalorienBeiMaxPortion * (1 + KALORIEN_TOLERANZ)
    )
  })
  return passt.length > 0 ? passt : liste
}

// Naehrwert-Spalte je Protein/Carbs/Fett-Kategorie - fuer generische Stellen
// (z. B. tagesplanSlotWuerfeln), die die Kategorie nur als String kennen.
const NAEHRWERT_SCHLUESSEL_NACH_KATEGORIE = { protein: 'protein_g', carbs: 'carbs_g', fett: 'fett_g' }

// Grosszuegige, aber sinnvolle Plausibilitaets-Spanne fuer die EXAKTE
// Makro-Ziel-Portion einer Zutat, relativ zu ihrer Datenbank-Standardportion
// (portion_g). Gilt IMMER, unabhaengig vom Kalorienziel-Status - anders als
// die 0,5x-2x-Spanne der flexiblen Slots (die durch die Portions-Skalierung
// dort noch nachtraeglich geklemmt wird) gibt es fuer Makro-Ziel-Slots ab
// jetzt KEINE Klemmung mehr (Makro-Ziele gewinnen), die exakte Portion wird
// 1:1 uebernommen. Deshalb muss schon beim Wuerfeln ausgeschlossen werden,
// dass eine ungeeignete Zutat (z. B. sehr proteinarmes Gemuese fuer ein
// hohes Protein-Ziel) zu einer absurd grossen oder kleinen Portion fuehrt.
const MAKRO_PORTION_PLAUSIBEL_MIN = 0.25
const MAKRO_PORTION_PLAUSIBEL_MAX = 4

// Liefert das gesetzte Makro-Ziel (Gramm, > 0) fuer Protein/Carbs/Fett einer
// Mahlzeit, oder null, wenn kein gueltiges Ziel gesetzt ist (leerer String,
// 0 oder negativ). null bedeutet in der gesamten Wuerfel-/Portionslogik
// "dieser Slot ist flexibel", ein Zahlenwert bedeutet "dieser Slot ist auf
// die exakte Ziel-Portion fixiert".
function makroZielGrammFuer(makroZieleWert, kategorie) {
  const wert = Number(makroZieleWert?.[kategorie])
  return wert > 0 ? wert : null
}

// Rechnet ein Makro-Ziel (Gramm) fuer EINE Zutat in die exakte Portion
// (Gramm) um, die dieses Ziel genau trifft. null, wenn die Zutat den
// Naehrwert gar nicht enthaelt (Ziel prinzipiell unerreichbar).
function makroZielExaktePortion(zutat, zielGramm, naehrwertSchluessel) {
  const naehrwertProGramm = zutat[naehrwertSchluessel] / 100
  return naehrwertProGramm > 0 ? zielGramm / naehrwertProGramm : null
}

// Schraenkt einen Zutaten-Pool auf Kandidaten ein, deren exakte Makro-Ziel-
// Portion plausibel ist (zwischen MAKRO_PORTION_PLAUSIBEL_MIN/MAX x der
// Datenbank-Standardportion) - UNABHAENGIG vom Kalorienziel-Status, siehe
// MAKRO_PORTION_PLAUSIBEL_MIN/MAX. Kandidaten ohne den Naehrwert ueberhaupt
// (naehrwertProGramm <= 0) fallen immer raus. Leeres Ergebnis faellt - wie
// bei allen anderen Filtern - auf den ungefilterten Pool zurueck. Eigene
// Funktion (statt in einem Rutsch mit dem Kalorien-Check), damit ein
// gescheiterter Kalorien-Check (siehe nachErreichbaremMakroZielGefiltert)
// NICHT auch noch die Plausibilitaets-Grenze mit wegwirft - gestaffelter
// Fallback, gleiches Prinzip wie gefiltertePoolFuer (Mahlzeit- vor Diaet- vor
// Suess/Deftig-Filter, jede Stufe mit eigenem Fallback).
function nachPlausiblerMakroZielPortionGefiltert(liste, naehrwertSchluessel, zielGramm) {
  const passt = liste.filter((z) => {
    const exaktePortion = makroZielExaktePortion(z, zielGramm, naehrwertSchluessel)
    if (exaktePortion === null) {
      return false
    }
    return exaktePortion >= z.portion_g * MAKRO_PORTION_PLAUSIBEL_MIN && exaktePortion <= z.portion_g * MAKRO_PORTION_PLAUSIBEL_MAX
  })
  return passt.length > 0 ? passt : liste
}

// Schraenkt den (bereits plausibilitaets-gefilterten) Pool eines Slots MIT
// gesetztem Makro-Ziel zusaetzlich auf Kandidaten ein, deren Kalorien bei
// ihrer exakten Ziel-Portion zusammen mit kalorienAndereSlots das erlaubte
// kalorienMax nicht ueberschreiten (das Minimum bleibt Aufgabe der
// flexiblen Slots, die koennen ihre Portion ja noch hochskalieren).
// kalorienMax === null (kein Kalorienziel aktiv) laesst den plausiblen Pool
// unveraendert. kalorienMax ist bewusst ein separater Parameter (nicht
// einfach kalorienFenster.max) - siehe vierSlotsWuerfeln: ein frueher Slot
// in der Wuerfel-Reihenfolge darf NICHT das komplette Fenster fuer sich
// beanspruchen, wenn danach noch WEITERE fixierte Slots folgen, die auch
// noch Platz brauchen. Findet sich KEIN Kandidat, der zusaetzlich zur
// Plausibilitaet auch noch das Kalorien-Budget einhaelt, gewinnt das
// Makro-Ziel: Fallback auf den plausiblen (aber ggf. zu kalorienreichen)
// Pool, NICHT auf den komplett ungefilterten Pool - die Plausibilitaets-
// Grenze bleibt also in jedem Fall gewahrt.
function nachErreichbaremMakroZielGefiltert(liste, naehrwertSchluessel, zielGramm, kalorienAndereSlots, kalorienMax) {
  const plausiblerPool = nachPlausiblerMakroZielPortionGefiltert(liste, naehrwertSchluessel, zielGramm)
  if (kalorienMax === null) {
    return plausiblerPool
  }

  const passt = plausiblerPool.filter((z) => {
    const exaktePortion = makroZielExaktePortion(z, zielGramm, naehrwertSchluessel)
    const kalorienBeiZielPortion = aufPortionSkalieren(z.kalorien, exaktePortion)
    return kalorienAndereSlots + kalorienBeiZielPortion <= kalorienMax
  })
  return passt.length > 0 ? passt : plausiblerPool
}

// Standard-Umrechnung Makro-Gramm -> Kalorien (Protein/Carbs 4 kcal/g, Fett
// 9 kcal/g). Dient NUR als theoretische UNTERGRENZE, um beim Wuerfeln
// Kalorien-Budget fuer noch nicht gezogene, aber ebenfalls fixierte Slots zu
// reservieren (siehe vierSlotsWuerfeln) - reale Zutaten brauchen wegen ihrer
// "Verunreinigung" mit anderen Naehrwerten fast immer mehr.
const KALORIEN_PRO_GRAMM_NACH_KATEGORIE = { protein: 4, carbs: 4, fett: 9 }

// Kalorien, die ein gerade gezogener Kandidat TATSAECHLICH beitragen wird -
// als Grundlage fuer den "bereits gefuellt"-Stand der naechsten Slots in der
// Wuerfel-Reihenfolge. Bei gesetztem Makro-Ziel die exakte Ziel-Portion
// (keine Klemmung mehr), sonst die Kalorien bei Datenbank-Standardportion
// (die eigentliche Fein-Skalierung der flexiblen Slots folgt erst als
// Nachbearbeitung in portionenMitMakroZielenBerechnen).
function erwarteteSlotKalorien(zutat, zielGramm, naehrwertSchluessel) {
  if (zielGramm !== null) {
    const exaktePortion = makroZielExaktePortion(zutat, zielGramm, naehrwertSchluessel)
    if (exaktePortion !== null) {
      return aufPortionSkalieren(zutat.kalorien, exaktePortion)
    }
  }
  return aufPortionSkalieren(zutat.kalorien, zutat.portion_g)
}

// Wuerfelt alle vier Slots NACHEINANDER in der festen Reihenfolge
// Protein -> Carbs -> Fett -> Gemuese/Obst (dieselbe Reihenfolge wie bei der
// Makro-Ziel-Anpassung). Fuer Slots MIT gesetztem Makro-Ziel gewinnt das
// Makro-Ziel (siehe nachErreichbaremMakroZielGefiltert): der Pool wird auf
// Kandidaten eingegrenzt, deren exakte Ziel-Portion realistisch UND (bei
// aktivem Kalorienziel) im Rahmen des Kalorien-Maximums bleibt. Fuer Slots
// OHNE Makro-Ziel bleibt die bisherige, flexible Vorfilterung
// (nachErreichbaremKalorienBeitragGefiltert) unveraendert bestehen. Haben
// Protein, Carbs UND Fett alle ein Makro-Ziel, bleibt kein steuerbarer Slot
// mehr uebrig - Gemuese/Obst wird dann ganz ohne Kalorien-Vorfilter
// gewuerfelt (siehe portionenMitMakroZielenBerechnen fuer die passende
// Nachbearbeitung). Der Wuerfel-Charakter bleibt in jedem Fall erhalten, nur
// der Pool ist vorgefiltert statt komplett offen.
function vierSlotsWuerfeln(
  proteinPool,
  carbsPool,
  fettPool,
  gemuesePool,
  obstPool,
  mahlzeitWert,
  diaetenWert,
  suessDeftigWert,
  zielWert,
  makroZieleWert,
  anteilUeberschreibung
) {
  const kalorienFenster = zielKalorienFensterFuerMahlzeit(zielWert, mahlzeitWert, anteilUeberschreibung)
  const proteinZiel = makroZielGrammFuer(makroZieleWert, 'protein')
  const carbsZiel = makroZielGrammFuer(makroZieleWert, 'carbs')
  const fettZiel = makroZielGrammFuer(makroZieleWert, 'fett')
  const alleDreiFixiert = proteinZiel !== null && carbsZiel !== null && fettZiel !== null

  // Theoretische MINDEST-Kalorien (reine Makro-Umrechnung, siehe
  // KALORIEN_PRO_GRAMM_NACH_KATEGORIE) der fixierten Slots - dient NUR dazu,
  // beim Pruefen eines FRUEHEREN Slots Budget fuer noch nicht gezogene,
  // ebenfalls fixierte Slots zu reservieren. Ohne diese Reservierung koennte
  // z. B. Protein (immer zuerst dran) das komplette Kalorienfenster fuer
  // sich beanspruchen und Carbs/Fett komplett aushungern.
  const theoretischeKalorien = {
    protein: proteinZiel !== null ? proteinZiel * KALORIEN_PRO_GRAMM_NACH_KATEGORIE.protein : 0,
    carbs: carbsZiel !== null ? carbsZiel * KALORIEN_PRO_GRAMM_NACH_KATEGORIE.carbs : 0,
    fett: fettZiel !== null ? fettZiel * KALORIEN_PRO_GRAMM_NACH_KATEGORIE.fett : 0,
  }
  const kalorienMaxAbzueglichReservierung = (reservierungFuerNochAusstehendeFixierteSlots) =>
    kalorienFenster === null ? null : kalorienFenster.max - reservierungFuerNochAusstehendeFixierteSlots

  const proteinBasis = gefiltertePoolFuer(proteinPool, mahlzeitWert, diaetenWert, suessDeftigWert)
  const neuProtein = zufaelligesElement(
    proteinZiel !== null
      ? nachErreichbaremMakroZielGefiltert(
          proteinBasis,
          'protein_g',
          proteinZiel,
          0,
          kalorienMaxAbzueglichReservierung(theoretischeKalorien.carbs + theoretischeKalorien.fett)
        )
      : nachErreichbaremKalorienBeitragGefiltert(proteinBasis, zielKalorienBeitragFuerSlot(kalorienFenster, 0, 4))
  )
  const proteinKalorien = erwarteteSlotKalorien(neuProtein, proteinZiel, 'protein_g')

  const carbsBasis = gefiltertePoolFuer(carbsPool, mahlzeitWert, diaetenWert, suessDeftigWert)
  const neuCarbs = zufaelligesElement(
    carbsZiel !== null
      ? nachErreichbaremMakroZielGefiltert(
          carbsBasis,
          'carbs_g',
          carbsZiel,
          proteinKalorien,
          kalorienMaxAbzueglichReservierung(theoretischeKalorien.fett)
        )
      : nachErreichbaremKalorienBeitragGefiltert(carbsBasis, zielKalorienBeitragFuerSlot(kalorienFenster, proteinKalorien, 3))
  )
  const carbsKalorien = erwarteteSlotKalorien(neuCarbs, carbsZiel, 'carbs_g')

  const fettBasis = gefiltertePoolFuer(fettPool, mahlzeitWert, diaetenWert, suessDeftigWert)
  const neuFett = zufaelligesElement(
    fettZiel !== null
      ? nachErreichbaremMakroZielGefiltert(
          fettBasis,
          'fett_g',
          fettZiel,
          proteinKalorien + carbsKalorien,
          kalorienMaxAbzueglichReservierung(0)
        )
      : nachErreichbaremKalorienBeitragGefiltert(
          fettBasis,
          zielKalorienBeitragFuerSlot(kalorienFenster, proteinKalorien + carbsKalorien, 2)
        )
  )
  const fettKalorien = erwarteteSlotKalorien(neuFett, fettZiel, 'fett_g')

  const gemueseBasis = vierterSlotOptionenFuer(gemuesePool, obstPool, mahlzeitWert, diaetenWert, suessDeftigWert)
  const neuGemuese = zufaelligesElement(
    alleDreiFixiert
      ? gemueseBasis
      : nachErreichbaremKalorienBeitragGefiltert(
          gemueseBasis,
          zielKalorienBeitragFuerSlot(kalorienFenster, proteinKalorien + carbsKalorien + fettKalorien, 1)
        )
  )

  return { protein: neuProtein, carbs: neuCarbs, fett: neuFett, gemuese: neuGemuese }
}

// Wuerfelt EINEN Slot neu, waehrend die anderen drei Slots (deren Kalorien
// bereits feststehen) unveraendert bleiben - das Analogon zu
// vierSlotsWuerfeln fuer den Reroll-Fall "nur 1 verbleibender Slot".
// kandidatenPool ist bereits durch gefiltertePoolFuer/vierterSlotOptionenFuer
// vorgefiltert; kalorienAndereSlots sind die aktuellen (bereits skalierten)
// Kalorien der drei feststehenden Slots. zielGramm/naehrwertSchluessel sind
// null, wenn DIESER Slot kein Makro-Ziel hat (dann greift die bisherige
// flexible Logik). gemueseNichtSteuerbar unterdrueckt den Kalorien-Vorfilter
// fuer den Sonderfall "Gemuese/Obst ist der einzige verbliebene Slot, weil
// Protein/Carbs/Fett bereits alle fixiert sind" (siehe vierSlotsWuerfeln).
function einzelnenSlotWuerfeln(
  kandidatenPool,
  kalorienAndereSlots,
  mahlzeitWert,
  zielWert,
  zielGramm,
  naehrwertSchluessel,
  gemueseNichtSteuerbar,
  anteilUeberschreibung
) {
  const kalorienFenster = zielKalorienFensterFuerMahlzeit(zielWert, mahlzeitWert, anteilUeberschreibung)

  if (zielGramm !== null) {
    // Anders als in vierSlotsWuerfeln muss hier NICHTS fuer noch nicht
    // gezogene Slots reserviert werden - die anderen drei Slots stehen beim
    // Reroll eines einzelnen Slots schon FEST (kalorienAndereSlots ist ihr
    // tatsaechlicher, bereits berechneter Wert), es kommt kein weiterer
    // fixierter Slot mehr danach.
    return zufaelligesElement(
      nachErreichbaremMakroZielGefiltert(
        kandidatenPool,
        naehrwertSchluessel,
        zielGramm,
        kalorienAndereSlots,
        kalorienFenster === null ? null : kalorienFenster.max
      )
    )
  }

  if (gemueseNichtSteuerbar) {
    return zufaelligesElement(kandidatenPool)
  }

  const zielBeitrag = zielKalorienBeitragFuerSlot(kalorienFenster, kalorienAndereSlots, 1)
  return zufaelligesElement(nachErreichbaremKalorienBeitragGefiltert(kandidatenPool, zielBeitrag))
}

// Teilt einen einzelnen Wert des Tages-Makroziels (Gramm) mit demselben
// TAGES_ANTEIL-Schluessel wie das Kalorienziel auf eine Mahlzeit auf. Leerer/
// ungueltiger Wert ergibt '' (kein Ziel fuer diese Mahlzeit).
function tagesMakroAnteilBerechnen(tagesWert, anteil) {
  const zahl = Number(tagesWert)
  if (!zahl || zahl <= 0) {
    return ''
  }
  return String(Math.round(zahl * anteil))
}

// Leitet aus dem Tages-Makroziel (zielWert.makro) das Makro-Ziel fuer EINE
// Mahlzeit ab. Rein lokale Berechnung fuer den Tagesplan - liest/schreibt
// NICHT den makroZiele-State, der ausschliesslich der Einzel-Ansicht
// vorbehalten ist (beide Ansichten haben also getrennte Makro-Ziel-Quellen).
// anteilUeberschreibung siehe zielKalorienFensterFuerMahlzeit.
function makroZielFuerMahlzeitAusTagesziel(zielWert, mahlzeitWert, anteilUeberschreibung) {
  const anteil = anteilUeberschreibung ?? TAGES_ANTEIL[mahlzeitWert] ?? 0
  return {
    protein: tagesMakroAnteilBerechnen(zielWert.makro.protein, anteil),
    carbs: tagesMakroAnteilBerechnen(zielWert.makro.carbs, anteil),
    fett: tagesMakroAnteilBerechnen(zielWert.makro.fett, anteil),
  }
}

// Berechnet die Portion (Gramm) fuer EINEN Slot mit gesetztem Makro-Ziel
// ISOLIERT, also OHNE Beruecksichtigung der Kreuz-Beitraege der anderen
// Slots zu diesem Makro (z. B. Protein aus dem Carbs-Slot). Wird NICHT mehr
// als Hauptweg genutzt (siehe portionenMitMakroZielenBerechnen fuer die
// echte gekoppelte Loesung ueber alle fixierten Slots gemeinsam), sondern
// nur noch als Fallback, wenn die gekoppelte Loesung keine gueltige
// (nicht-negative) Portion liefert - dann ist eine EXAKTE gleichzeitige
// Erfuellung aller gesetzten Ziele mit dieser Zutaten-Kombination gar nicht
// moeglich, und wir zeigen stattdessen die bestmoegliche EINZEL-Annaeherung
// mit erreichbar=false.
function makroZielPortionBerechnen(zutat, aktuellePortion, zielGramm, naehrwertSchluessel) {
  if (!zielGramm || zielGramm <= 0) {
    return { portion: aktuellePortion, erreichbar: true }
  }

  const exaktePortion = makroZielExaktePortion(zutat, zielGramm, naehrwertSchluessel)
  if (exaktePortion === null) {
    // Die Zutat traegt dieses Makro gar nicht - das Ziel ist prinzipiell unerreichbar.
    return { portion: aktuellePortion, erreichbar: false }
  }

  return { portion: Math.round(exaktePortion), erreichbar: true }
}

// Feste Reihenfolge der Makro-Kategorien, die ein eigenes Ziel haben koennen
// (Gemuese/Obst NICHT - das ist immer der flexible "Rest"-Slot). Bestimmt
// nur die Zeilen-/Spalten-Reihenfolge im Gleichungssystem unten, ist sonst
// beliebig, muss nur konsistent verwendet werden.
const MAKRO_KATEGORIEN = ['protein', 'carbs', 'fett']

// Loest ein n x n lineares Gleichungssystem A * x = b per Gauss-Elimination
// MIT Partialpivotisierung (vor jedem Eliminationsschritt wird die Zeile mit
// dem betragsgroessten Element in die aktuelle Pivot-Position getauscht, das
// haelt die Rechnung numerisch stabil und vermeidet Division durch (nahe)
// Null). Generisch fuer beliebige Groesse gehalten (bei uns n in {0,1,2,3} -
// je nachdem, wie viele Makro-Ziele gleichzeitig gesetzt sind), statt fuer
// jede Groesse eine eigene Formel herzuleiten - das ist leichter zu pruefen
// und zu warten. Gibt das Loesungs-Array zurueck, oder null, wenn die Matrix
// (nahezu) singulaer ist, also KEINE eindeutige Loesung existiert (z. B.
// wenn zwei der fixierten Zutaten ein nahezu identisches Naehrwert-
// Verhaeltnis fuer die betroffenen Makros haben).
function linearesGleichungssystemLoesen(matrixA, vektorB) {
  const n = vektorB.length
  // Arbeitskopien, damit die Original-Arrays der Aufrufer unveraendert bleiben.
  const a = matrixA.map((zeile) => [...zeile])
  const b = [...vektorB]

  for (let spalte = 0; spalte < n; spalte++) {
    let pivotZeile = spalte
    for (let zeile = spalte + 1; zeile < n; zeile++) {
      if (Math.abs(a[zeile][spalte]) > Math.abs(a[pivotZeile][spalte])) {
        pivotZeile = zeile
      }
    }
    if (Math.abs(a[pivotZeile][spalte]) < 1e-9) {
      return null
    }
    if (pivotZeile !== spalte) {
      ;[a[spalte], a[pivotZeile]] = [a[pivotZeile], a[spalte]]
      ;[b[spalte], b[pivotZeile]] = [b[pivotZeile], b[spalte]]
    }

    // Alle Zeilen UNTER der aktuellen Pivot-Zeile auf 0 in dieser Spalte bringen.
    for (let zeile = spalte + 1; zeile < n; zeile++) {
      const faktor = a[zeile][spalte] / a[spalte][spalte]
      for (let s = spalte; s < n; s++) {
        a[zeile][s] -= faktor * a[spalte][s]
      }
      b[zeile] -= faktor * b[spalte]
    }
  }

  // Rueckwaerts-Einsetzen: die Matrix ist jetzt obere Dreiecksform, die
  // letzte Zeile hat nur noch 1 Unbekannte, dann arbeiten wir uns nach oben.
  const x = new Array(n).fill(0)
  for (let zeile = n - 1; zeile >= 0; zeile--) {
    let summe = b[zeile]
    for (let s = zeile + 1; s < n; s++) {
      summe -= a[zeile][s] * x[s]
    }
    x[zeile] = summe / a[zeile][zeile]
  }
  return x
}

// Loest die Portionen ALLER fixierten Slots (Protein/Carbs/Fett mit
// gesetztem Makro-Ziel, 1 bis 3 Stueck) GEMEINSAM statt isoliert: jede
// Zutat traegt zu ALLEN DREI Makros bei (z. B. Feta im Fett-Slot liefert
// auch Protein), nicht nur zu ihrem "eigenen" - eine isolierte Berechnung
// pro Slot ignoriert diese Kreuz-Beitraege und summiert sich am Ende zu
// deutlich mehr als den gesetzten Zielen (siehe makroZielPortionBerechnen,
// die jetzt nur noch der Fallback ist).
//
// fixierteSlots: { [kategorie]: { zutat, zielGramm } } fuer jede Kategorie
// MIT gesetztem Ziel. flexibleKonstanten: Array von { zutat, portion } fuer
// alle NICHT fixierten Slots (Gemuese/Obst IMMER dabei, plus die P/C/F-
// Slots ohne eigenes Ziel) - ihr Naehrwert-Beitrag bei der jeweils
// angegebenen Portion wird von den Zielgrammen abgezogen, bevor das System
// aufgestellt wird (siehe portionenMitMakroZielenBerechnen fuer die
// Iteration, die diese Konstanten schrittweise verbessert).
//
// Fuer k = Anzahl fixierter Slots ergibt das ein k x k Gleichungssystem:
// Zeile = Makro, fuer das eine Zielgramm-Zahl existiert; Spalte = fixierter
// Slot. matrixA[Zeile][Spalte] = wie viel Gramm dieses Makros 1g der Zutat
// in diesem Slot liefert. vektorB[Zeile] = Zielgramm minus Konstante.
//
// Rueckgabe: { portionenNachKategorie: { [kategorie]: gerundete Gramm },
// erreichbar }. erreichbar = false, wenn die Matrix singulaer ist ODER
// irgendeine geloeste Portion negativ waere - das bedeutet, die nicht
// fixierten Slots liefern bei ihrer aktuellen Portion allein schon mehr von
// einem Makro als das Ziel erlaubt, ein positiver Wert fuer den fixierten
// Slot kann das Ziel dann gar nicht mehr treffen. portionenNachKategorie ist
// in diesem Fall leer, der Aufrufer faellt auf die isolierte Berechnung zurueck.
function gekoppelteMakroZielPortionenBerechnen(fixierteSlots, flexibleKonstanten) {
  const kategorien = MAKRO_KATEGORIEN.filter((kategorie) => fixierteSlots[kategorie])

  const matrixA = kategorien.map((zeileKategorie) => {
    const naehrwertSchluessel = NAEHRWERT_SCHLUESSEL_NACH_KATEGORIE[zeileKategorie]
    return kategorien.map((spalteKategorie) => fixierteSlots[spalteKategorie].zutat[naehrwertSchluessel] / 100)
  })
  const vektorB = kategorien.map((zeileKategorie) => {
    const naehrwertSchluessel = NAEHRWERT_SCHLUESSEL_NACH_KATEGORIE[zeileKategorie]
    const konstante = flexibleKonstanten.reduce(
      (summe, slot) => summe + aufPortionSkalieren(slot.zutat[naehrwertSchluessel], slot.portion),
      0
    )
    return fixierteSlots[zeileKategorie].zielGramm - konstante
  })

  const geloest = linearesGleichungssystemLoesen(matrixA, vektorB)
  if (geloest === null || geloest.some((portion) => portion < 0)) {
    return { portionenNachKategorie: {}, erreichbar: false }
  }

  const portionenNachKategorie = {}
  kategorien.forEach((kategorie, index) => {
    portionenNachKategorie[kategorie] = Math.round(geloest[index])
  })
  return { portionenNachKategorie, erreichbar: true }
}

// Berechnet die Portionen aller vier Slots nach der Prioritaets-Regel
// "Makro-Ziele gewinnen": Slots MIT gesetztem Makro-Ziel bekommen IMMER ihre
// exakte, GEKOPPELT geloeste Portion (gekoppelteMakroZielPortionenBerechnen -
// beruecksichtigt die Kreuz-Beitraege der fixierten Zutaten zueinander,
// keine Klemmung). Das Kalorienfenster wird ausschliesslich ueber die Slots
// OHNE Makro-Ziel eingehalten - die werden gemeinsam mit EINEM
// Skalierungsfaktor (weiterhin 0,5x-2x geklemmt) so skaliert, dass die
// Fenstermitte abzueglich der bereits feststehenden Makro-Ziel-Kalorien
// erreicht wird. Sonderfall: Haben Protein, Carbs UND Fett alle ein
// Makro-Ziel, bleibt kein steuerbarer Slot mehr uebrig ausser Gemuese/Obst -
// der wird dann NICHT mehr versucht kuenstlich einzupassen, sondern behaelt
// schlicht seine Datenbank-Standardportion.
//
// ITERATION: Die flexiblen Slots (Gemuese/Obst, ggf. plus ein nicht
// fixierter P/C/F-Slot) fliessen als KONSTANTE in die Makro-Gleichungen
// oben ein - ihre TATSAECHLICHE Portion haengt aber selbst vom Kalorien-
// Fixbedarf ab, der wiederum von der geloesten Portion der fixierten Slots
// abhaengt. Das ist eine echte Zirkularitaet (nicht nur eine grobe
// Naeherung): statt sie mit der Datenbank-Standardportion nur EINMALIG
// anzunaehern, wird iteriert - System loesen, daraus die tatsaechliche,
// kalorienfenster-basierte Portion der flexiblen Slots berechnen, System MIT
// dieser korrigierten Konstante neu loesen - bis zu MAX_ITERATIONEN mal.
// Im Regelfall aendern sich die flexiblen Portionen nach 1-2 Durchlaeufen
// nicht mehr (Konvergenz, siehe unveraendert-Check unten), dann wird sofort
// abgebrochen. Die Obergrenze ist nur eine Absicherung gegen einen
// theoretisch moeglichen Nicht-Konvergenzfall (z. B. Oszillation zwischen
// zwei Zustaenden) - KEINE Endlosschleife, danach wird das Ergebnis des
// letzten Durchlaufs uebernommen.
function portionenMitMakroZielenBerechnen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, zielWert, makroZieleWert, anteilUeberschreibung) {
  const zutatenNachKategorie = { protein: proteinZutat, carbs: carbsZutat, fett: fettZutat }
  const zielGrammNachKategorie = {
    protein: makroZielGrammFuer(makroZieleWert, 'protein'),
    carbs: makroZielGrammFuer(makroZieleWert, 'carbs'),
    fett: makroZielGrammFuer(makroZieleWert, 'fett'),
  }

  const fixierteSlots = {}
  MAKRO_KATEGORIEN.forEach((kategorie) => {
    if (zielGrammNachKategorie[kategorie] !== null) {
      fixierteSlots[kategorie] = { zutat: zutatenNachKategorie[kategorie], zielGramm: zielGrammNachKategorie[kategorie] }
    }
  })
  const flexibleProCarbsFettKategorien = MAKRO_KATEGORIEN.filter((kategorie) => !fixierteSlots[kategorie])
  const gemueseSteuerbar = flexibleProCarbsFettKategorien.length > 0
  const flexibleSchluessel = [...flexibleProCarbsFettKategorien, 'gemuese']
  const zutatFuerFlexiblenSchluessel = (schluessel) => (schluessel === 'gemuese' ? gemueseZutat : zutatenNachKategorie[schluessel])

  const kalorienFenster = zielKalorienFensterFuerMahlzeit(zielWert, mahlzeitWert, anteilUeberschreibung)

  // Berechnet aus dem Kalorien-Fixbedarf (Summe der fixierten Slots) die
  // Portionen ALLER flexiblen Slots neu - dieselbe Formel, die vorher (ohne
  // Kopplung) einmalig lief, jetzt als wiederverwendbarer Schritt fuer jede
  // Iteration UND fuer den Fallback unten.
  function flexiblePortionenNeuBerechnen(kalorienFixiert) {
    let flexibleFaktor = 1
    if (kalorienFenster !== null && gemueseSteuerbar) {
      const basisKalorienFlexibel = flexibleSchluessel.reduce((summe, schluessel) => {
        const zutat = zutatFuerFlexiblenSchluessel(schluessel)
        return summe + aufPortionSkalieren(zutat.kalorien, zutat.portion_g)
      }, 0)
      const mitte = (kalorienFenster.min + kalorienFenster.max) / 2
      flexibleFaktor = basisKalorienFlexibel > 0 ? Math.min(2, Math.max(0.5, (mitte - kalorienFixiert) / basisKalorienFlexibel)) : 1
    }
    const ergebnis = {}
    flexibleSchluessel.forEach((schluessel) => {
      if (schluessel === 'gemuese') {
        ergebnis.gemuese = gemueseSteuerbar ? Math.round(gemueseZutat.portion_g * flexibleFaktor) : gemueseZutat.portion_g
      } else {
        ergebnis[schluessel] = Math.round(zutatFuerFlexiblenSchluessel(schluessel).portion_g * flexibleFaktor)
      }
    })
    return ergebnis
  }

  function kalorienFixiertBerechnen(portionenNachKategorie) {
    return Object.entries(portionenNachKategorie).reduce(
      (summe, [kategorie, portion]) => summe + aufPortionSkalieren(zutatenNachKategorie[kategorie].kalorien, portion),
      0
    )
  }

  const MAX_ITERATIONEN = 3
  let flexiblePortionen = Object.fromEntries(
    flexibleSchluessel.map((schluessel) => [schluessel, zutatFuerFlexiblenSchluessel(schluessel).portion_g])
  )
  let geloesteFixiertePortionen = {}
  let fixierteErreichbar = true

  for (let iteration = 0; iteration < MAX_ITERATIONEN; iteration++) {
    const flexibleKonstanten = flexibleSchluessel.map((schluessel) => ({
      zutat: zutatFuerFlexiblenSchluessel(schluessel),
      portion: flexiblePortionen[schluessel],
    }))
    const { portionenNachKategorie, erreichbar } = gekoppelteMakroZielPortionenBerechnen(fixierteSlots, flexibleKonstanten)
    fixierteErreichbar = erreichbar
    if (!erreichbar) {
      break
    }
    geloesteFixiertePortionen = portionenNachKategorie

    const neueFlexiblePortionen = flexiblePortionenNeuBerechnen(kalorienFixiertBerechnen(portionenNachKategorie))
    const unveraendert = flexibleSchluessel.every((schluessel) => neueFlexiblePortionen[schluessel] === flexiblePortionen[schluessel])
    flexiblePortionen = neueFlexiblePortionen
    if (unveraendert) {
      break
    }
  }

  // Fallback: die gekoppelte Loesung war (fuer diese Zutaten-Kombination)
  // nicht moeglich - jede fixierte Portion wieder ISOLIERT berechnen, mit
  // erreichbar=false als ehrlichem Hinweis, dass die gesetzten Ziele mit
  // dieser Kombination nicht gleichzeitig exakt erreichbar sind.
  if (Object.keys(fixierteSlots).length > 0 && !fixierteErreichbar) {
    geloesteFixiertePortionen = {}
    Object.entries(fixierteSlots).forEach(([kategorie, { zutat, zielGramm }]) => {
      const ergebnis = makroZielPortionBerechnen(zutat, zutat.portion_g, zielGramm, NAEHRWERT_SCHLUESSEL_NACH_KATEGORIE[kategorie])
      geloesteFixiertePortionen[kategorie] = ergebnis.portion
    })
    flexiblePortionen = flexiblePortionenNeuBerechnen(kalorienFixiertBerechnen(geloesteFixiertePortionen))
  }

  return {
    proteinPortion: fixierteSlots.protein ? geloesteFixiertePortionen.protein : flexiblePortionen.protein,
    carbsPortion: fixierteSlots.carbs ? geloesteFixiertePortionen.carbs : flexiblePortionen.carbs,
    fettPortion: fixierteSlots.fett ? geloesteFixiertePortionen.fett : flexiblePortionen.fett,
    gemuesePortion: flexiblePortionen.gemuese,
    proteinZielErreichbar: fixierteSlots.protein ? fixierteErreichbar : true,
    carbsZielErreichbar: fixierteSlots.carbs ? fixierteErreichbar : true,
    fettZielErreichbar: fixierteSlots.fett ? fixierteErreichbar : true,
  }
}

// Startwert eines Reroll-Zaehler-Objekts: ein Zaehlerstand pro Kategorie,
// alle bei 0. Wird sowohl fuer die Einzel-Ansicht (ein Objekt) als auch pro
// Tagesplan-Eintrag (ein Objekt je Mahlzeit) verwendet.
function leererRerollZaehler() {
  return { protein: 0, carbs: 0, fett: 0, gemuese: 0 }
}

// Ab wie vielen aufeinanderfolgenden Rerolls DESSELBEN Slots das Suchfeld
// automatisch erscheint.
const REROLL_SCHWELLE_FUER_SUCHE = 3

function App() {
  // Diese Listen kamen frueher aus hartcodierten Arrays,
  // jetzt fuellen wir sie per useEffect aus der Datenbank.
  const [proteinOptionen, setProteinOptionen] = useState([])
  const [carbsOptionen, setCarbsOptionen] = useState([])
  const [fettOptionen, setFettOptionen] = useState([])
  const [gemueseOptionen, setGemueseOptionen] = useState([])
  // Zutaten mit kategorie='obst'. gemuese/gemueseOptionen/gemuesePortion
  // bleiben bewusst so benannt (interner Name fuer "der 4. Slot"), auch wenn
  // dort je nach Suess/Deftig-Filter eine Obst-Zutat landen kann - siehe
  // vierterSlotOptionenFuer.
  const [obstOptionen, setObstOptionen] = useState([])

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

  // Zaehlt pro Kategorie, wie oft HINTEREINANDER derselbe Slot ueber den
  // Reroll-Button neu gewuerfelt wurde (Einzel-Ansicht). Ab
  // REROLL_SCHWELLE_FUER_SUCHE erscheint fuer den betroffenen Slot das
  // Suchfeld (siehe sucheAnzeigen weiter unten). Wird bei jeder manuellen
  // Auswahl (fuer den gewaehlten Slot) sowie bei jedem "globalen" Neu-
  // Wuerfeln/Filterwechsel (fuer ALLE Slots) wieder auf 0 zurueckgesetzt,
  // weil der Slot dann ohnehin schon eine neue Zutat zeigt und ein sofort
  // sichtbares Suchfeld dort ueberraschend waere.
  const [rerollZaehler, setRerollZaehler] = useState(leererRerollZaehler)

  // Solange die Daten noch nicht aus der Datenbank geladen sind, zeigen wir "Laedt...".
  const [laedt, setLaedt] = useState(true)

  // Aktuell gewaehlter Mahlzeit-Filter (fruehstueck/mittag/abend/snack).
  // Lazy initializer: wird nur einmal beim ersten Rendern anhand der Uhrzeit berechnet.
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)

  // Aktuell ausgewaehlte Diaetform-Filter (vegan/vegetarisch/glutenfrei),
  // Mehrfachauswahl. Leeres Array = kein Diaet-Filter aktiv, alle Zutaten
  // kommen infrage.
  const [diaeten, setDiaeten] = useState([])

  // Aktuell gewaehlter Suess/Deftig-Filter ('suess' | 'deftig' | '' fuer
  // "Alles" = Default, kein echter DB-Tag). Nur relevant, wenn mahlzeit
  // 'fruehstueck' oder 'snack' ist - gefiltertePoolFuer ignoriert den Wert
  // fuer die anderen Mahlzeit-Typen automatisch, und SuessDeftigFilter wird
  // dort auch gar nicht erst gerendert (siehe Rendering unten).
  const [suessDeftig, setSuessDeftig] = useState('')

  // Kalorienziel-Einstellung: { typ: 'kein' | 'proMahlzeit' | 'proTag', kalorien }.
  // Lazy initializer laedt den zuletzt gespeicherten Wert aus dem localStorage.
  const [ziel, setZiel] = useState(zielLaden)

  // Speichert das Ziel bei jeder Aenderung im localStorage, damit es beim
  // naechsten Oeffnen der App erhalten bleibt.
  useEffect(() => {
    localStorage.setItem(ZIEL_LOCALSTORAGE_KEY, JSON.stringify(ziel))
  }, [ziel])

  // Ob der Onboarding-Wizard schon einmal abgeschlossen wurde. Lazy
  // initializer liest den Wert einmalig aus dem localStorage; solange er
  // false ist, zeigt die App statt der Haupt-Ansicht den Wizard.
  const [onboardingAbgeschlossen, setOnboardingAbgeschlossen] = useState(onboardingAbgeschlossenLaden)

  // Ob das Einstellungen-Panel (Kalorienziel + Ernaehrungsform, ausserhalb
  // des Onboardings ueber das Zahnrad-Icon erreichbar) gerade offen ist.
  const [einstellungenOffen, setEinstellungenOffen] = useState(false)

  // Wird vom Wizard aufgerufen, wenn der User Schritt 3 mit "Los geht's"
  // abschliesst. Persistiert den Abschluss, damit der Wizard bei
  // zukuenftigen Besuchen nicht mehr erscheint.
  function onboardingAbschliessen() {
    localStorage.setItem(ONBOARDING_LOCALSTORAGE_KEY, 'true')
    setOnboardingAbgeschlossen(true)
  }

  // Tagesplan: null = nicht aktiv (normale Einzel-Mahlzeit-Ansicht wird
  // gezeigt). Sonst ein Array mit einem Eintrag pro AUSGEWAEHLTER Mahlzeit
  // (siehe tagesplanMahlzeiten), die die Einzel-Ansicht ersetzen.
  const [tagesplan, setTagesplan] = useState(null)

  // Analog zu rerollZaehler, aber EIN Zaehler-Objekt PRO Tagesplan-Eintrag
  // (Array, Index passend zu tagesplan). Wird immer gemeinsam mit tagesplan
  // per setTagesplan(tagesplanErzeugen(...)) neu aufgebaut (siehe
  // tagesplanNeuSetzen), damit beide Arrays nie aus dem Tritt geraten.
  const [tagesplanRerollZaehler, setTagesplanRerollZaehler] = useState(null)

  // Welche Mahlzeiten bei "Ganzen Tag planen" beruecksichtigt werden sollen
  // (Mehrfachauswahl, mind. 1 - siehe tagesplanMahlzeitenAendern). Lazy
  // initializer laedt den zuletzt gespeicherten Wert aus dem localStorage.
  const [tagesplanMahlzeiten, setTagesplanMahlzeiten] = useState(tagesplanMahlzeitenLaden)

  useEffect(() => {
    localStorage.setItem(TAGESPLAN_MAHLZEITEN_LOCALSTORAGE_KEY, JSON.stringify(tagesplanMahlzeiten))
  }, [tagesplanMahlzeiten])

  // Makro-Ziele (Protein/Carbs/Fett in Gramm) PRO MAHLZEIT-TYP:
  // { [mahlzeitTyp]: { protein, carbs, fett } }. Wird von der Einzel-Ansicht
  // (fuer den aktuellen Mahlzeit-Filter) UND vom Tagesplan (fuer alle vier
  // Mahlzeiten) gemeinsam genutzt, damit z. B. "40g Protein beim Fruehstueck"
  // unabhaengig von Ansicht und Reload erhalten bleibt.
  const [makroZiele, setMakroZiele] = useState(makroZieleLaden)

  useEffect(() => {
    localStorage.setItem(MAKRO_ZIELE_LOCALSTORAGE_KEY, JSON.stringify(makroZiele))
  }, [makroZiele])

  // Ob das jeweilige Makro-Ziel der aktuell angezeigten Einzel-Mahlzeit mit
  // der zuletzt berechneten Portion erreichbar war (fuer den dezenten Hinweis
  // in der UI). Wird bei jedem Wuerfeln/Ziel-Aendern neu gesetzt. Wird NICHT
  // persistiert, da rein aus der aktuellen Zutat + Ziel abgeleitet.
  const [proteinZielErreichbar, setProteinZielErreichbar] = useState(true)
  const [carbsZielErreichbar, setCarbsZielErreichbar] = useState(true)
  const [fettZielErreichbar, setFettZielErreichbar] = useState(true)

  // Liefert die Makro-Ziele fuer einen Mahlzeit-Typ mit sinnvollem Default.
  function makroZieleFuer(mahlzeitTyp) {
    return makroZiele[mahlzeitTyp] ?? { protein: '', carbs: '', fett: '' }
  }

  // Setzt die vier Portionen fuer EINE Mahlzeit passend zum aktuellen
  // Kalorienziel UND den aktuellen Makro-Zielen. Wird nach jedem Wuerfeln
  // aufgerufen (statt die Portion einfach auf portion_g zurueckzusetzen),
  // damit die Skalierung nicht durch einen spaeteren Reset ueberschrieben wird.
  function portionenMitMakroZielenSetzen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, makroZieleWert) {
    const ergebnis = portionenMitMakroZielenBerechnen(
      proteinZutat,
      carbsZutat,
      fettZutat,
      gemueseZutat,
      mahlzeitWert,
      ziel,
      makroZieleWert
    )
    setProteinPortion(ergebnis.proteinPortion)
    setCarbsPortion(ergebnis.carbsPortion)
    setFettPortion(ergebnis.fettPortion)
    setGemuesePortion(ergebnis.gemuesePortion)
    setProteinZielErreichbar(ergebnis.proteinZielErreichbar)
    setCarbsZielErreichbar(ergebnis.carbsZielErreichbar)
    setFettZielErreichbar(ergebnis.fettZielErreichbar)
  }

  // Baut aus vier Zutaten einen kompletten Tagesplan-Eintrag: skalierte
  // Portionen (inkl. Makro-Ziel-Anpassung) plus die daraus resultierenden
  // Naehrwert-Summen dieser Mahlzeit. makroZieleWert wird explizit als Param
  // uebergeben (statt aus dem makroZiele-State gelesen), damit der Aufrufer
  // z. B. gerade erst getippte Werte OHNE Verzoegerung durch asynchrones
  // setState hier schon beruecksichtigen kann.
  function tagesplanEintragBauen(mahlzeitTyp, proteinZutat, carbsZutat, fettZutat, gemueseZutat, makroZieleWert, anteilUeberschreibung) {
    const portionen = portionenMitMakroZielenBerechnen(
      proteinZutat,
      carbsZutat,
      fettZutat,
      gemueseZutat,
      mahlzeitTyp,
      ziel,
      makroZieleWert,
      anteilUeberschreibung
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

    return {
      mahlzeitTyp,
      protein: proteinZutat,
      carbs: carbsZutat,
      fett: fettZutat,
      gemuese: gemueseZutat,
      ...portionen,
      proteinZielG: makroZieleWert.protein,
      carbsZielG: makroZieleWert.carbs,
      fettZielG: makroZieleWert.fett,
      summeKalorien,
      summeProtein,
      summeCarbs,
      summeFett,
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
        .select('name, kategorie, kalorien, protein_g, carbs_g, fett_g, portion_g, mahlzeiten, diaeten, eigenschaft')
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
      const obstListe = data.filter((z) => z.kategorie === 'obst')

      setProteinOptionen(proteine)
      setCarbsOptionen(carbsListe)
      setFettOptionen(fetteListe)
      setGemueseOptionen(gemueseListe)
      setObstOptionen(obstListe)

      // Direkt eine erste zufaellige Auswahl setzen, sobald die Daten da sind,
      // passend zum aktuell (per Uhrzeit) vorausgewaehlten Mahlzeit-Filter.
      const { protein: neuProtein, carbs: neuCarbs, fett: neuFett, gemuese: neuGemuese } = vierSlotsWuerfeln(
        proteine, carbsListe, fetteListe, gemueseListe, obstListe, mahlzeit, diaeten, suessDeftig, ziel, makroZieleFuer(mahlzeit)
      )

      setProtein(neuProtein)
      setCarbs(neuCarbs)
      setFett(neuFett)
      setGemuese(neuGemuese)
      portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))

      setLaedt(false)
    }

    zutatenLaden()
  }, [])

  // Waehlt fuer jede Kategorie eine neue zufaellige Zutat aus dem Pool des
  // aktuellen Mahlzeit-Filters aus und schreibt sie in den jeweiligen State.
  function neueAuswahlWuerfeln() {
    const { protein: neuProtein, carbs: neuCarbs, fett: neuFett, gemuese: neuGemuese } = vierSlotsWuerfeln(
      proteinOptionen, carbsOptionen, fettOptionen, gemueseOptionen, obstOptionen, mahlzeit, diaeten, suessDeftig, ziel, makroZieleFuer(mahlzeit)
    )

    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))
    setRerollZaehler(leererRerollZaehler())
  }

  // Erhoeht den Reroll-Zaehler (Einzel-Ansicht) fuer GENAU eine Kategorie um
  // 1 - siehe rerollZaehler weiter oben fuer den Zweck (Suchfeld nach
  // REROLL_SCHWELLE_FUER_SUCHE aufeinanderfolgenden Rerolls desselben Slots).
  function rerollZaehlerErhoehen(kategorie) {
    setRerollZaehler((aktuell) => ({ ...aktuell, [kategorie]: aktuell[kategorie] + 1 }))
  }

  // Diese vier Funktionen aendern jeweils nur EINEN Slot, skalieren danach
  // aber alle vier Portionen neu (weil sich die Kalorien-Basis der Mahlzeit
  // durch den Wechsel veraendert). Sie werden gleich als Prop an die
  // passende SlotKarte weitergegeben, damit deren kleiner Re-Roll-Button nur
  // diesen einen Slot neu wuerfelt.
  function proteinWuerfeln() {
    const kandidaten = gefiltertePoolFuer(proteinOptionen, mahlzeit, diaeten, suessDeftig)
    const kalorienAndereSlots =
      aufPortionSkalieren(carbs.kalorien, carbsPortion ?? carbs.portion_g) +
      aufPortionSkalieren(fett.kalorien, fettPortion ?? fett.portion_g) +
      aufPortionSkalieren(gemuese.kalorien, gemuesePortion ?? gemuese.portion_g)
    const proteinZiel = makroZielGrammFuer(makroZieleFuer(mahlzeit), 'protein')
    const neuProtein = einzelnenSlotWuerfeln(kandidaten, kalorienAndereSlots, mahlzeit, ziel, proteinZiel, 'protein_g', false)
    setProtein(neuProtein)
    portionenMitMakroZielenSetzen(neuProtein, carbs, fett, gemuese, mahlzeit, makroZieleFuer(mahlzeit))
    rerollZaehlerErhoehen('protein')
  }

  function carbsWuerfeln() {
    const kandidaten = gefiltertePoolFuer(carbsOptionen, mahlzeit, diaeten, suessDeftig)
    const kalorienAndereSlots =
      aufPortionSkalieren(protein.kalorien, proteinPortion ?? protein.portion_g) +
      aufPortionSkalieren(fett.kalorien, fettPortion ?? fett.portion_g) +
      aufPortionSkalieren(gemuese.kalorien, gemuesePortion ?? gemuese.portion_g)
    const carbsZiel = makroZielGrammFuer(makroZieleFuer(mahlzeit), 'carbs')
    const neuCarbs = einzelnenSlotWuerfeln(kandidaten, kalorienAndereSlots, mahlzeit, ziel, carbsZiel, 'carbs_g', false)
    setCarbs(neuCarbs)
    portionenMitMakroZielenSetzen(protein, neuCarbs, fett, gemuese, mahlzeit, makroZieleFuer(mahlzeit))
    rerollZaehlerErhoehen('carbs')
  }

  function fettWuerfeln() {
    const kandidaten = gefiltertePoolFuer(fettOptionen, mahlzeit, diaeten, suessDeftig)
    const kalorienAndereSlots =
      aufPortionSkalieren(protein.kalorien, proteinPortion ?? protein.portion_g) +
      aufPortionSkalieren(carbs.kalorien, carbsPortion ?? carbs.portion_g) +
      aufPortionSkalieren(gemuese.kalorien, gemuesePortion ?? gemuese.portion_g)
    const fettZiel = makroZielGrammFuer(makroZieleFuer(mahlzeit), 'fett')
    const neuFett = einzelnenSlotWuerfeln(kandidaten, kalorienAndereSlots, mahlzeit, ziel, fettZiel, 'fett_g', false)
    setFett(neuFett)
    portionenMitMakroZielenSetzen(protein, carbs, neuFett, gemuese, mahlzeit, makroZieleFuer(mahlzeit))
    rerollZaehlerErhoehen('fett')
  }

  function gemueseWuerfeln() {
    const kandidaten = vierterSlotOptionenFuer(gemueseOptionen, obstOptionen, mahlzeit, diaeten, suessDeftig)
    const kalorienAndereSlots =
      aufPortionSkalieren(protein.kalorien, proteinPortion ?? protein.portion_g) +
      aufPortionSkalieren(carbs.kalorien, carbsPortion ?? carbs.portion_g) +
      aufPortionSkalieren(fett.kalorien, fettPortion ?? fett.portion_g)
    const aktuelleMakroZiele = makroZieleFuer(mahlzeit)
    const alleDreiFixiert =
      makroZielGrammFuer(aktuelleMakroZiele, 'protein') !== null &&
      makroZielGrammFuer(aktuelleMakroZiele, 'carbs') !== null &&
      makroZielGrammFuer(aktuelleMakroZiele, 'fett') !== null
    const neuGemuese = einzelnenSlotWuerfeln(kandidaten, kalorienAndereSlots, mahlzeit, ziel, null, null, alleDreiFixiert)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(protein, carbs, fett, neuGemuese, mahlzeit, aktuelleMakroZiele)
    rerollZaehlerErhoehen('gemuese')
  }

  // Wird aufgerufen, wenn der User im Suchfeld eines Slots (erscheint ab
  // REROLL_SCHWELLE_FUER_SUCHE Rerolls desselben Slots) gezielt eine Zutat
  // auswaehlt. Behandelt die Auswahl wie einen Reroll: derselbe
  // Portionsberechnungs-Pfad (portionenMitMakroZielenSetzen), keine
  // Sonderbehandlung. Setzt zusaetzlich NUR den Zaehler dieser Kategorie
  // zurueck, die anderen drei Slots behalten ihren Zaehlerstand.
  function zutatManuellWaehlen(kategorie, zutat) {
    const naechsteZutaten = {
      protein: kategorie === 'protein' ? zutat : protein,
      carbs: kategorie === 'carbs' ? zutat : carbs,
      fett: kategorie === 'fett' ? zutat : fett,
      gemuese: kategorie === 'gemuese' ? zutat : gemuese,
    }

    if (kategorie === 'protein') setProtein(zutat)
    if (kategorie === 'carbs') setCarbs(zutat)
    if (kategorie === 'fett') setFett(zutat)
    if (kategorie === 'gemuese') setGemuese(zutat)

    portionenMitMakroZielenSetzen(
      naechsteZutaten.protein,
      naechsteZutaten.carbs,
      naechsteZutaten.fett,
      naechsteZutaten.gemuese,
      mahlzeit,
      makroZieleFuer(mahlzeit)
    )
    setRerollZaehler((aktuell) => ({ ...aktuell, [kategorie]: 0 }))
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

    const { protein: neuProtein, carbs: neuCarbs, fett: neuFett, gemuese: neuGemuese } = vierSlotsWuerfeln(
      proteinOptionen, carbsOptionen, fettOptionen, gemueseOptionen, obstOptionen, neueMahlzeit, diaeten, suessDeftig, ziel, makroZieleFuer(neueMahlzeit)
    )

    setMahlzeit(neueMahlzeit)
    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, neueMahlzeit, makroZieleFuer(neueMahlzeit))
    setRerollZaehler(leererRerollZaehler())
  }

  // Wird vom SuessDeftigFilter aufgerufen - sowohl der Instanz in der
  // Einzel-Ansicht (nur bei mahlzeit === 'fruehstueck'/'snack' sichtbar) als
  // auch der im EinstellungenPanel (dort immer sichtbar, unabhaengig vom
  // aktuellen Screen - genau wie DiaetFilter). Einzelauswahl statt
  // Mehrfachauswahl wie bei diaetenAendern, da sich Suess/Deftig/Alles
  // gegenseitig ausschliessen. Wuerfelt danach sofort alle vier Kategorien
  // neu, passend zur neuen Auswahl. neuerWert wird direkt verwendet statt
  // ueber den State zu lesen, weil setSuessDeftig asynchron ist und der
  // State-Wert im selben Funktionsdurchlauf noch der alte waere.
  function suessDeftigAendern(neuerWert) {
    if (neuerWert === suessDeftig) {
      return
    }

    const { protein: neuProtein, carbs: neuCarbs, fett: neuFett, gemuese: neuGemuese } = vierSlotsWuerfeln(
      proteinOptionen, carbsOptionen, fettOptionen, gemueseOptionen, obstOptionen, mahlzeit, diaeten, neuerWert, ziel, makroZieleFuer(mahlzeit)
    )

    setSuessDeftig(neuerWert)
    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))
    setRerollZaehler(leererRerollZaehler())

    // Ist gerade ein Tagesplan sichtbar, muss der ebenfalls neu gewuerfelt
    // werden, sonst wuerden dort weiterhin Fruehstueck-/Snack-Zutaten stehen,
    // die die neue Suess/Deftig-Auswahl nicht erfuellen.
    if (tagesplan) {
      tagesplanNeuSetzen(tagesplanErzeugen(diaeten, tagesplanMahlzeiten, neuerWert))
    }
  }

  // Wird vom DiaetFilter aufgerufen, wenn der User eine Diaetform an- oder
  // abwaehlt. "keine" (Keine Einschraenkung) schliesst sich mit den anderen
  // drei Diaetformen gegenseitig aus: Anwaehlen von "keine" ersetzt eine
  // evtl. bestehende Auswahl komplett, Anwaehlen einer der anderen drei
  // entfernt ein evtl. aktives "keine" wieder. Wuerfelt danach sofort alle
  // vier Kategorien neu, passend zur neuen Auswahl. neueDiaeten wird direkt
  // verwendet statt ueber den State zu lesen, weil setDiaeten asynchron ist
  // und der State-Wert im selben Funktionsdurchlauf noch der alte waere.
  function diaetenAendern(slug) {
    let neueDiaeten
    if (slug === 'keine') {
      neueDiaeten = diaeten.includes('keine') ? [] : ['keine']
    } else if (diaeten.includes(slug)) {
      neueDiaeten = diaeten.filter((d) => d !== slug)
    } else {
      neueDiaeten = [...diaeten.filter((d) => d !== 'keine'), slug]
    }

    const { protein: neuProtein, carbs: neuCarbs, fett: neuFett, gemuese: neuGemuese } = vierSlotsWuerfeln(
      proteinOptionen, carbsOptionen, fettOptionen, gemueseOptionen, obstOptionen, mahlzeit, neueDiaeten, suessDeftig, ziel, makroZieleFuer(mahlzeit)
    )

    setDiaeten(neueDiaeten)
    setProtein(neuProtein)
    setCarbs(neuCarbs)
    setFett(neuFett)
    setGemuese(neuGemuese)
    portionenMitMakroZielenSetzen(neuProtein, neuCarbs, neuFett, neuGemuese, mahlzeit, makroZieleFuer(mahlzeit))
    setRerollZaehler(leererRerollZaehler())

    // Ist gerade ein Tagesplan sichtbar, muss der ebenfalls neu gewuerfelt
    // werden, sonst wuerden dort weiterhin Zutaten stehen, die die neue
    // Diaet-Auswahl nicht erfuellen.
    if (tagesplan) {
      tagesplanNeuSetzen(tagesplanErzeugen(neueDiaeten, tagesplanMahlzeiten, suessDeftig))
    }
  }

  // Wird von TagesplanMahlzeitenFilter aufgerufen, wenn der User eine
  // Mahlzeit fuer den Tagesplan an- oder abwaehlt (Mehrfachauswahl, welche
  // der vier Mahlzeiten bei "Ganzen Tag planen" ueberhaupt vorkommen sollen).
  // Anders als bei diaetenAendern ist das Abwaehlen der LETZTEN verbleibenden
  // Mahlzeit ein No-Op: es gibt hier keinen "Weiter"-Gate-Punkt wie im
  // Wizard, der einen leeren Zwischenstand abfangen koennte - jeder Klick
  // wirkt sofort, auch waehrend eine TagesplanAnsicht bereits sichtbar ist.
  // Ohne den Schutz wuerde das einen leeren Tagesplan erzeugen.
  function tagesplanMahlzeitenAendern(slug) {
    const istAusgewaehlt = tagesplanMahlzeiten.includes(slug)
    if (istAusgewaehlt && tagesplanMahlzeiten.length === 1) {
      return
    }

    const neueMahlzeiten = istAusgewaehlt
      ? tagesplanMahlzeiten.filter((m) => m !== slug)
      : [...tagesplanMahlzeiten, slug]

    setTagesplanMahlzeiten(neueMahlzeiten)

    if (tagesplan) {
      tagesplanNeuSetzen(tagesplanErzeugen(diaeten, neueMahlzeiten, suessDeftig))
    }
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

  // Wird von ZielEinstellungen aufgerufen, wenn der User Min oder Max des
  // Kalorienfensters aendert. feld ist 'min' oder 'max' (Signatur analog zu
  // zielMakroAendern).
  function zielKalorienAendern(feld, wert) {
    setZiel((aktuell) => ({ ...aktuell, kalorien: { ...aktuell.kalorien, [feld]: wert } }))
  }

  // Wird von ZielEinstellungen aufgerufen, wenn der User das Tages-Makroziel
  // (Protein/Carbs/Fett in Gramm, nur bei "Pro Tag" sichtbar) aendert. Wirkt
  // - wie zielKalorienAendern - erst beim naechsten (Neu-)Planen des Tages,
  // nicht sofort.
  function zielMakroAendern(kategorie, wert) {
    setZiel((aktuell) => ({ ...aktuell, makro: { ...aktuell.makro, [kategorie]: wert } }))
  }

  // Aktualisiert das Makro-Ziel (Protein/Carbs/Fett) der aktuellen Einzel-
  // Mahlzeit in makroZiele und berechnet die Portionen SOFORT neu, ohne neu
  // zu wuerfeln. makroZiele ist ausschliesslich der Einzel-Ansicht vorbehalten
  // - der Tagesplan leitet seine Makro-Ziele stattdessen direkt aus dem
  // Tages-Makroziel in ziel.makro ab (makroZielFuerMahlzeitAusTagesziel).
  function makroZielAendern(kategorie, wert) {
    const neueZiele = { ...makroZieleFuer(mahlzeit), [kategorie]: wert }
    setMakroZiele((aktuell) => ({ ...aktuell, [mahlzeit]: neueZiele }))
    portionenMitMakroZielenSetzen(protein, carbs, fett, gemuese, mahlzeit, neueZiele)
  }

  // Wuerfelt fuer jeden AUSGEWAEHLTEN Mahlzeit-Typ (siehe tagesplanMahlzeiten,
  // in fester MAHLZEIT_REIHENFOLGE) einen eigenen Zutaten-Satz, skaliert ihn
  // mit dem auf die Auswahl normalisierten Tages-Anteil (normalisierteTagesAnteile)
  // und gibt den kompletten neuen Tagesplan zurueck (setzt selbst KEINEN State,
  // damit die Funktion sowohl fuer den "Ganzen Tag planen"-Button als auch fuer
  // eine Diaet-/Mahlzeiten-/Suess-Deftig-Auswahl-Aenderung waehrend eines
  // aktiven Tagesplans wiederverwendet werden kann). suessDeftigWert wird -
  // wie diaetenWert - explizit als Param uebergeben statt aus dem State
  // gelesen, damit suessDeftigAendern den gerade erst gewaehlten Wert OHNE
  // Verzoegerung durch asynchrones setState hier schon beruecksichtigen kann.
  function tagesplanErzeugen(diaetenWert, tagesplanMahlzeitenWert, suessDeftigWert) {
    const anteile = normalisierteTagesAnteile(tagesplanMahlzeitenWert)
    return MAHLZEIT_REIHENFOLGE.filter((typ) => tagesplanMahlzeitenWert.includes(typ)).map((mahlzeitTyp) => {
      const anteil = anteile[mahlzeitTyp]
      const makroZieleWert = makroZielFuerMahlzeitAusTagesziel(ziel, mahlzeitTyp, anteil)
      const { protein: neuProtein, carbs: neuCarbs, fett: neuFett, gemuese: neuGemuese } = vierSlotsWuerfeln(
        proteinOptionen, carbsOptionen, fettOptionen, gemueseOptionen, obstOptionen, mahlzeitTyp, diaetenWert, suessDeftigWert, ziel, makroZieleWert, anteil
      )
      return tagesplanEintragBauen(mahlzeitTyp, neuProtein, neuCarbs, neuFett, neuGemuese, makroZieleWert, anteil)
    })
  }

  // Setzt einen frisch erzeugten Tagesplan UND initialisiert dazu passend
  // tagesplanRerollZaehler neu (ein leerer Zaehler pro Eintrag) - beide
  // Arrays muessen immer gemeinsam und mit gleicher Laenge/Reihenfolge
  // entstehen, sonst zeigt tagesplanSlotWuerfeln fuer den falschen Eintrag
  // das Suchfeld an.
  function tagesplanNeuSetzen(neuerPlan) {
    setTagesplan(neuerPlan)
    setTagesplanRerollZaehler(neuerPlan.map(() => leererRerollZaehler()))
  }

  // Wird vom "Ganzen Tag planen"- bzw. "Ganzen Tag neu planen"-Button aufgerufen.
  function tagPlanen() {
    tagesplanNeuSetzen(tagesplanErzeugen(diaeten, tagesplanMahlzeiten, suessDeftig))
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
      }
      // Der 4. Slot (kategorie === 'gemuese') zieht - anders als
      // protein/carbs/fett - je nach Suess/Deftig-Filter aus einem anderen
      // Pool (siehe vierterSlotOptionenFuer), deshalb hier ein Sonderfall
      // statt der generischen optionenNachKategorie-Lookup.
      const kandidaten =
        kategorie === 'gemuese'
          ? vierterSlotOptionenFuer(gemueseOptionen, obstOptionen, eintrag.mahlzeitTyp, diaeten, suessDeftig)
          : gefiltertePoolFuer(optionenNachKategorie[kategorie], eintrag.mahlzeitTyp, diaeten, suessDeftig)
      // Kalorien der jeweils DREI ANDEREN (bereits feststehenden) Slots
      // dieser Mahlzeit, als Grundlage fuer die kalorienbewusste Eingrenzung
      // des Pools (siehe einzelnenSlotWuerfeln).
      const kalorienNachKategorie = {
        protein: aufPortionSkalieren(eintrag.protein.kalorien, eintrag.proteinPortion),
        carbs: aufPortionSkalieren(eintrag.carbs.kalorien, eintrag.carbsPortion),
        fett: aufPortionSkalieren(eintrag.fett.kalorien, eintrag.fettPortion),
        gemuese: aufPortionSkalieren(eintrag.gemuese.kalorien, eintrag.gemuesePortion),
      }
      const kalorienAndereSlots = Object.entries(kalorienNachKategorie)
        .filter(([slotKategorie]) => slotKategorie !== kategorie)
        .reduce((summe, [, kalorien]) => summe + kalorien, 0)
      const anteil = normalisierteTagesAnteile(tagesplanMahlzeiten)[eintrag.mahlzeitTyp]
      const makroZieleWert = makroZielFuerMahlzeitAusTagesziel(ziel, eintrag.mahlzeitTyp, anteil)
      const zielGramm = kategorie === 'gemuese' ? null : makroZielGrammFuer(makroZieleWert, kategorie)
      const naehrwertSchluessel = kategorie === 'gemuese' ? null : NAEHRWERT_SCHLUESSEL_NACH_KATEGORIE[kategorie]
      const alleDreiFixiert =
        makroZielGrammFuer(makroZieleWert, 'protein') !== null &&
        makroZielGrammFuer(makroZieleWert, 'carbs') !== null &&
        makroZielGrammFuer(makroZieleWert, 'fett') !== null
      const gemueseNichtSteuerbar = kategorie === 'gemuese' && alleDreiFixiert
      const neueZutat = einzelnenSlotWuerfeln(
        kandidaten,
        kalorienAndereSlots,
        eintrag.mahlzeitTyp,
        ziel,
        zielGramm,
        naehrwertSchluessel,
        gemueseNichtSteuerbar,
        anteil
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
        zutaten.gemuese,
        makroZieleWert,
        anteil
      )

      return aktuellerPlan.map((e, i) => (i === index ? neuerEintrag : e))
    })

    setTagesplanRerollZaehler((aktuelleZaehler) =>
      aktuelleZaehler.map((z, i) => (i === index ? { ...z, [kategorie]: z[kategorie] + 1 } : z))
    )
  }

  // Analog zu zutatManuellWaehlen, aber fuer EINEN Eintrag des Tagesplans:
  // Wird aufgerufen, wenn der User im Suchfeld eines Tagesplan-Slots gezielt
  // eine Zutat auswaehlt. Baut den Eintrag ueber denselben
  // tagesplanEintragBauen-Pfad wie tagesplanSlotWuerfeln neu auf (keine
  // Sonderbehandlung der Portionsberechnung fuer manuell gewaehlte Zutaten).
  function tagesplanZutatWaehlen(index, kategorie, zutat) {
    setTagesplan((aktuellerPlan) => {
      const eintrag = aktuellerPlan[index]
      const anteil = normalisierteTagesAnteile(tagesplanMahlzeiten)[eintrag.mahlzeitTyp]
      const makroZieleWert = makroZielFuerMahlzeitAusTagesziel(ziel, eintrag.mahlzeitTyp, anteil)
      const zutaten = {
        protein: eintrag.protein,
        carbs: eintrag.carbs,
        fett: eintrag.fett,
        gemuese: eintrag.gemuese,
        [kategorie]: zutat,
      }
      const neuerEintrag = tagesplanEintragBauen(
        eintrag.mahlzeitTyp,
        zutaten.protein,
        zutaten.carbs,
        zutaten.fett,
        zutaten.gemuese,
        makroZieleWert,
        anteil
      )

      return aktuellerPlan.map((e, i) => (i === index ? neuerEintrag : e))
    })

    setTagesplanRerollZaehler((aktuelleZaehler) =>
      aktuelleZaehler.map((z, i) => (i === index ? { ...z, [kategorie]: 0 } : z))
    )
  }

  if (!onboardingAbgeschlossen) {
    return (
      <OnboardingWizard
        ziel={ziel}
        onTypAendern={zielTypAendern}
        onKalorienAendern={zielKalorienAendern}
        onMakroAendern={zielMakroAendern}
        mahlzeit={mahlzeit}
        onMahlzeitAendern={mahlzeitAendern}
        diaeten={diaeten}
        onDiaetenAendern={diaetenAendern}
        tagesplanMahlzeiten={tagesplanMahlzeiten}
        onTagesplanMahlzeitenAendern={tagesplanMahlzeitenAendern}
        onAbschluss={onboardingAbschliessen}
      />
    )
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

  const aktuelleMakroZiele = makroZieleFuer(mahlzeit)

  // Fuer jeden Slot exakt derselbe gefilterte Pool wie beim Wuerfeln (siehe
  // proteinWuerfeln etc.) - das Suchfeld darf KEINE eigene, ungefilterte
  // Zutatenliste verwenden, sondern nur innerhalb dieses Pools suchen.
  const proteinSuchPool = gefiltertePoolFuer(proteinOptionen, mahlzeit, diaeten, suessDeftig)
  const carbsSuchPool = gefiltertePoolFuer(carbsOptionen, mahlzeit, diaeten, suessDeftig)
  const fettSuchPool = gefiltertePoolFuer(fettOptionen, mahlzeit, diaeten, suessDeftig)
  const gemueseSuchPool = vierterSlotOptionenFuer(gemueseOptionen, obstOptionen, mahlzeit, diaeten, suessDeftig)

  return (
    <>
      <header className="flex items-start justify-between p-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">gusto</h1>
          <p className="text-sm text-text-muted">deine nächste mahlzeit, gewürfelt</p>
        </div>
        <button
          type="button"
          onClick={() => setEinstellungenOffen(true)}
          aria-label="Einstellungen öffnen"
          className="mt-1 text-2xl text-text-muted hover:text-primary"
        >
          ⚙
        </button>
      </header>

      <EinstellungenPanel
        offen={einstellungenOffen}
        onSchliessen={() => setEinstellungenOffen(false)}
        ziel={ziel}
        onTypAendern={zielTypAendern}
        onKalorienAendern={zielKalorienAendern}
        onMakroAendern={zielMakroAendern}
        diaeten={diaeten}
        onDiaetenAendern={diaetenAendern}
        suessDeftig={suessDeftig}
        onSuessDeftigAendern={suessDeftigAendern}
        tagesplanMahlzeiten={tagesplanMahlzeiten}
        onTagesplanMahlzeitenAendern={tagesplanMahlzeitenAendern}
      />

      {ziel.typ === 'proTag' ? (
        tagesplan ? (
          <TagesplanAnsicht
            tagesplan={tagesplan}
            tagesplanRerollZaehler={tagesplanRerollZaehler}
            onSlotWuerfeln={tagesplanSlotWuerfeln}
            onZutatWaehlen={tagesplanZutatWaehlen}
            proteinOptionen={proteinOptionen}
            carbsOptionen={carbsOptionen}
            fettOptionen={fettOptionen}
            gemueseOptionen={gemueseOptionen}
            obstOptionen={obstOptionen}
            diaeten={diaeten}
            suessDeftig={suessDeftig}
            onZurueck={() => setTagesplan(null)}
            onMahlzeitenAnpassen={() => setEinstellungenOffen(true)}
            onNeuPlanen={tagPlanen}
          />
        ) : (
          <div className="mx-4 mt-6 text-center">
            <button
              type="button"
              onClick={tagPlanen}
              className="w-full rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-card shadow-sm"
            >
              Ganzen Tag planen
            </button>
            <button
              type="button"
              onClick={() => setEinstellungenOffen(true)}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Mahlzeiten anpassen
            </button>
          </div>
        )
      ) : (
        <>
          <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />

          {(mahlzeit === 'fruehstueck' || mahlzeit === 'snack') && (
            <SuessDeftigFilter aktuell={suessDeftig} onAendern={suessDeftigAendern} />
          )}

          <button
            type="button"
            onClick={() => setEinstellungenOffen(true)}
            className="mt-2 px-4 text-sm text-primary hover:underline"
          >
            Einstellungen anpassen
          </button>

          <section id="slots" className="grid grid-cols-2 gap-4 p-4">
            <SlotKarte
              titel="Protein"
              text={protein.name}
              portion={proteinPortion}
              onWuerfeln={proteinWuerfeln}
              zielWert={aktuelleMakroZiele.protein}
              onZielAendern={(wert) => makroZielAendern('protein', wert)}
              zielErreichbar={proteinZielErreichbar}
              sucheAnzeigen={rerollZaehler.protein >= REROLL_SCHWELLE_FUER_SUCHE}
              suchPool={proteinSuchPool}
              onZutatWaehlen={(zutat) => zutatManuellWaehlen('protein', zutat)}
            />
            <SlotKarte
              titel="Carbs"
              text={carbs.name}
              portion={carbsPortion}
              onWuerfeln={carbsWuerfeln}
              zielWert={aktuelleMakroZiele.carbs}
              onZielAendern={(wert) => makroZielAendern('carbs', wert)}
              zielErreichbar={carbsZielErreichbar}
              sucheAnzeigen={rerollZaehler.carbs >= REROLL_SCHWELLE_FUER_SUCHE}
              suchPool={carbsSuchPool}
              onZutatWaehlen={(zutat) => zutatManuellWaehlen('carbs', zutat)}
            />
            <SlotKarte
              titel="Fett"
              text={fett.name}
              portion={fettPortion}
              onWuerfeln={fettWuerfeln}
              zielWert={aktuelleMakroZiele.fett}
              onZielAendern={(wert) => makroZielAendern('fett', wert)}
              zielErreichbar={fettZielErreichbar}
              sucheAnzeigen={rerollZaehler.fett >= REROLL_SCHWELLE_FUER_SUCHE}
              suchPool={fettSuchPool}
              onZutatWaehlen={(zutat) => zutatManuellWaehlen('fett', zutat)}
            />
            <SlotKarte
              titel={gemuese.kategorie === 'obst' ? 'Obst' : 'Gemüse'}
              text={gemuese.name}
              portion={gemuesePortion}
              onWuerfeln={gemueseWuerfeln}
              sucheAnzeigen={rerollZaehler.gemuese >= REROLL_SCHWELLE_FUER_SUCHE}
              suchPool={gemueseSuchPool}
              onZutatWaehlen={(zutat) => zutatManuellWaehlen('gemuese', zutat)}
            />
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
