import AnimatedButton from './AnimatedButton'

// Zentraler "Keramik"-Auswahl-Zustand: statt einer komplett terrakotta
// gefuellten Flaeche wirkt "ausgewaehlt" wie leicht eingedrueckt (Rand
// durchgezogen + Schatten kehrt sich nach innen + minimaler Versatz nach
// unten), dazu - falls ein Icon uebergeben wird - ein Icon-Kreis, der bei
// Auswahl terrakotta gefuellt wird (Icon invertiert in Karten-Weiss). Diese
// EINE Komponente ersetzt die bisher 5-fach duplizierten Pillen-Tailwind-
// Strings in MahlzeitFilter, SuessDeftigFilter, DiaetFilter (siehe Verlauf).
//
// Zwei Interaktions-Modi ueber den input-Prop, um die bisherige A11y-
// Semantik pro Einsatzort zu erhalten, bei IDENTISCHER visueller
// Darstellung:
// - input weggelassen -> rendert als Button (Single-Select-Filter wie
//   MahlzeitFilter/SuessDeftigFilter, Klick loest onClick aus).
// - input={{ type: 'checkbox'|'radio', checked, onChange, disabled, name }}
//   -> rendert als <label> mit einem visuell versteckten (sr-only), aber
//   fuer Screenreader/Tastatur weiterhin vorhandenen nativen Input. Der
//   sichtbare Haken/Punkt der nativen Checkbox/Radio entfaellt zugunsten des
//   neuen Auswahl-Zustands.
//
// groesse unterscheidet drei Formen: die ueberall verwendete kompakte Pille
// (Default, schrumpft auf ihren Inhalt), die groessere, quadratischere
// Kachel-Form fuer das Wizard-2x2-Mahlzeitraster (siehe MahlzeitFilter
// layout="raster2x2") sowie 'breit' - dieselbe horizontale Icon-links/Text-
// daneben-Anordnung wie 'kompakt', aber volle Breite ihres Containers statt
// Inhalts-Breite, fuer gestapelte (statt umbrechende) Chip-Gruppen wie
// Kalorienziel (ZielEinstellungen.jsx) und Ernaehrungsform (DiaetFilter.jsx)
// - siehe dortige Kommentare zur Herleitung ("brechen unsauber um").
const RAND_UND_SCHATTEN =
  'transition-[transform,box-shadow,border-color] duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

// Einsink-Intensitaet "Mittel": bg-primary/20 statt purer bg-card-Flaeche
// macht den ausgewaehlten Zustand spuerbar waermer (aber nicht volltonig
// gefuellt wie im alten Design), der Inset-Schatten nutzt einen warmen
// Farbton (text-Token bei 35% statt Tailwinds sehr blassem shadow-inner-
// Default) fuer ein deutliches "gedruecktes" Gefuehl, translate-y-0.5 (2px)
// statt translate-y-px (1px) fuer einen wahrnehmbaren, aber nicht
// uebertriebenen Versatz.
//
// Schatten-Y-Versatz bewusst 0 (nicht z. B. 2px wie in einer frueheren
// Version) - GEFUNDENE URSACHE eines gemeldeten "ungleiches Padding oben/
// unten bei zweizeiligen Options-Zeilen"-Bugs (siehe OptionZeile in
// Kalorienrechner.jsx, die denselben Schatten-Wert verwendet): per
// getBoundingClientRect()-Messung (Label-oben-Abstand vs. Erklaerzeile-
// unten-Abstand, aktiv vs. inaktiv) nachgewiesen, dass das tatsaechliche
// Padding in JEDEM Zustand exakt identisch ist (13px oben UND unten) - der
// Bug war rein optisch: ein Y-Versatz auf einem INSET-Schatten konzentriert
// die Verdunkelung einseitig am oberen Innenrand (weicher Verlauf oben,
// harte Kante unten), wodurch der untere Abstand trotz identischer Zahlen
// visuell enger wirkte. Ein symmetrischer Schatten (Y-Versatz 0, dafuer
// etwas groesserer Blur-Radius 6px statt 5px als Ausgleich fuer die
// wegfallende Versatz-Tiefe) verdunkelt alle vier Innenraender gleich stark
// und behebt die Asymmetrie, OHNE den "eingedrueckt"-Effekt selbst
// (Rand+Hintergrund+translate-y-0.5+Schatten in Kombination) zu veraendern.
function containerKlassen({ aktiv, groesse, deaktiviert }) {
  const form =
    groesse === 'gross'
      ? 'flex-col gap-1.5 rounded-2xl px-4 py-3 w-full'
      : groesse === 'breit'
        ? 'w-full gap-2.5 rounded-full px-4 py-1'
        : 'gap-1.5 rounded-full px-3 py-1.5'
  const rand = aktiv
    ? 'border-primary bg-primary/20 shadow-[inset_0_0_6px_0_rgba(62,46,34,0.35)] translate-y-0.5'
    : 'border-text-muted/30 bg-card shadow-sm hover:border-primary/50'
  const deaktivierung = deaktiviert ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
  return `relative flex items-center ${form} border ${rand} ${deaktivierung} ${RAND_UND_SCHATTEN}`
}

function iconKreisKlassen(aktiv, groesse) {
  const groessenKlasse = groesse === 'gross' ? 'h-9 w-9' : 'h-6 w-6'
  const farbe = aktiv ? 'bg-primary text-card' : 'bg-text-muted/10 text-text-muted'
  return `flex shrink-0 items-center justify-center rounded-full ${groessenKlasse} ${farbe}`
}

// Inhalt (Icon-Kreis + Label) ist fuer Button- und Input-Modus identisch -
// nur EINMAL definiert, damit beide Zweige unten nicht auseinanderlaufen.
// Kein zusaetzliches Auswahl-Symbol mehr (frueher ein Oliv-Punkt) - der
// Einsink-Zustand (Rand/Schatten/Versatz in containerKlassen) markiert
// "aktiv" bereits ausreichend deutlich, unabhaengig davon ob Einzel- oder
// Mehrfachauswahl.
function ChipInhalt({ Icon, label, aktiv, groesse }) {
  return (
    <>
      {Icon && (
        <span className={iconKreisKlassen(aktiv, groesse)}>
          <Icon size={groesse === 'gross' ? 18 : 14} stroke={2} />
        </span>
      )}
      <span className={`text-sm ${aktiv ? 'font-semibold text-text' : 'font-medium text-text-muted'}`}>{label}</span>
    </>
  )
}

function AuswahlChip({ Icon, label, aktiv, groesse = 'kompakt', onClick, input }) {
  if (input) {
    const { type, checked, onChange, disabled, name } = input
    return (
      <label className={containerKlassen({ aktiv, groesse, deaktiviert: disabled })}>
        <input
          type={type}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
        />
        <ChipInhalt Icon={Icon} label={label} aktiv={aktiv} groesse={groesse} />
      </label>
    )
  }

  return (
    <AnimatedButton type="button" onClick={onClick} className={containerKlassen({ aktiv, groesse, deaktiviert: false })}>
      <ChipInhalt Icon={Icon} label={label} aktiv={aktiv} groesse={groesse} />
    </AnimatedButton>
  )
}

export default AuswahlChip
