import { describe, expect, it } from 'vitest';

import {
  getPokemonGame,
  getPokemonGamesByGeneration,
  isPokemonGameId,
  POKEMON_GAMES,
} from './games';

describe('Pokemon games catalog', () => {
  it('contains games from generations 1 through 9', () => {
    const generations = new Set(POKEMON_GAMES.map((game) => game.generation));

    expect([...generations].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('does not contain duplicated game IDs', () => {
    const ids = POKEMON_GAMES.map((game) => game.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('finds a game by its ID', () => {
    expect(getPokemonGame('y')).toEqual({
      id: 'y',
      name: 'Pokémon Y',
      generation: 6,
    });
  });

  it('rejects unknown game IDs', () => {
    expect(getPokemonGame('unknown')).toBeUndefined();
    expect(isPokemonGameId('unknown')).toBe(false);
    expect(isPokemonGameId('emerald')).toBe(true);
  });

  it('filters games by generation', () => {
    const games = getPokemonGamesByGeneration(6);

    expect(games.map((game) => game.id)).toEqual(['x', 'y', 'omega-ruby', 'alpha-sapphire']);
  });
});
