import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const allowedOrigin = 'http://localhost:5173';

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp(
  overrides: { authenticated?: boolean; service?: Record<string, unknown> } = {},
) {
  const service = {
    getBadges: vi.fn().mockResolvedValue({
      found: true,
      configured: true,
      gameId: 'red',
      levelCapIncrease: 10,
      badges: [],
    }),
    setBadge: vi.fn().mockResolvedValue({
      status: 'OK',
      obtained: true,
      obtainedAt: new Date('2026-11-28T12:00:00.000Z'),
    }),
    ...overrides.service,
  };

  const app = buildApp({
    allowedOrigins: [allowedOrigin],
    runBadges: {
      service,
      resolveActorId: () => (overrides.authenticated === false ? null : actorId),
    },
  });

  apps.push(app);

  return { app, service };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('Run badge routes', () => {
  it('requires authentication', async () => {
    const { app, service } = createTestApp({ authenticated: false });

    const response = await app.inject({ method: 'GET', url: `/api/runs/${runId}/badges` });

    expect(response.statusCode).toBe(401);
    expect(service.getBadges).not.toHaveBeenCalled();
  });

  it('returns 404 for a run the actor does not own', async () => {
    const { app } = createTestApp({
      service: { getBadges: vi.fn().mockResolvedValue({ found: false }) },
    });

    const response = await app.inject({ method: 'GET', url: `/api/runs/${runId}/badges` });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'RUN_NOT_FOUND' });
  });

  it('returns an empty list for a run without configuration', async () => {
    const { app } = createTestApp({
      service: { getBadges: vi.fn().mockResolvedValue({ found: true, configured: false }) },
    });

    const response = await app.inject({ method: 'GET', url: `/api/runs/${runId}/badges` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ configured: false, badges: [] });
  });

  it('returns the badges with the level increase of the run', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({ method: 'GET', url: `/api/runs/${runId}/badges` });

    expect(response.statusCode).toBe(200);
    expect(service.getBadges).toHaveBeenCalledWith(actorId, runId);
    expect(response.json()).toMatchObject({
      configured: true,
      gameId: 'red',
      levelCapIncrease: 10,
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('marks a badge as obtained from a valid request', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/badges/kanto-boulder`,
      headers: { origin: allowedOrigin },
      payload: { obtained: true },
    });

    expect(response.statusCode).toBe(200);
    expect(service.setBadge).toHaveBeenCalledWith(actorId, runId, 'kanto-boulder', true);
    expect(response.json()).toMatchObject({ key: 'kanto-boulder', obtained: true });
  });

  it.each([
    ['RUN_NOT_FOUND', 404],
    ['CONFIGURATION_REQUIRED', 409],
    ['BADGE_NOT_AVAILABLE', 422],
  ])('maps the %s result to HTTP %i', async (status, code) => {
    const { app } = createTestApp({
      service: { setBadge: vi.fn().mockResolvedValue({ status }) },
    });

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/badges/kanto-boulder`,
      headers: { origin: allowedOrigin },
      payload: { obtained: true },
    });

    expect(response.statusCode).toBe(code);
    expect(response.json()).toEqual({ error: status });
  });

  it('rejects a body without the obtained flag', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/badges/kanto-boulder`,
      headers: { origin: allowedOrigin },
      payload: { obtained: 'yes' },
    });

    expect(response.statusCode).toBe(400);
    expect(service.setBadge).not.toHaveBeenCalled();
  });

  it('rejects extra fields in the body', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/badges/kanto-boulder`,
      headers: { origin: allowedOrigin },
      payload: { obtained: true, levelCap: 99 },
    });

    expect(response.statusCode).toBe(400);
    expect(service.setBadge).not.toHaveBeenCalled();
  });

  it('rejects a write from an origin that is not allowed', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/runs/${runId}/badges/kanto-boulder`,
      headers: { origin: 'https://evil.example' },
      payload: { obtained: true },
    });

    expect(response.statusCode).toBe(403);
    expect(service.setBadge).not.toHaveBeenCalled();
  });
});
