import CoreGraphics

/// Resultado de UMA detecção. `label` é String (não enum fechado) para não
/// travar o roadmap (veículos, animais). Filtro de classe fica numa camada acima.
struct Detection {
    let label: String
    let confidence: Float
    /// Bounding box normalizado (0...1), sistema de coordenadas da Vision.
    let boundingBox: CGRect
}
