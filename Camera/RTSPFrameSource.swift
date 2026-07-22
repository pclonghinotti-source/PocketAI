import Foundation
import os

/// `FrameSource` real: RTSP → demux (FFmpeg) → decode em HW (VideoToolbox) → `CVPixelBuffer`.
///
/// Compõe `RTSPDemuxer` + `VideoToolboxDecoder` num loop que roda numa **thread dedicada**:
/// `av_read_frame` é bloqueante e travaria tanto o executor do `actor` quanto o pool
/// cooperativo do Swift Concurrency. A thread alimenta o `AsyncStream(.bufferingNewest(1))`
/// (latest-wins), exatamente o mesmo contrato do `MockFrameSource` — o `PipelineEngine` não muda.
///
/// Reinício: uma fonte parada é terminal (o stream finaliza). Para reconectar com nova config,
/// crie uma nova instância via DI. Reconexão automática com backoff é do módulo Networking.
actor RTSPFrameSource: FrameSource {

    struct Config: Sendable {
        let url: String
        let username: String?
        let password: String?
        let openTimeout: TimeInterval   // ex.: 10s — falha rápido se a câmera não responde
        let readTimeout: TimeInterval   // ex.: 5s  — sem dados por N s → aborta a leitura

        init(url: String, username: String? = nil, password: String? = nil,
             openTimeout: TimeInterval = 10, readTimeout: TimeInterval = 5) {
            self.url = url
            self.username = username
            self.password = password
            self.openTimeout = openTimeout
            self.readTimeout = readTimeout
        }
    }

    enum StartError: Error { case invalidURL, alreadyRunning }

    nonisolated let frames: AsyncStream<VideoFrame>
    private nonisolated let continuation: AsyncStream<VideoFrame>.Continuation

    private let config: Config
    private let interrupt = InterruptToken()
    private var finished: AsyncSignal?
    private var isRunning = false

    private let log = Logger(subsystem: "com.pocketai", category: "RTSPFrameSource")

    init(config: Config) {
        self.config = config
        var captured: AsyncStream<VideoFrame>.Continuation!
        self.frames = AsyncStream(bufferingPolicy: .bufferingNewest(1)) { captured = $0 }
        self.continuation = captured
    }

    /// Só retorna (sem erro) quando a sessão RTSP abriu de fato — dá feedback imediato ao
    /// botão START. Se a câmera estiver inacessível, LANÇA. O loop de leitura segue na thread.
    func start() async throws {
        guard !isRunning else { throw StartError.alreadyRunning }
        guard let authenticatedURL = Self.authenticatedURL(config) else { throw StartError.invalidURL }

        isRunning = true
        interrupt.reset()
        let signal = AsyncSignal()
        finished = signal

        let cont = continuation
        let token = interrupt
        let cfg = config

        do {
            try await withCheckedThrowingContinuation { (openCont: CheckedContinuation<Void, Error>) in
                let oneShot = OneShot(openCont) // garante resume único (sucesso OU falha do open)
                let thread = Thread {
                    RTSPFrameSource.runSession(
                        url: authenticatedURL, config: cfg, interrupt: token, continuation: cont,
                        onOpen: { oneShot.resume($0) },
                        onFinished: { signal.signal() })
                }
                thread.name = "PocketAI.RTSPFrameSource"
                thread.stackSize = 1 << 20
                thread.start()
            }
        } catch {
            // Falha no open: desfaz o estado. A thread já sinalizou `finished` e finalizou o stream.
            isRunning = false
            finished = nil
            log.error("Falha ao abrir RTSP: \(error.localizedDescription, privacy: .public)")
            throw error
        }
    }

    /// Desligamento estruturado: aborta a leitura (via interrupt) e só retorna quando a thread encerra.
    func stop() async {
        guard isRunning else { return }
        isRunning = false
        interrupt.cancel()
        await finished?.wait()
        finished = nil
    }

    // MARK: - Loop de sessão (thread dedicada, off-actor)

    private static func runSession(
        url: String,
        config: Config,
        interrupt: InterruptToken,
        continuation: AsyncStream<VideoFrame>.Continuation,
        onOpen: @escaping (Result<Void, Error>) -> Void,
        onFinished: @escaping () -> Void
    ) {
        let demuxer = RTSPDemuxer(
            url: url, openTimeout: config.openTimeout, readTimeout: config.readTimeout, interrupt: interrupt)

        // Encerra o stream e sinaliza o fim em QUALQUER caminho de saída.
        defer {
            demuxer.close()
            continuation.finish()
            onFinished()
        }

        let decoder: VideoToolboxDecoder
        do {
            try demuxer.open()
            decoder = VideoToolboxDecoder(codec: demuxer.codec, extradata: demuxer.extradata) { frame in
                continuation.yield(frame)   // latest-wins: buffer de 1
            }
            onOpen(.success(()))            // câmera acessível → START pode retornar
        } catch {
            onOpen(.failure(error))
            return
        }
        defer { decoder.invalidate() }

        do {
            while !interrupt.isCancelled {
                guard let packet = try demuxer.readPacket() else { break } // EOF
                do {
                    try decoder.decode(packet)
                } catch {
                    // Erro de decode de um frame isolado: descarta e segue (latest-wins).
                    continue
                }
            }
        } catch {
            // Erro de leitura ou cancelamento: encerra a sessão (defers cuidam da limpeza).
        }
    }

    // MARK: - Credenciais

    /// Injeta usuário/senha na URL RTSP com percent-encoding correto (senha vem do Keychain).
    private static func authenticatedURL(_ config: Config) -> String? {
        guard !config.url.isEmpty else { return nil }
        guard let user = config.username, !user.isEmpty else { return config.url }
        guard var comps = URLComponents(string: config.url) else { return nil }
        comps.user = user
        comps.password = config.password
        return comps.string
    }
}

/// Sinal one-shot thread-safe: a thread de leitura acorda quem espera em `stop()`.
/// `@unchecked Sendable`: sincronizado pelo `NSLock`.
final class AsyncSignal: @unchecked Sendable {
    private let lock = NSLock()
    private var isSignaled = false
    private var waiters: [CheckedContinuation<Void, Never>] = []

    func signal() {
        lock.lock()
        isSignaled = true
        let pending = waiters
        waiters.removeAll()
        lock.unlock()
        pending.forEach { $0.resume() }
    }

    func wait() async {
        await withCheckedContinuation { cont in
            lock.lock()
            if isSignaled {
                lock.unlock()
                cont.resume()
            } else {
                waiters.append(cont)
                lock.unlock()
            }
        }
    }
}

/// Garante que uma `CheckedContinuation` seja retomada no máximo uma vez (sucesso OU falha).
/// `@unchecked Sendable`: sincronizado pelo `NSLock`.
final class OneShot: @unchecked Sendable {
    private let lock = NSLock()
    private var done = false
    private let continuation: CheckedContinuation<Void, Error>

    init(_ continuation: CheckedContinuation<Void, Error>) {
        self.continuation = continuation
    }

    func resume(_ result: Result<Void, Error>) {
        lock.lock()
        if done { lock.unlock(); return }
        done = true
        lock.unlock()
        switch result {
        case .success: continuation.resume()
        case .failure(let error): continuation.resume(throwing: error)
        }
    }
}
