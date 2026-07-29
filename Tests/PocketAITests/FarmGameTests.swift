import XCTest
@testable import PocketAI

// MARK: – Testes da lógica pura do jogo (Foundation‑only, sem SceneKit)
final class CropSystemTests: XCTestCase {

    func testPlantAndStage() {
        var plot = CropPlot(id: 0)
        XCTAssertEqual(CropSystem.stage(of: plot), .empty)

        let now = Date()
        CropSystem.plant(&plot, .cenoura, at: now)
        XCTAssertEqual(CropSystem.stage(of: plot, at: now), .seed)

        let sproutTime = now + 15
        XCTAssertEqual(CropSystem.stage(of: plot, at: sproutTime), .sprout)

        // Sem água, não passa de sprout
        let growingTime = now + 40
        XCTAssertEqual(CropSystem.stage(of: plot, at: growingTime), .sprout)

        CropSystem.water(&plot)
        XCTAssertEqual(CropSystem.stage(of: plot, at: growingTime), .growing)

        let readyTime = now + 50
        XCTAssertEqual(CropSystem.stage(of: plot, at: readyTime), .ready)
    }

    func testHarvest() {
        var plot = CropPlot(id: 1)
        let now = Date()
        CropSystem.plant(&plot, .morango, at: now)
        CropSystem.water(&plot)

        let early = now + 10
        XCTAssertNil(CropSystem.harvest(&plot, at: early))
        XCTAssertNotNil(plot.crop)

        let ready = now + 80
        let harvested = CropSystem.harvest(&plot, at: ready)
        XCTAssertEqual(harvested, .morango)
        XCTAssertNil(plot.crop)
    }

    func testAllCropsGrow() {
        let now = Date()
        for crop in CropType.allCases {
            var plot = CropPlot(id: 0)
            CropSystem.plant(&plot, crop, at: now)
            CropSystem.water(&plot)
            let ready = now + crop.growTime + 1
            XCTAssertEqual(CropSystem.stage(of: plot, at: ready), .ready, "\(crop) não ficou pronto")
        }
    }
}

final class AnimalCareSystemTests: XCTestCase {

    func testPetGivesHearts() {
        var animal = AnimalCareSystem.defaultState(for: .vaca)
        let now = Date()

        let (_, gaveStar, _) = AnimalCareSystem.pet(&animal, at: now)
        XCTAssertEqual(animal.hearts, 1)
        XCTAssertTrue(gaveStar)

        let (_, gaveStar2, _) = AnimalCareSystem.pet(&animal, at: now + 5)
        XCTAssertEqual(animal.hearts, 2)
        XCTAssertFalse(gaveStar2)

        let (_, gaveStar3, _) = AnimalCareSystem.pet(&animal, at: now + 40)
        XCTAssertEqual(animal.hearts, 3)
        XCTAssertTrue(gaveStar3)

        let (_, _, _) = AnimalCareSystem.pet(&animal, at: now + 100)
        XCTAssertEqual(animal.hearts, 3)
    }

    func testEggs() {
        var galinha = AnimalCareSystem.defaultState(for: .galinha)
        let now = Date()

        XCTAssertFalse(AnimalCareSystem.tickEggs(&galinha, at: now))
        XCTAssertNotNil(galinha.nextEggAt)

        let eggTime = now + 121
        XCTAssertTrue(AnimalCareSystem.tickEggs(&galinha, at: eggTime))
        XCTAssertEqual(galinha.eggsPending, 1)

        XCTAssertTrue(AnimalCareSystem.collectEgg(&galinha))
        XCTAssertEqual(galinha.eggsPending, 0)
    }
}

final class QuestSystemTests: XCTestCase {

    func testAdvanceQuest() {
        let (idx, prog, result) = QuestSystem.advance(
            currentIndex: 0, currentProgress: 0, event: .harvestedCenoura
        )
        XCTAssertEqual(idx, 1)
        XCTAssertEqual(prog, 0)
        guard case .completed(let q) = result else { return XCTFail("Deveria completar") }
        XCTAssertEqual(q.id, "colheita")
    }

    func testWrongEventDoesNotAdvance() {
        let (idx, prog, result) = QuestSystem.advance(
            currentIndex: 0, currentProgress: 0, event: .fireExtinguished
        )
        XCTAssertEqual(idx, 0)
        XCTAssertEqual(prog, 0)
        XCTAssertEqual(result, .noChange)
    }

    func testAllQuests() {
        var idx = 0; var prog = 0
        for quest in Quest.all {
            for _ in 0..<quest.target {
                let (ni, np, _) = QuestSystem.advance(currentIndex: idx, currentProgress: prog, event: quest.eventKind)
                idx = ni; prog = np
            }
        }
        XCTAssertFalse(QuestSystem.hasQuestsLeft(index: idx))
    }
}
