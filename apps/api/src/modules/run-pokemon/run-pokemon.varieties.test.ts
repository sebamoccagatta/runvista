import { describe, expect, it } from 'vitest';

import { getPokemonVarieties } from '@runvista/pokemon/varieties';

import { createRunPokemonSchema, updateRunPokemonSchema } from './run-pokemon.schemas.js';

const megaCharizardX = getPokemonVarieties(6).find(
  (variety) => variety.name === 'charizard-mega-x',
);

describe('Run Pokemon variety validation', () => {
  it('accepts a matching variety', () => {
    expect(megaCharizardX).toBeDefined();

    const result = createRunPokemonSchema.safeParse({
      speciesId: 6,
      pokemonId: megaCharizardX!.pokemonId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a variety from another species', () => {
    const result = createRunPokemonSchema.safeParse({
      speciesId: 25,
      pokemonId: megaCharizardX!.pokemonId,
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unknown variety', () => {
    const result = createRunPokemonSchema.safeParse({
      speciesId: 6,
      pokemonId: 999999,
    });

    expect(result.success).toBe(false);
  });

  it('preserves compatibility with existing Pokemon', () => {
    const result = createRunPokemonSchema.safeParse({
      speciesId: 25,
    });

    expect(result.success).toBe(true);
  });

  it('accepts explicitly resetting the variety', () => {
    const result = updateRunPokemonSchema.safeParse({
      pokemonId: null,
    });

    expect(result.success).toBe(true);
  });

  it('accepts changing to a valid variety ID', () => {
    const result = updateRunPokemonSchema.safeParse({
      pokemonId: megaCharizardX!.pokemonId,
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid variety ID types', () => {
    for (const pokemonId of [-1, 0, 1.5, '10034']) {
      expect(
        updateRunPokemonSchema.safeParse({
          pokemonId,
        }).success,
      ).toBe(false);
    }
  });

  it('still rejects empty updates', () => {
    expect(updateRunPokemonSchema.safeParse({}).success).toBe(false);
  });
});
