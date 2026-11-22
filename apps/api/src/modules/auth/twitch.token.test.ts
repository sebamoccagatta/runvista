import { describe, expect, it, vi } from 'vitest';

import type { TwitchConfig } from './twitch.config.js';
import { exchangeTwitchAuthorizationCode } from './twitch.token.js';

const config: TwitchConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const validTokens = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 14400,
  scope: [],
  token_type: 'bearer',
};

function mockFetch(body: unknown, status = 200) {
  const request = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );

  return {
    request,
    fetchImpl: request as unknown as typeof fetch,
  };
}

describe('Twitch token exchange', () => {
  it('exchanges an authorization code for tokens', async () => {
    const { fetchImpl } = mockFetch(validTokens);

    const result = await exchangeTwitchAuthorizationCode(config, 'authorization-code', fetchImpl);

    expect(result).toEqual(validTokens);
  });

  it('sends the required authorization code parameters', async () => {
    const { request, fetchImpl } = mockFetch(validTokens);

    await exchangeTwitchAuthorizationCode(config, 'authorization-code', fetchImpl);

    expect(request).toHaveBeenCalledOnce();

    const [url, options] = request.mock.calls[0]!;

    expect(url).toBe('https://id.twitch.tv/oauth2/token');
    expect(options.method).toBe('POST');

    const body = options.body as URLSearchParams;

    expect(body.get('client_id')).toBe(config.clientId);
    expect(body.get('client_secret')).toBe(config.clientSecret);
    expect(body.get('code')).toBe('authorization-code');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('redirect_uri')).toBe(config.redirectUri);
  });

  it('rejects empty authorization codes', async () => {
    const { request, fetchImpl } = mockFetch(validTokens);

    await expect(exchangeTwitchAuthorizationCode(config, '   ', fetchImpl)).rejects.toThrow(
      'Invalid Twitch authorization code',
    );

    expect(request).not.toHaveBeenCalled();
  });

  it('rejects unsuccessful Twitch responses', async () => {
    const { fetchImpl } = mockFetch(
      {
        message: 'Invalid authorization code',
      },
      400,
    );

    await expect(
      exchangeTwitchAuthorizationCode(config, 'invalid-code', fetchImpl),
    ).rejects.toThrow('Twitch token exchange failed');
  });

  it('rejects malformed token responses', async () => {
    const { fetchImpl } = mockFetch({
      access_token: 'test-access-token',
    });

    await expect(
      exchangeTwitchAuthorizationCode(config, 'authorization-code', fetchImpl),
    ).rejects.toThrow('Invalid Twitch token response');
  });

  it('handles network failures without exposing secrets', async () => {
    const request = vi.fn().mockRejectedValue(new Error(`Network error: ${config.clientSecret}`));

    const fetchImpl = request as unknown as typeof fetch;

    await expect(
      exchangeTwitchAuthorizationCode(config, 'authorization-code', fetchImpl),
    ).rejects.toThrow('Twitch token exchange unavailable');
  });
});
