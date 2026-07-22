/// Fonte de frames decodificados. Abstrai o backend (FFmpeg+VideoToolbox / mock).
/// A implementação DEVE usar latest-wins (buffer 1) para descartar frames e
/// evitar backpressure — este é o "pular frames" resolvido na fonte.
/// Refina `Sendable`: é um serviço de vida longa injetado e usado entre actors.
protocol FrameSource: Sendable {
    var frames: AsyncStream<VideoFrame> { get }
    func start() async throws
    func stop() async
}
