import Foundation
import CoreML

/// Container de DI simples: fabrica o pipeline REAL a partir de `AppSettings` + senhas.
///
/// Cada START cria instâncias NOVAS (a fonte RTSP parada é terminal — decisão do Módulo 3),
/// então este container é a única peça que conhece as implementações concretas. Trocar um
/// backend (ex.: publisher REST no futuro) é mudar só aqui.
struct AppContainer {

    /// Nome do modelo CoreML em Resources/ (gerado por Scripts/export-yolo-coreml.py).
    var modelName = "yolo11n"

    func makeEngine(settings: AppSettings, rtspPassword: String?, mqttPassword: String?) -> PipelineEngine {
        let source = RTSPFrameSource(config: .init(
            url: settings.rtspURL,
            username: settings.rtspUsername.isEmpty ? nil : settings.rtspUsername,
            password: rtspPassword
        ))

        let scheduler = RateLimitingFrameScheduler(targetFPS: settings.targetFPS)

        // `.cpuAndGPU` simula no iPad (A14) o caminho do A11 (sem ANE de terceiros).
        let computeUnits: MLComputeUnits = settings.simulateNeuralEngineBypass ? .cpuAndGPU : .all
        let detector = VisionObjectDetector(modelName: modelName, computeUnits: computeUnits)

        let publisher = MQTTEventPublisher(config: .init(
            host: settings.mqttHost,
            port: UInt16(clamping: settings.mqttPort),
            username: settings.mqttUsername.isEmpty ? nil : settings.mqttUsername,
            password: mqttPassword,
            useTLS: settings.mqttUseTLS
        ))

        return PipelineEngine(
            source: source,
            scheduler: scheduler,
            detector: detector,
            publisher: publisher,
            configuration: .init(
                cameraName: settings.cameraName,
                targetLabel: "person",                       // MVP: só person
                confidenceThreshold: Float(settings.confidenceThreshold)
            )
        )
    }
}
