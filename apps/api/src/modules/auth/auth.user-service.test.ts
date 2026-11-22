import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseClient } from '../../db/prisma.js';
import type { TwitchUser } from './twitch.user.js';
import { AuthUserService } from './auth.user-service.js';

const twitchUser: TwitchUser = {
  id: '123456789',
  login: 'teststreamer',
  displayName: 'TestStreamer',
  profileImageUrl: 'https://example.com/avatar.png',
};

const storedUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  twitchId: twitchUser.id,
  displayName: twitchUser.displayName,
};

const upsert = vi.fn();

const prisma = {
  user: {
    upsert,
  },
} as unknown as DatabaseClient;

describe('AuthUserService', () => {
  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue(storedUser);
  });

  it('creates or updates a user using the Twitch ID', async () => {
    const service = new AuthUserService(prisma);

    const result = await service.findOrCreateFromTwitch(twitchUser);

    expect(upsert).toHaveBeenCalledWith({
      where: {
        twitchId: twitchUser.id,
      },
      create: {
        twitchId: twitchUser.id,
        displayName: twitchUser.displayName,
      },
      update: {
        displayName: twitchUser.displayName,
      },
      select: {
        id: true,
        twitchId: true,
        displayName: true,
      },
    });

    expect(result).toEqual(storedUser);
  });

  it('preserves the internal user ID on subsequent logins', async () => {
    const service = new AuthUserService(prisma);

    await service.findOrCreateFromTwitch(twitchUser);

    upsert.mockResolvedValue({
      ...storedUser,
      displayName: 'UpdatedStreamer',
    });

    const result = await service.findOrCreateFromTwitch({
      ...twitchUser,
      displayName: 'UpdatedStreamer',
    });

    expect(result.id).toBe(storedUser.id);
    expect(result.displayName).toBe('UpdatedStreamer');
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('trims incoming identity fields', async () => {
    const service = new AuthUserService(prisma);

    await service.findOrCreateFromTwitch({
      ...twitchUser,
      id: ' 123456789 ',
      displayName: ' TestStreamer ',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          twitchId: '123456789',
        },
        create: {
          twitchId: '123456789',
          displayName: 'TestStreamer',
        },
      }),
    );
  });

  it('rejects an invalid identity without accessing the database', async () => {
    const service = new AuthUserService(prisma);

    await expect(
      service.findOrCreateFromTwitch({
        ...twitchUser,
        id: ' ',
      }),
    ).rejects.toThrow('Invalid Twitch user identity');

    await expect(
      service.findOrCreateFromTwitch({
        ...twitchUser,
        displayName: ' ',
      }),
    ).rejects.toThrow('Invalid Twitch user identity');

    expect(upsert).not.toHaveBeenCalled();
  });

  it('does not expose tokens or unrelated user fields', async () => {
    upsert.mockResolvedValue({
      ...storedUser,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshToken: 'should-not-be-returned',
    });

    const service = new AuthUserService(prisma);

    const result = await service.findOrCreateFromTwitch(twitchUser);

    expect(Object.keys(result).sort()).toEqual(['displayName', 'id', 'twitchId']);

    expect(JSON.stringify(result)).not.toContain('should-not-be-returned');
  });

  it('propagates database failures', async () => {
    upsert.mockRejectedValue(new Error('Database unavailable'));

    const service = new AuthUserService(prisma);

    await expect(service.findOrCreateFromTwitch(twitchUser)).rejects.toThrow(
      'Database unavailable',
    );
  });
});
