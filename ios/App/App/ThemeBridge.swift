import UIKit
import WebKit

// Bruecke zwischen der Darstellungs-Wahl (System/Hell/Dunkel, siehe
// src/theme.js) und der nativen Oberflaeche. Registriert als
// WKScriptMessageHandler in MainViewController.swift (siehe dort,
// configureThemeBridge()): JS ruft bei jeder Aenderung der GEWAEHLTEN
// Darstellung window.webkit.messageHandlers.themeBridge.postMessage(
// { modus: 'system' | 'hell' | 'dunkel' }) auf (siehe nativeThemeSetzen
// in src/theme.js) - AUCH waehrend des Onboarding-Wizards, der immer
// 'hell' sendet, unabhaengig vom data-theme am <html> (der Wizard ist
// bewusst vom Dark Mode ausgeklammert, siehe CLAUDE.md Abschnitt 5).
//
// Ohne diese Bruecke wuerde overrideUserInterfaceStyle (und damit
// Statusleiste, Tastatur, native Formularelemente, WKWebView-eigenes
// prefers-color-scheme) nie dem Web-seitigen Modus folgen - die App bliebe
// nativ immer im System-Standard haengen.
//
// WICHTIG - bewusst der ROHE MODUS statt des bereits aufgeloesten Themes
// ('light'/'dark'): GEFUNDENE URSACHE eines Real-Device-Bugreports ("nach
// dem Wizard blieb die App hell, obwohl iPhone+Darstellung auf Dunkel/
// System standen - erst nach Neustart korrekt" und "Umschalten auf System
// wechselt nicht sofort"), von Gregor selbst korrekt als Kreisschluss
// vermutet und per Simulator-Log bestaetigt: overrideUserInterfaceStyle
// wirkt auf FENSTER-Ebene und faerbt dadurch AUCH window.matchMedia(
// 'prefers-color-scheme: dark') fuer die gesamte WebView um. Wuerde hier
// bei 'system' weiterhin ein FESTER Style (abgeleitet aus dem zuvor JS-
// seitig berechneten, ggf. schon verfaelschten Theme) gesetzt, bliebe der
// Zwang bestehen und JS laese beim naechsten Mal den eigenen, kuenstlich
// erzwungenen Wert aus matchMedia zurueck - ein sich selbst bestaetigender
// Fehlschluss. Deshalb hebt 'system' den Zwang durch .unspecified KOMPLETT
// auf, statt ihn durch einen (moeglicherweise falschen) festen Wert zu
// ersetzen - erst das macht matchMedia in der WebView wieder ehrlich.
//
// Reine Farb-/Style-Zustaendigkeit, ruehrt den Scroll-Lockdown
// (starteScrollLockdown() in MainViewController.swift) nicht an.
enum ThemeBridge {
    // 1:1 aus src/index.css uebernommen (--color-bg hell/dunkel) - einzige
    // Quelle der Wahrheit bleibt dort, hier nur als UIColor gespiegelt.
    static let hell = UIColor(red: 0xF7 / 255.0, green: 0xF1 / 255.0, blue: 0xE6 / 255.0, alpha: 1.0)
    static let dunkel = UIColor(red: 0x1D / 255.0, green: 0x17 / 255.0, blue: 0x14 / 255.0, alpha: 1.0)

    // Verwendet, SOLANGE kein fester Style erzwungen ist (Startzustand VOR
    // der ersten JS-Nachricht, UND jederzeit bei Darstellung "System",
    // siehe anwenden() unten) - folgt automatisch dem System-
    // Erscheinungsbild (UITraitCollection), OHNE dass overrideUserInterface-
    // Style gesetzt sein muss. Das ist eine bessere Annaeherung als ein
    // hart auf Cream fixierter Wert (der frueher noetig war, weil
    // UIUserInterfaceStyle=Light in Info.plist die App ohnehin app-weit auf
    // Light zwang - dieser Zwang ist mit dem Dark Mode entfallen, siehe
    // Info.plist).
    static let dynamisch = UIColor { traits in
        traits.userInterfaceStyle == .dark ? dunkel : hell
    }

    private static func hintergrund(fuer style: UIUserInterfaceStyle) -> UIColor {
        style == .dark ? dunkel : hell
    }

    // Setzt overrideUserInterfaceStyle auf dem FENSTER (wirkt dadurch auf
    // die gesamte Hierarchie inkl. Statusleiste/Tastatur/System-UI, nicht
    // nur auf einzelne Views). style == nil ("System", siehe Klassen-
    // kommentar oben) hebt einen zuvor gesetzten Zwang wieder KOMPLETT auf
    // (.unspecified) und verwendet fuer die Hintergrundfarben wieder
    // ThemeBridge.dynamisch (folgt danach ehrlich dem System). Ein
    // gesetzter style haertet zusaetzlich die Hintergrundfarben auf jeder
    // betroffenen Ebene - dieselbe "defense in depth"-Begruendung wie der
    // urspruengliche Cream-Fix in MainViewController.viewDidLoad (siehe
    // dortiger Kommentar zu UIDropShadowView/UITransitionView).
    static func anwenden(style: UIUserInterfaceStyle?, controller: UIViewController, webView: WKWebView?) {
        let farbe = style.map(hintergrund(fuer:)) ?? dynamisch
        let aufgeloesterStyle = style ?? .unspecified
        controller.overrideUserInterfaceStyle = aufgeloesterStyle
        controller.view.window?.overrideUserInterfaceStyle = aufgeloesterStyle
        controller.view.window?.backgroundColor = farbe
        controller.view.backgroundColor = farbe
        webView?.isOpaque = true
        webView?.backgroundColor = farbe
        webView?.scrollView.backgroundColor = farbe
        if #available(iOS 15.0, *) {
            // Verhindert einen kurzen weissen/falschfarbenen Blitzer an den
            // Raendern beim Ueberziehen (Rubber-Banding) - separater Layer
            // von scrollView.backgroundColor, siehe Apple-Doku.
            webView?.underPageBackgroundColor = farbe
        }
    }

    // Wandelt den von JS gesendeten Modus-String in einen optionalen
    // UIUserInterfaceStyle um: nil bedeutet "System" (siehe anwenden()
    // oben - hebt einen Zwang auf statt einen zu setzen). Unbekannte/
    // fehlende Werte fallen auf .light zurueck (der sichere Standard, den
    // zuvor auch das Info.plist-Flag app-weit erzwang) statt auf "System",
    // damit ein fehlerhafter/leerer Aufruf nie versehentlich einen
    // bestehenden Zwang aufhebt.
    static func style(ausModus body: Any?) -> UIUserInterfaceStyle? {
        guard let dict = body as? [String: Any], let modus = dict["modus"] as? String else {
            return .light
        }
        switch modus {
        case "system": return nil
        case "dunkel": return .dark
        default: return .light
        }
    }
}
