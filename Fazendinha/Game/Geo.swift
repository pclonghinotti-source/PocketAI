import SceneKit
import UIKit

// MARK: – Paleta de cores da fazenda
extension UIColor {
    static let skyGradientTop    = #colorLiteral(red: 0.58, green: 0.80, blue: 0.99, alpha: 1.0)
    static let grass             = #colorLiteral(red: 0.45, green: 0.78, blue: 0.42, alpha: 1.0)
    static let grassDark         = #colorLiteral(red: 0.35, green: 0.68, blue: 0.32, alpha: 1.0)
    static let soil              = #colorLiteral(red: 0.55, green: 0.38, blue: 0.24, alpha: 1.0)
    static let soilDark          = #colorLiteral(red: 0.42, green: 0.28, blue: 0.16, alpha: 1.0)
    static let barnRed           = #colorLiteral(red: 0.81, green: 0.18, blue: 0.18, alpha: 1.0)
    static let wood              = #colorLiteral(red: 0.61, green: 0.42, blue: 0.24, alpha: 1.0)
    static let pond              = #colorLiteral(red: 0.29, green: 0.56, blue: 0.73, alpha: 1.0)
    static let cloud             = #colorLiteral(red: 0.95, green: 0.95, blue: 0.97, alpha: 1.0)
    static let manuSkin          = #colorLiteral(red: 0.96, green: 0.80, blue: 0.66, alpha: 1.0)
    static let manuHair          = #colorLiteral(red: 0.45, green: 0.22, blue: 0.08, alpha: 1.0)
    static let manuDress         = #colorLiteral(red: 0.92, green: 0.35, blue: 0.59, alpha: 1.0)
    static let dogWhite          = #colorLiteral(red: 0.95, green: 0.95, blue: 0.95, alpha: 1.0)
    static let dogSpot           = #colorLiteral(red: 0.15, green: 0.15, blue: 0.15, alpha: 1.0)
    static let helmetRed         = #colorLiteral(red: 0.90, green: 0.12, blue: 0.12, alpha: 1.0)
    static let bearBrown         = #colorLiteral(red: 0.55, green: 0.33, blue: 0.18, alpha: 1.0)
    static let bearMuzzle        = #colorLiteral(red: 0.72, green: 0.55, blue: 0.38, alpha: 1.0)
    static let shirtGreen        = #colorLiteral(red: 0.28, green: 0.76, blue: 0.45, alpha: 1.0)
    static let fireOrange        = #colorLiteral(red: 0.95, green: 0.49, blue: 0.12, alpha: 1.0)
    static let fireYellow        = #colorLiteral(red: 1.00, green: 0.87, blue: 0.24, alpha: 1.0)
    static let pumpkin           = #colorLiteral(red: 0.94, green: 0.57, blue: 0.12, alpha: 1.0)
    static let strawberry        = #colorLiteral(red: 0.85, green: 0.16, blue: 0.16, alpha: 1.0)
    static let sunflower         = #colorLiteral(red: 1.00, green: 0.84, blue: 0.00, alpha: 1.0)
    static let carrot            = #colorLiteral(red: 0.95, green: 0.45, blue: 0.12, alpha: 1.0)
}

// MARK: – Hit-testing helpers
extension SCNNode {
    /// SceneKit não tem isso nativo (é coisa de UIView/NSView) — sobe a cadeia de pais.
    func isDescendant(of ancestor: SCNNode) -> Bool {
        var current: SCNNode? = parent
        while let node = current {
            if node == ancestor { return true }
            current = node.parent
        }
        return false
    }
}

// MARK: – Fábrica de geometrias cartoon
enum Geo {
    static func material(_ color: UIColor, roughness: CGFloat = 0.85,
                         metalness: CGFloat = 0.0) -> SCNMaterial
    {
        let m = SCNMaterial()
        m.diffuse.contents         = color
        m.roughness.contents       = roughness
        m.metalness.contents       = metalness
        m.lightingModel            = .physicallyBased
        return m
    }

    static func sphere(_ radius: CGFloat, _ color: UIColor) -> SCNNode {
        let g = SCNSphere(radius: radius)
        g.segmentCount = 20
        g.materials   = [material(color)]
        return SCNNode(geometry: g)
    }

    static func box(_ width: CGFloat, _ height: CGFloat, _ length: CGFloat,
                    _ color: UIColor, chamfer: CGFloat = 0.02) -> SCNNode
    {
        let g = SCNBox(width: width, height: height, length: length, chamferRadius: chamfer)
        g.materials = [material(color)]
        return SCNNode(geometry: g)
    }

    static func cylinder(radius: CGFloat, height: CGFloat,
                         _ color: UIColor) -> SCNNode
    {
        let g = SCNCylinder(radius: radius, height: height)
        g.materials = [material(color)]
        return SCNNode(geometry: g)
    }

    static func cone(bottomR: CGFloat, topR: CGFloat, height: CGFloat,
                     _ color: UIColor) -> SCNNode
    {
        let g = SCNCone(topRadius: topR, bottomRadius: bottomR, height: height)
        g.materials = [material(color)]
        return SCNNode(geometry: g)
    }

    static func capsule(radius: CGFloat, height: CGFloat,
                        _ color: UIColor) -> SCNNode
    {
        let g = SCNCapsule(capRadius: radius, height: height)
        g.materials = [material(color)]
        return SCNNode(geometry: g)
    }

    /// Placa 2D com emoji (sempre virada pra câmera via billboard).
    static func emojiBillboard(_ emoji: String, size: CGFloat = 1) -> SCNNode {
        let g = SCNPlane(width: size, height: size)
        let m = SCNMaterial()
        m.diffuse.contents   = emojiImage(emoji)
        m.isDoubleSided      = true
        g.materials          = [m]
        let node = SCNNode(geometry: g)
        node.constraints     = [SCNBillboardConstraint()]
        return node
    }

    static func emojiImage(_ emoji: String, size: CGFloat = 128) -> UIImage {
        let imgSize = CGSize(width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: imgSize)
        return renderer.image { ctx in
            let font = UIFont.systemFont(ofSize: size * 0.75)
            let attrs: [NSAttributedString.Key: Any] = [.font: font]
            let str  = emoji as NSString
            let rect = CGRect(
                x: (size - str.size(withAttributes: attrs).width) / 2,
                y: (size - font.lineHeight) / 2,
                width: size, height: size
            )
            str.draw(at: rect.origin, withAttributes: attrs)
        }
    }
}
