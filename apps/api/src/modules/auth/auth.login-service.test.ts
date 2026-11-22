import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthLoginService } from './auth.login-service.js';

const twitchUser = {
  id: '123456789',
  login: 'teststreamer',
  displayName: 'TestStreamer',
  profileImageUrl: 'https://example.com/avatar.png',
};

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  twitchId: twitchUser.id,
  displayName: twitchUser.displayName,
};

const sessionToken = 'a'.repeat(64);

const authenticate = vi.fn();
const findOrCreateFromTwitch = vi.fn();
const create = vi.fn();

function createService(): AuthLoginService {
  return new AuthLoginService({ authenticate }, { findOrCreateFromTwitch }, { create });
}

describe('AuthLoginService', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    authenticate.mockResolvedValue(twitchUser);
    findOrCreateFromTwitch.mockResolvedValue(user);
    create.mockResolvedValue(sessionToken);
  });

  it('completes a login with a persistent session', async () => {
    const result = await createService().completeTwitchLogin('authorization-code');

    expect(result).toEqual({
      user,
      sessionToken,
    });

    expect(authenticate).toHaveBeenCalledWith('authorization-code');
    expect(findOrCreateFromTwitch).toHaveBeenCalledWith(twitchUser);
    expect(create).toHaveBeenCalledWith(user.id);
  });

  it('executes the operations in the correct order', async () => {
    await createService().completeTwitchLogin('authorization-code');

    expect(authenticate.mock.invocationCallOrder[0]!).toBeLessThan(
      findOrCreateFromTwitch.mock.invocationCallOrder[0]!,
    );

    expect(findOrCreateFromTwitch.mock.invocationCallOrder[0]!).toBeLessThan(
      create.mock.invocationCallOrder[0]!,
    );
  });

  it('rejects an empty code before invoking services', async () => {
    await expect(createService().completeTwitchLogin('   ')).rejects.toThrow(
      'Invalid Twitch authorization code',
    );

    expect(authenticate).not.toHaveBeenCalled();
    expect(findOrCreateFromTwitch).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('does not create a user or session when Twitch fails', async () => {
    authenticate.mockRejectedValue(new Error('Twitch token validation failed'));

    await expect(createService().completeTwitchLogin('invalid-authorization-code')).rejects.toThrow(
      'Twitch token validation failed',
    );

    expect(findOrCreateFromTwitch).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('does not create a session when user persistence fails', async () => {
    findOrCreateFromTwitch.mockRejectedValue(new Error('Database unavailable'));

    await expect(createService().completeTwitchLogin('authorization-code')).rejects.toThrow(
      'Database unavailable',
    );

    expect(create).not.toHaveBeenCalled();
  });

  it('propagates session persistence failures', async () => {
    create.mockRejectedValue(new Error('Unable to create session'));

    await expect(createService().completeTwitchLogin('authorization-code')).rejects.toThrow(
      'Unable to create session',
    );

    expect(authenticate).toHaveBeenCalledOnce();
    expect(findOrCreateFromTwitch).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
  });
});
