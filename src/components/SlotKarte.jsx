// SlotKarte ist eine wiederverwendbare Komponente fuer einen einzelnen "Slot".
// Sie bekommt ihre Inhalte ueber Props (titel und text) und zeigt sie in einer Karte an.
// onWuerfeln ist eine Funktion, die von App.jsx uebergeben wird. SlotKarte kennt
// den Inhalt dieser Funktion nicht, ruft sie aber beim Klick auf den Button auf.
function SlotKarte({ titel, text, portion, onWuerfeln }) {
  return (
    <div className="rounded-lg border border-text-muted/20 bg-card p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{titel}</h3>
      <p className="text-lg font-semibold text-text">{text}</p>
      <p className="text-xs text-text-muted">{portion} g</p>
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
