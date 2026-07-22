import Foundation
import CoreMedia
import CFFmpeg

// `VideoCodec` e `NALUnit` moram em Core/Decoding/VideoParsing.swift (mesmo módulo do app).

/// Token thread-safe de cancelamento/timeout compartilhado com o interrupt callback do FFmpeg.
///
/// `av_read_frame`/`avformat_open_input` são bloqueantes; sem isto, um cabo puxado ou uma
/// câmera muda travariam a leitura para sempre. O callback consulta `shouldInterrupt()`.
/// `@unchecked Sendable`: a serialização é feita pelo `NSLock` interno.
final class InterruptToken: @unchecked Sendable {
    private let lock = NSLock()
    private var cancelled = false
    private var deadline = CFAbsoluteTime.greatestFiniteMagnitude

    func reset() {
        lock.lock(); cancelled = false; deadline = .greatestFiniteMagnitude; lock.unlock()
    }
    func cancel() {
        lock.lock(); cancelled = true; lock.unlock()
    }
    var isCancelled: Bool {
        lock.lock(); defer { lock.unlock() }; return cancelled
    }
    /// Renova o prazo a cada operação; se estourar sem novos dados, o callback aborta.
    func extendDeadline(_ seconds: TimeInterval) {
        lock.lock(); deadline = CFAbsoluteTimeGetCurrent() + seconds; lock.unlock()
    }
    func clearDeadline() {
        lock.lock(); deadline = .greatestFiniteMagnitude; lock.unlock()
    }
    func shouldInterrupt() -> Bool {
        lock.lock(); defer { lock.unlock() }
        return cancelled || CFAbsoluteTimeGetCurrent() > deadline
    }
}

/// Callback C do FFmpeg (`AVIOInterruptCB`). Global sem captura → conversível para `@convention(c)`.
/// Retorna != 0 para abortar a operação bloqueante em curso.
private func pocketai_interrupt_cb(_ opaque: UnsafeMutableRawPointer?) -> Int32 {
    guard let opaque else { return 0 }
    let token = Unmanaged<InterruptToken>.fromOpaque(opaque).takeUnretainedValue()
    return token.shouldInterrupt() ? 1 : 0
}

/// `avformat_network_init()` deve rodar uma vez no processo. Global lazy = run-once.
private let ffmpegNetworkInit: Void = {
    avformat_network_init()
}()

/// Envelopa `libavformat`: abre RTSP e entrega pacotes de vídeo comprimidos + parameter sets.
///
/// NÃO é `Sendable` de propósito: vive confinado à thread de leitura do `RTSPFrameSource`
/// (uso estritamente serial), então não precisa de sincronização própria.
final class RTSPDemuxer {

    struct Packet {
        let data: Data          // pacote comprimido (Annex B, como o RTP entrega)
        let pts: CMTime
        let isKeyframe: Bool
    }

    enum DemuxError: Error {
        case allocFailed
        case openFailed(Int32)
        case streamInfoFailed(Int32)
        case noVideoStream
        case unsupportedCodec
        case readFailed(Int32)
        case cancelled
    }

    private let url: String
    private let openTimeout: TimeInterval
    private let readTimeout: TimeInterval
    private let interrupt: InterruptToken

    private var ctx: UnsafeMutablePointer<AVFormatContext>?
    private var videoStreamIndex: Int32 = -1
    private var timeBaseNum: Int32 = 1
    private var timeBaseDen: Int32 = 90_000

    private(set) var codec: VideoCodec = .h264
    /// avcC/hvcC ou Annex B, conforme o FFmpeg preencheu a partir do SDP.
    private(set) var extradata = Data()

    init(url: String, openTimeout: TimeInterval, readTimeout: TimeInterval, interrupt: InterruptToken) {
        self.url = url
        self.openTimeout = openTimeout
        self.readTimeout = readTimeout
        self.interrupt = interrupt
    }

