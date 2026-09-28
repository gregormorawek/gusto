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

// Sendet die GEWAEHLTE Darstellung ('system'/'hell'/'dunkel', NICHT das
// bereits aufgeloeste 'light'/'dark'!) an die iOS-Bruecke (siehe
// ThemeBridge.swift + MainViewController.swift, configureThemeBridge()).
// Reiner No-Op im Browser/auf Web (window.webkit existiert dort nicht) -
// kein Capacitor.isNativePlatform()-Check noetig, das optionale Chaining
// reicht. Aufgerufen von App.jsx mit dem WIZARD-bewussten Wert (waehrend
// der Wizard sichtbar ist immer 'hell', siehe dortiger Aufruf) - anders
// als das reine data-theme am <html>, das den Wizard-Sonderfall nicht kennt.
//
// GEFUNDENE URSACHE eines Real-Device-Bugreports ("Nach dem Wizard blieb
// die App hell, obwohl iPhone+Darstellung auf Dunkel/System standen - erst
// nach Neustart korrekt" UND "Auf 'System' zurueckstellen wechselt nicht
// sofort"), von Gregor korrekt vermutet und per Simulator-Log bestaetigt:
// ein Kreisschluss. ThemeBridge.anwenden() setzt overrideUserInterfaceStyle
// auf FENSTER-Ebene - das faerbt danach AUCH window.matchMedia(
// 'prefers-color-scheme: dark') fuer die gesamte WebView um (siehe
// ThemeBridge.swift). Wurde hier zuvor das bereits AUFGELOESTE theme
// ('light'/'dark') gesendet, las useDarstellung() beim naechsten Mal den
// eigenen, kuenstlich erzwungenen Wert aus matchMedia zurueck und schickte
// ihn erneut - ein sich selbst bestaetigender Fehlschluss, der sich nie
// von selbst aufloeste (nur ein echter System-Wechsel oder ein Neustart
// mit frischer, unveraendert dynamischer Fenster-Farbe setzte ihn zurueck).
//
// Der Ausweg: NICHT das Ergebnis schicken, sondern die Entscheidung NATIV
// treffen lassen. Bei 'system' hebt ThemeBridge.anwenden() den Zwang mit
// overrideUserInterfaceStyle = .unspecified komplett auf, WKWebView
// erbt danach wieder ehrlich vom echten System - erst DAS macht
// matchMedia wieder vertrauenswuerdig fuer den naechsten Wechsel auf
// 'system'. useDarstellung() liest den echten Systemwert weiterhin nur
// ueber den 'change'-Listener auf der MediaQueryList (siehe oben) -
// dieser feuert zuverlaessig, sobald WKWebView nach dem Aufheben des
// Zwangs neu mit dem System abgleicht.
export function nativeThemeSetzen(modus) {
  try {
    window.webkit?.messageHandlers?.themeBridge?.postMessage({ modus })
  } catch {
    // Kein natives Umfeld oder Bruecke (noch) nicht registriert - bewusst stumm.
  }
}
