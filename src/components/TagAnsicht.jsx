import { IconChevronRight, IconPhotoOff, IconPlus, IconShoppingCart } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import { aktiveMahlzeitenFuer } from '../mahlzeiten'
import { rezeptKarteBerechnen } from '../rezeptKarteBerechnen'

// Eine Zeile fuer EINE Mahlzeit - entweder mit bereits per "Uebernehmen"
// (RezeptSchwipKarte.jsx) festgelegtem Rezept (Thumbnail+Titel+kcal/Eiweiss)
// oder als gestrichelter Platzhalter, wenn fuer diese Mahlzeit heute noch
// nichts feststeht. karte ist bereits das fertige rezeptKarteBerechnen-
// Ergebnis (null, wenn kein Rezept gesetzt ODER das gesetzte nicht mehr
// existiert) - siehe TagAnsicht weiter unten. Der komplette Button oeffnet
// IMMER den Swipe-Modus fuer diese Mahlzeit (siehe onOeffnen), unabhaengig
// vom Zustand - das deckt sowohl "ansehen/aendern" als auch "jetzt erst
// waehlen" mit demselben Tap ab.
function TagZeile({ label, rezept, karte, onOeffnen }) {
  if (!karte) {
    return (
      <AnimatedButton
        type="button"
        onClick={onOeffnen}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-text-muted/30 px-3 py-3 text-left"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-text-muted/10 text-text-muted">
          <IconPlus size={22} stroke={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</span>
          <span className="block text-sm text-text-muted">Noch nicht gewählt — tippen zum Auswählen</span>
        </span>
        <IconChevronRight size={18} stroke={1.75} className="shrink-0 text-text-muted/60" />
      </AnimatedButton>
    )
  }

  return (
    <AnimatedButton
      type="button"
      onClick={onOeffnen}
      className="flex w-full items-center gap-3 rounded-lg border border-text-muted/20 bg-card px-3 py-3 text-left shadow-sm"
    >
      {rezept.bild_url ? (
        <img src={rezept.bild_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-text-muted">
          <IconPhotoOff size={22} stroke={1.75} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-secondary">{label}</span>
        <span className="block truncate font-medium text-text">{rezept.titel}</span>
        <span className="block text-xs text-text-muted">
          {karte.summeKalorien.toFixed(0)} kcal · P {karte.summeProtein.toFixed(0)}g
        </span>
      </span>
      <IconChevronRight size={18} stroke={1.75} className="shrink-0 text-text-muted/60" />
    </AnimatedButton>
  )
}

// TagAnsicht ersetzt TagesplanAnsicht.jsx (Rezepte-Swipe-Pivot, siehe Plan
// floating-mixing-shannon.md) - zeigt, was per "Uebernehmen" fuer HEUTE
// bereits feststeht (tagesauswahl, siehe App.jsx), eine Zeile pro aktiver
// Mahlzeit plus eine aggregierte Tages-Summe. Haelt selbst KEINEN State -
// tagesauswahl/rezepte/zutatenNachId/ziel/makroZiele kommen komplett als
// Props von App.jsx, exakt wie RezepteSwipeAnsicht.jsx.
function TagAnsicht({
  rezepte,
  zutatenNachId,
  ziel,
  makroZiele,
  aktiveMahlzeiten,
  tagesauswahl,
  onZeileOeffnen,
  onZurEinkaufslisteHinzufuegen,
}) {
  const aktiveMahlzeitenListe = aktiveMahlzeitenFuer(aktiveMahlzeiten)

  // Pro aktiver Mahlzeit: das gesetzte Rezept (falls vorhanden UND noch in
  // rezepte auffindbar) plus dessen LIVE berechnete Karte (reagiert dadurch
  // automatisch auf spaetere Ziel-/Makro-Aenderungen, siehe
  // rezeptKarteBerechnen-Kommentar dort - kein Snapshot). rezeptKarteBerechnen
  // liefert bei rezept=null ohnehin bereits null, das deckt sowohl "nichts
  // gesetzt" als auch "gesetzte rezeptId nicht mehr auffindbar" einheitlich ab.
  const eintraege = aktiveMahlzeitenListe.map(({ slug, label }) => {
    const rezeptId = tagesauswahl.mahlzeiten[slug]
    const rezept = rezeptId != null ? (rezepte.find((r) => r.id === rezeptId) ?? null) : null
    const karte = rezeptKarteBerechnen(rezept, zutatenNachId, ziel, makroZiele)
    return { slug, label, rezept: karte ? rezept : null, karte }
  })

  // Kompakte Tages-Summe ueber alle VORHANDENEN Eintraege - reiner
  // Render-Wert (kein State), analog zur bestehenden tagesSumme-Reduce-Logik
  // in RezepteAnsicht.jsx (jetzt hier uebernommen, dort mit dem Rest der
  // Datei in Schritt 6 entfernt).
  const tagesSumme = eintraege.reduce(
    (summe, eintrag) =>
      eintrag.karte
        ? {
            kalorien: summe.kalorien + eintrag.karte.summeKalorien,
            protein: summe.protein + eintrag.karte.summeProtein,
            carbs: summe.carbs + eintrag.karte.summeCarbs,
            fett: summe.fett + eintrag.karte.summeFett,
          }
        : summe,
    { kalorien: 0, protein: 0, carbs: 0, fett: 0 }
  )

  // Tagesziel-Vergleich nur bei ziel.typ === 'proTag' sinnvoll - das ist der
  // EINZIGE Zieltyp, bei dem ziel.kalorien.min/max tatsaechlich den ganzen
  // Tag beschreibt (siehe zielKalorienFensterFuerMahlzeit in
  // portionenRechner.js). Bei 'proMahlzeit' gilt dieselbe Spanne PRO
  // Mahlzeit - ein "Tagesziel" waere dort nur eine erfundene Multiplikation
  // mit der Anzahl aktiver Mahlzeiten, die der User nie explizit so
  // eingegeben hat, deshalb hier bewusst weggelassen (wie bei 'kein').
  const tagesZielKalorien =
    ziel.typ === 'proTag' && Number(ziel.kalorien.min) > 0 && Number(ziel.kalorien.max) > 0
      ? { min: Number(ziel.kalorien.min), max: Number(ziel.kalorien.max) }
      : null

  return (
    <>
      <h1 className="mx-4 mt-1 font-display text-2xl font-semibold text-text">Heute</h1>

      <div className="mx-4 mt-3 flex flex-col gap-2">
        {eintraege.map((eintrag) => (
          <TagZeile
            key={eintrag.slug}
            label={eintrag.label}
            rezept={eintrag.rezept}
            karte={eintrag.karte}
            onOeffnen={() => onZeileOeffnen(eintrag.slug)}
          />
        ))}
      </div>

      <section className="mx-4 mt-3 rounded-lg border border-secondary/20 bg-secondary/10 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-text">Tag gesamt</h2>
        <p className="font-display text-2xl font-semibold text-text">
          {tagesSumme.kalorien.toFixed(0)} kcal
          {tagesZielKalorien && (
            <span className="ml-1.5 text-base font-normal text-text-muted">
              / {tagesZielKalorien.min.toFixed(0)}–{tagesZielKalorien.max.toFixed(0)} kcal
            </span>
          )}
        </p>
        <p className="text-sm text-text-muted">
          P {tagesSumme.protein.toFixed(0)}g · K {tagesSumme.carbs.toFixed(0)}g · F {tagesSumme.fett.toFixed(0)}g
        </p>
      </section>

      {/* Deaktiviert statt komplett ausgeblendet, solange fuer HEUTE noch gar
          keine Mahlzeit feststeht - sonst wuerde ein Klick zutatenHinzufuegen
          mit einer leeren Liste aufrufen und trotzdem die "Zutaten
          hinzugefügt"-Bestaetigung zeigen, obwohl nichts passiert ist.
          Gleiche Gewichtung (Outline, Oliv) wie der "Zur Einkaufsliste"-Button
          an der Swipe-Karte (RezeptSchwipKarte.jsx), damit sich die Aktion
          app-weit gleich anfuehlt, egal ueber welchen Weg man Zutaten sammelt. */}
      <div className="mx-4 mb-4 mt-3">
        <AnimatedButton
          type="button"
          onClick={onZurEinkaufslisteHinzufuegen}
          disabled={!eintraege.some((eintrag) => eintrag.karte)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-secondary px-3 py-2 text-sm font-medium text-secondary disabled:opacity-40"
        >
          <IconShoppingCart size={18} stroke={1.75} />
          Zur Einkaufsliste hinzufügen
        </AnimatedButton>
      </div>
    </>
  )
}

export default TagAnsicht
