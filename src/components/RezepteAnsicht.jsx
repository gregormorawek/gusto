import MahlzeitFilter from './MahlzeitFilter'
import SuessDeftigFilter from './SuessDeftigFilter'
import AnimatedButton from './AnimatedButton'
import RezeptKarte from './RezeptKarte'
import { aktiveMahlzeitenFuer } from '../mahlzeiten'
import { gefiltertePoolFuerRezepte } from '../rezepteFilter'
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
//
// WICHTIG (Bugfix "Rezepte-Tab-Flackern"): Diese Komponente haelt bewusst
// KEINEN eigenen "welches Rezept ist gerade ausgewaehlt"-State mehr (mahlzeit/
// eigenschaft/aktuellesRezept/proMahlzeitState kommen komplett als Props von
// App.jsx). Grund: App.jsx rendert RezepteAnsicht per echtem Conditional-
// Rendering ({ansicht === 'rezepte' ? <RezepteAnsicht/> : ...}) - bei jedem
// Tab-Wechsel wird sie also unmountet und beim naechsten Oeffnen NEU
// gemountet. Lokaler State waere dabei jedes Mal auf seinen Initialwert
// zurueckgefallen (null/{}) und erst per Folge-Effekt NACH dem ersten Paint
// neu befuellt worden - in genau dieser Luecke zeigte RezeptKarte.jsx
// faelschlich "Fuer diese Filterkombination gibt es noch kein Rezept.",
// obwohl rezepte laengst geladen war (nur die lokale Auswahl noch nicht neu
// gewuerfelt). Mit dem State/den Handlern eine Ebene hoeher in App.jsx bleibt
// die Auswahl ueber Tab-Wechsel hinweg erhalten - siehe dortiger Kommentar
// bei rezepteMahlzeit/rezepteAktuellesRezept fuer die vollstaendige Herleitung.
function RezepteAnsicht({
  rezepteGeladen,
  rezepte,
  zutatenNachId,
  diaeten,
  ziel,
  makroZiele,
  tagesplanMahlzeiten,
  mahlzeit,
  onMahlzeitAendern,
  eigenschaft,
  onEigenschaftAendern,
  aktuellesRezept,
  onWuerfeln,
  aktiveMahlzeitTab,
  onAktiveMahlzeitTabAendern,
  proMahlzeitState,
  onEigenschaftFuerMahlzeitAendern,
  onMahlzeitTabWuerfeln,
  onGanzenTagNeuPlanen,
  onMahlzeitenAnpassen,
  onKochModusOeffnen,
  onZurEinkaufslisteHinzufuegen,
}) {
  if (ziel.typ === 'proTag') {
    return (
      <RezepteTagesplan
        rezepteGeladen={rezepteGeladen}
        rezepte={rezepte}
        zutatenNachId={zutatenNachId}
        diaeten={diaeten}
        ziel={ziel}
        makroZiele={makroZiele}
        tagesplanMahlzeiten={tagesplanMahlzeiten}
        aktiveMahlzeitTab={aktiveMahlzeitTab}
        onAktiveMahlzeitTabAendern={onAktiveMahlzeitTabAendern}
        proMahlzeitState={proMahlzeitState}
        onEigenschaftAendern={onEigenschaftFuerMahlzeitAendern}
        onWuerfeln={onMahlzeitTabWuerfeln}
        onGanzenTagNeuPlanen={onGanzenTagNeuPlanen}
        onMahlzeitenAnpassen={onMahlzeitenAnpassen}
        onKochModusOeffnen={onKochModusOeffnen}
        onZurEinkaufslisteHinzufuegen={onZurEinkaufslisteHinzufuegen}
      />
    )
  }

  return (
    <RezepteEinzelansicht
      rezepteGeladen={rezepteGeladen}
      rezepte={rezepte}
      zutatenNachId={zutatenNachId}
      diaeten={diaeten}
      ziel={ziel}
      makroZiele={makroZiele}
      mahlzeit={mahlzeit}
      onMahlzeitAendern={onMahlzeitAendern}
      eigenschaft={eigenschaft}
      onEigenschaftAendern={onEigenschaftAendern}
      aktuellesRezept={aktuellesRezept}
      onWuerfeln={onWuerfeln}
      onKochModusOeffnen={onKochModusOeffnen}
      onZurEinkaufslisteHinzufuegen={onZurEinkaufslisteHinzufuegen}
    />
  )
}

