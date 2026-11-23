import { describe, expect, it } from 'vitest';

import {
  POKEMON_VARIETIES,
  getDefaultPokemonVariety,
  getPokemonVarieties,
  getPokemonVariety,
  isPokemonVarietyForSpecies,
} from './varieties';

describe('Pokemon varieties catalog', () => {
  it('contains the default variety for Pikachu', () => {
    expect(getDefaultPokemonVariety(25)).toMatchObject({
      speciesId: 25,
      name: 'pikachu',
      isDefault: true,
    });
  });

  it('contains both Mega Charizard varieties', () => {
    const varieties = getPokemonVarieties(6);

    expect(varieties.map((item) => item.name)).toContain('charizard-mega-x');

    expect(varieties.map((item) => item.name)).toContain('charizard-mega-y');
  });

  it('contains the Alolan Raichu variety', () => {
    expect(getPokemonVarieties(26).some((item) => item.name === 'raichu-alola')).toBe(true);
  });

  it('can find a variety by its Pokemon ID', () => {
    const megaX = getPokemonVarieties(6).find((item) => item.name === 'charizard-mega-x');

    expect(megaX).toBeDefined();

    expect(getPokemonVariety(megaX!.pokemonId)).toEqual(megaX);
  });

  it('validates the relationship between variety and species', () => {
    const megaX = getPokemonVarieties(6).find((item) => item.name === 'charizard-mega-x');

    expect(megaX).toBeDefined();

    expect(isPokemonVarietyForSpecies(6, megaX!.pokemonId)).toBe(true);

    expect(isPokemonVarietyForSpecies(25, megaX!.pokemonId)).toBe(false);
  });

  it('has unique Pokemon identifiers', () => {
    const ids = POKEMON_VARIETIES.map((item) => item.pokemonId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly one default per species', () => {
    const speciesIds = new Set(POKEMON_VARIETIES.map((item) => item.speciesId));

    for (const speciesId of speciesIds) {
      expect(getPokemonVarieties(speciesId).filter((item) => item.isDefault)).toHaveLength(1);
    }
  });

  it('rejects unknown species and variety IDs', () => {
    expect(getPokemonVarieties(9999)).toEqual([]);
    expect(getPokemonVariety(-1)).toBeUndefined();

    expect(isPokemonVarietyForSpecies(9999, -1)).toBe(false);
  });
});
