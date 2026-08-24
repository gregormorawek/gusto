import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconCheck, IconShoppingCart } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import { postenSchluessel } from '../einkaufsliste'
import { FADE_UEBERGANG, SPRING_REVEAL, motionPropsFuer, transitionFuer } from '../motionConfig'

// Anzeige-Reihenfolge/-Label der 5 supermarkt-orientierten Abschnitte (siehe
// CLAUDE.md-Erledigt-Vermerk zum Kategorie-Upgrade). Basiert auf
// posten.supermarktKategorie (1:1 aus Supabase-Spalte supermarkt_kategorie
// der Zutat, siehe einkaufsliste.js) statt auf dem Naehrwert-kategorie-Feld,
// das im Posten selbst unangetastet bleibt.
const ABSCHNITT_REIHENFOLGE = ['fleisch_fisch', 'milch_eier', 'getreide', 'obst_gemuese', 'sonstiges']
const ABSCHNITT_LABEL = {
  fleisch_fisch: 'Fleisch & Fisch',
  milch_eier: 'Milchprodukte & Eier',
  getreide: 'Getreide & Backwaren',
  obst_gemuese: 'Obst & Gemüse',
  sonstiges: 'Sonstiges',
}

// Gruppiert die flache Liste nach Anzeige-Abschnitt (siehe oben). Innerhalb
// jedes Abschnitts: nicht abgehakte zuerst, abgehakte ans Ende - sonst
// bleibt die Reihenfolge stabil (Array.sort ist seit ES2019 stabil), d. h.
// die urspruengliche Hinzufuege-Reihenfolge bleibt innerhalb beider Gruppen
// erhalten.
function nachAbschnittGruppiert(liste) {
  const gruppen = Object.fromEntries(ABSCHNITT_REIHENFOLGE.map((schluessel) => [schluessel, []]))
  for (const posten of liste) {
    const abschnitt = gruppen[posten.supermarktKategorie]
    // Unbekannte supermarktKategorie-Werte (sollte nicht vorkommen, siehe
    // einkaufslisteLaden()-Fallback auf 'sonstiges') werden stillschweigend
    // uebersprungen statt die Anzeige mit einem Crash zu blockieren.
    abschnitt?.push(posten)
  }
  for (const schluessel of ABSCHNITT_REIHENFOLGE) {
    gruppen[schluessel] = [...gruppen[schluessel]].sort((a, b) => Number(a.abgehakt) - Number(b.abgehakt))
  }
  return gruppen
}

