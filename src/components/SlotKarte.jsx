// SlotKarte ist eine wiederverwendbare Komponente fuer einen einzelnen "Slot".
// Sie bekommt ihre Inhalte ueber Props (titel und text) und zeigt sie in einer Karte an.
// onWuerfeln ist eine Funktion, die von App.jsx uebergeben wird. SlotKarte kennt
// den Inhalt dieser Funktion nicht, ruft sie aber beim Klick auf den Button auf.
function SlotKarte({ titel, text, onWuerfeln }) {
  return (
    <div className="rounded-lg border border-gray-300 p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{titel}</h3>
      <p className="text-gray-600">{text}</p>
      <button
        type="button"
        onClick={onWuerfeln}
        className="mt-2 rounded bg-gray-200 px-2 py-1 text-sm text-gray-700"
      >
        🎲 Neu würfeln
      </button>
    </div>
  )
}

export default SlotKarte
