import { rezeptKarteDaten } from './rezeptKarteDaten'

// Reine Datenlogik fuer die Einkaufsliste (kein React), analog zu
// portionenRechner.js. Datenmodell pro Posten:
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

// Fuegt neue Eintraege (z. B. aus einem Rezept oder der kompletten
// Tages-Auswahl, siehe zutatenAusRezeptKarte/zutatenAusTagesauswahl unten)
// einer bestehenden Liste hinzu. Bereits vorhandene Zutaten (gleicher Schluessel)
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

// Baut aus einer bereits gelesenen Rezept-"karte" (siehe rezeptKarteDaten.js:
// karte.zutaten, echte Mengen aus rezept_zutaten) die Zutaten-Eintraege fuer
// die Einkaufsliste - beliebig viele statt der vier alten Slots. Nur die vom
// Posten-Modell benoetigten Felder werden uebernommen (anzeigeMenge/
// anzeigeEinheit/anmerkung/optional sind fuer die Einkaufsliste ohne
// Bedeutung, siehe Plan Schritt 5: der Einheiten-Mix ist noch kein Thema).
export function zutatenAusRezeptKarte(karte) {
  return karte.zutaten.map((zutat) => ({
    zutatId: zutat.zutatId,
    name: zutat.name,
    kategorie: zutat.kategorie,
    supermarktKategorie: zutat.supermarktKategorie,
    mengeG: zutat.mengeG,
  }))
}

// Baut aus der tagesaktuellen Rezept-Auswahl (Rezepte-Swipe-Pivot, siehe
// Plan floating-mixing-shannon.md: tagesauswahl.{mahlzeiten,hinzugefuegt} in
// App.jsx) die Zutaten-Eintraege fuer den "Zur Einkaufsliste"-Button in
// TagAnsicht.jsx - PRO MAHLZEIT, nicht pro Tag: eine Mahlzeit gilt als
// "offen", solange hinzugefuegt[typ] nicht mit der aktuell gesetzten
// rezeptId uebereinstimmt (siehe tagesauswahlLaden in App.jsx - deckt sowohl
// "noch nie hinzugefuegt" als auch "Rezept seither ausgetauscht" ab, ohne
// eigene Invalidierung). Standardmaessig (erzwingen=false) werden nur die
// offenen Mahlzeiten verarbeitet; erzwingen=true (nach expliziter
// Rueckfrage, siehe TagAnsicht.jsx) nimmt wieder ALLE gesetzten Mahlzeiten.
//
// Liest fuer jede zu verarbeitende rezeptId per rezeptKarteDaten die karte
// und ruft darauf DIESELBE Feld-Extraktion wie zutatenAusRezeptKarte auf,
// statt sie zu duplizieren. Mahlzeiten ohne gesetztes Rezept ODER mit einer
// inzwischen nicht mehr auffindbaren rezeptId liefern (ueber rezeptKarteDaten,
// das dann null zurueckgibt) einfach keine Eintraege statt abzustuerzen.
//
// Rueckgabe { zutaten, hinzugefuegt }: zutaten fuer zutatenHinzufuegen()
// oben, hinzugefuegt der Ausschnitt der Map, den der Aufrufer (App.jsx) in
// tagesauswahl.hinzugefuegt einmischen soll - NUR die tatsaechlich
// verarbeiteten Mahlzeiten, damit bereits laenger offene, hier aber nicht
// betroffene Mahlzeiten unangetastet bleiben.
export function zutatenUndStatusAusTagesauswahl(tagesauswahl, rezepte, erzwingen = false) {
  const gesetzteMahlzeiten = Object.entries(tagesauswahl.mahlzeiten).filter(([, rezeptId]) => rezeptId != null)
  const zuVerarbeiten = erzwingen
    ? gesetzteMahlzeiten
    : gesetzteMahlzeiten.filter(([mahlzeitTyp, rezeptId]) => tagesauswahl.hinzugefuegt[mahlzeitTyp] !== rezeptId)

  const zutaten = zuVerarbeiten.flatMap(([, rezeptId]) => {
    const rezept = rezepte.find((r) => r.id === rezeptId) ?? null
    const karte = rezeptKarteDaten(rezept)
    return karte ? zutatenAusRezeptKarte(karte) : []
  })

  const hinzugefuegt = Object.fromEntries(zuVerarbeiten)

  return { zutaten, hinzugefuegt }
}
