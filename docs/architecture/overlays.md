# Overlays de OBS: arquitectura

Este documento describe cómo funcionan los overlays de Runvista, desde el editor hasta la fuente de navegador en OBS Studio.

## Componentes

| Pieza                             | Responsabilidad                                                             |
| --------------------------------- | --------------------------------------------------------------------------- |
| `RunOverlay` (Prisma)             | Diseño del overlay: nombre, `layout` (lienzo 1920×1080) y credenciales OBS. |
| `RunPublishedTeam` (Prisma)       | Snapshot publicado del equipo, uno por partida.                             |
| `overlayEventBus`                 | Coordina los eventos SSE en memoria, por partida.                           |
| `/api/obs/overlays/:token`        | Devuelve el diseño y el equipo publicado. Sin sesión.                       |
| `/api/obs/overlays/:token/events` | Stream SSE de cambios para ese overlay.                                     |
| `PublicObsOverlayPage`            | Página que OBS carga como fuente de navegador.                              |

## Publicación del equipo

Modificar un Pokémon **no** actualiza OBS. Solo la acción explícita **Actualizar OBS** guarda un nuevo snapshot en `RunPublishedTeam` e incrementa `version`. Ver [0001](../decisions/0001-publicacion-manual-equipo.md).

Consecuencias verificadas por pruebas de integración:

- Antes de la primera publicación, OBS no muestra Pokémon activos.
- Varios overlays de una partida comparten el mismo snapshot.
- Editar o mover Pokémon no altera el snapshot.
- El snapshot sobrevive a reinicios y se elimina con la partida.

## Credenciales OBS

- `obsPublicId`: credencial recuperable del enlace. Es un secreto de acceso.
- `obsTokenHash`: hash de la versión anterior, solo para admitir enlaces antiguos. Al renovar, el enlace anterior queda invalidado.
- Las respuestas CRUD generales nunca incluyen estos valores (AUD-01).

## Flujo SSE

1. OBS abre `/events`. El servidor valida el acceso dos veces: antes y después de suscribirse, para reducir la ventana de una revocación concurrente.
2. El servidor envía `retry` (10 s) y el evento `connected`.
3. Eventos posibles:
   - `team-published`: el cliente vuelve a pedir el snapshot.
   - `access-revoked` y `run-deleted`: el cliente borra el contenido y cierra la conexión.
   - `server-shutdown`: el cliente cierra la conexión.
4. Un heartbeat cada 25 s mantiene viva la conexión.
5. Límites: 20 conexiones por partida y 500 en total. Por encima, `503` con `Retry-After`.
6. Si el búfer de escritura supera 64 KB, la conexión se cierra para no acumular datos.

No hay polling mientras SSE está conectado.

## Recuperación en el cliente

- **Error de red o respuesta no válida tras una notificación:** se conserva el último equipo y se reintenta a los 5 s. El reintento se cancela al obtener datos válidos, al revocar o al desmontar la página.
- **401, 403, 404 o 410:** el overlay se vacía y no se reintenta.
- **Error del stream:** se revalida el enlace y se reconecta una vez a los 10 s.

## Cierre del servidor (AUD-04)

`SIGINT` y `SIGTERM` llaman a `app.close()`. El hook `preClose` envía `server-shutdown` a todos los streams activos y después se desconecta Prisma. Si el cierre supera 10 s, el proceso termina de forma forzada.

## Limitación conocida

Los eventos SSE se coordinan en memoria de una única instancia de API. Para escalar horizontalmente habría que usar un canal compartido, por ejemplo Redis Pub/Sub (AUD-08).
