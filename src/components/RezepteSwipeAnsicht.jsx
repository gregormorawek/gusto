import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconChevronDown } from '@tabler/icons-react'
import MahlzeitFilter from './MahlzeitFilter'
import DiaetFilter from './DiaetFilter'
import SuessDeftigFilter from './SuessDeftigFilter'
import RezeptSchwipKarte from './RezeptSchwipKarte'
import { MAHLZEITEN, aktiveMahlzeitenFuer } from '../mahlzeiten'
import { gefiltertePoolFuerRezepte } from '../rezepteFilter'
import { SLIDE_DISTANZ, motionPropsFuer } from '../motionConfig'

// RezepteSwipeAnsicht ersetzt RezepteAnsicht.jsx als Hauptbildschirm des
// Rezepte-Tabs (Rezepte-Swipe-Pivot, siehe Plan floating-mixing-shannon.md).
// Anders als die fruehere RezepteAnsicht.jsx gibt es HIER keine Einzel-/
// Tagesplan-Weiche mehr - die Ansicht verhaelt sich fuer alle drei
// ziel.typ-Werte identisch, siehe dortiger Kommentar in App.jsx. Der
// Browsing-Kandidat pro Mahlzeit kommt ausschliesslich aus proMahlzeitState
// (App.jsx, ein Eintrag pro Mahlzeit-Typ), aktuelleMahlzeit waehlt aus,
// welcher Eintrag gerade als grosse Swipe-Karte gezeigt wird.
//
// KEIN permanenter Mahlzeit-Chip-Switcher mehr in der Kopfzeile (Korrektur
// gegenueber einem frueheren Plan-Zwischenstand, siehe dortiger Kommentar) -
// stattdessen nur eine schlichte Ueberschrift mit dem Namen der aktuellen
// Mahlzeit plus EINE Filter-Pille, die Mahlzeit-Wechsel, Diaet-Filter UND
// (kontextabhaengig) Suess/Deftig-Filter gemeinsam in einem Panel buendelt -
// das war laut Auftrag ausdruecklich als "z. B. als Pille" gewuenscht.
function RezepteSwipeAnsicht({
  rezepteGeladen,
  rezepte,
  zutatenNachId,
  diaeten,
  onDiaetenAendern,
  ziel,
  makroZiele,
  aktiveMahlzeiten,
  aktuelleMahlzeit,
  onMahlzeitAendern,
  proMahlzeitState,
  onEigenschaftAendern,
  onWuerfeln,
  onUebernehmen,
  onKochModusOeffnen,
  onZurEinkaufslisteHinzufuegen,
}) {
  const reduzierteBewegung = useReducedMotion()
  const [panelOffen, setPanelOffen] = useState(false)

  const aktiveMahlzeitenListe = aktiveMahlzeitenFuer(aktiveMahlzeiten)
  const mahlzeitLabel = MAHLZEITEN.find(({ slug }) => slug === aktuelleMahlzeit)?.label ?? ''

  const aktuellerEintrag = proMahlzeitState[aktuelleMahlzeit]
  const aktuellesRezept = aktuellerEintrag?.rezept ?? null
  const aktuelleEigenschaft = aktuellerEintrag?.eigenschaft ?? ''
  const aktuellerPool = gefiltertePoolFuerRezepte(rezepte, aktuelleMahlzeit, diaeten, aktuelleEigenschaft)

  function mahlzeitImPanelWaehlen(slug) {
    onMahlzeitAendern(slug)
    setPanelOffen(false)
  }

  return (
    // min-h-full statt h-full: streckt sich auf mind. die Hoehe des
    // umgebenden Scroll-Containers (App.jsx, .flex-1.min-h-0.overflow-y-auto)
    // - das gibt RezeptSchwipKarte weiter unten ueberhaupt erst einen echten
    // flex-1-Raum, den es fuer die Button-/Hinweistext-Zentrierung braucht
    // (siehe dortiger Kommentar, Real-Device-Bugreport "Buttons vertikal
    // nicht mittig"). "min-" statt eines harten h-full: auf sehr kurzen
    // Viewports darf der Inhalt (Kopfzeile + Karte + Buttons) trotzdem ueber
    // diese Mindesthoehe hinauswachsen und im Scroll-Container scrollen,
    // statt hart abgeschnitten zu werden.
    <div className="flex min-h-full flex-col">
      <div className="relative mx-4 mt-1 flex shrink-0 items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-text">{mahlzeitLabel}</h1>

        <button
          type="button"
          onClick={() => setPanelOffen((aktuell) => !aktuell)}
          aria-expanded={panelOffen}
          className="flex items-center gap-1 rounded-full border border-text-muted/30 bg-card px-3 py-1.5 text-sm font-medium text-text shadow-sm"
        >
          Alles
          <IconChevronDown size={16} stroke={2} className={`transition-transform duration-150 ${panelOffen ? 'rotate-180' : ''}`} />
        </button>

        {/* Unsichtbarer Schliess-Layer: ein Tap ausserhalb des Panels
            schliesst es, ohne dass die dahinterliegende Karte den Klick
            selbst erhaelt (fixed inset-0, aber unterhalb des Panels selbst -
            siehe z-index-Reihenfolge). */}
        {panelOffen && (
          <button
            type="button"
            aria-label="Filter schließen"
            onClick={() => setPanelOffen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
        )}

        <AnimatePresence>
          {panelOffen && (
            <motion.div
              {...motionPropsFuer(reduzierteBewegung, {
                initial: { opacity: 0, y: -SLIDE_DISTANZ },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -SLIDE_DISTANZ },
                transition: { duration: 0.18 },
              })}
              className="absolute right-0 top-full z-30 mt-2 w-72 max-w-[80vw] rounded-2xl bg-card p-4 shadow-lg"
            >
              {/* -mx-4: gleicht das fest einprogrammierte px-4 von
                  MahlzeitFilter/SuessDeftigFilter aus (beide fuer Kontexte
                  OHNE eigenes Karten-Padding gedacht) - ohne den Ausgleich
                  waeren die Chips hier zusaetzlich zum p-4 dieses Panels
                  eingerueckt, bei w-72 spuerbar eng. DiaetFilter braucht das
                  nicht, siehe dessen eigener Kommentar (kein eingebautes px-4). */}
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Mahlzeit</p>
              <div className="-mx-4 mt-1">
                <MahlzeitFilter aktuell={aktuelleMahlzeit} onAendern={mahlzeitImPanelWaehlen} mahlzeiten={aktiveMahlzeitenListe} />
              </div>

              {(aktuelleMahlzeit === 'fruehstueck' || aktuelleMahlzeit === 'snack') && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Art</p>
                  <div className="-mx-4 mt-1">
                    <SuessDeftigFilter aktuell={aktuelleEigenschaft} onAendern={onEigenschaftAendern} />
                  </div>
                </>
              )}

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Ernährungsform</p>
              <DiaetFilter ausgewaehlt={diaeten} onAendern={onDiaetenAendern} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <RezeptSchwipKarte
        rezepteGeladen={rezepteGeladen}
        rezept={aktuellesRezept}
        zutatenNachId={zutatenNachId}
        ziel={ziel}
        makroZiele={makroZiele}
        onWuerfeln={onWuerfeln}
        wuerfelnDeaktiviert={aktuellerPool.length === 0}
        onUebernehmen={onUebernehmen}
        onKochModusOeffnen={onKochModusOeffnen}
        onZurEinkaufslisteHinzufuegen={onZurEinkaufslisteHinzufuegen}
      />
    </div>
  )
}

export default RezepteSwipeAnsicht
