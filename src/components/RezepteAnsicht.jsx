import { useEffect, useState } from 'react'
import MahlzeitFilter from './MahlzeitFilter'
import SuessDeftigFilter from './SuessDeftigFilter'
import AnimatedButton from './AnimatedButton'
import RezeptKarte from './RezeptKarte'
import { MAHLZEITEN, standardMahlzeit } from '../mahlzeiten'
import { gefiltertePoolFuerRezepte, zufaelligesElement } from '../rezepteFilter'
import { rezeptKarteBerechnen } from '../rezeptKarteBerechnen'

// Reine Weiche zwischen den beiden Betriebsarten der Rezepte-Ansicht: bei
// ziel.typ === 'proTag' soll man (wie im "Planen"-Tab) alle aktiven
// Mahlzeiten abdecken koennen, OHNE Scrollen - dafuer die Tab-Variante
// RezepteTagesplan. Sonst (kein Ziel / proMahlzeit) die bisherige
// Einzel-Mahlzeit-Ansicht aus Schritt 2/3.
//
// KEIN inline DiaetFilter mehr in dieser Ansicht (weder Einzel- noch
// Tagesplan-Variante) - war der groesste verbleibende Platzfresser (72px,
// 2 Zeilen wegen Zeilenumbruch) auf dem Weg zur 390px-ohne-Scrollen-Vorgabe.
// Die Diaet-Auswahl bleibt ueber das Zahnrad-Icon (EinstellungenPanel)
// erreichbar - diaeten selbst bleibt als Wert weiterhin Pflicht-Prop (fuer
// die Pool-Filterung), nur der Aendern-Callback wird hier nicht mehr gebraucht.
function RezepteAnsicht({ rezepte, zutatenNachId, diaeten, ziel, makroZiele, tagesplanMahlzeiten, onMahlzeitenAnpassen }) {
  if (ziel.typ === 'proTag') {
    return (
      <RezepteTagesplan
        rezepte={rezepte}
        zutatenNachId={zutatenNachId}
        diaeten={diaeten}
        ziel={ziel}
        makroZiele={makroZiele}
        tagesplanMahlzeiten={tagesplanMahlzeiten}
        onMahlzeitenAnpassen={onMahlzeitenAnpassen}
      />
    )
  }

  return <RezepteEinzelansicht rezepte={rezepte} zutatenNachId={zutatenNachId} diaeten={diaeten} ziel={ziel} makroZiele={makroZiele} />
}

