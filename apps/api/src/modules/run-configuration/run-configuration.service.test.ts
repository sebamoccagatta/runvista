import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { RunConfigurationService } from './run-configuration.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';

const configuration = {
  runId,
  gameId: 'y',
  challengeType: 'RANDOMLOCKE' as const,
  createdAt: new Date('2026-11-22T12:00:00.000Z'),
  updatedAt: new Date('2026-11-22T12:00:00.000Z'),
};

function createMockDatabase() {
  const findRun = vi.fn().mockResolvedValue({
    id: runId,
  });

  const findConfiguration = vi.fn().mockResolvedValue(configuration);

  const upsertConfiguration = vi.fn().mockResolvedValue(configuration);

  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      run: {
        findFirst: findRun,
      },
      runConfiguration: {
        upsert: upsertConfiguration,
      },
    }),
  );

  const prisma = {
    run: {
      findFirst: findRun,
    },
    runConfiguration: {
      findUnique: findConfiguration,
    },
    $transaction: transaction,
  } as unknown as PrismaClient;

  return {
    service: new RunConfigurationService(prisma),
    findRun,
    findConfiguration,
    upsertConfiguration,
    transaction,
  };
}

describe('RunConfigurationService', () => {
  describe('getByRunId', () => {
    it('returns the configuration for an owned run', async () => {
      const db = createMockDatabase();

      const result = await db.service.getByRunId(actorId, runId);

      expect(db.findRun).toHaveBeenCalledWith({
        where: {
          id: runId,
          ownerId: actorId,
        },
        select: {
          id: true,
        },
      });

      expect(db.findConfiguration).toHaveBeenCalledWith({
        where: {
          runId,
        },
      });

      expect(result).toEqual({
        found: true,
        configuration,
      });
    });

    it('allows owned runs without configuration', async () => {
      const db = createMockDatabase();

      db.findConfiguration.mockResolvedValue(null);

      const result = await db.service.getByRunId(actorId, runId);

      expect(result).toEqual({
        found: true,
        configuration: null,
      });
    });

    it('does not expose configurations of inaccessible runs', async () => {
      const db = createMockDatabase();

      db.findRun.mockResolvedValue(null);

      const result = await db.service.getByRunId(actorId, runId);

      expect(result).toEqual({
        found: false,
      });

      expect(db.findConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('creates a configuration for an owned run', async () => {
      const db = createMockDatabase();

      const result = await db.service.save(actorId, runId, {
        gameId: 'y',
        challengeType: 'RANDOMLOCKE',
      });

      expect(db.transaction).toHaveBeenCalledOnce();

      expect(db.findRun).toHaveBeenCalledWith({
        where: {
          id: runId,
          ownerId: actorId,
        },
        select: {
          id: true,
        },
      });

      expect(db.upsertConfiguration).toHaveBeenCalledWith({
        where: {
          runId,
        },
        create: {
          runId,
          gameId: 'y',
          challengeType: 'RANDOMLOCKE',
          levelCapIncrease: 0,
        },
        update: {
          gameId: 'y',
          challengeType: 'RANDOMLOCKE',
        },
      });

      expect(result).toEqual(configuration);
    });

    it('updates an existing configuration', async () => {
      const db = createMockDatabase();

      await db.service.save(actorId, runId, {
        gameId: 'emerald',
        challengeType: 'NUZLOCKE',
      });

      expect(db.upsertConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            runId,
          },
          update: {
            gameId: 'emerald',
            challengeType: 'NUZLOCKE',
          },
        }),
      );
    });

    it('does not write to an inaccessible run', async () => {
      const db = createMockDatabase();

      db.findRun.mockResolvedValue(null);

      const result = await db.service.save(actorId, runId, {
        gameId: 'y',
        challengeType: 'NUZLOCKE',
      });

      expect(result).toBeNull();

      expect(db.upsertConfiguration).not.toHaveBeenCalled();
    });

    it('rejects games outside the catalog', async () => {
      const db = createMockDatabase();

      await expect(
        db.service.save(actorId, runId, {
          gameId: 'pokemon-inventado',
          challengeType: 'NUZLOCKE',
        }),
      ).rejects.toThrow();

      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('rejects unexpected configuration fields', async () => {
      const db = createMockDatabase();

      await expect(
        db.service.save(actorId, runId, {
          gameId: 'y',
          challengeType: 'NORMAL',
          ownerId: 'another-user',
        } as never),
      ).rejects.toThrow();

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });
});
