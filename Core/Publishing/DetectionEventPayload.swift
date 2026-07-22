import Foundation

/// Serialização do payload MQTT — lógica pura, testável na CI (mesmo padrão do MQTTTopic).
/// O contrato do JSON é o que o Home Assistant/Node-RED espera, então vale um teste dedicado.
enum DetectionEventPayload {

    /// DTO interno só para controlar a precisão da confiança na saída.
    /// `DetectionEvent.confidence` é `Float`, e serializar `Float` gera ruído (ex.: 0.94 →
    /// "0.9399999976158142"). Arredondamos para 2 casas via `Double` para um payload limpo,
    /// como no spec `{ "confidence": 0.94, ... }`.
    private struct Wire: Encodable {
        let detected: Bool
        let confidence: Double
        let timestamp: Date
        let camera: String
    }

    static func json(_ event: DetectionEvent) throws -> String {
        let confidence = (Double(event.confidence) * 100).rounded() / 100
        let wire = Wire(
            detected: event.detected,
            confidence: confidence,
            timestamp: event.timestamp,
            camera: event.camera)

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601   // "2026-07-22T21:00:00Z"
        encoder.outputFormatting = [.sortedKeys]  // ordem estável (legibilidade + testes)
        let data = try encoder.encode(wire)
        return String(decoding: data, as: UTF8.self)
    }
}
