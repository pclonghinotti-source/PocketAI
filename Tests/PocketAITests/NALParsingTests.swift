import XCTest
@testable import PocketAI

/// Testa o parsing puro de bitstream (Módulo 3) — determinístico, sem hardware/FFmpeg.
/// É a parte de maior risco de bug do decode, então cobrimos com vetores sintéticos.
final class NALParsingTests: XCTestCase {

    // MARK: - Annex B

    func testAnnexBSplitsOnStartCodes() {
        // [start4] 0x67 0x42 0x11  [start3] 0x68 0xCE
        // (evita terminar o 1º NAL em 0x00 colado ao start code — isso formaria
        //  ambiguamente um start code de 4 bytes, que é o comportamento padrão correto.)
        let data = Data([0, 0, 0, 1, 0x67, 0x42, 0x11, 0, 0, 1, 0x68, 0xCE])
        let units = NALUnit.annexBUnits(in: data)

        XCTAssertEqual(units.count, 2)
        XCTAssertEqual([UInt8](units[0]), [0x67, 0x42, 0x11])
        XCTAssertEqual([UInt8](units[1]), [0x68, 0xCE])
    }

    func testAnnexBEmptyWhenNoStartCode() {
        XCTAssertTrue(NALUnit.annexBUnits(in: Data([0x01, 0x02, 0x03])).isEmpty)
    }

    // MARK: - Classificação (H.264)

    func testH264Classification() {
        let sps = Data([0x67]) // type 7
        let pps = Data([0x68]) // type 8
        let idr = Data([0x65]) // type 5 (VCL)

        XCTAssertTrue(NALUnit.isParameterSet(sps, codec: .h264))
        XCTAssertTrue(NALUnit.isParameterSet(pps, codec: .h264))
        XCTAssertFalse(NALUnit.isParameterSet(idr, codec: .h264))

        XCTAssertTrue(NALUnit.isVCL(idr, codec: .h264))
        XCTAssertFalse(NALUnit.isVCL(sps, codec: .h264))
    }

    // MARK: - Classificação (H.265 / HEVC)

    func testHEVCClassification() {
        let vps = Data([0x40]) // (0x40 >> 1) & 0x3F = 32
        let sps = Data([0x42]) // 33
        let pps = Data([0x44]) // 34
        let idr = Data([0x26]) // (0x26 >> 1) & 0x3F = 19 (IDR_W_RADL, VCL)

        XCTAssertTrue(NALUnit.isParameterSet(vps, codec: .hevc))
        XCTAssertTrue(NALUnit.isParameterSet(sps, codec: .hevc))
        XCTAssertTrue(NALUnit.isParameterSet(pps, codec: .hevc))
        XCTAssertFalse(NALUnit.isParameterSet(idr, codec: .hevc))
        XCTAssertTrue(NALUnit.isVCL(idr, codec: .hevc))
    }

    // MARK: - extradata avcC

    func testParseAVCCExtractsSPSandPPS() {
        // avcDecoderConfigurationRecord mínimo com 1 SPS (3 bytes) e 1 PPS (2 bytes).
        let avcc = Data([
            0x01, 0x42, 0x00, 0x1E, // version, profile, compat, level
            0xFF,                   // lengthSizeMinusOne = 3
            0xE1,                   // numSPS = 1
            0x00, 0x03, 0x67, 0x42, 0x00, // SPS len=3
            0x01,                   // numPPS = 1
            0x00, 0x02, 0x68, 0xCE  // PPS len=2
        ])
        let sets = NALUnit.parseAVCC(avcc)

        XCTAssertEqual(sets.count, 2)
        XCTAssertEqual([UInt8](sets[0]), [0x67, 0x42, 0x00])
        XCTAssertEqual([UInt8](sets[1]), [0x68, 0xCE])
    }

    func testParameterSetsRoutesByFirstByte() {
        // Começa com 0x01 → tratado como avcC.
        let avcc = Data([
            0x01, 0x42, 0x00, 0x1E, 0xFF, 0xE1,
            0x00, 0x03, 0x67, 0x42, 0x00,
            0x01, 0x00, 0x02, 0x68, 0xCE
        ])
        XCTAssertEqual(NALUnit.parameterSets(fromExtradata: avcc, codec: .h264).count, 2)

        // Começa com start code → tratado como Annex B.
        let annexB = Data([0, 0, 0, 1, 0x67, 0x42, 0x00])
        let sets = NALUnit.parameterSets(fromExtradata: annexB, codec: .h264)
        XCTAssertEqual(sets.count, 1)
        XCTAssertEqual([UInt8](sets[0]), [0x67, 0x42, 0x00])
    }

    func testMalformedExtradataDoesNotCrash() {
        // Tamanhos truncados não devem estourar índice — só retornar o que deu para ler.
        XCTAssertNoThrow(_ = NALUnit.parseAVCC(Data([0x01, 0x42, 0x00])))
        XCTAssertNoThrow(_ = NALUnit.parseHVCC(Data([0x01, 0x00])))
        XCTAssertTrue(NALUnit.annexBUnits(in: Data()).isEmpty)
    }
}
