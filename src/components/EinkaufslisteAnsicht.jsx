import { IconShoppingCart } from '@tabler/icons-react'

// Platzhalter fuer den Einkaufslisten-Tab - die eigentliche Funktion (Zutaten
// aus geplanten Mahlzeiten automatisch sammeln) folgt in einem separaten,
// zweiten Feature-Schritt.
function EinkaufslisteAnsicht() {
  return (
    <div className="flex flex-col items-center gap-3 px-8 pt-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
        <IconShoppingCart size={30} stroke={1.75} className="text-secondary" />
      </span>
      <h2 className="font-display text-xl font-semibold text-text">Einkaufsliste</h2>
      <p className="text-sm text-text-muted">
        Kommt bald – hier sammelst du bald automatisch die Zutaten deiner geplanten Mahlzeiten.
      </p>
    </div>
  )
}

export default EinkaufslisteAnsicht
