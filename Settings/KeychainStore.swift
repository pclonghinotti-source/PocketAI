import Foundation
import Security

/// Guarda as senhas (RTSP/MQTT) no Keychain — nunca em UserDefaults (decisão fixada no Módulo 1).
/// Wrapper fino sobre a Security framework. Device-only: não é testável na CI (Keychain de runner
/// é instável), mas é código padrão de `SecItem`.
struct KeychainStore {

    /// Contas isoladas por credencial.
    enum Account: String {
        case rtspPassword = "rtsp.password"
        case mqttPassword = "mqtt.password"
    }

    private let service = "com.pocketai.credentials"

    /// Grava (ou substitui) a senha. String vazia = remove (não guarda segredo vazio).
    func set(_ value: String, for account: Account) {
        guard !value.isEmpty else { delete(account); return }

        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account.rawValue
        ]
        SecItemDelete(base as CFDictionary) // idempotente: garante um único item

        var add = base
        add[kSecValueData as String] = Data(value.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock // appliance reinicia sozinho
        SecItemAdd(add as CFDictionary, nil)
    }

    func value(for account: Account) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var out: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(decoding: data, as: UTF8.self)
    }

    func delete(_ account: Account) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account.rawValue
        ]
        SecItemDelete(query as CFDictionary)
    }
}
