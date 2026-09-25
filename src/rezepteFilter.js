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

// Prueft, ob ein Rezept eine einzelne gewuenschte Diaetform erfuellt. Vegan
// ist eine Teilmenge von Vegetarisch (jedes vegane Rezept ist automatisch
// auch vegetarisch essbar), aber die Rezepte tragen in der DB bewusst nur
// den praezisesten Tag (nie beide gleichzeitig, siehe rezepte-neu-paket-1.sql)
// - deshalb hier explizit statt ueber reines .includes(). Umgekehrt gilt das
// nicht: wer Vegan filtert, soll keine nur-vegetarischen Rezepte sehen.
function erfuelltDiaet(rezeptDiaeten, gewuenschteDiaet) {
  if (gewuenschteDiaet === 'vegetarisch') {
    return rezeptDiaeten.includes('vegetarisch') || rezeptDiaeten.includes('vegan')
  }
  return rezeptDiaeten.includes(gewuenschteDiaet)
}

// Filtert eine Rezepte-Liste auf die, deren "diaeten"-Array ALLE aktuell
// ausgewaehlten Diaetformen erfuellt (siehe erfuelltDiaet). Keine Auswahl
// (oder "keine" = Keine Einschraenkung, kein echter DB-Tag) = Filter
// inaktiv, komplette Liste bleibt bestehen.
function nachDiaetenGefiltertRezepte(liste, ausgewaehlteDiaeten) {
  const aktiveDiaeten = ausgewaehlteDiaeten.filter((d) => d !== 'keine')
  if (aktiveDiaeten.length === 0) {
    return liste
  }
  return liste.filter((r) => aktiveDiaeten.every((d) => erfuelltDiaet(r.diaeten ?? [], d)))
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

// ============================================================
// Wiederholungsschutz-Stapel ("Shuffle-Bag") fuers Wischen
// ============================================================
//
// Statt bei jedem Zug rein zufaellig aus dem gefilterten Pool zu ziehen
// (zufaelligesElement, siehe Git-Historie), merkt sich die App pro Mahlzeit
// UND Filterkombination eine einmal gemischte Reihenfolge aller passenden
// Rezept-IDs plus einen Zeiger auf die naechste noch ungezogene Position -
// wie der Zufallsmodus in Musik-Apps. Persistiert in App.jsx unter dem
// localStorage-Key 'gusto-swipe-stapel', State-Form:
//
//   { [mahlzeitSlug]: { [filterSchluessel]: { reihenfolge: [id, ...], position: n } } }
//
// reihenfolge[0..position) = in der laufenden Runde bereits gezogen,
// reihenfolge[position..] = noch ungezogen. Ist eine Mahlzeit oder
// Filterkombination noch nie gezogen worden, existiert schlicht kein
// Eintrag - rezeptAusStapelZiehen legt ihn bei Bedarf selbst an.

// filterSchluessel enthaelt bewusst NICHT die Mahlzeit (die steckt bereits
// im aeusseren mahlzeitSlug-Key) - nur die Diaet-Auswahl (normalisiert:
// 'keine' rausgefiltert wie in nachDiaetenGefiltertRezepte, sortiert, damit
// Auswahlreihenfolge keine Rolle spielt) und die Suess/Deftig-Eigenschaft.
export function filterSchluesselFuer(diaeten, eigenschaft) {
  const aktiveDiaeten = [...diaeten].filter((d) => d !== 'keine').sort()
  return `${aktiveDiaeten.join(',')}|${eigenschaft || ''}`
}

// Fisher-Yates, liefert eine neu gemischte Kopie (mutiert das Original nicht).
function gemischt(liste) {
  const kopie = [...liste]
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[kopie[i], kopie[j]] = [kopie[j], kopie[i]]
  }
  return kopie
}

// Mischt eine neue Runde aus allen Pool-IDs. Erzwingt dabei, dass die erste
// Karte der neuen Runde nicht die letzte der vorigen Runde ist (sonst
// koennte bei zufaelliger Fuegung zweimal hintereinander dasselbe Rezept
// erscheinen, genau der Fall, den der Stapel eigentlich verhindern soll) -
// bei genau einem Rezept im Pool laesst sich das nicht erfuellen, dann
// bleibt es beim einzigen moeglichen Ergebnis.
function neuGemischt(poolIds, letzteGezogeneId) {
  const neu = gemischt(poolIds)
  if (neu.length > 1 && letzteGezogeneId != null && neu[0] === letzteGezogeneId) {
    const tauschIndex = 1 + Math.floor(Math.random() * (neu.length - 1))
    ;[neu[0], neu[tauschIndex]] = [neu[tauschIndex], neu[0]]
  }
  return neu
}

