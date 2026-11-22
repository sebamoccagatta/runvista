import { z } from 'zod';

import type { TwitchConfig } from './twitch.config.js';

const TWITCH_VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';

const validationResponseSchema = z.object({
  client_id: z.string().min(1),
  user_id: z.string().min(1),
  login: z.string().min(1),

  // Runvista no solicita permisos adicionales.
  // Normalizamos scopes ausentes o null a [].
  scopes: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? []),

  expires_in: z.number().int().positive(),
});

export interface ValidatedTwitchToken {
  clientId: string;
  userId: string;
  login: string;
  scopes: string[];
  expiresIn: number;
}

export async function validateTwitchAccessToken(
  config: TwitchConfig,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ValidatedTwitchToken> {
  if (!accessToken.trim()) {
    throw new Error('Invalid Twitch access token');
  }

  let response: Response;

  try {
    response = await fetchImpl(TWITCH_VALIDATE_URL, {
      method: 'GET',
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    console.error('[Runvista Twitch] TOKEN_VALIDATION: NETWORK_ERROR');

    throw new Error('Twitch token validation unavailable');
  }

  if (!response.ok) {
    console.error(`[Runvista Twitch] TOKEN_VALIDATION: HTTP_${response.status}`);

    throw new Error('Twitch token validation failed');
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    console.error('[Runvista Twitch] TOKEN_VALIDATION: INVALID_JSON');

    throw new Error('Invalid Twitch validation response');
  }

  const parsed = validationResponseSchema.safeParse(payload);

  if (!parsed.success) {
    // Solo registramos nombres de campos inválidos.
    // Nunca valores de respuesta ni credenciales.
    const invalidFields = parsed.error.issues.map((issue) => issue.path.join('.') || 'response');

    console.error('[Runvista Twitch] TOKEN_VALIDATION: INVALID_SCHEMA', [
      ...new Set(invalidFields),
    ]);

    throw new Error('Invalid Twitch validation response');
  }

  if (parsed.data.client_id !== config.clientId) {
    console.error('[Runvista Twitch] TOKEN_VALIDATION: CLIENT_ID_MISMATCH');

    throw new Error('Twitch token belongs to another application');
  }

  return {
    clientId: parsed.data.client_id,
    userId: parsed.data.user_id,
    login: parsed.data.login,
    scopes: parsed.data.scopes,
    expiresIn: parsed.data.expires_in,
  };
}
