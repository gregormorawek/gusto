import { motion } from 'framer-motion'

// Gemeinsamer Button fuer alle Haupt-Interaktionen (Wuerfeln, Reroll,
// Einstellungen, Filter-Toggles, ...): verhaelt sich wie ein normales
// <button> (alle Props/Children werden durchgereicht), zusaetzlich ein
// kurzes Scale-down-Feedback beim Draenken (whileTap), damit sich jede
// Aktion in der App gleich anfuehlt.
function AnimatedButton({ children, ...props }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} {...props}>
      {children}
    </motion.button>
  )
}

export default AnimatedButton
