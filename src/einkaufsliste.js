// Reine Datenlogik fuer die Einkaufsliste (kein React), analog zu
// portionenRechner.js/zutatenFilter.js. Datenmodell pro Posten:
// { zutatId, name, kategorie, supermarktKategorie, mengeG, abgehakt }.
//
// kategorie wird 1:1 aus der jeweiligen Zutat uebernommen (Supabase-Wert,
// z. B. 'protein'/'carbs'/'fett'/'gemuese'/'obst') - bewusst NICHT hier beim
// Speichern auf eigene Anzeige-Gruppen gemappt und bleibt unangetastet.
// supermarktKategorie kommt ebenfalls 1:1 aus der Zutat (Supabase-Spalte
// supermarkt_kategorie: 'fleisch_fisch'/'milch_eier'/'getreide'/
// 'obst_gemuese'/'sonstiges') und ist die Grundlage der Anzeige-Gruppierung
// in EinkaufslisteAnsicht.jsx. Fuer Listeneintraege, die vor Einfuehrung
// dieser Spalte im localStorage gespeichert wurden, faengt
// einkaufslisteLaden() unten das Fehlen mit 'sonstiges' ab.

export const EINKAUFSLISTE_LOCALSTORAGE_KEY = 'gusto-einkaufsliste'

// Eindeutiger Schluessel eines Postens: die Zutat-id aus Supabase, falls
// vorhanden - sonst (Sonderfall ohne bekannte id) ein auf dem Namen
// basierender Ersatz-Schluessel, damit auch solche Zutaten dedupliziert und
// abgehakt werden koennen. Praefixe (id:/name:) verhindern eine zufaellige
// Kollision zwischen einer numerischen id und einem gleichlautenden Namen.
export function postenSchluessel(posten) {
  return posten.zutatId != null ? `id:${posten.zutatId}` : `name:${posten.name}`
}

// Laedt die gespeicherte Einkaufsliste aus dem localStorage. Ist noch nichts
// gespeichert, der Inhalt beschaedigt oder kein Array, wird eine leere Liste
// zurueckgegeben (= leerer Zustand, siehe EinkaufslisteAnsicht.jsx).
//
// Posten aus der Zeit vor Einfuehrung von supermarktKategorie haben dieses
// Feld noch nicht gespeichert - hier auf 'sonstiges' normalisieren, damit
// die Gruppierung in EinkaufslisteAnsicht.jsx nicht mit einem fehlenden Wert
// umgehen muss.
export function einkaufslisteLaden() {
  try {
    const gespeichert = localStorage.getItem(EINKAUFSLISTE_LOCALSTORAGE_KEY)
    const geparst = gespeichert ? JSON.parse(gespeichert) : []
    if (!Array.isArray(geparst)) {
      return []
    }
    return geparst.map((posten) => ({ supermarktKategorie: 'sonstiges', ...posten }))
  } catch {
    return []
  }
}

// Fuegt neue Eintraege (z. B. aus einem Rezept oder einem kompletten
// Tagesplan, siehe zutatenAusRezeptKarte/zutatenAusTagesplan unten) einer
// bestehenden Liste hinzu. Bereits vorhandene Zutaten (gleicher Schluessel)
// werden gemergt: Menge addiert, abgehakt auf false zurueckgesetzt (die
// Zutat muss ja erneut eingekauft werden, siehe Aufgabenstellung) - neue
// Zutaten werden ans Ende angehaengt. Reine Funktion (gibt eine NEUE Liste
// zurueck statt zu mutieren), passend zu Reacts setState-Updater-Form.
export function zutatenHinzufuegen(liste, neueEintraege) {
  let ergebnis = liste
  for (const eintrag of neueEintraege) {
    const schluessel = postenSchluessel(eintrag)
    const bestehenderIndex = ergebnis.findIndex((posten) => postenSchluessel(posten) === schluessel)
    if (bestehenderIndex === -1) {
      ergebnis = [...ergebnis, { ...eintrag, abgehakt: false }]
    } else {
      ergebnis = ergebnis.map((posten, index) =>
        index === bestehenderIndex ? { ...posten, mengeG: posten.mengeG + eintrag.mengeG, abgehakt: false } : posten
      )
    }
  }
  return ergebnis
}

