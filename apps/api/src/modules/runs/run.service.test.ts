import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../generated/prisma/client.js';
import { RunService } from './run.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';

function createMockDatabase() {
  const createRun = vi.fn().mockResolvedValue({
    id: runId,
    title: 'Pokémon Y',
    ownerId: actorId,
    status: 'DRAFT',
  });

  const createParticipant = vi.fn().mockResolvedValue({
    runId,
    userId: actorId,
    role: 'OWNER',
  });

  const findMany = vi.fn().mockResolvedValue([]);
  const findFirst = vi.fn().mockResolvedValue(null);
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const deleteMany = vi.fn().mockResolvedValue({ count: 0 });

  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      run: { create: createRun },
      runParticipant: { create: createParticipant },
    }),
  );

  const prisma = {
    run: {
      findMany,
      findFirst,
      updateMany,
      deleteMany,
    },
    $transaction: transaction,
  } as unknown as PrismaClient;

  return {
    service: new RunService(prisma),
    createRun,
    createParticipant,
    findMany,
    findFirst,
    updateMany,
    deleteMany,
    transaction,
  };
}

describe('RunService', () => {
  describe('create', () => {
    it('creates a draft run and registers the owner', async () => {
      const db = createMockDatabase();

      const result = await db.service.create(actorId, {
        title: 'Pokémon Y',
      });

      expect(db.createRun).toHaveBeenCalledWith({
        data: {
          title: 'Pokémon Y',
          status: 'DRAFT',
          ownerId: actorId,
        },
      });

      expect(db.createParticipant).toHaveBeenCalledWith({
        data: {
          runId,
          userId: actorId,
          role: 'OWNER',
        },
      });

      expect(db.transaction).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ id: runId });
    });

    it('saves an optional description when provided', async () => {
      const db = createMockDatabase();

      await db.service.create(actorId, {
        title: 'Pokémon Y',
        description: 'Randomlocke de sexta generación',
      });

      expect(db.createRun).toHaveBeenCalledWith({
        data: {
          title: 'Pokémon Y',
          description: 'Randomlocke de sexta generación',
          status: 'DRAFT',
          ownerId: actorId,
        },
      });
    });

    it('rejects attempts to provide another owner', async () => {
      const db = createMockDatabase();

      await expect(
        db.service.create(actorId, {
          title: 'Pokémon Y',
          ownerId: 'another-user',
        } as never),
      ).rejects.toThrow();

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lists only runs owned by the actor', async () => {
      const db = createMockDatabase();

      await db.service.list(actorId);

      expect(db.findMany).toHaveBeenCalledWith({
        where: { ownerId: actorId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getById', () => {
    it('filters by run ID and owner ID', async () => {
      const db = createMockDatabase();

      await db.service.getById(actorId, runId);

      expect(db.findFirst).toHaveBeenCalledWith({
        where: {
          id: runId,
          ownerId: actorId,
        },
      });
    });

    it('returns null when a run is not accessible', async () => {
      const db = createMockDatabase();

      const result = await db.service.getById(actorId, runId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a run using an ownership filter', async () => {
      const db = createMockDatabase();

      db.updateMany.mockResolvedValue({ count: 1 });
      db.findFirst.mockResolvedValue({
        id: runId,
        title: 'Nuevo nombre',
      });

      const result = await db.service.update(actorId, runId, {
        title: 'Nuevo nombre',
      });

      expect(db.updateMany).toHaveBeenCalledWith({
        where: {
          id: runId,
          ownerId: actorId,
        },
        data: {
          title: 'Nuevo nombre',
        },
      });

      expect(result).toMatchObject({
        title: 'Nuevo nombre',
      });
    });

    it('allows clearing the description', async () => {
      const db = createMockDatabase();

      db.updateMany.mockResolvedValue({ count: 1 });

      await db.service.update(actorId, runId, {
        description: null,
      });

      expect(db.updateMany).toHaveBeenCalledWith({
        where: {
          id: runId,
          ownerId: actorId,
        },
        data: {
          description: null,
        },
      });
    });

    it('returns null if the update affects no records', async () => {
      const db = createMockDatabase();

      const result = await db.service.update(actorId, runId, {
        status: 'ACTIVE',
      });

      expect(result).toBeNull();
      expect(db.findFirst).not.toHaveBeenCalled();
    });

    it('rejects changes to ownerId', async () => {
      const db = createMockDatabase();

      await expect(
        db.service.update(actorId, runId, {
          ownerId: 'another-user',
        } as never),
      ).rejects.toThrow();

      expect(db.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes only a run owned by the actor', async () => {
      const db = createMockDatabase();

      db.deleteMany.mockResolvedValue({ count: 1 });

      const result = await db.service.remove(actorId, runId);

      expect(db.deleteMany).toHaveBeenCalledWith({
        where: {
          id: runId,
          ownerId: actorId,
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when no run was deleted', async () => {
      const db = createMockDatabase();

      const result = await db.service.remove(actorId, runId);

      expect(result).toBe(false);
    });
  });
});
