import { describe, expect, it, vi } from 'vitest';

import { validateTwitchAccessToken } from './twitch.validate.js';

const config = {
  clientId: 'runvista-test-client',
  clientSecret: 'test-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const baseResponse = {
  client_id: config.clientId,
  user_id: '123456789',
  login: 'teststreamer',
  expires_in: 3600,
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

describe('Twitch validation scopes additional regression', () => {
  it('preserves valid scopes', async () => {
    const scopes = ['user:read:email'];

    const result = await validateTwitchAccessToken(
      config,
      'test-token',
      mockFetch({
        ...baseResponse,
        scopes,
      }),
    );

    expect(result.scopes).toEqual(scopes);
  });

  it.each([
    ['string', 'user:read:email'],
    ['object', { permission: 'read' }],
  ])('rejects an invalid %s scopes field', async (_type, scopes) => {
    await expect(
      validateTwitchAccessToken(
        config,
        'test-token',
        mockFetch({
          ...baseResponse,
          scopes,
        }),
      ),
    ).rejects.toThrow('Invalid Twitch validation response');
  });

  it('rejects a token belonging to another Twitch app', async () => {
    await expect(
      validateTwitchAccessToken(
        config,
        'test-token',
        mockFetch({
          ...baseResponse,
          client_id: 'another-twitch-app',
          scopes: [],
        }),
      ),
    ).rejects.toThrow('Twitch token belongs to another application');
  });
});
