import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './App.css'
import SlotKarte from './components/SlotKarte'
import MahlzeitFilter from './components/MahlzeitFilter'
import SuessDeftigFilter from './components/SuessDeftigFilter'
import TagesplanAnsicht from './components/TagesplanAnsicht'
import RezepteAnsicht from './components/RezepteAnsicht'
import OnboardingWizard from './components/OnboardingWizard'
import Startbildschirm from './components/Startbildschirm'
import EinstellungenAnsicht from './components/EinstellungenAnsicht'
import KochModus from './components/KochModus'
import AnimatedButton from './components/AnimatedButton'
import TabLeiste from './components/TabLeiste'
import EinkaufslisteAnsicht from './components/EinkaufslisteAnsicht'
import Toast from './components/Toast'
import {
  einkaufslisteLaden,
  EINKAUFSLISTE_LOCALSTORAGE_KEY,
  zutatenHinzufuegen,
  postenAbhaken,
  abgehakteEntfernen,
  zutatenAusRezeptKarte,
  zutatenAusTagesplan,
} from './einkaufsliste'
import { MAHLZEITEN, standardMahlzeit, aktiveMahlzeitenFuer } from './mahlzeiten'
import { supabase } from './supabase'
import { useTastaturAusgleich } from './useTastaturAusgleich'
import { gefiltertePoolFuer, vierterSlotOptionenFuer } from './zutatenFilter'
import { gefiltertePoolFuerRezepte, alleAktivenMahlzeitenWuerfeln } from './rezepteFilter'
import { bilderImHintergrundVorladen } from './bildVorladen'
import {
  aufPortionSkalieren,
  TAGES_ANTEIL,
  zielKalorienFensterFuerMahlzeit,
  NAEHRWERT_SCHLUESSEL_NACH_KATEGORIE,
  makroZielGrammFuer,
  makroZielExaktePortion,
  portionenMitMakroZielenBerechnen,
} from './portionenRechner'
import { EXPO_OUT, FADE_UEBERGANG } from './motionConfig'

// Gestaffelte Fade-Choreografie Startbildschirm -> naechste Ansicht (Wizard
// oder Hauptansicht, siehe Rendering-Weiche am Komponentenende) - ersetzt
// den frueheren Seiten-Swipe (Commit 4956561). Das eigentliche Ausblenden
// von Logo/Halo/Button lebt bereits INNERHALB Startbildschirm.jsx (siehe
// dortige AUSBLEND_DAUER_S) - Startbildschirm ruft onWeiter (== hier
// setZeigtStartbildschirm(false)) erst NACH Abschluss jenes Ausblendens auf.
// Diese Konstante betrifft nur noch die EINBLEND-Seite: die naechste
// Ansicht blendet DANACH bewusst LANGSAMER ein (opacity 0->1 + Aufwaerts-
// Drift), mit derselben EXPO_OUT-Kurve wie die urspruengliche Logo-
// Einblendung im Startbildschirm - dieselbe "zeremonielle" Bewegungssprache
// setzt sich im Handoff fort. Das rausschiebende Startbildschirm-Overlay
// selbst (siehe AnimatePresence weiter unten) braucht zu diesem Zeitpunkt
// nur noch ein KURZES, reines Fade (FADE_UEBERGANG) fuer den cremefarbenen
// Hintergrund - sein Inhalt ist zu diesem Zeitpunkt schon unsichtbar.
const NAECHSTE_ANSICHT_EINBLEND_DAUER_S = 1.05
const NAECHSTE_ANSICHT_EINBLEND_Y_PX = 18

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

const DIAETEN_LOCALSTORAGE_KEY = 'gusto-diaeten'

// Laedt die im Onboarding gewaehlte Ernaehrungsform (Array von Slugs, z. B.
// ['vegan'] oder ['keine']) aus dem localStorage. Ist noch nichts
// gespeichert oder der Inhalt beschaedigt, wird ein leeres Array
// zurueckgegeben (= kein Diaet-Filter aktiv, entspricht dem Verhalten vor
// Einfuehrung dieser Persistierung).
function diaetenLaden() {
  try {
    const gespeichert = localStorage.getItem(DIAETEN_LOCALSTORAGE_KEY)
    const geparst = gespeichert ? JSON.parse(gespeichert) : []
    return Array.isArray(geparst) ? geparst : []
  } catch {
    return []
  }
}

const KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY = 'gusto-kochschritte-persistent'

// Ob abgehakte Kochschritte (siehe KochModus.jsx) dauerhaft im localStorage
// gespeichert werden sollen, statt nur fuer die aktuelle Sitzung zu gelten -
// Toggle in EinstellungenAnsicht.jsx (Sektion "Kochassistent"). Default false
// (= bisheriges Verhalten: reiner In-Memory-State, siehe erledigteSchritte
// weiter unten).
function kochschrittePersistentLaden() {
  return localStorage.getItem(KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY) === 'true'
}

const KOCHSCHRITTE_FORTSCHRITT_LOCALSTORAGE_KEY = 'gusto-kochschritte-fortschritt'

// Laedt den zuletzt gespeicherten Kochschritte-Fortschritt (welches Rezept,
// welche Schritt-Indizes) - ABER NUR, wenn kochschrittePersistentLaden()
// gerade true liefert. Ist der Toggle aus, wird IMMER ein leerer Fortschritt
// zurueckgegeben, selbst wenn noch ein alter Stand im localStorage liegt -
// so bleibt "aus" garantiert gleichbedeutend mit dem bisherigen reinen
// Sitzungs-Verhalten, unabhaengig davon, ob der Toggle zwischendurch schon
// einmal an war.
function kochschritteFortschrittLaden() {
  if (!kochschrittePersistentLaden()) {
    return { rezeptId: null, indices: new Set() }
  }
  try {
    const gespeichert = localStorage.getItem(KOCHSCHRITTE_FORTSCHRITT_LOCALSTORAGE_KEY)
    if (!gespeichert) {
      return { rezeptId: null, indices: new Set() }
    }
    const geparst = JSON.parse(gespeichert)
    return {
      rezeptId: geparst.rezeptId ?? null,
      indices: new Set(Array.isArray(geparst.indices) ? geparst.indices : []),
    }
  } catch {
    return { rezeptId: null, indices: new Set() }
  }
}

// Hilfsfunktion: gibt aus einer beliebigen Liste ein zufaelliges Element zurueck.
function zufaelligesElement(liste) {
  const zufallsIndex = Math.floor(Math.random() * liste.length)
  return liste[zufallsIndex]
}

// Normalisiert TAGES_ANTEIL (siehe portionenRechner.js) auf eine Teilmenge ausgewaehlter Mahlzeiten, sodass
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

// Startwert eines Reroll-Zaehler-Objekts: pro Kategorie ein { zaehler,
// schwelle } - schwelle beginnt bei REROLL_SCHWELLE_ERSTES_MAL. Wird sowohl
// fuer die Einzel-Ansicht (ein Objekt) als auch pro Tagesplan-Eintrag (ein
// Objekt je Mahlzeit) verwendet.
function leererRerollZaehler() {
  const leererSlotZaehler = { zaehler: 0, schwelle: REROLL_SCHWELLE_ERSTES_MAL }
  return { protein: leererSlotZaehler, carbs: leererSlotZaehler, fett: leererSlotZaehler, gemuese: leererSlotZaehler }
}

// Ab wie vielen aufeinanderfolgenden Rerolls DESSELBEN Slots das Suchfeld
// erstmals automatisch erscheint.
const REROLL_SCHWELLE_ERSTES_MAL = 3

