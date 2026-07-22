import Foundation
import CocoaMQTT

/// `EventPublisher` real: publica `DetectionEvent` num broker MQTT (→ Home Assistant/Node-RED).
///
/// `actor`: acesso serial ao cliente e ao estado do handshake. Os callbacks do CocoaMQTT
/// chegam na fila interna dele (fora do actor) e são reencaminhados para cá via `Task { await ... }`.
///
/// Decisões (Módulo 5): QoS 0 (eventos efêmeros, best-effort); `connect()` só retorna após o
/// CONNACK real (com timeout); auto-reconnect do CocoaMQTT DESLIGADO — reconexão é o retry mínimo
/// do `PipelineEngine` (Módulo 2). `publish` lança só se não estiver conectado, o que já dispara
/// esse retry.
actor MQTTEventPublisher: EventPublisher {

    struct Config: Sendable {
        let host: String
        let port: UInt16
        let clientID: String
        let username: String?
        let password: String?
        let useTLS: Bool
        let keepAlive: UInt16
        let connectTimeout: TimeInterval

        init(host: String, port: UInt16 = 1883, clientID: String = "pocketai-\(UUID().uuidString.prefix(8))",
             username: String? = nil, password: String? = nil, useTLS: Bool = false,
             keepAlive: UInt16 = 30, connectTimeout: TimeInterval = 10) {
            self.host = host
            self.port = port
            self.clientID = clientID
            self.username = username
            self.password = password
            self.useTLS = useTLS
            self.keepAlive = keepAlive
            self.connectTimeout = connectTimeout
        }
    }

    enum PublishError: Error {
        case notConnected
        case connectTimeout
        case connectRejected(reason: String)
    }

    private let config: Config
    private var client: CocoaMQTT?
    private var delegateAdapter: MQTTDelegateAdapter?
    private var connectContinuation: CheckedContinuation<Void, Error>?
    private var isConnected = false

    init(config: Config) {
        self.config = config
    }

    // MARK: - EventPublisher

    func connect() async throws {
        if isConnected { return }

        let mqtt = CocoaMQTT(clientID: config.clientID, host: config.host, port: config.port)
        mqtt.username = config.username
        mqtt.password = config.password
        mqtt.keepAlive = config.keepAlive
        mqtt.cleanSession = true
        mqtt.autoReconnect = false            // reconexão é responsabilidade do PipelineEngine
        mqtt.enableSSL = config.useTLS

        let adapter = MQTTDelegateAdapter()
        adapter.onConnAck = { [weak self] accepted, reason in
            Task { await self?.handleConnAck(accepted: accepted, reason: reason) }
        }
        adapter.onDisconnect = { [weak self] in
            Task { await self?.handleDisconnect() }
        }
        mqtt.delegate = adapter

        self.client = mqtt
        self.delegateAdapter = adapter

        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            self.connectContinuation = cont

            if mqtt.connect() == false {
                // Nem iniciou o socket → falha imediata.
                self.connectContinuation = nil
                cont.resume(throwing: PublishError.notConnected)
                return
            }

            // Timeout do handshake, caso o broker nunca responda com CONNACK.
            Task { [connectTimeout = config.connectTimeout] in
                try? await Task.sleep(for: .seconds(connectTimeout))
                await self.failConnectIfPending(PublishError.connectTimeout)
            }
        }
    }

    func publish(_ event: DetectionEvent) async throws {
        guard isConnected, let client else { throw PublishError.notConnected }

        let payload = try DetectionEventPayload.json(event)
        let topic = MQTTTopic.personEvent(camera: event.camera)
        let message = CocoaMQTTMessage(topic: topic, string: payload, qos: .qos0, retained: false)
        client.publish(message)
    }

    func disconnect() async {
        isConnected = false
        client?.disconnect()
        client = nil
        delegateAdapter = nil
        // Se havia um connect em andamento, encerra-o como falha.
        if let cont = connectContinuation {
            connectContinuation = nil
            cont.resume(throwing: PublishError.notConnected)
        }
    }

    // MARK: - Callbacks do broker (já hopados para o actor)

    private func handleConnAck(accepted: Bool, reason: String) {
        guard let cont = connectContinuation else { return } // já resolvido (timeout/disconnect)
        connectContinuation = nil
        if accepted {
            isConnected = true
            cont.resume()
        } else {
            isConnected = false
            cont.resume(throwing: PublishError.connectRejected(reason: reason))
        }
    }

    private func handleDisconnect() {
        isConnected = false
        if let cont = connectContinuation {
            connectContinuation = nil
            cont.resume(throwing: PublishError.notConnected)
        }
    }

    private func failConnectIfPending(_ error: Error) {
        guard let cont = connectContinuation else { return }
        connectContinuation = nil
        client?.disconnect()
        cont.resume(throwing: error)
    }
}

/// Adaptador de delegate: converte os callbacks do CocoaMQTT (que chegam na fila dele) em closures
/// `@Sendable` que o actor reencaminha para si mesmo. Closures são setadas uma vez antes de virar
/// delegate; `@unchecked Sendable` por isso.
///
/// VERIFICAR NO XCODE: as assinaturas de `CocoaMQTTDelegate` variam entre versões do CocoaMQTT
/// (ex.: `didSubscribeTopics`). Ajustar conforme a versão fixada no SwiftPM do app.
final class MQTTDelegateAdapter: NSObject, CocoaMQTTDelegate, @unchecked Sendable {

    var onConnAck: (@Sendable (_ accepted: Bool, _ reason: String) -> Void)?
    var onDisconnect: (@Sendable () -> Void)?

    func mqtt(_ mqtt: CocoaMQTT, didConnectAck ack: CocoaMQTTConnAck) {
        onConnAck?(ack == .accept, "\(ack)")
    }

    func mqttDidDisconnect(_ mqtt: CocoaMQTT, withError err: Error?) {
        onDisconnect?()
    }

    // Callbacks não usados no MVP (só publicamos; não assinamos nada) — stubs obrigatórios.
    func mqtt(_ mqtt: CocoaMQTT, didPublishMessage message: CocoaMQTTMessage, id: UInt16) {}
    func mqtt(_ mqtt: CocoaMQTT, didPublishAck id: UInt16) {}
    func mqtt(_ mqtt: CocoaMQTT, didReceiveMessage message: CocoaMQTTMessage, id: UInt16) {}
    func mqtt(_ mqtt: CocoaMQTT, didSubscribeTopics success: NSDictionary, failed: [String]) {}
    func mqtt(_ mqtt: CocoaMQTT, didUnsubscribeTopics topics: [String]) {}
    func mqttDidPing(_ mqtt: CocoaMQTT) {}
    func mqttDidReceivePong(_ mqtt: CocoaMQTT) {}
}
