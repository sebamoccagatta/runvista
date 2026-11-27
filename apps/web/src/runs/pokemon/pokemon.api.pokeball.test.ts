import { describe, expect, it } from 'vitest';

import { isRunPokemon, type RunPokemon } from './pokemon.api';

function createPokemon(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: '660e8400-e29b-41d4-a716-446655440000',
    runId: '550e8400-e29b-41d4-a716-446655440000',
    speciesId: 25,
    pokemonId: null,
    nickname: 'Pika',
    level: 20,
    isShiny: false,
    status: 'BOX',
    teamSlot: null,
    createdAt: '2026-11-26T00:00:00.000Z',
    updatedAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  };
}

describe('RunPokemon Poke Ball validation', () => {
  it('accepts a known Poke Ball key', () => {
    expect(isRunPokemon(createPokemon({ pokeBall: 'ultra-ball' }))).toBe(true);
  });

  it('accepts null and responses that predate the field', () => {
    expect(isRunPokemon(createPokemon({ pokeBall: null }))).toBe(true);
    expect(isRunPokemon(createPokemon())).toBe(true);
  });

  it('rejects unknown Poke Ball keys', () => {
    expect(isRunPokemon(createPokemon({ pokeBall: 'pokeball-falsa' }))).toBe(false);
  });

  it('rejects non-string Poke Ball values', () => {
    expect(isRunPokemon(createPokemon({ pokeBall: 7 }))).toBe(false);
  });

  it('exposes the field on the RunPokemon type', () => {
    const parsed = createPokemon({ pokeBall: 'dive-ball' }) as RunPokemon;

    expect(parsed.pokeBall).toBe('dive-ball');
  });
});
