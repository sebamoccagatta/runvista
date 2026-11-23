import { describe, expect, it } from 'vitest';

import {
  POKEMON_SPECIES,
  getPokemonSpecies,
  isPokemonSpeciesId,
  searchPokemonSpecies,
} from './species';

describe('Pokemon species catalog', () => {
  it('contains a substantial species catalog', () => {
    expect(POKEMON_SPECIES.length).toBeGreaterThan(1000);
  });

  it('has unique national species identifiers', () => {
    const ids = POKEMON_SPECIES.map((species) => species.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('finds Pikachu by National Pokedex ID', () => {
    expect(getPokemonSpecies(25)).toMatchObject({
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
    });
  });

  it('finds Greninja by name', () => {
    const results = searchPokemonSpecies('greninja');

    expect(results).toContainEqual(
      expect.objectContaining({
        id: 658,
        name: 'greninja',
      }),
    );
  });

  it('supports case-insensitive searches', () => {
    expect(searchPokemonSpecies('PIKACHU')[0]?.id).toBe(25);
  });

  it('supports searches by numeric identifier', () => {
    expect(searchPokemonSpecies('658')[0]?.id).toBe(658);
  });

  it('limits search results', () => {
    expect(searchPokemonSpecies('a', 5).length).toBeLessThanOrEqual(5);
  });

  it('returns no results for empty searches', () => {
    expect(searchPokemonSpecies('')).toEqual([]);
    expect(searchPokemonSpecies('   ')).toEqual([]);
  });

  it('rejects unknown species identifiers', () => {
    expect(isPokemonSpeciesId(-1)).toBe(false);
    expect(isPokemonSpeciesId(99999)).toBe(false);
    expect(isPokemonSpeciesId(25)).toBe(true);
  });
});
