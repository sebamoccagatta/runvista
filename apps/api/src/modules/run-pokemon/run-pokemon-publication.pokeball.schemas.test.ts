import { describe, expect, it } from 'vitest';

import { publishedPokemonSchema, publishedTeamSchema } from './run-pokemon-publication.schemas.js';

const legacyMember = {
  speciesId: 25,
  pokemonId: null,
  nickname: 'Pika',
  level: 20,
  isShiny: false,
  teamSlot: 1,
};

describe('Published team Poke Ball schema', () => {
  it('accepts legacy snapshots without pokeBall and defaults it to null', () => {
    const parsed = publishedPokemonSchema.parse(legacyMember);

    expect(parsed.pokeBall).toBeNull();
  });

  it('keeps a known Poke Ball key', () => {
    const parsed = publishedPokemonSchema.parse({ ...legacyMember, pokeBall: 'ultra-ball' });

    expect(parsed.pokeBall).toBe('ultra-ball');
  });

  it('rejects unknown Poke Ball keys in a snapshot', () => {
    expect(
      publishedPokemonSchema.safeParse({ ...legacyMember, pokeBall: 'pokeball-falsa' }).success,
    ).toBe(false);
  });

  it('validates a mixed team with and without balls', () => {
    const result = publishedTeamSchema.safeParse([
      legacyMember,
      { ...legacyMember, teamSlot: 2, pokeBall: 'poke-ball' },
    ]);

    expect(result.success).toBe(true);
  });
});
