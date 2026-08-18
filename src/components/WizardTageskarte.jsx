import { AnimatePresence, motion } from 'framer-motion'
import { IconFlame } from '@tabler/icons-react'
import { MAHLZEITEN, MAHLZEIT_ICON } from '../mahlzeiten'
import { DIAET_ICON } from './DiaetFilter'
import { kalorienZielGueltig } from '../kalorienZiel'
import { HOEHEN_UEBERGANG_EASING, HOEHEN_UEBERGANG_MS, SPRING_REVEAL, motionPropsFuer } from '../motionConfig'
import { useBeobachteteHoehe } from '../useBeobachteteHoehe'
import AnimierteZahl from './AnimierteZahl'

const DIAET_LABEL = {
  vegan: 'Vegan',
  vegetarisch: 'Vegetarisch',
  glutenfrei: 'Glutenfrei',
  keine: 'Alles',
}

// Die drei Makro-Felder aus dem Tages-Makroziel (ziel.makro, nur bei
// proTag gesetzt) - Reihenfolge wie in ZielEinstellungen.
const MAKRO_FELDER = [
  { kategorie: 'protein', label: 'P' },
  { kategorie: 'carbs', label: 'K' },
  { kategorie: 'fett', label: 'F' },
]

// Ein einzelnes Makro-Feld ist "gesetzt", wenn ein positiver Zahlenwert
// eingetragen wurde - leer oder 0 zaehlt nicht (analog zu kalorienZielGueltig).
function makroWertGueltig(wert) {
  const zahl = Number(wert)
  return wert !== '' && Number.isFinite(zahl) && zahl > 0
}

// Ein einzelner Icon-Chip (Mahlzeit ODER Diaetform) - der Chip selbst ist
// IMMER sichtbar (durchgezogener, dezenter Rand/blass), nur die getoente
// "aktiv"-Ebene darueber wird per AnimatePresence ein-/ausgeblendet, wenn
// sich der aktiv-Status aendert. So entsteht das gewuenschte "scale+fade mit
// Ueberschwingen bei Auswahl, scale-down+fade-out bei Abwahl" OHNE dass der
// Chip selbst ver- oder auftaucht. farbKlasse bestimmt Terrakotta (Mahlzeit)
// vs. Oliv (Diaetform). Rand-Farbe/-Deckkraft (text-muted/30) bewusst
// identisch zum Keramik-Auswahl-Zustand in AuswahlChip.jsx, damit der
// dezente Rand app-weit einheitlich wirkt - vorher gestrichelt, was seit dem
// "durchgezogen statt gestrichelt"-Umbau der Auswahl-Chips (siehe
// AuswahlChip.jsx) optisch nicht mehr zusammenpasste.
function IconChip({ Icon, label, aktiv, farbKlasse, reduzierteBewegung }) {
  return (
    <div className="relative flex flex-col items-center gap-1 rounded-2xl border border-text-muted/30 px-3 py-2">
      <AnimatePresence>
        {aktiv && (
          <motion.span
            {...motionPropsFuer(reduzierteBewegung, {
              initial: { opacity: 0, scale: 0.6 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 0.85 },
              transition: SPRING_REVEAL,
            })}
            className={`absolute inset-0 rounded-2xl border ${farbKlasse.aktivBorder} ${farbKlasse.aktivBg}`}
          />
        )}
      </AnimatePresence>
      <Icon
        size={22}
        stroke={1.75}
        className={`relative ${aktiv ? farbKlasse.aktivText : 'text-text-muted/50'}`}
      />
      <span className={`relative text-[11px] font-medium ${aktiv ? farbKlasse.aktivText : 'text-text-muted/50'}`}>
        {label}
      </span>
    </div>
  )
}

const TERRAKOTTA = { aktivBorder: 'border-primary', aktivBg: 'bg-primary/15', aktivText: 'text-primary' }
const OLIVE = { aktivBorder: 'border-secondary', aktivBg: 'bg-secondary/15', aktivText: 'text-secondary' }

