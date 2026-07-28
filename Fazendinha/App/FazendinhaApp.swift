import SwiftUI

/// Entrypoint do A Fazenda da Manu 🌻
///
/// App 100% independente do PocketAI. Usa SwiftUI para o HUD + SceneKit
/// para o mundo 3D. Nenhuma dependência externa, só frameworks nativos Apple.
@main
struct FazendinhaApp: App {
    var body: some Scene {
        WindowGroup {
            FarmGameView()
        }
    }
}
