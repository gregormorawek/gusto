// Zutaten-Filterfunktionen, die sowohl beim Wuerfeln (App.jsx) als auch bei
// der gezielten Suche nach 3 Rerolls (SlotKarte.jsx, ueber TagesplanAnsicht.jsx
// durchgereicht) denselben gefilterten Pool liefern muessen - deshalb hier in
// einer eigenen Datei statt privat in App.jsx, damit TagesplanAnsicht.jsx sie
// importieren kann, ohne einen zirkulaeren Import von App.jsx zu erzeugen.

// Filtert eine Zutaten-Liste auf die, deren kommaseparierte "mahlzeiten"-Spalte
// den gewuenschten Filter enthaelt. Ist das Ergebnis leer (z. B. weil die
// Kategorie noch keine passend getaggten Zutaten hat), wird auf die
// ungefilterte Liste zurueckgefallen, statt eine leere Auswahl zu liefern.
function nachMahlzeitGefiltert(liste, mahlzeit) {
  const passt = liste.filter((z) =>
    (z.mahlzeiten ?? '').split(',').map((m) => m.trim()).includes(mahlzeit)
  )
  return passt.length > 0 ? passt : liste
}

// Filtert eine Zutaten-Liste auf die, deren kommaseparierte "diaeten"-Spalte
// ALLE aktuell ausgewaehlten Diaetformen enthaelt. Keine Auswahl (oder die
// Auswahl "keine" = Keine Einschraenkung, die kein echter DB-Tag ist) = Filter
// inaktiv, komplette Liste bleibt bestehen. Ist das Ergebnis leer (z. B. weil
// die Kategorie noch keine passend getaggten Zutaten hat), wird auf die
// ungefilterte Liste zurueckgefallen, statt eine leere Auswahl zu liefern.
function nachDiaetenGefiltert(liste, ausgewaehlteDiaeten) {
  const aktiveDiaeten = ausgewaehlteDiaeten.filter((d) => d !== 'keine')
  if (aktiveDiaeten.length === 0) {
    return liste
  }

  const passt = liste.filter((z) => {
    const vorhandeneDiaeten = (z.diaeten ?? '').split(',').map((d) => d.trim())
    return aktiveDiaeten.every((d) => vorhandeneDiaeten.includes(d))
  })
  return passt.length > 0 ? passt : liste
}

// Filtert eine Zutaten-Liste nach der kommafreien "eigenschaft"-Spalte
// (suess/deftig/leer). '' (Alles, der Default) = Filter inaktiv, komplette
// Liste bleibt bestehen. Zutaten OHNE eigenschaft (z. B. Topfen, Mandeln,
// Hirse, Walnuesse, Butter) gelten laut Datenmodell als neutral und passen
// bei "Suess" UND "Deftig" gleichermassen mit rein. Ist das Ergebnis leer,
// wird - wie bei den anderen Filtern - auf die ungefilterte Liste
// zurueckgefallen.
function nachSuessDeftigGefiltert(liste, suessDeftig) {
  if (!suessDeftig) {
    return liste
  }

  const passt = liste.filter((z) => {
    const eigenschaft = (z.eigenschaft ?? '').trim()
    return eigenschaft === '' || eigenschaft === suessDeftig
  })
  return passt.length > 0 ? passt : liste
}

// Wendet Mahlzeit-, Diaet- und Suess/Deftig-Filter nacheinander auf eine
// Zutaten-Liste an. Der Suess/Deftig-Filter wird NUR bei fruehstueck/snack
// angewendet - bei mittag/abend ergibt die Unterscheidung keinen Sinn (siehe
// SuessDeftigFilter), deshalb wird suessDeftigWert dort ignoriert, selbst
// falls er von einem vorherigen fruehstueck/snack-Filter noch gesetzt ist.
export function gefiltertePoolFuer(liste, mahlzeitWert, diaetenWert, suessDeftigWert) {
  const nachMahlzeitUndDiaet = nachDiaetenGefiltert(nachMahlzeitGefiltert(liste, mahlzeitWert), diaetenWert)
  const suessDeftigRelevant = mahlzeitWert === 'fruehstueck' || mahlzeitWert === 'snack'
  return suessDeftigRelevant ? nachSuessDeftigGefiltert(nachMahlzeitUndDiaet, suessDeftigWert) : nachMahlzeitUndDiaet
}

// Waehlt den Rohpool fuer den 4. Slot (kann Obst ODER Gemuese sein) anhand
// des Suess/Deftig-Filters, wendet danach dieselben Mahlzeit-/Diaet-Filter
// (inkl. deren eigenem Leer-Pool-Fallback) an wie gefiltertePoolFuer. Bewusst
// OHNE nachSuessDeftigGefiltert (eigenschaft-Spalte) - die Kategorie-Auswahl
// selbst ist hier der Suess/Deftig-Mechanismus, kein zusaetzlicher
// eigenschaft-Filter innerhalb der Kategorie. Nur bei fruehstueck/snack MIT
// aktivem "Suess" wird obst gezogen - "Alles", "Deftig" und mittag/abend
// (der Filter existiert dort nicht) liefern wie vor Einfuehrung von obst
// ausschliesslich gemuese, KEINE Vereinigung.
//
// obstListe.length > 0 ist ein eigener Sicherheits-Fallback: Ist die
// obst-Kategorie (noch) komplett leer - z. B. weil in der DB noch keine
// obst-Zutaten angelegt sind -, wird trotzdem gemuese gezogen statt einer
// leeren Liste. Ohne diesen Fallback liefert zufaelligesElement(liste) bei
// leerer Liste undefined zurueck, und das naechste Rendern (gemuese.name,
// gemuese.kategorie, ...) stuerzt dann die GESAMTE Seite ab (kein
// Error-Boundary vorhanden), statt nur diesen einen Slot zu betreffen - der
// bestehende "bei leerem Pool auf die naechstbreitere Liste zurueckfallen"-
// Grundsatz (siehe nachMahlzeitGefiltert/nachDiaetenGefiltert) gilt also
// auch fuer die Obst/Gemuese-Kategoriewahl selbst.
export function vierterSlotOptionenFuer(gemueseListe, obstListe, mahlzeitWert, diaetenWert, suessDeftigWert) {
  const suessAktiv = (mahlzeitWert === 'fruehstueck' || mahlzeitWert === 'snack') && suessDeftigWert === 'suess'
  const rohPool = suessAktiv && obstListe.length > 0 ? obstListe : gemueseListe
  return nachDiaetenGefiltert(nachMahlzeitGefiltert(rohPool, mahlzeitWert), diaetenWert)
}

// Filtert einen (bereits nach Kategorie/Mahlzeit/Diaet/Suess-Deftig gefilterten)
// Zutaten-Pool anhand eines Freitext-Suchbegriffs auf den Namen - fuer das
// Reroll-Suchfeld nach 3 erfolglosen Wuerfel-Versuchen desselben Slots.
// Gemeinsam verwendet von SlotKarte.jsx (Einzel-Ansicht/Rezepte-Tab) UND dem
// Such-Overlay in TagesplanAnsicht.jsx, damit beide Stellen bei kuenftigen
// Anpassungen (z. B. Umlaut-Normalisierung) nicht auseinanderlaufen.
export function suchtextGefiltert(pool, suchtext) {
  const suchtextBereinigt = suchtext.trim().toLowerCase()
  if (!suchtextBereinigt) {
    return []
  }
  return pool.filter((z) => z.name.toLowerCase().includes(suchtextBereinigt))
}
