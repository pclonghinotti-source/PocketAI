import SceneKit

/// Cena principal do jogo: mundo 3D, personagens, toques, câmera, plantas visuais.
final class FarmGameScene: SCNScene, SCNSceneRendererDelegate {

    // MARK: – Referências
    let gameState: GameState
    private let speech: SpeechManager

    private let manu: ManuCharacter
    private let dog: DalmatianCharacter
    private let nenao: NenaoCharacter

    private var cameraNode: SCNNode!
    private var isMoving = false
    private var walkProgress: CGFloat = 0
    private var moveStart = SCNVector3(0, 0, 0)
    private var moveEnd = SCNVector3(0, 0, 0)
    private var moveDuration: TimeInterval = 0

    // Plantas visuais (emoji billboard por canteiro)
    private var plantNodes: [Int: SCNNode] = [:]
    // Fogo ativo (missão bombeiro)
    private var fireNodes: [SCNNode] = []
    // Camisa escondida (missão Nenão)
    private var shirtNode: SCNNode? = nil

    // MARK: – Init
    init(gameState: GameState, speech: SpeechManager) {
        self.gameState = gameState
        self.speech = speech
        self.manu = ManuCharacter()
        self.dog = DalmatianCharacter()
        self.nenao = NenaoCharacter()
        super.init()

        background.contents = UIColor.skyGradientTop

        // Mundo
        let world = FarmWorldBuilder.build()
        rootNode.addChildNode(world)

        // Personagens
        manu.position = SCNVector3(0, 0, 1.5)
        rootNode.addChildNode(manu)

        dog.position = SCNVector3(0.5, 0, 1.0)
        rootNode.addChildNode(dog)

        nenao.position = SCNVector3(-2.5, 0, -1.5)
        rootNode.addChildNode(nenao)

        // Câmera
        cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.camera?.zFar = 30
        cameraNode.position = SCNVector3(0, 5, 6)
        cameraNode.eulerAngles.x = -0.6
        rootNode.addChildNode(cameraNode)

        // Conectar eventos
        gameState.onEvent = { [weak self] event in
            DispatchQueue.main.async { self?.handleEvent(event) }
        }

        // Carregar save
        gameState.load()
        refreshAllPlots()
    }

    required init?(coder: NSCoder) { nil }

    // MARK: – Render loop
    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        let now = Date()

        // Tick do game state
        gameState.tick(at: now)

        // Movimento da Manu
        if isMoving {
            walkProgress += CGFloat(1.0 / (moveDuration * 60))
            if walkProgress >= 1 {
                walkProgress = 1
                isMoving = false
                manu.position = moveEnd
                manu.idlePose()
                dog.position = SCNVector3(moveEnd.x + 0.5, 0, moveEnd.z - 0.5)
            } else {
                let t = walkProgress
                let x = moveStart.x + (moveEnd.x - moveStart.x) * t
                let z = moveStart.z + (moveEnd.z - moveStart.z) * t
                manu.position = SCNVector3(x, 0, z)
                manu.walkAnimation(progress: walkProgress)
                dog.position = SCNVector3(x + 0.5, 0, z - 0.5)
                dog.wagTail(progress: walkProgress)
            }
        }

        // Nenão acena de vez em quando
        nenao.wave(progress: CGFloat(time.truncatingRemainder(dividingBy: 3)))

        // Câmera segue Manu suavemente
        let targetPos = SCNVector3(manu.position.x, 5, manu.position.z + 6)
        cameraNode.position = SCNVector3(
            cameraNode.position.x + (targetPos.x - cameraNode.position.x) * 0.05,
            cameraNode.position.y + (targetPos.y - cameraNode.position.y) * 0.05,
            cameraNode.position.z + (targetPos.z - cameraNode.position.z) * 0.05
        )

