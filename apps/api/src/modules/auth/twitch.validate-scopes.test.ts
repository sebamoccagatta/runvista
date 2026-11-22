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

describe('Twitch validation without extra scopes', () => {
  it('accepts missing scopes', async () => {
    const result = await validateTwitchAccessToken(config, 'test-token', mockFetch(baseResponse));

    expect(result.scopes).toEqual([]);
    expect(result.userId).toBe('123456789');
  });

  it('accepts null scopes', async () => {
    const result = await validateTwitchAccessToken(
      config,
      'test-token',
      mockFetch({
        ...baseResponse,
        scopes: null,
      }),
    );

    expect(result.scopes).toEqual([]);
  });

  it('accepts an empty scopes array', async () => {
    const result = await validateTwitchAccessToken(
      config,
      'test-token',
      mockFetch({
        ...baseResponse,
        scopes: [],
      }),
    );

    expect(result.scopes).toEqual([]);
  });

  it('rejects an invalid scopes type', async () => {
    await expect(
      validateTwitchAccessToken(
        config,
        'test-token',
        mockFetch({
          ...baseResponse,
          scopes: 123,
        }),
      ),
    ).rejects.toThrow('Invalid Twitch validation response');
  });
});
