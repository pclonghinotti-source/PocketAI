# Camera — ingestão RTSP (FFmpeg demux + VideoToolbox decode)

Implementa o `FrameSource` real: fala RTSP, demuxa o container e decodifica em
**hardware** via VideoToolbox, entregando `CVPixelBuffer` (zero-copy) ao pipeline.

## Divisão de responsabilidades (SOLID)

- **`RTSPDemuxer`** — fala só com o FFmpeg (`libavformat`). Abre a sessão RTSP (TCP +
  timeouts + interrupt callback), acha o stream de vídeo e entrega pacotes H.264/H.265
  comprimidos + `extradata` (parameter sets). Não conhece VideoToolbox.
- **`VideoToolboxDecoder`** — fala só com o VideoToolbox. Monta o `CMVideoFormatDescription`
  a partir dos parameter sets, cria um `VTDecompressionSession` (saída
  `420YpCbCr8BiPlanarFullRange`) e decodifica cada pacote → `CVPixelBuffer`. Não conhece FFmpeg.
- **`RTSPFrameSource`** — o `actor` que compõe os dois num loop numa **thread dedicada**
  (o `av_read_frame` é bloqueante — não pode rodar no executor do actor nem no pool
  cooperativo), alimentando o `AsyncStream(.bufferingNewest(1))` (latest-wins).

O `PipelineEngine` não muda: troca-se o `MockFrameSource` por `RTSPFrameSource` via DI.

## Pré-requisitos

O `FFmpeg.xcframework` NÃO está versionado (binário). Gere-o em macOS:

```bash
cd PocketAI/Scripts
./build-ffmpeg.sh
```

Depois faça o wiring descrito em `CFFmpeg/module.modulemap`.

## Licença

Build **LGPL** (sem `--enable-gpl`/`--enable-nonfree`). Ao distribuir o app, mantenha a
conformidade LGPL (aviso de licença + possibilidade de relink). O script já evita
componentes GPL.
