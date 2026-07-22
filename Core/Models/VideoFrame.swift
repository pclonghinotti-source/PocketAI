import CoreMedia
import CoreVideo

/// Um único frame de vídeo já decodificado, pronto para inferência.
/// Carregamos CVPixelBuffer porque é o que o VideoToolbox entrega (hardware)
/// e o que a Vision/CoreML consome — mesmo buffer atravessa o pipeline sem cópia.
/// `@unchecked Sendable`: `CVPixelBuffer` é um tipo Core Foundation não-Sendable, mas o
/// frame cruza a fronteira de actors no caminho quente. É seguro porque, sob latest-wins,
/// transferimos a POSSE do buffer adiante e nunca o mutamos concorrentemente.
struct VideoFrame: @unchecked Sendable {
    let pixelBuffer: CVPixelBuffer
    /// Presentation timestamp do decoder; usado no latest-wins e em debug de latência.
    let presentationTime: CMTime
}
