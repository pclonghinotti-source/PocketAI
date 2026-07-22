# MQTT — EventPublisher real (CocoaMQTT)

Implementa `EventPublisher` (protocolo do Módulo 1): publica cada `DetectionEvent`
como JSON num broker MQTT, que o Home Assistant/Node-RED consome.

## Fluxo

```
DetectionEvent → DetectionEventPayload.json(...) (Core, puro)
              → tópico MQTTTopic.personEvent(camera:) (Core, puro)
              → CocoaMQTT.publish(qos: .qos0)  →  broker → Home Assistant
```

Tópico: `home/camera/{camera}/person`
Payload: `{ "camera": "garage", "confidence": 0.94, "detected": true, "timestamp": "2026-07-22T21:00:00Z" }`

## Dependência

`MQTTEventPublisher` usa **CocoaMQTT** — adicionar via SwiftPM no alvo do app iOS:

```
https://github.com/emqx/CocoaMQTT.git
```

A lógica pura (tópico + payload) fica no `Core/Publishing/` e é testada na CI sem broker;
só a cola do CocoaMQTT vive aqui (fora do pacote de testes, como Camera/ e AI/).

## Decisões (Módulo 5)

- **QoS 0** (fire-and-forget) — eventos de presença são efêmeros; sem garantia de entrega,
  coerente com o latest-wins do pipeline.
- **`connect()` aguarda o CONNACK real** (com timeout) — feedback honesto ao botão START.
- **Auto-reconnect do CocoaMQTT DESLIGADO** — reconexão é o retry mínimo do `PipelineEngine`
  (Módulo 2); backoff robusto fica para o módulo Networking.
- **`publish` lança só se desconectado** — o que já aciona o retry do engine.
- **TLS** como flag simples (`useTLS`), sem client cert (fora do escopo do MVP).

## Ponto a verificar no Xcode

As assinaturas de `CocoaMQTTDelegate` mudam entre versões do CocoaMQTT (ex.:
`didSubscribeTopics`). Se o build reclamar, ajuste os stubs em `MQTTDelegateAdapter`
conforme a versão fixada.
