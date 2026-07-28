import Foundation

// MARK: – Eventos que disparam progresso de missões
enum QuestEvent: Codable, Equatable {
    case harvestedCenoura
    case anyHarvest
    case shirtFound
    case fireExtinguished
    case eggCollected
}

// MARK: – Definição de uma missão
struct Quest: Codable, Equatable {
    let id: String
    let icon: String
    let title: String
    let target: Int
    let rewardStars: Int
    let eventKind: QuestEvent

    static let all: [Quest] = [
        Quest(id: "colheita", icon: "🥕", title: "Colha 1 cenourinha!", target: 1, rewardStars: 3, eventKind: .harvestedCenoura),
        Quest(id: "camisa", icon: "👕", title: "Ache a camisa do Nenão!", target: 1, rewardStars: 5, eventKind: .shirtFound),
        Quest(id: "bombeiro", icon: "🚒", title: "Apague 3 foguinhos!", target: 3, rewardStars: 8, eventKind: .fireExtinguished),
        Quest(id: "piquenique", icon: "🧺", title: "Colha 5 delícias pro piquenique!", target: 5, rewardStars: 10, eventKind: .anyHarvest),
    ]
}

// MARK: – Resultado de um avanço de missão
enum QuestAdvanceResult: Codable, Equatable, CustomStringConvertible {
    case noChange
    case progressed(current: Int, target: Int)
    case completed(Quest)

    var description: String {
        switch self {
        case .noChange:                return "sem mudança"
        case .progressed(let c, let t): return "\(c)/\(t)"
        case .completed(let q):        return "✅ \(q.title) — ganhou \(q.rewardStars) ⭐"
        }
    }
}

// MARK: – Sistema de missões (Foundation‑only)
enum QuestSystem {

    static func advance(
        currentIndex index: Int,
        currentProgress progress: Int,
        event: QuestEvent
    ) -> (newIndex: Int, newProgress: Int, result: QuestAdvanceResult) {

        guard index < Quest.all.count else {
            return (index, progress, .noChange)
        }

        let quest = Quest.all[index]
        guard event == quest.eventKind else {
            return (index, progress, .noChange)
        }

        let newProgress = progress + 1
        if newProgress >= quest.target {
            return (index + 1, 0, .completed(quest))
        } else {
            return (index, newProgress, .progressed(current: newProgress, target: quest.target))
        }
    }

    static func hasQuestsLeft(index: Int) -> Bool {
        index < Quest.all.count
    }
}
