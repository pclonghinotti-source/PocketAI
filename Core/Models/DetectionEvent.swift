import Foundation

/// O "produto" do PocketAI. Encodable mapeia 1:1 no payload MQTT.
/// Transporte não conhece a estrutura interna — só serializa.
struct DetectionEvent: Encodable {
    let detected: Bool
    let confidence: Float
    let timestamp: Date   // serializado ISO 8601 no encoder do publisher
    let camera: String
}
