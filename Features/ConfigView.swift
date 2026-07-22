import SwiftUI

/// Tela única de configuração + START/STOP. Campos desabilitados enquanto o pipeline roda
/// (config é fixada no start; reconfigurar = parar, editar, iniciar de novo → instâncias novas).
struct ConfigView: View {

    @StateObject private var viewModel = ConfigViewModel()

    var body: some View {
        NavigationStack {
            Form {
                statusSection
                cameraSection
                detectionSection
                mqttSection
                if !viewModel.validationErrors.isEmpty { errorsSection }
                controlSection
            }
            .navigationTitle("PocketAI")
            .disabled(viewModel.runState == .starting)
        }
    }

    // MARK: - Seções

    private var statusSection: some View {
        Section {
            HStack {
                Circle().fill(statusColor).frame(width: 10, height: 10)
                Text(statusText).foregroundStyle(.secondary)
            }
        }
    }

    private var cameraSection: some View {
        Section("Câmera") {
            TextField("Nome (ex.: garage)", text: $viewModel.settings.cameraName)
                .textInputAutocapitalization(.never)
            TextField("URL RTSP (rtsp://...)", text: $viewModel.settings.rtspURL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            TextField("Usuário", text: $viewModel.settings.rtspUsername)
                .textInputAutocapitalization(.never)
            SecureField("Senha", text: $viewModel.rtspPassword)
        }
        .disabled(viewModel.isRunning)
    }

    private var detectionSection: some View {
        Section("Detecção") {
            Stepper("FPS: \(Int(viewModel.settings.targetFPS))",
                    value: $viewModel.settings.targetFPS, in: 1...30)
            VStack(alignment: .leading) {
                Text("Threshold: \(viewModel.settings.confidenceThreshold, specifier: "%.2f")")
                Slider(value: $viewModel.settings.confidenceThreshold, in: 0...1)
            }
            Toggle("Simular A11 (bypass da Neural Engine)",
                   isOn: $viewModel.settings.simulateNeuralEngineBypass)
        }
        .disabled(viewModel.isRunning)
    }

    private var mqttSection: some View {
        Section("MQTT") {
            TextField("Servidor", text: $viewModel.settings.mqttHost)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            TextField("Porta", value: $viewModel.settings.mqttPort, format: .number)
                .keyboardType(.numberPad)
            TextField("Usuário", text: $viewModel.settings.mqttUsername)
                .textInputAutocapitalization(.never)
            SecureField("Senha", text: $viewModel.mqttPassword)
            Toggle("TLS", isOn: $viewModel.settings.mqttUseTLS)
        }
        .disabled(viewModel.isRunning)
    }

    private var errorsSection: some View {
        Section("Corrija antes de iniciar") {
            ForEach(viewModel.validationErrors, id: \.message) { error in
                Label(error.message, systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
            }
        }
    }

    private var controlSection: some View {
        Section {
            Button {
                Task { await viewModel.toggle() }
            } label: {
                HStack {
                    Spacer()
                    Text(viewModel.isRunning ? "PARAR" : "INICIAR").bold()
                    Spacer()
                }
            }
            .tint(viewModel.isRunning ? .red : .green)
        }
    }

    // MARK: - Status visual

    private var statusColor: Color {
        switch viewModel.runState {
        case .stopped:  return .gray
        case .starting: return .yellow
        case .running:  return .green
        case .failed:   return .red
        }
    }

    private var statusText: String {
        switch viewModel.runState {
        case .stopped:            return "Parado"
        case .starting:           return "Conectando…"
        case .running:            return "Rodando — publicando eventos"
        case .failed(let reason): return "Falha: \(reason)"
        }
    }
}
