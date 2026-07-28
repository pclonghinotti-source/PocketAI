import Foundation

// MARK: – Tipos de animal da fazenda
enum FarmAnimalType: String, Codable, CaseIterable {
    case galinha, vaca, ovelha, porco

    var displayName: String {
        switch self {
        case .galinha: return "Galinha"
        case .vaca:    return "Vaca"
        case .ovelha:  return "Ovelha"
        case .porco:   return "Porquinho"
        }
    }

    var emoji: String {
        switch self {
        case .galinha: return "🐔"
        case .vaca:    return "🐄"
        case .ovelha:  return "🐑"
        case .porco:   return "🐖"
        }
    }
}

// MARK: – Estado de um animal
struct AnimalState: Codable, Equatable {
    let type: FarmAnimalType
    var hearts: Int = 0
    var lastFedAt: Date?
    var eggsPending: Int = 0
    var nextEggAt: Date?
}

// MARK: – Sistema de cuidado com animais (Foundation‑only)
enum AnimalCareSystem {

    static let eggInterval: TimeInterval = 120
    static let maxEggsPending = 3
    static let starCooldown: TimeInterval = 30

    /// Alimentar / fazer carinho.
    static func pet(_ animal: inout AnimalState, at now: Date = Date()) -> (heartsDelta: Int, gaveStar: Bool, talk: String) {
        animal.hearts = min(animal.hearts + 1, 3)

        let gaveStar: Bool
        if let last = animal.lastFedAt, now.timeIntervalSince(last) < starCooldown {
            gaveStar = false
        } else {
            gaveStar = true
        }
        animal.lastFedAt = now

        return (heartsDelta: 1, gaveStar: gaveStar, talk: animal.type.talk)
    }

    /// Verifica se a galinha botou ovo.
    static func tickEggs(_ animal: inout AnimalState, at now: Date) -> Bool {
        guard animal.type == .galinha else { return false }
        if animal.nextEggAt == nil {
            animal.nextEggAt = now + eggInterval
            return false
        }
        guard let next = animal.nextEggAt, now >= next else { return false }
        if animal.eggsPending < maxEggsPending {
            animal.eggsPending += 1
        }
        animal.nextEggAt = now + eggInterval
        return animal.eggsPending > 0
    }

    /// Coleta um ovo.
    static func collectEgg(_ animal: inout AnimalState) -> Bool {
        guard animal.type == .galinha, animal.eggsPending > 0 else { return false }
        animal.eggsPending -= 1
        return true
    }

    static func defaultState(for type: FarmAnimalType) -> AnimalState {
        AnimalState(type: type)
    }
}

extension FarmAnimalType {
    var talk: String {
        switch self {
        case .galinha: return "Có có!"
        case .vaca:    return "Muuu! 🐄"
        case .ovelha:  return "Bééé!"
        case .porco:   return "Oinc oinc!"
        }
    }
}
