import { describe, expect, it, vi } from 'vitest';

import type { TwitchConfig } from './twitch.config.js';
import { getAuthenticatedTwitchUser } from './twitch.user.js';

const config: TwitchConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const accessToken = 'private-test-access-token';

const validResponse = {
  data: [
    {
      id: '123456789',
      login: 'teststreamer',
      display_name: 'TestStreamer',
      profile_image_url: 'https://example.com/avatar.png',
    },
  ],
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

describe('Twitch authenticated user', () => {
  it('retrieves the authenticated user profile', async () => {
    const { fetchImpl } = mockFetch(validResponse);

    const user = await getAuthenticatedTwitchUser(config, accessToken, fetchImpl);

    expect(user).toEqual({
      id: '123456789',
      login: 'teststreamer',
      displayName: 'TestStreamer',
      profileImageUrl: 'https://example.com/avatar.png',
    });
  });

  it('sends the token and client ID to Twitch', async () => {
    const { request, fetchImpl } = mockFetch(validResponse);

    await getAuthenticatedTwitchUser(config, accessToken, fetchImpl);

    expect(request).toHaveBeenCalledOnce();

    const [url, options] = request.mock.calls[0]!;

    expect(url).toBe('https://api.twitch.tv/helix/users');
    expect(options.method).toBe('GET');
    expect(options.headers).toEqual({
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': config.clientId,
    });
  });

  it('rejects an empty access token', async () => {
    const { request, fetchImpl } = mockFetch(validResponse);

    await expect(getAuthenticatedTwitchUser(config, '   ', fetchImpl)).rejects.toThrow(
      'Invalid Twitch access token',
    );

    expect(request).not.toHaveBeenCalled();
  });

  it('rejects unsuccessful Twitch responses', async () => {
    const { fetchImpl } = mockFetch({ message: 'Unauthorized' }, 401);

    await expect(getAuthenticatedTwitchUser(config, accessToken, fetchImpl)).rejects.toThrow(
      'Twitch user lookup failed',
    );
  });

  it('rejects an empty user response', async () => {
    const { fetchImpl } = mockFetch({ data: [] });

    await expect(getAuthenticatedTwitchUser(config, accessToken, fetchImpl)).rejects.toThrow(
      'Invalid Twitch user response',
    );
  });

  it('handles network failures without exposing tokens', async () => {
    const request = vi.fn().mockRejectedValue(new Error(`Network error: ${accessToken}`));

    const fetchImpl = request as unknown as typeof fetch;

    try {
      await getAuthenticatedTwitchUser(config, accessToken, fetchImpl);

      throw new Error('Expected request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Twitch user lookup unavailable');
      expect((error as Error).message).not.toContain(accessToken);
    }
  });
});
