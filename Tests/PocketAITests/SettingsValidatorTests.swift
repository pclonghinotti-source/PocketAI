import XCTest
@testable import PocketAI

/// Valida as regras de configuração (lógica pura, roda na CI).
final class SettingsValidatorTests: XCTestCase {

    /// Config completa e válida — base para os testes de campo inválido.
    private var validSettings: AppSettings {
        AppSettings(
            cameraName: "garage",
            rtspURL: "rtsp://192.168.0.10:554/stream",
            rtspUsername: "admin",
            targetFPS: 5,
            confidenceThreshold: 0.6,
            simulateNeuralEngineBypass: false,
            mqttHost: "192.168.0.20",
            mqttPort: 1883,
            mqttUsername: "ha",
            mqttUseTLS: false
        )
    }

    func testValidSettingsPass() {
        XCTAssertTrue(SettingsValidator.validate(validSettings).isEmpty)
    }

    func testEmptyCameraName() {
        var s = validSettings; s.cameraName = "   "
        XCTAssertTrue(SettingsValidator.validate(s).contains(.emptyCameraName))
    }

    func testInvalidRTSPURL() {
        var s = validSettings
        s.rtspURL = "http://foo"
        XCTAssertTrue(SettingsValidator.validate(s).contains(.invalidRTSPURL))
        s.rtspURL = "rtsp://" // só o esquema, sem host
        XCTAssertTrue(SettingsValidator.validate(s).contains(.invalidRTSPURL))
    }

    func testFPSOutOfRange() {
        var s = validSettings; s.targetFPS = 0
        XCTAssertTrue(SettingsValidator.validate(s).contains(.fpsOutOfRange(0)))
        s.targetFPS = 60
        XCTAssertTrue(SettingsValidator.validate(s).contains(.fpsOutOfRange(60)))
    }

    func testThresholdOutOfRange() {
        var s = validSettings; s.confidenceThreshold = 1.5
        XCTAssertTrue(SettingsValidator.validate(s).contains(.thresholdOutOfRange(1.5)))
    }

    func testMQTTHostAndPort() {
        var s = validSettings; s.mqttHost = ""
        XCTAssertTrue(SettingsValidator.validate(s).contains(.emptyMQTTHost))
        s = validSettings; s.mqttPort = 70000
        XCTAssertTrue(SettingsValidator.validate(s).contains(.invalidMQTTPort(70000)))
    }

    func testDefaultIsIncompleteByDesign() {
        // O default tem rtspURL "rtsp://" e mqttHost vazio → não deve passar (força o usuário a preencher).
        XCTAssertFalse(SettingsValidator.validate(.default).isEmpty)
    }
}
