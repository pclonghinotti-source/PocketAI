import Foundation

/// Validação de `AppSettings` — lógica pura, testável na CI sem device (mesmo padrão do
/// NALUnit/MQTTTopic). A UI usa isto para bloquear o START e mostrar mensagens.
enum SettingsValidator {

    enum ValidationError: Equatable {
        case emptyCameraName
        case invalidRTSPURL
        case fpsOutOfRange(Double)
        case thresholdOutOfRange(Double)
        case emptyMQTTHost
        case invalidMQTTPort(Int)

        /// Mensagem legível para a tela de config.
        var message: String {
            switch self {
            case .emptyCameraName:            return "Nome da câmera não pode ser vazio."
            case .invalidRTSPURL:             return "URL RTSP inválida (deve começar com rtsp://)."
            case .fpsOutOfRange(let v):       return "FPS fora da faixa (1–30): \(v)."
            case .thresholdOutOfRange(let v): return "Threshold deve estar entre 0 e 1: \(v)."
            case .emptyMQTTHost:              return "Servidor MQTT não pode ser vazio."
            case .invalidMQTTPort(let p):     return "Porta MQTT inválida (1–65535): \(p)."
            }
        }
    }

    /// Retorna todos os problemas encontrados (vazio = válido).
    static func validate(_ s: AppSettings) -> [ValidationError] {
        var errors: [ValidationError] = []

        if s.cameraName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append(.emptyCameraName)
        }
        let url = s.rtspURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if !url.lowercased().hasPrefix("rtsp://") || url.count <= "rtsp://".count {
            errors.append(.invalidRTSPURL)
        }
        if s.targetFPS <= 0 || s.targetFPS > 30 {
            errors.append(.fpsOutOfRange(s.targetFPS))
        }
        if s.confidenceThreshold < 0 || s.confidenceThreshold > 1 {
            errors.append(.thresholdOutOfRange(s.confidenceThreshold))
        }
        if s.mqttHost.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append(.emptyMQTTHost)
        }
        if s.mqttPort < 1 || s.mqttPort > 65535 {
            errors.append(.invalidMQTTPort(s.mqttPort))
        }
        return errors
    }
}
