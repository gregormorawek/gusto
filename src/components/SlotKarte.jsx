import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AnimierteZahl from './AnimierteZahl'
import AnimatedButton from './AnimatedButton'
import { FADE_UEBERGANG, SLIDE_DISTANZ, SPRING_REVEAL, motionPropsFuer } from '../motionConfig'
import { suchtextGefiltert } from '../zutatenFilter'

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
// Nach 3 Rerolls desselben Slots (danach, ob genutzt oder ignoriert, erst
// wieder nach 5 weiteren - siehe naechsterRerollZaehlerStand in App.jsx)
// setzt der Aufrufer sucheAnzeigen auf true und SlotKarte zeigt ein Live-
// Suchfeld, ueber das gezielt eine Zutat aus suchPool
// (der bereits nach Kategorie/Mahlzeit/Diaet/Suess-Deftig gefilterte Pool,
// exakt derselbe wie beim Wuerfeln) ausgewaehlt werden kann. Die Namens-
// Filterung selbst passiert lokal hier in der Komponente.
//
// onWuerfeln ist ebenfalls optional (analog zu onZielAendern): ohne die Prop
// verschwindet der "neu wuerfeln"-Button komplett - fuer die Rezepte-Ansicht
// (Schritt 3), wo die 4 Zutaten fest durch das Rezept vorgegeben sind und es
// bewusst KEINEN Einzel-Slot-Reroll gibt.
// Kurzform-Ausnahme NUR fuers Placeholder des schmalen Such-Inputs unten
// (2-spaltiges Grid in App.jsx, Kartenbreite ~150px): "Kohlenhydrate
// suchen…" wird dort vom Input abgeschnitten, waehrend der Karten-Titel
// (h3) und das "Kohlenhydrate-Ziel:"-Label bei derselben Breite noch
// problemlos passen (siehe visueller Test) - deshalb bleibt titel selbst
// unveraendert, nur dieser eine Anzeigetext weicht ab.
const SUCHE_PLATZHALTER_KURZFORM = { Kohlenhydrate: 'KH' }

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
  const reduzierteBewegung = useReducedMotion()
  const [suchtext, setSuchtext] = useState('')

  const treffer = suchtextGefiltert(suchPool ?? [], suchtext)

  function zutatWaehlen(zutat) {
    setSuchtext('')
    onZutatWaehlen(zutat)
  }

  return (
    <div className="rounded-lg border border-text-muted/20 bg-card p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{titel}</h3>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={text}
          {...motionPropsFuer(reduzierteBewegung, {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.95 },
            transition: SPRING_REVEAL,
          })}
        >
          {/* min-h reserviert immer Platz fuer 2 Zeilen (text-lg -> line-height 1.75rem * 2 = 3.5rem),
              damit die SlotKarte-Hoehe nicht vom Zufall des gewuerfelten Zutatennamens abhaengt. */}
          <p className="min-h-[3.5rem] text-lg font-semibold text-text">{text}</p>
          <p className="text-xs text-text-muted">
            <AnimierteZahl wert={portion ?? 0} /> g
          </p>
        </motion.div>
      </AnimatePresence>

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
              className="w-16 rounded-md border border-text-muted/30 px-2 py-1 text-text"
            />
            g
          </span>
        </label>
      )}

      {zielWert && !zielErreichbar && (
        <p className="mt-0.5 text-xs text-primary/70">Ziel nicht ganz erreichbar</p>
      )}

      {onWuerfeln && (
        <AnimatedButton
          type="button"
          onClick={onWuerfeln}
          className="mt-2 text-sm text-primary hover:underline"
        >
          ↻ neu würfeln
        </AnimatedButton>
      )}

      <AnimatePresence>
        {sucheAnzeigen && (
          <motion.div
            {...motionPropsFuer(reduzierteBewegung, {
              initial: { opacity: 0, y: -SLIDE_DISTANZ },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -SLIDE_DISTANZ },
              transition: FADE_UEBERGANG,
            })}
            className="mt-2"
          >
            <input
              type="text"
              value={suchtext}
              onChange={(e) => setSuchtext(e.target.value)}
              placeholder={`${SUCHE_PLATZHALTER_KURZFORM[titel] ?? titel} suchen…`}
              className="w-full rounded-md border border-text-muted/30 px-2 py-1 text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {suchtext.trim() && (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SlotKarte
