import { describe, expect, it } from 'vitest';

import { createRunPokemonSchema, updateRunPokemonSchema } from './run-pokemon.schemas.js';

describe('Run Pokemon Poke Ball schemas', () => {
  it('accepts a known Poke Ball key on create', () => {
    const result = createRunPokemonSchema.safeParse({
      speciesId: 25,
      pokeBall: 'great-ball',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.pokeBall).toBe('great-ball');
  });

  it('allows creating without a Poke Ball', () => {
    const result = createRunPokemonSchema.safeParse({ speciesId: 25 });

    expect(result.success).toBe(true);
    expect(result.success && result.data.pokeBall).toBeUndefined();
  });

  it('rejects unknown or differently cased Poke Ball keys', () => {
    for (const pokeBall of ['no-existe', 'GREAT-BALL', '']) {
      expect(createRunPokemonSchema.safeParse({ speciesId: 25, pokeBall }).success).toBe(false);
    }
  });

  it('accepts null on update to remove the Poke Ball', () => {
    const result = updateRunPokemonSchema.safeParse({ pokeBall: null });

    expect(result.success).toBe(true);
  });

  it('accepts a known Poke Ball key on update', () => {
    expect(updateRunPokemonSchema.safeParse({ pokeBall: 'master-ball' }).success).toBe(true);
  });

  it('rejects unknown Poke Ball keys on update', () => {
    expect(updateRunPokemonSchema.safeParse({ pokeBall: 'pokeball-falsa' }).success).toBe(false);
  });
});