// Eine einzelne Zutaten-Zeile: Checkbox links im bestehenden "Keramik"-
// Icon-Kreis-Stil (siehe AuswahlChip.jsx/iconKreisKlassen - dieselbe
// Terracotta-gefuellt-bei-aktiv-Optik, hier direkt uebernommen statt
// AuswahlChip selbst zu verwenden, da dessen Button-/Label-Aussenform fuer
// eine ganze Listenzeile mit Name+Menge nicht passt), Name + Menge rechts.
// Abgehakt: Name durchgestrichen/gedaempft, Checkbox terracotta gefuellt.
// Reines Opacity-/Farb-Fade (transition-colors), keine Bewegung - erfuellt
// "keine aufwaendigen Animationen beim Abhaken" bereits ohne einen
// motion-reduce-Sonderfall (eine reine Farb-Transition ist keine
// "Bewegung" im Sinne von prefers-reduced-motion).
function EinkaufslistenPosten({ posten, onAbhaken }) {
  const schluessel = postenSchluessel(posten)
  return (
    <li className="flex items-center gap-3 border-b border-text-muted/10 py-2 last:border-b-0">
      <AnimatedButton
        type="button"
        onClick={() => onAbhaken(schluessel)}
        aria-pressed={posten.abgehakt}
        aria-label={posten.abgehakt ? `${posten.name} wieder auf die Liste setzen` : `${posten.name} abhaken`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
          posten.abgehakt ? 'bg-primary text-card' : 'bg-text-muted/10 text-transparent'
        }`}
      >
        <IconCheck size={14} stroke={3} />
      </AnimatedButton>
      <span
        className={`flex-1 truncate text-sm transition-colors duration-150 ${
          posten.abgehakt ? 'text-text-muted/60 line-through' : 'text-text'
        }`}
      >
        {posten.name}
      </span>
      <span className={`shrink-0 text-xs transition-colors duration-150 ${posten.abgehakt ? 'text-text-muted/50' : 'text-text-muted'}`}>
        {Math.round(posten.mengeG)} g
      </span>
    </li>
  )
}

// Kleiner Bestaetigungs-Dialog fuer die destruktive "Liste leeren"-Aktion -
// bewusst EIN echtes Overlay (anders als der Toast oben, siehe dortiger
// Kommentar) - Loeschen der gesamten Liste ist nicht trivial rueckgaengig
// zu machen und verdient eine explizite Rueckfrage. Selbes Backdrop-/Karten-
// Muster wie der "Kalorienziel neu berechnen?"-Dialog in
// EinstellungenAnsicht.jsx (fixed inset-0 bg-text/40 + zentrierte
// bg-card-Karte), hier aber vertikal zentriert statt oben (items-start),
// da die Karte selbst winzig ist.
function ListeLeerenBestaetigung({ offen, onAbbrechen, onBestaetigen }) {
  const reduzierteBewegung = useReducedMotion()
  return (
    <AnimatePresence>
      {offen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitionFuer(reduzierteBewegung, FADE_UEBERGANG)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 p-4"
          onClick={onAbbrechen}
        >
          <motion.div
            {...motionPropsFuer(reduzierteBewegung, {
              initial: { opacity: 0, y: -16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -16 },
              transition: SPRING_REVEAL,
            })}
            className="w-full max-w-xs rounded-lg bg-card p-4 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-semibold text-text">Wirklich alles löschen?</p>
            <p className="mt-1 text-sm text-text-muted">Die komplette Einkaufsliste wird geleert.</p>
            <div className="mt-4 flex gap-2">
              <AnimatedButton
                type="button"
                onClick={onAbbrechen}
                className="flex-1 rounded-lg border border-text-muted/30 px-3 py-2 text-sm font-medium text-text"
              >
                Abbrechen
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={onBestaetigen}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-card"
              >
                Leeren
              </AnimatedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Voller Einkaufslisten-Tab: leerer Zustand (freundlicher Hinweis statt
// Blank-Screen) ODER nach Kategorie gruppierte, abhakbare Liste. liste kommt
// vollstaendig als Prop von App.jsx (dort auch die localStorage-Persistenz,
// siehe einkaufsliste.js) - diese Komponente selbst haelt ausser dem
// Bestaetigungs-Dialog-Sichtbarkeitszustand keinen eigenen State.
function EinkaufslisteAnsicht({ liste, onPostenAbhaken, onAbgehakteEntfernen, onListeLeeren }) {
  const [leerenBestaetigungOffen, setLeerenBestaetigungOffen] = useState(false)

  if (liste.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-8 pt-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
          <IconShoppingCart size={30} stroke={1.75} className="text-secondary" />
        </span>
        <h2 className="font-display text-xl font-semibold text-text">Einkaufsliste</h2>
        <p className="text-sm text-text-muted">
          Noch nichts auf der Liste. Füge Zutaten aus einem Rezept oder deinem Tagesplan hinzu.
        </p>
      </div>
    )
  }

  const hatAbgehakte = liste.some((posten) => posten.abgehakt)
  const gruppen = nachAbschnittGruppiert(liste)

  function leerenBestaetigt() {
    onListeLeeren()
    setLeerenBestaetigungOffen(false)
  }

  return (
    <>
      {/* sticky statt fixed: die Liste selbst nutzt bewusst den normalen
          Seiten-Scroll (wie der Rest der App, siehe App.jsx-Wrapper-Kommentar
          "Kein Scrollen"-Prinzip) statt eines eigenen inneren Scroll-
          Containers - sticky reicht dafuer voellig aus (klebt am oberen
          Viewport-Rand, sobald man daran vorbeiscrollt) und ist einfacher als
          ein separat gehoehter overflow-y-auto-Block. bg-bg deckt den
          durchscrollenden Inhalt darunter vollstaendig ab. */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-bg px-4 pb-2">
        <h1 className="font-display text-xl font-semibold text-text">Einkaufsliste</h1>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          <AnimatedButton
            type="button"
            onClick={onAbgehakteEntfernen}
            disabled={!hatAbgehakte}
            className="font-medium text-primary hover:underline disabled:opacity-40"
          >
            Abgehakte entfernen
          </AnimatedButton>
          <AnimatedButton
            type="button"
            onClick={() => setLeerenBestaetigungOffen(true)}
            className="font-medium text-text-muted hover:underline"
          >
            Liste leeren
          </AnimatedButton>
        </div>
      </div>

      <div className="px-4">
        {ABSCHNITT_REIHENFOLGE.filter((schluessel) => gruppen[schluessel].length > 0).map((schluessel) => (
          <section key={schluessel} className="mt-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{ABSCHNITT_LABEL[schluessel]}</h2>
            <ul>
              {gruppen[schluessel].map((posten) => (
                <EinkaufslistenPosten key={postenSchluessel(posten)} posten={posten} onAbhaken={onPostenAbhaken} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ListeLeerenBestaetigung
        offen={leerenBestaetigungOffen}
        onAbbrechen={() => setLeerenBestaetigungOffen(false)}
        onBestaetigen={leerenBestaetigt}
      />
    </>
  )
}

export default EinkaufslisteAnsicht
