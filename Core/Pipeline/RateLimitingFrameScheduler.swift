import Foundation

/// Implementação concreta do `FrameScheduler`: throttle por intervalo de tempo.
///
/// Estratégia (latest-wins na cadência): deixa passar um frame só se já se passou
/// pelo menos `1/targetFPS` desde o último emitido; caso contrário, descarta.
/// Sem timers, sem fila de espera, O(1) por frame — o descarte é a própria decisão.
///
/// Usa relógio monotônico de parede (`ContinuousClock`, iOS 16+) em vez do PTS do
/// frame de propósito: é robusto a PTS inválido/pausado do decoder e mede a cadência
/// real percebida pelo consumidor. O PTS continua viajando no `VideoFrame` para
/// latest-wins na fonte e debug de latência.
///
/// `final class` + apenas `let` imutáveis → seguro de compartilhar entre tasks.
final class RateLimitingFrameScheduler: FrameScheduler {

    let targetFPS: Double

    /// Intervalo mínimo entre dois frames emitidos. Pré-calculado no init.
    private let minInterval: Duration

    init(targetFPS: Double) {
        precondition(targetFPS > 0, "targetFPS deve ser > 0")
        self.targetFPS = targetFPS
        self.minInterval = .seconds(1.0 / targetFPS)
    }

    func throttled(_ source: AsyncStream<VideoFrame>) -> AsyncStream<VideoFrame> {
        AsyncStream { continuation in
            // Task dedicada consome a fonte e reemite só o que respeita a cadência.
            let task = Task {
                let clock = ContinuousClock()
                var lastEmitted: ContinuousClock.Instant?

                for await frame in source {
                    let now = clock.now
                    if let last = lastEmitted, now - last < minInterval {
                        continue // dentro do intervalo → descarta este frame
                    }
                    lastEmitted = now
                    continuation.yield(frame)
                }
                // Fonte finalizou → propaga o fim rio abaixo.
                continuation.finish()
            }

            // Se o consumidor a jusante cancelar/soltar o stream, paramos de consumir.
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
