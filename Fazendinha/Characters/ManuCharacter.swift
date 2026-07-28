import SceneKit

/// A Manu — protagonista de cabelos castanhos cacheados e vestido rosa.
///
/// Construída com primitivas SceneKit (estilo cartoon 3D fofo).
/// Altura total ~1.2 unidades.
final class ManuCharacter: SCNNode {

    // MARK: – Sub‑nodes públicos (para animação)
    let bodyNode: SCNNode
    let headNode: SCNNode
    let leftArm: SCNNode
    let rightArm: SCNNode
    let leftLeg: SCNNode
    let rightLeg: SCNNode

    override init() {
        // ── Corpo (vestido rosa) ──
        let body = Geo.box(0.5, 0.55, 0.35, .manuDress, chamfer: 0.04)
        body.position = SCNVector3(0, 0.4, 0)
        bodyNode = body

        // ── Cabeça ──
        let head = Geo.sphere(0.22, .manuSkin)
        head.position = SCNVector3(0, 0.85, 0)
        headNode = head

        // ── Cabelo (cachinhos castanhos) ──
        let hair = Geo.sphere(0.24, .manuHair)
        hair.position = SCNVector3(0, 0.95, 0.02)
        hair.scale    = SCNVector3(1, 0.7, 0.9)
        head.addChildNode(hair)

        // Topete (cachinhos extras)
        for i in -1...1 {
            let curl = Geo.sphere(0.08, .manuHair)
            curl.position = SCNVector3(CGFloat(i) * 0.12, 0.1, 0.1)
            head.addChildNode(curl)
        }

        // ── Olhos ──
        let eyeWhite = Geo.sphere(0.05, .white)
        eyeWhite.position = SCNVector3(-0.08, 0.88, 0.2)
        head.addChildNode(eyeWhite)
        let eyeWhite2 = eyeWhite.clone()
        eyeWhite2.position = SCNVector3(0.08, 0.88, 0.2)
        head.addChildNode(eyeWhite2)

        let pupil = Geo.sphere(0.025, .black)
        pupil.position = SCNVector3(-0.08, 0.88, 0.24)
        head.addChildNode(pupil)
        let pupil2 = pupil.clone()
        pupil2.position = SCNVector3(0.08, 0.88, 0.24)
        head.addChildNode(pupil2)

        // ── Boca (sorriso) ──
        let mouth = Geo.box(0.08, 0.015, 0.01, .red, chamfer: 0.005)
        mouth.position = SCNVector3(0, 0.8, 0.2)
        head.addChildNode(mouth)

        // ── Braços ──
        let arm = Geo.capsule(radius: 0.04, height: 0.3, .manuSkin)
        arm.position = SCNVector3(-0.35, 0.5, 0)
        leftArm = arm

        let arm2 = arm.clone()
        arm2.position = SCNVector3(0.35, 0.5, 0)
        rightArm = arm2

        // ── Pernas ──
        let leg = Geo.capsule(radius: 0.04, height: 0.25, .manuSkin)
        leg.position = SCNVector3(-0.12, 0.1, 0)
        leftLeg = leg

        let leg2 = leg.clone()
        leg2.position = SCNVector3(0.12, 0.1, 0)
        rightLeg = leg2

        // ── Sapatos ──
        let shoe = Geo.box(0.1, 0.05, 0.15, .red, chamfer: 0.02)
        shoe.position = SCNVector3(-0.12, -0.02, 0.02)
        leftLeg.addChildNode(shoe)
        let shoe2 = shoe.clone()
        shoe2.position = SCNVector3(0.12, -0.02, 0.02)
        rightLeg.addChildNode(shoe2)

        super.init()

        addChildNode(bodyNode)
        addChildNode(headNode)
        addChildNode(leftArm)
        addChildNode(rightArm)
        addChildNode(leftLeg)
        addChildNode(rightLeg)

        // Sombra projetada
        let shadow = SCNNode(geometry: SCNFloor())
        shadow.position = SCNVector3(0, -0.01, 0)
        shadow.scale    = SCNVector3(0.3, 1, 0.3)
        shadow.opacity  = 0.15
        addChildNode(shadow)
    }

    required init?(coder: NSCoder) { nil }

    // MARK: – Animação de caminhada (balanço simples)
    func walkAnimation(progress: CGFloat) {
        let swing = sin(progress * .pi * 2) * 0.2
        leftArm.eulerAngles.z   = swing
        rightArm.eulerAngles.z  = -swing
        leftLeg.eulerAngles.z   = -swing * 0.5
        rightLeg.eulerAngles.z  = swing * 0.5
    }

    func idlePose() {
        leftArm.eulerAngles.z  = 0
        rightArm.eulerAngles.z = 0
        leftLeg.eulerAngles.z  = 0
        rightLeg.eulerAngles.z = 0
    }
}
