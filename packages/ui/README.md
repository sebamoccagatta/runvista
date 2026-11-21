# @runvista/ui

Biblioteca de componentes React reutilizables para Runvista.

## Objetivo

Centralizar los componentes visuales utilizados por las
aplicaciones de Runvista, manteniendo una interfaz consistente,
accesible y adaptable a diferentes tamaños de pantalla.

## Componentes generales

| Componente      | Descripción                     |
| --------------- | ------------------------------- |
| Button          | Botones con variantes y estados |
| Badge           | Etiquetas visuales              |
| Card            | Superficies reutilizables       |
| StatusIndicator | Indicadores de conexión         |

## Componentes Pokémon

| Componente       | Descripción                            |
| ---------------- | -------------------------------------- |
| PokemonTypeBadge | Representación de los 18 tipos Pokémon |
| PokemonCard      | Información visual de una criatura     |
| PartySlot        | Ranura individual del equipo           |
| PartyPreview     | Equipo de seis posiciones              |

## Instalación

El paquete se consume internamente mediante pnpm workspaces:

`"@runvista/ui": "workspace:*"`

## Uso

```tsx
import { PokemonCard, PokemonTypeBadge, PartyPreview } from '@runvista/ui';
```

## Arquitectura

Los componentes deben:

- Recibir información mediante propiedades.
- Mantener las reglas de negocio fuera del paquete.
- No realizar solicitudes HTTP directamente.
- Comunicar interacciones mediante callbacks.
- Soportar layouts responsive.
- Mantener una interfaz accesible.

## Estilos

Los componentes utilizan Tailwind CSS 4 y los tokens definidos
en `apps/web/src/index.css`.

El frontend registra `packages/ui/src` mediante `@source`
para incluir las clases utilizadas por el paquete compartido.

Las futuras aplicaciones consumidoras deberán proporcionar
los estilos y tokens correspondientes.

## Validaciones

Desde la raíz del monorepo:

```bash
pnpm run format:check
pnpm run lint
pnpm test
pnpm run typecheck
pnpm build
```

## Alcance actual

Design System v0.1.

Incluye componentes de presentación y pruebas básicas de
renderizado. No incluye persistencia, autenticación, conexión
con Twitch ni funcionamiento de overlays OBS.
