// swift-tools-version:5.9
import PackageDescription

// Pacote SwiftPM usado pela CI (GitHub Actions, runner macOS) para `swift test`.
//
// Escopo PROPOSITAL: só o módulo `PocketAI` (pasta Core/), que é lógica de plataforma
// portável (Foundation/CoreMedia/CoreVideo/os) — compila e testa num Mac na nuvem SEM Xcode
// de app e SEM FFmpeg. Assim os Módulos 1–2 e o parsing do Módulo 3 são validados a cada push.
//
// As pastas Camera/, AI/ e MQTT/ NÃO entram aqui: dependem de FFmpeg.xcframework (iOS-only),
// VideoToolbox/Vision/CoreML com hardware real, e CocoaMQTT. Serão compiladas pelo alvo do app
// iOS (via Xcode/XcodeGen na CI), junto com Core/ no MESMO módulo — por isso esses arquivos
// referenciam tipos do Core (`VideoCodec`, `NALUnit`, `MQTTTopic`) sem `import` e sem `public`.
let package = Package(
    name: "PocketAI",
    platforms: [
        .iOS(.v16),
        .macOS(.v13) // necessário para Duration/ContinuousClock ao rodar no runner macOS
    ],
    products: [
        .library(name: "PocketAI", targets: ["PocketAI"])
    ],
    targets: [
        .target(
            name: "PocketAI",
            path: "Core"
        ),
        .testTarget(
            name: "PocketAITests",
            dependencies: ["PocketAI"],
            path: "Tests/PocketAITests"
        )
    ]
)
