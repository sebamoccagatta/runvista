import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const allowedOrigin = 'http://localhost:5173';

const publication = {
  version: 1,
  publishedAt: new Date('2026-11-23T18:00:00.000Z'),
  pokemon: [
    {
      speciesId: 6,
      pokemonId: null,
      nickname: 'Chorizard',
      level: 52,
      isShiny: true,
      teamSlot: 1,
    },
  ],
};

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp(authenticated = true) {
  const service = {
    getStatus: vi.fn().mockResolvedValue({
      found: true,
      publication: {
        version: publication.version,
        publishedAt: publication.publishedAt,
      },
    }),
    publish: vi.fn().mockResolvedValue({
      found: true,
      publication,
    }),
  };

  const app = buildApp({
    allowedOrigins: [allowedOrigin],
    pokemonPublication: {
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

describe('Run Pokemon publication routes', () => {
  const statusPath = `/api/runs/${runId}/pokemon/publication`;

  const publishPath = `/api/runs/${runId}/pokemon/publish`;

  it('requires authentication to consult publication', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'GET',
      url: statusPath,
    });

    expect(response.statusCode).toBe(401);
    expect(service.getStatus).not.toHaveBeenCalled();
  });

  it('returns null when the team was never published', async () => {
    const { app, service } = createTestApp();

    service.getStatus.mockResolvedValueOnce({
      found: true,
      publication: null,
    });

    const response = await app.inject({
      method: 'GET',
      url: statusPath,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      publication: null,
    });
  });

  it('returns the last publication metadata', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: statusPath,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().publication.version).toBe(1);
    expect(service.getStatus).toHaveBeenCalledWith(actorId, runId);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('requires authentication to publish', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'POST',
      url: publishPath,
      headers: { origin: allowedOrigin },
    });

    expect(response.statusCode).toBe(401);
    expect(service.publish).not.toHaveBeenCalled();
  });

  it('rejects publication without an allowed Origin', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: publishPath,
    });

    expect(response.statusCode).toBe(403);
    expect(service.publish).not.toHaveBeenCalled();
  });

  it('publishes the current team', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: publishPath,
      headers: { origin: allowedOrigin },
    });

    expect(response.statusCode).toBe(200);
    expect(service.publish).toHaveBeenCalledWith(actorId, runId);

    expect(response.json()).toMatchObject({
      publication: {
        version: 1,
        pokemon: [
          {
            nickname: 'Chorizard',
            teamSlot: 1,
          },
        ],
      },
    });
  });

  it('rejects invalid run identifiers', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/runs/invalid/pokemon/publish',
      headers: { origin: allowedOrigin },
    });

    expect(response.statusCode).toBe(400);
    expect(service.publish).not.toHaveBeenCalled();
  });

  it('does not publish an inaccessible run', async () => {
    const { app, service } = createTestApp();

    service.publish.mockResolvedValueOnce({
      found: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: publishPath,
      headers: { origin: allowedOrigin },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: 'RUN_NOT_FOUND',
    });
  });

  it('reports a concurrent publication conflict', async () => {
    const { app, service } = createTestApp();

    service.publish.mockRejectedValueOnce({
      code: 'P2034',
    });

    const response = await app.inject({
      method: 'POST',
      url: publishPath,
      headers: { origin: allowedOrigin },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('PUBLICATION_CONFLICT');
  });
});
