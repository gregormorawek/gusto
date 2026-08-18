import { motion } from 'framer-motion'

// Zwei kleine, gegenlaeufig getimte Dampf-Schwaden - urspruenglich nur fuers
// Kochmuetzen-Icon im "Jetzt kochen"-Button (RezeptKarte.jsx) gebaut, jetzt
// hierher extrahiert, damit KochModus.jsx dieselbe Optik fuer die
// Schritt-Icons "kochen"/"braten"/"roesten" wiederverwenden kann statt sie
// zweimal zu bauen. Rein dekorativ, dezent geloopt - der Aufrufer rendert
// diese Komponente NUR bei aktiver Bewegung (siehe reduzierteBewegung-Checks
// an den Verwendungsstellen), komplett weggelassen statt nur pausiert, damit
// unter reduzierter Bewegung wirklich keine Restanimation im DOM haengen
// bleibt.
//
// punktFarbe ist bewusst ein Prop statt fest verdrahtet: am urspruenglichen
// "Jetzt kochen"-Button (dunkelgruener bg-secondary-Hintergrund) sorgen
// cremefarbene Punkte (bg-card/70) fuer Kontrast. Die Schritt-Icons im
// Kochmodus (KochModus.jsx) sitzen dagegen auf einem HELLEN bg-primary/10-
// Kreis - dieselben cremefarbenen Punkte waeren dort praktisch unsichtbar
// (per Screenshot-Test bestaetigt). Default bleibt der Button-Farbton, damit
// die bestehende Verwendungsstelle unveraendert bleibt.
function DampfSchwaden({ punktFarbe = 'bg-card/70' }) {
  return (
    <>
      <motion.span
        className={`absolute -top-1 left-1 h-1 w-1 rounded-full blur-[1px] ${punktFarbe}`}
        animate={{ y: [0, -8, -14], opacity: [0, 0.8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0 }}
      />
      <motion.span
        className={`absolute -top-1 right-1 h-1 w-1 rounded-full blur-[1px] ${punktFarbe}`}
        animate={{ y: [0, -8, -14], opacity: [0, 0.8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
      />
    </>
  )
}

export default DampfSchwaden
