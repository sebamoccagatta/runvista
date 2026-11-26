# 0001. Publicación manual del equipo en OBS

- **Estado:** aceptada
- **Fecha:** 2026-11-26

## Contexto

El streamer modifica su equipo durante la partida: cambia de Pokémon, mueve posiciones y ajusta niveles. Si cada cambio se reflejara en OBS de inmediato, el público vería estados intermedios o incorrectos.

## Decisión

Los cambios del equipo quedan en borrador. Solo la acción explícita **Actualizar OBS** guarda un snapshot y notifica por SSE. Mientras no se publique, OBS mantiene el equipo anterior.

## Alternativas descartadas

- **Actualización automática en cada cambio:** expone estados intermedios y genera tráfico innecesario.
- **Polling del overlay:** más carga y latencia. SSE ya cubre la notificación.

## Consecuencias

- El streamer debe pulsar **Actualizar OBS** después de preparar cambios. Es un paso consciente, no un efecto secundario.
- El diseño del overlay (posiciones, tamaños, visibilidad) se guarda por separado y no requiere publicación. Hay que refrescar la fuente de navegador en OBS para verlo.
- El snapshot persiste en PostgreSQL y sobrevive a reinicios.

Detalles de la implementación en [overlays](../architecture/overlays.md).
