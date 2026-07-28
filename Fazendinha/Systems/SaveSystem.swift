import Foundation

// MARK: – Estrutura completa de save (Codable)
struct GameSave: Codable {
    var stars: Int = 0
    var basket: Int = 0
    var plots: [CropPlot] = []
    var animals: [AnimalState] = []
    var questIndex: Int = 0
    var questProgress: Int = 0
    var shirtFound: Bool = false
    var shirtSpot: Int? = nil
    var totalHarvests: Int = 0
    var firesExtinguished: Int = 0
    var lastPlayedAt: Date? = nil
}

// MARK: – Abstração do local de armazenamento
protocol SaveStoring {
    func loadSave() -> GameSave?
    func saveSave(_ save: GameSave)
}

// MARK: – Implementação padrão via UserDefaults
final class UserDefaultsSaveStore: SaveStoring {
    private let key = "fazendinha_manu_save"

    func loadSave() -> GameSave? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(GameSave.self, from: data)
    }

    func saveSave(_ save: GameSave) {
        guard let data = try? JSONEncoder().encode(save) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}

// MARK: – Store em memória para testes
final class InMemorySaveStore: SaveStoring {
    private var save: GameSave?
    func loadSave() -> GameSave? { save }
    func saveSave(_ save: GameSave) { self.save = save }
}
