# AI — ObjectDetector real (Vision + CoreML/YOLO)

Implementa `ObjectDetector` (protocolo do Módulo 1) usando o modelo YOLO11n/v8n
convertido para CoreML com NMS embutido, rodando via Vision (`VNCoreMLRequest`).

## Como encaixa no pipeline

```
VideoFrame (CVPixelBuffer) → VisionObjectDetector.detect()
  → Vision faz crop/scale (320×320, scaleFit) + inferência + NMS embutido
  → [Detection] (TODAS as classes, sem filtro)
      → filtro person+threshold fica no PipelineEngine (Módulo 2), não aqui
```

## Gerando o modelo

Não precisa de Mac — só Python, em qualquer máquina (inclusive este Windows):

```bash
pip install ultralytics coremltools
python Scripts/export-yolo-coreml.py --model yolo11n.pt --imgsz 320 --out Resources
```

Isso baixa os pesos pré-treinados no COCO (80 classes; `person` = índice 0) e gera
`Resources/yolo11n.mlpackage` com NMS embutido.

No Xcode: arraste a pasta `.mlpackage` para `Resources/` do projeto ("Copy items if
needed", adicionar ao target do app). O Xcode a compila para `.mlmodelc` no build.

## Uso

```swift
let detector = VisionObjectDetector(modelName: "yolo11n", computeUnits: .all)
```

## `computeUnits` — por que é configurável

O A11 (iPhone 8) **não roda CoreML de terceiros na Neural Engine** — a inferência cai
para a GPU. O A14 (iPad disponível para testes) tem ANE forte e usaria por padrão com
`.all`. Isso distorce qualquer medição de latência/térmica feita no iPad.

Para simular no iPad o caminho real que o A11 vai seguir, force:

```swift
let detector = VisionObjectDetector(modelName: "yolo11n", computeUnits: .cpuAndGPU)
```

Compare os dois (`.all` vs `.cpuAndGPU`) no iPad antes de tirar qualquer conclusão de
performance sobre o iPhone 8 — os números de `.all` no A14 NÃO são preditivos.

## Escopo deste módulo (o que ficou de fora, de propósito)

- **Filtro `person` + threshold de confiança** — no `PipelineEngine` (Módulo 2), não aqui.
  O detector devolve todas as classes detectadas; é decisão de negócio, não de inferência.
- **Pós-processamento/NMS manual** — desnecessário: embutido no modelo via `nms=True`
  na exportação.
- **Modelo customizado/fine-tuned** — hoje usamos COCO pré-treinado (já cobre `person`
  sem treinar nada). Trocar de modelo no futuro não muda uma linha do `VisionObjectDetector`
  — só troca o arquivo `.mlpackage` e o `modelName`.
