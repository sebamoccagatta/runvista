import { describe, expect, it } from 'vitest';

import { parseTwitchConfig, type TwitchConfig } from './twitch.config.js';

import { buildTwitchAuthorizationUrl, generateOAuthState } from './twitch.oauth.js';

const config: TwitchConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

describe('Twitch configuration', () => {
  it('accepts valid local configuration', () => {
    const result = parseTwitchConfig({
      TWITCH_CLIENT_ID: config.clientId,
      TWITCH_CLIENT_SECRET: config.clientSecret,
      TWITCH_REDIRECT_URI: config.redirectUri,
    });

    expect(result).toEqual(config);
  });

  it('rejects missing credentials', () => {
    expect(() =>
      parseTwitchConfig({
        TWITCH_CLIENT_ID: '',
        TWITCH_REDIRECT_URI: config.redirectUri,
      }),
    ).toThrow('Invalid Twitch configuration');
  });

  it('rejects insecure non-local redirects', () => {
    expect(() =>
      parseTwitchConfig({
        TWITCH_CLIENT_ID: config.clientId,
        TWITCH_CLIENT_SECRET: config.clientSecret,
        TWITCH_REDIRECT_URI: 'http://example.com/auth/callback',
      }),
    ).toThrow('Invalid Twitch configuration');
  });

  it('accepts HTTPS redirects', () => {
    const result = parseTwitchConfig({
      TWITCH_CLIENT_ID: config.clientId,
      TWITCH_CLIENT_SECRET: config.clientSecret,
      TWITCH_REDIRECT_URI: 'https://runvista.example.com/auth/callback',
    });

    expect(result.redirectUri).toBe('https://runvista.example.com/auth/callback');
  });
});

describe('Twitch OAuth', () => {
  it('generates unique cryptographic states', () => {
    const first = generateOAuthState();
    const second = generateOAuthState();

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
  });

  it('builds a correct authorization URL', () => {
    const state = generateOAuthState();

    const url = new URL(buildTwitchAuthorizationUrl(config, state));

    expect(url.origin).toBe('https://id.twitch.tv');
    expect(url.pathname).toBe('/oauth2/authorize');

    expect(url.searchParams.get('response_type')).toBe('code');

    expect(url.searchParams.get('client_id')).toBe(config.clientId);

    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);

    expect(url.searchParams.get('state')).toBe(state);
  });

  it('does not expose the client secret', () => {
    const url = buildTwitchAuthorizationUrl(config, generateOAuthState());

    expect(url).not.toContain(config.clientSecret);
  });

  it('does not request unnecessary scopes', () => {
    const url = new URL(buildTwitchAuthorizationUrl(config, generateOAuthState()));

    expect(url.searchParams.has('scope')).toBe(false);
  });

  it('rejects invalid OAuth states', () => {
    expect(() => buildTwitchAuthorizationUrl(config, 'invalid')).toThrow('Invalid OAuth state');
  });
});
