import { z } from 'zod';

import type { TwitchConfig } from './twitch.config.js';

const TWITCH_USERS_URL = 'https://api.twitch.tv/helix/users';

const twitchUserSchema = z.object({
  id: z.string().min(1),
  login: z.string().min(1),
  display_name: z.string().min(1),
  profile_image_url: z.string(),
});

const twitchUsersResponseSchema = z.object({
  data: z.array(twitchUserSchema),
});

export interface TwitchUser {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string;
}

export async function getAuthenticatedTwitchUser(
  config: TwitchConfig,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TwitchUser> {
  if (!accessToken.trim()) {
    throw new Error('Invalid Twitch access token');
  }

  let response: Response;

  try {
    response = await fetchImpl(TWITCH_USERS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': config.clientId,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('Twitch user lookup unavailable');
  }

  if (!response.ok) {
    throw new Error('Twitch user lookup failed');
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error('Invalid Twitch user response');
  }

  const parsed = twitchUsersResponseSchema.safeParse(payload);

  if (!parsed.success || parsed.data.data.length !== 1) {
    throw new Error('Invalid Twitch user response');
  }

  const user = parsed.data.data[0]!;

  return {
    id: user.id,
    login: user.login,
    displayName: user.display_name,
    profileImageUrl: user.profile_image_url,
  };
}
