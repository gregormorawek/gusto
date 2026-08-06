// Portionsberechnungs-Pipeline: rein rechnerische, UI-unabhaengige Logik, die
// aus vier FEST vorgegebenen Zutaten (egal ob gewuerfelt, manuell per
// Reroll-Suchfeld gewaehlt, oder - seit Schritt 3 - aus einem Rezept fest
// vorgegeben) unter Beruecksichtigung von Kalorien-/Makro-Ziel die
// tatsaechlichen Portionen (Gramm) ermittelt. Bewusst in einem eigenen Modul
// statt in App.jsx, weil sowohl App.jsx (Einzel-Ansicht, Tagesplan) als auch
// RezepteAnsicht.jsx (Schritt 3) exakt dieselbe Pipeline brauchen - eine
// Kopie dieser Gleichungssystem-Logik waere die Art von Duplikation, die bei
// spaeteren Aenderungen leicht auseinanderlaeuft.

// Hilfsfunktion: rechnet einen 100g-Referenzwert (z. B. Kalorien pro 100g)
// auf die tatsaechliche Portionsgroesse der Zutat um.
export function aufPortionSkalieren(wertPro100g, portionsGroesseInGramm) {
  return (wertPro100g / 100) * portionsGroesseInGramm
}

// Anteil der Tages-Kalorien, der bei ziel.typ === 'proTag' auf die jeweilige
// Mahlzeit entfaellt (Basiswerte fuer ALLE vier Mahlzeiten - siehe
// normalisierteTagesAnteile in App.jsx fuer die Umrechnung auf eine
// Teilmenge, dort bewusst NICHT hierher verschoben, weil das nur fuer den
// Tagesplan gebraucht wird, nicht fuer die reine Portionsberechnung).
export const TAGES_ANTEIL = { fruehstueck: 0.25, mittag: 0.35, abend: 0.3, snack: 0.1 }

// Ermittelt das Kalorienfenster (Min/Max) fuer EINE Mahlzeit-Kategorie,
// abhaengig vom gewaehlten Ziel-Typ. Gibt null zurueck, wenn kein Ziel aktiv
// ist oder Min/Max (noch) nicht beide gueltig eingegeben sind (Min muss
// echt kleiner als Max sein) - in dem Fall bleibt die Portion unskaliert
// (Faktor 1). anteilUeberschreibung ersetzt bei Bedarf den TAGES_ANTEIL-
// Basiswert (z. B. mit einem normalisierten Anteil aus dem Tagesplan, wenn
// nicht alle vier Mahlzeiten ausgewaehlt sind) - ohne Angabe (Einzel-
// Ansicht, Rezepte-Ansicht) bleibt das Verhalten unveraendert. Bei "Pro Tag"
// wird die TAGES_ANTEIL-Aufteilung auf Min UND Max GETRENNT angewendet,
// sodass jede Mahlzeit ihr eigenes Fenster bekommt.
export function zielKalorienFensterFuerMahlzeit(zielWert, mahlzeitWert, anteilUeberschreibung) {
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

// Naehrwert-Spalte je Protein/Carbs/Fett-Kategorie - fuer generische Stellen
// (z. B. tagesplanSlotWuerfeln in App.jsx), die die Kategorie nur als String
// kennen.
export const NAEHRWERT_SCHLUESSEL_NACH_KATEGORIE = { protein: 'protein_g', carbs: 'carbs_g', fett: 'fett_g' }

// Liefert das gesetzte Makro-Ziel (Gramm, > 0) fuer Protein/Carbs/Fett einer
// Mahlzeit, oder null, wenn kein gueltiges Ziel gesetzt ist (leerer String,
// 0 oder negativ). null bedeutet in der gesamten Wuerfel-/Portionslogik
// "dieser Slot ist flexibel", ein Zahlenwert bedeutet "dieser Slot ist auf
// die exakte Ziel-Portion fixiert".
export function makroZielGrammFuer(makroZieleWert, kategorie) {
  const wert = Number(makroZieleWert?.[kategorie])
  return wert > 0 ? wert : null
}

// Rechnet ein Makro-Ziel (Gramm) fuer EINE Zutat in die exakte Portion
// (Gramm) um, die dieses Ziel genau trifft. null, wenn die Zutat den
// Naehrwert gar nicht enthaelt (Ziel prinzipiell unerreichbar).
export function makroZielExaktePortion(zutat, zielGramm, naehrwertSchluessel) {
  const naehrwertProGramm = zutat[naehrwertSchluessel] / 100
  return naehrwertProGramm > 0 ? zielGramm / naehrwertProGramm : null
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
// mit erreichbar=false. Rein modul-intern, wird nur von
// portionenMitMakroZielenBerechnen gebraucht.
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
// beliebig, muss nur konsistent verwendet werden. Rein modul-intern.
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
// Verhaeltnis fuer die betroffenen Makros haben). Rein modul-intern.
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
// in diesem Fall leer, der Aufrufer faellt auf die isolierte Berechnung
// zurueck. Rein modul-intern.
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
//
// Wird von App.jsx (Einzel-Ansicht + Tagesplan, dort mit optionaler
// anteilUeberschreibung) UND von RezepteAnsicht.jsx (Schritt 3, dort ohne
// anteilUeberschreibung - ein Rezept hat immer genau eine feste Mahlzeit)
// mit den vier fest vorgegebenen Zutaten aufgerufen - die Ziel-bewusste
// AUSWAHL der Zutaten (Wuerfeln) passiert vorher an anderer Stelle, hier
// geht es nur noch um die Portion der bereits feststehenden Zutaten, exakt
// wie beim manuellen Waehlen im Reroll-Suchfeld.
export function portionenMitMakroZielenBerechnen(proteinZutat, carbsZutat, fettZutat, gemueseZutat, mahlzeitWert, zielWert, makroZieleWert, anteilUeberschreibung) {
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
