@'

# Runvista — Agent Instructions

## Project

Runvista is a public, multi-user platform for Pokémon streamers.

Main features:

- Pokémon run management.
- Nuzlocke and Randomlocke support.
- Team, boxes, cemetery, encounters and badges.
- Customizable OBS overlays.
- Twitch integrations.
- Real-time synchronization.
- Secure collaboration.

## Architecture

Monorepo managed with pnpm workspaces.

Applications:

- apps/web: React frontend.
- apps/api: Fastify backend.
- apps/overlay: OBS browser sources.
- apps/twitch-worker: Twitch integrations.

Shared packages:

- packages/domain
- packages/contracts
- packages/pokemon-data
- packages/overlay-engine
- packages/ui
- packages/config

## Development rules

- Never implement features directly on main.
- Create a dedicated branch for each change.
- Keep changes small and focused.
- Follow existing architecture and conventions.
- Use TypeScript strict mode.
- Prefer reusable domain logic.
- Do not introduce unnecessary dependencies.
- Do not commit secrets or environment files.
- Validate changes before considering a task complete.

## Testing

- Use Vitest for unit tests.
- Add tests for business rules.
- Avoid tests that only verify implementation details.
- Run lint, formatting and relevant tests.

## Agent efficiency

- Read only files relevant to the current task.
- Prefer targeted searches over full repository scans.
- Avoid repeatedly reading unchanged files.
- Reuse existing project context.
- Keep responses concise unless detailed explanations are requested.
- Use Serena only when structural code navigation is useful.
- Do not launch Serena dashboards unnecessarily.
- Keep Engram enabled.
- Store durable decisions, not trivial actions, in persistent memory.
- Do not invoke external tools without a clear purpose.

## Documentation

- Product requirements: docs/product
- Architecture: docs/architecture
- Technical decisions: docs/decisions

Update documentation when an architectural or product decision changes.
'@ | Set-Content -Encoding utf8 AGENTS.md
