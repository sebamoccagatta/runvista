import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AuthLoginService } from './auth.login-service.js';
import { SESSION_COOKIE_NAME } from './auth.session.js';
import type { TwitchConfig } from './twitch.config.js';
import { createTwitchAuthRoutes, TWITCH_STATE_COOKIE } from './twitch.routes.js';

const config: TwitchConfig = {
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

function getSetCookies(response: { headers: { 'set-cookie'?: string | string[] } }): string[] {
  const value = response.headers['set-cookie'];

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function createTestApp() {
  const completeTwitchLogin = vi.fn().mockResolvedValue({
    user,
    sessionToken,
  });

  const loginService = {
    completeTwitchLogin,
  } as unknown as Pick<AuthLoginService, 'completeTwitchLogin'>;

  const app = Fastify({ logger: false });

  app.register(
    createTwitchAuthRoutes({
      config,
      loginService,
    }),
  );

  await app.ready();

  return { app, completeTwitchLogin };
}

async function beginLogin(app: Awaited<ReturnType<typeof createTestApp>>['app']) {
  const response = await app.inject({
    method: 'GET',
    url: '/api/auth/twitch/login',
  });

  const state = new URL(response.headers.location!).searchParams.get('state');

  const stateCookie = getSetCookies(response).find((value) =>
    value.startsWith(`${TWITCH_STATE_COOKIE}=`),
  );

  if (!state || !stateCookie) {
    throw new Error('OAuth state was not created');
  }

  return {
    state,
    cookie: stateCookie.split(';')[0]!,
  };
}

describe('Twitch OAuth completed callback', () => {
  it('creates a session and returns the authenticated user', async () => {
    const { app, completeTwitchLogin } = await createTestApp();

    try {
      const { state, cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&code=valid-code`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ user });

      expect(completeTwitchLogin).toHaveBeenCalledExactlyOnceWith('valid-code');
    } finally {
      await app.close();
    }
  });

  it('sets the session in an HttpOnly cookie', async () => {
    const { app } = await createTestApp();

    try {
      const { state, cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&code=valid-code`,
        headers: { cookie },
      });

      const sessionCookie = getSetCookies(response).find((value) =>
        value.startsWith(`${SESSION_COOKIE_NAME}=`),
      );

      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Lax');
      expect(sessionCookie).toContain('Path=/');
      expect(sessionCookie).toContain('Max-Age=604800');
      expect(response.body).not.toContain(sessionToken);
    } finally {
      await app.close();
    }
  });

  it('rejects a replayed callback', async () => {
    const { app, completeTwitchLogin } = await createTestApp();

    try {
      const { state, cookie } = await beginLogin(app);

      const request = {
        method: 'GET' as const,
        url: `/api/auth/twitch/callback?state=${state}&code=valid-code`,
        headers: { cookie },
      };

      const first = await app.inject(request);
      const second = await app.inject(request);

      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(400);
      expect(second.json().error).toBe('INVALID_OAUTH_STATE');
      expect(completeTwitchLogin).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it('does not authenticate when the OAuth state is invalid', async () => {
    const { app, completeTwitchLogin } = await createTestApp();

    try {
      const { cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${'b'.repeat(64)}&code=valid-code`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(400);
      expect(completeTwitchLogin).not.toHaveBeenCalled();

      expect(
        getSetCookies(response).some((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`)),
      ).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('does not create a session cookie when authentication fails', async () => {
    const { app, completeTwitchLogin } = await createTestApp();

    completeTwitchLogin.mockRejectedValue(new Error('Sensitive internal database error'));

    try {
      const { state, cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&code=invalid-code`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json().error).toBe('AUTHENTICATION_FAILED');

      expect(response.body).not.toContain('Sensitive internal database error');

      expect(
        getSetCookies(response).some((value) => value.startsWith(`${SESSION_COOKIE_NAME}=`)),
      ).toBe(false);
    } finally {
      await app.close();
    }
  });
});