// Gleicht einen gespeicherten Stapel-Eintrag mit dem AKTUELLEN Pool ab -
// bei jedem Zug, nicht nur bei Bedarf, damit neu hinzugekommene Rezepte
// (z. B. ein frisch eingespieltes Rezepte-Paket) sofort im Stapel
// auftauchen, ohne die laufende Runde zu zerstoeren. Bewusst KEIN
// Verwerfen-und-neu-Mischen bei Aenderungen: in den naechsten Tagen kommen
// mehrere Rezept-Pakete kurz hintereinander dazu, ein harter Reset wuerde
// bei jedem Paket alle laufenden Stapel zuruecksetzen und bereits gesehene
// Rezepte der aktuellen Runde erneut zeigen.
//
// - Nicht mehr im Pool enthaltene IDs fallen sowohl aus dem gesehenen als
//   auch dem ungesehenen Teil raus (der gesehene Teil wird dabei einfach
//   kuerzer, keine Neuberechnung noetig).
// - Neue IDs werden an einer ZUFAELLIGEN Position innerhalb des noch
//   ungesehenen Teils eingefuegt - sie zaehlen also nicht automatisch als
//   gesehen, koennen aber auch als naechstes dran sein.
function stapelMitPoolAbgeglichen(eintrag, poolIds) {
  const poolIdSet = new Set(poolIds)
  const alteGesehen = eintrag.reihenfolge.slice(0, eintrag.position).filter((id) => poolIdSet.has(id))
  const alteUngesehen = eintrag.reihenfolge.slice(eintrag.position).filter((id) => poolIdSet.has(id))

  const bekannteIds = new Set([...alteGesehen, ...alteUngesehen])
  const neueIds = poolIds.filter((id) => !bekannteIds.has(id))

  const ungesehenMitNeuen = [...alteUngesehen]
  for (const id of neueIds) {
    const einfuegePosition = Math.floor(Math.random() * (ungesehenMitNeuen.length + 1))
    ungesehenMitNeuen.splice(einfuegePosition, 0, id)
  }

  return { reihenfolge: [...alteGesehen, ...ungesehenMitNeuen], position: alteGesehen.length }
}

// Setzt einen einzelnen Mahlzeit+Filter-Eintrag im Gesamt-Stapel, ohne die
// uebrigen Eintraege (andere Mahlzeiten, andere Filterkombinationen
// DERSELBEN Mahlzeit) anzufassen - deshalb "eigener Stapel pro Mahlzeit UND
// Filterkombination", ein Mahlzeitwechsel macht automatisch dort weiter, wo
// man war, weil der Eintrag der anderen Mahlzeit unberuehrt bleibt.
function stapelMitEintragErsetzt(gesamtStapel, mahlzeitSlug, filterSchluessel, eintrag) {
  return {
    ...gesamtStapel,
    [mahlzeitSlug]: {
      ...gesamtStapel[mahlzeitSlug],
      [filterSchluessel]: eintrag,
    },
  }
}

