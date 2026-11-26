import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';

import { createDefaultOverlayLayout } from './run-overlay.schemas.js';

import { OverlayNameConflictError } from './run-overlay.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const overlayId = '770e8400-e29b-41d4-a716-446655440000';
const allowedOrigin = 'http://localhost:5173';

const overlay = {
  id: overlayId,
  runId,
  name: 'Gameplay',
  layout: createDefaultOverlayLayout(),
  createdAt: new Date('2026-11-23T12:00:00.000Z'),
  updatedAt: new Date('2026-11-23T12:00:00.000Z'),
};

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp(authenticated = true) {
  const service = {
    list: vi.fn().mockResolvedValue({
      found: true,
      overlays: [overlay],
    }),
    getById: vi.fn().mockResolvedValue(overlay),
    create: vi.fn().mockResolvedValue({
      found: true,
      overlay,
    }),
    update: vi.fn().mockResolvedValue(overlay),
    remove: vi.fn().mockResolvedValue(true),
  };

  const app = buildApp({
    allowedOrigins: [allowedOrigin],
    runOverlays: {
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

describe('Run overlay routes', () => {
  it('requires authentication', async () => {
    const { app, service } = createTestApp(false);

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/overlays`,
    });

    expect(response.statusCode).toBe(401);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('lists overlays for an accessible run', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/overlays`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().overlays).toHaveLength(1);
    expect(service.list).toHaveBeenCalledWith(actorId, runId);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('does not expose inaccessible runs', async () => {
    const { app, service } = createTestApp();

    service.list.mockResolvedValueOnce({
      found: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/overlays`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('RUN_NOT_FOUND');
  });

  it('rejects invalid run identifiers', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/runs/invalid/overlays',
    });

    expect(response.statusCode).toBe(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('creates a valid overlay', async () => {
    const { app, service } = createTestApp();

    const input = {
      name: 'Gameplay',
      layout: createDefaultOverlayLayout(),
    };

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/overlays`,
      headers: { origin: allowedOrigin },
      payload: input,
    });

    expect(response.statusCode).toBe(201);
    expect(service.create).toHaveBeenCalledWith(actorId, runId, input);
    expect(response.json().overlay.name).toBe('Gameplay');
  });

  it('rejects writes without an allowed Origin', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/overlays`,
      payload: {
        name: 'Gameplay',
        layout: createDefaultOverlayLayout(),
      },
    });

    expect(response.statusCode).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects malformed overlay layouts', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/overlays`,
      headers: { origin: allowedOrigin },
      payload: {
        name: 'Gameplay',
        layout: {
          version: 1,
          elements: [],
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('reports duplicate overlay names', async () => {
    const { app, service } = createTestApp();

    service.create.mockRejectedValueOnce(new OverlayNameConflictError());

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/overlays`,
      headers: { origin: allowedOrigin },
      payload: {
        name: 'Gameplay',
        layout: createDefaultOverlayLayout(),
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('OVERLAY_NAME_CONFLICT');
  });

  it('gets an individual overlay', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/overlays/${overlayId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(service.getById).toHaveBeenCalledWith(actorId, runId, overlayId);
  });

  it('does not expose an inaccessible overlay', async () => {
    const { app, service } = createTestApp();

    service.getById.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}/overlays/${overlayId}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it('updates the overlay layout', async () => {
    const { app, service } = createTestApp();

    const layout = createDefaultOverlayLayout();
    layout.elements[0]!.x = 400;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/overlays/${overlayId}`,
      headers: { origin: allowedOrigin },
      payload: { layout },
    });

    expect(response.statusCode).toBe(200);
    expect(service.update).toHaveBeenCalledWith(actorId, runId, overlayId, { layout });
  });

  it('rejects an empty update', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/overlays/${overlayId}`,
      headers: { origin: allowedOrigin },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('rejects duplicate names during updates', async () => {
    const { app, service } = createTestApp();

    service.update.mockRejectedValueOnce(new OverlayNameConflictError());

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/overlays/${overlayId}`,
      headers: { origin: allowedOrigin },
      payload: { name: 'Gameplay' },
    });

    expect(response.statusCode).toBe(409);
  });

  it('deletes an accessible overlay', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/runs/${runId}/overlays/${overlayId}`,
      headers: { origin: allowedOrigin },
    });

    expect(response.statusCode).toBe(204);
    expect(service.remove).toHaveBeenCalledWith(actorId, runId, overlayId);
  });

  it('returns 404 for missing overlays on deletion', async () => {
    const { app, service } = createTestApp();

    service.remove.mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/runs/${runId}/overlays/${overlayId}`,
      headers: { origin: allowedOrigin },
    });

    expect(response.statusCode).toBe(404);
  });
});
