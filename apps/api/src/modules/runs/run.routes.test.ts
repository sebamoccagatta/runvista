import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { createRunRoutes } from './run.routes.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';

function createTestApp(authenticated = true) {
  const service = {
    create: vi.fn().mockResolvedValue({
      id: runId,
      title: 'Pokémon Y',
      status: 'DRAFT',
    }),
    list: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(false),
  };

  const app = Fastify({ logger: false });

  app.register(
    createRunRoutes({
      service,
      resolveActorId: () => (authenticated ? actorId : null),
    }),
  );

  return { app, service };
}

describe('Run routes', () => {
  it('rejects unauthenticated requests', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'GET',
      url: '/api/runs',
    });

    expect(response.statusCode).toBe(401);
    expect(service.list).not.toHaveBeenCalled();

    await app.close();
  });

  it('creates a run for the authenticated actor', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: 'Pokémon Y',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(service.create).toHaveBeenCalledWith(actorId, {
      title: 'Pokémon Y',
    });

    await app.close();
  });

  it('rejects invalid creation data', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/runs',
      payload: {
        title: '',
        ownerId: 'another-user',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.create).not.toHaveBeenCalled();

    await app.close();
  });

  it('lists only the authenticated actor runs', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/runs',
    });

    expect(response.statusCode).toBe(200);
    expect(service.list).toHaveBeenCalledWith(actorId);

    await app.close();
  });

  it('returns a run when accessible', async () => {
    const { app, service } = createTestApp();

    service.getById.mockResolvedValueOnce({
      id: runId,
      title: 'Pokémon Y',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(service.getById).toHaveBeenCalledWith(actorId, runId);

    await app.close();
  });

  it('returns 404 when a run is not accessible', async () => {
    const { app } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('rejects invalid run IDs', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/runs/not-a-uuid',
    });

    expect(response.statusCode).toBe(400);
    expect(service.getById).not.toHaveBeenCalled();

    await app.close();
  });

  it('updates a run belonging to the actor', async () => {
    const { app, service } = createTestApp();

    service.update.mockResolvedValueOnce({
      id: runId,
      title: 'Nuevo nombre',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}`,
      payload: {
        title: 'Nuevo nombre',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(service.update).toHaveBeenCalledWith(actorId, runId, { title: 'Nuevo nombre' });

    await app.close();
  });

  it('rejects an empty update', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(service.update).not.toHaveBeenCalled();

    await app.close();
  });

  it('deletes an accessible run', async () => {
    const { app, service } = createTestApp();

    service.remove.mockResolvedValueOnce(true);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/runs/${runId}`,
    });

    expect(response.statusCode).toBe(204);
    expect(service.remove).toHaveBeenCalledWith(actorId, runId);

    await app.close();
  });

  it('returns 404 when deletion is not allowed', async () => {
    const { app } = createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/runs/${runId}`,
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});
