// Darstellung (Hell/Dunkel): die Nutzerwahl "System / Hell / Dunkel" und ihre
// Umsetzung als <html data-theme="light|dark"> - die Tokens in index.css
// haengen daran (CLAUDE.md Abschnitt 5).
//
// System (Standard) folgt der iPhone-Einstellung LIVE (matchMedia-Listener),
// Hell/Dunkel sind feste Wahlen. Der Onboarding-Wizard ist ausgeklammert und
// bleibt IMMER hell: er wird in App.jsx von einem eigenen data-theme="light"-
// Wrapper umschlossen (siehe dort) - diese Datei weiss nichts vom Wizard.
//
// ACHTUNG: dieselbe Aufloesung steht als Inline-Skript in index.html, damit
// data-theme VOR dem ersten Paint gesetzt ist (sonst blitzt beim Start kurz
// der falsche Modus auf). Beide Stellen muessen dieselbe Logik haben.
import { useEffect, useState } from 'react'

export const DARSTELLUNG_LOCALSTORAGE_KEY = 'gusto-darstellung'

export const DARSTELLUNGEN = [
  { slug: 'system', label: 'System' },
  { slug: 'hell', label: 'Hell' },
  { slug: 'dunkel', label: 'Dunkel' },
]

const DUNKEL_ABFRAGE = '(prefers-color-scheme: dark)'

export function darstellungLaden() {
  try {
    const gespeichert = localStorage.getItem(DARSTELLUNG_LOCALSTORAGE_KEY)
    return DARSTELLUNGEN.some((d) => d.slug === gespeichert) ? gespeichert : 'system'
  } catch {
    return 'system'
  }
}

// 'system' -> dem iPhone folgen; sonst die feste Wahl. Liefert 'light' | 'dark'.
export function themeAufloesen(darstellung, systemIstDunkel) {
  if (darstellung === 'hell') return 'light'
  if (darstellung === 'dunkel') return 'dark'
  return systemIstDunkel ? 'dark' : 'light'
}

function systemIstDunkel() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DUNKEL_ABFRAGE).matches
}

// Haelt die Darstellungswahl als State, persistiert sie und setzt data-theme
// am <html>-Element (auch bei Aenderung der System-Einstellung, solange
// 'system' gewaehlt ist). Wird einmal in App.jsx aufgerufen.
export function useDarstellung() {
  const [darstellung, setDarstellung] = useState(darstellungLaden)
  const [systemDunkel, setSystemDunkel] = useState(systemIstDunkel)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const abfrage = window.matchMedia(DUNKEL_ABFRAGE)
    const beiAenderung = (e) => setSystemDunkel(e.matches)
    abfrage.addEventListener('change', beiAenderung)
    return () => abfrage.removeEventListener('change', beiAenderung)
  }, [])

  const theme = themeAufloesen(darstellung, systemDunkel)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(DARSTELLUNG_LOCALSTORAGE_KEY, darstellung)
    } catch {
      // Speichern nicht moeglich (z. B. privater Modus) - Wahl gilt trotzdem fuer die Sitzung.
    }
  }, [darstellung])

  return { darstellung, setDarstellung, theme }
}
