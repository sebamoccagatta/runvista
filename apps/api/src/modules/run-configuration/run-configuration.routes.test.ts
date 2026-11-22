import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const allowedOrigin = 'http://localhost:5173';

const configuration = {
  runId,
  gameId: 'y',
  challengeType: 'RANDOMLOCKE' as const,
  createdAt: new Date('2026-11-22T12:00:00.000Z'),
  updatedAt: new Date('2026-11-22T12:00:00.000Z'),
};

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp(authenticated = true) {
  const service = {
    getByRunId: vi.fn().mockResolvedValue({
      found: true,
      configuration,
    }),
    save: vi.fn().mockResolvedValue(configuration),
  };

  const app = buildApp({
    allowedOrigins: [allowedOrigin],
    runConfiguration: {
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

describe('Run configuration routes', () => {
  it('requires authentication for GET', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/configuration`,
    });

    expect(response.statusCode).toBe(401);
    expect(service.getByRunId).not.toHaveBeenCalled();
  });

  it('loads the configuration for an accessible run', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/configuration`,
    });

    expect(response.statusCode).toBe(200);

    expect(service.getByRunId).toHaveBeenCalledWith(actorId, runId);

    expect(response.json()).toMatchObject({
      configuration: {
        gameId: 'y',
        challengeType: 'RANDOMLOCKE',
      },
    });

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('allows a run without configuration', async () => {
    const { app, service } = createTestApp();

    service.getByRunId.mockResolvedValue({
      found: true,
      configuration: null,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/configuration`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      configuration: null,
    });
  });

  it('does not expose inaccessible runs', async () => {
    const { app, service } = createTestApp();

    service.getByRunId.mockResolvedValue({
      found: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/configuration`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: 'RUN_NOT_FOUND',
    });
  });

  it('rejects invalid run identifiers', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/runs/invalid/configuration',
    });

    expect(response.statusCode).toBe(400);
    expect(service.getByRunId).not.toHaveBeenCalled();
  });

  it('rejects PUT requests without an allowed Origin', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/configuration`,
      payload: {
        gameId: 'y',
        challengeType: 'NUZLOCKE',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: 'INVALID_REQUEST_ORIGIN',
    });
    expect(service.save).not.toHaveBeenCalled();
  });

  it('requires authentication for PUT', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/configuration`,
      headers: {
        origin: allowedOrigin,
      },
      payload: {
        gameId: 'y',
        challengeType: 'NUZLOCKE',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(service.save).not.toHaveBeenCalled();
  });

  it('saves a valid configuration', async () => {
    const { app, service } = createTestApp();

    const input = {
      gameId: 'y',
      challengeType: 'RANDOMLOCKE',
    };

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/configuration`,
      headers: {
        origin: allowedOrigin,
      },
      payload: input,
    });

    expect(response.statusCode).toBe(200);

    expect(service.save).toHaveBeenCalledWith(actorId, runId, input);

    expect(response.json()).toMatchObject({
      configuration: {
        gameId: 'y',
        challengeType: 'RANDOMLOCKE',
      },
    });
  });

  it('rejects games absent from the catalog', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/configuration`,
      headers: {
        origin: allowedOrigin,
      },
      payload: {
        gameId: 'pokemon-inventado',
        challengeType: 'NUZLOCKE',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.save).not.toHaveBeenCalled();
  });

  it('rejects invalid PUT run identifiers', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/runs/invalid/configuration',
      headers: {
        origin: allowedOrigin,
      },
      payload: {
        gameId: 'y',
        challengeType: 'NORMAL',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.save).not.toHaveBeenCalled();
  });

  it('returns 404 when saving an inaccessible run', async () => {
    const { app, service } = createTestApp();

    service.save.mockResolvedValue(null);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/configuration`,
      headers: {
        origin: allowedOrigin,
      },
      payload: {
        gameId: 'y',
        challengeType: 'NORMAL',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: 'RUN_NOT_FOUND',
    });
  });
});
