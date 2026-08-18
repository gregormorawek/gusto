import { AnimatePresence, motion } from 'framer-motion'
import { IconFlame } from '@tabler/icons-react'
import { MAHLZEITEN, MAHLZEIT_ICON } from '../mahlzeiten'
import { DIAET_ICON } from './DiaetFilter'
import { kalorienZielGueltig } from '../kalorienZiel'
import { SPRING_REVEAL, motionPropsFuer } from '../motionConfig'
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
  // FUENFTER Bug an genau dieser Karte, GEGENTEILIGER Fix zu den vorigen
  // vier (die alle den Hoehen-Uebergangs-Hook useBeobachteteHoehe hier
  // reparieren wollten - siehe Git-Historie dieser Datei fuer die
  // Einzelheiten aller vier): der Hook wurde HIER wieder ENTFERNT, statt
  // erneut repariert. Konkret gefunden per getComputedStyle()-Vergleich im
  // Ruhezustand (also KEIN Timing-/Animations-Problem): Tailwinds globales
  // Preflight setzt box-sizing:border-box auf ALLE Elemente. Der Hook maass
  // die Hoehe am INNEREN, paddinglosen Content-Wrapper (ref) und setzte sie
  // per style.height auf das AEUSSERE Element, das zugleich das Padding
  // trug (siehe vorigem Fix "VIERTER Bug" oben in der Historie) - bei
  // border-box zieht der Browser Padding VON der gesetzten Hoehe AB statt
  // es dazuzuaddieren. Ergebnis: style.height=84px (reine Innenmasse ohne
  // Padding) minus 40px Padding = nur noch 44px tatsaechlich sichtbare
  // Content-Flaeche in einer 84px hohen Box - obwohl der Inhalt selbst
  // (scrollHeight) 124px braucht. Die letzte Zeile (Makros bzw. Makros +
  // Mahlzeiten-Chips) wurde dadurch DAUERHAFT abgeschnitten, nicht nur
  // waehrend einer Animation. Ein content-box-Fix waere moeglich gewesen,
  // aber vier aufeinanderfolgende, an genau dieser Stelle immer wieder wild
  // gewordene Bugs rund um diesen Hook (siehe Kommentare in der Git-
  // Historie: Margin-Collapse, Rueckwaerts-Navigation-Freeze, Mount-Popup,
  // jetzt border-box-Clipping) sind Grund genug, ihn hier komplett
  // wegzulassen - die Karte bestimmt ihre Hoehe jetzt rein natuerlich
  // (height:auto, kein overflow-hidden mit fixierter Pixelhoehe). Das
  // Ein-/Ausblenden der Karte selbst uebernimmt weiterhin ihr eigener
  // opacity/y-Fade unten, das Ein-/Ausblenden einzelner Sektionen deren
  // jeweils eigener AnimatePresence-Fade - beide brauchen keinen
  // umschliessenden Hoehen-Uebergang, um weich zu wirken. Der grosse
  // Card-Level-Sprung, den der Hook urspruenglich verhindern sollte (siehe
  // Git-Historie), ist ausserdem seit dem Umbau des Frage-Bereichs auf
  // Top-Ausrichtung statt Zentrierung (siehe OnboardingWizard.jsx,
  // "PROBLEM 1"-Bugfix) strukturell entschaerft: der Frage-Bereich haengt
  // nicht mehr von der Footer-Hoehe ab, ein wachsender/schrumpfender Footer
  // verschiebt ihn dadurch nicht mehr nachtraeglich.
  //
  // useBeobachteteHoehe.js selbst bleibt unveraendert bestehen -
  // ZielEinstellungen.jsx braucht ihn weiterhin fuer seinen eigentlichen
  // Zweck (siehe dortiger Kommentar), nur diese fehlerhafte Uebertragung
  // hierher wird rueckgaengig gemacht.
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
      className="rounded-[14px] bg-card p-5 shadow-sm"
    >
      {/* Kein umschliessender Hoehen-Uebergang mehr (siehe Kommentar oben,
          "FUENFTER Bug") - Hoehe ist rein natuerlich (height:auto). Jede
          Sektion animiert nur noch sich selbst per eigenem AnimatePresence-
          Fade beim Kommen/Gehen. */}
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
    </motion.div>
  )
}

export default WizardTageskarte
