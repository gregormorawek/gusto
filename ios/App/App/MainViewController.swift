import UIKit
import Capacitor

// Gusto hat kein Dark-Theme im Design-System (siehe CLAUDE.md, Design-
// Vertrag "Warm & natuerlich") - die App-Farben in src/index.css sind
// ueberall hartcodiertes Cream (#F7F1E6), unabhaengig vom System-
// Erscheinungsbild. GEFUNDENE URSACHE der "schwarzer Rand oben/unten"-
// Regression (mehrere Session-Runden lang faelschlich als CSS-/App-Shell-
// Bug behandelt): weder WKWebView noch das umgebende UIView/UIWindow hatten
// je eine explizite backgroundColor - beide folgen dann automatisch dem
// System-Erscheinungsbild (schwarz im Dark Mode, weiss im Light Mode, was
// iOS je nach Uhrzeit-Einstellung automatisch umschalten kann - daher die
// unterschiedlichen Ergebnisse an verschiedenen Testzeitpunkten).
//
// AUSDRUECKLICH GEPRUEFT UND AUSGESCHLOSSEN: ein WebView-Frame/Layout-Gap
// als Ursache. Per echtem Laufzeit-Log (viewDidLayoutSubviews, iPhone 17
// Pro Simulator, siehe Bugfix-Historie) bit-fuer-bit verifiziert:
// webView.frame == view.bounds == (0, 0, 402, 874), webView.superview-Kette
// (UIDropShadowView -> UITransitionView -> UIWindow) hat auf JEDER Ebene
// exakt dasselbe Frame, keinerlei Differenz/Luecke. webView.
// translatesAutoresizingMaskIntoConstraints == true mit 0 Constraints -
// Capacitor positioniert die WebView per Frame/autoresizingMask (nicht Auto
// Layout), bindet sie dabei aber bereits korrekt an die VOLLEN View-Grenzen,
// nicht an view.safeAreaLayoutGuide. Die schwarzen/weissen Raender kamen
// stattdessen von UIDropShadowView/UITransitionView (UIKit-interne Wrapper
// zwischen WebView und Fenster, backgroundColor==nil==transparent) - die
// geben den Blick frei auf das UIWindow dahinter, das vor diesem Fix keine
// explizite Farbe hatte und deshalb dem System-Erscheinungsbild folgte.
// UIUserInterfaceStyle=Light in Info.plist verhindert das bereits app-weit
// auf System-Ebene; diese Klasse setzt zusaetzlich (defense in depth) explizit
// Cream auf jeder betroffenen Ebene, damit selbst OHNE den Info.plist-Key
// nichts mehr durchscheinen kann.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // #F7F1E6 (--color-bg in src/index.css) - einzige Quelle der
        // Wahrheit fuer diesen Farbwert ist das Design-System dort; hier nur
        // 1:1 als UIColor uebernommen, nicht eigenstaendig geschaetzt.
        let cream = UIColor(red: 0xF7 / 255.0, green: 0xF1 / 255.0, blue: 0xE6 / 255.0, alpha: 1.0)

        view.backgroundColor = cream

        webView?.isOpaque = true
        webView?.backgroundColor = cream
        // scrollView.backgroundColor separat, da WKWebView intern eine
        // eigene UIScrollView fuers Web-Content-Layer einbettet, die ihre
        // Hintergrundfarbe NICHT automatisch von der aeusseren WKWebView
        // erbt (zwei getrennte CALayer-Hintergruende).
        webView?.scrollView.backgroundColor = cream

        // GEFUNDENE URSACHE eines Real-Device-Bugreports ("Druecken+Halten
        // auf einer freien Stelle des Rezepte-Swipe-Screens und Wischen
        // verschiebt die KOMPLETTE gerenderte Flaeche - Kopfzeile, Karte,
        // Buttons UND die schwebende Tab-Leiste - gemeinsam als starrer
        // Block"). Per Video bestaetigt UND korrekt hergeleitet: das kann
        // kein DOM-/CSS-Overflow sein (html/body/#root haben bereits
        // overflow:hidden + position:fixed, siehe index.css - eine "fixed"
        // Tab-Leiste kann sich innerhalb des WEB-Layouts gar nicht mit dem
        // Rest mitbewegen). Die tatsaechliche Ursache liegt EINE EBENE
        // TIEFER: WKWebView bettet ihr Web-Content-Layer IMMER in eine
        // eigene, native UIScrollView ein - diese ist standardmaessig
        // scroll-/bounce-faehig, VOLLKOMMEN UNABHAENGIG von jeder Web-
        // seitigen overflow-Regel (die betrifft nur das DOM-Layout
        // INNERHALB dieser ScrollView, nicht die ScrollView selbst als
        // natives UIKit-Objekt). Ein Touch auf einer Stelle ohne
        // konkurrierenden JS-Touch-Handler (z. B. neben der Karte statt auf
        // ihr) wird von dieser nativen ScrollView als Pan-/Rubber-Band-
        // Geste aufgefasst und verschiebt das GESAMTE gerenderte Layer
        // (inkl. allem, was CSS-seitig "fixed" ist, weil das nur relativ
        // zum WebView-eigenen Viewport gilt, nicht relativ zur aeusseren
        // nativen ScrollView) - exakt das gemeldete Symptom.
        //
        // isScrollEnabled = false unterbindet dieses native Pannen
        // komplett. Das ist sicher, weil die App JEDES tatsaechlich
        // gewuenschte Scrollen ausschliesslich ueber eigene, WEB-interne
        // overflow-y:auto-Bereiche loest (z. B. der Content-Wrapper in
        // App.jsx) - das sind eigene, von dieser aeusseren ScrollView
        // komplett unabhaengige Compositing-Layer innerhalb der WKWebView,
        // die von isScrollEnabled=false auf der AEUSSEREN ScrollView nicht
        // betroffen sind. bounces/bouncesZoom zusaetzlich explizit aus
        // (defense in depth, falls isScrollEnabled durch eine kuenftige
        // Aenderung an anderer Stelle wieder aktiviert werden muesste).
        webView?.scrollView.isScrollEnabled = false
        webView?.scrollView.bounces = false
        webView?.scrollView.bouncesZoom = false

        // NICHT bestaetigt wirksam: Gregor meldet, der obige Fix zeigt am
        // echten Geraet KEINE Wirkung, Bug tritt identisch weiter auf. Bevor
        // hier blind weiter herumprobiert wird, erst zweifelsfrei per
        // Laufzeit-Log beweisen, WAS sich waehrend "auf freier Stelle
        // druecken+halten+wischen" tatsaechlich bewegt (siehe
        // starteScrollDiagnose() unten - TEMPORAERER Diagnose-Code, nach
        // Auswertung wieder entfernen). Zusaetzlicher Hinweis aus dem
        // Bugreport, der bereits in die Diagnose einfliesst: der native
        // Offset ueberlebt einen SPA-Tab-Wechsel (React-Content wird
        // ausgetauscht, WKWebView bleibt bestehen) und resettet sich erst
        // bei einem echten Remount - das deutet auf einen dauerhaften
        // nativen Zustand hin (contentOffset EINER bestimmten ScrollView
        // ODER ein direkt gesetztes transform/frame auf einer View), nicht
        // auf etwas React/CSS-Gebundenes.
        starteScrollDiagnose()
    }

    // MARK: - TEMPORAERE Diagnose (siehe Kommentar oben) - vor dem naechsten
    // Fix-Versuch per echtem Laufzeit-Log beweisen, welche View/ScrollView
    // sich waehrend der Geste bewegt, statt weiter zu raten.

    private var diagnoseTimer: Timer?

    private func starteScrollDiagnose() {
        // 1) webView zweifelsfrei nicht-nil beweisen (statt stillem
        // optional-chaining, das bei nil einfach nichts getan haette, ohne
        // dass das im Log sichtbar waere) - force-unwrap crasht hier
        // ABSICHTLICH, falls webView doch nil waere, statt das Problem zu
        // verschleiern.
        let webView = self.webView!
        print("🟢 GUSTO-DIAGNOSE: webView existiert = \(webView)")
        print("🟢 GUSTO-DIAGNOSE: webView.scrollView = \(webView.scrollView), isScrollEnabled=\(webView.scrollView.isScrollEnabled), bounces=\(webView.scrollView.bounces)")
        print("🟢 GUSTO-DIAGNOSE: webView.allowsBackForwardNavigationGestures = \(webView.allowsBackForwardNavigationGestures)")
        print("🟢 GUSTO-DIAGNOSE: self.view === webView ? \(self.view === webView) (CAPBridgeViewController.loadView() setzt view = webView direkt, siehe node_modules/@capacitor/ios)")

        // Hierarchie-Dump ZWEIMAL: sofort UND nochmal 2s spaeter. WKWebViews
        // interne Content-View (WKContentView, die eigentliche Compositing-
        // Ebene) wird oft erst NACH Seitenladung/erstem Layout angehaengt -
        // ein einzelner Dump direkt in viewDidLoad koennte sie noch verpassen.
        dumpeHierarchie(kontext: "sofort in viewDidLoad")
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.dumpeHierarchie(kontext: "2s nach viewDidLoad (Seite sollte geladen sein)")
        }

        // Periodischer Live-Dump, WAEHREND die Geste laeuft - faengt JEDE
        // Bewegung ab, egal ob per ScrollView-contentOffset ODER per
        // direktem transform/frame/center auf webView oder self.view (genau
        // die vom Nutzer geforderte "eindeutige, live sichtbare" Kontrolle
        // statt einer einmaligen Momentaufnahme). ScrollViews werden bei
        // JEDEM Tick FRISCH gesucht (nicht einmalig gecacht) - falls WKWebView
        // zur Laufzeit zusaetzliche interne ScrollViews anhaengt, werden die
        // sonst uebersehen. Bewusst ungefiltert/nicht auf Aenderungen
        // reduziert - das ist TEMPORAERER Diagnose-Code fuer einen kurzen,
        // gezielten Testdurchlauf (ein paar Sekunden "druecken + halten +
        // wischen"), keine Dauerinstrumentierung.
        diagnoseTimer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            guard let self = self, let webView = self.webView else { return }
            let wurzel: UIView = self.view.window ?? self.view
            let offsets = self.alleScrollViews(in: wurzel).map { sv -> String in
                let adresse = Unmanaged.passUnretained(sv).toOpaque()
                return "\(type(of: sv))@\(adresse)=\(sv.contentOffset)"
            }
            print(
                "🔵 GUSTO-DIAGNOSE-TICK "
                + "webView.transform=\(webView.transform) "
                + "webView.frame=\(webView.frame) "
                + "webView.center=\(webView.center) "
                + "selfView.transform=\(self.view.transform) "
                + "panState(webView.scrollView)=\(webView.scrollView.panGestureRecognizer.state.rawValue) "
                + "offsets=\(offsets)"
            )
        }
    }

    private func dumpeHierarchie(kontext: String) {
        guard let webView = self.webView else { return }

        // Komplette native View-Hierarchie ab dem FENSTER (nicht nur ab
        // self.view) - private, aber zur Laufzeit vorhandene API (Standard-
        // Debugging-Trick), faengt auch etwaige Wrapper OBERHALB von
        // self.view (Window/Scene-Ebene) mit ein.
        let wurzel: UIView = self.view.window ?? self.view
        print("🟡 GUSTO-DIAGNOSE Hierarchie-Dump (\(kontext)):")
        if let beschreibung = wurzel.perform(Selector(("recursiveDescription")))?.takeUnretainedValue() as? String {
            print("🟢 GUSTO-DIAGNOSE View-Hierarchie ab \(wurzel):\n\(beschreibung)")
        } else {
            print("🔴 GUSTO-DIAGNOSE: recursiveDescription lieferte nichts (unerwartet)")
        }

        // JEDE UIScrollView in der Hierarchie finden (nicht nur
        // webView.scrollView) + deren Gesture Recognizer auflisten.
        for sv in alleScrollViews(in: wurzel) {
            let adresse = Unmanaged.passUnretained(sv).toOpaque()
            print("🟢 GUSTO-DIAGNOSE ScrollView \(type(of: sv))@\(adresse): contentOffset=\(sv.contentOffset) isScrollEnabled=\(sv.isScrollEnabled) gestures=\(sv.gestureRecognizers?.map { String(describing: type(of: $0)) } ?? [])")
        }
        print("🟢 GUSTO-DIAGNOSE webView.gestureRecognizers = \(webView.gestureRecognizers?.map { String(describing: type(of: $0)) } ?? [])")
    }

    private func alleScrollViews(in view: UIView) -> [UIScrollView] {
        var ergebnis: [UIScrollView] = []
        if let sv = view as? UIScrollView {
            ergebnis.append(sv)
        }
        for kind in view.subviews {
            ergebnis.append(contentsOf: alleScrollViews(in: kind))
        }
        return ergebnis
    }
}
