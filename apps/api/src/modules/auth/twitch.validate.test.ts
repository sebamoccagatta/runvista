import { describe, expect, it, vi } from 'vitest';

import type { TwitchConfig } from './twitch.config.js';
import { validateTwitchAccessToken } from './twitch.validate.js';

const config: TwitchConfig = {
  clientId: 'runvista-test-client',
  clientSecret: 'private-test-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const accessToken = 'private-access-token';

const validResponse = {
  client_id: config.clientId,
  user_id: '123456789',
  login: 'teststreamer',
  scopes: [],
  expires_in: 14400,
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

describe('Twitch token validation', () => {
  it('validates a token belonging to Runvista', async () => {
    const { fetchImpl } = mockFetch(validResponse);

    const result = await validateTwitchAccessToken(config, accessToken, fetchImpl);

    expect(result).toEqual({
      clientId: config.clientId,
      userId: '123456789',
      login: 'teststreamer',
      scopes: [],
      expiresIn: 14400,
    });
  });

  it('sends the token to Twitch validation endpoint', async () => {
    const { request, fetchImpl } = mockFetch(validResponse);

    await validateTwitchAccessToken(config, accessToken, fetchImpl);

    expect(request).toHaveBeenCalledOnce();

    const [url, options] = request.mock.calls[0]!;

    expect(url).toBe('https://id.twitch.tv/oauth2/validate');
    expect(options.method).toBe('GET');
    expect(options.headers).toEqual({
      Authorization: `OAuth ${accessToken}`,
    });
  });

  it('rejects tokens issued to another application', async () => {
    const { fetchImpl } = mockFetch({
      ...validResponse,
      client_id: 'another-application',
    });

    await expect(validateTwitchAccessToken(config, accessToken, fetchImpl)).rejects.toThrow(
      'Twitch token belongs to another application',
    );
  });

  it('rejects invalid or expired tokens', async () => {
    const { fetchImpl } = mockFetch({ status: 401, message: 'invalid access token' }, 401);

    await expect(validateTwitchAccessToken(config, accessToken, fetchImpl)).rejects.toThrow(
      'Twitch token validation failed',
    );
  });

  it('rejects tokens without a user identity', async () => {
    const { fetchImpl } = mockFetch({
      ...validResponse,
      user_id: null,
    });

    await expect(validateTwitchAccessToken(config, accessToken, fetchImpl)).rejects.toThrow(
      'Invalid Twitch validation response',
    );
  });

  it('handles network errors without exposing tokens', async () => {
    const request = vi.fn().mockRejectedValue(new Error(`Network error: ${accessToken}`));

    const fetchImpl = request as unknown as typeof fetch;

    await expect(validateTwitchAccessToken(config, accessToken, fetchImpl)).rejects.toThrow(
      'Twitch token validation unavailable',
    );
  });
});
