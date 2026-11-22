import { randomBytes } from 'node:crypto';

import type { TwitchConfig } from './twitch.config.js';

const TWITCH_AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';

export function generateOAuthState(): string {
  return randomBytes(32).toString('hex');
}

export function buildTwitchAuthorizationUrl(config: TwitchConfig, state: string): string {
  if (!/^[a-f0-9]{64}$/.test(state)) {
    throw new Error('Invalid OAuth state');
  }

  const url = new URL(TWITCH_AUTHORIZE_URL);

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);

  // No solicitamos scopes adicionales para el login básico.
  return url.toString();
}
