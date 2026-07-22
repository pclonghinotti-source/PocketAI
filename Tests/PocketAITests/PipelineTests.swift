import XCTest
@testable import PocketAI

/// Valida a orquestração do `PipelineEngine` com mocks: filtro person+threshold, throttle e retry.
/// `@testable import` dá acesso aos tipos `internal` do Core (mocks inclusos).
final class PipelineTests: XCTestCase {

    /// Monta um engine já configurado com os mocks fornecidos.
    private func makeEngine(
        detector: MockObjectDetector,
        publisher: MockEventPublisher,
        sourceFPS: Double = 20,
        targetFPS: Double = 5,
        threshold: Float = 0.5
    ) -> (PipelineEngine, MockFrameSource) {
        let source = MockFrameSource(sourceFPS: sourceFPS)
        let engine = PipelineEngine(
            source: source,
            scheduler: RateLimitingFrameScheduler(targetFPS: targetFPS),
            detector: detector,
            publisher: publisher,
            configuration: .init(cameraName: "garage", targetLabel: "person", confidenceThreshold: threshold)
        )
        return (engine, source)
    }

    // MARK: - Filtro

    func testPersonPassesAndCarIsIgnored() async throws {
        // Detector devolve SEMPRE person@0.94 e car@0.99 juntos: só a person deve virar evento.
        let detector = MockObjectDetector(
            behavior: .fixed([
                MockObjectDetector.person(confidence: 0.94),
                MockObjectDetector.car(confidence: 0.99)
            ]),
            simulatedLatency: .milliseconds(1))
        let publisher = MockEventPublisher()
        let (engine, _) = makeEngine(detector: detector, publisher: publisher)

        try await engine.start()
        try await Task.sleep(for: .seconds(1))
        await engine.stop()

        let events = await publisher.publishedEvents
        XCTAssertFalse(events.isEmpty, "person deveria ter sido publicada ao menos uma vez")
        XCTAssertTrue(events.allSatisfy { $0.confidence == 0.94 },
                      "car (0.99) não deve vazar: só person passa no filtro de classe")
        XCTAssertTrue(events.allSatisfy { $0.camera == "garage" && $0.detected })
    }

    func testBelowThresholdIsIgnored() async throws {
        // person presente, mas abaixo do threshold → nenhum evento.
        let detector = MockObjectDetector(
            behavior: .fixed([MockObjectDetector.person(confidence: 0.30)]),
            simulatedLatency: .milliseconds(1))
        let publisher = MockEventPublisher()
        let (engine, _) = makeEngine(detector: detector, publisher: publisher, threshold: 0.5)

        try await engine.start()
        try await Task.sleep(for: .milliseconds(600))
        await engine.stop()

        let events = await publisher.publishedEvents
        XCTAssertTrue(events.isEmpty, "confiança 0.30 < threshold 0.5 não deve publicar")
    }

    // MARK: - Throttle

    func testThrottleDropsFrames() async throws {
        // Fonte a 20 FPS, alvo 5 FPS: em ~1s devem sair MUITO menos que os ~20 frames da fonte.
        let detector = MockObjectDetector(
            behavior: .fixed([MockObjectDetector.person(confidence: 0.9)]),
            simulatedLatency: .milliseconds(1))
        let publisher = MockEventPublisher()
        let (engine, _) = makeEngine(detector: detector, publisher: publisher, sourceFPS: 20, targetFPS: 5)

        try await engine.start()
        try await Task.sleep(for: .seconds(1))
        await engine.stop()

        let count = await publisher.publishedEvents.count
        XCTAssertGreaterThanOrEqual(count, 1, "deveria emitir alguns eventos")
        XCTAssertLessThan(count, 12, "o throttle deveria descartar a maioria dos frames de 20 FPS")
    }

    // MARK: - Retry de publicação

    func testPublishRetryReconnects() async throws {
        // Publisher falha 1x antes de suceder → engine reconecta e reenvia.
        let detector = MockObjectDetector(
            behavior: .fixed([MockObjectDetector.person(confidence: 0.9)]),
            simulatedLatency: .milliseconds(1))
        let publisher = MockEventPublisher(publishFailuresBeforeSuccess: 1)
        let (engine, _) = makeEngine(detector: detector, publisher: publisher)

        try await engine.start()
        try await Task.sleep(for: .seconds(1))
        await engine.stop()

        let events = await publisher.publishedEvents
        let attempts = await publisher.publishAttempts
        let connects = await publisher.connectCount

        XCTAssertGreaterThanOrEqual(events.count, 1, "após o retry, ao menos um evento deve ser entregue")
        XCTAssertGreaterThan(attempts, events.count, "a falha inicial gera uma tentativa extra")
        XCTAssertGreaterThanOrEqual(connects, 2, "1 connect inicial + ao menos 1 reconexão do retry")
    }

    // MARK: - Ciclo de vida

    func testStopIsIdempotentAndStructured() async throws {
        let detector = MockObjectDetector(
            behavior: .fixed([MockObjectDetector.person(confidence: 0.9)]),
            simulatedLatency: .milliseconds(1))
        let publisher = MockEventPublisher()
        let (engine, _) = makeEngine(detector: detector, publisher: publisher)

        try await engine.start()
        try await Task.sleep(for: .milliseconds(200))
        await engine.stop()
        await engine.stop() // segunda chamada não deve travar nem quebrar

        let connected = await publisher.connected
        XCTAssertFalse(connected, "stop() deve desconectar o publisher")
    }
}
