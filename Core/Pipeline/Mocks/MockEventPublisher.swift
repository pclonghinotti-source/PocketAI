import Foundation

/// Publisher de teste: registra o que foi publicado e pode simular falhas de
/// `publish` para exercitar o retry mínimo (1 reconexão + 1 reenvio) do engine.
///
/// `actor` para acesso seguro aos contadores a partir do engine e da inspeção do teste.
actor MockEventPublisher: EventPublisher {

    enum MockError: Error { case publishFailed }

    // Inspecionáveis pelo cenário de validação.
    private(set) var connected = false
    private(set) var publishedEvents: [DetectionEvent] = []
    private(set) var connectCount = 0
    private(set) var publishAttempts = 0

    /// Nº de falhas de `publish` antes de passar a ter sucesso (simula instabilidade).
    private var remainingPublishFailures: Int

    init(publishFailuresBeforeSuccess: Int = 0) {
        self.remainingPublishFailures = publishFailuresBeforeSuccess
    }

    func connect() async throws {
        connectCount += 1
        connected = true
    }

    func publish(_ event: DetectionEvent) async throws {
        publishAttempts += 1
        if remainingPublishFailures > 0 {
            remainingPublishFailures -= 1
            throw MockError.publishFailed
        }
        publishedEvents.append(event)
    }

    func disconnect() async {
        connected = false
    }
}