// Zieht das naechste Rezept aus dem Wiederholungsschutz-Stapel fuer eine
// Mahlzeit+Filterkombination. Legt bei erstem Zugriff einen neuen Stapel an,
// gleicht bei JEDEM Zugriff mit dem aktuellen Pool ab (siehe
// stapelMitPoolAbgeglichen) und mischt automatisch neu, sobald alle Rezepte
// der laufenden Runde gezogen wurden. "Uebernommene Rezepte zaehlen als
// gesehen" ergibt sich von selbst: das angezeigte Rezept wird bereits HIER
// beim Ziehen als gesehen markiert (position ruecke vor), nicht erst beim
// tatsaechlichen Uebernehmen - Uebernehmen zeigt in RezepteSwipeAnsicht.jsx
// ohnehin nur das schon gezogene Rezept an, ohne selbst erneut zu ziehen.
//
// passtZuBudget ist ein Erweiterungspunkt fuer einen KUENFTIGEN
// budget-gewichteten Filter (noch nicht gebaut): Rezepte, die ihn nicht
// erfuellen, werden uebersprungen OHNE als gesehen zu gelten - sie bleiben
// unveraendert im ungesehenen Teil des Stapels fuer einen spaeteren Zug,
// wenn das Restbudget wieder passt. Absichtlich KEIN eigener Stapel pro
// Budget-Zustand (der wuerde sich bei jedem uebernommenen Rezept aendern,
// weil das Restbudget sinkt) - der Stapel selbst kennt nur die stabilen
// Filter (Mahlzeit, Diaet, Suess/Deftig), das Budget filtert nur beim
// Ziehen. Ohne uebergebene Funktion lassen alle Rezepte den Haken passieren.
export function rezeptAusStapelZiehen(gesamtStapel, mahlzeitSlug, filterSchluessel, pool, passtZuBudget = () => true) {
  const poolIds = pool.map((r) => r.id)
  if (poolIds.length === 0) {
    return { rezept: null, stapel: gesamtStapel }
  }
  const rezeptNachId = new Map(pool.map((r) => [r.id, r]))

  const bisherigerEintrag = gesamtStapel[mahlzeitSlug]?.[filterSchluessel]
  let { reihenfolge, position } = bisherigerEintrag
    ? stapelMitPoolAbgeglichen(bisherigerEintrag, poolIds)
    : { reihenfolge: [], position: 0 }

  if (position >= reihenfolge.length) {
    const letzteGezogeneId = reihenfolge[position - 1] ?? null
    reihenfolge = neuGemischt(poolIds, letzteGezogeneId)
    position = 0
  }

  // Erstes Rezept ab position suchen, das passtZuBudget erfuellt - per
  // Tausch an die aktuelle Position geschoben (Fisher-Yates-"Ziehen ohne
  // Zuruecklegen"-Trick), damit uebersprungene Rezepte ihre relative
  // Reihenfolge im ungesehenen Teil behalten statt verworfen zu werden.
  let treffer = -1
  for (let i = position; i < reihenfolge.length; i++) {
    if (passtZuBudget(rezeptNachId.get(reihenfolge[i]))) {
      treffer = i
      break
    }
  }

  if (treffer === -1) {
    return { rezept: null, stapel: stapelMitEintragErsetzt(gesamtStapel, mahlzeitSlug, filterSchluessel, { reihenfolge, position }) }
  }

  ;[reihenfolge[position], reihenfolge[treffer]] = [reihenfolge[treffer], reihenfolge[position]]
  const gezogeneId = reihenfolge[position]

  return {
    rezept: rezeptNachId.get(gezogeneId),
    stapel: stapelMitEintragErsetzt(gesamtStapel, mahlzeitSlug, filterSchluessel, { reihenfolge, position: position + 1 }),
  }
}

// Zieht fuer ALLE aktuell aktiven Mahlzeiten ein Rezept aus dem jeweiligen
// Stapel, unter Beibehaltung des jeweiligen Suess/Deftig-Filters
// (vorherigerStand) - Mahlzeiten OHNE bisherigen Eintrag (erstmaliges Laden,
// neu aktivierte Mahlzeit) starten mit '' (Alles). Reine Funktion, die den
// kompletten neuen proMahlzeitState UND den aktualisierten Gesamt-Stapel
// liefert (beide muessen vom Caller per setState gesetzt werden) - lebt
// hier (statt lokal in RezepteSwipeAnsicht.jsx) und wird von App.jsx
// aufgerufen (statt per Effekt in der bei Tab-Wechsel unmountenden
// Rezepte-Ansicht) - siehe App.jsx-Kommentar zur Bugfix-Begruendung
// ("Rezepte-Tab-Flackern").
export function alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenListe, rezepte, diaeten, vorherigerStand, stapel) {
  let laufenderStapel = stapel
  const neuerStand = {}
  for (const { slug } of aktiveMahlzeitenListe) {
    const eigenschaftFuerMahlzeit = vorherigerStand[slug]?.eigenschaft ?? ''
    const pool = gefiltertePoolFuerRezepte(rezepte, slug, diaeten, eigenschaftFuerMahlzeit)
    const filterSchluessel = filterSchluesselFuer(diaeten, eigenschaftFuerMahlzeit)
    const { rezept, stapel: naechsterStapel } = rezeptAusStapelZiehen(laufenderStapel, slug, filterSchluessel, pool)
    laufenderStapel = naechsterStapel
    neuerStand[slug] = { eigenschaft: eigenschaftFuerMahlzeit, rezept }
  }
  return { rezepteProMahlzeitState: neuerStand, stapel: laufenderStapel }
}
