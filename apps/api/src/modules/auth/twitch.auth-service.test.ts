import { describe, expect, it, vi } from 'vitest';

import { TwitchAuthService, type TwitchAuthDependencies } from './twitch.auth-service.js';
import type { TwitchConfig } from './twitch.config.js';

const config: TwitchConfig = {
  clientId: 'runvista-test-client',
  clientSecret: 'private-test-secret',
  redirectUri: 'http://localhost:3211/api/auth/twitch/callback',
};

const tokens = {
  access_token: 'private-test-access-token',
  refresh_token: 'private-test-refresh-token',
  expires_in: 14400,
  scope: [],
  token_type: 'bearer' as const,
};

const validatedToken = {
  clientId: config.clientId,
  userId: '123456789',
  login: 'teststreamer',
  scopes: [],
  expiresIn: 14400,
};

const twitchUser = {
  id: '123456789',
  login: 'teststreamer',
  displayName: 'TestStreamer',
  profileImageUrl: 'https://example.com/avatar.png',
};

function createDependencies() {
  const exchangeCode = vi.fn().mockResolvedValue(tokens);
  const validateToken = vi.fn().mockResolvedValue(validatedToken);
  const getUser = vi.fn().mockResolvedValue(twitchUser);

  const dependencies: TwitchAuthDependencies = {
    exchangeCode,
    validateToken,
    getUser,
  };

  return {
    dependencies,
    exchangeCode,
    validateToken,
    getUser,
  };
}

describe('TwitchAuthService', () => {
  it('authenticates and returns a verified Twitch user', async () => {
    const { dependencies } = createDependencies();

    const service = new TwitchAuthService(config, dependencies);

    const result = await service.authenticate('test-code');

    expect(result).toEqual(twitchUser);
  });

  it('executes authentication operations in order', async () => {
    const { dependencies, exchangeCode, validateToken, getUser } = createDependencies();

    const service = new TwitchAuthService(config, dependencies);

    await service.authenticate('test-code');

    expect(exchangeCode).toHaveBeenCalledWith(config, 'test-code');

    expect(validateToken).toHaveBeenCalledWith(config, tokens.access_token);

    expect(getUser).toHaveBeenCalledWith(config, tokens.access_token);

    expect(exchangeCode.mock.invocationCallOrder[0]!).toBeLessThan(
      validateToken.mock.invocationCallOrder[0]!,
    );

    expect(validateToken.mock.invocationCallOrder[0]!).toBeLessThan(
      getUser.mock.invocationCallOrder[0]!,
    );
  });

  it('rejects mismatched Twitch identities', async () => {
    const { dependencies, getUser } = createDependencies();

    getUser.mockResolvedValue({
      ...twitchUser,
      id: 'different-user-id',
    });

    const service = new TwitchAuthService(config, dependencies);

    await expect(service.authenticate('test-code')).rejects.toThrow('Twitch identity mismatch');
  });

  it('stops when token validation fails', async () => {
    const { dependencies, validateToken, getUser } = createDependencies();

    validateToken.mockRejectedValue(new Error('Twitch token validation failed'));

    const service = new TwitchAuthService(config, dependencies);

    await expect(service.authenticate('test-code')).rejects.toThrow(
      'Twitch token validation failed',
    );

    expect(getUser).not.toHaveBeenCalled();
  });

  it('stops when token exchange fails', async () => {
    const { dependencies, exchangeCode, validateToken, getUser } = createDependencies();

    exchangeCode.mockRejectedValue(new Error('Twitch token exchange failed'));

    const service = new TwitchAuthService(config, dependencies);

    await expect(service.authenticate('invalid-code')).rejects.toThrow(
      'Twitch token exchange failed',
    );

    expect(validateToken).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rejects empty codes without contacting Twitch', async () => {
    const { dependencies, exchangeCode } = createDependencies();

    const service = new TwitchAuthService(config, dependencies);

    await expect(service.authenticate('   ')).rejects.toThrow('Invalid Twitch authorization code');

    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it('does not include OAuth tokens in the result', async () => {
    const { dependencies } = createDependencies();

    const service = new TwitchAuthService(config, dependencies);

    const result = await service.authenticate('test-code');
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(tokens.access_token);
    expect(serialized).not.toContain(tokens.refresh_token);
    expect(serialized).not.toContain(config.clientSecret);
  });
});