// mahlzeit und eigenschaft sind BEWUSST eigener, lokaler State (nicht der
// globale State der Einzel-Ansicht) - die bestehenden App.jsx-Handler fuer
// diese beiden Filter wuerfeln sofort auch die Einzel-Ansicht-Slots neu, was
// hier nicht passieren darf, nur weil man in der Rezepte-Ansicht einen
// anderen Filter waehlt. diaeten dagegen ist bewusst GETEILTER State (Prop
// von App.jsx) - Ernaehrungsform ist eine App-weite Praeferenz, dieselbe
// Instanz wie in der Einzel-Ansicht/im Einstellungen-Panel. ziel/makroZiele
// sind ebenfalls geteilter State - dieselben Kalorien-/Makro-Ziele wie in
// den Einstellungen, damit die Portionszahlen in RezeptKarte live darauf
// reagieren.
function RezepteEinzelansicht({ rezepte, zutatenNachId, diaeten, ziel, makroZiele }) {
  const [mahlzeit, setMahlzeit] = useState(standardMahlzeit)
  const [eigenschaft, setEigenschaft] = useState('')
  const [aktuellesRezept, setAktuellesRezept] = useState(null)

  const pool = gefiltertePoolFuerRezepte(rezepte, mahlzeit, diaeten, eigenschaft)

  // Waehlt bei jeder Aenderung des (geteilten) Diaet-Filters ein neues
  // passendes Rezept, UND einmalig, sobald die Rezepte fertig geladen sind
  // (rezepte wechselt dann von [] auf die echten Eintraege). mahlzeit und
  // eigenschaft loesen die Neuauswahl stattdessen direkt in ihren eigenen
  // Aendern-Handlern unten aus (analog zum bestehenden Muster in App.jsx),
  // deshalb absichtlich NICHT in dieser Abhaengigkeitsliste.
  useEffect(() => {
    const aktuellerPool = gefiltertePoolFuerRezepte(rezepte, mahlzeit, diaeten, eigenschaft)
    setAktuellesRezept(aktuellerPool.length > 0 ? zufaelligesElement(aktuellerPool) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaeten, rezepte])

  function mahlzeitAendern(neueMahlzeit) {
    if (neueMahlzeit === mahlzeit) {
      return
    }
    const neuerPool = gefiltertePoolFuerRezepte(rezepte, neueMahlzeit, diaeten, eigenschaft)
    setMahlzeit(neueMahlzeit)
    setAktuellesRezept(neuerPool.length > 0 ? zufaelligesElement(neuerPool) : null)
  }

  function eigenschaftAendern(neueEigenschaft) {
    if (neueEigenschaft === eigenschaft) {
      return
    }
    const neuerPool = gefiltertePoolFuerRezepte(rezepte, mahlzeit, diaeten, neueEigenschaft)
    setEigenschaft(neueEigenschaft)
    setAktuellesRezept(neuerPool.length > 0 ? zufaelligesElement(neuerPool) : null)
  }

  // "Anderes Rezept wuerfeln": kompletter Kombinations-Wechsel innerhalb des
  // aktuellen Pools - kein Einzel-Slot-Reroll, das gibt es hier bewusst
  // nicht (wuerde die feste, garantiert passende Rezept-Kombination aufloesen).
  function rezeptWuerfeln() {
    setAktuellesRezept(pool.length > 0 ? zufaelligesElement(pool) : null)
  }

  return (
    <>
      <MahlzeitFilter aktuell={mahlzeit} onAendern={mahlzeitAendern} />

      {(mahlzeit === 'fruehstueck' || mahlzeit === 'snack') && (
        <SuessDeftigFilter aktuell={eigenschaft} onAendern={eigenschaftAendern} />
      )}

      <RezeptKarte
        rezept={aktuellesRezept}
        zutatenNachId={zutatenNachId}
        ziel={ziel}
        makroZiele={makroZiele}
        onWuerfeln={rezeptWuerfeln}
        wuerfelnDeaktiviert={pool.length === 0}
      />
    </>
  )
}

// Feste Anzeige-Reihenfolge der Mahlzeit-Tabs (Fruehstueck -> Mittag ->
// Abend -> Snack), eingeschraenkt auf die laut Einstellungen aktivierten
// Mahlzeiten (tagesplanMahlzeiten, dieselbe Quelle wie der Tagesplan im
// "Planen"-Tab) - dieselbe Ableitung wie MAHLZEIT_REIHENFOLGE in App.jsx,
// hier lokal nachgebaut statt einen Export aus App.jsx zu ziehen, da
// MAHLZEITEN (der eigentliche Ordnungs-Ursprung) ohnehin schon importiert wird.
function aktiveMahlzeitenFuer(tagesplanMahlzeiten) {
  return MAHLZEITEN.filter(({ slug }) => tagesplanMahlzeiten.includes(slug))
}

// Wuerfelt fuer ALLE aktuell aktiven Mahlzeiten ein neues Rezept, unter
// Beibehaltung des jeweiligen Suess/Deftig-Filters (vorherigerStand) -
// Mahlzeiten OHNE bisherigen Eintrag (erstmaliges Laden, neu aktivierte
// Mahlzeit) starten mit '' (Alles). Reine Funktion, die einen kompletten
// neuen proMahlzeitState liefert - wird sowohl vom Auto-Wuerfel-Effekt als
// auch vom "Ganzen Tag neu planen"-Button verwendet (setProMahlzeitState
// akzeptiert eine Updater-Funktion mit genau dieser Signatur).
function alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenListe, rezepte, diaeten) {
  return (vorherigerStand) => {
    const neuerStand = {}
    for (const { slug } of aktiveMahlzeitenListe) {
      const eigenschaftFuerMahlzeit = vorherigerStand[slug]?.eigenschaft ?? ''
      const pool = gefiltertePoolFuerRezepte(rezepte, slug, diaeten, eigenschaftFuerMahlzeit)
      neuerStand[slug] = { eigenschaft: eigenschaftFuerMahlzeit, rezept: pool.length > 0 ? zufaelligesElement(pool) : null }
    }
    return neuerStand
  }
}

