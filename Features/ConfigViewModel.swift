import Foundation
import SwiftUI
import UIKit

/// Estado de execução do pipeline, refletido na tela (botão START/STOP + status).
enum RunState: Equatable {
    case stopped
    case starting
    case running
    case failed(String)
}

/// ViewModel da tela única (MVVM só na UI). Segura o formulário e o estado de execução, e
/// dirige o `PipelineEngine` via `AppContainer`. O engine em si é headless — não conhece a UI.
///
/// `@MainActor`: todo o estado observável muda na main thread (bindings SwiftUI).
@MainActor
final class ConfigViewModel: ObservableObject {

    @Published var settings: AppSettings
    @Published var rtspPassword: String
    @Published var mqttPassword: String
    @Published private(set) var runState: RunState = .stopped
    @Published private(set) var validationErrors: [SettingsValidator.ValidationError] = []

    private let settingsStore: SettingsStore
    private let keychain: KeychainStore
    private let container: AppContainer
    private var engine: PipelineEngine?

    var isRunning: Bool { runState == .running || runState == .starting }

    init(settingsStore: SettingsStore = SettingsStore(),
         keychain: KeychainStore = KeychainStore(),
         container: AppContainer = AppContainer()) {
        self.settingsStore = settingsStore
        self.keychain = keychain
        self.container = container
        self.settings = settingsStore.load()
        self.rtspPassword = keychain.value(for: .rtspPassword) ?? ""
        self.mqttPassword = keychain.value(for: .mqttPassword) ?? ""
    }

    /// Persiste config (UserDefaults) e senhas (Keychain). Chamado ao editar / antes de iniciar.
    func persist() {
        settingsStore.save(settings)
        keychain.set(rtspPassword, for: .rtspPassword)
        keychain.set(mqttPassword, for: .mqttPassword)
    }

    func start() async {
        validationErrors = SettingsValidator.validate(settings)
        guard validationErrors.isEmpty else { return }

        persist()
        runState = .starting

        // Instâncias novas a cada START (fonte parada é terminal — Módulo 3).
        let engine = container.makeEngine(
            settings: settings,
            rtspPassword: rtspPassword.isEmpty ? nil : rtspPassword,
            mqttPassword: mqttPassword.isEmpty ? nil : mqttPassword)
        self.engine = engine

        do {
            try await engine.start()
            runState = .running
            // Appliance: mantém a tela acesa enquanto roda (decisão fixada no Módulo 1).
            UIApplication.shared.isIdleTimerDisabled = true
        } catch {
            self.engine = nil
            runState = .failed(error.localizedDescription)
            UIApplication.shared.isIdleTimerDisabled = false
        }
    }

    func stop() async {
        await engine?.stop()
        engine = nil
        UIApplication.shared.isIdleTimerDisabled = false
        runState = .stopped
    }

    func toggle() async {
        if isRunning { await stop() } else { await start() }
    }
}
