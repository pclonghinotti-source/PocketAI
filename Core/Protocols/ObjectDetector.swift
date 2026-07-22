/// Inferência pura: frame entra, TODAS as detecções saem. Sem rede/UI/threshold/filtro.
/// Implementação concreta roda como `actor` (acesso serial ao MLModel).
/// Refina `Sendable`: é um serviço de vida longa injetado e usado entre actors.
protocol ObjectDetector: Sendable {
    func detect(_ frame: VideoFrame) async throws -> [Detection]
}
