/// Regula a taxa: recebe 15–30 fps, entrega targetFPS (ex.: 5), descartando o resto.
/// Isolado porque "pular frames" é política, não característica da fonte
/// (permite estratégia adaptativa por bateria/temperatura no futuro).
/// Refina `Sendable`: é um serviço de vida longa injetado e usado entre actors.
protocol FrameScheduler: Sendable {
    var targetFPS: Double { get }
    func throttled(_ source: AsyncStream<VideoFrame>) -> AsyncStream<VideoFrame>
}
