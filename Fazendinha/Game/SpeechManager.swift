import AVFoundation

/// Gerenciador de falas usando AVSpeechSynthesizer (português‑Brasil, sem assets).
final class SpeechManager {
    private let synth = AVSpeechSynthesizer()
    private let queue = OperationQueue()

    var enabled = true

    init() {
        queue.maxConcurrentOperationCount = 1
    }

    func say(_ text: String) {
        guard enabled else { return }
        queue.addOperation { [weak self] in
            guard let self = self else { return }
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = AVSpeechSynthesisVoice(language: "pt-BR")
            utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.45
            utterance.pitchMultiplier = 1.3
            utterance.volume = 1.0
            self.synth.speak(utterance)
        }
    }

    func stop() {
        synth.stopSpeaking(at: .immediate)
        queue.cancelAllOperations()
    }
}
