import { describe, expect, it, vi } from 'vitest';

import { buildApp } from './app.js';

const FRONTEND_ORIGIN = 'http://localhost:5173';

function createTestApp() {
  const create = vi.fn();
  const list = vi.fn().mockResolvedValue([]);
  const getById = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();

  const resolveActorId = vi.fn().mockResolvedValue(null);

  const app = buildApp({
    allowedOrigins: [FRONTEND_ORIGIN],

    runs: {
      service: {
        create,
        list,
        getById,
        update,
        remove,
      },
      resolveActorId,
    },
  });

  return {
    app,
    create,
    resolveActorId,
  };
}

describe('Runvista application security', () => {
  it('rejects a write without an Origin header', async () => {
    const { app, create, resolveActorId } = createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/runs',
        payload: {
          title: 'Test Run',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe('INVALID_REQUEST_ORIGIN');

      expect(create).not.toHaveBeenCalled();
      expect(resolveActorId).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects writes from unauthorized origins', async () => {
    const { app, create } = createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: {
          origin: 'https://attacker.example',
        },
        payload: {
          title: 'Test Run',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(create).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('requires authentication even for allowed origins', async () => {
    const { app, create, resolveActorId } = createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: {
          origin: FRONTEND_ORIGIN,
        },
        payload: {
          title: 'Test Run',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(resolveActorId).toHaveBeenCalledOnce();
      expect(create).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('requires authentication for reading runs', async () => {
    const { app } = createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/runs',
      });

      expect(response.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
