// Rezepte-Filterfunktionen. Urspruenglich analog zum inzwischen entfernten
// Filtermodul des Zutaten-Wuerfels angelegt (dieser wurde mitsamt dem
// gesamten alten Wuerfel-Feature im Rezepte-Swipe-Pivot entfernt, siehe Plan
// floating-mixing-shannon.md, Schritt 6), aber bewusst mit zwei
// Unterschieden zu jenem Vorbild:
//
// 1. rezepte.diaeten ist ein echtes Postgres-Array (text[]), waehrend
//    zutaten.diaeten ein kommaseparierter String war. Ein simples
//    .split(',') auf einem Array haette gecrasht, deshalb eine eigene,
//    strukturell angepasste Variante (nachDiaetenGefiltertRezepte unten).
//
// 2. KEIN Fallback auf den ungefilterten Pool bei 0 Treffern (anders als
//    beim Zutaten-Wuerfel, wo ein leerer Pool problematisch waere - ein
//    Wuerfel-Slot brauchte immer irgendeine Zutat). Bei Rezepten waere ein
//    Fallback irrefuehrend: ein striktes Vegan-Filter duerfte niemals ein
//    nicht-veganes Rezept anzeigen, nur weil kein passendes existiert -
//    stattdessen zeigt RezepteSwipeAnsicht.jsx bei leerem Ergebnis einen
//    Hinweistext.

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

// Wuerfelt fuer ALLE aktuell aktiven Mahlzeiten ein neues Rezept, unter
// Beibehaltung des jeweiligen Suess/Deftig-Filters (vorherigerStand) -
// Mahlzeiten OHNE bisherigen Eintrag (erstmaliges Laden, neu aktivierte
// Mahlzeit) starten mit '' (Alles). Reine Funktion, die einen kompletten
// neuen proMahlzeitState liefert - lebt hier (statt lokal in
// RezepteSwipeAnsicht.jsx) und wird von App.jsx aufgerufen (statt per Effekt
// in der bei Tab-Wechsel unmountenden Rezepte-Ansicht) - siehe App.jsx-
// Kommentar zur Bugfix-Begruendung ("Rezepte-Tab-Flackern").
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
