import XCTest
@testable import PocketAI

/// Testa a lógica pura de MQTT (tópico + payload) — sem broker, roda na CI. É o contrato
/// que o Home Assistant/Node-RED consome, então mudanças aqui são intencionais e visíveis.
final class MQTTPayloadTests: XCTestCase {

    // MARK: - Tópico

    func testBasicTopic() {
        XCTAssertEqual(MQTTTopic.personEvent(camera: "garage"), "home/camera/garage/person")
    }

    func testTopicSanitizesWildcardsAndSeparators() {
        XCTAssertEqual(MQTTTopic.personEvent(camera: "front/yard"), "home/camera/front_yard/person")
        XCTAssertEqual(MQTTTopic.personEvent(camera: "cam+1"), "home/camera/cam_1/person")
        XCTAssertEqual(MQTTTopic.personEvent(camera: "a#b"), "home/camera/a_b/person")
        XCTAssertEqual(MQTTTopic.personEvent(camera: "back door"), "home/camera/back_door/person")
    }

    func testTopicEmptyFallback() {
        XCTAssertEqual(MQTTTopic.personEvent(camera: "   "), "home/camera/unknown/person")
    }

    // MARK: - Payload

    func testPayloadShapeAndKeys() throws {
        let date = Date(timeIntervalSince1970: 0) // 1970-01-01T00:00:00Z
        let event = DetectionEvent(detected: true, confidence: 0.94, timestamp: date, camera: "garage")
        let json = try DetectionEventPayload.json(event)

        XCTAssertTrue(json.contains("\"camera\":\"garage\""), json)
        XCTAssertTrue(json.contains("\"detected\":true"), json)
        XCTAssertTrue(json.contains("\"timestamp\":\"1970-01-01T00:00:00Z\""), json)
    }

    func testPayloadRoundsConfidence() throws {
        // Float 0.94 serializado cru viraria "0.9399999..."; o payload deve sair limpo.
        let event = DetectionEvent(detected: true, confidence: 0.94, timestamp: Date(), camera: "x")
        let json = try DetectionEventPayload.json(event)
        XCTAssertTrue(json.contains("\"confidence\":0.94"), json)
        XCTAssertFalse(json.contains("0.9399"), "confiança não deve vazar ruído de Float")
    }
}
