import Foundation

/// Harness headless para validar a orquestração do `PipelineEngine` com mocks,
/// SEM RTSP/CoreML. Não faz parte do app de produção — é uma ferramenta de dev.
///
/// Como rodar: chame `await PipelineValidationHarness.run()` de um teste, de um
/// `@main` de debug, ou de um botão temporário. Imprime um resumo do que passou
/// pelo throttle, do filtro person+threshold e do retry de publicação.
enum PipelineValidationHarness {

    static func run() async {
        print("── PocketAI · Validação do Pipeline (mocks) ─────────────")

        // Fonte a 20 FPS; o scheduler deve derrubar para ~5 FPS (1 a cada ~4 frames).
        let source = MockFrameSource(sourceFPS: 20)
        let scheduler = RateLimitingFrameScheduler(targetFPS: 5)

        // Detector roteirizado: alterna person@0.94 / car@0.99 a cada inferência.
        // Valida DUAS coisas: só `person` passa no filtro; `car` (mesmo com 0.99) é ignorado.
        let flip = FlipFlop()
        let detector = MockObjectDetector(
            behavior: .scripted { [flip] in
                flip.next()
                    ? [MockObjectDetector.person(confidence: 0.94)]
                    : [MockObjectDetector.car(confidence: 0.99)]
            },
            simulatedLatency: .milliseconds(20)
        )

        // Publisher que falha 1x antes de suceder → exercita o retry (reconecta + reenvia).
        let publisher = MockEventPublisher(publishFailuresBeforeSuccess: 1)

        let engine = PipelineEngine(
            source: source,
            scheduler: scheduler,
            detector: detector,
            publisher: publisher,
            configuration: .init(
                cameraName: "garage",
                targetLabel: "person",
                confidenceThreshold: 0.5
            )
        )

        // Roda ~1s e para de forma estruturada.
        do {
            try await engine.start()
        } catch {
            print("‼️ start() falhou: \(error)")
            return
        }
        try? await Task.sleep(for: .seconds(1))
        await engine.stop()

        // Inspeciona os contadores do publisher.
        let events = await publisher.publishedEvents
        let attempts = await publisher.publishAttempts
        let connects = await publisher.connectCount

        print("Frames processados que viraram evento (person): \(events.count)")
        print("Tentativas de publish (inclui o retry): \(attempts)")
        print("connect() chamado: \(connects)x (1 inicial + reconexões do retry)")

        if let first = events.first {
            print("Exemplo de evento: camera=\(first.camera) conf=\(first.confidence) detected=\(first.detected)")
        }

        // Checagens de sanidade (não é um framework de teste, só asserts visíveis).
        assert(events.allSatisfy { $0.confidence == 0.94 },
               "Só detecções `person` (0.94) deveriam ter sido publicadas; `car` deve ser filtrado.")
        assert(connects >= 2, "O retry deveria ter forçado ao menos 1 reconexão.")
        assert(events.count < 20, "O throttle deveria ter descartado a maioria dos frames de 20 FPS.")

        print("✅ Filtro, throttle e retry validados.")
        print("─────────────────────────────────────────────────────────")
    }
}

/// Alternador booleano com estado — `person` num frame, `car` no seguinte.
/// `class` para manter estado entre chamadas da closure `@Sendable`; acesso é serial
/// (uma inferência por vez no `actor` detector), então não há corrida real.
private final class FlipFlop: @unchecked Sendable {
    private var value = false
    func next() -> Bool {
        value.toggle()
        return value
    }
}