// Rezepte-Tagesplan: Tab-Leiste ueber den aktiven Mahlzeiten, darunter EXAKT
// dieselbe RezeptKarte wie in der Einzel-Ansicht - nur mit dem Rezept der
// gerade aktiven Tab-Mahlzeit. Jede Mahlzeit behaelt ihr eigenes gewuerfeltes
// Rezept UND ihren eigenen Suess/Deftig-Filter unabhaengig im Hintergrund
// (proMahlzeitState), damit ein reiner Tab-Wechsel (setAktiveMahlzeit) nie
// etwas verwirft - der Auto-Wuerfel-Effekt unten haengt bewusst NICHT von
// aktiveMahlzeit ab.
function RezepteTagesplan({ rezepte, zutatenNachId, diaeten, ziel, makroZiele, tagesplanMahlzeiten, onMahlzeitenAnpassen }) {
  const aktiveMahlzeitenListe = aktiveMahlzeitenFuer(tagesplanMahlzeiten)

  const [aktiveMahlzeit, setAktiveMahlzeit] = useState(
    () => aktiveMahlzeitenFuer(tagesplanMahlzeiten)[0]?.slug ?? 'mittag'
  )
  // { [mahlzeitTyp]: { eigenschaft, rezept } }
  const [proMahlzeitState, setProMahlzeitState] = useState({})

  // Wuerfelt ALLE aktiven Mahlzeiten neu, sobald sich die Diaet-Auswahl, die
  // Menge der aktiven Mahlzeiten (Mahlzeiten anpassen) oder die geladenen
  // Rezepte aendern - bewusst NICHT abhaengig von aktiveMahlzeit, ein reiner
  // Tab-Wechsel darf hier nichts auslösen.
  useEffect(() => {
    setProMahlzeitState(alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenListe, rezepte, diaeten))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaeten, tagesplanMahlzeiten, rezepte])

  // Faengt den Fall ab, dass die gerade sichtbare Mahlzeit ueber
  // "Mahlzeiten anpassen" deaktiviert wurde, waehrend man auf ihrem Tab war -
  // dann auf die erste verbleibende aktive Mahlzeit ausweichen.
  useEffect(() => {
    if (aktiveMahlzeitenListe.length > 0 && !aktiveMahlzeitenListe.some(({ slug }) => slug === aktiveMahlzeit)) {
      setAktiveMahlzeit(aktiveMahlzeitenListe[0].slug)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagesplanMahlzeiten])

  function eigenschaftAendern(neueEigenschaft) {
    setProMahlzeitState((aktuell) => {
      if ((aktuell[aktiveMahlzeit]?.eigenschaft ?? '') === neueEigenschaft) {
        return aktuell
      }
      const pool = gefiltertePoolFuerRezepte(rezepte, aktiveMahlzeit, diaeten, neueEigenschaft)
      return {
        ...aktuell,
        [aktiveMahlzeit]: { eigenschaft: neueEigenschaft, rezept: pool.length > 0 ? zufaelligesElement(pool) : null },
      }
    })
  }

  // "Anderes Rezept wuerfeln": trifft NUR die gerade im Tab sichtbare
  // Mahlzeit, alle anderen behalten ihr Rezept.
  function aktuelleMahlzeitWuerfeln() {
    setProMahlzeitState((aktuell) => {
      const eigenschaftFuerMahlzeit = aktuell[aktiveMahlzeit]?.eigenschaft ?? ''
      const pool = gefiltertePoolFuerRezepte(rezepte, aktiveMahlzeit, diaeten, eigenschaftFuerMahlzeit)
      return {
        ...aktuell,
        [aktiveMahlzeit]: { eigenschaft: eigenschaftFuerMahlzeit, rezept: pool.length > 0 ? zufaelligesElement(pool) : null },
      }
    })
  }

  // "Ganzen Tag neu planen": wuerfelt alle aktiven Mahlzeiten im Hintergrund
  // neu, auch die gerade nicht sichtbaren - analog zum bestehenden Button im
  // "Planen"-Tab (tagPlanen in App.jsx).
  function ganzenTagNeuPlanen() {
    setProMahlzeitState(alleAktivenMahlzeitenWuerfeln(aktiveMahlzeitenListe, rezepte, diaeten))
  }

  const aktuellerEintrag = proMahlzeitState[aktiveMahlzeit]
  const aktuellesRezept = aktuellerEintrag?.rezept ?? null
  const aktuelleEigenschaft = aktuellerEintrag?.eigenschaft ?? ''
  const aktuellerPool = gefiltertePoolFuerRezepte(rezepte, aktiveMahlzeit, diaeten, aktuelleEigenschaft)

  // Kompakte Tages-Makrosumme ueber ALLE aktiven Mahlzeiten - reiner
  // Render-Wert (kein State), reagiert dadurch automatisch auf jede
  // Kalorien-/Makroziel-Aenderung, genau wie die Einzel-Summe in RezeptKarte.
  const tagesSumme = aktiveMahlzeitenListe.reduce(
    (summe, { slug }) => {
      const karte = rezeptKarteBerechnen(proMahlzeitState[slug]?.rezept ?? null, zutatenNachId, ziel, makroZiele)
      if (!karte) {
        return summe
      }
      return {
        kalorien: summe.kalorien + karte.summeKalorien,
        protein: summe.protein + karte.summeProtein,
        carbs: summe.carbs + karte.summeCarbs,
        fett: summe.fett + karte.summeFett,
      }
    },
    { kalorien: 0, protein: 0, carbs: 0, fett: 0 }
  )

  return (
    <>
      {/* "Mahlzeiten anpassen" und Tages-Summe TEILEN sich eine Zeile (statt
          zwei), damit die kompakte Summe (Punkt 3) wirklich keinen
          nennenswerten vertikalen Platz frisst - wichtig auf 390px, wo jede
          Zeile zaehlt (siehe Scroll-Verifikation). */}
      <div className="mx-4 mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-text-muted">
          Tag gesamt: <span className="font-semibold text-text">{tagesSumme.kalorien.toFixed(0)} kcal</span> · P{' '}
          {tagesSumme.protein.toFixed(0)}g · C {tagesSumme.carbs.toFixed(0)}g · F {tagesSumme.fett.toFixed(0)}g
        </p>
        <AnimatedButton
          type="button"
          onClick={onMahlzeitenAnpassen}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          Mahlzeiten anpassen
        </AnimatedButton>
      </div>

      <div className="mt-2">
        <MahlzeitFilter aktuell={aktiveMahlzeit} onAendern={setAktiveMahlzeit} mahlzeiten={aktiveMahlzeitenListe} />
      </div>

      {(aktiveMahlzeit === 'fruehstueck' || aktiveMahlzeit === 'snack') && (
        <SuessDeftigFilter aktuell={aktuelleEigenschaft} onAendern={eigenschaftAendern} />
      )}

      <RezeptKarte
        rezept={aktuellesRezept}
        zutatenNachId={zutatenNachId}
        ziel={ziel}
        makroZiele={makroZiele}
        onWuerfeln={aktuelleMahlzeitWuerfeln}
        wuerfelnDeaktiviert={aktuellerPool.length === 0}
        zusatzAktion={
          <AnimatedButton
            type="button"
            onClick={ganzenTagNeuPlanen}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-card"
          >
            Ganzen Tag neu planen
          </AnimatedButton>
        }
      />
    </>
  )
}

export default RezepteAnsicht
