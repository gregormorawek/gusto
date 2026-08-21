// Laedt eine Liste von Bild-URLs im Hintergrund vor (reines new Image()-
// Preloading OHNE DOM-Einbindung, kein await im Render-Pfad) - damit sie
// bereits im Browser-Cache liegen, wenn RezeptBild (RezeptKarte.jsx) sie
// tatsaechlich braucht: img.complete ist dann sofort true, der Skeleton-
// Platzhalter/Fade-in wird uebersprungen. Siehe App.jsx fuer den
// Aufrufzeitpunkt (Bugfix "Rezeptbilder vorladen").
//
// Bewusst NICHT alle Bilder gleichzeitig angestossen (wuerde bei ~30
// Rezepten die Verbindung verstopfen und andere Requests - z. B. das
// naechste tatsaechlich angeforderte Bild - verzoegern): stattdessen ein
// simpler Worker-Pool mit `parallelitaet` gleichzeitig laufenden Ladevorgaengen
// - sobald einer fertig ist (Erfolg ODER Fehler), zieht er sich selbst das
// naechste Element aus der Warteschlange. Das "troepfelt" die restlichen
// Bilder nach und nach durch, ohne die Bandbreite zu monopolisieren.
//
// Einzelne fehlschlagende Bilder (onerror) werden einfach uebersprungen -
// brechen NICHT die Kette ab, da der naechste Ladevorgang unabhaengig vom
// Erfolg des vorherigen angestossen wird.
export function bilderImHintergrundVorladen(urls, parallelitaet = 2) {
  // Duplikate/leere Werte raus, bevor die Warteschlange befuellt wird -
  // erspart unnoetige Doppel-Requests, falls z. B. dieselbe URL bereits als
  // "zuerst gebrauchtes" Bild priorisiert UND Teil der Gesamtliste ist.
  const warteschlange = [...new Set(urls.filter(Boolean))]

  function naechstesLaden() {
    const url = warteschlange.shift()
    if (!url) {
      return
    }
    const bild = new Image()
    bild.onload = naechstesLaden
    bild.onerror = naechstesLaden
    bild.src = url
  }

  const startAnzahl = Math.min(parallelitaet, warteschlange.length)
  for (let i = 0; i < startAnzahl; i++) {
    naechstesLaden()
  }
}
