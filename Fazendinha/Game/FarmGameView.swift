import SwiftUI
import SceneKit

// MARK: – View principal
struct FarmGameView: View {
    @StateObject private var model = FarmGameViewModel()

    var body: some View {
        ZStack {
            SceneContainer(model: model).edgesIgnoringSafeArea(.all)

            VStack(spacing: 0) {
                topBar.padding(.horizontal).padding(.top, 8)
                questCard.padding(.horizontal).padding(.top, 6)
                Spacer()
                if model.showSeedPicker { seedPicker.padding(.bottom, 20) }
                if let msg = model.bubble { bubbleView(msg).padding(.bottom, 10) }
            }

            if model.showTitle { titleOverlay }
        }
        .onReceive(NotificationCenter.default.publisher(for: .showSeedPicker)) { note in
            if let id = note.userInfo?["plot"] as? Int {
                model.selectedPlotId = id; model.showSeedPicker = true
            }
        }
    }

    private var topBar: some View {
        HStack(spacing: 20) {
            HStack(spacing: 4) {
                Text("⭐").font(.title2)
                Text("\(model.stars)").font(.headline).foregroundColor(.white)
            }
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(Capsule().fill(Color.black.opacity(0.4)))

            HStack(spacing: 4) {
                Text("🧺").font(.title2)
                Text("\(model.basket)").font(.headline).foregroundColor(.white)
            }
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(Capsule().fill(Color.black.opacity(0.4)))

            Spacer()
            Button(action: { model.muted.toggle() }) {
                Text(model.muted ? "🔇" : "🔊").font(.title2)
            }
        }
    }

    private var questCard: some View {
        HStack(spacing: 8) {
            Text(model.questIcon).font(.title3)
            VStack(alignment: .leading, spacing: 2) {
                Text(model.questTitle).font(.caption).fontWeight(.semibold).foregroundColor(.white)
                if !model.questProgress.isEmpty {
                    Text(model.questProgress).font(.caption2).foregroundColor(.yellow)
                }
            }
            Spacer()
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 14).fill(.ultraThinMaterial))
    }

    private var seedPicker: some View {
        HStack(spacing: 16) {
            ForEach(CropType.allCases, id: \.self) { crop in
                Button(action: { model.chooseSeed(crop) }) {
                    VStack(spacing: 2) {
                        Text(crop.emoji).font(.system(size: 36))
                        Text(crop.displayName).font(.caption2).foregroundColor(.white)
                    }
                    .padding(10)
                    .background(Circle().fill(Color.brown.opacity(0.7)).frame(width: 60, height: 60))
                }
            }
        }
        .padding().background(RoundedRectangle(cornerRadius: 20).fill(.ultraThinMaterial))
    }

    private func bubbleView(_ text: String) -> some View {
        Text(text)
            .font(.body).foregroundColor(.white)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(Capsule().fill(Color.black.opacity(0.6)))
    }

    private var titleOverlay: some View {
        ZStack {
            Color.black.opacity(0.5).edgesIgnoringSafeArea(.all)
            VStack(spacing: 20) {
                Text("🌻").font(.system(size: 80))
                Text("A Fazenda da Manu").font(.largeTitle).fontWeight(.bold).foregroundColor(.white)
                Text("Toque para brincar!").font(.headline).foregroundColor(.yellow)
                Button(action: { model.startGame() }) {
                    Text("▶️  Começar").font(.title2).fontWeight(.semibold)
                        .padding(.horizontal, 40).padding(.vertical, 12)
                        .background(Capsule().fill(.green)).foregroundColor(.white)
                }
            }
        }
    }
}

// MARK: – ViewModel
final class FarmGameViewModel: ObservableObject {
    let state = GameState()
    let speech = SpeechManager()
    lazy var scene = FarmGameScene(gameState: state, speech: speech)

    @Published var stars = 0
    @Published var basket = 0
    @Published var questIcon = ""
    @Published var questTitle = ""
    @Published var questProgress = ""
    @Published var showSeedPicker = false
    @Published var selectedPlotId = 0
    @Published var showTitle = true
    @Published var muted = false { didSet { speech.enabled = !muted } }
    @Published var bubble: String? = nil

    init() {
        state.onEvent = { [weak self] event in
            DispatchQueue.main.async { self?.handle(event) }
        }
    }

    func startGame() {
        showTitle = false
        scene.gameState.load()
        speech.say("Oi! Eu sou a Manu! Vamos brincar na fazenda! 🌻")
    }

    func chooseSeed(_ type: CropType) {
        state.plant(plot: selectedPlotId, type)
        showSeedPicker = false
    }

    private func handle(_ event: GameEvent) {
        switch event {
        case .starsChanged(let v): stars = v
        case .basketChanged(let v): basket = v
        case .questChanged(let icon, let title, let progress):
            questIcon = icon; questTitle = title; questProgress = progress
        case .questCompleted(let icon, let title, _):
            questIcon = icon; questTitle = title; questProgress = ""
        case .speak(let t):
            bubble = t
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                if self?.bubble == t { self?.bubble = nil }
            }
        case .celebrate:
            bubble = "🎉🎉🎉"
            DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in self?.bubble = nil }
        default: break
        }
    }
}

// MARK: – SceneKit container
struct SceneContainer: UIViewRepresentable {
    let model: FarmGameViewModel

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = model.scene
        view.delegate = model.scene
        view.isPlaying = true
        view.antialiasingMode = .multisampling4X
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        view.addGestureRecognizer(tap)
        return view
    }

    func updateUIView(_: SCNView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    final class Coordinator: NSObject {
        let model: FarmGameViewModel
        init(model: FarmGameViewModel) { self.model = model }
        @objc func handleTap(_ g: UITapGestureRecognizer) {
            guard let view = g.view as? SCNView else { return }
            model.scene.handleTap(at: g.location(in: view), in: view)
        }
    }
}
