import Foundation

/// Persistência da config NÃO-secreta em UserDefaults (JSON de `AppSettings`).
/// Senhas ficam no `KeychainStore`, nunca aqui (decisão fixada no Módulo 1).
final class SettingsStore {

    private let defaults: UserDefaults
    private let key = "pocketai.settings.v1"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load() -> AppSettings {
        guard let data = defaults.data(forKey: key),
              let settings = try? JSONDecoder().decode(AppSettings.self, from: data) else {
            return .default
        }
        return settings
    }

    func save(_ settings: AppSettings) {
        guard let data = try? JSONEncoder().encode(settings) else { return }
        defaults.set(data, forKey: key)
    }
}
