import { describe, expect, it, vi } from 'vitest';

import { exchangeTwitchAuthorizationCode } from './twitch.token.js';

const config = {
  clientId: 'runvista-test-client',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const baseResponse = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
};

function mockFetch(payload: unknown): typeof fetch {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  ) as typeof fetch;
}

describe('Twitch token exchange scopes regression', () => {
  it('accepts a response without scope', async () => {
    const result = await exchangeTwitchAuthorizationCode(
      config,
      'test-code',
      mockFetch(baseResponse),
    );

    expect(result.scope).toEqual([]);
  });

  it('accepts a null scope', async () => {
    const result = await exchangeTwitchAuthorizationCode(
      config,
      'test-code',
      mockFetch({
        ...baseResponse,
        scope: null,
      }),
    );

    expect(result.scope).toEqual([]);
  });

  it('accepts an empty scope array', async () => {
    const result = await exchangeTwitchAuthorizationCode(
      config,
      'test-code',
      mockFetch({
        ...baseResponse,
        scope: [],
      }),
    );

    expect(result.scope).toEqual([]);
  });

  it('preserves valid scopes', async () => {
    const scopes = ['user:read:email'];

    const result = await exchangeTwitchAuthorizationCode(
      config,
      'test-code',
      mockFetch({
        ...baseResponse,
        scope: scopes,
      }),
    );

    expect(result.scope).toEqual(scopes);
  });

  it.each([
    ['string', 'user:read:email'],
    ['number', 123],
    ['object', { permission: 'read' }],
  ])('rejects an invalid %s scope', async (_type, scope) => {
    await expect(
      exchangeTwitchAuthorizationCode(
        config,
        'test-code',
        mockFetch({
          ...baseResponse,
          scope,
        }),
      ),
    ).rejects.toThrow('Invalid Twitch token response');
  });
});
