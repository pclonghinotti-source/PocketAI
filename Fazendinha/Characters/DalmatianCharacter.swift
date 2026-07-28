import SceneKit

/// Dálmata Bombeiro Filhote — cachorrinho branco com manchinhas pretas + chapéu de bombeiro.
final class DalmatianCharacter: SCNNode {
    let tailNode: SCNNode
    let headNode: SCNNode

    override init() {
        let body = Geo.capsule(radius: 0.12, height: 0.3, .dogWhite)
        body.position = SCNVector3(0, 0.2, 0)
        for (x, y, z): [(CGFloat, CGFloat, CGFloat)] in [(0.1, 0.2, 0.1), (-0.08, 0.25, 0.0), (0.05, 0.15, -0.1)] {
            let s = Geo.sphere(0.03, .dogSpot)
            s.position = SCNVector3(x, y, z)
            body.addChildNode(s)
        }

        let head = Geo.sphere(0.1, .dogWhite)
        head.position = SCNVector3(0, 0.38, 0.1)
        headNode = head

        let snout = Geo.sphere(0.05, .white)
        snout.position = SCNVector3(0, 0.36, 0.18)
        head.addChildNode(snout)
        let nose = Geo.sphere(0.02, .black)
        nose.position = SCNVector3(0, 0.36, 0.22)
        head.addChildNode(nose)

        for x in [-0.04 as CGFloat, 0.04 as CGFloat] {
            let eye = Geo.sphere(0.02, .black)
            eye.position = SCNVector3(x, 0.4, 0.16)
            head.addChildNode(eye)
            let hl = Geo.sphere(0.006, .white)
            hl.position = SCNVector3(x + 0.01, 0.41, 0.18)
            head.addChildNode(hl)
        }
        for x in [-0.08 as CGFloat, 0.08 as CGFloat] {
            let ear = Geo.sphere(0.04, .dogWhite)
            ear.position = SCNVector3(x, 0.44, 0.08)
            ear.scale = SCNVector3(0.8, 1.2, 0.6)
            head.addChildNode(ear)
        }

        let hatBase = Geo.cylinder(radius: 0.1, height: 0.02, .helmetRed)
        hatBase.position = SCNVector3(0, 0.46, 0.08)
        head.addChildNode(hatBase)
        let hatTop = Geo.sphere(0.06, .helmetRed)
        hatTop.position = SCNVector3(0, 0.5, 0.08)
        hatTop.scale = SCNVector3(1, 0.5, 1)
        head.addChildNode(hatTop)
        let badge = Geo.box(0.02, 0.01, 0.01, .yellow)
        badge.position = SCNVector3(0, 0.48, 0.14)
        head.addChildNode(badge)

        let tail = Geo.capsule(radius: 0.015, height: 0.1, .dogWhite)
        tail.position = SCNVector3(0, 0.25, -0.15)
        tail.eulerAngles.z = 0.4
        tailNode = tail

        super.init()
        addChildNode(body)
        addChildNode(head)
        addChildNode(tail)
        for x in [-0.08 as CGFloat, 0.08 as CGFloat] {
            for z in [-0.05 as CGFloat, 0.05 as CGFloat] {
                let leg = Geo.capsule(radius: 0.025, height: 0.1, .dogWhite)
                leg.position = SCNVector3(x, 0.05, z)
                addChildNode(leg)
            }
        }
        let shadow = SCNNode(geometry: SCNFloor())
        shadow.position = SCNVector3(0, -0.01, 0)
        shadow.scale = SCNVector3(0.2, 1, 0.2)
        shadow.opacity = 0.12
        addChildNode(shadow)
    }

    required init?(coder: NSCoder) { nil }
    func wagTail(progress: CGFloat) { tailNode.eulerAngles.z = 0.4 + sin(progress * .pi * 4) * 0.3 }
}
