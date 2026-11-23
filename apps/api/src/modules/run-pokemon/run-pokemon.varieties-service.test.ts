import { describe, expect, it, vi } from 'vitest';

import { getPokemonVarieties } from '@runvista/pokemon/varieties';

import type { PrismaClient } from '../../generated/prisma/client.js';

import { InvalidPokemonVarietyError, RunPokemonService } from './run-pokemon.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const pokemonId = '770e8400-e29b-41d4-a716-446655440000';

const megaX = getPokemonVarieties(6).find((item) => item.name === 'charizard-mega-x')!;

function createDatabase() {
  const findRun = vi.fn().mockResolvedValue({ id: runId });

  const findPokemon = vi.fn().mockResolvedValue({
    id: pokemonId,
    speciesId: 6,
  });

  const createPokemon = vi.fn().mockResolvedValue({
    id: pokemonId,
    speciesId: 6,
    pokemonId: megaX.pokemonId,
  });

  const updatePokemon = vi.fn().mockResolvedValue({
    id: pokemonId,
    speciesId: 6,
    pokemonId: megaX.pokemonId,
  });

  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      run: {
        findFirst: findRun,
      },
      runPokemon: {
        findFirst: findPokemon,
        create: createPokemon,
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
    createPokemon,
    updatePokemon,
  };
}

describe('Run Pokemon variety persistence', () => {
  it('persists a valid variety when creating', async () => {
    const db = createDatabase();

    await db.service.create(actorId, runId, {
      speciesId: 6,
      pokemonId: megaX.pokemonId,
    });

    expect(db.createPokemon).toHaveBeenCalledWith({
      data: expect.objectContaining({
        speciesId: 6,
        pokemonId: megaX.pokemonId,
      }),
    });
  });

  it('keeps backward compatibility when creating', async () => {
    const db = createDatabase();

    await db.service.create(actorId, runId, {
      speciesId: 25,
    });

    expect(db.createPokemon).toHaveBeenCalledWith({
      data: expect.not.objectContaining({
        pokemonId: expect.anything(),
      }),
    });
  });

  it('rejects a foreign variety before writing', async () => {
    const db = createDatabase();

    await expect(
      db.service.create(actorId, runId, {
        speciesId: 25,
        pokemonId: megaX.pokemonId,
      }),
    ).rejects.toThrow();

    expect(db.createPokemon).not.toHaveBeenCalled();
  });

  it('updates a valid variety', async () => {
    const db = createDatabase();

    await db.service.update(actorId, runId, pokemonId, {
      pokemonId: megaX.pokemonId,
    });

    expect(db.findPokemon).toHaveBeenCalledWith({
      where: {
        id: pokemonId,
        runId,
      },
      select: {
        id: true,
        speciesId: true,
      },
    });

    expect(db.updatePokemon).toHaveBeenCalledWith({
      where: { id: pokemonId },
      data: { pokemonId: megaX.pokemonId },
    });
  });

  it('rejects a variety belonging to another species', async () => {
    const db = createDatabase();

    db.findPokemon.mockResolvedValue({
      id: pokemonId,
      speciesId: 25,
    });

    await expect(
      db.service.update(actorId, runId, pokemonId, {
        pokemonId: megaX.pokemonId,
      }),
    ).rejects.toBeInstanceOf(InvalidPokemonVarietyError);

    expect(db.updatePokemon).not.toHaveBeenCalled();
  });

  it('allows resetting to the default variety', async () => {
    const db = createDatabase();

    await db.service.update(actorId, runId, pokemonId, {
      pokemonId: null,
    });

    expect(db.updatePokemon).toHaveBeenCalledWith({
      where: { id: pokemonId },
      data: { pokemonId: null },
    });
  });

  it('does not require species validation for nickname edits', async () => {
    const db = createDatabase();

    await db.service.update(actorId, runId, pokemonId, {
      nickname: 'Draco',
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
      data: { nickname: 'Draco' },
    });
  });

  it('does not update a missing Pokemon', async () => {
    const db = createDatabase();

    db.findPokemon.mockResolvedValue(null);

    const result = await db.service.update(actorId, runId, pokemonId, {
      pokemonId: megaX.pokemonId,
    });

    expect(result).toEqual({ found: false });
    expect(db.updatePokemon).not.toHaveBeenCalled();
  });
});
