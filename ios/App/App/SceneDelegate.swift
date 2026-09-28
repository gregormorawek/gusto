import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // Siehe MainViewController.swift fuer die ausfuehrliche Begruendung
        // (schwarzer-Rand-Bugfix). Das Fenster selbst bekommt hier zusaetzlich
        // dieselbe Farbe, fuer den kurzen Moment zwischen Fenster-Erstellung
        // und dem ersten Layout-Pass des Root-View-Controllers. Dynamisch
        // (ThemeBridge.dynamisch) statt hart Cream seit dem Dark-Mode-Umbau -
        // siehe ThemeBridge.swift: folgt dem System, bis JS die tatsaechliche
        // Wahl meldet.
        window?.backgroundColor = ThemeBridge.dynamisch
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
