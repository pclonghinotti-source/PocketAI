# PocketAI

Transforma iPhones/iPads antigos em **servidores de inferência** para câmeras IP.
_"Câmeras entram. Eventos saem."_ Não grava vídeo, não substitui o Frigate — só detecta
`person` em tempo real e publica eventos MQTT para o Home Assistant.

```
RTSP → decode HW (VideoToolbox) → scheduler (5 FPS) → Vision/CoreML (YOLO) → filtro person → MQTT
```

## Status

MVP completo em código (Módulos 1–6). Ainda não buildado/validado em hardware.
Detalhes de arquitetura nos READMEs de `Camera/`, `AI/`, `MQTT/`.

## Como rodar (sem Mac — Windows + iPad + GitHub Actions)

### Fase 1 — testes de lógica (CI, grátis)
Suba o repo (raiz = esta pasta) para o GitHub **público**. A Action `CI` roda
`swift test` automaticamente e valida pipeline, parsing e MQTT.

```bash
git init
git add .
git commit -m "PocketAI MVP"
git branch -M main
git remote add origin https://github.com/<voce>/PocketAI.git
git push -u origin main
```

### Fase 2 — modelo YOLO (automático na CI)
O export CoreML **não roda no Windows** (limitação do Ultralytics). Por isso o modelo é
gerado automaticamente pela Action **iOS Build** no runner macOS (passo "Gerar modelo YOLO").
Nada a fazer manualmente. Para gerar localmente, só em macOS ou Linux (ex.: Docker).

### Fase 3 — build do app + instalar no iPad
1. No GitHub → aba **Actions** → workflow **iOS Build** → **Run workflow**.
2. Baixe o artefato `PocketAI-unsigned-ipa`.
3. No **AltStore** (iPad): My Apps → **+** → selecione o `.ipa` → ele assina e instala.
4. No iPad: **Ajustes → Geral → Gerenciamento de Dispositivo** → confie no seu Apple ID.

> A Fase 3 depende do build do FFmpeg (`Scripts/build-ffmpeg.sh`) e do wiring do módulo
> C `CFFmpeg` — parte mais provável de precisar de ajuste na primeira execução.

## Uso no app

Tela única: nome da câmera, URL RTSP + credenciais, FPS, threshold, servidor MQTT + credenciais,
e **INICIAR/PARAR**. Senhas ficam no Keychain. Ligue "Simular A11" para testar no iPad (A14) o
caminho de GPU que o iPhone 8 seguiria.

## Requer macOS?

Só para **compilar** (feito pela GitHub Actions na nuvem, grátis para repo público).
Desenvolvimento, geração do modelo e instalação rodam no Windows + iPad.
