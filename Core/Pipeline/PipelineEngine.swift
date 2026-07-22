import Foundation
import os

/// Coordenador headless do pipeline. Encadeia:
///
///   FrameSource.frames → scheduler.throttled → detector.detect
///     → filtro [label == targetLabel && confidence >= threshold] → publisher.publish
///
/// É um `actor`: serializa o acesso ao estado mutável (`loopTask`, `isRunning`) sem
/// locks manuais. start()/stop() podem ser chamados da UI (MainActor) com segurança.
/// O trabalho pesado (inferência) roda dentro do `detector` (outro actor), então o
/// engine não fica bloqueado — ele só orquestra.
///
/// Nenhuma dependência de View: a inferência jamais depende da UI (camada de serviço).
actor PipelineEngine {

    /// Parâmetros de execução fixados no start. Filtro de classe/threshold moram AQUI,
    /// fora do `ObjectDetector` (que faz inferência pura), como decidido na arquitetura.
    struct Configuration {
        let cameraName: String
        let targetLabel: String        // MVP: "person"
        let confidenceThreshold: Float
    }

    // MARK: - Dependências (injetadas via protocolo)

    private let source: FrameSource
    private let scheduler: FrameScheduler
    private let detector: ObjectDetector
    private let publisher: EventPublisher
    private let configuration: Configuration

    // MARK: - Estado

    /// Task do loop de consumo. Guardada para cancelamento estruturado no stop().
    private var loopTask: Task<Void, Never>?
    private var isRunning = false

    private let log = Logger(subsystem: "com.pocketai", category: "PipelineEngine")

    init(
        source: FrameSource,
        scheduler: FrameScheduler,
        detector: ObjectDetector,
        publisher: EventPublisher,
        configuration: Configuration
    ) {
        self.source = source
        self.scheduler = scheduler
        self.detector = detector
        self.publisher = publisher
        self.configuration = configuration
    }

    // MARK: - Ciclo de vida

    /// Conecta a saída, inicia a fonte e começa o loop de consumo.
    /// Ordem: publisher primeiro (falha cedo se MQTT indisponível), depois a fonte.
    func start() async throws {
        guard !isRunning else { return }
        isRunning = true

        do {
            try await publisher.connect()
            try await source.start()
        } catch {
            // Falha no bring-up: desfaz o que conectou e volta ao estado parado.
            isRunning = false
            await publisher.disconnect()
            throw error
        }

        let throttled = scheduler.throttled(source.frames)

        // weak self evita reter o engine pela própria task (o engine detém a task).
        loopTask = Task { [weak self] in
            await self?.consume(throttled)
        }
    }

    /// Desligamento estruturado: só retorna quando o pipeline realmente parou.
    /// Ordem: cancela o loop → para a fonte (finaliza o stream) → aguarda o loop
    /// encerrar → desconecta a saída. Assim não publicamos evento de frame tardio.
    func stop() async {
        guard isRunning else { return }
        isRunning = false

        loopTask?.cancel()
        await source.stop()          // finaliza o AsyncStream → o `for await` termina
        _ = await loopTask?.value    // aguarda o encerramento real (reentrância OK no actor)
        loopTask = nil

        await publisher.disconnect()
    }

    // MARK: - Caminho quente

    /// Consome o stream já regulado. `for await` termina quando a fonte finaliza;
    /// a checagem de `Task.isCancelled` é rede de segurança para não iniciar uma nova
    /// inferência durante o desligamento.
    private func consume(_ stream: AsyncStream<VideoFrame>) async {
        for await frame in stream {
            if Task.isCancelled { break }
            await process(frame)
        }
    }

    /// Detecta, aplica o filtro person+threshold e publica se houver match.
    private func process(_ frame: VideoFrame) async {
        do {
            let detections = try await detector.detect(frame)

            // Filtro de classe + confiança (fora do detector). Basta o melhor match.
            let match = detections
                .filter { $0.label == configuration.targetLabel
                          && $0.confidence >= configuration.confidenceThreshold }
                .max { $0.confidence < $1.confidence }

            guard let match else { return }

            let event = DetectionEvent(
                detected: true,
                confidence: match.confidence,
                timestamp: Date(),
                camera: configuration.cameraName
            )
            await publish(event)

        } catch {
            // Inferência falhou neste frame: loga e segue. Latest-wins — o próximo frame vem.
            log.error("Falha na inferência: \(error.localizedDescription, privacy: .public)")
        }
    }

    /// Publica com retry mínimo: 1 reconexão + 1 reenvio; senão descarta.
    /// Eventos de presença são efêmeros — não enfileiramos (evita memória crescente
    /// e entrega de eventos velhos). Reconexão robusta com backoff fica no módulo Networking.
    private func publish(_ event: DetectionEvent) async {
        do {
            try await publisher.publish(event)
        } catch {
            do {
                try await publisher.connect()
                try await publisher.publish(event)
            } catch {
                log.error("Publish descartado após retry: \(error.localizedDescription, privacy: .public)")
            }
        }
    }
}