// Ab wie vielen weiteren Rerolls DESSELBEN Slots das Suchfeld erneut
// erscheint, NACHDEM es schon einmal erschienen ist (siehe
// naechsterRerollZaehlerStand/manuellGewaehlterRerollZaehlerStand weiter
// unten) - bewusst hoeher als REROLL_SCHWELLE_ERSTES_MAL, damit das
// Suchfeld eine gelegentliche Hilfe bleibt und nicht bei jedem weiteren
// Reroll erneut stoert.
const REROLL_SCHWELLE_ERNEUT = 5

// Naechster Zaehler-Stand fuer EINE Kategorie eines Slots, nachdem dieser
// (wieder) neu gewuerfelt wurde. War das Suchfeld beim letzten Rendern schon
// sichtbar (zaehler >= schwelle), zaehlt DIESER Reroll bereits als erster
// einer neuen Runde (zaehler auf 1) und die Schwelle springt dauerhaft auf
// REROLL_SCHWELLE_ERNEUT - so verschwindet das Suchfeld sofort wieder und
// taucht erst nach REROLL_SCHWELLE_ERNEUT weiteren Rerolls erneut auf, egal
// ob der User es beim vorigen Mal genutzt oder ignoriert hat. Ansonsten
// normaler Inkrement bei unveraenderter Schwelle.
function naechsterRerollZaehlerStand(bisher) {
  const warSichtbar = bisher.zaehler >= bisher.schwelle
  return warSichtbar
    ? { zaehler: 1, schwelle: REROLL_SCHWELLE_ERNEUT }
    : { zaehler: bisher.zaehler + 1, schwelle: bisher.schwelle }
}

// Zaehler-Stand fuer EINE Kategorie, nachdem der User im Suchfeld gezielt
// eine Zutat ausgewaehlt hat - direkter Reset (kein weiterer Reroll noetig,
// um das als "Suchfeld wurde genutzt" zu werten), aber mit derselben
// erhoehten Schwelle wie beim Ignorieren (siehe naechsterRerollZaehlerStand).
function manuellGewaehlterRerollZaehlerStand() {
  return { zaehler: 0, schwelle: REROLL_SCHWELLE_ERNEUT }
}

