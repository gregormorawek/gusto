// Rezepte-Filterfunktionen, analog zu zutatenFilter.js - ABER bewusst mit
// zwei Unterschieden zum dortigen Vorbild:
//
// 1. rezepte.diaeten ist ein echtes Postgres-Array (text[]), waehrend
//    zutaten.diaeten ein kommaseparierter String ist. Die bestehende
//    nachDiaetenGefiltert aus zutatenFilter.js wuerde hier mit einem
//    .split(',')-Aufruf auf einem Array crashen, deshalb eine eigene,
//    strukturell angepasste Variante.
//
// 2. KEIN Fallback auf den ungefilterten Pool bei 0 Treffern (anders als
//    ALLE Filter in zutatenFilter.js). Bei Zutaten ist der Fallback
//    unproblematisch (ein Wuerfel-Slot braucht immer irgendeine Zutat). Bei
//    Rezepten waere er irrefuehrend: ein striktes Vegan-Filter duerfte
//    niemals ein nicht-veganes Rezept anzeigen, nur weil kein passendes
//    existiert - stattdessen zeigt RezepteAnsicht.jsx bei leerem Ergebnis
//    einen Hinweistext.

// Hilfsfunktion: gibt aus einer beliebigen Liste ein zufaelliges Element
// zurueck (dieselbe Logik wie zufaelligesElement in App.jsx, hier separat
// gehalten, weil eine gemeinsame Abstraktion fuer 3 Zeilen nicht lohnt).
export function zufaelligesElement(liste) {
  const zufallsIndex = Math.floor(Math.random() * liste.length)
  return liste[zufallsIndex]
}

// Filtert eine Rezepte-Liste auf die, deren "diaeten"-Array ALLE aktuell
// ausgewaehlten Diaetformen enthaelt. Keine Auswahl (oder "keine" = Keine
// Einschraenkung, kein echter DB-Tag) = Filter inaktiv, komplette Liste
// bleibt bestehen.
function nachDiaetenGefiltertRezepte(liste, ausgewaehlteDiaeten) {
  const aktiveDiaeten = ausgewaehlteDiaeten.filter((d) => d !== 'keine')
  if (aktiveDiaeten.length === 0) {
    return liste
  }
  return liste.filter((r) => aktiveDiaeten.every((d) => (r.diaeten ?? []).includes(d)))
}

// Wendet Mahlzeit-, Diaet- und Eigenschaft(Suess/Deftig)-Filter nacheinander
// auf eine Rezepte-Liste an. Der Eigenschaft-Filter wird - wie beim
// bestehenden Suess/Deftig-Filter fuer Zutaten - NUR bei fruehstueck/snack
// angewendet. '' (Alles) deaktiviert ihn zusaetzlich, unabhaengig von der
// Mahlzeit.
export function gefiltertePoolFuerRezepte(liste, mahlzeitWert, diaetenWert, eigenschaftWert) {
  const nachMahlzeit = liste.filter((r) => r.mahlzeit === mahlzeitWert)
  const nachDiaet = nachDiaetenGefiltertRezepte(nachMahlzeit, diaetenWert)
  const eigenschaftRelevant = mahlzeitWert === 'fruehstueck' || mahlzeitWert === 'snack'
  if (!eigenschaftRelevant || !eigenschaftWert) {
    return nachDiaet
  }
  return nachDiaet.filter((r) => (r.eigenschaft ?? '') === eigenschaftWert)
}

// Wuerfelt fuer ALLE aktuell aktiven Mahlzeiten (Rezepte-Tagesplan) ein
// neues Rezept, unter Beibehaltung des jeweiligen Suess/Deftig-Filters
// (vorherigerStand) - Mahlzeiten OHNE bisherigen Eintrag (erstmaliges Laden,
// neu aktivierte Mahlzeit) starten mit '' (Alles). Reine Funktion, die einen
// kompletten neuen proMahlzeitState liefert. Urspruenglich privat in
// RezepteAnsicht.jsx, jetzt hier geteilt und von App.jsx aufgerufen (statt
// per Effekt in der bei Tab-Wechsel unmountenden RezepteAnsicht.jsx) - siehe
// App.jsx-Kommentar zur Bugfix-Begruendung ("Rezepte-Tab-Flackern").
export function alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenListe, rezepte, diaeten) {
  return (vorherigerStand) => {
    const neuerStand = {}
    for (const { slug } of aktiveMahlzeitenListe) {
      const eigenschaftFuerMahlzeit = vorherigerStand[slug]?.eigenschaft ?? ''
      const pool = gefiltertePoolFuerRezepte(rezepte, slug, diaeten, eigenschaftFuerMahlzeit)
      neuerStand[slug] = { eigenschaft: eigenschaftFuerMahlzeit, rezept: pool.length > 0 ? zufaelligesElement(pool) : null }
    }
    return neuerStand
  }
}
