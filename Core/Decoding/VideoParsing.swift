import Foundation

/// Codec de vídeo detectado no stream. Só H.264/H.265 (o que o VideoToolbox decodifica em HW).
/// Mora no Core (não no Camera) porque o parsing de NAL abaixo é lógica pura, sem FFmpeg nem
/// VideoToolbox — e por isso é testável via `swift test` na CI, sem hardware.
enum VideoCodec {
    case h264
    case hevc
}

/// Utilitário puro de bitstream: divide Annex B em NAL units, classifica tipos e extrai
/// parameter sets de `extradata` (avcC/hvcC ou Annex B). Nenhuma dependência de plataforma.
enum NALUnit {

    // MARK: - Annex B

    /// Divide o buffer em NAL units crus (sem start code / sem prefixo de tamanho).
    static func annexBUnits(in data: Data) -> [Data] {
        let b = [UInt8](data)
        let n = b.count
        var units: [Data] = []

        func startCodeLength(at p: Int) -> Int {
            if p + 3 <= n, b[p] == 0, b[p + 1] == 0, b[p + 2] == 1 { return 3 }
            if p + 4 <= n, b[p] == 0, b[p + 1] == 0, b[p + 2] == 0, b[p + 3] == 1 { return 4 }
            return 0
        }

        var i = 0
        while i < n, startCodeLength(at: i) == 0 { i += 1 } // pula até o 1º start code
        while i < n {
            let sc = startCodeLength(at: i)
            guard sc > 0 else { i += 1; continue }
            let start = i + sc
            var j = start
            while j < n, startCodeLength(at: j) == 0 { j += 1 }
            if start < j { units.append(Data(b[start..<j])) }
            i = j
        }
        return units
    }

    // MARK: - Classificação de NAL

    /// Tipo de NAL (H264: `firstByte & 0x1F` / HEVC: `(firstByte >> 1) & 0x3F`).
    static func nalType(_ nal: Data, codec: VideoCodec) -> UInt8 {
        guard let first = nal.first else { return 0xFF }
        switch codec {
        case .h264: return first & 0x1F
        case .hevc: return (first >> 1) & 0x3F
        }
    }

    static func isParameterSet(_ nal: Data, codec: VideoCodec) -> Bool {
        let t = nalType(nal, codec: codec)
        switch codec {
        case .h264: return t == 7 || t == 8              // SPS, PPS
        case .hevc: return t == 32 || t == 33 || t == 34 // VPS, SPS, PPS
        }
    }

    static func isVCL(_ nal: Data, codec: VideoCodec) -> Bool {
        let t = nalType(nal, codec: codec)
        switch codec {
        case .h264: return t >= 1 && t <= 5
        case .hevc: return t <= 31
        }
    }

    // MARK: - Parameter sets a partir de extradata

    /// avcC/hvcC começam com `configurationVersion == 0x01`; caso contrário é Annex B.
    static func parameterSets(fromExtradata data: Data, codec: VideoCodec) -> [Data] {
        if data.first == 0x01 {
            return codec == .h264 ? parseAVCC(data) : parseHVCC(data)
        }
        return annexBUnits(in: data)
    }

    /// avcDecoderConfigurationRecord (ISO 14496-15).
    static func parseAVCC(_ data: Data) -> [Data] {
        let b = [UInt8](data)
        guard b.count > 6 else { return [] }
        var sets: [Data] = []
        var i = 5
        let numSPS = Int(b[i] & 0x1F); i += 1
        for _ in 0..<numSPS {
            guard i + 2 <= b.count else { return sets }
            let len = Int(b[i]) << 8 | Int(b[i + 1]); i += 2
            guard i + len <= b.count else { return sets }
            sets.append(Data(b[i..<i + len])); i += len
        }
        guard i < b.count else { return sets }
        let numPPS = Int(b[i]); i += 1
        for _ in 0..<numPPS {
            guard i + 2 <= b.count else { return sets }
            let len = Int(b[i]) << 8 | Int(b[i + 1]); i += 2
            guard i + len <= b.count else { return sets }
            sets.append(Data(b[i..<i + len])); i += len
        }
        return sets
    }

    /// HEVCDecoderConfigurationRecord (ISO 14496-15): header de 22 bytes + arrays de NAL.
    static func parseHVCC(_ data: Data) -> [Data] {
        let b = [UInt8](data)
        guard b.count > 23 else { return [] }
        var sets: [Data] = []
        var i = 22
        let numArrays = Int(b[i]); i += 1
        for _ in 0..<numArrays {
            guard i + 3 <= b.count else { return sets }
            i += 1 // array_completeness + NAL_unit_type (tipo não é necessário aqui)
            let numNalus = Int(b[i]) << 8 | Int(b[i + 1]); i += 2
            for _ in 0..<numNalus {
                guard i + 2 <= b.count else { return sets }
                let len = Int(b[i]) << 8 | Int(b[i + 1]); i += 2
                guard i + len <= b.count else { return sets }
                sets.append(Data(b[i..<i + len])); i += len
            }
        }
        return sets
    }
}
