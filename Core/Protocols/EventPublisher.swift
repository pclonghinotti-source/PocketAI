/// Saída do sistema. MQTT é só uma implementação; REST/WS futuros são novas impls.
/// Refina `Sendable`: é um serviço de vida longa injetado e usado entre actors.
protocol EventPublisher: Sendable {
    func connect() async throws
    func publish(_ event: DetectionEvent) async throws
    func disconnect() async
}
