import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // Cream statt CAPBridgeViewController direkt - siehe MainViewController.swift
        // fuer die ausfuehrliche Begruendung (schwarzer-Rand-Bugfix). Das
        // Fenster selbst bekommt hier zusaetzlich dieselbe Cream-Farbe, fuer
        // den kurzen Moment zwischen Fenster-Erstellung und dem ersten
        // Layout-Pass des Root-View-Controllers.
        window?.backgroundColor = UIColor(red: 0xF7 / 255.0, green: 0xF1 / 255.0, blue: 0xE6 / 255.0, alpha: 1.0)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
