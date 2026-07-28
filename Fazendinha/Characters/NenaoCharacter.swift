import SceneKit

/// Nenão — urso de pelúcia marrom que só usa camisa verde (sem calça, sem sapato).
final class NenaoCharacter: SCNNode {
    let bodyNode: SCNNode
    let headNode: SCNNode
    let rightArm: SCNNode
    let shirtNode: SCNNode

    override init() {
        let body = Geo.box(0.4, 0.4, 0.3, .bearBrown, chamfer: 0.04)
        body.position = SCNVector3(0, 0.3, 0)
        bodyNode = body

        let shirt = Geo.box(0.44, 0.22, 0.34, .shirtGreen, chamfer: 0.04)
        shirt.position = SCNVector3(0, 0.35, 0)
        shirtNode = shirt
        body.addChildNode(shirt)

        let head = Geo.sphere(0.2, .bearBrown)
        head.position = SCNVector3(0, 0.7, 0)
        headNode = head

        let muzzle = Geo.sphere(0.08, .bearMuzzle)
        muzzle.position = SCNVector3(0, 0.68, 0.18)
        head.addChildNode(muzzle)
        let nose = Geo.sphere(0.025, .black)
        nose.position = SCNVector3(0, 0.68, 0.24)
        head.addChildNode(nose)
        for x in [-0.07 as CGFloat, 0.07 as CGFloat] {
            let eye = Geo.sphere(0.02, .black)
            eye.position = SCNVector3(x, 0.73, 0.18)
            head.addChildNode(eye)
        }
        for x in [-0.15 as CGFloat, 0.15 as CGFloat] {
            let ear = Geo.sphere(0.06, .bearBrown)
            ear.position = SCNVector3(x, 0.82, 0)
            head.addChildNode(ear)
            let inner = Geo.sphere(0.03, .bearMuzzle)
            inner.position = SCNVector3(x, 0.82, 0.02)
            head.addChildNode(inner)
        }

        let arm = Geo.capsule(radius: 0.05, height: 0.25, .bearBrown)
        arm.position = SCNVector3(-0.3, 0.35, 0)
        addChildNode(arm)
        let arm2 = arm.clone()
        arm2.position = SCNVector3(0.3, 0.35, 0)
        rightArm = arm2
        addChildNode(arm2)

        super.init()
        addChildNode(body)
        addChildNode(head)
        for x in [-0.1 as CGFloat, 0.1 as CGFloat] {
            let leg = Geo.capsule(radius: 0.05, height: 0.15, .bearBrown)
            leg.position = SCNVector3(x, 0.05, 0)
            addChildNode(leg)
            let foot = Geo.sphere(0.05, .bearBrown)
            foot.position = SCNVector3(x, -0.02, 0.03)
            addChildNode(foot)
        }
        let shadow = SCNNode(geometry: SCNFloor())
        shadow.position = SCNVector3(0, -0.01, 0)
        shadow.scale = SCNVector3(0.25, 1, 0.25)
        shadow.opacity = 0.12
        addChildNode(shadow)
    }

    required init?(coder: NSCoder) { nil }
    func wave(progress: CGFloat) { rightArm.eulerAngles.z = -0.5 + sin(progress * .pi * 3) * 0.3 }
}
