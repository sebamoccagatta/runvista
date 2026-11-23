import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../generated/prisma/client.js';

import { RunPokemonService } from './run-pokemon.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const pokemonId = '770e8400-e29b-41d4-a716-446655440000';

function createDatabase() {
  const update = vi.fn();

  const prisma = {
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        run: {
          findFirst: vi.fn().mockResolvedValue({
            id: runId,
          }),
        },
        runPokemon: {
          findFirst: vi.fn().mockResolvedValue({
            id: pokemonId,
          }),
          update,
        },
      }),
    ),
  } as unknown as PrismaClient;

  return {
    service: new RunPokemonService(prisma),
    update,
  };
}

describe('RunPokemonService concurrent deletions', () => {
  it('returns not found when a Pokemon disappears during update', async () => {
    const db = createDatabase();

    db.update.mockRejectedValue({
      code: 'P2025',
    });

    const result = await db.service.update(actorId, runId, pokemonId, { level: 50 });

    expect(result).toEqual({
      found: false,
    });
  });

  it('returns not found when a Pokemon disappears during movement', async () => {
    const db = createDatabase();

    db.update.mockRejectedValue({
      code: 'P2025',
    });

    const result = await db.service.move(actorId, runId, pokemonId, { status: 'BOX' });

    expect(result).toEqual({
      found: false,
    });
  });

  it('preserves unexpected update failures', async () => {
    const db = createDatabase();

    const error = new Error('Database unavailable');

    db.update.mockRejectedValue(error);

    await expect(db.service.update(actorId, runId, pokemonId, { nickname: 'Ninja' })).rejects.toBe(
      error,
    );
  });

  it('preserves unexpected movement failures', async () => {
    const db = createDatabase();

    const error = new Error('Database unavailable');

    db.update.mockRejectedValue(error);

    await expect(db.service.move(actorId, runId, pokemonId, { status: 'FAINTED' })).rejects.toBe(
      error,
    );
  });
});
