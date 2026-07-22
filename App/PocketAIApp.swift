import SwiftUI

/// Entrypoint + composition root do PocketAI.
///
/// Minimalista de propósito: a única View é a tela de config, que cria seu próprio
/// `ConfigViewModel` (que por sua vez recebe os stores/DI por padrão). Todo o trabalho
/// pesado é headless (PipelineEngine + Camera/AI/MQTT) e independe desta camada.
@main
struct PocketAIApp: App {
    var body: some Scene {
        WindowGroup {
            ConfigView()
        }
    }
}
