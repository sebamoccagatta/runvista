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
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createDatabase() {
  const findRun = vi.fn().mockResolvedValue({ id: runId });
  const findPokemon = vi.fn().mockResolvedValue({ id: pokemonId });
  const updatePokemon = vi.fn().mockResolvedValue(pokemon);

  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      run: {
        findFirst: findRun,
      },
      runPokemon: {
        findFirst: findPokemon,
        update: updatePokemon,
      },
    }),
  );

  const prisma = {
    $transaction: transaction,
  } as unknown as PrismaClient;

  return {
    service: new RunPokemonService(prisma),
    findRun,
    findPokemon,
    updatePokemon,
    transaction,
  };
}

describe('RunPokemonService operations', () => {
  describe('update', () => {
    it('updates nickname and level', async () => {
      const db = createDatabase();

      const result = await db.service.update(actorId, runId, pokemonId, {
        nickname: 'Nuevo Ninja',
        level: 50,
      });

      expect(result.found).toBe(true);

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
          id: pokemonId,
          runId,
        },
        select: {
          id: true,
        },
      });

      expect(db.updatePokemon).toHaveBeenCalledWith({
        where: { id: pokemonId },
        data: {
          nickname: 'Nuevo Ninja',
          level: 50,
        },
      });
    });

    it('updates only supplied fields', async () => {
      const db = createDatabase();

      await db.service.update(actorId, runId, pokemonId, { isShiny: true });

      expect(db.updatePokemon).toHaveBeenCalledWith({
        where: { id: pokemonId },
        data: { isShiny: true },
      });
    });

    it('rejects updates to inaccessible runs', async () => {
      const db = createDatabase();

      db.findRun.mockResolvedValue(null);

      const result = await db.service.update(actorId, runId, pokemonId, { nickname: 'Nuevo' });

      expect(result).toEqual({ found: false });
      expect(db.updatePokemon).not.toHaveBeenCalled();
    });

    it('rejects Pokemon belonging to another run', async () => {
      const db = createDatabase();

      db.findPokemon.mockResolvedValue(null);

      const result = await db.service.update(actorId, runId, pokemonId, { level: 50 });

      expect(result).toEqual({ found: false });
      expect(db.updatePokemon).not.toHaveBeenCalled();
    });

    it('rejects empty updates before a transaction', async () => {
      const db = createDatabase();

      await expect(db.service.update(actorId, runId, pokemonId, {})).rejects.toThrow();

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  describe('move', () => {
    it('moves Pokemon into a team slot', async () => {
      const db = createDatabase();

      const result = await db.service.move(actorId, runId, pokemonId, {
        status: 'TEAM',
        teamSlot: 3,
      });

      expect(result.found).toBe(true);

      expect(db.updatePokemon).toHaveBeenCalledWith({
        where: { id: pokemonId },
        data: {
          status: 'TEAM',
          teamSlot: 3,
        },
      });
    });

    it('moves Pokemon to the box and frees its slot', async () => {
      const db = createDatabase();

      await db.service.move(actorId, runId, pokemonId, { status: 'BOX' });

      expect(db.updatePokemon).toHaveBeenCalledWith({
        where: { id: pokemonId },
        data: {
          status: 'BOX',
          teamSlot: null,
        },
      });
    });

    it('registers a fainted Pokemon without a slot', async () => {
      const db = createDatabase();

      await db.service.move(actorId, runId, pokemonId, { status: 'FAINTED' });

      expect(db.updatePokemon).toHaveBeenCalledWith({
        where: { id: pokemonId },
        data: {
          status: 'FAINTED',
          teamSlot: null,
        },
      });
    });

    it('rejects an occupied team slot', async () => {
      const db = createDatabase();

      db.updatePokemon.mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        db.service.move(actorId, runId, pokemonId, {
          status: 'TEAM',
          teamSlot: 2,
        }),
      ).rejects.toBeInstanceOf(TeamSlotOccupiedError);
    });

    it('rejects moves to inaccessible runs', async () => {
      const db = createDatabase();

      db.findRun.mockResolvedValue(null);

      const result = await db.service.move(actorId, runId, pokemonId, { status: 'BOX' });

      expect(result).toEqual({ found: false });
      expect(db.updatePokemon).not.toHaveBeenCalled();
    });

    it('rejects moving Pokemon from another run', async () => {
      const db = createDatabase();

      db.findPokemon.mockResolvedValue(null);

      const result = await db.service.move(actorId, runId, pokemonId, { status: 'BOX' });

      expect(result).toEqual({ found: false });
      expect(db.updatePokemon).not.toHaveBeenCalled();
    });

    it('rejects invalid slots before a transaction', async () => {
      const db = createDatabase();

      await expect(
        db.service.move(actorId, runId, pokemonId, {
          status: 'TEAM',
          teamSlot: 7,
        }),
      ).rejects.toThrow();

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });
});