// Kehrt den Abhak-Status EINES Postens um (Checkbox-Klick).
export function postenAbhaken(liste, schluessel) {
  return liste.map((posten) => (postenSchluessel(posten) === schluessel ? { ...posten, abgehakt: !posten.abgehakt } : posten))
}

// Entfernt nur die abgehakten Posten, laesst den Rest unangetastet.
export function abgehakteEntfernen(liste) {
  return liste.filter((posten) => !posten.abgehakt)
}

// Baut aus einer bereits berechneten Rezept-"karte" (siehe
// rezeptKarteBerechnen.js: proteinZutat/carbsZutat/fettZutat/gemueseZutat +
// die tatsaechlich berechneten Portionen) die 4 Zutaten-Eintraege fuer die
// Einkaufsliste - fuer den "Zur Einkaufsliste"-Button in RezeptKarte.jsx.
export function zutatenAusRezeptKarte(karte) {
  return [
    {
      zutatId: karte.proteinZutat.id,
      name: karte.proteinZutat.name,
      kategorie: karte.proteinZutat.kategorie,
      supermarktKategorie: karte.proteinZutat.supermarkt_kategorie,
      mengeG: karte.portionen.proteinPortion,
    },
    {
      zutatId: karte.carbsZutat.id,
      name: karte.carbsZutat.name,
      kategorie: karte.carbsZutat.kategorie,
      supermarktKategorie: karte.carbsZutat.supermarkt_kategorie,
      mengeG: karte.portionen.carbsPortion,
    },
    {
      zutatId: karte.fettZutat.id,
      name: karte.fettZutat.name,
      kategorie: karte.fettZutat.kategorie,
      supermarktKategorie: karte.fettZutat.supermarkt_kategorie,
      mengeG: karte.portionen.fettPortion,
    },
    {
      zutatId: karte.gemueseZutat.id,
      name: karte.gemueseZutat.name,
      kategorie: karte.gemueseZutat.kategorie,
      supermarktKategorie: karte.gemueseZutat.supermarkt_kategorie,
      mengeG: karte.portionen.gemuesePortion,
    },
  ]
}

// Baut aus einem kompletten Tagesplan (Array von Mahlzeit-Eintraegen, siehe
// App.jsx/tagesplanEintragBauen: protein/carbs/fett/gemuese als Zutat-Objekt
// + proteinPortion/carbsPortion/fettPortion/gemuesePortion als eigene
// Top-Level-Felder) die Zutaten-Eintraege ALLER Mahlzeiten auf einmal - fuer
// den "Tagesplan zur Einkaufsliste hinzufuegen"-Button in TagesplanAnsicht.jsx.
export function zutatenAusTagesplan(tagesplan) {
  return tagesplan.flatMap((eintrag) => [
    {
      zutatId: eintrag.protein.id,
      name: eintrag.protein.name,
      kategorie: eintrag.protein.kategorie,
      supermarktKategorie: eintrag.protein.supermarkt_kategorie,
      mengeG: eintrag.proteinPortion,
    },
    {
      zutatId: eintrag.carbs.id,
      name: eintrag.carbs.name,
      kategorie: eintrag.carbs.kategorie,
      supermarktKategorie: eintrag.carbs.supermarkt_kategorie,
      mengeG: eintrag.carbsPortion,
    },
    {
      zutatId: eintrag.fett.id,
      name: eintrag.fett.name,
      kategorie: eintrag.fett.kategorie,
      supermarktKategorie: eintrag.fett.supermarkt_kategorie,
      mengeG: eintrag.fettPortion,
    },
    {
      zutatId: eintrag.gemuese.id,
      name: eintrag.gemuese.name,
      kategorie: eintrag.gemuese.kategorie,
      supermarktKategorie: eintrag.gemuese.supermarkt_kategorie,
      mengeG: eintrag.gemuesePortion,
    },
  ])
}
