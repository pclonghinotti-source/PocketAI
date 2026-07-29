import SceneKit

/// Constrói o mundo 3D da fazenda: terreno, celeiro, cercas, canteiros, lago, árvores.
enum FarmWorldBuilder {

    static func build() -> SCNNode {
        let world = SCNNode()

        // ── Terreno ──
        let ground = SCNNode(geometry: SCNFloor())
        ground.geometry?.materials = [Geo.material(.grass, roughness: 0.9)]
        ground.position = SCNVector3(0, -0.01, 0)
        world.addChildNode(ground)

        // ── Canteiros (3x3 grid) ──
        for row in 0..<3 {
            for col in 0..<3 {
                let plot = buildPlot()
                plot.position = SCNVector3(
                    CGFloat(col - 1) * 1.8,
                    0.02,
                    CGFloat(row - 1) * 1.8 + 1
                )
                plot.name = "plot_\(row * 3 + col)"
                world.addChildNode(plot)
            }
        }

        // ── Celeiro ──
        let barn = buildBarn()
        barn.position = SCNVector3(-3.5, 0, -2)
        world.addChildNode(barn)

        // ── Cercas ──
        for i in -3...3 {
            let fence = buildFence()
            fence.position = SCNVector3(CGFloat(i) * 1.2, 0, -3.5)
            world.addChildNode(fence)
            let fence2 = buildFence()
            fence2.position = SCNVector3(CGFloat(i) * 1.2, 0, 4.5)
            world.addChildNode(fence2)
        }
        for i in -3...4 {
            let fence = buildFence()
            fence.position = SCNVector3(-4.2, 0, CGFloat(i) * 1.2)
            fence.eulerAngles.y = .pi / 2
            world.addChildNode(fence)
            let fence2 = buildFence()
            fence2.position = SCNVector3(4.2, 0, CGFloat(i) * 1.2)
            fence2.eulerAngles.y = .pi / 2
            world.addChildNode(fence2)
        }

        // ── Lago ──
        let pond = Geo.sphere(0.6, .pond)
        pond.position = SCNVector3(3, 0.05, -2)
        pond.scale = SCNVector3(1, 0.1, 0.8)
        world.addChildNode(pond)

        // ── Árvores ──
        for pos in [(3.5, 2.5), (-3.5, 3.0), (2.0, -2.8), (-2.5, -3.0)] {
            let tree = buildTree()
            tree.position = SCNVector3(CGFloat(pos.0), 0, CGFloat(pos.1))
            world.addChildNode(tree)
        }

        // ── Iluminação ──
        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.color = UIColor(white: 0.6, alpha: 1)
        world.addChildNode(ambient)

        let sun = SCNNode()
        sun.light = SCNLight()
        sun.light?.type = .directional
        sun.light?.color = UIColor(white: 0.9, alpha: 1)
        sun.light?.castsShadow = true
        sun.light?.shadowMode = .deferred
        sun.eulerAngles = SCNVector3(-Float.pi / 4, Float.pi / 4, 0)
        world.addChildNode(sun)

        return world
    }

    static func buildPlot() -> SCNNode {
        let node = SCNNode()
        let soil = Geo.box(0.8, 0.05, 0.8, .soilDark, chamfer: 0.02)
        soil.position = SCNVector3(0, 0, 0)
        node.addChildNode(soil)
        let border = Geo.box(0.9, 0.03, 0.9, .wood, chamfer: 0.01)
        border.position = SCNVector3(0, 0.03, 0)
        node.addChildNode(border)
        return node
    }

    static func buildBarn() -> SCNNode {
        let node = SCNNode()
        let base = Geo.box(1.5, 0.8, 1.2, .barnRed, chamfer: 0.05)
        base.position = SCNVector3(0, 0.4, 0)
        node.addChildNode(base)
        let roof = Geo.cone(bottomR: 1.0, topR: 0.1, height: 0.5, .wood)
        roof.position = SCNVector3(0, 0.9, 0)
        node.addChildNode(roof)
        let door = Geo.box(0.3, 0.5, 0.02, .wood)
        door.position = SCNVector3(0, 0.25, 0.61)
        node.addChildNode(door)
        return node
    }

    static func buildFence() -> SCNNode {
        let node = SCNNode()
        let post = Geo.box(0.05, 0.2, 0.05, .wood)
        post.position = SCNVector3(-0.5, 0.1, 0)
        node.addChildNode(post)
        let post2 = post.clone()
        post2.position = SCNVector3(0.5, 0.1, 0)
        node.addChildNode(post2)
        let rail = Geo.box(1.0, 0.03, 0.03, .wood)
        rail.position = SCNVector3(0, 0.15, 0)
        node.addChildNode(rail)
        return node
    }

    static func buildTree() -> SCNNode {
        let node = SCNNode()
        let trunk = Geo.cylinder(radius: 0.05, height: 0.4, .wood)
        trunk.position = SCNVector3(0, 0.2, 0)
        node.addChildNode(trunk)
        let crown = Geo.sphere(0.3, .grassDark)
        crown.position = SCNVector3(0, 0.6, 0)
        node.addChildNode(crown)
        return node
    }
}
