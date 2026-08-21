import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconBan, IconCalendar, IconChevronRight, IconClock, IconTarget } from '@tabler/icons-react'
import AnimatedButton from './AnimatedButton'
import AuswahlChip from './AuswahlChip'
import { HOEHEN_UEBERGANG_EASING, HOEHEN_UEBERGANG_MS, motionPropsFuer } from '../motionConfig'
import { useBeobachteteHoehe } from '../useBeobachteteHoehe'

// Die drei moeglichen Ziel-Typen. "kein" ist der Standard (kein Kalorienziel
// aktiv), bei den anderen beiden gibt der User zusaetzlich eine Kalorienzahl
// im Zahlenfeld ein.
const ZIEL_OPTIONEN = [
  { typ: 'kein', label: 'Kein Ziel', Icon: IconBan },
  { typ: 'proMahlzeit', label: 'Pro Mahlzeit', Icon: IconClock },
  { typ: 'proTag', label: 'Pro Tag', Icon: IconCalendar },
]

// Bei "Pro Tag" zusaetzlich zeigbares Makro-Gesamtziel fuer den ganzen Tag
// (Protein/Carbs/Fett in Gramm). Wird intern auf die vier Mahlzeiten
// aufgeteilt - siehe makroZielFuerMahlzeitAusTagesziel in App.jsx.
// label ist die Kurzform fuer das Feld-Label ueber der 3er-Reihe (siehe
// Redesign-Kommentar unten) - "Kohlenhydrate" umbricht dort ueber der
// schmalen Drittel-Spalte, "Kohlenh." passt einzeilig, konsistent zu den
// einsilbig kurzen "Protein"/"Fett"-Labels daneben.
const MAKRO_FELDER = [
  { kategorie: 'protein', label: 'Protein' },
  { kategorie: 'carbs', label: 'Kohlenh.' },
  { kategorie: 'fett', label: 'Fett' },
]

// Zeigt die Ziel-Typ-Auswahl (Radio, Single-Select), zwei Zahlenfelder fuer
// das Kalorienfenster (Min/Max, falls ein Ziel aktiv ist) und - nur bei
// "Pro Tag" - ein Makro-Gesamtziel fuer den ganzen Tag. ziel ist { typ,
// kalorien: { min, max }, makro: { protein, carbs, fett } }. onTypAendern
// wird mit dem neuen Typ aufgerufen, onKalorienAendern mit ('min'|'max', wert)
// (Signatur analog zu onMakroAendern), onMakroAendern mit (kategorie, wert).
// Fade-Props fuer die beiden waechst-/schrumpft-Bloecke (Min/Max-Kalorien,
// Makro-Ziele): animate verzoegert den Fade-in um 100ms, damit die
// Hoehen-Animation des wachsenden Bereichs (siehe useBeobachteteHoehe oben)
// sichtbar VOR dem Inhalt startet ("Bewegung fuehrt, Inhalt folgt"). exit
// hat bewusst KEINE Verzoegerung, aber eine ruhigere 200ms-Dauer (statt
// hektischer 150ms) - AnimatePresence haelt das austretende Element ohnehin
// bis zum Ende seiner Exit-Animation im normalen Fluss, die Card schrumpft
// also erst NACH dem Fade-out (Standardverhalten, kein popLayout noetig).
// Bei reduzierter Bewegung entfernt motionPropsFuer diese Transitions
// komplett zugunsten eines einheitlichen 150ms-Fades ohne Verzoegerung
// (siehe motionConfig.js) - dieselbe Konvention wie ueberall sonst in der App.
function fadeProps(reduzierteBewegung) {
  return motionPropsFuer(reduzierteBewegung, {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25, delay: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  })
}

