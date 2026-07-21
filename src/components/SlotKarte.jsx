// SlotKarte ist eine wiederverwendbare Komponente fuer einen einzelnen "Slot".
// Sie bekommt ihre Inhalte ueber Props (titel und text) und zeigt sie in einer Karte an.
function SlotKarte({ titel, text }) {
  return (
    <div className="rounded-lg border border-gray-300 p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{titel}</h3>
      <p className="text-gray-600">{text}</p>
    </div>
  )
}

export default SlotKarte
