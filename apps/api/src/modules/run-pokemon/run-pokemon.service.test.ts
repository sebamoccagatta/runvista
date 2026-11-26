import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../generated/prisma/client.js';

import { RunPokemonService, TeamSlotOccupiedError } from './run-pokemon.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const pokemonId = '770e8400-e29b-41d4-a716-446655440000';

const pokemon = {
  id: pokemonId,
  runId,
  speciesId: 658,
  nickname: 'Ninja',
  level: 42,
  isShiny: false,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: new Date('2026-11-23T12:00:00.000Z'),
  updatedAt: new Date('2026-11-23T12:00:00.000Z'),
};

function createMockDatabase() {
  const findRun = vi.fn().mockResolvedValue({
    id: runId,
  });

  const findPokemon = vi.fn().mockResolvedValue([pokemon]);

  const createPokemon = vi.fn().mockResolvedValue(pokemon);

  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      run: {
        findFirst: findRun,
      },
      runPokemon: {
        create: createPokemon,
      },
    }),
  );

  const prisma = {
    run: {
      findFirst: findRun,
    },
    runPokemon: {
      findMany: findPokemon,
    },
    $transaction: transaction,
  } as unknown as PrismaClient;

  return {
    service: new RunPokemonService(prisma),
    findRun,
    findPokemon,
    createPokemon,
    transaction,
  };
}

describe('RunPokemonService', () => {
  describe('list', () => {
    it('lists Pokemon belonging to an owned run', async () => {
      const db = createMockDatabase();

      const result = await db.service.list(actorId, runId);

      expect(db.findRun).toHaveBeenCalledWith({
        where: {
          id: runId,
          ownerId: actorId,
        },
        select: {
          id: true,
        },
      });

      expect(db.findPokemon).toHaveBeenCalledWith({
        where: {
          runId,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      expect(result).toEqual({
        found: true,
        pokemon: [pokemon],
      });
    });

    it('allows an empty Pokemon list', async () => {
      const db = createMockDatabase();

      db.findPokemon.mockResolvedValue([]);

      const result = await db.service.list(actorId, runId);

      expect(result).toEqual({
        found: true,
        pokemon: [],
      });
    });

    it('does not expose Pokemon from inaccessible runs', async () => {
      const db = createMockDatabase();

      db.findRun.mockResolvedValue(null);

      const result = await db.service.list(actorId, runId);

      expect(result).toEqual({
        found: false,
      });

      expect(db.findPokemon).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('registers a Pokemon in the team', async () => {
      const db = createMockDatabase();

      const result = await db.service.create(actorId, runId, {
        speciesId: 658,
        nickname: 'Ninja',
        level: 42,
        status: 'TEAM',
        teamSlot: 1,
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

      expect(db.createPokemon).toHaveBeenCalledWith({
        data: {
          runId,
          speciesId: 658,
          nickname: 'Ninja',
          level: 42,
          isShiny: false,
          pokeBall: null,
          status: 'TEAM',
          teamSlot: 1,
        },
      });

      expect(result).toEqual({
        found: true,
        pokemon,
      });
    });

    it('registers a Pokemon in the box by default', async () => {
      const db = createMockDatabase();

      await db.service.create(actorId, runId, {
        speciesId: 25,
      });

      expect(db.createPokemon).toHaveBeenCalledWith({
        data: {
          runId,
          speciesId: 25,
          nickname: null,
          level: null,
          isShiny: false,
          pokeBall: null,
          status: 'BOX',
          teamSlot: null,
        },
      });
    });

    it('registers fainted Pokemon without a team slot', async () => {
      const db = createMockDatabase();

      await db.service.create(actorId, runId, {
        speciesId: 6,
        status: 'FAINTED',
        isShiny: true,
      });

      expect(db.createPokemon).toHaveBeenCalledWith({
        data: expect.objectContaining({
          speciesId: 6,
          status: 'FAINTED',
          isShiny: true,
          teamSlot: null,
        }),
      });
    });

    it('does not write to an inaccessible run', async () => {
      const db = createMockDatabase();

      db.findRun.mockResolvedValue(null);

      const result = await db.service.create(actorId, runId, {
        speciesId: 658,
        status: 'TEAM',
        teamSlot: 1,
      });

      expect(result).toEqual({
        found: false,
      });

      expect(db.createPokemon).not.toHaveBeenCalled();
    });

    it('rejects invalid Pokemon input before accessing the database', async () => {
      const db = createMockDatabase();

      await expect(
        db.service.create(actorId, runId, {
          speciesId: 658,
          status: 'TEAM',
        }),
      ).rejects.toThrow();

      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('rejects an occupied team slot', async () => {
      const db = createMockDatabase();

      db.createPokemon.mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        db.service.create(actorId, runId, {
          speciesId: 25,
          status: 'TEAM',
          teamSlot: 1,
        }),
      ).rejects.toBeInstanceOf(TeamSlotOccupiedError);
    });

    it('does not translate unrelated database errors', async () => {
      const db = createMockDatabase();

      const failure = new Error('Database unavailable');

      db.createPokemon.mockRejectedValue(failure);

      await expect(
        db.service.create(actorId, runId, {
          speciesId: 25,
        }),
      ).rejects.toBe(failure);
    });
  });
});
