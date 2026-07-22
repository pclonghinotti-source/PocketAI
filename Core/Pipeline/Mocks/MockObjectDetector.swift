import Foundation
import CoreGraphics

/// Detector roteirizado para exercitar o filtro person+threshold e o caminho de erro.
///
/// É um `actor` como a impl real (Vision/CoreML tem acesso serial ao modelo), então
/// o `PipelineEngine` vê exatamente o mesmo contrato de concorrência que verá em produção.
actor MockObjectDetector: ObjectDetector {

    enum Behavior {
        /// Retorna sempre a mesma lista.
        case fixed([Detection])
        /// Gera a lista por chamada (ex.: alternar person / não-person a cada frame).
        case scripted(@Sendable () -> [Detection])
        /// Sempre lança — para validar o `catch` do engine.
        case failing
    }

    enum MockError: Error { case detectionFailed }

    private let behavior: Behavior
    /// Latência simulada da inferência (o A11 na GPU não é instantâneo).
    private let simulatedLatency: Duration

    init(behavior: Behavior, simulatedLatency: Duration = .milliseconds(30)) {
        self.behavior = behavior
        self.simulatedLatency = simulatedLatency
    }

    func detect(_ frame: VideoFrame) async throws -> [Detection] {
        try? await Task.sleep(for: simulatedLatency)
        switch behavior {
        case .fixed(let detections): return detections
        case .scripted(let make):    return make()
        case .failing:               throw MockError.detectionFailed
        }
    }

    // MARK: - Helpers de conveniência para montar cenários

    static func person(confidence: Float) -> Detection {
        Detection(label: "person", confidence: confidence,
                  boundingBox: CGRect(x: 0.4, y: 0.4, width: 0.2, height: 0.3))
    }

    static func car(confidence: Float) -> Detection {
        Detection(label: "car", confidence: confidence,
                  boundingBox: CGRect(x: 0.1, y: 0.5, width: 0.3, height: 0.2))
    }
}
