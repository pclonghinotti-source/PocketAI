import Foundation

/// Construção do tópico MQTT — lógica pura, testável na CI sem broker (mesmo padrão do NALUnit).
/// O `MQTTEventPublisher` (em MQTT/, fora do pacote de testes) só invoca isto.
enum MQTTTopic {

    /// Tópico de evento de presença: `home/camera/{camera}/person`.
    /// O MVP só detecta `person`, então o último nível é fixo (ver roadmap).
    static func personEvent(camera: String) -> String {
        "home/camera/\(sanitize(camera))/person"
    }

    /// Sanitiza um nível de tópico: o MQTT proíbe os curingas `+`/`#` em tópicos de publish,
    /// e `/` criaria níveis extras não intencionais. Trocamos esses (e espaços) por `_`.
    /// Fallback `unknown` se o nome ficar vazio — evita um tópico malformado tipo `//person`.
    static func sanitize(_ segment: String) -> String {
        let trimmed = segment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "unknown" }
        let mapped = trimmed.map { ch -> Character in
            (ch == "/" || ch == "+" || ch == "#" || ch.isWhitespace) ? "_" : ch
        }
        return String(mapped)
    }
}