    /// Abre a sessão RTSP (TCP), busca o stream de vídeo e extrai codec/extradata/time_base.
    func open() throws {
        _ = ffmpegNetworkInit

        guard let context = avformat_alloc_context() else { throw DemuxError.allocFailed }

        // Interrupt callback ANTES do open → o próprio open pode ser abortado por timeout/cancel.
        context.pointee.interrupt_callback.callback = pocketai_interrupt_cb
        context.pointee.interrupt_callback.opaque = Unmanaged.passUnretained(interrupt).toOpaque()
        interrupt.extendDeadline(openTimeout)

        // Opções: TCP (evita perda/reordenação de UDP no Wi-Fi) + timeouts de socket.
        var opts: OpaquePointer?
        av_dict_set(&opts, "rtsp_transport", "tcp", 0)
        av_dict_set(&opts, "rtsp_flags", "prefer_tcp", 0)
        // `stimeout` (µs): nome pode variar por versão do FFmpeg; o interrupt callback é o
        // mecanismo de timeout robusto e independente de versão. VERIFICAR no build usado.
        av_dict_set(&opts, "stimeout", String(Int(readTimeout * 1_000_000)), 0)
        av_dict_set(&opts, "max_delay", "500000", 0)

        var ctxPtr: UnsafeMutablePointer<AVFormatContext>? = context
        let ret = avformat_open_input(&ctxPtr, url, nil, &opts)
        av_dict_free(&opts)
        guard ret == 0, let opened = ctxPtr else {
            // Em falha, avformat_open_input já libera o contexto e zera o ponteiro.
            if interrupt.isCancelled { throw DemuxError.cancelled }
            throw DemuxError.openFailed(ret)
        }
        self.ctx = opened

        interrupt.extendDeadline(openTimeout)
        let infoRet = avformat_find_stream_info(opened, nil)
        guard infoRet >= 0 else { throw DemuxError.streamInfoFailed(infoRet) }

        let streamIdx = av_find_best_stream(opened, AVMEDIA_TYPE_VIDEO, -1, -1, nil, 0)
        guard streamIdx >= 0, let stream = opened.pointee.streams[Int(streamIdx)] else {
            throw DemuxError.noVideoStream
        }
        videoStreamIndex = streamIdx

        guard let par = stream.pointee.codecpar else { throw DemuxError.noVideoStream }
        switch par.pointee.codec_id {
        case AV_CODEC_ID_H264: codec = .h264
        case AV_CODEC_ID_HEVC: codec = .hevc
        default: throw DemuxError.unsupportedCodec
        }

        if let ed = par.pointee.extradata, par.pointee.extradata_size > 0 {
            extradata = Data(bytes: ed, count: Int(par.pointee.extradata_size))
        }

        let tb = stream.pointee.time_base
        timeBaseNum = tb.num
        timeBaseDen = (tb.den == 0) ? 90_000 : tb.den

        interrupt.clearDeadline()
    }

    /// Lê o próximo pacote de VÍDEO. Retorna `nil` no fim do stream (EOF).
    func readPacket() throws -> Packet? {
        guard let ctx else { return nil }
        guard let pkt = av_packet_alloc() else { throw DemuxError.readFailed(-1) }
        defer { var p: UnsafeMutablePointer<AVPacket>? = pkt; av_packet_free(&p) }

        while true {
            if interrupt.isCancelled { throw DemuxError.cancelled }
            interrupt.extendDeadline(readTimeout)

            let ret = av_read_frame(ctx, pkt)
            if ret == pai_averror_eof() { return nil }
            if ret < 0 {
                av_packet_unref(pkt)
                if interrupt.isCancelled { throw DemuxError.cancelled }
                if ret == pai_averror_eagain() { continue }
                throw DemuxError.readFailed(ret)
            }

            if pkt.pointee.stream_index == videoStreamIndex,
               let bytes = pkt.pointee.data, pkt.pointee.size > 0 {
                let data = Data(bytes: bytes, count: Int(pkt.pointee.size))

                // PTS → segundos → CMTime. Fallback para DTS ou 0 se ausente.
                let noPTS = pai_av_nopts_value()
                let raw = (pkt.pointee.pts != noPTS) ? pkt.pointee.pts
                        : (pkt.pointee.dts != noPTS) ? pkt.pointee.dts : 0
                let seconds = Double(raw) * Double(timeBaseNum) / Double(timeBaseDen)
                let pts = CMTime(seconds: seconds, preferredTimescale: 90_000)

                let isKey = (pkt.pointee.flags & 0x0001) != 0  // AV_PKT_FLAG_KEY

                av_packet_unref(pkt)
                return Packet(data: data, pts: pts, isKeyframe: isKey)
            }
            av_packet_unref(pkt)
        }
    }

    func close() {
        if ctx != nil {
            avformat_close_input(&ctx)
            ctx = nil
        }
    }
}
