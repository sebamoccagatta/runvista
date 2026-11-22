import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from './auth.session.js';
import { createAuthSessionRoutes } from './auth.session-routes.js';

const FRONTEND_ORIGIN = 'http://localhost:5173';

const sessionToken = 'a'.repeat(64);

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  twitchId: '123456789',
  displayName: 'TestStreamer',
};

const resolveUser = vi.fn();
const revoke = vi.fn();

async function createTestApp() {
  const app = Fastify({ logger: false });

  app.register(
    createAuthSessionRoutes({
      sessions: { resolveUser, revoke },
      allowedOrigins: [FRONTEND_ORIGIN, 'http://localhost:3211'],
      secureCookies: false,
    }),
  );

  await app.ready();

  return app;
}

describe('Runvista authentication session routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    resolveUser.mockResolvedValue(user);
    revoke.mockResolvedValue(true);
  });

  it('returns the authenticated user from a session cookie', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ user });
      expect(resolveUser).toHaveBeenCalledWith(sessionToken);
      expect(response.headers['cache-control']).toBe('no-store');
    } finally {
      await app.close();
    }
  });

  it('rejects requests without an authenticated session', async () => {
    resolveUser.mockResolvedValue(null);

    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('UNAUTHENTICATED');
      expect(resolveUser).toHaveBeenCalledWith(undefined);
    } finally {
      await app.close();
    }
  });

  it('revokes the session and clears the browser cookie', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          origin: FRONTEND_ORIGIN,
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      expect(response.statusCode).toBe(204);
      expect(revoke).toHaveBeenCalledWith(sessionToken);

      const cookie = String(response.headers['set-cookie']);

      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    } finally {
      await app.close();
    }
  });

  it('allows logout without an existing session', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          origin: FRONTEND_ORIGIN,
        },
      });

      expect(response.statusCode).toBe(204);
      expect(revoke).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects logout from an unauthorized origin', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          origin: 'https://attacker.example',
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe('INVALID_REQUEST_ORIGIN');
      expect(revoke).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects logout without an Origin header', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(revoke).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('does not claim successful logout when PostgreSQL fails', async () => {
    revoke.mockRejectedValue(new Error('Sensitive database error'));

    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          origin: FRONTEND_ORIGIN,
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json().error).toBe('SESSION_UNAVAILABLE');

      expect(response.body).not.toContain('Sensitive database error');
    } finally {
      await app.close();
    }
  });
});
