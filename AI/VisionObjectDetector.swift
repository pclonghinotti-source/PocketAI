import Foundation
import Vision
import CoreML
import CoreVideo

/// Inferência real: Vision (`VNCoreMLRequest`) + CoreML (YOLO11n/v8n, COCO, NMS embutido).
///
/// `actor`: acesso serial ao `VNCoreMLRequest`/`MLModel` (não são thread-safe para chamadas
/// concorrentes). `VNImageRequestHandler.perform` é síncrono/bloqueante, mas roda dentro do
/// actor sem travar o resto do pipeline — o `PipelineEngine` já processa frame a frame via
/// `await`, e o latest-wins da fonte garante que frames não se acumulam esperando.
///
/// Devolve TODAS as detecções acima do limiar interno da Vision (não filtra por label/threshold
/// de negócio aqui — isso é responsabilidade do `PipelineEngine`, como fixado no Módulo 1/2).
actor VisionObjectDetector: ObjectDetector {

    enum DetectorError: Error {
        case modelLoadFailed(Error)
        case unexpectedResultType
        case requestFailed(Error)
    }

    /// Nome do arquivo do modelo em `Resources/` (sem extensão), gerado por
    /// `Scripts/export-yolo-coreml.py`. Ex.: "yolo11n_person" (mlpackage/mlmodelc compilado).
    private let modelName: String
    /// Onde a inferência roda: `.all` deixa o SO escolher (ANE se disponível), `.cpuAndGPU`
    /// força bypass da ANE — usado para simular no iPad (A14) o caminho real do A11 (sem ANE
    /// de terceiros). Ver Core/Protocols/ObjectDetector.swift e a decisão do Módulo 4.
    private let computeUnits: MLComputeUnits

    private lazy var request: VNCoreMLRequest = {
        // Falha aqui é sempre erro de empacotamento (modelo ausente do bundle) — decisão
        // consciente de crash cedo em vez de mascarar com um detector "vazio" silencioso.
        do {
            let config = MLModelConfiguration()
            config.computeUnits = computeUnits

            guard let url = Bundle.main.url(forResource: modelName, withExtension: "mlmodelc")
                ?? Bundle.main.url(forResource: modelName, withExtension: "mlpackage") else {
                fatalError("Modelo '\(modelName)' não encontrado no bundle. Rode Scripts/export-yolo-coreml.py e adicione o .mlpackage a Resources/.")
            }
            let model = try MLModel(contentsOf: url, configuration: config)
            let vnModel = try VNCoreMLModel(for: model)

            let req = VNCoreMLRequest(model: vnModel)
            // O modelo já foi exportado com NMS embutido (yolo export ... nms=True), então
            // a Vision aplica só o crop/scale de input — sem pós-processamento manual aqui.
            req.imageCropAndScaleOption = .scaleFit
            return req
        } catch {
            fatalError("Falha ao carregar modelo CoreML '\(modelName)': \(error)")
        }
    }()

    init(modelName: String, computeUnits: MLComputeUnits = .all) {
        self.modelName = modelName
        self.computeUnits = computeUnits
    }

    func detect(_ frame: VideoFrame) async throws -> [Detection] {
        let handler = VNImageRequestHandler(cvPixelBuffer: frame.pixelBuffer, options: [:])

        do {
            try handler.perform([request])
        } catch {
            throw DetectorError.requestFailed(error)
        }

        guard let observations = request.results as? [VNRecognizedObjectObservation] else {
            // Sem resultados (frame sem nenhum objeto) chega aqui como array vazio, não nil —
            // isto só dispara se o modelo devolver um tipo de output inesperado (erro de export).
            if request.results == nil { return [] }
            throw DetectorError.unexpectedResultType
        }

        return observations.map { observation in
            // `labels` vem ordenado por confiança; o top-1 é a classe vencedora do NMS.
            let topLabel = observation.labels.first
            return Detection(
                label: topLabel?.identifier ?? "unknown",
                confidence: topLabel?.confidence ?? observation.confidence,
                // Vision já entrega em coordenadas normalizadas (0...1); mesma convenção do Detection.
                boundingBox: observation.boundingBox
            )
        }
    }
}
