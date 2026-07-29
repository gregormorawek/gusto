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
function SlotKarte({ titel, text, portion, onWuerfeln, zielWert, onZielAendern, zielErreichbar }) {
  return (
    <div className="rounded-lg border border-text-muted/20 bg-card p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{titel}</h3>
      <p className="text-lg font-semibold text-text">{text}</p>
      <p className="text-xs text-text-muted">{portion} g</p>

      {onZielAendern && (
        <label className="mt-2 flex items-center gap-1 text-xs text-text-muted">
          {titel}-Ziel:
          <input
            type="number"
            min="0"
            value={zielWert}
            onChange={(e) => onZielAendern(e.target.value)}
            placeholder="–"
            className="w-14 rounded-md border border-text-muted/30 px-1 py-0.5 text-xs text-text"
          />
          g
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
    </div>
  )
}

export default SlotKarte
