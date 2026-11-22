import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseClient } from '../../db/prisma.js';
import { hashSessionToken, isValidSessionToken } from './auth.session.js';
import { AuthSessionService } from './auth.session-service.js';

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  displayName: 'TestStreamer',
  twitchId: '123456789',
};

const create = vi.fn();
const findFirst = vi.fn();
const updateMany = vi.fn();

const prisma = {
  session: {
    create,
    findFirst,
    updateMany,
  },
} as unknown as DatabaseClient;

describe('AuthSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    create.mockResolvedValue({});
    findFirst.mockResolvedValue({ user });
    updateMany.mockResolvedValue({ count: 1 });
  });

  it('creates a persistent session using a token hash', async () => {
    const service = new AuthSessionService(prisma);

    const token = await service.create(user.id);

    expect(isValidSessionToken(token)).toBe(true);
    expect(create).toHaveBeenCalledOnce();

    const call = create.mock.calls[0]![0];

    expect(call.data.userId).toBe(user.id);
    expect(call.data.tokenHash).toBe(hashSessionToken(token));
    expect(call.data.tokenHash).not.toBe(token);
    expect(call.data.expiresAt).toBeInstanceOf(Date);
  });

  it('resolves the authenticated user using the token hash', async () => {
    const service = new AuthSessionService(prisma);

    const token = await service.create(user.id);
    const resolved = await service.resolveUser(token);

    expect(resolved).toEqual(user);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            twitchId: true,
          },
        },
      },
    });
  });

  it('rejects malformed tokens without querying PostgreSQL', async () => {
    const service = new AuthSessionService(prisma);

    const resolved = await service.resolveUser('invalid');

    expect(resolved).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns null when the session is missing or inactive', async () => {
    findFirst.mockResolvedValue(null);

    const service = new AuthSessionService(prisma);

    const token = await service.create(user.id);
    const resolved = await service.resolveUser(token);

    expect(resolved).toBeNull();
  });

  it('revokes a session using its token hash', async () => {
    const service = new AuthSessionService(prisma);

    const token = await service.create(user.id);

    const revoked = await service.revoke(token);

    expect(revoked).toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it('does not revoke malformed tokens', async () => {
    const service = new AuthSessionService(prisma);

    expect(await service.revoke(null)).toBe(false);
    expect(await service.revoke('invalid')).toBe(false);

    expect(updateMany).not.toHaveBeenCalled();
  });

  it('handles an already revoked session', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const service = new AuthSessionService(prisma);

    const token = await service.create(user.id);

    expect(await service.revoke(token)).toBe(false);
  });

  it('does not return a token when persistence fails', async () => {
    create.mockRejectedValue(new Error('Database unavailable'));

    const service = new AuthSessionService(prisma);

    await expect(service.create(user.id)).rejects.toThrow('Database unavailable');
  });
});