// Kurzer Platzhalter fuer das schmale Zeitfenster zwischen "Pro Tag aktiv"
// und "erster Tagesplan fertig generiert" (siehe Auto-Generieren-Effekt in
// App() weiter unten) - der Effekt feuert erst NACH dem ersten Render, ohne
// dieses Skeleton wuerde dazwischen kurz ein leerer Screen aufblitzen. Bildet
// grob die Form von TagesplanAnsicht nach (Tages-Summen-Zeile, darunter pro
// Mahlzeit ein Label + Makro-Pills + 4 Zutaten-Zeilen), rein dekorativ und
// ohne echte Daten. animate-pulse + motion-reduce:animate-none: dieselbe
// Konvention wie die uebrigen motion-reduce-Stellen der App (z. B.
// RezeptKarte.jsx) - unter reduzierter Bewegung bleibt es ein ruhiges,
// unbewegtes Platzhalter-Grau statt zu pulsieren.
function TagesplanSkeleton() {
  return (
    <div className="mx-4 mt-2 animate-pulse motion-reduce:animate-none" aria-hidden="true">
      <div className="h-4 w-40 rounded bg-text-muted/15" />
      {[0, 1, 2, 3].map((mahlzeitIndex) => (
        <div key={mahlzeitIndex} className="mt-4">
          <div className="h-3 w-16 rounded bg-secondary/25" />
          <div className="mt-1 flex gap-1">
            <div className="h-4 w-14 rounded-full bg-primary/15" />
            <div className="h-4 w-14 rounded-full bg-secondary/15" />
            <div className="h-4 w-14 rounded-full bg-secondary/15" />
          </div>
          <div className="mt-1">
            {[0, 1, 2, 3].map((zeileIndex) => (
              <div key={zeileIndex} className="flex items-center gap-2 border-b border-text-muted/10 py-1">
                <div className="h-6 w-6 shrink-0 rounded-full bg-text-muted/15" />
                <div className="h-4 flex-1 rounded bg-text-muted/10" />
                <div className="h-3 w-8 shrink-0 rounded bg-text-muted/10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function App() {
  // App-weiter Backstop gegen ruckartiges Verschieben beim Fokussieren von
  // Eingabefeldern (Tastatur ueberdeckt das Feld) - siehe
  // useTastaturAusgleich.js. Bewusst hier auf Top-Level statt in einzelnen
  // Formular-Komponenten, damit er ueberall greift (Onboarding-Wizard,
  // Einstellungen-Panel, Zutatensuche, ...), ohne an jeder Stelle einzeln
  // eingebunden werden zu muessen.
  useTastaturAusgleich()

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
  // Reroll-Button neu gewuerfelt wurde (Einzel-Ansicht), zusammen mit der
  // aktuell geltenden Schwelle (siehe naechsterRerollZaehlerStand weiter
  // oben: erst REROLL_SCHWELLE_ERSTES_MAL, danach dauerhaft
  // REROLL_SCHWELLE_ERNEUT). Ab Erreichen der Schwelle erscheint fuer den
  // betroffenen Slot das Suchfeld (siehe sucheAnzeigen weiter unten). Wird
  // bei jedem "globalen" Neu-Wuerfeln/Filterwechsel (fuer ALLE Slots) wieder
  // auf leererRerollZaehler() zurueckgesetzt, weil der Slot dann ohnehin
  // schon eine neue Zutat zeigt und ein sofort sichtbares Suchfeld dort
  // ueberraschend waere.
  const [rerollZaehler, setRerollZaehler] = useState(leererRerollZaehler)

  // Solange die Daten noch nicht aus der Datenbank geladen sind, zeigen wir "Laedt...".
  const [laedt, setLaedt] = useState(true)

  // Welche Hauptansicht gerade sichtbar ist. 'haupt' zeigt exakt das
  // bisherige Verhalten (Einzel- oder Tagesplan-Ansicht, weiterhin ueber
  // ziel.typ gesteuert), 'rezepte' zeigt die neue RezepteAnsicht. Bewusst ein
  // eigener, unabhaengiger State statt einer Erweiterung von ziel.typ - die
  // bestehende Einzel/Tagesplan-Weiche ist an das Kalorienziel-Konzept
  // gekoppelt, Rezepte-Browsing ist davon inhaltlich unabhaengig.
  const [ansicht, setAnsicht] = useState('haupt')

  // Alle Rezepte aus der Datenbank (ungefiltert, siehe rezepteFilter.js fuer
  // die clientseitige Filterung). Bei nur ~30 Eintraegen reicht ein
  // einzelner Fetch beim Laden, siehe zutatenLaden-Effekt unten.
  const [rezepte, setRezepte] = useState([])

  // Nachschlage-Map zutat.id -> Zutat-Objekt, fuer den Zutaten-Join in der
  // Rezepte-Anzeige (jedes Rezept referenziert 4 Zutaten nur per id). Wird
  // im selben Effekt wie proteinOptionen etc. aus den geladenen Zutaten
  // gebaut, siehe zutatenLaden-Effekt unten.
  const [zutatenNachId, setZutatenNachId] = useState({})

  // Aktuell gewaehlter Mahlzeit-Filter (fruehstueck/mittag/abend/snack).
  // Lazy initializer: wird nur einmal beim ersten Rendern anhand der Uhrzeit berechnet.
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)

  // Aktuell ausgewaehlte Diaetform-Filter (vegan/vegetarisch/glutenfrei),
  // Mehrfachauswahl. Leeres Array = kein Diaet-Filter aktiv, alle Zutaten
  // kommen infrage. Lazy initializer laedt den zuletzt gespeicherten Wert
  // aus dem localStorage (analog zu ziel/makroZiele/tagesplanMahlzeiten),
  // damit die im Onboarding gewaehlte Ernaehrungsform einen Reload uebersteht.
  const [diaeten, setDiaeten] = useState(diaetenLaden)

  useEffect(() => {
    localStorage.setItem(DIAETEN_LOCALSTORAGE_KEY, JSON.stringify(diaeten))
  }, [diaeten])

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

  // Startbildschirm (Startbildschirm.jsx) - Marken-Moment VOR Wizard/
  // Hauptansicht, siehe Rendering-Weiche weiter unten. BEWUSST kein
  // localStorage wie bei onboardingAbgeschlossen: der Startbildschirm soll
  // bei JEDEM App-Start erscheinen (nicht nur beim allerersten Besuch),
  // daher reiner In-Memory-State, der bei jedem Neuladen wieder bei true
  // beginnt.
  const [zeigtStartbildschirm, setZeigtStartbildschirm] = useState(true)

  // Fuer die Fade-Choreografie beim Verlassen des Startbildschirms (siehe
  // Rendering-Weiche am Komponentenende) - dort wird bei reduzierter
  // Bewegung sofort hart umgeschaltet statt sanft ein-/auszublenden.
  const reduzierteBewegung = useReducedMotion()

  // DOM-Referenz auf den einblendenden "naechste Ansicht"-Wrapper (siehe
  // Rendering-Weiche am Komponentenende) - wird NUR gebraucht, um nach
  // Abschluss der Einblend-Animation das von framer-motion gesetzte inline
  // transform:translateY(...) (aus deren y-Drift) wieder zu entfernen
  // (siehe dortiger Kommentar) - dieser Wrapper bleibt fuer den Rest der
  // Sitzung bestehen (kein AnimatePresence/Unmount noetig), ein liegen
  // gebliebenes transform wuerde sonst DAUERHAFT einen neuen Stacking/
  // Containing-Block-Kontext fuer alle darin verschachtelten fixed
  // inset-0-Overlays (KochModus, Kalorienrechner) erzeugen.
  const naechsteAnsichtRef = useRef(null)

  // Ob abgehakte Kochschritte dauerhaft gespeichert werden (siehe
  // KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY oben) - Toggle in
  // EinstellungenAnsicht.jsx.
  const [kochschrittePersistent, setKochschrittePersistent] = useState(kochschrittePersistentLaden)

  useEffect(() => {
    localStorage.setItem(KOCHSCHRITTE_PERSISTENT_LOCALSTORAGE_KEY, String(kochschrittePersistent))
  }, [kochschrittePersistent])

  function kochschrittePersistentUmschalten() {
    setKochschrittePersistent((aktuell) => !aktuell)
  }

  // Kochmodus-Sheet (siehe KochModus.jsx) - bewusst HIER auf Top-Level statt
  // lokal in RezeptKarte.jsx, damit es als "fixed inset-0"-Backdrop wirklich
  // DIE GESAMTE App-Navigation optisch verdeckt (Planen/Rezepte-Tabs,
  // Tag-gesamt-Header, Mahlzeiten-Filter). null | { rezept, karte } - karte
  // ist ein reiner Momentaufnahme-Snapshot vom Oeffnen-Zeitpunkt (siehe
  // KochModus.jsx-Kommentar dort).
  const [kochModusEintrag, setKochModusEintrag] = useState(null)

  // Abhak-Status der Kochanleitung - siehe KochModus.jsx-Kommentar: lebt
  // BEWUSST hier statt lokal im Sheet, damit ein Schliessen+Wiederoeffnen
  // desselben Rezepts (das Sheet selbst wird dabei komplett unmounted) den
  // Fortschritt NICHT verwirft. erledigteSchritteRezeptId merkt sich, zu
  // welchem Rezept das aktuelle Set gehoert - weicht die beim naechsten
  // Oeffnen uebergebene rezept.id davon ab (neu gewuerfelt ODER Filter-
  // Wechsel hat ein anderes Rezept ausgewaehlt), wird VOR dem Anzeigen
  // zurueckgesetzt (siehe kochModusOeffnen unten). Lazy initializer laedt bei
  // aktivem kochschrittePersistent-Toggle den zuletzt gespeicherten Stand
  // (siehe kochschritteFortschrittLaden oben) - sonst (Default) startet
  // beides leer, exakt wie vor Einfuehrung dieses Toggles.
  const [erledigteSchritte, setErledigteSchritte] = useState(() => kochschritteFortschrittLaden().indices)
  const [erledigteSchritteRezeptId, setErledigteSchritteRezeptId] = useState(() => kochschritteFortschrittLaden().rezeptId)

  // Schreibt den Fortschritt bei JEDER Aenderung zurueck - aber NUR, solange
  // kochschrittePersistent aktiv ist (sonst bliebe ein veralteter Stand im
  // localStorage liegen, der nach einem erneuten Einschalten faelschlich
  // wieder auftauchen wuerde, siehe kochschritteFortschrittLaden oben). Das
  // Umschalten selbst (kochschrittePersistent in den deps) sorgt dafuer, dass
  // der AKTUELLE Sitzungs-Fortschritt sofort gespeichert wird, sobald der
  // Toggle eingeschaltet wird - nicht erst bei der naechsten Abhak-Aktion.
  useEffect(() => {
    if (!kochschrittePersistent) {
      return
    }
    localStorage.setItem(
      KOCHSCHRITTE_FORTSCHRITT_LOCALSTORAGE_KEY,
      JSON.stringify({ rezeptId: erledigteSchritteRezeptId, indices: [...erledigteSchritte] })
    )
  }, [kochschrittePersistent, erledigteSchritte, erledigteSchritteRezeptId])

  // Reset beim Verlassen des Rezepte-Tabs: sorgt dafuer, dass auch ein
  // zufaellig identisches Rezept beim naechsten Besuch wieder bei 0 startet,
  // statt alten Fortschritt "wiederzufinden" - ABER NUR, wenn
  // kochschrittePersistent AUS ist. Bei aktivem Toggle ist genau das
  // Gegenteil gewuenscht (Fortschritt soll Tab-/Sitzungs-Wechsel ueberleben),
  // ein Reset hier wuerde die eben gespeicherten Daten sonst sofort wieder
  // ueberschreiben (siehe Persistenz-Effekt oben, der bei JEDER Aenderung
  // von erledigteSchritte greift).
  useEffect(() => {
    if (kochschrittePersistent) {
      return
    }
    if (ansicht !== 'rezepte') {
      setErledigteSchritte(new Set())
      setErledigteSchritteRezeptId(null)
    }
  }, [ansicht, kochschrittePersistent])

  function kochModusOeffnen(rezept, karte) {
    if (rezept.id !== erledigteSchritteRezeptId) {
      setErledigteSchritte(new Set())
      setErledigteSchritteRezeptId(rezept.id)
    }
    setKochModusEintrag({ rezept, karte })
  }

  function kochSchrittUmschalten(index) {
    setErledigteSchritte((aktuell) => {
      const naechste = new Set(aktuell)
      if (naechste.has(index)) {
        naechste.delete(index)
      } else {
        naechste.add(index)
      }
      return naechste
    })
  }

  // Einkaufsliste (siehe einkaufsliste.js fuer das Datenmodell/die reine
  // Merge-Logik) - App-weiter State analog zu ziel/diaeten/makroZiele oben:
  // lazy initializer laedt den zuletzt gespeicherten Stand aus dem
  // localStorage, ein Effekt schreibt jede Aenderung sofort zurueck.
  const [einkaufsliste, setEinkaufsliste] = useState(einkaufslisteLaden)

  useEffect(() => {
    localStorage.setItem(EINKAUFSLISTE_LOCALSTORAGE_KEY, JSON.stringify(einkaufsliste))
  }, [einkaufsliste])

  // Kurze, selbst verschwindende Bestaetigung (siehe Toast.jsx) fuer die
  // beiden "zur Einkaufsliste hinzufuegen"-Einstiegspunkte (Rezepte-Tab,
  // Tagesplan) - { text, id } statt nur text, damit eine zweite, IDENTISCHE
  // Bestaetigung kurz hintereinander (z. B. zweimal "Zutaten hinzugefügt")
  // trotzdem sichtbar neu einblendet, siehe Toast.jsx-Kommentar zum key.
  const [toast, setToast] = useState(null)
  const toastTimeoutRef = useRef(null)

  // Raeumt einen noch laufenden Toast-Timer auf, wenn die Komponente
  // (theoretisch) unmountet wird - reines Aufraeumen, verhindert ein
  // setState nach Unmount, praktisch relevant vor allem bei Hot-Reload
  // waehrend der Entwicklung.
  useEffect(() => () => clearTimeout(toastTimeoutRef.current), [])

  function toastZeigen(text) {
    clearTimeout(toastTimeoutRef.current)
    setToast({ text, id: Date.now() })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2000)
  }

  // Von RezeptKarte.jsx aufgerufen ("Zur Einkaufsliste"-Button) - bekommt
  // die dort bereits berechnete karte (4 Zutaten + tatsaechliche Portionen).
  function rezeptZurEinkaufslisteHinzufuegen(karte) {
    setEinkaufsliste((aktuell) => zutatenHinzufuegen(aktuell, zutatenAusRezeptKarte(karte)))
    toastZeigen('Zutaten hinzugefügt')
  }

  // Von TagesplanAnsicht.jsx aufgerufen ("Tagesplan zur Einkaufsliste
  // hinzufuegen") - bekommt den kompletten Tagesplan (alle Mahlzeiten).
  function tagesplanZurEinkaufslisteHinzufuegen(tagesplanWert) {
    setEinkaufsliste((aktuell) => zutatenHinzufuegen(aktuell, zutatenAusTagesplan(tagesplanWert)))
    toastZeigen('Zutaten hinzugefügt')
  }

  function einkaufslistePostenAbhaken(schluessel) {
    setEinkaufsliste((aktuell) => postenAbhaken(aktuell, schluessel))
  }

  function einkaufslisteAbgehakteEntfernen() {
    setEinkaufsliste((aktuell) => abgehakteEntfernen(aktuell))
  }

  function einkaufslisteLeeren() {
    setEinkaufsliste([])
  }

  // Wird vom Wizard aufgerufen, wenn der User auf Schritt 4 (Abschluss-
  // Screen) eine der beiden Tap-Karten waehlt. gewaehlteAnsicht ist 'haupt'
  // oder 'rezepte' (siehe ansicht-State) - der Tap ist gleichzeitig die
  // Start-Auswahl UND der Abschluss des Onboardings. Persistiert den
  // Abschluss, damit der Wizard bei zukuenftigen Besuchen nicht mehr erscheint.
  function onboardingAbschliessen(gewaehlteAnsicht) {
    localStorage.setItem(ONBOARDING_LOCALSTORAGE_KEY, 'true')
    setOnboardingAbgeschlossen(true)
    setAnsicht(gewaehlteAnsicht)
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

  // Rezepte-Tab-Auswahl (Einzel- UND Tagesplan-Variante) - BEWUSST hier auf
  // App-Ebene gehalten statt lokal in RezepteAnsicht.jsx, wie es bis vor
  // diesem Fix der Fall war. Bugfix-Hintergrund: RezepteAnsicht wird beim
  // Tab-Wechsel ("Planen" <-> "Rezepte", siehe Rendering-Weiche unten) per
  // echtem Conditional-Rendering komplett unmountet/neu gemountet. Lokaler
  // State startete dadurch bei JEDEM Oeffnen des Rezepte-Tabs wieder bei
  // null/{} und wurde erst per useEffect NACH dem ersten Paint neu befuellt -
  // in der Luecke dazwischen zeigte RezeptKarte.jsx faelschlich "Fuer diese
  // Filterkombination gibt es noch kein Rezept.", obwohl die Daten laengst
  // da waren (nur der lokale Auswahl-State noch nicht neu gewuerfelt).
  // Zusaetzlich musste RezeptKarte.jsx danach noch das (evtl. neu
  // ausgewuerfelte, anderes) Rezeptbild frisch vorladen (siehe dortiger
  // BILD_PRELOAD_TIMEOUT_MS-Kommentar) - macht die sichtbare Luecke auf
  // einer echten Verbindung ca. 1 Sekunde lang statt nur einen Frame.
  // Mit dem State hier oben bleibt die Auswahl ueber Tab-Wechsel hinweg
  // erhalten (kein Neu-Wuerfeln, kein erneutes Bild-Vorladen fuer ein
  // Rezept, das man Sekunden zuvor schon gesehen hat) - analog zu
  // diaeten/ziel/makroZiele/tagesplanMahlzeiten oben, die aus demselben
  // Grund schon auf dieser Ebene liegen. Die Erst-Befuellung passiert im
  // zutatenLaden-Effekt weiter unten, im selben Zug wie setRezepte(...) -
  // Diaet-/Mahlzeiten-AENDERUNGEN loesen die Neu-Wuerfelung direkt in den
  // jeweiligen Handlern aus (diaetenAendern, tagesplanMahlzeitenAendern
  // weiter unten), bewusst NICHT ueber einen an RezepteAnsicht gebundenen
  // useEffect - der wuerde bei jedem Remount (= jedem Tab-Wechsel) erneut
  // feuern und genau das Caching wieder aufheben, das dieser Fix bezweckt.
  const [rezepteMahlzeit, setRezepteMahlzeit] = useState(standardMahlzeit)
  const [rezepteEigenschaft, setRezepteEigenschaft] = useState('')
  const [rezepteAktuellesRezept, setRezepteAktuellesRezept] = useState(null)
  const [rezepteAktiveMahlzeitTab, setRezepteAktiveMahlzeitTab] = useState(null)
  // { [mahlzeitTyp]: { eigenschaft, rezept } }
  const [rezepteProMahlzeitState, setRezepteProMahlzeitState] = useState({})

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
      // Zutaten und Rezepte parallel laden (zwei unabhaengige Tabellen) -
      // beide muessen fertig sein, bevor "laedt" auf false geht, sonst
      // waere die Rezepte-Ansicht kurz mit einer leeren Liste sichtbar.
      const [zutatenErgebnis, rezepteErgebnis] = await Promise.all([
        supabase
          .from('zutaten')
          // "id" brauchen wir fuer den Zutaten-Join in der Rezepte-Ansicht
          // (jedes Rezept referenziert 4 Zutaten nur per id) - wird sonst
          // im bestehenden Zutaten-Flow selbst nirgends benoetigt.
          // Zusaetzlich zu name und kategorie laden wir jetzt auch die
          // Naehrwert-Spalten und die Portionsgroesse (portion_g) mit,
          // damit wir spaeter eine Summe berechnen koennen.
          .select('id, name, kategorie, supermarkt_kategorie, kalorien, protein_g, carbs_g, fett_g, portion_g, mahlzeiten, diaeten, eigenschaft')
          .eq('aktiv', true),
        supabase
          .from('rezepte')
          .select(
            'id, titel, beschreibung, bild_url, mahlzeit, eigenschaft, diaeten, protein_zutat_id, carbs_zutat_id, fett_zutat_id, gemuese_obst_zutat_id, anleitung'
          ),
      ])

      if (zutatenErgebnis.error) {
        console.error('Fehler beim Laden der Zutaten:', zutatenErgebnis.error)
        setLaedt(false)
        return
      }
      if (rezepteErgebnis.error) {
        // Rezepte sind (noch) nicht kritisch fuer die Haupt-Ansicht - ein
        // Fehler hier soll nicht die ganze App blockieren, nur die
        // Rezepte-Ansicht bleibt dann leer (siehe RezepteAnsicht.jsx,
        // zeigt in dem Fall den "kein Rezept gefunden"-Hinweistext).
        console.error('Fehler beim Laden der Rezepte:', rezepteErgebnis.error)
      }

      const data = zutatenErgebnis.data

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
      setZutatenNachId(Object.fromEntries(data.map((z) => [z.id, z])))
      const rezepteDaten = rezepteErgebnis.data ?? []
      setRezepte(rezepteDaten)

      // Direkt eine erste Auswahl fuer den Rezepte-Tab wuerfeln (Einzel- UND
      // Tagesplan-Variante), passend zum aktuellen Mahlzeit-Filter bzw. den
      // aktiven Tagesplan-Mahlzeiten - analog zur Erst-Auswahl der Haupt-
      // Ansicht direkt darunter, UND der eigentliche Grund, warum
      // rezepteAktuellesRezept/rezepteProMahlzeitState (siehe Kommentar dort)
      // ueberhaupt bereits VOR dem ersten Rendern der Rezepte-Ansicht einen
      // echten Wert haben, statt erst per Folge-Effekt in RezepteAnsicht.jsx
      // selbst - genau das war die Ursache des Flackerns. Verwendet bewusst
      // rezepteDaten direkt (nicht den rezepte-State, der ist in diesem
      // Funktionsdurchlauf noch nicht aktualisiert).
      const ersterRezeptePool = gefiltertePoolFuerRezepte(rezepteDaten, rezepteMahlzeit, diaeten, rezepteEigenschaft)
      setRezepteAktuellesRezept(ersterRezeptePool.length > 0 ? zufaelligesElement(ersterRezeptePool) : null)
      setRezepteProMahlzeitState(
        alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenFuer(tagesplanMahlzeiten), rezepteDaten, diaeten)({})
      )

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

  // Laedt die Rezeptbilder (~30 kuratierte Rezepte) im Hintergrund vor, damit
  // sie beim tatsaechlichen Anzeigen (erster Rezepte-Tab-Besuch, Wuerfeln)
  // schon im Browser-Cache liegen - RezeptBild (RezeptKarte.jsx) startet
  // dann sofort bei voller Deckkraft statt den Skeleton-Platzhalter zu
  // zeigen (siehe dortiger img.complete-Check in RezeptBild). Bugfix-
  // Hintergrund: der Skeleton aus commit 8817121 verhindert zwar die
  // FALSCHE "kein Rezept"-Meldung, das Bild selbst braucht aber weiterhin
  // eine Sekunde, wenn es beim ersten Erscheinen noch nie geladen wurde.
  //
  // Zeitpunkt bewusst NICHT "sofort beim App-Start" (waehrend rezepte noch
  // leer ist, kaeme ohnehin nichts zum Vorladen zusammen) UND NICHT bevor
  // der Startbildschirm fertig ist (zeigtStartbildschirm) - der Marken-
  // Moment beim App-Start soll nicht mit ~30 Bild-Requests um Bandbreite/
  // Hauptthread konkurrieren. Sobald BEIDE Bedingungen erfuellt sind (Daten
  // da UND Startbildschirm weg), sind wir entweder im Wizard (neuer Nutzer -
  // dort vergehen noch mehrere Interaktionsschritte bis "Alles bereit!")
  // oder direkt in der Haupt-Ansicht (wiederkehrender Nutzer) - in BEIDEN
  // Faellen bleibt genug Zeit, bevor der Rezepte-Tab ueberhaupt angefasst wird.
  //
  // bilderVorgeladenRef verhindert ein zweites Anstossen (z. B. durch React
  // StrictModes doppelten Effekt-Aufruf in der Entwicklung, oder falls dieser
  // Effekt aus einem anderen Grund erneut liefe) - das Vorladen soll pro
  // Sitzung nur EINMAL starten.
  const bilderVorgeladenRef = useRef(false)
  useEffect(() => {
    if (bilderVorgeladenRef.current || rezepte.length === 0 || zeigtStartbildschirm) {
      return
    }
    bilderVorgeladenRef.current = true

    // Priorisierung: das Bild, das beim Oeffnen des Rezepte-Tabs SOFORT
    // sichtbar waere (bereits synchron in zutatenLaden oben ausgewuerfelt,
    // siehe rezepteAktuellesRezept/rezepteProMahlzeitState-Kommentar weiter
    // oben), zuerst - deckt den im Auftrag genannten "Alles bereit!" ->
    // Rezepte-Fall sofort ab. Danach der Rest aller Rezepte in
    // Datenbank-Reihenfolge, im Hintergrund "troepfelnd" (siehe
    // bildVorladen.js).
    const prioritaet = [
      rezepteAktuellesRezept?.bild_url,
      ...Object.values(rezepteProMahlzeitState).map((eintrag) => eintrag?.rezept?.bild_url),
    ]
    const rest = rezepte.map((r) => r.bild_url)
    bilderImHintergrundVorladen([...prioritaet, ...rest], 2)
  }, [rezepte, zeigtStartbildschirm, rezepteAktuellesRezept, rezepteProMahlzeitState])

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

  // Rueckt den Reroll-Zaehler (Einzel-Ansicht) fuer GENAU eine Kategorie
  // einen Schritt weiter - siehe naechsterRerollZaehlerStand weiter oben fuer
  // den Zweck (Suchfeld nach REROLL_SCHWELLE_ERSTES_MAL bzw. spaeter
  // REROLL_SCHWELLE_ERNEUT aufeinanderfolgenden Rerolls desselben Slots).
  function rerollZaehlerErhoehen(kategorie) {
    setRerollZaehler((aktuell) => ({ ...aktuell, [kategorie]: naechsterRerollZaehlerStand(aktuell[kategorie]) }))
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
  // REROLL_SCHWELLE_ERSTES_MAL Rerolls desselben Slots) gezielt eine Zutat
  // auswaehlt. Behandelt die Auswahl wie einen Reroll: derselbe
  // Portionsberechnungs-Pfad (portionenMitMakroZielenSetzen), keine
  // Sonderbehandlung. Setzt zusaetzlich NUR den Zaehler dieser Kategorie
  // zurueck (siehe manuellGewaehlterRerollZaehlerStand), die anderen drei
  // Slots behalten ihren Zaehlerstand.
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
    setRerollZaehler((aktuell) => ({ ...aktuell, [kategorie]: manuellGewaehlterRerollZaehlerStand() }))
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
  // auch der im Einstellungen-Tab (EinstellungenAnsicht.jsx, dort immer
  // sichtbar, unabhaengig vom aktuellen Screen - genau wie DiaetFilter).
  // Einzelauswahl statt
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

    // Rezepte-Tab (Einzel- UND Tagesplan-Variante) ebenfalls neu wuerfeln -
    // unconditional (nicht nur wenn der Rezepte-Tab gerade sichtbar ist,
    // analog zum Tagesplan oben), damit die Auswahl beim naechsten Oeffnen
    // schon zur neuen Diaet-Auswahl passt, statt veraltet im Cache zu
    // haengen (siehe rezepteAktuellesRezept-Kommentar weiter oben).
    const neuerRezeptePool = gefiltertePoolFuerRezepte(rezepte, rezepteMahlzeit, neueDiaeten, rezepteEigenschaft)
    setRezepteAktuellesRezept(neuerRezeptePool.length > 0 ? zufaelligesElement(neuerRezeptePool) : null)
    setRezepteProMahlzeitState(alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenFuer(tagesplanMahlzeiten), rezepte, neueDiaeten))
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

    // Rezepte-Tagesplan-Variante ebenfalls neu wuerfeln - die aktiven
    // Mahlzeit-Tabs dort richten sich nach genau demselben
    // tagesplanMahlzeiten-Wert (siehe RezepteAnsicht.jsx/aktiveMahlzeitenFuer).
    setRezepteProMahlzeitState(alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenFuer(neueMahlzeiten), rezepte, diaeten))
  }

  // --- Rezepte-Tab: Einzel-Ansicht (siehe rezepteMahlzeit/rezepteEigenschaft/
  // rezepteAktuellesRezept-Kommentar weiter oben zum Bugfix-Hintergrund).
  // Bewusst eigene, von mahlzeitAendern/suessDeftigAendern (Haupt-Ansicht)
  // GETRENNTE Handler - ein Filterwechsel im Rezepte-Tab darf nicht die
  // Haupt-Ansicht-Slots mit neu wuerfeln, und umgekehrt.

  function rezepteMahlzeitAendern(neueMahlzeit) {
    if (neueMahlzeit === rezepteMahlzeit) {
      return
    }
    const neuerPool = gefiltertePoolFuerRezepte(rezepte, neueMahlzeit, diaeten, rezepteEigenschaft)
    setRezepteMahlzeit(neueMahlzeit)
    setRezepteAktuellesRezept(neuerPool.length > 0 ? zufaelligesElement(neuerPool) : null)
  }

  function rezepteEigenschaftAendern(neueEigenschaft) {
    if (neueEigenschaft === rezepteEigenschaft) {
      return
    }
    const neuerPool = gefiltertePoolFuerRezepte(rezepte, rezepteMahlzeit, diaeten, neueEigenschaft)
    setRezepteEigenschaft(neueEigenschaft)
    setRezepteAktuellesRezept(neuerPool.length > 0 ? zufaelligesElement(neuerPool) : null)
  }

  // "Anderes Rezept wuerfeln" (Einzel-Ansicht) - kompletter Kombinations-
  // Wechsel innerhalb des aktuellen Pools, kein Einzel-Slot-Reroll.
  function rezeptWuerfeln() {
    const pool = gefiltertePoolFuerRezepte(rezepte, rezepteMahlzeit, diaeten, rezepteEigenschaft)
    setRezepteAktuellesRezept(pool.length > 0 ? zufaelligesElement(pool) : null)
  }

  // --- Rezepte-Tab: Tagesplan-Variante ---

  // Effektiv aktiver Mahlzeit-Tab: rezepteAktiveMahlzeitTab ODER, falls noch
  // nie explizit gesetzt bzw. die zuletzt gewaehlte Mahlzeit inzwischen ueber
  // "Mahlzeiten anpassen" deaktiviert wurde, die erste noch aktive Mahlzeit.
  // Bewusst als abgeleiteter Wert bei JEDEM Rendern neu berechnet (statt wie
  // vorher per useEffect nachtraeglich korrigiert) - so bleibt der State
  // rezepteAktiveMahlzeitTab robust gegen den Fall "gerade sichtbare
  // Mahlzeit wurde deaktiviert", OHNE dass dafuer ein eigener Effekt noetig
  // waere, der beim Tab-Remount erneut anspringen wuerde.
  const rezepteAktiveMahlzeitenListe = aktiveMahlzeitenFuer(tagesplanMahlzeiten)
  const rezepteEffektivAktiveMahlzeitTab =
    rezepteAktiveMahlzeitTab && rezepteAktiveMahlzeitenListe.some(({ slug }) => slug === rezepteAktiveMahlzeitTab)
      ? rezepteAktiveMahlzeitTab
      : rezepteAktiveMahlzeitenListe[0]?.slug ?? 'mittag'

  function rezepteEigenschaftFuerMahlzeitAendern(neueEigenschaft) {
    setRezepteProMahlzeitState((aktuell) => {
      if ((aktuell[rezepteEffektivAktiveMahlzeitTab]?.eigenschaft ?? '') === neueEigenschaft) {
        return aktuell
      }
      const pool = gefiltertePoolFuerRezepte(rezepte, rezepteEffektivAktiveMahlzeitTab, diaeten, neueEigenschaft)
      return {
        ...aktuell,
        [rezepteEffektivAktiveMahlzeitTab]: {
          eigenschaft: neueEigenschaft,
          rezept: pool.length > 0 ? zufaelligesElement(pool) : null,
        },
      }
    })
  }

  // "Anderes Rezept wuerfeln" (Rezepte-Tagesplan) - trifft NUR die gerade im
  // Tab sichtbare Mahlzeit, alle anderen behalten ihr Rezept.
  function rezepteMahlzeitTabWuerfeln() {
    setRezepteProMahlzeitState((aktuell) => {
      const eigenschaftFuerMahlzeit = aktuell[rezepteEffektivAktiveMahlzeitTab]?.eigenschaft ?? ''
      const pool = gefiltertePoolFuerRezepte(rezepte, rezepteEffektivAktiveMahlzeitTab, diaeten, eigenschaftFuerMahlzeit)
      return {
        ...aktuell,
        [rezepteEffektivAktiveMahlzeitTab]: {
          eigenschaft: eigenschaftFuerMahlzeit,
          rezept: pool.length > 0 ? zufaelligesElement(pool) : null,
        },
      }
    })
  }

  // "Ganzen Tag neu planen" (Rezepte-Tagesplan) - wuerfelt alle aktiven
  // Mahlzeiten im Hintergrund neu, auch die gerade nicht sichtbaren.
  function rezepteGanzenTagNeuPlanen() {
    setRezepteProMahlzeitState(alleAktivenMahlzeitenWuerfeln(rezepteAktiveMahlzeitenListe, rezepte, diaeten))
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

  // Wird vom Auto-Generieren-Effekt unten (erster Tagesplan) sowie vom
  // "Ganzen Tag neu planen"-Button aufgerufen.
  function tagPlanen() {
    tagesplanNeuSetzen(tagesplanErzeugen(diaeten, tagesplanMahlzeiten, suessDeftig))
  }

  // Generiert den Tagesplan automatisch, sobald der Planen-Tab MIT aktivem
  // "Pro Tag"-Ziel sichtbar ist und noch KEIN Plan existiert - ersetzt die
  // vorherige Zwischenseite mit einem "Ganzen Tag planen"-Button (unnoetiger
  // Doppel-Klick: der User hat sein Ziel bereits explizit auf "Pro Tag"
  // gesetzt, ein Tagesplan ist die einzig sinnvolle naechste Ansicht).
  //
  // Die !tagesplan-Bedingung ist der entscheidende Schutz: ein reiner Tab-
  // Wechsel weg von "Planen" und zurueck aendert weder ziel.typ noch
  // tagesplan, der Effekt haengt aber trotzdem an [ansicht, ...] - ohne
  // diese Bedingung wuerde JEDER Tab-Wechsel zurueck zu "Planen" den
  // bestehenden, vom User ggf. schon individuell angepassten Plan (einzelne
  // Slots nachgewuerfelt) verwerfen und komplett neu wuerfeln. Mit der
  // Bedingung passiert das nur EINMALIG: beim allerersten Erreichen dieses
  // Zustands (Erstaufruf mit bereits gespeichertem "Pro Tag"-Ziel ODER
  // Wechsel von einem anderen Zieltyp zu "Pro Tag", siehe zielTypAendern -
  // dort wird tagesplan beim Verlassen von "Pro Tag" bewusst auf null
  // zurueckgesetzt, sodass ein spaeteres Zurueckwechseln zu "Pro Tag" hier
  // wieder als "neu" erkannt wird).
  //
  // BEWUSST NICHT diaeten/tagesplanMahlzeiten/suessDeftig/tagPlanen in der
  // Dependency-Liste (siehe bereits bestehendes, analoges Muster beim
  // initialen Laden weiter oben) - eine Reaktion auf DEREN Aenderungen
  // uebernehmen bereits diaetenAendern/suessDeftigAendern/
  // tagesplanMahlzeitenAendern selbst (jeweils mit einem "if (tagesplan)"-
  // Regenerieren an bestehenden Slots), dieser Effekt ist ausschliesslich
  // fuers ERSTMALIGE Erzeugen zustaendig.
  //
  // !laedt ist PFLICHT, nicht nur Kosmetik: bei einem Erstaufruf mit schon
  // gespeichertem "Pro Tag"-Ziel (siehe zielLaden) sind ansicht/ziel.typ/
  // tagesplan schon beim ALLERERSTEN Render exakt in der Ausloese-
  // Konstellation - VOR dem ersten erfolgreichen Laden der Zutaten-Pools
  // aus Supabase. Ohne diese Bedingung wuerde tagesplanErzeugen() auf noch
  // leeren Pools laufen und beim Ziehen einer zufaelligen Zutat aus einem
  // leeren Array abstuerzen (per Test verifiziert).
  useEffect(() => {
    if (!laedt && ansicht === 'haupt' && ziel.typ === 'proTag' && !tagesplan) {
      tagPlanen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laedt, ansicht, ziel.typ, tagesplan])

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
      aktuelleZaehler.map((z, i) => (i === index ? { ...z, [kategorie]: naechsterRerollZaehlerStand(z[kategorie]) } : z))
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
      aktuelleZaehler.map((z, i) => (i === index ? { ...z, [kategorie]: manuellGewaehlterRerollZaehlerStand() } : z))
    )
  }

  // Allererster Bildschirm der App - siehe Startbildschirm.jsx. Tap auf den
  // dortigen Button setzt NUR diesen State zurueck; welche der beiden
  // folgenden Ansichten (Wizard/Hauptansicht) dann erscheint, entscheidet
  // weiterhin ausschliesslich die bestehende onboardingAbgeschlossen-Weiche
  // direkt darunter, komplett unveraendert.
  //
  // Fuer den Crossfade (Bugfix "Startbildschirm-Uebergang") darf diese
  // Weiche NICHT mehr per frueher Return komplett abbrechen (das wuerde die
  // naechste Ansicht erst NACH dem Ausblenden des Startbildschirms montieren
  // - ein harter Schnitt statt einer Ueberlappung). Stattdessen wird die
  // GESAMTE bisherige Rendering-Kette (Wizard/Laedt/Hauptansicht,
  // unveraendert per fruehem Return INNERHALB dieser Funktion) in ein IIFE
  // gewrappt und als eigener Wert (naechsteAnsicht) berechnet - sie wird erst
  // dann ueberhaupt ausgewertet/montiert, wenn zeigtStartbildschirm bereits
  // false ist (siehe Bedingung ganz unten bei der Verwendung), damit VOR dem
  // ersten Tap weiterhin exakt nichts von alldem gemountet wird (keine
  // Verhaltensaenderung fuer die Zeit davor). Alle Hooks der Komponente
  // stehen bereits VOLLSTAENDIG oberhalb dieser Stelle (siehe Kommentare zu
  // den einzelnen useState/useEffect-Aufrufen weiter oben) - das IIFE selbst
  // ruft KEINE weiteren Hooks auf, ist also unproblematisch fuer die
  // Rules-of-Hooks.
  const naechsteAnsicht = (() => {
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
        {/* Der fruehere "gusto"-Logo+Slogan-Header ist auf den Hauptseiten
            (Planen/Rezepte, nach Abschluss des Onboardings) bewusst entfernt -
            spart vertikalen Platz app-weit. Bleibt NUR im OnboardingWizard
            erhalten (dort unveraendert, siehe WizardTageskarte.jsx u. a.) - der
            Wizard ist der einzige Ort, an dem der Marken-Einstieg noch gezeigt
            wird. Die frueher hier oben sitzende Planen/Rezepte-Tab-Leiste +
            Einstellungen-Zahnrad ist durch die schwebende TabLeiste (siehe
            TabLeiste.jsx) am unteren Rand ersetzt - 'einstellungen' ist dort
            ein ganz normaler ansicht-Wert wie 'rezepte'/'einkaufsliste',
            siehe Rendering-Weiche unten. */}
        <TabLeiste aktiverTab={ansicht} onTabWaehlen={setAnsicht} />

        <Toast nachricht={toast} />

        <KochModus
          eintrag={kochModusEintrag}
          onZurueck={() => setKochModusEintrag(null)}
          erledigteSchritte={erledigteSchritte}
          onSchrittUmschalten={kochSchrittUmschalten}
        />

        {/* pb-[...]: Platz fuer die schwebende TabLeiste (60px Hoehe + 12px
            Bodenabstand + Safe-Area, siehe .tab-leiste in index.css), damit
            sie den untersten Inhalt nicht dauerhaft ueberlagert. Nur um
            diesen Content-Block herum (nicht um KochModus oben) - das ist
            ein fixed inset-0-Overlay und deckt den Viewport ohnehin komplett
            ab, braucht also kein eigenes Bottom-Padding. */}
        <div className="pb-[calc(96px_+_env(safe-area-inset-bottom))] pt-4">
        {ansicht === 'einstellungen' ? (
          <EinstellungenAnsicht
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
            kochschrittePersistent={kochschrittePersistent}
            onKochschrittePersistentUmschalten={kochschrittePersistentUmschalten}
          />
        ) : ansicht === 'rezepte' ? (
          <RezepteAnsicht
            rezepteGeladen={!laedt}
            rezepte={rezepte}
            zutatenNachId={zutatenNachId}
            diaeten={diaeten}
            ziel={ziel}
            makroZiele={makroZiele}
            tagesplanMahlzeiten={tagesplanMahlzeiten}
            mahlzeit={rezepteMahlzeit}
            onMahlzeitAendern={rezepteMahlzeitAendern}
            eigenschaft={rezepteEigenschaft}
            onEigenschaftAendern={rezepteEigenschaftAendern}
            aktuellesRezept={rezepteAktuellesRezept}
            onWuerfeln={rezeptWuerfeln}
            aktiveMahlzeitTab={rezepteEffektivAktiveMahlzeitTab}
            onAktiveMahlzeitTabAendern={setRezepteAktiveMahlzeitTab}
            proMahlzeitState={rezepteProMahlzeitState}
            onEigenschaftFuerMahlzeitAendern={rezepteEigenschaftFuerMahlzeitAendern}
            onMahlzeitTabWuerfeln={rezepteMahlzeitTabWuerfeln}
            onGanzenTagNeuPlanen={rezepteGanzenTagNeuPlanen}
            onMahlzeitenAnpassen={() => setAnsicht('einstellungen')}
            onKochModusOeffnen={kochModusOeffnen}
            onZurEinkaufslisteHinzufuegen={rezeptZurEinkaufslisteHinzufuegen}
          />
        ) : ansicht === 'einkaufsliste' ? (
          <EinkaufslisteAnsicht
            liste={einkaufsliste}
            onPostenAbhaken={einkaufslistePostenAbhaken}
            onAbgehakteEntfernen={einkaufslisteAbgehakteEntfernen}
            onListeLeeren={einkaufslisteLeeren}
          />
        ) : ziel.typ === 'proTag' ? (
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
              onMahlzeitenAnpassen={() => setAnsicht('einstellungen')}
              onNeuPlanen={tagPlanen}
              onZurEinkaufslisteHinzufuegen={tagesplanZurEinkaufslisteHinzufuegen}
            />
          ) : (
            // Kurzes Fenster zwischen "Pro Tag aktiv" und "Plan fertig
            // generiert" (siehe Auto-Generieren-Effekt oben) - tagesplanErzeugen
            // selbst ist zwar synchron/lokal (keine Netzwerk-Anfrage, die
            // Zutaten-Pools sind zu diesem Zeitpunkt schon geladen), der Effekt
            // feuert aber erst NACH dem ersten Render, wodurch ohne dieses
            // Skeleton kurz ein leerer Screen aufblitzen wuerde.
            <TagesplanSkeleton />
          )
        ) : (
          <>
            <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />

            {(mahlzeit === 'fruehstueck' || mahlzeit === 'snack') && (
              <SuessDeftigFilter aktuell={suessDeftig} onAendern={suessDeftigAendern} />
            )}

            <AnimatedButton
              type="button"
              onClick={() => setAnsicht('einstellungen')}
              className="mt-2 px-4 text-sm text-primary hover:underline"
            >
              Einstellungen anpassen
            </AnimatedButton>

            <section id="slots" className="grid grid-cols-2 gap-4 p-4">
              <SlotKarte
                titel="Protein"
                text={protein.name}
                portion={proteinPortion}
                onWuerfeln={proteinWuerfeln}
                zielWert={aktuelleMakroZiele.protein}
                onZielAendern={(wert) => makroZielAendern('protein', wert)}
                zielErreichbar={proteinZielErreichbar}
                sucheAnzeigen={rerollZaehler.protein.zaehler >= rerollZaehler.protein.schwelle}
                suchPool={proteinSuchPool}
                onZutatWaehlen={(zutat) => zutatManuellWaehlen('protein', zutat)}
              />
              <SlotKarte
                titel="Kohlenhydrate"
                text={carbs.name}
                portion={carbsPortion}
                onWuerfeln={carbsWuerfeln}
                zielWert={aktuelleMakroZiele.carbs}
                onZielAendern={(wert) => makroZielAendern('carbs', wert)}
                zielErreichbar={carbsZielErreichbar}
                sucheAnzeigen={rerollZaehler.carbs.zaehler >= rerollZaehler.carbs.schwelle}
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
                sucheAnzeigen={rerollZaehler.fett.zaehler >= rerollZaehler.fett.schwelle}
                suchPool={fettSuchPool}
                onZutatWaehlen={(zutat) => zutatManuellWaehlen('fett', zutat)}
              />
              <SlotKarte
                titel={gemuese.kategorie === 'obst' ? 'Obst' : 'Gemüse'}
                text={gemuese.name}
                portion={gemuesePortion}
                onWuerfeln={gemueseWuerfeln}
                sucheAnzeigen={rerollZaehler.gemuese.zaehler >= rerollZaehler.gemuese.schwelle}
                suchPool={gemueseSuchPool}
                onZutatWaehlen={(zutat) => zutatManuellWaehlen('gemuese', zutat)}
              />
            </section>

            <section id="summe" className="mx-4 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-text">Summe</h2>
              <p className="font-display text-3xl font-semibold text-text">{summeKalorien.toFixed(1)} kcal</p>
              <p className="text-text-muted">
                P {summeProtein.toFixed(1)}g · K {summeCarbs.toFixed(1)}g · F {summeFett.toFixed(1)}g
              </p>
            </section>

            <AnimatedButton type="button" onClick={neueAuswahlWuerfeln} className="m-4 rounded-lg bg-primary px-4 py-2 text-card">
              Neue Auswahl würfeln
            </AnimatedButton>
          </>
        )}
        </div>
      </>
    )
  })()

  // Rendering-Weiche: solange der Startbildschirm sichtbar ist, wird
  // naechsteAnsicht (Wizard/Laedt/Hauptansicht, siehe IIFE oben) NICHT in den
  // Baum eingehaengt - sie wird erst gemountet, wenn Startbildschirm.jsx
  // onWeiter aufruft (== setZeigtStartbildschirm(false)), was dort selbst
  // erst NACH Abschluss von dessen eigenem Ausblenden (Logo/Halo/Button,
  // siehe dortige AUSBLEND_DAUER_S) passiert. Zu diesem Zeitpunkt faedet
  // sie DANN mit NAECHSTE_ANSICHT_EINBLEND_DAUER_S ein (siehe Konstante
  // oben) - "direkt danach, keine Pause" aus der Aufgabenstellung.
  // AnimatePresence haelt das Startbildschirm-Overlay parallel dazu noch so
  // lange im DOM, bis dessen eigenes (kurzes) exit-Fade fertig ist (siehe
  // dessen motion.div unten) - da die naechste Ansicht bereits DARUNTER
  // liegt und zu diesem Zeitpunkt schon mitten in ihrer eigenen Einblend-
  // Animation steckt, entsteht durch dieses kurze, ueberlappende
  // Weg-Fade des cremefarbenen Overlays genau der gewuenschte "leicht
  // ueberlappende" Uebergang statt eines harten Schnitts.
  return (
    <>
      {!zeigtStartbildschirm && (
        <motion.div
          key="app-inhalt"
          ref={naechsteAnsichtRef}
          initial={
            reduzierteBewegung ? false : { opacity: 0, y: NAECHSTE_ANSICHT_EINBLEND_Y_PX }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduzierteBewegung
              ? { duration: 0.15 }
              : { duration: NAECHSTE_ANSICHT_EINBLEND_DAUER_S, ease: EXPO_OUT }
          }
          onAnimationComplete={() => {
            // Nach Abschluss das von framer-motion gesetzte inline
            // transform:translateY(0px) (aus dem y-Drift oben) wieder
            // entfernen (siehe Kommentar an naechsteAnsichtRef oben) -
            // dieser Wrapper bleibt fuer den Rest der Sitzung bestehen, ein
            // liegen gebliebener (wenn auch optisch wirkungsloser)
            // transform-Wert wuerde sonst DAUERHAFT einen neuen
            // Containing-Block fuer alle darin verschachtelten fixed
            // inset-0-Overlays (KochModus, Kalorienrechner) erzeugen -
            // siehe Aufgabenstellung "Stacking-Kontext-Probleme". Direkte
            // DOM-Mutation statt eines State-Umbaus (z. B. den Wrapper nach
            // Abschluss durch naechsteAnsicht OHNE Wrapper zu ersetzen): ein
            // struktureller Umbau wuerde React dazu bringen, den kompletten
            // Teilbaum (samt OnboardingWizard/Hauptansicht) neu zu mounten
            // (anderer Element-Typ an derselben Stelle - motion.div vs.
            // Fragment/OnboardingWizard direkt), was einen sichtbaren
            // Re-Mount ausloesen wuerde. Die ref bleibt dieselbe motion.div-
            // Instanz ueber die gesamte Sitzung.
            if (naechsteAnsichtRef.current) {
              naechsteAnsichtRef.current.style.transform = ''
            }
          }}
        >
          {naechsteAnsicht}
        </motion.div>
      )}

      {/* eigenes AnimatePresence NUR um den Startbildschirm (nicht um die
          gesamte Rendering-Weiche) - GENAU dieses Muster (Uebergang nur auf
          einer bewusst schlanken, ausschliesslich fuer den Uebergang
          zustaendigen motion.div) ist bereits an mehreren Stellen der App
          etabliert (z. B. Titel-Crossfade in OnboardingWizard.jsx). fixed
          inset-0 + bg-bg + hoher z-index, damit der Startbildschirm waehrend
          seines (kurzen) Weg-Fadens weiterhin die GESAMTE App wie bisher
          verdeckt (unabhaengig von der tatsaechlichen Hoehe von
          naechsteAnsicht darunter) und nicht durch Layout-Fluss verschoben
          wird - dieses Overlay wird nach seinem exit vollstaendig aus dem
          DOM entfernt (AnimatePresence), ein liegen gebliebenes transform
          ist hier also (anders als beim staendig bestehen bleibenden
          app-inhalt-Wrapper oben) unproblematisch. Reines FADE_UEBERGANG
          statt eines eigenen Bezugs auf reduzierte Bewegung: exit ist hier
          in BEIDEN Faellen ein reines Opacity-Fade, nur die Dauer
          unterscheidet sich. */}
      <AnimatePresence>
        {zeigtStartbildschirm && (
          <motion.div
            key="startbildschirm"
            className="fixed inset-0 z-50 bg-bg"
            exit={{ opacity: 0 }}
            transition={reduzierteBewegung ? { duration: 0.15 } : FADE_UEBERGANG}
          >
            <Startbildschirm onWeiter={() => setZeigtStartbildschirm(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App
