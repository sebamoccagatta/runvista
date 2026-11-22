import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import type { TwitchConfig } from './twitch.config.js';
import { createTwitchAuthRoutes, TWITCH_STATE_COOKIE } from './twitch.routes.js';

const config: TwitchConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

async function createTestApp(overrides: Partial<TwitchConfig> = {}) {
  const app = Fastify({ logger: false });

  app.register(
    createTwitchAuthRoutes({
      config: { ...config, ...overrides },
    }),
  );

  await app.ready();

  return app;
}

async function beginLogin(app: Awaited<ReturnType<typeof createTestApp>>) {
  const response = await app.inject({
    method: 'GET',
    url: '/api/auth/twitch/login',
  });

  const state = new URL(response.headers.location!).searchParams.get('state');

  const cookie = String(response.headers['set-cookie']).split(';')[0];

  if (!state) {
    throw new Error('OAuth state was not generated');
  }

  return { state, cookie };
}

describe('Twitch login route', () => {
  it('redirects to the Twitch authorization endpoint', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/twitch/login',
      });

      expect(response.statusCode).toBe(302);

      const location = response.headers.location;
      expect(location).toBeDefined();

      const url = new URL(location!);

      expect(url.origin).toBe('https://id.twitch.tv');
      expect(url.pathname).toBe('/oauth2/authorize');
      expect(url.searchParams.get('client_id')).toBe(config.clientId);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    } finally {
      await app.close();
    }
  });

  it('stores the OAuth state in a protected cookie', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/twitch/login',
      });

      const url = new URL(response.headers.location!);
      const state = url.searchParams.get('state');

      expect(state).toMatch(/^[a-f0-9]{64}$/);

      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeDefined();

      const cookieHeader = String(setCookie);

      expect(cookieHeader).toContain(`${TWITCH_STATE_COOKIE}=${state}`);
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Lax');
      expect(cookieHeader).toContain('Max-Age=600');
      expect(cookieHeader).not.toContain('Secure');
    } finally {
      await app.close();
    }
  });

  it('generates a new state for each login attempt', async () => {
    const app = await createTestApp();

    try {
      const first = await app.inject({
        method: 'GET',
        url: '/api/auth/twitch/login',
      });

      const second = await app.inject({
        method: 'GET',
        url: '/api/auth/twitch/login',
      });

      const firstState = new URL(first.headers.location!).searchParams.get('state');

      const secondState = new URL(second.headers.location!).searchParams.get('state');

      expect(firstState).not.toBe(secondState);
    } finally {
      await app.close();
    }
  });

  it('uses Secure cookies for HTTPS environments', async () => {
    const app = await createTestApp({
      redirectUri: 'https://runvista.example.com/api/auth/twitch/callback',
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/twitch/login',
      });

      expect(String(response.headers['set-cookie'])).toContain('Secure');
    } finally {
      await app.close();
    }
  });
});

describe('Twitch OAuth callback', () => {
  it('rejects callbacks without an OAuth state cookie', async () => {
    const app = await createTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${'a'.repeat(64)}&code=test-code`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('INVALID_OAUTH_STATE');
    } finally {
      await app.close();
    }
  });

  it('rejects mismatched OAuth states', async () => {
    const app = await createTestApp();

    try {
      const { cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${'b'.repeat(64)}&code=test-code`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('INVALID_OAUTH_STATE');
    } finally {
      await app.close();
    }
  });

  it('rejects callbacks without an authorization code', async () => {
    const app = await createTestApp();

    try {
      const { state, cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('MISSING_AUTHORIZATION_CODE');
    } finally {
      await app.close();
    }
  });

  it('handles denied Twitch authorization', async () => {
    const app = await createTestApp();

    try {
      const { state, cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&error=access_denied`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toBe('TWITCH_AUTHORIZATION_DENIED');
    } finally {
      await app.close();
    }
  });

  it('accepts a valid callback without exposing the code', async () => {
    const app = await createTestApp();

    try {
      const { state, cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&code=private-test-code`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(501);
      expect(response.body).not.toContain('private-test-code');
    } finally {
      await app.close();
    }
  });

  it('clears the state cookie after the callback', async () => {
    const app = await createTestApp();

    try {
      const { state, cookie } = await beginLogin(app);

      const response = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&code=test-code`,
        headers: { cookie },
      });

      expect(String(response.headers['set-cookie'])).toContain(`${TWITCH_STATE_COOKIE}=`);
      expect(String(response.headers['set-cookie'])).toContain('Max-Age=0');
    } finally {
      await app.close();
    }
  });
});
