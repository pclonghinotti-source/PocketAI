#!/usr/bin/env python3
"""
export-yolo-coreml.py — converte YOLO11n/YOLOv8n (pré-treinado COCO) para CoreML,
com NMS embutido no modelo, pronto para o VisionObjectDetector.

Por que NMS embutido (decisão do Módulo 4): a Vision (VNCoreMLRequest) já devolve
VNRecognizedObjectObservation prontos quando o modelo tem esse formato — sem
decodificar tensor bruto nem rodar NMS em Swift. Roda em Accelerate/BNNS, não CPU pura.

Requer macOS ou Linux — o Ultralytics BLOQUEIA o export CoreML no Windows. Na prática
este script roda automaticamente na CI (runner macOS, ver .github/workflows/ios-build.yml),
que gera o .mlpackage durante a build. Localmente só funciona em macOS/Linux (ex.: Docker).

Uso:
    pip install ultralytics coremltools
    python export-yolo-coreml.py --model yolo11n.pt --imgsz 320 --out Resources

Isso baixa os pesos pré-treinados COCO (80 classes, "person" = índice 0) na primeira
execução e gera `Resources/yolo11n.mlpackage`.

Input do modelo: 320x320 (decisão fixada: input pequeno para o A11 na GPU).
"""
import argparse
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="yolo11n.pt",
                         help="Checkpoint YOLO (baixa automaticamente se não existir localmente).")
    parser.add_argument("--imgsz", type=int, default=320,
                         help="Tamanho de input (quadrado). 320 = decisão fixada do PocketAI.")
    parser.add_argument("--out", default="Resources",
                         help="Pasta de saída do .mlpackage (padrão: Resources/, para arrastar ao Xcode).")
    args = parser.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.model)

    # nms=True: embute a camada de NMS no grafo CoreML exportado — é isso que faz a Vision
    # devolver VNRecognizedObjectObservation prontos, sem pós-processamento manual em Swift.
    exported_path = model.export(
        format="coreml",
        imgsz=args.imgsz,
        nms=True,
        int8=False,   # fp16 é suficiente e mais preciso; int8 fica para otimização futura se necessário
        half=True,
    )

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / Path(exported_path).name
    shutil.move(exported_path, dest)

    print(f"✅ Gerado: {dest}")
    print("   Arraste esta pasta .mlpackage para Resources/ no Xcode (Copy items if needed).")
    print(f"   No VisionObjectDetector, use modelName: \"{dest.stem}\"")


if __name__ == "__main__":
    main()
