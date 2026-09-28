import UIKit
import Capacitor
import WebKit

// Farb-/Hintergrund-Handling (Gerueststueck aus der urspruenglichen "Gusto
// hat kein Dark-Theme"-Analyse, seit dem Dark-Mode-Umbau erweitert statt
// ersetzt - die GEFUNDENE URSACHE unten bleibt unveraendert gueltig):
//
// GEFUNDENE URSACHE der "schwarzer Rand oben/unten"-Regression (mehrere
// Session-Runden lang faelschlich als CSS-/App-Shell-Bug behandelt): weder
// WKWebView noch das umgebende UIView/UIWindow hatten je eine explizite
// backgroundColor - beide folgen dann automatisch dem System-
// Erscheinungsbild (schwarz im Dark Mode, weiss im Light Mode, was iOS je
// nach Uhrzeit-Einstellung automatisch umschalten kann - daher die
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
//
// FRUEHER (vor dem Dark Mode): UIUserInterfaceStyle=Light in Info.plist
// verhinderte das bereits app-weit auf System-Ebene, diese Klasse setzte
// zusaetzlich (defense in depth) explizit Cream auf jeder betroffenen Ebene.
//
// SEIT DEM DARK-MODE-UMBAU (CLAUDE.md Abschnitt 5): der Info.plist-Zwang auf
// Light ist entfallen, die App unterstuetzt jetzt beide Modi. Bis JS sein
// erstes Theme meldet (siehe ThemeBridge.swift + configureThemeBridge()
// unten), verwendet dieselbe "defense in depth"-Stelle deshalb
// ThemeBridge.dynamisch statt eines hart auf Cream fixierten Werts - folgt
// automatisch dem System-Erscheinungsbild, bis die explizite Wahl (System/
// Hell/Dunkel, kann vom System abweichen) eintrifft.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Startfarbe: dynamisch (folgt dem System), bis configureThemeBridge()
        // unten die erste JS-Nachricht mit der tatsaechlichen Wahl erhaelt -
        // siehe Klassenkommentar oben und ThemeBridge.swift.
        view.backgroundColor = ThemeBridge.dynamisch

        webView?.isOpaque = true
        webView?.backgroundColor = ThemeBridge.dynamisch
        // scrollView.backgroundColor separat, da WKWebView intern eine
        // eigene UIScrollView fuers Web-Content-Layer einbettet, die ihre
        // Hintergrundfarbe NICHT automatisch von der aeusseren WKWebView
        // erbt (zwei getrennte CALayer-Hintergruende).
        webView?.scrollView.backgroundColor = ThemeBridge.dynamisch
        if #available(iOS 15.0, *) {
            webView?.underPageBackgroundColor = ThemeBridge.dynamisch
        }

        configureThemeBridge()

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

        // STRATEGIEWECHSEL (mehrere Runden CSS-Feintuning - touch-action,
        // overscroll-behavior, overflow-x-hidden - reichten am Ende NICHT:
        // Gregor maß per Frame-Analyse eines Screen-Recordings, dass sich
        // bei einer Wisch-Geste die KOMPLETTE gerenderte Flaeche (Kopfzeile+
        // Karte+Tab-Leiste als starrer Block) auch VERTIKAL um ~110-115px
        // verschieben kann - derselbe Mechanismus wie das seit mehreren
        // Runden gemeldete horizontale Verschieben, nur auf der anderen
        // Achse. Web-seitige CSS-Eigenschaften (touch-action,
        // overscroll-behavior) beeinflussen nur, WELCHE Touch-Gesten der
        // Browser ERKENNT/ERLAUBT - sie garantieren nicht, dass eine
        // bereits laufende native Geste oder ein WebKit-interner
        // contentOffset-Sprung (siehe Bugfix-Historie: "isScrollEnabled=
        // false griff NICHT" beim allerersten Versuch) niemals durchrutscht.
        // Ab hier deshalb aktive, kontinuierliche NATIVE Durchsetzung statt
        // reiner CSS-Praevention: siehe starteScrollLockdown() unten.
        starteScrollLockdown()
    }

    // MARK: - Aktiver Scroll-Lockdown (ersetzt die fruehere reine
    // Log-Diagnose - deren Erkenntnis war zwar deckungsgleich mit dem
    // hier greifenden Mechanismus, aber Beobachten allein hat den Bug nie
    // behoben). Statt einzelne CSS-Eigenschaften pro Container zu tunen,
    // wird JEDE zur Laufzeit in der View-Hierarchie gefundene UIScrollView
    // (inkl. aller von WebKit dynamisch je overflow:auto/scroll-Bereich neu
    // angelegten WKChildScrollViews) auf JEDEM Frame per CADisplayLink
    // zwangskorrigiert - kein Abwarten auf einen Timer-Tick (0.2s wie in
    // der alten Diagnose waere hier zu langsam, ein Rand-Wippen waere
    // trotzdem 1-2 Frames sichtbar), sondern so schnell wie das Display
    // selbst rendert.
    //
    // Kriterium pro ScrollView, komplett zur Laufzeit anhand contentSize
    // vs. bounds bestimmt (KEINE Sonderfall-/Whitelist-Liste bestimmter
    // Views/Klassen - die App weiss zur Compile-Zeit gar nicht, welche
    // WKChildScrollViews WebKit anlegen wird):
    //   - bounces/bouncesZoom: IMMER aus, ausnahmslos fuer jede ScrollView.
    //     Diese App hat nirgends ein gewuenschtes elastisches Rand-Wippen.
    //   - isScrollEnabled: NUR true, wenn diese ScrollView echten
    //     VERTIKALEN Overflow hat (contentSize.height > bounds.height) -
    //     das deckt genau die Web-Containers ab, die tatsaechlich
    //     scrollbaren Inhalt haben (Tag-Tab bei vielen Mahlzeiten,
    //     Einstellungen, Kalorienrechner-Options-Listen, KochModus-Inhalt).
    //     Jede ScrollView OHNE echten vertikalen Overflow (allen voran
    //     webView.scrollView selbst, das NIE eigenen Overflow hat, weil die
    //     App ausschliesslich ueber eigene overflow-y:auto-Divs scrollt)
    //     wird hart stillgelegt.
    //   - contentOffset.x: IMMER auf 0 erzwungen, ausnahmslos, AUCH bei
    //     ScrollViews mit echtem vertikalen Overflow, die daher
    //     isScrollEnabled=true behalten - kein einziger Container in dieser
    //     App hat jemals legitimen horizontalen Scroll-Inhalt (das war
    //     zuvor per CSS overflow-x-hidden abgesichert, hier zusaetzlich
    //     nochmal nativ, unabhaengig davon, WARUM eine ScrollView
    //     ueberhaupt horizontalen Spielraum bekommen haben koennte).
    //   - contentOffset.y: nur bei ScrollViews OHNE echten vertikalen
    //     Overflow auf 0 erzwungen - bei ScrollViews MIT echtem Overflow
    //     bleibt Y unangetastet, sonst waere echtes Scrollen dort nicht
    //     mehr moeglich.
    private var scrollLockdownDisplayLink: CADisplayLink?

    private func starteScrollLockdown() {
        let displayLink = CADisplayLink(target: self, selector: #selector(scrollLockdownTick))
        displayLink.add(to: .main, forMode: .common)
        scrollLockdownDisplayLink = displayLink
    }

    @objc private func scrollLockdownTick() {
        let wurzel: UIView = self.view.window ?? self.view
        for sv in alleScrollViews(in: wurzel) {
            if sv.bounces {
                sv.bounces = false
            }
            if sv.bouncesZoom {
                sv.bouncesZoom = false
            }

            // +1pt Toleranz gegen Rundungsrauschen (Sub-Pixel-Layout) - ohne
            // sie wuerde eine ScrollView ganz ohne Overflow durch
            // Gleitkomma-Ungenauigkeit gelegentlich faelschlich als
            // "hat Overflow" erkannt.
            let hatVertikalenOverflow = sv.contentSize.height > sv.bounds.height + 1

            let sollScrollbarSein = hatVertikalenOverflow
            if sv.isScrollEnabled != sollScrollbarSein {
                sv.isScrollEnabled = sollScrollbarSein
            }

            if sv.contentOffset.x != 0 {
                var korrigiert = sv.contentOffset
                korrigiert.x = 0
                sv.setContentOffset(korrigiert, animated: false)
                print("🟠 GUSTO-SCROLL-LOCKDOWN: contentOffset.x auf 0 erzwungen bei \(type(of: sv)) (war \(sv.contentOffset.x))")
            }

            if !hatVertikalenOverflow && sv.contentOffset.y != 0 {
                var korrigiert = sv.contentOffset
                korrigiert.y = 0
                sv.setContentOffset(korrigiert, animated: false)
                print("🟠 GUSTO-SCROLL-LOCKDOWN: contentOffset.y auf 0 erzwungen bei \(type(of: sv)) ohne echten vertikalen Overflow (war \(sv.contentOffset.y))")
            }
        }
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

    deinit {
        scrollLockdownDisplayLink?.invalidate()
    }

    // MARK: - Theme-Bruecke (siehe ThemeBridge.swift)
    //
    // Registriert "themeBridge" als WKScriptMessageHandler auf der bereits
    // von CAPBridgeViewController erzeugten WebView (existiert erst NACH
    // super.viewDidLoad(), siehe Aufrufstelle oben). JS sendet bei jeder
    // Aenderung des effektiv wirksamen Themes (theme.js, App.jsx) eine
    // Nachricht - auch waehrend des Onboarding-Wizards, der bewusst immer
    // 'light' sendet (siehe ThemeBridge-Kommentar).
    private func configureThemeBridge() {
        webView?.configuration.userContentController.add(self, name: "themeBridge")
    }
}

extension MainViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "themeBridge" else { return }
        ThemeBridge.anwenden(style: ThemeBridge.style(ausModus: message.body), controller: self, webView: webView)
    }
}
