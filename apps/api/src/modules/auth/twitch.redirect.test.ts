import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from './auth.session.js';
import { createTwitchAuthRoutes, TWITCH_STATE_COOKIE } from './twitch.routes.js';

const config = {
  clientId: 'runvista-test-client',
  clientSecret: 'private-test-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const frontendUrl = 'http://localhost:5173/app';

describe('Twitch OAuth frontend redirect', () => {
  it('redirects after successful login without exposing the token', async () => {
    const completeTwitchLogin = vi.fn().mockResolvedValue({
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        twitchId: '123456789',
        displayName: 'TestStreamer',
      },
      sessionToken: 'a'.repeat(64),
    });

    const app = Fastify({ logger: false });

    app.register(
      createTwitchAuthRoutes({
        config,
        loginService: { completeTwitchLogin },
        successRedirectUrl: frontendUrl,
      }),
    );

    try {
      await app.ready();

      const login = await app.inject({
        method: 'GET',
        url: '/api/auth/twitch/login',
      });

      const state = new URL(login.headers.location!).searchParams.get('state');

      const cookies = login.headers['set-cookie'];
      const cookieList = Array.isArray(cookies) ? cookies : [cookies ?? ''];

      const stateCookie = cookieList.find((item) => item.startsWith(`${TWITCH_STATE_COOKIE}=`));

      expect(state).toBeTruthy();
      expect(stateCookie).toBeDefined();

      const callback = await app.inject({
        method: 'GET',
        url: `/api/auth/twitch/callback?state=${state}&code=test-code`,
        headers: {
          cookie: stateCookie!.split(';')[0]!,
        },
      });

      expect(callback.statusCode).toBe(302);
      expect(callback.headers.location).toBe(frontendUrl);
      expect(completeTwitchLogin).toHaveBeenCalledWith('test-code');

      const responseCookies = callback.headers['set-cookie'];
      const responseCookieList = Array.isArray(responseCookies)
        ? responseCookies
        : [responseCookies ?? ''];

      const sessionCookie = responseCookieList.find((item) =>
        item.startsWith(`${SESSION_COOKIE_NAME}=`),
      );

      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite=Lax');

      expect(callback.headers.location).not.toContain('a'.repeat(64));
    } finally {
      await app.close();
    }
  });

  it('rejects insecure non-local redirect URLs', () => {
    expect(() =>
      createTwitchAuthRoutes({
        config,
        successRedirectUrl: 'http://example.com/app',
      }),
    ).toThrow('Invalid authentication redirect URL');
  });
});
