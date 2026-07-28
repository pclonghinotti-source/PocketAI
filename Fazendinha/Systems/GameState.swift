import Foundation

// MARK: – Eventos que GameScene e HUD escutam
enum GameEvent {
    case starsChanged(Int)
    case basketChanged(Int)
    case plotsChanged
    case animalsChanged
    case questChanged(icon: String, title: String, progress: String)
    case questCompleted(icon: String, title: String, reward: Int)
    case allQuestsDone
    case shirtHidden(spot: Int)
    case shirtFound
    case eggAvailable
    case speak(String)
    case celebrate
}

// MARK: – GameState: orquestra toda a lógica do jogo (Foundation‑only)
final class GameState {
    private let store: SaveStoring

    private(set) var stars = 0
    private(set) var basket = 0
    var plots: [CropPlot] = []
    var animals: [AnimalState] = []
    private(set) var questIndex = 0
    private(set) var questProgress = 0
    private(set) var shirtFound = false
    private(set) var shirtSpot: Int? = nil
    private(set) var totalHarvests = 0
    private(set) var firesExtinguished = 0

    var onEvent: ((GameEvent) -> Void)?

    var currentQuest: Quest? {
        guard questIndex < Quest.all.count else { return nil }
        return Quest.all[questIndex]
    }

    init(store: SaveStoring = UserDefaultsSaveStore()) {
        self.store = store
        plots = (0..<9).map { CropPlot(id: $0) }
        animals = FarmAnimalType.allCases.map { AnimalCareSystem.defaultState(for: $0) }
    }

    // MARK: – Save / Load
    func save() {
        var save = GameSave()
        save.stars = stars; save.basket = basket; save.plots = plots; save.animals = animals
        save.questIndex = questIndex; save.questProgress = questProgress
        save.shirtFound = shirtFound; save.shirtSpot = shirtSpot
        save.totalHarvests = totalHarvests; save.firesExtinguished = firesExtinguished
        save.lastPlayedAt = Date()
        store.saveSave(save)
    }

    func load() {
        guard let save = store.loadSave() else { emitAll(); return }
        stars = save.stars; basket = save.basket
        if !save.plots.isEmpty { plots = save.plots }
        if !save.animals.isEmpty { animals = save.animals }
        questIndex = save.questIndex; questProgress = save.questProgress
        shirtFound = save.shirtFound; shirtSpot = save.shirtSpot
        totalHarvests = save.totalHarvests; firesExtinguished = save.firesExtinguished
        emitAll()
    }

    // MARK: – Ações do jogador
    func plant(plot id: Int, _ type: CropType, at now: Date = Date()) {
        guard id < plots.count, plots[id].crop == nil else { return }
        var p = plots[id]; CropSystem.plant(&p, type, at: now); plots[id] = p
        save(); onEvent?(.plotsChanged); onEvent?(.speak("Plantando sementinha! 🌱"))
    }

    func water(plot id: Int) {
        guard id < plots.count, plots[id].crop != nil else { return }
        var p = plots[id]; CropSystem.water(&p); plots[id] = p
        save(); onEvent?(.plotsChanged); onEvent?(.speak("Que delícia, água! 💧"))
    }

    func harvest(plot id: Int, at now: Date = Date()) -> Bool {
        guard id < plots.count else { return false }
        var p = plots[id]; guard let crop = CropSystem.harvest(&p, at: now) else { return false }
        plots[id] = p; totalHarvests += 1; basket += 1; stars += crop.stars
        save()
        onEvent?(.plotsChanged); onEvent?(.basketChanged(basket)); onEvent?(.starsChanged(stars))
        advanceQuest(with: crop == .cenoura ? .harvestedCenoura : .anyHarvest)
        onEvent?(.speak("Colhi \(crop.displayName)! \(crop.emoji)"))
        return true
    }

    func pet(animal type: FarmAnimalType, at now: Date = Date()) {
        guard let idx = animals.firstIndex(where: { $0.type == type }) else { return }
        var a = animals[idx]; let (_, gaveStar, talk) = AnimalCareSystem.pet(&a, at: now)
        animals[idx] = a
        if gaveStar { stars += 1; onEvent?(.starsChanged(stars)) }
        onEvent?(.animalsChanged); onEvent?(.speak(talk)); save()
    }

    func collectEgg(at now: Date = Date()) -> Bool {
        guard let idx = animals.firstIndex(where: { $0.type == .galinha }), animals[idx].eggsPending > 0 else { return false }
        var a = animals[idx]; guard AnimalCareSystem.collectEgg(&a) else { return false }
        animals[idx] = a; basket += 1; stars += 1
        onEvent?(.basketChanged(basket)); onEvent?(.starsChanged(stars)); onEvent?(.speak("Ovinho! 🥚"))
        advanceQuest(with: .eggCollected); save(); return true
    }

    func extinguishFire() {
        firesExtinguished += 1; stars += 1
        onEvent?(.starsChanged(stars)); advanceQuest(with: .fireExtinguished); save()
    }

    func findShirt() {
        guard !shirtFound else { return }
        shirtFound = true; stars += 5
        onEvent?(.starsChanged(stars)); advanceQuest(with: .shirtFound)
        onEvent?(.shirtFound); onEvent?(.speak("Achei a camisa do Nenão! 👕")); save()
    }

    // MARK: – Tick (chamado pela Scene a cada ~0.5s)
    func tick(at now: Date) {
        if let idx = animals.firstIndex(where: { $0.type == .galinha }) {
            var g = animals[idx]
            if AnimalCareSystem.tickEggs(&g, at: now) {
                animals[idx] = g; onEvent?(.eggAvailable); save()
            } else if animals[idx].nextEggAt == nil { animals[idx] = g }
        }
        if let q = currentQuest, q.id == "camisa", shirtSpot == nil {
            shirtSpot = Int.random(in: 0..<6); shirtFound = false
            onEvent?(.shirtHidden(spot: shirtSpot!)); save()
        }
    }

    // MARK: – Missões
    private func advanceQuest(with event: QuestEvent) {
        guard questIndex < Quest.all.count else { return }
        let oldIdx = questIndex
        let (newIdx, newProgress, result) = QuestSystem.advance(currentIndex: questIndex, currentProgress: questProgress, event: event)
        questIndex = newIdx; questProgress = newProgress
        switch result {
        case .noChange: break
        case .progressed(let c, let t):
            let q = Quest.all[oldIdx]
            onEvent?(.questChanged(icon: q.icon, title: q.title, progress: "\(c)/\(t)"))
        case .completed(let q):
            stars += q.rewardStars; save()
            onEvent?(.starsChanged(stars))
            onEvent?(.questCompleted(icon: q.icon, title: q.title, reward: q.rewardStars))
            onEvent?(.speak("Missão completa! Parabéns! 🌟"))
            if questIndex >= Quest.all.count { onEvent?(.allQuestsDone); onEvent?(.celebrate) }
        }
        save()
    }

    private func emitAll() {
        onEvent?(.starsChanged(stars)); onEvent?(.basketChanged(basket))
        onEvent?(.plotsChanged); onEvent?(.animalsChanged)
        if let q = currentQuest {
            onEvent?(.questChanged(icon: q.icon, title: q.title, progress: "\(questProgress)/\(q.target)"))
        } else {
            onEvent?(.questChanged(icon: "🎉", title: "Parabéns! Tudo completo!", progress: ""))
        }
    }
}
