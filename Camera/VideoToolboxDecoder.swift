import Foundation
import CoreMedia
import CoreVideo
import VideoToolbox

// `VideoCodec` e `NALUnit` (parsing puro) moram em Core/Decoding/VideoParsing.swift.

/// Decodifica pacotes H.264/H.265 em HARDWARE via VideoToolbox → `CVPixelBuffer`.
///
/// Pede saída `420YpCbCr8BiPlanarFullRange` (formato nativo do decoder) para EVITAR
/// conversão de cor — economia de CPU/energia crítica no A11. A Vision consome biplanar direto.
///
/// NÃO é `Sendable`: vive confinado à thread de leitura do `RTSPFrameSource`.
final class VideoToolboxDecoder {

    enum DecodeError: Error {
        case formatDescriptionFailed(OSStatus)
        case sessionCreateFailed(OSStatus)
        case sampleBufferFailed(OSStatus)
        case decodeFailed(OSStatus)
    }

    private let codec: VideoCodec
    private let onFrame: (VideoFrame) -> Void

    private var formatDescription: CMVideoFormatDescription?
    private var session: VTDecompressionSession?
    /// Últimos parameter sets vistos, por tipo de NAL (H264: 7=SPS 8=PPS / HEVC: 32=VPS 33=SPS 34=PPS).
    private var latestParams: [UInt8: Data] = [:]

    init(codec: VideoCodec, extradata: Data, onFrame: @escaping (VideoFrame) -> Void) {
        self.codec = codec
        self.onFrame = onFrame

        // Se o SDP já trouxe os parameter sets, monta o format description de imediato.
        if !extradata.isEmpty {
            let sets = NALUnit.parameterSets(fromExtradata: extradata, codec: codec)
            accumulate(sets)
            if let complete = completeParameterSetSet() {
                try? buildFormatDescription(from: complete)
            }
        }
    }

    // MARK: - Decode

    func decode(_ packet: RTSPDemuxer.Packet) throws {
        let nals = NALUnit.annexBUnits(in: packet.data)
        guard !nals.isEmpty else { return }

        // Parameter sets podem chegar in-band (antes do IDR). Acumula e (re)constrói se preciso.
        let inbandParams = nals.filter { NALUnit.isParameterSet($0, codec: codec) }
        if formatDescription == nil, !inbandParams.isEmpty {
            accumulate(inbandParams)
            if let complete = completeParameterSetSet() {
                try buildFormatDescription(from: complete)
            }
        }

        // Sem format description ainda (esperando o primeiro keyframe com params) → ignora.
        guard let fmt = formatDescription, let session else { return }

        // Só NALs de VCL (slices) vão no sample; SPS/PPS/VPS/SEI já estão no format description.
        let vcl = nals.filter { NALUnit.isVCL($0, codec: codec) }
        guard !vcl.isEmpty else { return }

        // Converte Annex B → AVCC: prefixo de 4 bytes big-endian com o tamanho de cada NAL.
        var avcc = Data()
        avcc.reserveCapacity(vcl.reduce(0) { $0 + $1.count + 4 })
        for nal in vcl {
            var len = UInt32(nal.count).bigEndian
            withUnsafeBytes(of: &len) { avcc.append(contentsOf: $0) }
            avcc.append(nal)
        }

        let sample = try makeSampleBuffer(avcc: avcc, formatDescription: fmt, pts: packet.pts)
        try decodeSample(sample, session: session)
    }

    func invalidate() {
        if let session {
            VTDecompressionSessionWaitForAsynchronousFrames(session)
            VTDecompressionSessionInvalidate(session)
        }
        session = nil
    }

    // MARK: - Format description / sessão

    private func accumulate(_ params: [Data]) {
        for p in params { latestParams[NALUnit.nalType(p, codec: codec)] = p }
    }

    /// Retorna o conjunto ordenado exigido pelas APIs do CoreMedia, ou `nil` se incompleto.
    private func completeParameterSetSet() -> [Data]? {
        switch codec {
        case .h264:
            guard let sps = latestParams[7], let pps = latestParams[8] else { return nil }
            return [sps, pps]
        case .hevc:
            guard let vps = latestParams[32], let sps = latestParams[33], let pps = latestParams[34] else { return nil }
            return [vps, sps, pps]
        }
    }