function RezepteEinzelansicht({
  rezepteGeladen,
  rezepte,
  zutatenNachId,
  diaeten,
  ziel,
  makroZiele,
  mahlzeit,
  onMahlzeitAendern,
  eigenschaft,
  onEigenschaftAendern,
  aktuellesRezept,
  onWuerfeln,
  onKochModusOeffnen,
  onZurEinkaufslisteHinzufuegen,
}) {
  const pool = gefiltertePoolFuerRezepte(rezepte, mahlzeit, diaeten, eigenschaft)

  return (
    <>
      <MahlzeitFilter aktuell={mahlzeit} onAendern={onMahlzeitAendern} />

      {(mahlzeit === 'fruehstueck' || mahlzeit === 'snack') && (
        <SuessDeftigFilter aktuell={eigenschaft} onAendern={onEigenschaftAendern} />
      )}

      <RezeptKarte
        rezepteGeladen={rezepteGeladen}
        rezept={aktuellesRezept}
        zutatenNachId={zutatenNachId}
        ziel={ziel}
        makroZiele={makroZiele}
        onWuerfeln={onWuerfeln}
        wuerfelnDeaktiviert={pool.length === 0}
        onKochModusOeffnen={onKochModusOeffnen}
        onZurEinkaufslisteHinzufuegen={onZurEinkaufslisteHinzufuegen}
      />
    </>
  )
}

// Rezepte-Tagesplan: Tab-Leiste ueber den aktiven Mahlzeiten, darunter EXAKT
// dieselbe RezeptKarte wie in der Einzel-Ansicht - nur mit dem Rezept der
// gerade aktiven Tab-Mahlzeit. aktiveMahlzeitTab kommt bereits als
// "effektiver" Wert von App.jsx (faengt dort den Fall ab, dass die zuletzt
// gewaehlte Mahlzeit ueber "Mahlzeiten anpassen" deaktiviert wurde - siehe
// dortiger Kommentar), muss hier also nicht mehr selbst korrigiert werden.
function RezepteTagesplan({
  rezepteGeladen,
  rezepte,
  zutatenNachId,
  diaeten,
  ziel,
  makroZiele,
  tagesplanMahlzeiten,
  aktiveMahlzeitTab,
  onAktiveMahlzeitTabAendern,
  proMahlzeitState,
  onEigenschaftAendern,
  onWuerfeln,
  onGanzenTagNeuPlanen,
  onMahlzeitenAnpassen,
  onKochModusOeffnen,
  onZurEinkaufslisteHinzufuegen,
}) {
  const aktiveMahlzeitenListe = aktiveMahlzeitenFuer(tagesplanMahlzeiten)

  const aktuellerEintrag = proMahlzeitState[aktiveMahlzeitTab]
  const aktuellesRezept = aktuellerEintrag?.rezept ?? null
  const aktuelleEigenschaft = aktuellerEintrag?.eigenschaft ?? ''
  const aktuellerPool = gefiltertePoolFuerRezepte(rezepte, aktiveMahlzeitTab, diaeten, aktuelleEigenschaft)

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
          {tagesSumme.protein.toFixed(0)}g · K {tagesSumme.carbs.toFixed(0)}g · F {tagesSumme.fett.toFixed(0)}g
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
        <MahlzeitFilter aktuell={aktiveMahlzeitTab} onAendern={onAktiveMahlzeitTabAendern} mahlzeiten={aktiveMahlzeitenListe} />
      </div>

      {(aktiveMahlzeitTab === 'fruehstueck' || aktiveMahlzeitTab === 'snack') && (
        <SuessDeftigFilter aktuell={aktuelleEigenschaft} onAendern={onEigenschaftAendern} />
      )}

      <RezeptKarte
        rezepteGeladen={rezepteGeladen}
        rezept={aktuellesRezept}
        zutatenNachId={zutatenNachId}
        ziel={ziel}
        makroZiele={makroZiele}
        onWuerfeln={onWuerfeln}
        wuerfelnDeaktiviert={aktuellerPool.length === 0}
        onKochModusOeffnen={onKochModusOeffnen}
        onZurEinkaufslisteHinzufuegen={onZurEinkaufslisteHinzufuegen}
        zusatzAktion={
          <AnimatedButton
            type="button"
            onClick={onGanzenTagNeuPlanen}
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
