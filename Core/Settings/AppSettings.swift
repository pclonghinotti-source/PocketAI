import Foundation

/// Configuração do app — o que a tela única edita e o que a DI usa para montar o pipeline.
///
/// SEM SENHAS: `Codable`/`Sendable` puro, persistido em UserDefaults. As senhas (RTSP/MQTT)
/// NÃO moram aqui — vão para o Keychain (decisão fixada no Módulo 1), tratadas à parte na UI/DI.
struct AppSettings: Codable, Sendable, Equatable {

    // Câmera / ingestão
    var cameraName: String
    var rtspURL: String
    var rtspUsername: String

    // Inferência
    var targetFPS: Double
    var confidenceThreshold: Double     // 0...1
    /// Força o bypass da Neural Engine (`.cpuAndGPU`) para simular no iPad (A14) o caminho
    /// que o iPhone 8 (A11) vai seguir. Ver AI/README.md e [[pocketai-build-constraint]].
    var simulateNeuralEngineBypass: Bool

    // Saída / MQTT
    var mqttHost: String
    var mqttPort: Int
    var mqttUsername: String
    var mqttUseTLS: Bool

    static let `default` = AppSettings(
        cameraName: "garage",
        rtspURL: "rtsp://",
        rtspUsername: "",
        targetFPS: 5,
        confidenceThreshold: 0.5,
        simulateNeuralEngineBypass: false,
        mqttHost: "",
        mqttPort: 1883,
        mqttUsername: "",
        mqttUseTLS: false
    )
}
