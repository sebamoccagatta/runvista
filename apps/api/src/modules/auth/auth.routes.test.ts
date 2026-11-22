import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { createAuthRoutes } from './auth.routes.js';
import { SESSION_COOKIE_NAME } from './auth.session.js';
import { TWITCH_STATE_COOKIE } from './twitch.routes.js';

const FRONTEND_ORIGIN = 'http://localhost:5173';

const twitchConfig = {
  clientId: 'runvista-test-client',
  clientSecret: 'private-test-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  twitchId: '123456789',
  displayName: 'TestStreamer',
};

const sessionToken = 'a'.repeat(64);

async function createTestApp() {
  const completeTwitchLogin = vi.fn().mockResolvedValue({
    user,
    sessionToken,
  });

  const resolveUser = vi.fn().mockResolvedValue(user);
  const revoke = vi.fn().mockResolvedValue(true);

  const app = Fastify({ logger: false });

  app.register(
    createAuthRoutes({
      twitchConfig,
      loginService: { completeTwitchLogin },
      sessions: { resolveUser, revoke },
      allowedOrigins: [FRONTEND_ORIGIN, 'http://localhost:3211'],
    }),
  );

  await app.ready();

  return {
    app,
    completeTwitchLogin,
    resolveUser,
    revoke,
  };
}

function getCookies(response: {
  headers: {
    'set-cookie'?: string | string[];
  };
}): string[] {
  const value = response.headers['set-cookie'];

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function startOAuth(app: Awaited<ReturnType<typeof createTestApp>>['app']) {
  const response = await app.inject({
    method: 'GET',
    url: '/api/auth/twitch/login',
  });

  const state = new URL(response.headers.location!).searchParams.get('state');

  const stateCookie = getCookies(response).find((item) =>
    item.startsWith(`${TWITCH_STATE_COOKIE}=`),
  );

  if (!state || !stateCookie) {
    throw new Error('OAuth initialization failed');
  }

  return {
    state,
    cookie: stateCookie.split(';')[0]!,
  };
}

describe('Runvista unified auth routes', () => {
  it('registers the Twitch login endpoint', async () => {
    const { app } = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/twitch/login',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('https://id.twitch.tv/oauth2/authorize');
    } finally {
      await app.close();
    }
  });

  it('completes OAuth and exposes the session through /me', async () => {
    const { app, resolveUser } = await createTestApp();

    try {
      const { state, cookie } = await startOAuth(app);

      const callback = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&code=test-code`,
        headers: { cookie },
      });

      expect(callback.statusCode).toBe(200);

      const sessionCookie = getCookies(callback).find((item) =>
        item.startsWith(`${SESSION_COOKIE_NAME}=`),
      );

      expect(sessionCookie).toBeDefined();

      const me = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          cookie: sessionCookie!.split(';')[0]!,
        },
      });

      expect(me.statusCode).toBe(200);
      expect(me.json()).toEqual({ user });
      expect(resolveUser).toHaveBeenCalledWith(sessionToken);
    } finally {
      await app.close();
    }
  });

  it('allows logout with a valid Origin', async () => {
    const { app, revoke } = await createTestApp();

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
    } finally {
      await app.close();
    }
  });

  it('rejects logout from an unauthorized Origin', async () => {
    const { app, revoke } = await createTestApp();

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
      expect(revoke).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
