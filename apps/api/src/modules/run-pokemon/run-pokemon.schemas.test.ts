import { describe, expect, it } from 'vitest';

import {
  createRunPokemonSchema,
  pokemonSpeciesIdSchema,
  runPokemonIdParamsSchema,
  runPokemonStatusSchema,
} from './run-pokemon.schemas.js';

const runId = '550e8400-e29b-41d4-a716-446655440000';
const pokemonId = '660e8400-e29b-41d4-a716-446655440000';

describe('Run Pokemon schemas', () => {
  it('accepts all supported statuses', () => {
    for (const status of ['TEAM', 'BOX', 'FAINTED']) {
      expect(runPokemonStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it('accepts valid species identifiers', () => {
    expect(pokemonSpeciesIdSchema.parse(658)).toBe(658);
  });

  it('rejects invalid species identifiers', () => {
    for (const value of [0, -1, 1.5, 10000, '658']) {
      expect(pokemonSpeciesIdSchema.safeParse(value).success).toBe(false);
    }
  });

  it('creates a Pokemon with default values', () => {
    const result = createRunPokemonSchema.parse({
      speciesId: 658,
    });

    expect(result).toMatchObject({
      speciesId: 658,
      isShiny: false,
      status: 'BOX',
    });
  });

  it('accepts a Pokemon in the team', () => {
    const result = createRunPokemonSchema.parse({
      speciesId: 658,
      nickname: 'Ninja',
      level: 42,
      isShiny: false,
      status: 'TEAM',
      teamSlot: 1,
    });

    expect(result.status).toBe('TEAM');
    expect(result.teamSlot).toBe(1);
  });

  it('requires a slot for team Pokemon', () => {
    const result = createRunPokemonSchema.safeParse({
      speciesId: 658,
      status: 'TEAM',
    });

    expect(result.success).toBe(false);
  });

  it('rejects team slots outside 1 through 6', () => {
    for (const slot of [0, 7]) {
      expect(
        createRunPokemonSchema.safeParse({
          speciesId: 658,
          status: 'TEAM',
          teamSlot: slot,
        }).success,
      ).toBe(false);
    }
  });

  it('rejects slots for boxed Pokemon', () => {
    expect(
      createRunPokemonSchema.safeParse({
        speciesId: 658,
        status: 'BOX',
        teamSlot: 1,
      }).success,
    ).toBe(false);
  });

  it('rejects slots for fainted Pokemon', () => {
    expect(
      createRunPokemonSchema.safeParse({
        speciesId: 658,
        status: 'FAINTED',
        teamSlot: 2,
      }).success,
    ).toBe(false);
  });

  it('allows optional nickname and level', () => {
    const result = createRunPokemonSchema.parse({
      speciesId: 25,
      nickname: null,
      level: null,
    });

    expect(result.nickname).toBeNull();
    expect(result.level).toBeNull();
  });

  it('rejects invalid Pokemon levels', () => {
    for (const level of [0, 101, 5.5]) {
      expect(
        createRunPokemonSchema.safeParse({
          speciesId: 25,
          level,
        }).success,
      ).toBe(false);
    }
  });

  it('rejects unexpected fields', () => {
    expect(
      createRunPokemonSchema.safeParse({
        speciesId: 25,
        ownerId: 'another-user',
      }).success,
    ).toBe(false);
  });

  it('validates run and Pokemon UUIDs', () => {
    expect(
      runPokemonIdParamsSchema.safeParse({
        runId,
        pokemonId,
      }).success,
    ).toBe(true);

    expect(
      runPokemonIdParamsSchema.safeParse({
        runId: 'invalid',
        pokemonId,
      }).success,
    ).toBe(false);
  });
});