// Dezente Einstiegs-Box zum optionalen Kalorienrechner-Wizard (siehe
// Kalorienrechner.jsx) - olivfarben (statt der terrakottafarbenen
// Kalorienziel-Chips darueber) getönt, damit sie sich klar als
// EIGENSTAENDIGER, zusaetzlicher Einstieg von der eigentlichen Auswahl
// absetzt statt wie eine vierte Option darin zu wirken. Bewusst ausserhalb
// des Hoehen-animierten Wrappers oben platziert (siehe dortiger
// ResizeObserver-Kommentar) - sie ist IMMER sichtbar (unabhaengig von
// ziel.typ), müsste sonst in die Hoehen-Messung mit einbezogen werden.
function KalorienrechnerCallout({ onOeffnen }) {
  return (
    <AnimatedButton
      type="button"
      onClick={onOeffnen}
      className="mt-2 flex w-full items-center gap-3 rounded-xl border border-secondary/25 bg-secondary/10 px-3 py-1.5 text-left transition-colors duration-150 hover:bg-secondary/15"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/20 text-secondary">
        <IconTarget size={20} stroke={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold text-text">Ziel berechnen</span>
        <span className="block text-xs text-text-muted">Wenige Fragen zu dir</span>
      </span>
      <IconChevronRight size={18} stroke={1.75} className="shrink-0 text-secondary" />
    </AnimatedButton>
  )
}

function ZielEinstellungen({ ziel, onTypAendern, onKalorienAendern, onMakroAendern, onKalorienrechnerOeffnen }) {
  const reduzierteBewegung = useReducedMotion()
  const [inhaltRef, hoehe] = useBeobachteteHoehe()

  return (
    <section className="mx-4 mt-3 rounded-lg border border-secondary/20 bg-card p-3 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Kalorienziel</h2>

      {/* Chips gestapelt statt umbrechend (Redesign "Chips volle Breite") -
          groesse="breit" (siehe AuswahlChip.jsx) stretcht jeden Chip auf die
          volle Kachel-Breite statt wie zuvor auf Inhalts-Breite zu schrumpfen
          und unsauber (2 nebeneinander, 1 allein) umzubrechen. */}
      <div className="mt-1.5 flex flex-col gap-1">
        {ZIEL_OPTIONEN.map(({ typ, label, Icon }) => (
          <AuswahlChip
            key={typ}
            Icon={Icon}
            label={label}
            groesse="breit"
            aktiv={ziel.typ === typ}
            input={{ type: 'radio', name: 'ziel-typ', checked: ziel.typ === typ, onChange: () => onTypAendern(typ) }}
          />
        ))}
      </div>

      {/* Hoehe dieses Wrappers folgt per CSS transition der per ResizeObserver
          beobachteten Hoehe von inhaltRef (siehe useBeobachteteHoehe oben) -
          NICHT framer-motions layout-Prop, das war hier unzuverlaessig. Die
          Chip-Reihe ist ein Geschwister-Element DAVOR und bleibt dadurch
          komplett unbeteiligt an der Groessen-Animation. */}
      <div
        className="overflow-hidden transition-[height] motion-reduce:transition-none"
        style={{ height: hoehe, transitionDuration: `${HOEHEN_UEBERGANG_MS}ms`, transitionTimingFunction: HOEHEN_UEBERGANG_EASING }}
      >
        {/* flow-root ist der eigentliche Bugfix hier: OHNE das kollabiert
            das mt-3 des ersten Kindes (kalorien-eingabe) nach AUSSEN durch
            diesen paddinglosen Div hindurch (klassisches CSS-Margin-
            Collapse), wodurch inhaltRef.scrollHeight um genau diesen Wert
            ZU KLEIN gemessen wurde - der Wrapper selbst (der Aufrufer mit
            overflow-hidden) bekam dadurch eine zu kleine Ziel-Hoehe gesetzt
            und schnitt die letzte Zeile ab. flow-root etabliert einen neuen
            Block-Formatting-Context, der Margin-Collapse verhindert, OHNE
            (anders als overflow-hidden) selbst Inhalt abzuschneiden. */}
        <div ref={inhaltRef} className="flow-root">
          <AnimatePresence>
            {ziel.typ !== 'kein' && (
              <motion.div key="kalorien-eingabe" {...fadeProps(reduzierteBewegung)} className="mt-2">
                {/* Label ueber dem Feld statt daneben (Redesign) - Min/Max
                    als zwei gleich breite Spalten (grid-cols-2), damit sie
                    IMMER nebeneinander in einer Reihe bleiben statt (wie
                    zuvor bei schmalem Viewport) umzubrechen. Einheit "kcal"
                    als absolut positionierte Suffix-Span INNERHALB des
                    Feldes statt als Text daneben - dafuer sorgt pr-10 am
                    input fuer genug Abstand, damit sich Zahl und Einheit bei
                    langen Werten nicht ueberlappen. */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-text-muted">Min</span>
                    <span className="relative mt-1 block">
                      <input
                        type="number"
                        min="0"
                        value={ziel.kalorien.min}
                        onChange={(e) => onKalorienAendern('min', e.target.value)}
                        placeholder={ziel.typ === 'proTag' ? 'z. B. 1800' : 'z. B. 500'}
                        className="w-full rounded-md border border-text-muted/30 py-1 pl-2 pr-10 text-text tabular-nums"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                        kcal
                      </span>
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-text-muted">Max</span>
                    <span className="relative mt-1 block">
                      <input
                        type="number"
                        min="0"
                        value={ziel.kalorien.max}
                        onChange={(e) => onKalorienAendern('max', e.target.value)}
                        placeholder={ziel.typ === 'proTag' ? 'z. B. 2200' : 'z. B. 700'}
                        className="w-full rounded-md border border-text-muted/30 py-1 pl-2 pr-10 text-text tabular-nums"
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                        kcal
                      </span>
                    </span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {ziel.typ === 'proMahlzeit' ? 'pro Mahlzeit' : 'pro Tag'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ziel.typ === 'proTag' && (
              <motion.div key="makro-eingabe" {...fadeProps(reduzierteBewegung)} className="mt-2">
                <p className="text-xs text-text-muted">Makro-Gesamtziel für den Tag (optional):</p>
                {/* grid-cols-3 statt flex-wrap - GENAU drei gleich breite
                    Spalten nebeneinander (Redesign), damit "Fett" nicht mehr
                    (wie zuvor bei flex-wrap) allein in einer zweiten Zeile
                    haengt. Label ueber dem Feld, Einheit "g" als Suffix
                    INNERHALB (siehe Kommentar an der Kalorien-Eingabe oben
                    zur Begruendung) - "Kohlenh." statt "Kohlenhydrate" als
                    Label, siehe MAKRO_FELDER-Kommentar oben. */}
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {MAKRO_FELDER.map(({ kategorie, label }) => (
                    <label key={kategorie} className="block">
                      <span className="text-xs text-text-muted">{label}</span>
                      <span className="relative mt-1 block">
                        <input
                          type="number"
                          min="0"
                          value={ziel.makro[kategorie]}
                          onChange={(e) => onMakroAendern(kategorie, e.target.value)}
                          placeholder="–"
                          className="w-full rounded-md border border-text-muted/30 py-1 pl-2 pr-5 text-text tabular-nums"
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                          g
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <KalorienrechnerCallout onOeffnen={onKalorienrechnerOeffnen} />
    </section>
  )
}

export default ZielEinstellungen
