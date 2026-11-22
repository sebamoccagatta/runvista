import { z } from 'zod';

import type { TwitchConfig } from './twitch.config.js';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),

  // El login de Runvista no solicita scopes adicionales.
  // Normalizamos un campo ausente o null a [].
  scope: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? []),

  token_type: z.literal('bearer'),
});

export type TwitchTokens = z.infer<typeof tokenResponseSchema>;

export async function exchangeTwitchAuthorizationCode(
  config: TwitchConfig,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TwitchTokens> {
  if (!code.trim()) {
    throw new Error('Invalid Twitch authorization code');
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  });

  let response: Response;

  try {
    response = await fetchImpl(TWITCH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error('[Runvista Twitch] TOKEN_EXCHANGE: NETWORK_ERROR');

    throw new Error('Twitch token exchange unavailable');
  }

  if (!response.ok) {
    console.error(`[Runvista Twitch] TOKEN_EXCHANGE: HTTP_${response.status}`);

    throw new Error('Twitch token exchange failed');
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    console.error('[Runvista Twitch] TOKEN_EXCHANGE: INVALID_JSON');

    throw new Error('Invalid Twitch token response');
  }

  const parsed = tokenResponseSchema.safeParse(payload);

  if (!parsed.success) {
    const invalidFields = parsed.error.issues.map((issue) => issue.path.join('.') || 'response');

    console.error('[Runvista Twitch] TOKEN_EXCHANGE: INVALID_SCHEMA', [...new Set(invalidFields)]);

    throw new Error('Invalid Twitch token response');
  }

  return parsed.data;
}
