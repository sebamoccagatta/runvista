import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';
import { TeamSlotOccupiedError } from './run-pokemon.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const pokemonId = '770e8400-e29b-41d4-a716-446655440000';
const origin = 'http://localhost:5173';

const pokemon = {
  id: pokemonId,
  runId,
  speciesId: 658,
  nickname: 'Ninja',
  level: 42,
  isShiny: false,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: new Date('2026-11-23T12:00:00.000Z'),
  updatedAt: new Date('2026-11-23T12:00:00.000Z'),
};

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp(authenticated = true) {
  const service = {
    list: vi.fn().mockResolvedValue({
      found: true,
      pokemon: [pokemon],
    }),
    create: vi.fn().mockResolvedValue({
      found: true,
      pokemon,
    }),
    update: vi.fn().mockResolvedValue({
      found: true,
      pokemon,
    }),
    move: vi.fn().mockResolvedValue({
      found: true,
      pokemon,
    }),
  };

  const app = buildApp({
    allowedOrigins: [origin],
    runPokemon: {
      service,
      resolveActorId: () => (authenticated ? actorId : null),
    },
  });

  apps.push(app);

  return { app, service };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('Run Pokemon HTTP routes', () => {
  it('requires authentication to list Pokemon', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/pokemon`,
    });

    expect(response.statusCode).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('lists Pokemon from an accessible run', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/pokemon`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().pokemon).toHaveLength(1);

    expect(service.list).toHaveBeenCalledWith(actorId, runId);

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('rejects invalid run identifiers', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/runs/invalid/pokemon',
    });

    expect(response.statusCode).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('does not expose inaccessible runs', async () => {
    const { app, service } = createTestApp();

    service.list.mockResolvedValue({
      found: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/pokemon`,
    });

    expect(response.statusCode).toBe(404);
  });

  it('rejects POST without an allowed Origin', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      payload: { speciesId: 658 },
    });

    expect(response.statusCode).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('requires authentication for POST', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      headers: { origin },
      payload: { speciesId: 658 },
    });

    expect(response.statusCode).toBe(401);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('creates a Pokemon', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      headers: { origin },
      payload: {
        speciesId: 658,
        nickname: 'Ninja',
        level: 42,
        status: 'TEAM',
        teamSlot: 1,
      },
    });

    expect(response.statusCode).toBe(201);

    expect(service.create).toHaveBeenCalledWith(actorId, runId, {
      speciesId: 658,
      nickname: 'Ninja',
      level: 42,
      isShiny: false,
      status: 'TEAM',
      teamSlot: 1,
    });

    expect(response.json().pokemon.speciesId).toBe(658);
  });

  it('rejects invalid Pokemon input', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      headers: { origin },
      payload: {
        speciesId: 658,
        status: 'TEAM',
        teamSlot: 7,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('returns 404 when creating in an inaccessible run', async () => {
    const { app, service } = createTestApp();

    service.create.mockResolvedValue({ found: false });

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      headers: { origin },
      payload: { speciesId: 658 },
    });

    expect(response.statusCode).toBe(404);
  });

  it('returns 409 for an occupied team slot', async () => {
    const { app, service } = createTestApp();

    service.create.mockRejectedValue(new TeamSlotOccupiedError());

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      headers: { origin },
      payload: {
        speciesId: 25,
        status: 'TEAM',
        teamSlot: 1,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'TEAM_SLOT_OCCUPIED',
    });
  });

  it('updates a Pokemon', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}`,
      headers: { origin },
      payload: {
        nickname: 'Nuevo Ninja',
        level: 50,
      },
    });

    expect(response.statusCode).toBe(200);

    expect(service.update).toHaveBeenCalledWith(actorId, runId, pokemonId, {
      nickname: 'Nuevo Ninja',
      level: 50,
    });
  });

  it('rejects empty updates', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}`,
      headers: { origin },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('returns 404 for inaccessible Pokemon updates', async () => {
    const { app, service } = createTestApp();

    service.update.mockResolvedValue({ found: false });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}`,
      headers: { origin },
      payload: { level: 50 },
    });

    expect(response.statusCode).toBe(404);
  });

  it('moves a Pokemon to the box', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}/move`,
      headers: { origin },
      payload: { status: 'BOX' },
    });

    expect(response.statusCode).toBe(200);

    expect(service.move).toHaveBeenCalledWith(actorId, runId, pokemonId, { status: 'BOX' });
  });

  it('rejects moving to an occupied team slot', async () => {
    const { app, service } = createTestApp();

    service.move.mockRejectedValue(new TeamSlotOccupiedError());

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}/move`,
      headers: { origin },
      payload: {
        status: 'TEAM',
        teamSlot: 2,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'TEAM_SLOT_OCCUPIED',
    });
  });

  it('rejects invalid movement requests', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}/move`,
      headers: { origin },
      payload: {
        status: 'TEAM',
        teamSlot: 9,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.move).not.toHaveBeenCalled();
  });
});
