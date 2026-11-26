import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';
import { overlayEventBus } from './overlay-events.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const overlayId = '770e8400-e29b-41d4-a716-446655440000';
const otherRunId = '880e8400-e29b-41d4-a716-446655440000';

const origin = 'http://localhost:5173';

const apps: ReturnType<typeof buildApp>[] = [];
const subscriptions: (() => void)[] = [];

function subscribe(run: string) {
  const listener = vi.fn();

  subscriptions.push(overlayEventBus.subscribe(run, listener));

  return listener;
}

function createTestApp(authenticated = true) {
  const runs = {
    create: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn().mockResolvedValue(true),
  };

  const overlays = {
    create: vi.fn(),
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn().mockResolvedValue(true),
  };

  const resolveActorId = () => (authenticated ? actorId : null);

  const app = buildApp({
    allowedOrigins: [origin],

    runs: {
      service: runs,
      resolveActorId,
    },

    runOverlays: {
      service: overlays,
      resolveActorId,
    },
  });

  apps.push(app);

  return {
    app,
    runs,
    overlays,
  };
}

afterEach(async () => {
  for (const unsubscribe of subscriptions.splice(0)) {
    unsubscribe();
  }

  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('Overlay deletion notifications', () => {
  const overlayPath = `/api/runs/${runId}/overlays/${overlayId}`;

  it('notifies subscribers after deleting an overlay', async () => {
    const { app, overlays } = createTestApp();
    const listener = subscribe(runId);

    const response = await app.inject({
      method: 'DELETE',
      url: overlayPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(204);

    expect(overlays.remove).toHaveBeenCalledWith(actorId, runId, overlayId);

    expect(listener).toHaveBeenCalledOnce();

    expect(listener).toHaveBeenCalledWith({
      type: 'access-revoked',
      overlayId,
    });
  });

  it('does not notify other runs when deleting an overlay', async () => {
    const { app } = createTestApp();

    const listener = subscribe(runId);
    const otherListener = subscribe(otherRunId);

    const response = await app.inject({
      method: 'DELETE',
      url: overlayPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(204);
    expect(listener).toHaveBeenCalledOnce();
    expect(otherListener).not.toHaveBeenCalled();
  });

  it('does not emit an event when overlay deletion fails', async () => {
    const { app, overlays } = createTestApp();
    const listener = subscribe(runId);

    overlays.remove.mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'DELETE',
      url: overlayPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(404);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not emit an event after an unauthorized overlay deletion', async () => {
    const { app, overlays } = createTestApp(false);
    const listener = subscribe(runId);

    const response = await app.inject({
      method: 'DELETE',
      url: overlayPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(401);
    expect(overlays.remove).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not emit an event after a database error', async () => {
    const { app, overlays } = createTestApp();
    const listener = subscribe(runId);

    overlays.remove.mockRejectedValueOnce(new Error('Database unavailable'));

    const response = await app.inject({
      method: 'DELETE',
      url: overlayPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(500);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Run deletion notifications', () => {
  const runPath = `/api/runs/${runId}`;

  it('notifies all subscribers when their run is deleted', async () => {
    const { app, runs } = createTestApp();

    const first = subscribe(runId);
    const second = subscribe(runId);

    const response = await app.inject({
      method: 'DELETE',
      url: runPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(204);

    expect(runs.remove).toHaveBeenCalledWith(actorId, runId);

    const expectedEvent = {
      type: 'run-deleted',
      runId,
    };

    expect(first).toHaveBeenCalledWith(expectedEvent);
    expect(second).toHaveBeenCalledWith(expectedEvent);

    expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
  });

  it('does not notify subscribers from other runs', async () => {
    const { app } = createTestApp();

    const listener = subscribe(runId);
    const otherListener = subscribe(otherRunId);

    const response = await app.inject({
      method: 'DELETE',
      url: runPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(204);
    expect(listener).toHaveBeenCalledOnce();
    expect(otherListener).not.toHaveBeenCalled();

    expect(overlayEventBus.getSubscriberCount(otherRunId)).toBe(1);
  });

  it('does not emit an event when run deletion fails', async () => {
    const { app, runs } = createTestApp();
    const listener = subscribe(runId);

    runs.remove.mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'DELETE',
      url: runPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(404);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not emit an event after an unauthorized run deletion', async () => {
    const { app, runs } = createTestApp(false);
    const listener = subscribe(runId);

    const response = await app.inject({
      method: 'DELETE',
      url: runPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(401);
    expect(runs.remove).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not emit an event when the database rejects deletion', async () => {
    const { app, runs } = createTestApp();
    const listener = subscribe(runId);

    runs.remove.mockRejectedValueOnce(new Error('Database unavailable'));

    const response = await app.inject({
      method: 'DELETE',
      url: runPath,
      headers: { origin },
    });

    expect(response.statusCode).toBe(500);
    expect(listener).not.toHaveBeenCalled();
  });
});