        // Atualizar plantas visuais
        refreshAllPlots()
    }

    // MARK: – Toques
    func handleTap(at point: CGPoint, in view: SCNView) {
        let hitOptions: [SCNHitTestOption: Any] = [.searchMode: SCNHitTestSearchMode.all.rawValue]
        let hits = view.hitTest(point, options: hitOptions)

        guard let hit = hits.first else { return }
        let node = hit.node

        // Verificar se tocou num canteiro
        if let plotName = findPlotName(from: node) {
            let id = Int(plotName.replacingOccurrences(of: "plot_", with: "")) ?? 0
            handlePlotTap(id)
            return
        }

        // Verificar se tocou no fogo
        if fireNodes.contains(where: { $0 == node || node.isDescendant(of: $0) }) {
            extinguishFire(at: node)
            return
        }

        // Verificar se tocou na camisa
        if node == shirtNode || node.isDescendant(of: shirtNode ?? SCNNode()) {
            gameState.findShirt()
            shirtNode?.removeFromParentNode()
            shirtNode = nil
            return
        }

        // Andar para o ponto tocado (chão)
        let groundHits = view.hitTest(point, options: [.categoryBitMask: 1])
        if let groundHit = groundHits.first(where: { $0.node.geometry is SCNFloor }) {
            let pos = groundHit.worldCoordinates
            moveTo(pos)
        }
    }

    // MARK: – Movimento
    private func moveTo(_ destination: SCNVector3) {
        moveStart = manu.position
        moveEnd = SCNVector3(destination.x, 0, destination.z)
        let dist = sqrt(pow(moveEnd.x - moveStart.x, 2) + pow(moveEnd.z - moveStart.z, 2))
        moveDuration = TimeInterval(max(dist * 0.3, 0.3))
        walkProgress = 0
        isMoving = true

        let angle = atan2(moveEnd.x - moveStart.x, moveEnd.z - moveStart.z)
        manu.eulerAngles.y = angle
    }

    // MARK: – Ações nos canteiros
    private func handlePlotTap(_ id: Int) {
        let plot = gameState.plots[id]
        let stage = CropSystem.stage(of: plot)

        switch stage {
        case .empty:
            NotificationCenter.default.post(name: .showSeedPicker, object: nil, userInfo: ["plot": id])
        case .seed, .sprout:
            gameState.water(plot: id)
        case .growing:
            gameState.water(plot: id)
        case .ready:
            _ = gameState.harvest(plot: id)
        }
    }

    // MARK: – Fogo (missão bombeiro)
    func spawnFire() {
        let positions: [SCNVector3] = [
            SCNVector3(1.5, 0, -1), SCNVector3(-1, 0, 2), SCNVector3(2, 0, 1.5),
            SCNVector3(-2, 0, 0), SCNVector3(0.5, 0, -2.5), SCNVector3(-1.5, 0, -1)
        ]
        let pos = positions.randomElement() ?? SCNVector3(0, 0, 0)

        let fire = SCNNode()
        fire.position = SCNVector3(pos.x, 0.1, pos.z)

        let flame1 = Geo.cone(bottomR: 0.1, topR: 0.02, height: 0.2, .fireOrange)
        flame1.position = SCNVector3(0, 0.1, 0)
        fire.addChildNode(flame1)
        let flame2 = Geo.cone(bottomR: 0.06, topR: 0.01, height: 0.15, .fireYellow)
        flame2.position = SCNVector3(0.03, 0.15, 0.02)
        fire.addChildNode(flame2)

        rootNode.addChildNode(fire)
        fireNodes.append(fire)
    }

    private func extinguishFire(at node: SCNNode) {
        guard let fire = fireNodes.first(where: { $0 == node || node.isDescendant(of: $0) }) else { return }
        fire.removeFromParentNode()
        fireNodes.removeAll { $0 == fire }
        gameState.extinguishFire()
        speech.say("Fogo apagado! 🚒💦")
    }

    // MARK: – Camisa do Nenão (missão)
    func spawnShirt(at spot: Int) {
        shirtNode?.removeFromParentNode()

        let positions: [SCNVector3] = [
            SCNVector3(3, 0.1, 2), SCNVector3(-3, 0.1, 2.5), SCNVector3(2.5, 0.1, -2),
            SCNVector3(-2, 0.1, -2.5), SCNVector3(0, 0.1, 3.5), SCNVector3(-3.5, 0.1, 0)
        ]
        guard spot < positions.count else { return }
        let pos = positions[spot]

        let shirt = Geo.box(0.15, 0.1, 0.05, .shirtGreen, chamfer: 0.02)
        shirt.position = pos
        shirt.name = "shirt"
        rootNode.addChildNode(shirt)
        shirtNode = shirt
    }

    // MARK: – Atualizar plantas visuais
    private func refreshAllPlots() {
        for (id, plot) in gameState.plots.enumerated() {
            let stage = CropSystem.stage(of: plot)
            updatePlantVisual(plotId: id, stage: stage, crop: plot.crop)
        }
    }

    private func updatePlantVisual(plotId: Int, stage: CropStage, crop: CropType?) {
        plantNodes[plotId]?.removeFromParentNode()
        guard stage != .empty, let crop = crop else { return }

        let emoji: String
        switch stage {
        case .seed:    emoji = "🌱"
        case .sprout:  emoji = "🌿"
        case .growing: emoji = crop.emoji
        case .ready:   emoji = crop.emoji
        default:       emoji = "🌱"
        }

        let node = Geo.emojiBillboard(emoji, size: 0.4)
        let plotPos = plotWorldPosition(plotId)
        node.position = SCNVector3(plotPos.x, 0.3, plotPos.z)
        rootNode.addChildNode(node)
        plantNodes[plotId] = node
    }

    private func plotWorldPosition(_ id: Int) -> SCNVector3 {
        let row = id / 3
        let col = id % 3
        return SCNVector3(CGFloat(col - 1) * 1.8, 0, CGFloat(row - 1) * 1.8 + 1)
    }

    // MARK: – Eventos do GameState
    private func handleEvent(_ event: GameEvent) {
        switch event {
        case .speak(let text):
            speech.say(text)
        case .shirtHidden(let spot):
            spawnShirt(at: spot)
        case .eggAvailable:
            speech.say("A galinha botou um ovo! 🥚")
        case .celebrate:
            for _ in 0..<10 {
                let confetti = Geo.emojiBillboard(["🎉", "⭐", "🌟", "💖"].randomElement()!, size: 0.3)
                confetti.position = SCNVector3(
                    CGFloat.random(in: -3...3),
                    CGFloat.random(in: 1...3),
                    CGFloat.random(in: -2...3)
                )
                rootNode.addChildNode(confetti)
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    confetti.removeFromParentNode()
                }
            }
        default:
            break
        }
    }

    // MARK: – Helpers
    private func findPlotName(from node: SCNNode) -> String? {
        if let name = node.name, name.hasPrefix("plot_") { return name }
        if let name = node.parent?.name, name.hasPrefix("plot_") { return name }
        if let name = node.parent?.parent?.name, name.hasPrefix("plot_") { return name }
        return nil
    }
}

// MARK: – Notification
extension Notification.Name {
    static let showSeedPicker = Notification.Name("showSeedPicker")
}
