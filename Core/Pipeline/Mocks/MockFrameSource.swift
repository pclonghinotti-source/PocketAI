import Foundation
import CoreMedia
import CoreVideo

/// Fonte de frames sintética para validar o pipeline sem RTSP/hardware.
///
/// Emite frames a ~`sourceFPS` (ex.: 20) para o `FrameScheduler` ter o que descartar.
/// O `AsyncStream` usa `.bufferingNewest(1)` — latest-wins, espelhando o contrato
/// que a fonte real (FFmpeg + VideoToolbox) deverá honrar.
///
/// É um `actor` (satisfaz `FrameSource: Sendable` com estado mutável `emitTask`
/// protegido). `frames` é `nonisolated let` para satisfazer o requisito síncrono
/// do protocolo sem `await`.
///
/// Semântica de reinício: uma fonte parada é terminal (o stream finaliza). Para
/// reiniciar com nova config, crie uma nova instância via DI — não reutilize esta.
actor MockFrameSource: FrameSource {

    nonisolated let frames: AsyncStream<VideoFrame>
    private nonisolated let continuation: AsyncStream<VideoFrame>.Continuation
    private let sourceFPS: Double
    private var emitTask: Task<Void, Never>?

    init(sourceFPS: Double = 20) {
        self.sourceFPS = sourceFPS

        var capturedContinuation: AsyncStream<VideoFrame>.Continuation!
        self.frames = AsyncStream(bufferingPolicy: .bufferingNewest(1)) { continuation in
            capturedContinuation = continuation
        }
        self.continuation = capturedContinuation
    }

    func start() async throws {
        let interval = Duration.seconds(1.0 / sourceFPS)
        emitTask = Task { [continuation, sourceFPS] in
            var frameIndex: Int64 = 0
            while !Task.isCancelled {
                if let buffer = Self.makePixelBuffer() {
                    let pts = CMTime(value: frameIndex, timescale: CMTimeScale(sourceFPS))
                    continuation.yield(VideoFrame(pixelBuffer: buffer, presentationTime: pts))
                }
                frameIndex += 1
                try? await Task.sleep(for: interval)
            }
        }
    }

    func stop() async {
        emitTask?.cancel()
        emitTask = nil
        continuation.finish()
    }

    /// Buffer 320×320 BGRA vazio — só precisamos de um `CVPixelBuffer` válido
    /// atravessando o pipeline; o conteúdo é irrelevante para o mock.
    private static func makePixelBuffer() -> CVPixelBuffer? {
        var pixelBuffer: CVPixelBuffer?
        let attrs = [kCVPixelBufferIOSurfacePropertiesKey: [:]] as CFDictionary
        CVPixelBufferCreate(
            kCFAllocatorDefault, 320, 320,
            kCVPixelFormatType_32BGRA, attrs, &pixelBuffer
        )
        return pixelBuffer
    }
}