    private func buildFormatDescription(from sets: [Data]) throws {
        // Buffers estáveis para os N parameter sets durante a chamada (a API copia o conteúdo).
        var buffers: [UnsafeMutablePointer<UInt8>] = []
        var pointers: [UnsafePointer<UInt8>] = []
        var sizes: [Int] = []
        for set in sets {
            let n = set.count
            let buf = UnsafeMutablePointer<UInt8>.allocate(capacity: n)
            set.copyBytes(to: buf, count: n)
            buffers.append(buf)
            pointers.append(UnsafePointer(buf))
            sizes.append(n)
        }
        defer { buffers.forEach { $0.deallocate() } }

        var fmt: CMVideoFormatDescription?
        let status: OSStatus = pointers.withUnsafeBufferPointer { pp in
            sizes.withUnsafeBufferPointer { ss in
                switch codec {
                case .h264:
                    return CMVideoFormatDescriptionCreateFromH264ParameterSets(
                        allocator: kCFAllocatorDefault,
                        parameterSetCount: sets.count,
                        parameterSetPointers: pp.baseAddress!,
                        parameterSetSizes: ss.baseAddress!,
                        nalUnitHeaderLength: 4,
                        formatDescriptionOut: &fmt)
                case .hevc:
                    return CMVideoFormatDescriptionCreateFromHEVCParameterSets(
                        allocator: kCFAllocatorDefault,
                        parameterSetCount: sets.count,
                        parameterSetPointers: pp.baseAddress!,
                        parameterSetSizes: ss.baseAddress!,
                        nalUnitHeaderLength: 4,
                        extensions: nil,
                        formatDescriptionOut: &fmt)
                }
            }
        }
        guard status == noErr, let fmt else { throw DecodeError.formatDescriptionFailed(status) }

        try setupSession(formatDescription: fmt)
        self.formatDescription = fmt
    }

    private func setupSession(formatDescription fmt: CMVideoFormatDescription) throws {
        if let old = session {
            VTDecompressionSessionInvalidate(old)
            session = nil
        }
        // Saída biplanar nativa + IOSurface/Metal para zero-copy rumo à Vision.
        let attrs: [CFString: Any] = [
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange,
            kCVPixelBufferIOSurfacePropertiesKey: [String: Any]() as CFDictionary,
            kCVPixelBufferMetalCompatibilityKey: true
        ]
        var created: VTDecompressionSession?
        let status = VTDecompressionSessionCreate(
            allocator: kCFAllocatorDefault,
            formatDescription: fmt,
            decoderSpecification: nil,     // deixa o VT escolher o decoder de hardware
            imageBufferAttributes: attrs as CFDictionary,
            outputCallback: nil,           // usamos a variante com output handler (bloco)
            decompressionSessionOut: &created)
        guard status == noErr, let created else { throw DecodeError.sessionCreateFailed(status) }
        session = created
    }

    private func makeSampleBuffer(avcc: Data, formatDescription fmt: CMVideoFormatDescription, pts: CMTime) throws -> CMSampleBuffer {
        var blockBuffer: CMBlockBuffer?
        var status = CMBlockBufferCreateWithMemoryBlock(
            allocator: kCFAllocatorDefault,
            memoryBlock: nil,
            blockLength: avcc.count,
            blockAllocator: kCFAllocatorDefault,
            customBlockSource: nil,
            offsetToData: 0,
            dataLength: avcc.count,
            flags: kCMBlockBufferAssureMemoryNowFlag,
            blockBufferOut: &blockBuffer)
        guard status == kCMBlockBufferNoErr, let blockBuffer else { throw DecodeError.sampleBufferFailed(status) }

        status = avcc.withUnsafeBytes { raw in
            CMBlockBufferReplaceDataBytes(
                with: raw.baseAddress!,
                blockBuffer: blockBuffer,
                offsetIntoDestination: 0,
                dataLength: avcc.count)
        }
        guard status == kCMBlockBufferNoErr else { throw DecodeError.sampleBufferFailed(status) }

        var sampleBuffer: CMSampleBuffer?
        var timing = CMSampleTimingInfo(duration: .invalid, presentationTimeStamp: pts, decodeTimeStamp: .invalid)
        var sampleSize = avcc.count
        status = CMSampleBufferCreateReady(
            allocator: kCFAllocatorDefault,
            dataBuffer: blockBuffer,
            formatDescription: fmt,
            sampleCount: 1,
            sampleTimingEntryCount: 1,
            sampleTimingArray: &timing,
            sampleSizeEntryCount: 1,
            sampleSizeArray: &sampleSize,
            sampleBufferOut: &sampleBuffer)
        guard status == noErr, let sampleBuffer else { throw DecodeError.sampleBufferFailed(status) }
        return sampleBuffer
    }

    private func decodeSample(_ sample: CMSampleBuffer, session: VTDecompressionSession) throws {
        // Assíncrono: deixa o pipeline de HW respirar. O handler pode ser chamado noutra thread;
        // `onFrame` só faz `yield` no AsyncStream (thread-safe). Latest-wins cuida da ordem.
        let flags: VTDecodeFrameFlags = [._EnableAsynchronousDecompression]
        var infoOut = VTDecodeInfoFlags()
        let status = VTDecompressionSessionDecodeFrame(
            session,
            sampleBuffer: sample,
            flags: flags,
            infoFlagsOut: &infoOut,
            outputHandler: { [weak self] status, _, imageBuffer, presentationTime, _ in
                guard let self, status == noErr, let imageBuffer else { return }
                // CVImageBuffer de vídeo É um CVPixelBuffer (mesmo tipo CF subjacente).
                self.onFrame(VideoFrame(pixelBuffer: imageBuffer, presentationTime: presentationTime))
            })
        guard status == noErr else { throw DecodeError.decodeFailed(status) }
    }
}