// Live-Vorschau des Onboarding-Wizards: statt eines abstrakten Fortschritts-
// Fuellstands zeigt diese Tageskarte die ECHTEN, bereits gegebenen
// Antworten (Kalorienziel/Mahlzeiten/Ernaehrungsform/Makro-Gesamtziel) und
// waechst mit jedem Schritt inhaltlich mit. Erscheint erst, sobald
// mindestens ein Teil echten Inhalt hat - kein leerer Platzhalter-Rahmen auf
// Schritt 1, bevor ein Kalorienziel gewaehlt wurde.
//
// WICHTIG: jede Sektion zeigt NUR bereits VERLASSENE Schritte (schritt >
// statt schritt >=) - die Auswahl des gerade aktiven Schritts ist ja schon
// oben in den Chips sichtbar, eine zusaetzliche Live-Anzeige hier waere
// redundant. Kalorienziel UND Makro-Gesamtziel werden beide in Schritt 1
// eingegeben, daher teilen sie sich dieselbe Bedingung (schritt > 1). Die
// Diaet-Sektion (schritt > 3) wird dadurch in der Praxis nie sichtbar, da
// die Karte ab Schritt 4 (siehe OnboardingWizard, schritt <= 3) gar nicht
// mehr gerendert wird - bewusst in Kauf genommen, siehe Ruecksprache.
function WizardTageskarte({ schritt, ziel, mahlzeit, tagesplanMahlzeiten, proTag, diaeten, reduzierteBewegung }) {
  // Hoehen-Uebergang fuer die Karte selbst (siehe useBeobachteteHoehe.js) -
  // OHNE das haette jede neu hinzukommende Sektion (Kalorien/Mahlzeiten/
  // Diaet/Makros) die Karte HART springen lassen statt sanft zu wachsen,
  // und damit den darunterliegenden "Weiter"-Button abrupt verschoben. Per
  // getBoundingClientRect()-Messung ueber einen echten Schritt-2-zu-3-
  // Wechsel konkret nachgewiesen: der Button sprang instant von 756px auf
  // 781px Top-Position (Mahlzeiten-Sektion mountet), kurz darauf zurueck auf
  // 756px (Haupt-Content-Uebergang schliesst ab) - zwei ueberlagerte,
  // jeweils unanimierte Spruenge (siehe Bugfix "Wizard-Schritt-Uebergaenge
  // glaetten"). Selbes Muster wie ZielEinstellungen.jsx (siehe dortiger
  // Kommentar zur Herleitung).
  //
  // Diese Karte war es auch, an der ein zweiter, subtilerer Bug in
  // useBeobachteteHoehe selbst gefunden wurde (siehe dortiger Kommentar zu
  // "CALLBACK-REF statt useRef()"): weil diese Komponente bei !hatInhalt
  // (z. B. Schritt 1, bevor ein Kalorienziel gesetzt ist) frueh null
  // zurueckgibt, war das gemessene Element beim allerersten Render noch gar
  // nicht vorhanden - der ResizeObserver wurde dadurch nie erstellt, die
  // Karte blieb beim Zurueck-Navigieren (Schritt 3->2) hart auf der
  // Schritt-3-Groesse eingefroren. Der Hook selbst wurde seitdem robuster
  // gemacht (Callback-Ref statt einmaligem Mount-Effekt), diese
  // Verwendungsstelle musste dafuer nicht geaendert werden.
  //
  // wachstumBeimMount:true - und ein DRITTER Bug, wieder an genau dieser
  // Karte: weil sie bei !hatInhalt fruh null zurueckgibt, erscheint sie beim
  // Wechsel Schritt 1->2 zum ALLERERSTEN Mal - SOFORT in voller Hoehe, ohne
  // vorherigen Wert, von dem aus eine Transition haette starten koennen.
  // Da diese Karte im Footer unterhalb des zentrierten Frage-Bereichs sitzt,
  // verschob dieses schlagartige Platz-Beanspruchen den (zu dem Zeitpunkt
  // selbst noch unveraenderten) Frage-Bereich augenblicklich und OHNE jede
  // Animation - ein von der eigentlichen Schritt-Crossfade-Aufloesung
  // voellig entkoppeltes zweites Bewegungs-Ereignis ("Doppel-Sprung"/
  // Nachjustieren, siehe Bugfix "Wizard-Uebergaenge, dritter Versuch",
  // dortiger Kommentar in useBeobachteteHoehe.js fuer die per
  // getBoundingClientRect()-Serie nachgewiesenen Zahlen). Mit
  // wachstumBeimMount waechst die Karte beim allerersten Erscheinen sanft
  // aus 0 statt schlagartig - der Footer beansprucht seinen Platz dadurch
  // GRADUELL, synchron mit statt NACH der Schritt-Crossfade-Bewegung.
  //
  // VIERTER Bug, wieder an derselben Stelle gefunden (per
  // getBoundingClientRect() auf ".rounded-[14px].bg-card.p-5" hart
  // nachgewiesen: 9ms nach dem Klick bereits 40px hoch, obwohl hoehe zu dem
  // Zeitpunkt noch 0 war): das p-5-Padding sass bisher auf der AEUSSEREN,
  // NICHT hoehen-animierten motion.div, die den overflow-hidden/height-
  // Wrapper nur umschliesst. Dieses Padding (20px oben + 20px unten = 40px)
  // ist deshalb IMMER sofort da, unabhaengig von wachstumBeimMount, das nur
  // den INNEREN Inhalt bei 0 startet - die Karte poppte dadurch trotz des
  // dritten Fixes weiterhin sofort auf 40px auf, statt komplett bei 0 zu
  // beginnen. Fix unten: padding-top/-bottom liegen jetzt auf demselben
  // Element wie overflow-hidden/height UND sind an denselben Vor-Unlock-
  // Zustand gekoppelt (hoehe === 0 ist hier eindeutig, da eine gerenderte
  // Karte durch hatInhalt oben immer echten, nie 0px hohen Inhalt hat) - sie
  // wachsen dadurch synchron mit der Hoehe von 0 auf 20px, statt konstant zu
  // bleiben. Seitliches Padding (px-5) bleibt unangetastet, da es die
  // vertikale Position nachfolgender Geschwister nicht beeinflusst.
  const [inhaltRef, hoehe] = useBeobachteteHoehe({ wachstumBeimMount: true })
  const nochNichtGewachsen = hoehe === 0

  const kalorienGueltig = ziel.typ !== 'kein' && kalorienZielGueltig(ziel)
  const kalorienMittelwert = kalorienGueltig
    ? Math.round((Number(ziel.kalorien.min) + Number(ziel.kalorien.max)) / 2)
    : 0

  const ausgewaehlteMahlzeiten = proTag ? tagesplanMahlzeiten : [mahlzeit]
  const zeigeKalorien = schritt > 1 && kalorienGueltig
  const zeigeMahlzeiten = schritt > 2
  const zeigeDiaet = schritt > 3 && diaeten.length > 0

  // Makro-Gesamtziel wird bereits in Schritt 1 (bei proTag) eingegeben,
  // erscheint aber layoutmaessig als LETZTE Zeile der Karte (unterhalb des
  // Diaet-Badges) - die JSX-Reihenfolge unten sorgt dafuer automatisch,
  // auch wenn Mahlzeiten/Diaet noch gar nicht gerendert werden.
  const sichtbareMakros = proTag ? MAKRO_FELDER.filter(({ kategorie }) => makroWertGueltig(ziel.makro[kategorie])) : []
  const zeigeMakros = schritt > 1 && sichtbareMakros.length > 0

  const hatInhalt = zeigeKalorien || zeigeMahlzeiten || zeigeDiaet || zeigeMakros
  if (!hatInhalt) {
    return null
  }

  const zeigtEtwasVorMakros = zeigeKalorien || zeigeMahlzeiten || zeigeDiaet

  return (
    <motion.div
      {...motionPropsFuer(reduzierteBewegung, {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: 'easeOut' },
      })}
      className="overflow-hidden rounded-[14px] bg-card px-5 shadow-sm transition-[height,padding-top,padding-bottom] motion-reduce:transition-none"
      style={{
        height: hoehe,
        // Siehe Kommentar zu "nochNichtGewachsen" oben - Padding wandert
        // synchron mit der Hoehe von 0 auf die eigentlichen p-5-20px, statt
        // (wie zuvor auf der aeusseren, unanimierten Huelle) konstant zu
        // bleiben und die Karte dadurch sofort auf 40px aufpoppen zu lassen.
        paddingTop: nochNichtGewachsen ? 0 : 20,
        paddingBottom: nochNichtGewachsen ? 0 : 20,
        transitionDuration: `${HOEHEN_UEBERGANG_MS}ms`,
        transitionTimingFunction: HOEHEN_UEBERGANG_EASING,
      }}
    >
      {/* Hoehe folgt per CSS transition der per ResizeObserver beobachteten
          Hoehe von inhaltRef (siehe useBeobachteteHoehe-Aufruf oben) - NICHT
          framer-motions layout-Prop, siehe dortiger Kommentar zur Herleitung.
          flow-root auf inhaltRef verhindert Margin-Collapse der ersten
          Sektion (analog zu ZielEinstellungen.jsx). overflow-hidden/height/
          padding sitzen jetzt direkt auf dieser (aeusseren) motion.div selbst
          - siehe Kommentar zu "nochNichtGewachsen" oben, warum das Padding
          nicht mehr auf einer separaten, unanimierten Huelle sitzen darf. */}
      <div ref={inhaltRef} className="flow-root">
        <AnimatePresence>
          {zeigeKalorien && (
            <motion.div
              key="kalorien"
              {...motionPropsFuer(reduzierteBewegung, {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 12 },
                transition: { duration: 0.3, ease: 'easeOut' },
              })}
              className="flex items-center gap-2"
            >
              <IconFlame size={28} stroke={1.75} className="shrink-0 text-primary" />
              <p className="font-display text-4xl font-semibold text-text">
                <AnimierteZahl wert={kalorienMittelwert} />
                <span className="ml-1 text-base font-medium text-text-muted">kcal</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {zeigeMahlzeiten && (
            <motion.div
              key="mahlzeiten"
              {...motionPropsFuer(reduzierteBewegung, {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 12 },
                transition: { duration: 0.3, ease: 'easeOut' },
              })}
              className={`flex gap-2 ${zeigeKalorien ? 'mt-4' : ''}`}
            >
              {MAHLZEITEN.map(({ slug, label }) => (
                <IconChip
                  key={slug}
                  Icon={MAHLZEIT_ICON[slug]}
                  label={label}
                  aktiv={ausgewaehlteMahlzeiten.includes(slug)}
                  farbKlasse={TERRAKOTTA}
                  reduzierteBewegung={reduzierteBewegung}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {zeigeDiaet && (
            <motion.div
              key="diaet"
              {...motionPropsFuer(reduzierteBewegung, {
                initial: { opacity: 0, y: 16 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 16 },
                transition: SPRING_REVEAL,
              })}
              className={`flex flex-wrap gap-2 ${zeigeMahlzeiten ? 'mt-4' : ''}`}
            >
              {Object.keys(DIAET_ICON).map((slug) => (
                <IconChip
                  key={slug}
                  Icon={DIAET_ICON[slug]}
                  label={DIAET_LABEL[slug]}
                  aktiv={diaeten.includes(slug)}
                  farbKlasse={OLIVE}
                  reduzierteBewegung={reduzierteBewegung}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {zeigeMakros && (
            <motion.div
              key="makros"
              {...motionPropsFuer(reduzierteBewegung, {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: 12 },
                transition: { duration: 0.3, ease: 'easeOut' },
              })}
              className={`flex gap-4 ${zeigtEtwasVorMakros ? 'mt-4' : ''}`}
            >
              {sichtbareMakros.map(({ kategorie, label }) => (
                <p key={kategorie} className="text-sm font-medium text-text-muted">
                  <span className="text-text-muted/70">{label}</span>{' '}
                  <AnimierteZahl wert={Math.round(Number(ziel.makro[kategorie]))} className="font-display text-lg font-semibold text-text" />
                  <span className="text-xs">g</span>
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default WizardTageskarte
