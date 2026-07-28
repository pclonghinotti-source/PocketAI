import Foundation

// MARK: – Tipos de plantio
enum CropType: String, Codable, CaseIterable {
    case cenoura, girassol, morango, abobora

    var displayName: String {
        switch self {
        case .cenoura:  return "Cenoura"
        case .girassol: return "Girassol"
        case .morango:  return "Morango"
        case .abobora:  return "Abóbora"
        }
    }

    var emoji: String {
        switch self {
        case .cenoura:  return "🥕"
        case .girassol: return "🌻"
        case .morango:  return "🍓"
        case .abobora:  return "🎃"
        }
    }

    /// Tempo total para ficar pronto (em segundos) — rápido para crianças.
    var growTime: TimeInterval {
        switch self {
        case .cenoura:  return 45
        case .girassol: return 60
        case .morango:  return 75
        case .abobora:  return 90
        }
    }

    /// Estrelas ganhas ao colher.
    var stars: Int {
        switch self {
        case .cenoura:  return 1
        case .girassol: return 1
        case .morango:  return 2
        case .abobora:  return 2
        }
    }
}

// MARK: – Estágios da planta
enum CropStage: Int, Codable, Comparable, CustomStringConvertible {
    case empty = 0
    case seed
    case sprout
    case growing
    case ready

    static func < (a: CropStage, b: CropStage) -> Bool { a.rawValue < b.rawValue }

    var description: String {
        switch self {
        case .empty:   return "vazio"
        case .seed:    return "semente"
        case .sprout:  return "broto"
        case .growing: return "crescendo"
        case .ready:   return "pronto"
        }
    }
}

// MARK: – Estado de um canteiro
struct CropPlot: Codable, Equatable, Identifiable {
    let id: Int
    var crop: CropType?
    var plantedAt: Date?
    var watered: Bool = false
}

// MARK: – Sistema de plantio (lógica pura, Foundation‑only)
enum CropSystem {

    /// Estágio actual da planta num dado canteiro.
    static func stage(of plot: CropPlot, at now: Date = Date()) -> CropStage {
        guard let crop = plot.crop, let plantedAt = plot.plantedAt else { return .empty }

        let elapsed = now.timeIntervalSince(plantedAt)
        let stageDuration = crop.growTime / 3

        let raw: CropStage
        if elapsed < stageDuration {
            raw = .seed
        } else if elapsed < 2 * stageDuration {
            raw = .sprout
        } else if elapsed < crop.growTime {
            raw = .growing
        } else {
            raw = .ready
        }

        // Sem água não passa do broto
        if !plot.watered, raw > .sprout {
            return .sprout
        }
        return raw
    }

    /// Plantar semente.
    static func plant(_ plot: inout CropPlot, _ type: CropType, at now: Date = Date()) {
        plot.crop     = type
        plot.plantedAt = now
        plot.watered  = false
    }

    /// Regar — destrava o crescimento.
    static func water(_ plot: inout CropPlot) {
        plot.watered = true
    }

    /// Colher. Retorna o tipo se estiver pronto, senão nil.
    static func harvest(_ plot: inout CropPlot, at now: Date = Date()) -> CropType? {
        let st = stage(of: plot, at: now)
        guard st == .ready, let crop = plot.crop else { return nil }
        plot.crop = nil
        plot.plantedAt = nil
        plot.watered = false
        return crop
    }
}
