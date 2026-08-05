import { useState } from 'react'

// SlotKarte ist eine wiederverwendbare Komponente fuer einen einzelnen "Slot".
// Sie bekommt ihre Inhalte ueber Props (titel und text) und zeigt sie in einer Karte an.
// onWuerfeln ist eine Funktion, die von App.jsx uebergeben wird. SlotKarte kennt
// den Inhalt dieser Funktion nicht, ruft sie aber beim Klick auf den Button auf.
// zielWert/zielErreichbar sind optional (nur fuer Protein/Carbs/Fett gesetzt,
// nicht fuer Gemuese). onZielAendern zusaetzlich nur gesetzt, wenn das
// Makro-Ziel HIER editierbar sein soll (Einzel-Ansicht) - der Tagesplan
// uebergibt zielWert/zielErreichbar ohne onZielAendern und zeigt dadurch nur
// den Hinweis, aber kein Eingabefeld (dort wird das Ziel zentral bei den
// Ziel-Einstellungen als Tages-Gesamtziel gesetzt).
//
// sucheAnzeigen/suchPool/onZutatWaehlen gehoeren zusammen und sind optional:
// Nach 3 Rerolls desselben Slots setzt der Aufrufer sucheAnzeigen auf true und
// SlotKarte zeigt ein Live-Suchfeld, ueber das gezielt eine Zutat aus suchPool
// (der bereits nach Kategorie/Mahlzeit/Diaet/Suess-Deftig gefilterte Pool,
// exakt derselbe wie beim Wuerfeln) ausgewaehlt werden kann. Die Namens-
// Filterung selbst passiert lokal hier in der Komponente.
function SlotKarte({
  titel,
  text,
  portion,
  onWuerfeln,
  zielWert,
  onZielAendern,
  zielErreichbar,
  sucheAnzeigen,
  suchPool,
  onZutatWaehlen,
}) {
  const [suchtext, setSuchtext] = useState('')

  const suchtextBereinigt = suchtext.trim().toLowerCase()
  const treffer = suchtextBereinigt
    ? (suchPool ?? []).filter((z) => z.name.toLowerCase().includes(suchtextBereinigt))
    : []

  function zutatWaehlen(zutat) {
    setSuchtext('')
    onZutatWaehlen(zutat)
  }

  return (
    <div className="rounded-lg border border-text-muted/20 bg-card p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{titel}</h3>
      <p className="text-lg font-semibold text-text">{text}</p>
      <p className="text-xs text-text-muted">{portion} g</p>

      {onZielAendern && (
        <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span className="whitespace-nowrap">{titel}-Ziel:</span>
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={zielWert}
              onChange={(e) => onZielAendern(e.target.value)}
              placeholder="–"
              className="w-16 rounded-md border border-text-muted/30 px-2 py-1 text-xs text-text"
            />
            g
          </span>
        </label>
      )}

      {zielWert && !zielErreichbar && (
        <p className="mt-0.5 text-xs text-primary/70">Ziel nicht ganz erreichbar</p>
      )}

      <button
        type="button"
        onClick={onWuerfeln}
        className="mt-2 text-sm text-primary hover:underline"
      >
        ↻ neu würfeln
      </button>

      {sucheAnzeigen && (
        <div className="mt-2">
          <input
            type="text"
            value={suchtext}
            onChange={(e) => setSuchtext(e.target.value)}
            placeholder={`${titel} suchen…`}
            className="w-full rounded-md border border-text-muted/30 px-2 py-1 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {suchtextBereinigt && (
            treffer.length > 0 ? (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-text-muted/20 bg-card">
                {treffer.map((z) => (
                  <li key={z.name}>
                    <button
                      type="button"
                      onClick={() => zutatWaehlen(z)}
                      className="block w-full px-2 py-1 text-left text-sm text-text hover:bg-primary/10"
                    >
                      {z.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-text-muted">Keine passende Zutat gefunden</p>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default SlotKarte
