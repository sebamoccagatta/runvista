import { describe, expect, it } from 'vitest';

import { createRunPokemonSchema, pokemonSpeciesIdSchema } from './run-pokemon.schemas.js';

describe('Run Pokemon species catalog validation', () => {
  it('accepts known Pokemon species', () => {
    for (const speciesId of [1, 6, 25, 658]) {
      expect(pokemonSpeciesIdSchema.safeParse(speciesId).success).toBe(true);
    }
  });

  it('rejects unknown species within the numeric range', () => {
    expect(pokemonSpeciesIdSchema.safeParse(9999).success).toBe(false);
  });

  it('rejects registering an unknown species', () => {
    const result = createRunPokemonSchema.safeParse({
      speciesId: 9999,
      status: 'BOX',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path.includes('speciesId') && issue.message === 'Unsupported Pokemon species',
        ),
      ).toBe(true);
    }
  });

  it('accepts registering Greninja in the team', () => {
    const result = createRunPokemonSchema.safeParse({
      speciesId: 658,
      nickname: 'Ninja',
      level: 42,
      status: 'TEAM',
      teamSlot: 1,
    });

    expect(result.success).toBe(true);
  });
});
