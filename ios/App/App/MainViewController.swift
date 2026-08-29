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
    }
}
