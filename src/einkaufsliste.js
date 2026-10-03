import { rezeptKarteDaten } from './rezeptKarteDaten.js'

// Reine Datenlogik fuer die Einkaufsliste (kein React), analog zu
// portionenRechner.js. Datenmodell pro Posten:
// { zutatId, name, kategorie, supermarktKategorie, mengeG, abgehakt,
//   rohFaktor, einkaufseinheit, einheitengewichtG }.
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
//
// rohFaktor/einkaufseinheit/einheitengewichtG (Umbau 30.09.2026, siehe
// CLAUDE.md Abschnitt 12): kommen ebenfalls 1:1 aus der Zutat (Supabase-
// Spalten roh_faktor/einkaufseinheit/einheitengewicht_g) und wirken NUR auf
// die Anzeige (einkaufsMengeFormatieren unten) - mengeG bleibt der reine
// Gramm-Wert und einzige Grundlage der Summierung in zutatenHinzufuegen,
// exakt wie zuvor. Alte Listeneintraege ohne diese Felder fallen in
// einkaufslisteLaden() auf 'g' (keine Umrechnung) zurueck.

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
    return geparst.map((posten) => ({ supermarktKategorie: 'sonstiges', einkaufseinheit: 'g', ...posten }))
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
// Posten-Modell benoetigten Felder werden uebernommen - anzeigeMenge/
// anzeigeEinheit/anmerkung/optional sind PRO REZEPT-ZEILE (Kochmodus-
// Anzeige, z. B. "1 EL") und bleiben fuer die Einkaufsliste ohne Bedeutung;
// rohFaktor/einkaufseinheit/einheitengewichtG sind dagegen PRO ZUTAT
// (Einkaufslisten-Umbau, siehe Dateikopf) und werden uebernommen.
export function zutatenAusRezeptKarte(karte) {
  return karte.zutaten.map((zutat) => ({
    zutatId: zutat.zutatId,
    name: zutat.name,
    kategorie: zutat.kategorie,
    supermarktKategorie: zutat.supermarktKategorie,
    mengeG: zutat.mengeG,
    rohFaktor: zutat.rohFaktor,
    einkaufseinheit: zutat.einkaufseinheit ?? 'g',
    einheitengewichtG: zutat.einheitengewichtG,
  }))
}

// Formatiert die Menge EINES (bereits ueber mehrere Rezepte summierten)
// Postens fuer die Anzeige - reine Funktion, kein Runden/Umrechnen an
// anderer Stelle (siehe Kommentar oben: mengeG bleibt beim Summieren immer
// reines Gramm).
//
// 'g'/'ml': Getreide/Huelsenfruechte mit rohFaktor stehen in mengeG im
// GEKOCHTEN Gewicht (siehe Abschnitt 9 in CLAUDE.md) - fuers Einkaufen erst
// durch den Faktor teilen, um das Rohgewicht zu zeigen. 'ml' aendert nur
// das Einheiten-Wort (Dichte ~1, siehe CLAUDE.md), nicht die Zahl.
//
// 'stueck'/'zehe': Aufrunden mit 15 % Toleranz statt reinem Math.ceil, sonst
// wird aus rundungsbedingten 1,07 Stueck (z. B. eine minimal groessere
// Paprika als das hinterlegte Einheitengewicht) faelschlich "2 Stück" -
// siehe CLAUDE.md Abschnitt 12/9 fuer die Herleitung der Einheitengewichte
// (mindestens so gross wie die groesste "1 Stück"-Verwendung in den
// Rezepten, gegen alle Rezepte validiert). Mindestens 1, sonst wuerden aus
// kleinen Mengen (z. B. 0,4 Paprika) null.
const STUECK_TOLERANZ = 0.15

export function einkaufsMengeFormatieren(posten) {
  const einheit = posten.einkaufseinheit ?? 'g'

  if (einheit === 'stueck' || einheit === 'zehe') {
    const anzahl = Math.max(1, Math.ceil(posten.mengeG / posten.einheitengewichtG - STUECK_TOLERANZ))
    const wort = einheit === 'stueck' ? 'Stück' : anzahl === 1 ? 'Zehe' : 'Zehen'
    return `${anzahl} ${wort}`
  }

  // Umgerechnetes Rohgewicht nur in der ANZEIGE auf 5 g runden ("89 g" ist auf
  // einer Einkaufsliste sinnlos genau) - mengeG selbst bleibt beim Summieren
  // exaktes Gramm. Mindestens 5 g, sonst wuerde aus Kleinstmengen "0 g".
  if (posten.rohFaktor) {
    return `${Math.max(5, Math.round(posten.mengeG / posten.rohFaktor / 5) * 5)} ${einheit}`
  }
  return `${Math.round(posten.mengeG)} ${einheit}`
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
